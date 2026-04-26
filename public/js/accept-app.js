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
        const { data: updatedDonor, error } = await supabase
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

        // 2. Optionally notify the requester via Edge Function
        try {
            await supabase.functions.invoke('notify-requester', {
                body: {
                    reqEmail,
                    donorName: updatedDonor.name,
                    donorMobile: updatedDonor.mobile
                }
            });
        } catch (fnError) {
            // Edge Function not deployed — skip email notification
            console.log('Edge Function not available — requester email skipped.');
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
