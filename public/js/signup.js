document.addEventListener('DOMContentLoaded', () => {
    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay" id="verificationModal">
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">Verify Your Email</h2>
                    <button class="close-btn" id="closeModal">&times;</button>
                </div>
                <div class="message" id="modalMessage"></div>
                <div class="modal-body">
                    <form id="verificationForm">
                        <div class="form-group">
                            <label for="code-1">Verification Code</label>
                            <div class="code-inputs">
                                <input type="text" id="code-1" maxlength="1" class="code-input">
                                <input type="text" id="code-2" maxlength="1" class="code-input">
                                <input type="text" id="code-3" maxlength="1" class="code-input">
                                <input type="text" id="code-4" maxlength="1" class="code-input">
                                <input type="text" id="code-5" maxlength="1" class="code-input">
                                <input type="text" id="code-6" maxlength="1" class="code-input">
                            </div>
                            <div class="help-text">Enter the 6-digit code sent to your email</div>
                        </div>
                        <div class="modal-buttons">
                            <button type="submit" class="verify-btn" id="verifyButton">
                                Verify
                            </button>
                            <button type="button" class="resend-btn" id="resendButton">
                                Resend Code
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `);

    const signupForm = document.getElementById('signup-form');
    const verificationModal = document.getElementById('verificationModal');
    const verificationForm = document.getElementById('verificationForm');
    const resendButton = document.getElementById('resendButton');
    const modalMessage = document.getElementById('modalMessage');
    const closeModalButton = document.getElementById('closeModal');
    const codeInputs = document.querySelectorAll('.code-input');
    let userEmail = '';

    const style = document.createElement('style');
    style.textContent = `
        .code-inputs {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
        }
        .code-input {
            width: 40px;
            height: 40px;
            text-align: center;
            font-size: 20px;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin: 0;
        }
        .code-input:focus {
            border-color: #5c0099;
            outline: none;
            box-shadow: 0 0 0 2px rgba(92, 0, 153, 0.2);
        }
        .close-btn {
            position: absolute;
            right: 15px;
            top: 15px;
            font-size: 24px;
            background: none;
            border: none;
            cursor: pointer;
            color: #666;
        }
        .close-btn:hover {
            color: #333;
        }
    `;
    document.head.appendChild(style);

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

            if (index === codeInputs.length - 1 && value) {
                const code = Array.from(codeInputs)
                    .map(input => input.value)
                    .join('');
                if (code.length === 6) {
                    verifyCode(code);
                }
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

    function showMessage(message, type) {
        modalMessage.textContent = message;
        modalMessage.className = `message ${type}`;
        modalMessage.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                hideModal();
                window.location.href = '/login.html';
            }, 2000);
        }
    }

    function showModal() {
        verificationModal.style.display = 'block';
        codeInputs[0].focus();
    }

    function hideModal() {
        verificationModal.style.display = 'none';
        modalMessage.style.display = 'none';
        verificationForm.reset();
        codeInputs.forEach(input => input.value = '');
    }

    async function verifyCode(code) {
        const verifyButton = document.getElementById('verifyButton');
        verifyButton.disabled = true;
        verifyButton.textContent = 'Verifying...';

        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    email: userEmail,
                    code: code 
                })
            });

            const data = await response.json();
            if (data.success) {
                showMessage('Account verified successfully!', 'success');
            } else {
                showMessage(data.error || 'Verification failed', 'error');
                codeInputs.forEach(input => input.value = '');
                codeInputs[0].focus();
            }
        } catch (error) {
            showMessage('Error verifying account', 'error');
        } finally {
            verifyButton.disabled = false;
            verifyButton.textContent = 'Verify';
        }
    }

    closeModalButton.addEventListener('click', hideModal);
    verificationModal.addEventListener('click', (e) => {
        if (e.target === verificationModal) {
            hideModal();
        }
    });

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

                const data = await response.json();
                if (data.success) {
                    userEmail = email;
                    showModal();
                } else {
                    alert(data.error || 'Error creating account');
                }
            } catch (err) {
                console.error('Signup error:', err);
                alert(err.message || 'Error signing up');
            }
        });
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
        resendButton.textContent = 'Sending...';

        try {
            const response = await fetch('/api/auth/resend-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: userEmail })
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
            resendButton.textContent = 'Resend Code';
        }
    });
});