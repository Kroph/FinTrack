const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../config/database');
const path = require('path');

router.post('/verify', authController.verify);
router.post('/resend-code', authController.resendCode);
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

router.get('/verify', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/verify.html'));
});

router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

router.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/home.html'));
});

router.get('/user', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching user information'
        });
    }
});

module.exports = router;