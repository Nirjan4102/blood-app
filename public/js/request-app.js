/**
 * LIFESAVE — Blood Request Logic + Supabase Realtime (Browser)
 * Replaces Express POST /api/request-blood + Socket.io real-time
 * Depends on: config.js, supabase-client.js, geocoder.js
 */
(function () {
    const form = document.getElementById('requestForm');
    const btn = document.getElementById('submitBtn');
    const statusBox = document.getElementById('statusBox');
    const donorSection = document.getElementById('acceptedDonorsSection');
    const donorList = document.getElementById('donorList');

    // XSS sanitizer — escapes HTML in untrusted data before innerHTML injection
    function esc(str) {
        const d = document.createElement('div');
        d.appendChild(document.createTextNode(str || ''));
        return d.innerHTML;
    }

    // ── Supabase Realtime (replaces Socket.io) ──
    // We subscribe to UPDATE events on the donors table.
    // When a donor clicks "Accept", their last_donation_date is updated,
    // which triggers this listener on the requester's browser.
    let realtimeChannel = null;
    let requestEmail = null; // Track the requester's email for filtering

    function setupRealtimeListener() {
        if (realtimeChannel) {
            supabaseClient.removeChannel(realtimeChannel);
        }

        realtimeChannel = supabase
            .channel('donor-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'donors'
                },
                (payload) => {
                    const donor = payload.new;
                    if (donor) {
                        showAcceptedDonor({
                            name: donor.name,
                            mobile: donor.mobile,
                            email: donor.email,
                            bloodGroup: donor.blood_group,
                            location: `${donor.village || ''}, ${donor.district || ''}`
                        });
                    }
                }
            )
            .subscribe();
    }

    function showAcceptedDonor(donor) {
        donorSection.classList.remove('hidden');

        const safeName = esc(donor.name);
        const safeMobile = esc(donor.mobile);
        const safeEmail = esc(donor.email);
        const safeLocation = esc(donor.location);
        const safeFirst = esc((donor.name || '').split(' ')[0]).toUpperCase();

        const card = document.createElement('div');
        card.className = 'donor-card animate__animated animate__fadeInUp';
        card.innerHTML = `
            <div class="flex flex-col h-full relative" style="z-index:2">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h4 class="text-xl font-black text-white tracking-wide">${safeName}</h4>
                        <p class="text-[10px] text-green-400 font-bold premium-text mt-1">Response Confirmed</p>
                    </div>
                    <div class="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black premium-text" style="background:rgba(255,42,75,0.12);border:1px solid rgba(255,42,75,0.35);color:#ff5c75;">
                        <span class="w-1.5 h-1.5 rounded-full bg-crimson-500 animate-pulse inline-block"></span> LIVE
                    </div>
                </div>
                <div class="space-y-2 mb-6 flex-grow">
                    <p class="text-gray-300 flex items-center gap-2.5 text-sm font-light">
                        <i class="fa-solid fa-location-dot text-gray-500 w-4 text-center"></i> ${safeLocation}
                    </p>
                    <p class="text-gray-300 flex items-center gap-2.5 text-sm font-light">
                        <i class="fa-solid fa-envelope text-gray-500 w-4 text-center"></i> ${safeEmail}
                    </p>
                </div>
                <a href="tel:${safeMobile}" class="block w-full text-center py-3.5 rounded-xl font-black text-sm premium-text transition-all duration-300" style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.4);color:#34d399;" onmouseover="this.style.background='rgba(16,185,129,0.2)';this.style.boxShadow='0 0 18px rgba(16,185,129,0.25)';this.style.transform='translateY(-2px)'" onmouseout="this.style.background='rgba(16,185,129,0.1)';this.style.boxShadow='none';this.style.transform=''">
                    <i class="fa-solid fa-phone mr-2"></i> CALL ${safeFirst}
                </a>
            </div>
        `;
        donorList.appendChild(card);
        donorSection.scrollIntoView({ behavior: 'smooth' });
    }

    // ── Form Submission ──
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        btn.disabled = true;
        btn.style.opacity = '0.5';
        document.getElementById('btnText').innerText = 'BROADCASTING...';

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        requestEmail = data.email;

        try {
            // 1. Get Patient's Coordinates
            const coords = await getCoordinates({
                village: data.village,
                post: data.post || 'General',
                district: data.district,
                state: data.state || 'West Bengal'
            });

            if (!coords) {
                showStatus(
                    'Location Error: Could not determine coordinates for the request area.',
                    'error'
                );
                return;
            }

            // 2. Search for Donors within 15km using PostGIS RPC
            const { data: donors, error } = await supabaseClient.rpc('find_nearby_donors', {
                search_blood_group: data.bloodGroup.toUpperCase(),
                search_lng: coords[0],
                search_lat: coords[1],
                max_distance_meters: 15000,
                min_days_since_donation: 90
            });

            if (error) {
                console.error('Supabase RPC error:', error.message);
                showStatus('Internal error while searching for donors.', 'error');
                return;
            }

            // 3. Handle no donors found
            if (!donors || donors.length === 0) {
                showStatus(
                    `No eligible ${data.bloodGroup} donors found within 15km of your location.`,
                    'warning'
                );
                return;
            }

            // 3.5. SAVE the request to Supabase so it appears on Donor Dashboards
            const { error: insertError } = await supabaseClient
                .from('requests')
                .insert({
                    name: data.name,
                    mobile: data.mobile,
                    email: data.email,
                    blood_group: data.bloodGroup.toUpperCase(),
                    village: data.village,
                    post: data.post || 'General',
                    district: data.district,
                    state: data.state || 'West Bengal',
                    // PostGIS expects WKT format: POINT(longitude latitude)
                    location: `POINT(${coords[0]} ${coords[1]})`
                });

            if (insertError) {
                console.error('Error saving request:', insertError.message);
                // We continue anyway since finding donors is the primary goal
            }

            // 4. Setup Realtime listener BEFORE showing success
            setupRealtimeListener();

            // 5. Show the found donors info and accept URLs
            // Build the base URL for accept links (relative to current site)
            const baseUrl = window.location.href.replace(/\/[^/]*$/, '');
            
            // Display found donors count
            showStatus(
                `Found ${donors.length} nearby ${data.bloodGroup} donor(s)! They have been notified. Stay on this page for live responses.`,
                'success'
            );

            // 6. Try to notify donors via Supabase Edge Function (if deployed)
            try {
                const acceptBaseUrl = `${baseUrl}/accept.html`;
                const donorsWithUrls = donors.map(donor => ({
                    donor: {
                        ...donor,
                        bloodGroup: donor.blood_group
                    },
                    acceptUrl: `${acceptBaseUrl}?donorId=${donor.id}&reqName=${encodeURIComponent(data.name)}&reqMobile=${data.mobile}&reqLat=${coords[1]}&reqLng=${coords[0]}&reqEmail=${encodeURIComponent(data.email)}`
                }));

                await supabaseClient.functions.invoke('notify-donors', {
                    body: {
                        donorsWithUrls,
                        requesterInfo: {
                            name: data.name,
                            bloodGroup: data.bloodGroup,
                            village: data.village
                        }
                    }
                });
            } catch (fnError) {
                // Edge Function not deployed — that's okay, the core flow still works
                console.log('Edge Function not available — email notifications skipped.');
            }

        } catch (error) {
            console.error('Request error:', error);
            let msg = error.message || 'Unknown error';
            if (msg.includes('Failed to fetch')) {
                msg = 'Network Error: Cannot reach Supabase. Check your internet or API keys.';
            }
            showStatus(`Connection Error: ${msg}`, 'error');
        } finally {
            btn.disabled = false;
            btn.style.opacity = '1';
            document.getElementById('btnText').innerText = 'FIND NEARBY DONORS';
        }
    });

    function showStatus(text, type) {
        statusBox.classList.remove('hidden');

        if (type === 'success') {
            statusBox.className =
                'mt-6 p-4 rounded-xl text-center font-bold text-sm tracking-wide animate__animated animate__fadeIn';
            statusBox.style.cssText =
                'background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);color:#34d399;';
            statusBox.innerHTML = `<i class="fa-solid fa-satellite-dish mr-2"></i> ${text}`;
        } else if (type === 'warning') {
            statusBox.className =
                'mt-6 p-4 rounded-xl text-center font-bold text-sm tracking-wide animate__animated animate__shakeX';
            statusBox.style.cssText =
                'background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.3);color:#fb923c;';
            statusBox.innerText = text;
        } else {
            statusBox.className =
                'mt-6 p-4 rounded-xl text-center font-bold text-sm tracking-wide animate__animated animate__shakeX';
            statusBox.style.cssText =
                'background:rgba(255,42,75,0.1);border:1px solid rgba(255,42,75,0.3);color:#ff5c75;';
            statusBox.innerText = text;
        }
    }
})();
