const express = require('express');
const router = express.Router();
const expensesController = require('../controllers/expensesController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, expensesController.addExpense);
router.get('/', requireAuth, expensesController.getExpenses);
router.delete('/:id', requireAuth, expensesController.deleteExpense);
router.put('/:id', requireAuth, expensesController.updateExpense);

module.exports = router;