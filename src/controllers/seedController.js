const SeedService = require('../services/seedService');

/**
 * Controlador para datos de ejemplo
 */
const SeedController = {
    /**
     * Carga datos de ejemplo
     */
    loadSampleData(req, res) {
        try {
            const result = SeedService.loadSampleData();
            
            if (result.success) {
                res.json({
                    success: true,
                    message: result.message,
                    summary: result.summary
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('Error en loadSampleData:', error);
            res.status(500).json({
                success: false,
                message: 'Error al cargar datos de ejemplo'
            });
        }
    },
    
    /**
     * Elimina todos los datos
     */
    clearAllData(req, res) {
        try {
            const result = SeedService.clearAllData();
            
            if (result.success) {
                res.json({
                    success: true,
                    message: result.message
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('Error en clearAllData:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar datos'
            });
        }
    },
    
    /**
     * Verifica si hay datos cargados
     */
    checkData(req, res) {
        try {
            const hasData = SeedService.hasSampleData();
            res.json({
                success: true,
                hasData
            });
        } catch (error) {
            console.error('Error en checkData:', error);
            res.status(500).json({
                success: false,
                message: 'Error al verificar datos'
            });
        }
    }
};

module.exports = SeedController;
