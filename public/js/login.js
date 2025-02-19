document.addEventListener('DOMContentLoaded', () => {
    const messageDiv = document.getElementById('verification-message');
    
    function showMessage(message, type = 'info') {
        if (!messageDiv) return;
        
        const colors = {
            success: '#4CAF50',
            info: '#2196F3',
            error: '#f44336'
        };
        
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        messageDiv.style.backgroundColor = colors[type];
        messageDiv.style.color = 'white';
        messageDiv.style.padding = '10px';
        messageDiv.style.marginBottom = '10px';
        messageDiv.style.borderRadius = '4px';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    // Handle URL parameters for verification messages
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true') {
        showMessage('Email verified successfully! Please login.', 'success');
    } else if (urlParams.get('already_verified') === 'true') {
        showMessage('Your account is already verified. Please login.', 'info');
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
                    if (messageDiv && data.message) {
                        messageDiv.textContent = data.message;
                        messageDiv.style.display = 'block';
                        messageDiv.style.backgroundColor = '#2196F3';
                        messageDiv.style.color = 'white';
                        setTimeout(() => {
                            messageDiv.style.display = 'none';
                        }, 5000);
                    } else {
                        alert(data.error || 'Invalid credentials');
                    }
                }
            } catch (err) {
                console.error('Login error:', err);
                showMessage('Error logging in. Please try again.', 'error');
            }
        });
    }
});