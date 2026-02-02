const WarehouseService = require('../services/warehouseService');

/**
 * Controlador de bodegas
 */
const WarehouseController = {
    /**
     * Obtiene todas las bodegas
     */
    getAll(req, res) {
        try {
            const warehouses = WarehouseService.getAllWithStock();
            return res.json({ success: true, warehouses });
        } catch (error) {
            console.error('Error obteniendo bodegas:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener las bodegas' });
        }
    },
    
    /**
     * Obtiene una bodega por ID
     */
    getById(req, res) {
        try {
            const warehouse = WarehouseService.getById(req.params.id);
            if (!warehouse) {
                return res.status(404).json({ success: false, message: 'Bodega no encontrada' });
            }
            return res.json({ success: true, warehouse });
        } catch (error) {
            console.error('Error obteniendo bodega:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener la bodega' });
        }
    },
    
    /**
     * Obtiene los productos de una bodega
     */
    getProducts(req, res) {
        try {
            const warehouse = WarehouseService.getById(req.params.id);
            if (!warehouse) {
                return res.status(404).json({ success: false, message: 'Bodega no encontrada' });
            }
            
            const products = WarehouseService.getProducts(req.params.id);
            return res.json({ 
                success: true, 
                warehouse,
                products,
                totalStock: WarehouseService.getTotalStock(req.params.id)
            });
        } catch (error) {
            console.error('Error obteniendo productos de bodega:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener los productos' });
        }
    },
    
    /**
     * Crea una nueva bodega
     */
    create(req, res) {
        try {
            const result = WarehouseService.create(req.body);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(201).json(result);
        } catch (error) {
            console.error('Error creando bodega:', error);
            return res.status(500).json({ success: false, message: 'Error al crear la bodega' });
        }
    },
    
    /**
     * Actualiza una bodega
     */
    update(req, res) {
        try {
            const result = WarehouseService.update(req.params.id, req.body);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.json(result);
        } catch (error) {
            console.error('Error actualizando bodega:', error);
            return res.status(500).json({ success: false, message: 'Error al actualizar la bodega' });
        }
    },
    
    /**
     * Elimina una bodega
     */
    delete(req, res) {
        try {
            const result = WarehouseService.delete(req.params.id);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.json(result);
        } catch (error) {
            console.error('Error eliminando bodega:', error);
            return res.status(500).json({ success: false, message: 'Error al eliminar la bodega' });
        }
    }
};

module.exports = WarehouseController;
