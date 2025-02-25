const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { pool } = require('../config/database');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Generate a random 6-digit verification code
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationCode(email, code) {
    const mailOptions = {
        from: 'FinTrack',
        to: email,
        subject: 'Your FinTrack Verification Code',
        html: `
            <h1>Welcome to FinTrack!</h1>
            <p>Your verification code is:</p>
            <h2 style="font-size: 32px; letter-spacing: 5px; text-align: center; padding: 20px; background-color: #f5f5f5; border-radius: 5px;">${code}</h2>
            <p>This code will expire in 15 minutes.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return false;
    }
}

const authController = {
    signup: async (req, res) => {
        const { username, email, password } = req.body;
        const verificationCode = generateVerificationCode();
        const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

        try {
            if (!username || !email || !password) {
                return res.status(400).json({ error: 'All fields are required' });
            }

            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters long' });
            }

            const emailCheck = await pool.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            if (emailCheck.rows.length > 0) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            const hashedPassword = await bcrypt.hash(password, 12);
            
            const result = await pool.query(
                'INSERT INTO users (username, email, password, verification_code, verification_code_expires) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [username, email, hashedPassword, verificationCode, codeExpires]
            );

            await sendVerificationCode(email, verificationCode);
            
            res.json({ 
                success: true, 
                message: 'Please check your email for the verification code'
            });
        } catch (err) {
            console.error('Signup error:', err);
            res.status(500).json({ error: 'Error creating account' });
        }
    },

    verify: async (req, res) => {
        const { email, code } = req.body;
        
        try {
            const result = await pool.query(
                'SELECT * FROM users WHERE email = $1 AND verification_code = $2 AND verification_code_expires > NOW() AND NOT is_verified',
                [email, code]
            );

            if (result.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid or expired verification code'
                });
            }

            const user = result.rows[0];

            await pool.query(
                'UPDATE users SET is_verified = TRUE, verification_code = NULL, verification_code_expires = NULL WHERE id = $1',
                [user.id]
            );

            res.json({
                success: true,
                message: 'Email verified successfully'
            });
            
        } catch (err) {
            console.error('Verification error:', err);
            res.status(500).json({
                success: false,
                error: 'Error verifying account'
            });
        }
    },

    resendCode: async (req, res) => {
        const { email } = req.body;
        const newCode = generateVerificationCode();
        const codeExpires = new Date(Date.now() + 15 * 60 * 1000);

        try {
            const result = await pool.query(
                'UPDATE users SET verification_code = $1, verification_code_expires = $2 WHERE email = $3 AND NOT is_verified RETURNING id',
                [newCode, codeExpires, email]
            );

            if (result.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Email not found or already verified'
                });
            }

            await sendVerificationCode(email, newCode);

            res.json({
                success: true,
                message: 'New verification code sent'
            });
        } catch (err) {
            console.error('Error resending code:', err);
            res.status(500).json({
                success: false,
                error: 'Error sending verification code'
            });
        }
    },

    login: async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        try {
            console.log('Attempting login for email:', email);
            
            const result = await pool.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const user = result.rows[0];
            
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            if (!user.is_verified) {
                // Generate new verification code
                const newCode = generateVerificationCode();
                const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
                
                await pool.query(
                    'UPDATE users SET verification_code = $1, verification_code_expires = $2 WHERE id = $3',
                    [newCode, codeExpires, user.id]
                );

                await sendVerificationCode(email, newCode);

                return res.status(401).json({ 
                    error: 'Please verify your email first',
                    message: 'A new verification code has been sent to your email'
                });
            }

            // Generate new session token
            const sessionToken = crypto.randomBytes(32).toString('hex');
            
            // Invalidate all existing sessions for this user
            await pool.query(
                'DELETE FROM user_tokens WHERE user_id = $1',
                [user.id]
            );

            // Store new session
            await pool.query(
                'INSERT INTO user_tokens (user_id, token, device_id) VALUES ($1, $2, $3)',
                [user.id, sessionToken, 'current']
            );

            // Generate JWT token
            const token = jwt.sign(
                { 
                    userId: user.id,
                    sessionToken: sessionToken 
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            // Set session
            req.session.userId = user.id;

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    },

    logout: async (req, res) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                await pool.query(
                    'DELETE FROM user_tokens WHERE user_id = $1 AND token = $2',
                    [decoded.userId, decoded.sessionToken]
                );
            }

            req.session.destroy();
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Error during logout' });
        }
    }
};

module.exports = authController;