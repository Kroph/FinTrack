document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const messageDiv = document.getElementById('verification-message');
    
    function showMessage(message, type) {
        if (!messageDiv) return;
        
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true') {
        showMessage('Email verified successfully! Please log in.', 'success');
        window.history.replaceState({}, document.title, '/login.html');
    }
    
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
                } else if (data.error === 'Please verify your email first') {
                    sessionStorage.setItem('verificationEmail', email);
                    window.location.href = '/verify.html';
                } else {
                    showMessage(data.error || 'Invalid credentials', 'error');
                }
            } catch (err) {
                console.error('Login error:', err);
                showMessage('Error logging in. Please try again.', 'error');
            }
        });
    }
});