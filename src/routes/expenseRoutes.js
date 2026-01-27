const express = require('express');
const router = express.Router();
const ExpenseController = require('../controllers/expenseController');

router.get('/', ExpenseController.getAll);
router.get('/stats', ExpenseController.getStats);
router.get('/:id', ExpenseController.getById);
router.post('/', ExpenseController.create);
router.put('/:id', ExpenseController.update);
router.delete('/:id', ExpenseController.delete);

module.exports = router;
