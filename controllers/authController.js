const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { pool } = require('../config/database');

// Configure nodemailer with logging
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    debug: true, // Enable debug logging
    logger: true  // Enable logger
});

transporter.verify(function(error, success) {
    if (error) {
        console.error('Email configuration error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

async function sendVerificationEmail(email, verificationToken) {
    console.log('Attempting to send verification email to:', email);
    
    const verificationLink = `${process.env.FRONTEND_URL}/api/auth/verify/${verificationToken}`;
    console.log('Verification link:', verificationLink);
    
    const mailOptions = {
        from: `"FinTrack" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify your FinTrack account',
        html: `
            <h1>Welcome to FinTrack!</h1>
            <p>Please click the link below to verify your account:</p>
            <a href="${verificationLink}">${verificationLink}</a>
        `
    };

    try {
        console.log('Email configuration:', {
            from: process.env.EMAIL_USER,
            frontendUrl: process.env.FRONTEND_URL
        });
        
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw error; // Rethrow to handle in the controller
    }
}


const authController = {
    signup: async (req, res) => {
        const { username, email, password } = req.body;
        const verificationToken = crypto.randomBytes(32).toString('hex');

        try {
            if (!username || !email || !password) {
                console.log('Missing required fields:', { username, email, password });
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
                'INSERT INTO users (username, email, password, verification_token) VALUES ($1, $2, $3, $4) RETURNING id',
                [username, email, hashedPassword, verificationToken]
            );

            const verificationLink = `${process.env.FRONTEND_URL}/api/auth/verify/${verificationToken}`;
            const mailOptions = {
                from: 'FinTrack',
                to: email,
                subject: 'Verify your FinTrack account',
                html: `
                    <h1>Welcome to FinTrack!</h1>
                    <p>Please click the link below to verify your account:</p>
                    <a href="${verificationLink}">${verificationLink}</a>
                `
            };

            await transporter.sendMail(mailOptions);
            res.json({ 
                success: true, 
                message: 'Please check your email to verify your account' 
            });
        } catch (err) {
            console.error('Signup error:', err);
            res.status(500).json({ error: 'Error creating account' });
        }
    },

    verify: async (req, res) => {
        const { token } = req.params;
        
        try {
            console.log('Attempting to verify token:', token);
            
            const result = await pool.query(
                'SELECT * FROM users WHERE verification_token = $1',
                [token]
            );

            if (result.rows.length === 0) {
                console.log('No user found with token:', token);
                return res.status(400).send(`
                    <html>
                        <body>
                            <h1>Invalid or Expired Verification Link</h1>
                            <p>The verification link may have already been used or has expired.</p>
                            <a href="${process.env.FRONTEND_URL}/login.html">Go to Login</a>
                        </body>
                    </html>
                `);
            }

            const user = result.rows[0];

            if (user.is_verified) {
                console.log('User already verified:', user.id);
                return res.redirect(`${process.env.FRONTEND_URL}/login.html?already_verified=true`);
            }

            await pool.query(
                'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = $1',
                [user.id]
            );

            console.log('User successfully verified:', user.id);
            return res.redirect(`${process.env.FRONTEND_URL}/login.html?verified=true`);
            
        } catch (err) {
            console.error('Verification error:', err);
            res.status(500).send(`
                <html>
                    <body>
                        <h1>Error Verifying Account</h1>
                        <p>An error occurred while verifying your account. Please try again later.</p>
                        <a href="${process.env.FRONTEND_URL}/login.html">Go to Login</a>
                    </body>
                </html>
            `);
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
                console.log('User not verified, generating new verification token');
                
                try {
                    // Generate new verification token
                    const newVerificationToken = crypto.randomBytes(32).toString('hex');
                    
                    // Update the verification token in the database
                    await pool.query(
                        'UPDATE users SET verification_token = $1 WHERE id = $2',
                        [newVerificationToken, user.id]
                    );

                    // Send new verification email
                    await sendVerificationEmail(email, newVerificationToken);

                    console.log('New verification email sent successfully');

                    return res.status(401).json({ 
                        success: false,
                        error: 'Please verify your email first',
                        message: 'A new verification email has been sent to your address'
                    });
                } catch (emailError) {
                    console.error('Error in verification email process:', emailError);
                    return res.status(500).json({
                        success: false,
                        error: 'Error sending verification email',
                        message: 'Failed to send verification email. Please try again later.'
                    });
                }
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
                process.env.JWT_SECRET || 'your-secret-key',
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