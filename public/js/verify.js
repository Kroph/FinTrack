document.addEventListener('DOMContentLoaded', () => {
    const verificationForm = document.getElementById('verification-form');
    const resendButton = document.getElementById('resend-code');
    const messageDiv = document.getElementById('verification-message');
    const storedEmail = sessionStorage.getItem('verificationEmail');

    if (!storedEmail) {
        window.location.href = '/login.html';
        return;
    }

    function showMessage(message, type = 'info') {
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        messageDiv.className = `alert ${type}`;
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    verificationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('code').value;

        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    email: storedEmail,
                    code: code 
                })
            });

            const data = await response.json();

            if (data.success) {
                showMessage('Account verified successfully!', 'success');
                sessionStorage.removeItem('verificationEmail');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                showMessage(data.error, 'error');
            }
        } catch (error) {
            showMessage('Error verifying account', 'error');
        }
    });

    resendButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/auth/resend-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: storedEmail })
            });

            const data = await response.json();

            if (data.success) {
                showMessage('New verification code sent!', 'success');
            } else {
                showMessage(data.error, 'error');
            }
        } catch (error) {
            showMessage('Error sending verification code', 'error');
        }
    });
});