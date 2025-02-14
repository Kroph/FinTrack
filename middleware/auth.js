const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Database connection errors
    if (err.code === 'ECONNREFUSED' || err.code === '57P01') {
        return res.status(503).json({
            success: false,
            error: 'Database connection failed'
        });
    }
    
    // Session errors
    if (err.name === 'SessionError') {
        return res.status(401).json({
            success: false,
            error: 'Session expired'
        });
    }
    
    // Generic error response
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal Server Error' 
            : err.message
    });
});

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