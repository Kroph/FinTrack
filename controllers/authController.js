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

const authController = {
    signup: async (req, res) => {
        const { username, email, password } = req.body;
        const verificationToken = crypto.randomBytes(32).toString('hex');

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
            console.error(err);
            res.status(500).json({ error: 'Error creating account' });
        }
    },

    verify: async (req, res) => {
        try {
            const result = await pool.query(
                'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1 RETURNING id',
                [req.params.token]
            );

            if (result.rows.length > 0) {
                res.redirect('/login.html?verified=true');
            } else {
                res.status(400).send('Invalid or expired verification token');
            }
        } catch (err) {
            console.error(err);
            res.status(500).send('Error verifying account');
        }
    },

    login: async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        try {
            const result = await pool.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const user = result.rows[0];
            
            if (!user.is_verified) {
                return res.status(401).json({ error: 'Please verify your email first' });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
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