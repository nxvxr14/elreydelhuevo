const InventoryService = require('../services/inventoryService');

/**
 * Controlador de inventario
 */
const InventoryController = {
    /**
     * Obtiene todas las entradas de inventario
     */
    getAll(req, res) {
        const { startDate, endDate, productId } = req.query;
        
        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (productId) filters.productId = productId;
        
        const entries = InventoryService.getFiltered(filters);
        
        return res.json({
            success: true,
            entries
        });
    },
    
    /**
     * Obtiene una entrada por ID
     */
    getById(req, res) {
        const { id } = req.params;
        const entry = InventoryService.getById(id);
        
        if (!entry) {
            return res.status(404).json({
                success: false,
                message: 'Entrada no encontrada'
            });
        }
        
        return res.json({
            success: true,
            entry
        });
    },
    
    /**
     * Crea una nueva entrada de inventario
     */
    create(req, res) {
        const result = InventoryService.create(req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.status(201).json(result);
    },
    
    /**
     * Elimina una entrada de inventario
     */
    delete(req, res) {
        const { id } = req.params;
        const result = InventoryService.delete(id);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.json(result);
    }
};

module.exports = InventoryController;
