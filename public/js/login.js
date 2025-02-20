document.addEventListener('DOMContentLoaded', () => {
    const messageDiv = document.getElementById('verification-message');
    
    function showMessage(message, type = 'info') {
        if (!messageDiv) return;
        
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        messageDiv.style.backgroundColor = {
            success: '#4CAF50',
            info: '#2196F3',
            error: '#f44336'
        }[type];
        messageDiv.style.color = 'white';
        messageDiv.style.padding = '10px';
        messageDiv.style.marginBottom = '10px';
        messageDiv.style.borderRadius = '4px';
        
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
                } else if (data.requiresVerification) {
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