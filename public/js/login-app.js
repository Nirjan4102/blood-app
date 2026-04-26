/**
 * LIFESAVE — Donor Login Logic
 * Verifies Email + Mobile in Supabase and redirects to dashboard.
 */
(function () {
    const form = document.getElementById('loginForm');
    const btn = document.getElementById('submitBtn');
    const messageDiv = document.getElementById('message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        btn.disabled = true;
        btn.innerHTML = '<span>Verifying...</span>';
        messageDiv.classList.add('hidden');

        const formData = new FormData(form);
        const email = formData.get('email').toLowerCase().trim();
        const mobile = formData.get('mobile').trim();

        try {
            // Query for the donor
            const { data, error } = await supabase
                .from('donors')
                .select('*')
                .eq('email', email)
                .eq('mobile', mobile)
                .single();

            if (error || !data) {
                showMessage('Invalid email or mobile number. Please check your details.', 'error');
                return;
            }

            // Success! Store donor ID and redirect
            localStorage.setItem('lifesave_donor_id', data.id);
            localStorage.setItem('lifesave_donor_name', data.name);
            
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'donor-dashboard.html';
            }, 1000);

        } catch (error) {
            console.error('Login error:', error);
            showMessage('An unexpected error occurred. Please try again.', 'error');
        } finally {
            if (!messageDiv.classList.contains('hidden') && messageDiv.querySelector('div').style.color !== '#34d399') {
                btn.disabled = false;
                btn.innerHTML = '<span>LOGIN TO DASHBOARD</span> <i class="fa-solid fa-arrow-right-to-bracket"></i>';
            }
        }
    });

    function showMessage(text, type) {
        const p = messageDiv.querySelector('p');
        p.innerText = text;
        const div = messageDiv.querySelector('div');

        if (type === 'success') {
            div.style.cssText = 'background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); color:#34d399; padding:1rem; border-radius:0.75rem; text-align:center;';
        } else {
            div.style.cssText = 'background:rgba(255,42,75,0.1); border:1px solid rgba(255,42,75,0.3); color:#ff5c75; padding:1rem; border-radius:0.75rem; text-align:center;';
        }
        messageDiv.classList.remove('hidden');
    }
})();
