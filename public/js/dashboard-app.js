/**
 * LIFESAVE — Donor Dashboard Logic
 * Fetches donor info and nearby requests from Supabase.
 */
(async function () {
    const donorId = localStorage.getItem('lifesave_donor_id');
    const welcomeName = document.getElementById('welcomeName');
    const logoutBtn = document.getElementById('logoutBtn');
    const requestList = document.getElementById('requestList');
    const emptyState = document.getElementById('emptyState');

    // Profile Elements
    const profileBlood = document.getElementById('profileBlood');
    const profileLocation = document.getElementById('profileLocation');
    const profileLastDonation = document.getElementById('profileLastDonation');

    if (!donorId) {
        window.location.href = 'login.html';
        return;
    }

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('lifesave_donor_id');
        localStorage.removeItem('lifesave_donor_name');
        window.location.href = 'login.html';
    });

    try {
        // 1. Fetch Donor Details
        const { data: donor, error: donorError } = await supabase
            .from('donors')
            .select('*')
            .eq('id', donorId)
            .single();

        if (donorError || !donor) {
            localStorage.removeItem('lifesave_donor_id');
            window.location.href = 'login.html';
            return;
        }

        // Update UI with Donor Info
        welcomeName.innerText = `Welcome, ${donor.name.split(' ')[0]}`;
        welcomeName.classList.remove('hidden');
        profileBlood.innerText = donor.blood_group;
        profileLocation.innerText = `${donor.village}, ${donor.district}`;
        profileLastDonation.innerText = donor.last_donation_date 
            ? new Date(donor.last_donation_date).toLocaleDateString() 
            : 'Never';

        // 2. Fetch Nearby Requests
        // Since we don't have a 'find_nearby_requests' RPC yet, 
        // we'll fetch pending requests of the SAME blood group.
        // We'll filter by distance in the next iteration or via RPC if possible.
        // For now, let's fetch matching blood group requests.
        const { data: requests, error: reqError } = await supabase
            .from('requests')
            .select('*')
            .eq('blood_group', donor.blood_group)
            .eq('status', 'Pending')
            .order('created_at', { ascending: false });

        if (reqError) throw reqError;

        renderRequests(requests, donor);

    } catch (error) {
        console.error('Dashboard error:', error);
        requestList.innerHTML = '<p class="text-red-500 font-bold p-6">Error loading data. Please refresh.</p>';
    }

    function renderRequests(requests, donor) {
        requestList.innerHTML = '';
        
        if (!requests || requests.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        requests.forEach(req => {
            const card = document.createElement('div');
            card.className = 'request-card p-6 flex flex-col h-full';
            
            const timeAgo = Math.floor((new Date() - new Date(req.created_at)) / 60000);
            const timeLabel = timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo/60)}h ago`;

            card.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h4 class="text-lg font-bold text-white">${req.name}</h4>
                        <p class="text-[10px] text-gray-400 font-black uppercase tracking-widest">${req.village}, ${req.district}</p>
                    </div>
                    <div class="px-2 py-1 rounded bg-crimson-500/10 border border-crimson-500/30 text-[10px] font-black text-crimson-500">
                        ${timeLabel}
                    </div>
                </div>
                
                <div class="space-y-2 mb-6 flex-grow">
                    <div class="flex items-center gap-2 text-sm text-gray-300">
                        <i class="fa-solid fa-droplet text-crimson-500 w-4"></i>
                        <span>Needs <strong>${req.blood_group}</strong> Blood</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm text-gray-300">
                        <i class="fa-solid fa-phone text-gray-500 w-4"></i>
                        <span>Contact Hidden until Accepted</span>
                    </div>
                </div>

                <button onclick="acceptRequest('${req.id}', '${req.name}', '${req.mobile}', '${req.email}')" 
                        class="w-full py-3 rounded-lg bg-crimson-600 hover:bg-crimson-500 text-white font-black text-xs tracking-widest transition-all">
                    ACCEPT & VIEW CONTACT
                </button>
            `;
            requestList.appendChild(card);
        });
    }

    // Expose to window so onclick works
    window.acceptRequest = async (reqId, reqName, reqMobile, reqEmail) => {
        const donorId = localStorage.getItem('lifesave_donor_id');
        
        if (!confirm('Are you sure you want to accept this request? The patient will be notified.')) return;

        try {
            // Update the request status
            await supabase.from('requests').update({ status: 'Fulfilled' }).eq('id', reqId);
            
            // Update donor's last donation date
            await supabase.from('donors').update({ last_donation_date: new Date().toISOString() }).eq('id', donorId);

            // Redirect to the accept page which handles the rest (Realtime notification + Map redirect)
            // We use the existing accept.html flow
            window.location.href = `accept.html?donorId=${donorId}&reqName=${encodeURIComponent(reqName)}&reqMobile=${reqMobile}&reqEmail=${encodeURIComponent(reqEmail)}`;
            
        } catch (error) {
            console.error('Accept error:', error);
            alert('Failed to accept request. Please try again.');
        }
    };

})();
