function initLogin() {
    const loginForm = document.getElementById('login-form');
    const authMessage = document.getElementById('auth-message');
    const loginButton = document.getElementById('login-button');
    const loader = document.getElementById('login-loader');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loader
        loginButton.disabled = true;
        loader.style.display = 'inline-block';
        
        // Get form data
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
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            
            // Store token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirect to home page
            window.location.href = '/home.html';
        } catch (error) {
            // Display error message
            authMessage.textContent = error.message;
            authMessage.className = 'auth-message error';
        } finally {
            // Hide loader and re-enable button
            loginButton.disabled = false;
            loader.style.display = 'none';
        }
    });
}

// Signup functionality
function initSignup() {
    const signupForm = document.getElementById('signup-form');
    const authMessage = document.getElementById('auth-message');
    const signupButton = document.getElementById('signup-button');
    const loader = document.getElementById('signup-loader');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    
    // Form submission
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate passwords match
        if (passwordInput.value !== confirmPasswordInput.value) {
            authMessage.textContent = 'Passwords do not match';
            authMessage.className = 'auth-message error';
            return;
        }
        
        // Show loader
        signupButton.disabled = true;
        loader.style.display = 'inline-block';
        
        // Get form data
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = passwordInput.value;
        
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Signup failed');
            }
            
            // Show success message
            authMessage.textContent = 'Account created successfully! Redirecting to verification...';
            authMessage.className = 'auth-message success';
            
            // Store email for verification
            localStorage.setItem('pendingVerification', email);
            
            // Redirect to verification page after 2 seconds
            setTimeout(() => {
                window.location.href = '/verify.html';
            }, 2000);
            
        } catch (error) {
            // Display error message
            authMessage.textContent = error.message;
            authMessage.className = 'auth-message error';
            
            // Re-enable button and hide loader
            signupButton.disabled = false;
            loader.style.display = 'none';
        }
    });
}

// Verification functionality
function initVerification() {
    const verificationForm = document.getElementById('verification-form');
    const authMessage = document.getElementById('auth-message');
    const verifyButton = document.getElementById('verify-button');
    const resendButton = document.getElementById('resend-button');
    const verifyLoader = document.getElementById('verify-loader');
    const userEmailEl = document.getElementById('user-email');
    const codeInputs = document.querySelectorAll('.code-input');
    
    // Get email from localStorage (set during signup)
    const email = localStorage.getItem('pendingVerification');
    if (email) {
        userEmailEl.textContent = email;
    } else {
        // If no email in storage, redirect to signup
        // window.location.href = '/signup.html';
    }
    
    // Auto-focus to next input when a digit is entered
    codeInputs.forEach((input, index) => {
        input.addEventListener('keyup', (e) => {
            // Move to next input if current is filled
            if (input.value && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }
            
            // Handle backspace - move to previous input
            if (e.key === 'Backspace' && index > 0 && !input.value) {
                codeInputs[index - 1].focus();
            }
        });
        
        // Handle paste event for the entire code
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text');
            
            // If pasted content is a 6-digit number
            if (/^\d{6}$/.test(pasteData)) {
                // Fill all inputs with the digits
                [...pasteData].forEach((digit, i) => {
                    if (i < codeInputs.length) {
                        codeInputs[i].value = digit;
                    }
                });
                
                // Focus on the last input
                codeInputs[codeInputs.length - 1].focus();
            }
        });
    });
    
    // Form submission
    verificationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Combine the code inputs into a single string
        const code = Array.from(codeInputs).map(input => input.value).join('');
        
        // Ensure we have a 6-digit code
        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
            authMessage.textContent = 'Please enter a valid 6-digit code';
            authMessage.className = 'auth-message error';
            return;
        }
        
        // Show loader
        verifyButton.disabled = true;
        verifyLoader.style.display = 'inline-block';
        
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, code })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }
            
            // Show success message
            authMessage.textContent = 'Email verified successfully! Redirecting to login...';
            authMessage.className = 'auth-message success';
            
            // Clear pending verification
            localStorage.removeItem('pendingVerification');
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
            
        } catch (error) {
            // Display error message
            authMessage.textContent = error.message;
            authMessage.className = 'auth-message error';
            
            // Re-enable button and hide loader
            verifyButton.disabled = false;
            verifyLoader.style.display = 'none';
        }
    });
    
    // Resend code button
    resendButton.addEventListener('click', async () => {
        if (resendButton.disabled) return;
        
        try {
            const response = await fetch('/api/auth/resend-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to resend code');
            }
            
            // Show success message
            authMessage.textContent = 'Verification code resent successfully';
            authMessage.className = 'auth-message success';
            
        } catch (error) {
            // Display error message
            authMessage.textContent = error.message;
            authMessage.className = 'auth-message error';
        }
    });
    
    // Focus on first input by default
    codeInputs[0].focus();
}

// Common logout function
function logout() {
    const token = localStorage.getItem('token');
    
    fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .finally(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    });
}

// Authentication check function
async function checkAuthState() {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error('No authentication token found');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return false;
        }
        
        // Test the token by making a request to the user endpoint
        const response = await fetch('/api/auth/user', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.error('Authentication check failed:', response.status);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return false;
        }
        
        console.log('Authentication check passed');
        return true;
    } catch (error) {
        console.error('Authentication error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
        return false;
    }
}

// Check if we're on a specific auth page and initialize its functionality
document.addEventListener('DOMContentLoaded', () => {
    // Get the current HTML file name from the URL
    const currentPage = window.location.pathname.split('/').pop();
    
    switch(currentPage) {
        case 'login.html':
            initLogin();
            break;
        case 'signup.html':
            initSignup();
            break;
        case 'verify.html':
            initVerification();
            break;
    }
});