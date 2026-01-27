const db = require('../utils/database');
const ProductService = require('./productService');

/**
 * Servicio de ventas
 */
const SaleService = {
    /**
     * Obtiene todas las ventas
     */
    getAll() {
        const data = db.readJSON('sales.json');
        if (!data) return [];
        return data.sales;
    },
    
    /**
     * Obtiene todas las ventas con información de cliente
     */
    getAllWithDetails() {
        const sales = this.getAll();
        const clientsData = db.readJSON('clients.json');
        const clients = clientsData ? clientsData.clients : [];
        
        return sales.map(sale => {
            const client = clients.find(c => c.id === sale.clientId);
            return {
                ...sale,
                clientName: client ? client.name : 'Cliente eliminado'
            };
        });
    },
    
    /**
     * Obtiene ventas filtradas
     */
    getFiltered(filters = {}) {
        let sales = this.getAllWithDetails();
        
        if (filters.startDate) {
            sales = sales.filter(s => s.date >= filters.startDate);
        }
        
        if (filters.endDate) {
            sales = sales.filter(s => s.date <= filters.endDate);
        }
        
        if (filters.clientId) {
            sales = sales.filter(s => s.clientId === parseInt(filters.clientId));
        }
        
        if (filters.productId) {
            sales = sales.filter(s => 
                s.items.some(item => item.productId === parseInt(filters.productId))
            );
        }
        
        return sales;
    },
    
    /**
     * Obtiene una venta por ID
     */
    getById(id) {
        const sales = this.getAll();
        return sales.find(s => s.id === id);
    },
    
    /**
     * Obtiene una venta con todos los detalles
     */
    getByIdWithDetails(id) {
        const sale = this.getById(id);
        if (!sale) return null;
        
        const clientsData = db.readJSON('clients.json');
        const clients = clientsData ? clientsData.clients : [];
        const productsData = db.readJSON('products.json');
        const products = productsData ? productsData.products : [];
        
        const client = clients.find(c => c.id === sale.clientId);
        
        const itemsWithDetails = sale.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return {
                ...item,
                productName: product ? product.name : 'Producto eliminado'
            };
        });
        
        return {
            ...sale,
            clientName: client ? client.name : 'Cliente eliminado',
            items: itemsWithDetails
        };
    },
    
    /**
     * Crea una nueva venta
     */
    create(saleData) {
        const data = db.readJSON('sales.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        // Validaciones
        if (!saleData.items || saleData.items.length === 0) {
            return { success: false, message: 'La venta debe tener al menos un producto' };
        }
        
        if (!saleData.clientId) {
            return { success: false, message: 'Debe seleccionar un cliente' };
        }
        
        // Verificar stock de todos los productos antes de proceder
        for (const item of saleData.items) {
            const stockCheck = ProductService.checkStock(item.productId, item.quantity);
            if (!stockCheck.available) {
                const product = ProductService.getById(item.productId);
                return { 
                    success: false, 
                    message: `Stock insuficiente para "${product ? product.name : 'producto'}". Disponible: ${stockCheck.currentStock}` 
                };
            }
        }
        
        // Calcular total
        let total = 0;
        const items = saleData.items.map(item => {
            const subtotal = item.quantity * item.unitPrice;
            total += subtotal;
            return {
                productId: parseInt(item.productId),
                quantity: parseInt(item.quantity),
                unitPrice: Math.round(parseFloat(item.unitPrice)),
                subtotal: Math.round(subtotal)
            };
        });
        
        // Generar referencia
        const reference = db.generateReference('V');
        
        const newSale = {
            id: reference,
            reference,
            clientId: parseInt(saleData.clientId),
            items,
            total: Math.round(total),
            received: Math.round(parseFloat(saleData.received || total)),
            change: Math.round(parseFloat(saleData.received || total) - total),
            note: saleData.note ? saleData.note.substring(0, 200) : '',
            date: saleData.date || db.getCurrentDate(),
            createdAt: db.getCurrentDateTime()
        };
        
        // Descontar stock
        for (const item of items) {
            const result = ProductService.updateStock(item.productId, -item.quantity);
            if (!result.success) {
                return { success: false, message: `Error al actualizar stock: ${result.message}` };
            }
        }
        
        data.sales.push(newSale);
        
        if (!db.writeJSON('sales.json', data)) {
            return { success: false, message: 'Error al guardar la venta' };
        }
        
        return { success: true, sale: newSale };
    },
    
    /**
     * Actualiza una venta (requiere contraseña global verificada previamente)
     */
    update(id, saleData) {
        const data = db.readJSON('sales.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.sales.findIndex(s => s.id === id);
        if (index === -1) {
            return { success: false, message: 'Venta no encontrada' };
        }
        
        const oldSale = data.sales[index];
        
        // Restaurar stock anterior
        for (const item of oldSale.items) {
            ProductService.updateStock(item.productId, item.quantity);
        }
        
        // Verificar nuevo stock
        if (saleData.items) {
            for (const item of saleData.items) {
                const stockCheck = ProductService.checkStock(item.productId, item.quantity);
                if (!stockCheck.available) {
                    // Revertir restauración de stock
                    for (const oldItem of oldSale.items) {
                        ProductService.updateStock(oldItem.productId, -oldItem.quantity);
                    }
                    return { 
                        success: false, 
                        message: `Stock insuficiente: ${stockCheck.message}` 
                    };
                }
            }
        }
        
        // Calcular nuevo total
        const items = saleData.items || oldSale.items;
        let total = 0;
        const processedItems = items.map(item => {
            const subtotal = item.quantity * item.unitPrice;
            total += subtotal;
            return {
                productId: parseInt(item.productId),
                quantity: parseInt(item.quantity),
                unitPrice: Math.round(parseFloat(item.unitPrice)),
                subtotal: Math.round(subtotal)
            };
        });
        
        // Descontar nuevo stock
        for (const item of processedItems) {
            ProductService.updateStock(item.productId, -item.quantity);
        }
        
        // Actualizar venta
        data.sales[index] = {
            ...oldSale,
            clientId: saleData.clientId ? parseInt(saleData.clientId) : oldSale.clientId,
            items: processedItems,
            total: Math.round(total),
            note: saleData.note !== undefined ? saleData.note.substring(0, 200) : oldSale.note,
            updatedAt: db.getCurrentDateTime()
        };
        
        if (!db.writeJSON('sales.json', data)) {
            return { success: false, message: 'Error al actualizar la venta' };
        }
        
        return { success: true, sale: data.sales[index] };
    },
    
    /**
     * Elimina una venta (requiere contraseña global verificada previamente)
     */
    delete(id) {
        const data = db.readJSON('sales.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.sales.findIndex(s => s.id === id);
        if (index === -1) {
            return { success: false, message: 'Venta no encontrada' };
        }
        
        // Restaurar stock
        const sale = data.sales[index];
        for (const item of sale.items) {
            ProductService.updateStock(item.productId, item.quantity);
        }
        
        data.sales.splice(index, 1);
        
        if (!db.writeJSON('sales.json', data)) {
            return { success: false, message: 'Error al eliminar la venta' };
        }
        
        return { success: true, message: 'Venta eliminada correctamente' };
    },
    
    /**
     * Obtiene estadísticas de ventas por rango de fechas
     */
    getStats(startDate, endDate) {
        const sales = this.getAll().filter(s => {
            return s.date >= startDate && s.date <= endDate;
        });
        
        const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
        const salesCount = sales.length;
        
        return {
            totalSales: Math.round(totalSales),
            salesCount,
            averageSale: salesCount > 0 ? Math.round(totalSales / salesCount) : 0
        };
    },
    
    /**
     * Obtiene ventas agrupadas por día
     */
    getByDay(startDate, endDate) {
        const sales = this.getAll().filter(s => {
            return s.date >= startDate && s.date <= endDate;
        });
        
        const byDay = {};
        sales.forEach(sale => {
            if (!byDay[sale.date]) {
                byDay[sale.date] = 0;
            }
            byDay[sale.date] += sale.total;
        });
        
        return byDay;
    }
};

module.exports = SaleService;
