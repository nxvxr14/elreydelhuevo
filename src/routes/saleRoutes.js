const express = require('express');
const router = express.Router();
const SaleController = require('../controllers/saleController');

router.get('/', SaleController.getAll);
router.get('/stats', SaleController.getStats);
router.get('/credits', SaleController.getCreditSales);
router.get('/:id', SaleController.getById);
router.post('/', SaleController.create);
router.post('/manual', SaleController.createManual);
router.post('/:id/payment', SaleController.addPayment);
router.put('/:id', SaleController.update);
router.delete('/:id', SaleController.delete);

module.exports = router;
