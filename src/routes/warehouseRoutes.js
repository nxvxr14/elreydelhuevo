const express = require('express');
const router = express.Router();
const WarehouseController = require('../controllers/warehouseController');

// GET /api/warehouses - Obtener todas las bodegas
router.get('/', WarehouseController.getAll);

// GET /api/warehouses/:id - Obtener una bodega por ID
router.get('/:id', WarehouseController.getById);

// GET /api/warehouses/:id/products - Obtener productos de una bodega
router.get('/:id/products', WarehouseController.getProducts);

// POST /api/warehouses - Crear una nueva bodega
router.post('/', WarehouseController.create);

// PUT /api/warehouses/:id - Actualizar una bodega
router.put('/:id', WarehouseController.update);

// DELETE /api/warehouses/:id - Eliminar una bodega
router.delete('/:id', WarehouseController.delete);

module.exports = router;
