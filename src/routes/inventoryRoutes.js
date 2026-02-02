const express = require('express');
const router = express.Router();
const InventoryController = require('../controllers/inventoryController');

router.get('/exit-reasons', InventoryController.getExitReasons);
router.get('/', InventoryController.getAll);
router.get('/:id', InventoryController.getById);
router.post('/', InventoryController.create);
router.post('/transfer', InventoryController.createTransfer);
router.delete('/:id', InventoryController.delete);

module.exports = router;
