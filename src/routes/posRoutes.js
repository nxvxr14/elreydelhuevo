const express = require('express');
const router = express.Router();
const POSController = require('../controllers/posController');

router.get('/data', POSController.getData);
router.post('/sale', POSController.processSale);
router.get('/check-stock', POSController.checkStock);
router.post('/quick-client', POSController.createQuickClient);

module.exports = router;
