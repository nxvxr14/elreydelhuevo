const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');

router.get('/sales', ReportController.getSalesReport);
router.get('/expenses', ReportController.getExpensesReport);
router.get('/inventory', ReportController.getInventoryReport);
router.get('/cash', ReportController.getCashReport);
router.get('/daily', ReportController.getDailyReport);

module.exports = router;
