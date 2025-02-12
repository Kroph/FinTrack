const express = require('express');
const router = express.Router();
const incomeController = require('../controllers/incomeController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, incomeController.addIncome);
router.get('/', requireAuth, incomeController.getIncome);
router.delete('/:id', requireAuth, incomeController.deleteIncome);
router.put('/:id', requireAuth, incomeController.updateIncome);

module.exports = router;