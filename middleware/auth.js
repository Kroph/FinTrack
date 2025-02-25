const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const requireAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify session token exists in database and is the most recent one
        const result = await pool.query(
            'SELECT * FROM user_tokens WHERE user_id = $1 AND token = $2',
            [decoded.userId, decoded.sessionToken]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Session expired. Please login again.' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = { requireAuth };