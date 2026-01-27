const express = require('express');
const router = express.Router();
const CashRegisterController = require('../controllers/cashRegisterController');

router.get('/status', CashRegisterController.getStatus);
router.get('/', CashRegisterController.getAll);
router.get('/:id', CashRegisterController.getById);
router.post('/open', CashRegisterController.open);
router.post('/close', CashRegisterController.close);

module.exports = router;
