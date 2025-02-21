const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
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

module.exports = router;