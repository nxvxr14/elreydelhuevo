const SaleService = require('../services/saleService');

/**
 * Controlador de ventas
 */
const SaleController = {
    /**
     * Obtiene todas las ventas con detalles
     */
    getAll(req, res) {
        const { startDate, endDate, clientId, productId } = req.query;
        
        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (clientId) filters.clientId = clientId;
        if (productId) filters.productId = productId;
        
        const sales = SaleService.getFiltered(filters);
        
        return res.json({
            success: true,
            sales
        });
    },
    
    /**
     * Obtiene una venta por ID con todos los detalles
     */
    getById(req, res) {
        const { id } = req.params;
        const sale = SaleService.getByIdWithDetails(id);
        
        if (!sale) {
            return res.status(404).json({
                success: false,
                message: 'Venta no encontrada'
            });
        }
        
        return res.json({
            success: true,
            sale
        });
    },
    
    /**
     * Crea una nueva venta
     */
    create(req, res) {
        const result = SaleService.create(req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.status(201).json(result);
    },
    
    /**
     * Crea una venta manual (fuera del POS) - NO afecta la caja
     */
    createManual(req, res) {
        // La venta manual usa source 'dashboard' - NO afecta la caja física
        const result = SaleService.create(req.body, 'dashboard');
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.status(201).json(result);
    },
    
    /**
     * Actualiza una venta
     */
    update(req, res) {
        const { id } = req.params;
        const result = SaleService.update(id, req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.json(result);
    },
    
    /**
     * Elimina una venta
     */
    delete(req, res) {
        const { id } = req.params;
        const result = SaleService.delete(id);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.json(result);
    },
    
    /**
     * Obtiene estadísticas de ventas
     */
    getStats(req, res) {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Las fechas de inicio y fin son requeridas'
            });
        }
        
        const stats = SaleService.getStats(startDate, endDate);
        
        return res.json({
            success: true,
            stats
        });
    },
    
    /**
     * Obtiene ventas a crédito pendientes
     */
    getCreditSales(req, res) {
        const sales = SaleService.getCreditSales();
        
        return res.json({
            success: true,
            sales
        });
    },
    
    /**
     * Agrega un abono a una venta a crédito
     */
    addPayment(req, res) {
        const { id } = req.params;
        const { amount, note, paymentMethod, transferType } = req.body;
        
        if (!amount) {
            return res.status(400).json({
                success: false,
                message: 'El monto del abono es requerido'
            });
        }
        
        const result = SaleService.addPayment(id, amount, note, paymentMethod, transferType);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.json(result);
    }
};

module.exports = SaleController;
