const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');

router.get('/periods', DashboardController.getAvailablePeriods);
router.get('/summary', DashboardController.getSummary);
router.get('/metrics', DashboardController.getMonthMetrics);
router.get('/charts', DashboardController.getChartData);

module.exports = router;
