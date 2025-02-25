const { pool } = require('../config/database');

const adminController = {
    getUsers: async (req, res) => {
        try {
            // Check if the requesting user is an admin
            const adminCheck = await pool.query(
                'SELECT is_admin FROM users WHERE id = $1',
                [req.user.userId]
            );

            if (!adminCheck.rows[0]?.is_admin) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: Admin privileges required'
                });
            }

            const result = await pool.query(
                'SELECT id, username, email, created_at, is_admin FROM users ORDER BY created_at DESC'
            );

            res.json({
                success: true,
                users: result.rows
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ 
                success: false, 
                error: 'Error fetching users' 
            });
        }
    },

    searchUsers: async (req, res) => {
        const { term } = req.query;

        try {
            // Check if the requesting user is an admin
            const adminCheck = await pool.query(
                'SELECT is_admin FROM users WHERE id = $1',
                [req.user.userId]
            );

            if (!adminCheck.rows[0]?.is_admin) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: Admin privileges required'
                });
            }

            const result = await pool.query(
                'SELECT id, username, email, created_at, is_admin FROM users WHERE username ILIKE $1 OR email ILIKE $1 ORDER BY created_at DESC',
                [`%${term}%`]
            );

            res.json({
                success: true,
                users: result.rows
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ 
                success: false, 
                error: 'Error searching users' 
            });
        }
    },

    deleteUser: async (req, res) => {
        const { id } = req.params;
    
        try {
            // Check if the requesting user is an admin
            const adminCheck = await pool.query(
                'SELECT is_admin FROM users WHERE id = $1',
                [req.user.userId]
            );
    
            if (!adminCheck.rows[0]?.is_admin) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: Admin privileges required'
                });
            }
    
            // Check if trying to delete an admin user
            const userCheck = await pool.query(
                'SELECT is_admin FROM users WHERE id = $1',
                [id]
            );
    
            if (userCheck.rows[0]?.is_admin) {
                return res.status(403).json({
                    success: false,
                    error: 'Cannot delete admin users'
                });
            }
    
            await pool.query('BEGIN');
    
            // Delete user's sessions
            await pool.query('DELETE FROM user_sessions WHERE sess->>\'userId\' = $1', [id]);
            
            // Delete user's tokens
            await pool.query('DELETE FROM user_tokens WHERE user_id = $1', [id]);
            
            // Delete user's transactions - fixed from expenses/income to transactions
            await pool.query('DELETE FROM transactions WHERE user_id = $1', [id]);
            
            // Finally, delete the user
            const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    
            await pool.query('COMMIT');
    
            if (result.rowCount === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'User not found' 
                });
            }
    
            res.json({
                success: true,
                message: 'User deleted successfully'
            });
        } catch (err) {
            await pool.query('ROLLBACK');
            console.error(err);
            res.status(500).json({ 
                success: false, 
                error: 'Error deleting user' 
            });
        }
    },

    promoteToAdmin: async (req, res) => {
        const { id } = req.params;

        try {
            // Check if the requesting user is an admin
            const adminCheck = await pool.query(
                'SELECT is_admin FROM users WHERE id = $1',
                [req.user.userId]
            );

            if (!adminCheck.rows[0]?.is_admin) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: Admin privileges required'
                });
            }

            const result = await pool.query(
                'UPDATE users SET is_admin = true WHERE id = $1 RETURNING id, username, email, is_admin',
                [id]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            res.json({
                success: true,
                message: 'User promoted to admin successfully',
                user: result.rows[0]
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                error: 'Error promoting user to admin'
            });
        }
    },

    revokeAdmin: async (req, res) => {
        const { id } = req.params;

        try {
            // Check if the requesting user is an admin
            const adminCheck = await pool.query(
                'SELECT is_admin FROM users WHERE id = $1',
                [req.user.userId]
            );

            if (!adminCheck.rows[0]?.is_admin) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied: Admin privileges required'
                });
            }

            // Prevent revoking own admin rights
            if (parseInt(id) === req.user.userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Cannot revoke your own admin privileges'
                });
            }

            const result = await pool.query(
                'UPDATE users SET is_admin = false WHERE id = $1 RETURNING id, username, email, is_admin',
                [id]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            res.json({
                success: true,
                message: 'Admin privileges revoked successfully',
                user: result.rows[0]
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                error: 'Error revoking admin privileges'
            });
        }
    }
};

module.exports = adminController;