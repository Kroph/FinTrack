const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../config/database');

router.post('/', requireAuth, async (req, res) => {
    try {
        const { amount, description, date, type, category } = req.body;
        const userId = req.user.userId;

        if (!['income', 'expense'].includes(type)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid transaction type' 
            });
        }

        const result = await pool.query(
            'INSERT INTO transactions (user_id, amount, description, date, type, category) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [userId, amount, description, date, type, category]
        );

        res.json({ success: true, transaction: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const type = req.query.type;
        const category = req.query.category;

        let query = 'SELECT * FROM transactions WHERE user_id = $1';
        const queryParams = [userId];
        let paramIndex = 2;

        if (type && ['income', 'expense'].includes(type)) {
            query += ` AND type = $${paramIndex}`;
            queryParams.push(type);
            paramIndex++;
        }

        if (category) {
            query += ` AND category = $${paramIndex}`;
            queryParams.push(category);
            paramIndex++;
        }

        query += ' ORDER BY date DESC';

        const result = await pool.query(query, queryParams);
        res.json({ success: true, transactions: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { amount, description, date, type, category } = req.body;
        const transactionId = req.params.id;
        const userId = req.user.userId;

        if (type && !['income', 'expense'].includes(type)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid transaction type' 
            });
        }

        const result = await pool.query(
            'UPDATE transactions SET amount = $1, description = $2, date = $3, type = $4, category = $5 WHERE id = $6 AND user_id = $7 RETURNING *',
            [amount, description, date, type, category, transactionId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Transaction not found' 
            });
        }

        res.json({ success: true, transaction: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *',
            [req.params.id, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Transaction not found' 
            });
        }

        res.json({ success: true, message: 'Transaction deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/categories', requireAuth, async (req, res) => {
    try {
        const categories = {
            income: ['Salary', 'Gift', 'Fund'],
            expense: ['Food', 'Apartment', 'Transportation']
        };
        
        res.json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;