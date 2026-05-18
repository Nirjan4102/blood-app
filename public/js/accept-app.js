/**
 * LIFESAVE — Donor Accept Handler (Browser)
 * Replaces Express GET /api/donors/accept
 * This page is loaded when a donor clicks "ACCEPT & VIEW LOCATION" in their email.
 * It updates the donor's last_donation_date in Supabase, then redirects to map-view.html.
 * Depends on: config.js, supabase-client.js
 */
(async function () {
    const statusEl = document.getElementById('accept-status');
    const params = new URLSearchParams(window.location.search);

    const donorId = params.get('donorId');
    const reqName = params.get('reqName');
    const reqMobile = params.get('reqMobile');
    const reqLat = params.get('reqLat');
    const reqLng = params.get('reqLng');
    const reqEmail = params.get('reqEmail');

    if (!donorId) {
        statusEl.innerText = 'Invalid accept link. Missing donor ID.';
        statusEl.style.color = '#ff5c75';
        return;
    }

    try {
        statusEl.innerText = 'Processing your acceptance...';

        // 1. Update donor's last donation date and get their full info
        const { data: updatedDonor, error } = await supabaseClient
            .from('donors')
            .update({ last_donation_date: new Date().toISOString() })
            .eq('id', donorId)
            .select()
            .single();

        if (error || !updatedDonor) {
            statusEl.innerText = 'Donor record not found or already processed.';
            statusEl.style.color = '#ff5c75';
            console.error('Accept error:', error?.message);
            return;
        }

        // 2. Optionally notify the requester via pg_net RPC
        try {
            const htmlContent = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a1628; border-radius: 16px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Great News!</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">A donor has accepted your request</p>
                    </div>
                    <div style="padding: 30px; color: #e2e8f0;">
                        <h2 style="color: #34d399; margin-top: 0;">A Donor is Coming!</h2>
                        <p style="line-height: 1.6;">A volunteer blood donor has accepted your emergency blood request and is ready to help.</p>
                        <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 12px; padding: 16px; margin: 20px 0;">
                        <p style="margin: 0 0 8px;"><strong style="color: #34d399;">Donor Name:</strong> <span style="color: #e2e8f0;">${updatedDonor.name}</span></p>
                        <p style="margin: 0;"><strong style="color: #34d399;">Contact:</strong> <a href="tel:${updatedDonor.mobile}" style="color: #60a5fa; text-decoration: none;">${updatedDonor.mobile}</a></p>
                        </div>
                        <p style="line-height: 1.6; color: #fbbf24; font-weight: bold;">⚡ Please contact them immediately to coordinate.</p>
                        <p style="color: #64748b; font-size: 13px; margin-top: 30px;">Best Regards,<br><strong style="color: #34d399;">LifeSave Team</strong></p>
                    </div>
                </div>
            `;
            await supabaseClient.rpc('send_donor_email', {
                p_to_email: reqEmail,
                p_subject: '🎉 A Donor is Coming — LifeSave Update',
                p_html_content: htmlContent
            });
        } catch (fnError) {
            console.log('RPC function not available — requester email skipped.', fnError);
        }

        // 3. Redirect to Map View with all params
        statusEl.innerText = 'Accepted! Redirecting to navigation...';
        statusEl.style.color = '#34d399';

        const redirectUrl = `map-view.html?` +
            `reqName=${encodeURIComponent(reqName || '')}` +
            `&reqMobile=${reqMobile || ''}` +
            `&reqLat=${reqLat || ''}` +
            `&reqLng=${reqLng || ''}` +
            `&donorName=${encodeURIComponent(updatedDonor.name)}` +
            `&donorMobile=${updatedDonor.mobile}`;

        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1200);

    } catch (error) {
        console.error('Accept error:', error);
        statusEl.innerText = 'An error occurred. Please try again.';
        statusEl.style.color = '#ff5c75';
    }
})();
