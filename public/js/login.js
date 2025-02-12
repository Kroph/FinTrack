document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const messageDiv = document.getElementById('verification-message');

    if (urlParams.get('verified') === 'true' && messageDiv) {
        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                if (data.success) {
                    localStorage.setItem('token', data.token);
                    window.location.href = '/home.html';
                } else {
                    alert(data.error || 'Invalid credentials');
                }
            } catch (err) {
                alert('Error logging in');
            }
        });
    }
});