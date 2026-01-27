const express = require('express');
const router = express.Router();
const SeedController = require('../controllers/seedController');

// Estas rutas son públicas (accesibles desde login)

// POST /api/seed/load - Cargar datos de ejemplo
router.post('/load', SeedController.loadSampleData);

// POST /api/seed/clear - Eliminar todos los datos
router.post('/clear', SeedController.clearAllData);

// GET /api/seed/check - Verificar si hay datos
router.get('/check', SeedController.checkData);

module.exports = router;
