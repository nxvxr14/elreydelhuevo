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
     * Ordenadas por fecha de venta (date) primero, luego por fecha de creación (createdAt)
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
        
        // Ordenar por fecha de venta (date) primero, luego por fecha de creación
        sales.sort((a, b) => {
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            // Si misma fecha, usar createdAt como desempate
            const createdA = new Date(a.createdAt || a.date);
            const createdB = new Date(b.createdAt || b.date);
            return createdA - createdB;
        });
        
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
     * @param {Object} saleData - Datos de la venta
     * @param {string} source - Origen de la venta: 'pos' o 'dashboard'
     */
    create(saleData, source = 'pos') {
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
        
        // Bodega: manual debe enviar warehouseId; POS siempre usa la por defecto
        const defaultWarehouse = ProductService.getDefaultWarehouse();
        let warehouseId = saleData.warehouseId ? parseInt(saleData.warehouseId) : null;
        if (!warehouseId) {
            warehouseId = defaultWarehouse ? defaultWarehouse.id : null;
        }
        if (source === 'dashboard' && !warehouseId) {
            return { success: false, message: 'Debe seleccionar la bodega de salida para la venta manual' };
        }
        
        // Verificar stock de todos los productos antes de proceder (en la bodega indicada)
        for (const item of saleData.items) {
            // Validar que la cantidad sea válida (entero o .5)
            if (!db.isValidQuantity(item.quantity)) {
                const product = ProductService.getById(item.productId);
                return { 
                    success: false, 
                    message: `Cantidad inválida para "${product ? product.name : 'producto'}". Solo se permite .5 como decimal.` 
                };
            }
            
            const stockCheck = ProductService.checkStock(item.productId, item.quantity, warehouseId);
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
                quantity: parseFloat(item.quantity),
                unitPrice: Math.round(parseFloat(item.unitPrice)),
                subtotal: Math.round(subtotal)
            };
        });
        
        // Generar referencia
        const reference = db.generateReference('V');
        
        // Payment method: 'cash', 'transfer', 'credit'
        const paymentMethod = saleData.paymentMethod || 'cash';
        
        // Transfer type: 'nequi', 'bancolombia', 'davivienda' (only if paymentMethod is 'transfer')
        const transferType = paymentMethod === 'transfer' ? (saleData.transferType || 'nequi') : null;
        
        // For credit sales, calculate paid and pending amounts
        let paidAmount = Math.round(total);
        let pendingAmount = 0;
        let status = 'paid';
        let payments = [];
        
        if (paymentMethod === 'credit') {
            // Initial payment for credit (can be 0)
            const initialPayment = Math.round(parseFloat(saleData.initialPayment || 0));
            const initialPaymentMethod = saleData.initialPaymentMethod || 'cash';
            const initialTransferType = initialPaymentMethod === 'transfer' ? (saleData.initialTransferType || 'nequi') : null;
            
            paidAmount = initialPayment;
            pendingAmount = Math.round(total) - paidAmount;
            status = pendingAmount > 0 ? 'pending' : 'paid';
            
            if (initialPayment > 0) {
                payments.push({
                    date: saleData.date || db.getCurrentDate(),
                    amount: initialPayment,
                    paymentMethod: initialPaymentMethod,
                    transferType: initialTransferType,
                    note: 'Abono inicial'
                });
            }
        }
        
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
            source: source, // 'pos' o 'dashboard'
            paymentMethod: paymentMethod, // 'cash', 'transfer', 'credit'
            transferType: transferType, // 'nequi', 'bancolombia', 'davivienda' or null
            paidAmount: paidAmount,
            pendingAmount: pendingAmount,
            status: status, // 'paid' o 'pending'
            payments: payments,
            warehouseId: warehouseId || null, // bodega de la que se descontó
            createdAt: db.getCurrentDateTime()
        };
        
        // Descontar stock en la bodega indicada
        for (const item of items) {
            const result = ProductService.updateStock(item.productId, -item.quantity, warehouseId);
            if (!result.success) {
                return { success: false, message: `Error al actualizar stock: ${result.message}` };
            }
        }
        
        data.sales.push(newSale);
        
        if (!db.writeJSON('sales.json', data)) {
            return { success: false, message: 'Error al guardar la venta' };
        }
        
        // Si es venta a crédito con abono inicial, registrar también en payments.json
        if (paymentMethod === 'credit' && payments.length > 0) {
            const initialPaymentData = payments[0];
            let paymentsData = db.readJSON('payments.json');
            if (!paymentsData) {
                paymentsData = { payments: [] };
            }
            
            const paymentId = db.generateReference('P');
            const newPaymentRecord = {
                id: paymentId,
                reference: paymentId,
                clientId: parseInt(saleData.clientId),
                amount: initialPaymentData.amount,
                paymentMethod: initialPaymentData.paymentMethod,
                transferType: initialPaymentData.transferType,
                note: 'Abono inicial',
                date: initialPaymentData.date,
                appliedToSales: [{
                    saleId: newSale.id,
                    saleReference: newSale.reference,
                    amountApplied: initialPaymentData.amount,
                    newStatus: newSale.status
                }],
                createdAt: db.getCurrentDateTime(),
                isInitialPayment: true
            };
            
            paymentsData.payments.push(newPaymentRecord);
            db.writeJSON('payments.json', paymentsData);
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
        const defaultWarehouse = ProductService.getDefaultWarehouse();
        const warehouseId = oldSale.warehouseId || (defaultWarehouse ? defaultWarehouse.id : null);
        
        // Restaurar stock anterior en la misma bodega
        for (const item of oldSale.items) {
            ProductService.updateStock(item.productId, item.quantity, warehouseId);
        }
        
        // Verificar nuevo stock en la misma bodega
        if (saleData.items) {
            for (const item of saleData.items) {
                // Validar que la cantidad sea válida (entero o .5)
                if (!db.isValidQuantity(item.quantity)) {
                    // Revertir restauración de stock
                    for (const oldItem of oldSale.items) {
                        ProductService.updateStock(oldItem.productId, -oldItem.quantity, warehouseId);
                    }
                    return { 
                        success: false, 
                        message: `Cantidad inválida. Solo se permite .5 como decimal.` 
                    };
                }
                
                const stockCheck = ProductService.checkStock(item.productId, item.quantity, warehouseId);
                if (!stockCheck.available) {
                    // Revertir restauración de stock
                    for (const oldItem of oldSale.items) {
                        ProductService.updateStock(oldItem.productId, -oldItem.quantity, warehouseId);
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
                quantity: parseFloat(item.quantity),
                unitPrice: Math.round(parseFloat(item.unitPrice)),
                subtotal: Math.round(subtotal)
            };
        });
        
        // Descontar nuevo stock en la misma bodega
        for (const item of processedItems) {
            ProductService.updateStock(item.productId, -item.quantity, warehouseId);
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
        
        // Restaurar stock en la bodega de la venta
        const sale = data.sales[index];
        const defaultWarehouse = ProductService.getDefaultWarehouse();
        const warehouseId = sale.warehouseId || (defaultWarehouse ? defaultWarehouse.id : null);
        for (const item of sale.items) {
            ProductService.updateStock(item.productId, item.quantity, warehouseId);
        }
        
        data.sales.splice(index, 1);
        
        if (!db.writeJSON('sales.json', data)) {
            return { success: false, message: 'Error al eliminar la venta' };
        }
        
        return { success: true, message: 'Venta eliminada correctamente' };
    },
    
    /**
     * Agrega un abono a una venta a crédito
     * @param {string} saleId - ID de la venta
     * @param {number} amount - Monto del abono
     * @param {string} note - Nota del abono
     * @param {string} paymentMethod - Método de pago del abono: 'cash' o 'transfer'
     * @param {string} transferType - Tipo de transferencia: 'nequi', 'bancolombia', 'davivienda'
     */
    addPayment(saleId, amount, note = '', paymentMethod = 'cash', transferType = null) {
        const data = db.readJSON('sales.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.sales.findIndex(s => s.id === saleId);
        if (index === -1) {
            return { success: false, message: 'Venta no encontrada' };
        }
        
        const sale = data.sales[index];
        
        // Verify it's a credit sale
        if (sale.paymentMethod !== 'credit') {
            return { success: false, message: 'Solo se pueden abonar ventas a crédito' };
        }
        
        // Verify sale is not fully paid
        if (sale.status === 'paid') {
            return { success: false, message: 'Esta venta ya está completamente pagada' };
        }
        
        const paymentAmount = Math.round(parseFloat(amount));
        
        if (paymentAmount <= 0) {
            return { success: false, message: 'El monto del abono debe ser mayor a 0' };
        }
        
        if (paymentAmount > sale.pendingAmount) {
            return { success: false, message: `El abono excede el saldo pendiente (${sale.pendingAmount})` };
        }
        
        // Validate payment method
        const validMethods = ['cash', 'transfer'];
        const method = validMethods.includes(paymentMethod) ? paymentMethod : 'cash';
        
        // Validate transfer type
        const validTransferTypes = ['nequi', 'bancolombia', 'davivienda'];
        const tType = method === 'transfer' && validTransferTypes.includes(transferType) ? transferType : null;
        
        // Add payment
        const payment = {
            date: db.getCurrentDate(),
            amount: paymentAmount,
            paymentMethod: method,
            transferType: tType,
            note: note ? note.substring(0, 200) : ''
        };
        
        // Initialize payments array if not exists (for backward compatibility)
        if (!sale.payments) {
            sale.payments = [];
        }
        
        sale.payments.push(payment);
        sale.paidAmount = (sale.paidAmount || 0) + paymentAmount;
        sale.pendingAmount = sale.total - sale.paidAmount;
        
        // Update status
        if (sale.pendingAmount <= 0) {
            sale.status = 'paid';
            sale.pendingAmount = 0;
        }
        
        sale.updatedAt = db.getCurrentDateTime();
        
        data.sales[index] = sale;
        
        if (!db.writeJSON('sales.json', data)) {
            return { success: false, message: 'Error al guardar el abono' };
        }
        
        return { success: true, sale: sale, payment: payment };
    },
    
    /**
     * Obtiene ventas a crédito pendientes
     */
    getCreditSales() {
        const sales = this.getAllWithDetails();
        return sales.filter(s => s.paymentMethod === 'credit' && s.status === 'pending');
    },
    
    /**
     * Obtiene resumen de créditos pendientes con alertas
     * @returns {Object} Resumen de créditos con alertas
     */
    getCreditsSummary() {
        const creditSales = this.getCreditSales();
        const today = db.getCurrentDate();
        
        // Calculate days since sale for each credit
        const creditsWithAge = creditSales.map(sale => {
            const saleDate = new Date(sale.date + 'T00:00:00');
            const todayDate = new Date(today + 'T00:00:00');
            const daysSinceSale = Math.floor((todayDate - saleDate) / (1000 * 60 * 60 * 24));
            
            // Determine urgency level
            let urgency = 'normal'; // green
            if (daysSinceSale >= 30) {
                urgency = 'critical'; // red - more than 30 days
            } else if (daysSinceSale >= 15) {
                urgency = 'warning'; // yellow - 15-29 days
            } else if (daysSinceSale >= 7) {
                urgency = 'attention'; // orange - 7-14 days
            }
            
            return {
                ...sale,
                daysSinceSale,
                urgency
            };
        });
        
        // Sort by days since sale (oldest first)
        creditsWithAge.sort((a, b) => b.daysSinceSale - a.daysSinceSale);
        
        // Calculate totals
        const totalPending = creditsWithAge.reduce((sum, s) => sum + (s.pendingAmount || 0), 0);
        const totalCreditsValue = creditsWithAge.reduce((sum, s) => sum + s.total, 0);
        const totalPaid = creditsWithAge.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
        
        // Count by urgency
        const criticalCount = creditsWithAge.filter(s => s.urgency === 'critical').length;
        const warningCount = creditsWithAge.filter(s => s.urgency === 'warning').length;
        const attentionCount = creditsWithAge.filter(s => s.urgency === 'attention').length;
        const normalCount = creditsWithAge.filter(s => s.urgency === 'normal').length;
        
        return {
            credits: creditsWithAge,
            totalCount: creditsWithAge.length,
            totalPending: Math.round(totalPending),
            totalCreditsValue: Math.round(totalCreditsValue),
            totalPaid: Math.round(totalPaid),
            urgencyCounts: {
                critical: criticalCount,  // > 30 days
                warning: warningCount,    // 15-29 days
                attention: attentionCount, // 7-14 days
                normal: normalCount       // < 7 days
            },
            hasAlerts: criticalCount > 0 || warningCount > 0
        };
    },
    
    /**
     * Obtiene estadísticas de ventas por rango de fechas
     * Calcula ingresos correctamente: para crédito solo suma los abonos
     * @param {string} startDate 
     * @param {string} endDate 
     * @param {string|null} source - Filtrar por origen: 'pos', 'dashboard' o null para todos
     */
    getStats(startDate, endDate, source = null) {
        let sales = this.getAll().filter(s => {
            return s.date >= startDate && s.date <= endDate;
        });
        
        // Filtrar por origen si se especifica
        if (source) {
            sales = sales.filter(s => s.source === source);
        }
        
        // Calculate total income correctly:
        // - Cash/Transfer: full amount on sale date
        // - Credit: only paid amounts (from payments array) that fall within date range
        let totalIncome = 0;
        let cashTotal = 0;
        let transferTotal = 0;
        let creditPaidTotal = 0;
        
        sales.forEach(sale => {
            const method = sale.paymentMethod || 'cash';
            
            if (method === 'cash') {
                totalIncome += sale.total;
                cashTotal += sale.total;
            } else if (method === 'transfer') {
                totalIncome += sale.total;
                transferTotal += sale.total;
            } else if (method === 'credit') {
                // For credit sales, sum payments made within the date range
                const payments = sale.payments || [];
                payments.forEach(payment => {
                    if (payment.date >= startDate && payment.date <= endDate) {
                        totalIncome += payment.amount;
                        creditPaidTotal += payment.amount;
                    }
                });
            }
        });
        
        // Also check for payments on credit sales from OUTSIDE the date range
        // that have payments WITHIN the date range
        const allSales = this.getAll();
        allSales.forEach(sale => {
            // Skip sales already processed (within date range)
            if (sale.date >= startDate && sale.date <= endDate) return;
            
            // Only check credit sales outside the range
            if (sale.paymentMethod === 'credit' && sale.payments) {
                sale.payments.forEach(payment => {
                    if (payment.date >= startDate && payment.date <= endDate) {
                        totalIncome += payment.amount;
                        creditPaidTotal += payment.amount;
                    }
                });
            }
        });
        
        const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
        const salesCount = sales.length;
        
        return {
            totalSales: Math.round(totalSales),
            totalIncome: Math.round(totalIncome),
            cashTotal: Math.round(cashTotal),
            transferTotal: Math.round(transferTotal),
            creditPaidTotal: Math.round(creditPaidTotal),
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
