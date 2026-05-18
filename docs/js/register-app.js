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

            // 2. Save directly to Supabase first (ensure registration works even without backend)
            const { error: sbError } = await supabaseClient
                .from('donors')
                .insert({
                    name: data.name,
                    mobile: data.mobile,
                    email: data.email.toLowerCase().trim(),
                    blood_group: data.bloodGroup.toUpperCase(),
                    last_donation_date: data.lastDonationDate ? new Date(data.lastDonationDate).toISOString() : null,
                    village: data.village,
                    post: data.post,
                    district: data.district,
                    state: data.state,
                    location: `POINT(${coords[0]} ${coords[1]})`
                });

            if (sbError) {
                if (sbError.code === '23505') {
                    showMessage('This email is already registered.', 'error');
                } else {
                    console.error('Supabase error:', sbError.message);
                    showMessage('Registration failed. Please try again.', 'error');
                }
                return;
            }

            // 3. Send welcome email via pg_net RPC Function
            const htmlContent = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a1628; border-radius: 16px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">🩸 LifeSave Network</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Blood Donation Platform</p>
                    </div>
                    <div style="padding: 30px; color: #e2e8f0;">
                        <h2 style="color: #34d399; margin-top: 0;">Welcome, ${data.name}! 🎉</h2>
                        <p style="line-height: 1.6;">Thank you for registering as a blood donor in our network. Your decision to join can save lives.</p>
                        <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 12px; padding: 16px; margin: 20px 0;">
                            <p style="margin: 0; color: #34d399; font-weight: bold;">✅ Your profile is now active</p>
                            <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">When someone within 15km of your location needs your blood group, you will receive an urgent email notification with an ACCEPT button.</p>
                        </div>
                        <p style="color: #64748b; font-size: 13px; margin-top: 30px;">Best Regards,<br><strong style="color: #34d399;">LifeSave Team</strong></p>
                    </div>
                </div>
            `;

            supabaseClient.rpc('send_donor_email', {
                p_to_email: data.email.toLowerCase().trim(),
                p_subject: 'Welcome to the LifeSave Network!',
                p_html_content: htmlContent
            }).then(({ error }) => {
                if (error) console.error('Welcome email error:', error.message);
                else console.log('✅ Welcome email sent via pg_net');
            }).catch(err => console.error('RPC Function error:', err.message));

            // 4. Success message (always shown if Supabase insert worked)
            showMessage('Registration Successful! You are now part of the LIFESAVE network.', 'success');
            form.reset();
            // Re-set default state value after reset
            form.querySelector('[name="state"]').value = 'West Bengal';

        } catch (error) {
            console.error('Registration error:', error);
            if (error.message && error.message.includes('Failed to fetch')) {
                showMessage('Network error. Please check your internet connection.', 'error');
            } else {
                showMessage(`Registration error: ${error.message || 'Unknown error. Please try again.'}`, 'error');
            }
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
