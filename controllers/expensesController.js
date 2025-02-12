const { pool } = require('../config/database');

const expensesController = {
    addExpense: async (req, res) => {
        const { amount, description, date } = req.body;
        const userId = req.session.userId;

        try {
            const result = await pool.query(
                'INSERT INTO expenses (user_id, amount, description, date) VALUES ($1, $2, $3, $4) RETURNING *',
                [userId, amount, description, date || new Date()]
            );

            res.status(201).json({
                success: true,
                expense: result.rows[0]
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ 
                success: false, 
                error: 'Error adding expense' 
            });
        }
    },

    getExpenses: async (req, res) => {
        const userId = req.session.userId;

        try {
            const result = await pool.query(
                'SELECT * FROM expenses WHERE user_id = $1 ORDER BY date DESC',
                [userId]
            );

            res.json({
                success: true,
                expenses: result.rows
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ 
                success: false, 
                error: 'Error fetching expenses' 
            });
        }
    },

    deleteExpense: async (req, res) => {
        const { id } = req.params;
        const userId = req.session.userId;

        try {
            const result = await pool.query(
                'DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING *',
                [id, userId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Expense not found' 
                });
            }

            res.json({
                success: true,
                message: 'Expense deleted successfully'
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ 
                success: false, 
                error: 'Error deleting expense' 
            });
        }
    },

    updateExpense: async (req, res) => {
        const { id } = req.params;
        const { amount, description, date } = req.body;
        const userId = req.session.userId;

        try {
            const result = await pool.query(
                'UPDATE expenses SET amount = $1, description = $2, date = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
                [amount, description, date || new Date(), id, userId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Expense not found' 
                });
            }

            res.json({
                success: true,
                expense: result.rows[0]
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ 
                success: false, 
                error: 'Error updating expense' 
            });
        }
    }
};

module.exports = expensesController;