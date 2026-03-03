const InventoryService = require('../services/inventoryService');

/**
 * Controlador de inventario
 */
const InventoryController = {
    /**
     * Obtiene los motivos de salida disponibles
     */
    getExitReasons(req, res) {
        const reasons = InventoryService.getExitReasons();
        return res.json({
            success: true,
            reasons
        });
    },
    
    /**
     * Obtiene todos los movimientos de inventario
     */
    getAll(req, res) {
        const { startDate, endDate, productId, type, reason, warehouseId } = req.query;
        
        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (productId) filters.productId = productId;
        if (type) filters.type = type;
        if (reason) filters.reason = reason;
        if (warehouseId) filters.warehouseId = warehouseId;
        
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

        // Enriquecer con nombres de producto/bodegas y motivo
        const [entryWithDetails] = InventoryService.getAllWithDetails().filter(e => e.id === entry.id);

        return res.json({
            success: true,
            entry: entryWithDetails || entry
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
     * Crea un traslado entre bodegas
     */
    createTransfer(req, res) {
        const result = InventoryService.createTransfer(req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.status(201).json(result);
    },

    /**
     * Crea un intercambio entre tipos de producto en una misma bodega
     */
    createExchange(req, res) {
        const result = InventoryService.createExchange(req.body);

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
