const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');

// User management routes
router.get('/users', requireAuth, adminController.getUsers);
router.get('/users/search', requireAuth, adminController.searchUsers);
router.delete('/users/:id', requireAuth, adminController.deleteUser);

// Admin management routes
router.post('/users/:id/promote', requireAuth, adminController.promoteToAdmin);
router.post('/users/:id/revoke', requireAuth, adminController.revokeAdmin);

module.exports = router;