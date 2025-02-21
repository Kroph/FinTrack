document.addEventListener('DOMContentLoaded', () => {
    const verificationForm = document.getElementById('verification-form');
    const resendButton = document.getElementById('resend-button');
    const messageDiv = document.getElementById('verification-message');
    const codeInputs = document.querySelectorAll('.code-input');
    
    // Get email from sessionStorage (set during login/signup)
    const email = sessionStorage.getItem('verificationEmail');
    if (!email) {
        window.location.href = '/login.html';
        return;
    }

    function showMessage(message, type) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
    }

    // Handle code input behavior
    codeInputs.forEach((input, index) => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
                codeInputs[index - 1].focus();
            }
        });

        input.addEventListener('input', (e) => {
            if (e.inputType === 'deleteContentBackward' && index > 0) {
                codeInputs[index - 1].focus();
                return;
            }

            const value = e.target.value;
            
            if (!/^\d*$/.test(value)) {
                e.target.value = '';
                return;
            }

            if (value && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text');
            if (!/^\d*$/.test(pastedData)) return;

            const digits = pastedData.split('').slice(0, 6);
            digits.forEach((digit, i) => {
                if (i < codeInputs.length) {
                    codeInputs[i].value = digit;
                }
            });

            if (digits.length === 6) {
                verifyCode(digits.join(''));
            }
        });
    });

    async function verifyCode(code) {
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    code
                })
            });

            const data = await response.json();
            
            if (data.success) {
                showMessage('Email verified successfully! Redirecting...', 'success');
                sessionStorage.removeItem('verificationEmail');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                showMessage(data.error || 'Verification failed', 'error');
                codeInputs.forEach(input => input.value = '');
                codeInputs[0].focus();
            }
        } catch (error) {
            showMessage('Error verifying code. Please try again.', 'error');
        }
    }

    verificationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = Array.from(codeInputs)
            .map(input => input.value)
            .join('');
            
        if (code.length === 6) {
            verifyCode(code);
        }
    });

    resendButton.addEventListener('click', async () => {
        resendButton.disabled = true;
        try {
            const response = await fetch('/api/auth/resend-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            showMessage(
                data.success ? 'New verification code sent!' : (data.error || 'Failed to send code'),
                data.success ? 'success' : 'error'
            );
        } catch (error) {
            showMessage('Error sending verification code', 'error');
        } finally {
            resendButton.disabled = false;
            setTimeout(() => {
                resendButton.disabled = false;
            }, 60000); // Enable after 1 minute
        }
    });
});