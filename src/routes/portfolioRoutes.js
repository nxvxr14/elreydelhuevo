const express = require('express');
const router = express.Router();
const PortfolioController = require('../controllers/portfolioController');

// GET /api/portfolio - Obtener clientes con créditos pendientes
router.get('/', PortfolioController.getClientsWithCredits);

// GET /api/portfolio/summary - Obtener resumen de cartera
router.get('/summary', PortfolioController.getSummary);

// GET /api/portfolio/stats - Obtener estadísticas de abonos (para reportes)
router.get('/stats', PortfolioController.getPaymentStats);

// GET /api/portfolio/client/:clientId - Obtener detalle de cartera de un cliente
router.get('/client/:clientId', PortfolioController.getClientPortfolio);

// POST /api/portfolio/client/:clientId/payment - Registrar abono a un cliente
router.post('/client/:clientId/payment', PortfolioController.addPayment);

// DELETE /api/portfolio/payment/:paymentId - Eliminar un abono
router.delete('/payment/:paymentId', PortfolioController.deletePayment);

module.exports = router;
