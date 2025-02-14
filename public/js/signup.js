document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ username, email, password })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error signing up');
                }

                const data = await response.json();
                if (data.success) {
                    alert('Please check your email to verify your account');
                    window.location.href = '/login.html';
                } else {
                    alert(data.error || 'Error creating account');
                }
            } catch (err) {
                console.error('Signup error:', err);
                alert(err.message || 'Error signing up');
            }
        });
    }
});