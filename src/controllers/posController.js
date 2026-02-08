const ProductService = require('../services/productService');
const ClientService = require('../services/clientService');
const SaleService = require('../services/saleService');
const ExpenseService = require('../services/expenseService');
const CashRegisterService = require('../services/cashRegisterService');

/**
 * Controlador del POS
 * Las ventas de caja siempre retiran de la bodega por defecto (Bodega Punto de Venta).
 */
const POSController = {
    /**
     * Obtiene los datos necesarios para el POS.
     * Productos con stock = stock en bodega por defecto (solo se muestran/venden desde ahí).
     */
    getData(req, res) {
        const defaultWarehouse = ProductService.getDefaultWarehouse();
        const warehouseId = defaultWarehouse ? defaultWarehouse.id : null;
        
        const products = ProductService.getAll();
        const clients = ClientService.getAll();
        const cashStatus = CashRegisterService.getStatus();
        
        // Productos con stock en la bodega por defecto; stock mostrado = stock en esa bodega
        const availableProducts = products
            .map(p => {
                const stockInWarehouse = warehouseId && p.warehouseStock
                    ? (p.warehouseStock[warehouseId] || 0)
                    : (p.stock || 0);
                return { ...p, stock: stockInWarehouse };
            })
            .filter(p => p.stock > 0);
        
        return res.json({
            success: true,
            products: availableProducts,
            clients,
            cashStatus,
            defaultWarehouseId: warehouseId
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
        
        // Procesar la venta con source 'pos' (afecta la caja)
        const result = SaleService.create(req.body, 'pos');
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.status(201).json(result);
    },
    
    /**
     * Verifica el stock de un producto (POS usa bodega por defecto)
     */
    checkStock(req, res) {
        const { productId, quantity, warehouseId } = req.query;
        
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'El ID del producto es requerido'
            });
        }
        
        const defaultWarehouse = ProductService.getDefaultWarehouse();
        const whId = warehouseId ? parseInt(warehouseId) : (defaultWarehouse ? defaultWarehouse.id : null);
        const result = ProductService.checkStock(productId, parseInt(quantity) || 1, whId);
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
    },
    
    /**
     * Crea un gasto desde el POS (afecta la caja)
     */
    createExpense(req, res) {
        // Verificar que la caja esté abierta
        const cashStatus = CashRegisterService.getStatus();
        
        if (!cashStatus.isOpen) {
            return res.status(400).json({
                success: false,
                message: 'La caja no está abierta. Debe abrir la caja antes de registrar gastos.'
            });
        }
        
        // Crear gasto con source 'pos' (afecta la caja)
        const result = ExpenseService.create(req.body, 'pos');
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.status(201).json(result);
    }
};

module.exports = POSController;
