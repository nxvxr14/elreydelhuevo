const ProductService = require('../services/productService');
const ClientService = require('../services/clientService');
const SaleService = require('../services/saleService');
const CashRegisterService = require('../services/cashRegisterService');

/**
 * Controlador del POS
 */
const POSController = {
    /**
     * Obtiene los datos necesarios para el POS
     */
    getData(req, res) {
        const products = ProductService.getAll();
        const clients = ClientService.getAll();
        const cashStatus = CashRegisterService.getStatus();
        
        // Solo productos con stock disponible
        const availableProducts = products.filter(p => p.stock > 0);
        
        return res.json({
            success: true,
            products: availableProducts,
            clients,
            cashStatus
        });
    },
    
    /**
     * Procesa una venta desde el POS
     */
    processSale(req, res) {
        // Verificar que la caja esté abierta
        const cashStatus = CashRegisterService.getStatus();
        
        if (!cashStatus.isOpen) {
            return res.status(400).json({
                success: false,
                message: 'La caja no está abierta. Debe abrir la caja antes de realizar ventas.'
            });
        }
        
        // Procesar la venta
        const result = SaleService.create(req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.status(201).json(result);
    },
    
    /**
     * Verifica el stock de un producto
     */
    checkStock(req, res) {
        const { productId, quantity } = req.query;
        
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'El ID del producto es requerido'
            });
        }
        
        const result = ProductService.checkStock(productId, parseInt(quantity) || 1);
        return res.json(result);
    },
    
    /**
     * Crea un cliente rápido desde el POS
     */
    createQuickClient(req, res) {
        const { name } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'El nombre del cliente es requerido'
            });
        }
        
        const result = ClientService.create({ name: name.trim() });
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.status(201).json(result);
    }
};

module.exports = POSController;
