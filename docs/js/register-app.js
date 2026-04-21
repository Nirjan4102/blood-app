/**
 * LIFESAVE — Donor Registration Logic (Browser)
 * Replaces Express POST /api/donors/register
 * Depends on: config.js, supabase-client.js, geocoder.js
 */
(function () {
    const form = document.getElementById('donorForm');
    const btn = document.getElementById('submitBtn');
    const messageDiv = document.getElementById('message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // UI Feedback
        btn.disabled = true;
        btn.innerHTML = '<span class="premium-text">Processing Registration...</span>';
        messageDiv.classList.add('hidden');

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            // 1. Geocode the address
            const coords = await getCoordinates({
                village: data.village,
                post: data.post,
                district: data.district,
                state: data.state
            });

            if (!coords) {
                showMessage('Location not found. Please check your address details.', 'error');
                return;
            }

            // 2. Insert donor into Supabase with PostGIS POINT geometry
            const { error } = await supabase
                .from('donors')
                .insert({
                    name: data.name,
                    mobile: data.mobile,
                    email: data.email.toLowerCase().trim(),
                    blood_group: data.bloodGroup.toUpperCase(),
                    last_donation_date: data.lastDonationDate
                        ? new Date(data.lastDonationDate).toISOString()
                        : null,
                    village: data.village,
                    post: data.post,
                    district: data.district,
                    state: data.state,
                    // PostGIS expects WKT format: POINT(longitude latitude)
                    location: `POINT(${coords[0]} ${coords[1]})`
                });

            if (error) {
                // Supabase unique constraint violation code
                if (error.code === '23505') {
                    showMessage('This email is already registered.', 'error');
                } else {
                    console.error('Supabase insert error:', error.message);
                    showMessage('Registration failed. Please try again.', 'error');
                }
                return;
            }

            // 3. Success
            showMessage('Registration Successful! You are now part of the LIFESAVE network.', 'success');
            form.reset();
            // Re-set default state value after reset
            form.querySelector('[name="state"]').value = 'West Bengal';

        } catch (error) {
            console.error('Registration error:', error);
            showMessage('Connection failed. Please check your internet.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span class="premium-text">Register as Donor</span> <i class="fa-solid fa-user-plus"></i>';
        }
    });

    function showMessage(text, type) {
        const p = messageDiv.querySelector('p');
        p.innerText = text;
        p.className = 'font-bold';

        if (type === 'success') {
            messageDiv.querySelector('div').style.cssText =
                'background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);color:#34d399;padding:1rem;border-radius:0.75rem;text-align:center;';
        } else {
            messageDiv.querySelector('div').style.cssText =
                'background:rgba(255,42,75,0.1);border:1px solid rgba(255,42,75,0.3);color:#ff5c75;padding:1rem;border-radius:0.75rem;text-align:center;';
        }
        messageDiv.classList.remove('hidden');
    }
})();
