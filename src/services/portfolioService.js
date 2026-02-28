const db = require('../utils/database');

/**
 * Servicio de Cartera - Gestión de créditos y abonos por cliente
 * Los abonos se aplican automáticamente a las facturas más antiguas (FIFO)
 */
function buildPortfolioPaymentIndex() {
    const salesData = db.readJSON('sales.json');
    const sales = salesData ? salesData.sales : [];
    const index = {};

    sales.forEach(sale => {
        if (!sale.payments || sale.payments.length === 0) return;
        sale.payments.forEach(payment => {
            if (!payment || payment.fromPortfolio !== true) return;
            if (!index[sale.id]) index[sale.id] = [];
            index[sale.id].push({
                amount: Math.round(parseFloat(payment.amount) || 0),
                date: payment.date || sale.date
            });
        });
    });

    return index;
}

function isPortfolioPayment(payment, portfolioIndex) {
    if (!payment) return false;
    if (payment.isInitialPayment === true) return false;
    if (payment.fromPortfolio === true) return true;
    if (!payment.appliedToSales || payment.appliedToSales.length === 0) return false;

    return payment.appliedToSales.every(applied => {
        const salePayments = portfolioIndex[applied.saleId];
        if (!salePayments || salePayments.length === 0) return false;
        const amountApplied = Math.round(parseFloat(applied.amountApplied) || 0);
        return salePayments.some(p => p.amount === amountApplied && (!payment.date || p.date === payment.date));
    });
}

const PortfolioService = {
    /**
     * Obtiene todas las ventas a crédito
     */
    getAllCreditSales() {
        const salesData = db.readJSON('sales.json');
        if (!salesData) return [];
        return salesData.sales.filter(s => s.paymentMethod === 'credit');
    },
    
    /**
     * Obtiene las ventas a crédito de un cliente específico ordenadas por fecha de venta (antiguas primero)
     * IMPORTANTE: Usa sale.date (fecha de la factura) NO createdAt para el orden FIFO
     */
    getClientCreditSales(clientId) {
        const creditSales = this.getAllCreditSales();
        return creditSales
            .filter(s => s.clientId === parseInt(clientId))
            .sort((a, b) => {
                // Ordenar por fecha de la venta (más antigua primero) - FIFO correcto
                // Si las fechas son iguales, usar createdAt como desempate
                if (a.date === b.date) {
                    const createdA = new Date(a.createdAt || a.date);
                    const createdB = new Date(b.createdAt || b.date);
                    return createdA - createdB;
                }
                return a.date.localeCompare(b.date);
            });
    },
    
    /**
     * Obtiene resumen de cartera por cliente
     * @param {number} clientId - ID del cliente
     * @param {object} options - Opciones de filtrado
     * @param {string} options.startDate - Fecha inicio (YYYY-MM-DD) para filtrar créditos
     * @param {string} options.endDate - Fecha fin (YYYY-MM-DD) para filtrar créditos
     */
    getClientPortfolio(clientId, options = {}) {
        const clientsData = db.readJSON('clients.json');
        const client = clientsData?.clients?.find(c => c.id === parseInt(clientId));
        
        if (!client) {
            return null;
        }
        
        let creditSales = this.getClientCreditSales(clientId);
        
        // Filtrar por rango de fechas si se proporcionan
        if (options.startDate && options.endDate) {
            creditSales = creditSales.filter(s => s.date >= options.startDate && s.date <= options.endDate);
        }
        
        const productsData = db.readJSON('products.json');
        const products = productsData ? productsData.products : [];
        
        let totalCredit = 0;
        let totalPaid = 0;
        let totalPending = 0;
        let totalBaskets = 0; // Canastas en crédito
        
        const salesWithDetails = creditSales.map(sale => {
            totalCredit += sale.total;
            totalPaid += sale.paidAmount || 0;
            totalPending += sale.pendingAmount || 0;
            
            // Calcular canastas pendientes (solo si la venta no está pagada)
            if (sale.status === 'pending') {
                sale.items.forEach(item => {
                    totalBaskets += item.quantity;
                });
            }
            
            // Agregar nombre de productos
            const itemsWithNames = sale.items.map(item => {
                const product = products.find(p => p.id === item.productId);
                return {
                    ...item,
                    productName: product ? product.name : 'Producto eliminado'
                };
            });
            
            return {
                ...sale,
                items: itemsWithNames
            };
        });
        
        return {
            client,
            totalCredit: Math.round(totalCredit),
            totalPaid: Math.round(totalPaid),
            totalPending: Math.round(totalPending),
            totalBaskets,
            salesCount: creditSales.length,
            pendingSalesCount: creditSales.filter(s => s.status === 'pending').length,
            sales: salesWithDetails
        };
    },
    
    /**
     * Obtiene lista de clientes con créditos
     * @param {object} options - Opciones de filtrado
     * @param {string} options.startDate - Fecha inicio (YYYY-MM-DD) para filtrar por fecha de venta
     * @param {string} options.endDate - Fecha fin (YYYY-MM-DD) para filtrar por fecha de venta
     */
    getClientsWithCredits(options = {}) {
        const clientsData = db.readJSON('clients.json');
        const clients = clientsData ? clientsData.clients : [];
        let creditSales = this.getAllCreditSales();
        
        // Filtrar por rango de fechas de la venta si se proporcionan
        if (options.startDate && options.endDate) {
            creditSales = creditSales.filter(s => s.date >= options.startDate && s.date <= options.endDate);
        }
        
        // Agrupar por cliente
        const clientCredits = {};
        
        creditSales.forEach(sale => {
            const clientId = sale.clientId;
            if (!clientCredits[clientId]) {
                clientCredits[clientId] = {
                    totalCredit: 0,
                    totalPaid: 0,
                    totalPending: 0,
                    totalBaskets: 0,
                    salesCount: 0,
                    pendingSalesCount: 0,
                    oldestPendingDate: null
                };
            }
            
            clientCredits[clientId].totalCredit += sale.total;
            clientCredits[clientId].totalPaid += sale.paidAmount || 0;
            clientCredits[clientId].totalPending += sale.pendingAmount || 0;
            clientCredits[clientId].salesCount++;
            
            if (sale.status === 'pending') {
                clientCredits[clientId].pendingSalesCount++;
                
                // Calcular canastas pendientes
                sale.items.forEach(item => {
                    clientCredits[clientId].totalBaskets += item.quantity;
                });
                
                // Guardar la fecha más antigua pendiente
                const saleDate = sale.date;
                if (!clientCredits[clientId].oldestPendingDate || saleDate < clientCredits[clientId].oldestPendingDate) {
                    clientCredits[clientId].oldestPendingDate = saleDate;
                }
            }
        });
        
        // Convertir a array con información del cliente
        // IMPORTANTE: Incluir TODOS los clientes con créditos, incluso los pagados completamente
        const result = [];
        
        for (const clientId in clientCredits) {
            const client = clients.find(c => c.id === parseInt(clientId));
            const credits = clientCredits[clientId];
            
            // Calcular días de mora (solo si hay pendiente)
            let daysPastDue = 0;
            if (credits.oldestPendingDate) {
                const today = new Date(db.getCurrentDate() + 'T00:00:00');
                const oldestDate = new Date(credits.oldestPendingDate + 'T00:00:00');
                daysPastDue = Math.floor((today - oldestDate) / (1000 * 60 * 60 * 24));
            }
            
            // Determinar nivel de urgencia
            let urgency = 'normal'; // verde
            if (credits.totalPending > 0) {
                // Solo calcular urgencia si hay saldo pendiente
                if (daysPastDue >= 30) {
                    urgency = 'critical'; // rojo - más de 30 días
                } else if (daysPastDue >= 15) {
                    urgency = 'warning'; // amarillo - 15-29 días
                } else if (daysPastDue >= 7) {
                    urgency = 'attention'; // naranja - 7-14 días
                }
            } else {
                // Cliente completamente pagado
                urgency = 'paid'; // Estado especial para pagados
            }
            
            result.push({
                clientId: parseInt(clientId),
                clientName: client ? client.name : 'Cliente eliminado',
                clientPhone: client ? client.phone : '',
                ...credits,
                daysPastDue,
                urgency
            });
        }
        
        // Ordenar: primero pendientes (por días de mora), luego pagados
        result.sort((a, b) => {
            // Si uno tiene pendiente y otro no, el pendiente va primero
            if (a.totalPending > 0 && b.totalPending === 0) return -1;
            if (a.totalPending === 0 && b.totalPending > 0) return 1;
            // Si ambos tienen pendiente o ambos están pagados, ordenar por días de mora
            return b.daysPastDue - a.daysPastDue;
        });
        
        return result;
    },
    
    /**
     * Obtiene el historial de abonos de un cliente
     * Ordenados por fecha del pago (date) primero (más nuevos primero), luego por fecha de creación (createdAt)
     * @param {number} clientId - ID del cliente
     * @param {object} options - Opciones de filtrado
     * @param {string} options.startDate - Fecha inicio (YYYY-MM-DD)
     * @param {string} options.endDate - Fecha fin (YYYY-MM-DD)
     */
    getClientPaymentHistory(clientId, options = {}) {
        const paymentsData = db.readJSON('payments.json');
        if (!paymentsData || !paymentsData.payments) return [];
        const portfolioIndex = buildPortfolioPaymentIndex();
        
        let payments = paymentsData.payments
            .filter(p => p.clientId === parseInt(clientId))
            .filter(p => isPortfolioPayment(p, portfolioIndex));
        
        // Filtrar por rango de fechas si se proporcionan
        if (options.startDate && options.endDate) {
            payments = payments.filter(p => p.date >= options.startDate && p.date <= options.endDate);
        }
        
        return payments.sort((a, b) => {
                // Ordenar por fecha del pago primero (más nuevos primero)
                if (a.date !== b.date) {
                    return b.date.localeCompare(a.date);
                }
                // Si misma fecha, usar createdAt como desempate (más nuevos primero)
                const createdA = new Date(a.createdAt || a.date);
                const createdB = new Date(b.createdAt || b.date);
                return createdB - createdA;
            });
    },
    
    /**
     * Registra un abono para un cliente
     * El abono se aplica automáticamente a las facturas más antiguas (FIFO)
     * @param {number} clientId - ID del cliente
     * @param {number} amount - Monto del abono
     * @param {string} paymentMethod - 'cash' o 'transfer'
     * @param {string} transferType - 'nequi', 'bancolombia', 'davivienda' (si es transfer)
     * @param {string} note - Nota opcional
     */
    addPayment(clientId, amount, paymentMethod = 'cash', transferType = null, note = '') {
        // Validaciones básicas
        const paymentAmount = Math.round(parseFloat(amount));
        
        if (paymentAmount <= 0) {
            return { success: false, message: 'El monto del abono debe ser mayor a 0' };
        }
        
        // Obtener ventas pendientes del cliente ordenadas por fecha (FIFO)
        const creditSales = this.getClientCreditSales(clientId)
            .filter(s => s.status === 'pending' && s.pendingAmount > 0);
        
        if (creditSales.length === 0) {
            return { success: false, message: 'El cliente no tiene créditos pendientes' };
        }
        
        // Calcular total pendiente
        const totalPending = creditSales.reduce((sum, s) => sum + (s.pendingAmount || 0), 0);
        
        if (paymentAmount > totalPending) {
            return { success: false, message: `El abono excede el saldo pendiente (${totalPending})` };
        }
        
        // Aplicar abono a las facturas más antiguas (FIFO)
        const salesData = db.readJSON('sales.json');
        if (!salesData) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        let remainingAmount = paymentAmount;
        const appliedToSales = [];
        
        for (const sale of creditSales) {
            if (remainingAmount <= 0) break;
            
            const saleIndex = salesData.sales.findIndex(s => s.id === sale.id);
            if (saleIndex === -1) continue;
            
            const currentSale = salesData.sales[saleIndex];
            const pendingOnSale = currentSale.pendingAmount || 0;
            
            // Calcular cuánto aplicar a esta venta
            const amountToApply = Math.min(remainingAmount, pendingOnSale);
            
            // Actualizar la venta
            currentSale.paidAmount = (currentSale.paidAmount || 0) + amountToApply;
            currentSale.pendingAmount = currentSale.total - currentSale.paidAmount;
            
            // Si la venta está completamente pagada
            if (currentSale.pendingAmount <= 0) {
                currentSale.status = 'paid';
                currentSale.pendingAmount = 0;
            }
            
            // Registrar el abono en los payments de la venta
            if (!currentSale.payments) {
                currentSale.payments = [];
            }
            
            currentSale.payments.push({
                date: db.getCurrentDate(),
                amount: amountToApply,
                paymentMethod: paymentMethod,
                transferType: paymentMethod === 'transfer' ? transferType : null,
                note: note || 'Abono desde cartera',
                fromPortfolio: true
            });
            
            currentSale.updatedAt = db.getCurrentDateTime();
            salesData.sales[saleIndex] = currentSale;
            
            appliedToSales.push({
                saleId: sale.id,
                saleReference: sale.reference,
                amountApplied: amountToApply,
                newStatus: currentSale.status
            });
            
            remainingAmount -= amountToApply;
        }
        
        // Guardar cambios en ventas
        if (!db.writeJSON('sales.json', salesData)) {
            return { success: false, message: 'Error al guardar los cambios en ventas' };
        }
        
        // Registrar el abono en el archivo de pagos
        let paymentsData = db.readJSON('payments.json');
        if (!paymentsData) {
            paymentsData = { payments: [] };
        }
        
        const paymentId = db.generateReference('P');
        const newPayment = {
            id: paymentId,
            reference: paymentId,
            clientId: parseInt(clientId),
            amount: paymentAmount,
            paymentMethod: paymentMethod,
            transferType: paymentMethod === 'transfer' ? transferType : null,
            note: note || '',
            date: db.getCurrentDate(),
            appliedToSales: appliedToSales,
            fromPortfolio: true,
            createdAt: db.getCurrentDateTime()
        };
        
        paymentsData.payments.push(newPayment);
        
        if (!db.writeJSON('payments.json', paymentsData)) {
            return { success: false, message: 'Error al guardar el registro de abono' };
        }
        
        return {
            success: true,
            payment: newPayment,
            appliedToSales: appliedToSales,
            message: `Abono de ${paymentAmount} aplicado correctamente`
        };
    },
    
    /**
     * Elimina un abono y revierte su efecto en las ventas
     * @param {string} paymentId - ID del abono a eliminar
     */
    deletePayment(paymentId) {
        // Obtener el abono
        const paymentsData = db.readJSON('payments.json');
        if (!paymentsData || !paymentsData.payments) {
            return { success: false, message: 'Error al acceder a la base de datos de pagos' };
        }
        
        const paymentIndex = paymentsData.payments.findIndex(p => p.id === paymentId);
        if (paymentIndex === -1) {
            return { success: false, message: 'Abono no encontrado' };
        }
        
        const payment = paymentsData.payments[paymentIndex];
        
        // IMPORTANTE: No se pueden eliminar abonos iniciales, solo borrando la venta
        if (payment.isInitialPayment === true) {
            return { success: false, message: 'No se pueden eliminar abonos iniciales. Debe eliminar la venta completa si desea revertir el abono inicial.' };
        }
        
        // Revertir el efecto en las ventas
        const salesData = db.readJSON('sales.json');
        if (!salesData) {
            return { success: false, message: 'Error al acceder a la base de datos de ventas' };
        }
        
        // Para cada venta afectada, revertir el abono
        if (payment.appliedToSales && payment.appliedToSales.length > 0) {
            for (const appliedSale of payment.appliedToSales) {
                const saleIndex = salesData.sales.findIndex(s => s.id === appliedSale.saleId);
                if (saleIndex === -1) continue;
                
                const sale = salesData.sales[saleIndex];
                
                // Restar el monto abonado
                sale.paidAmount = Math.max(0, (sale.paidAmount || 0) - appliedSale.amountApplied);
                sale.pendingAmount = sale.total - sale.paidAmount;
                
                // Si ahora tiene saldo pendiente, cambiar estado a pending
                if (sale.pendingAmount > 0) {
                    sale.status = 'pending';
                }
                
                // Remover el pago del array payments de la venta (si existe)
                if (sale.payments && sale.payments.length > 0) {
                    // Buscar y remover el pago que coincida
                    const paymentInSaleIndex = sale.payments.findIndex(p => 
                        p.fromPortfolio === true && 
                        p.amount === appliedSale.amountApplied
                    );
                    if (paymentInSaleIndex !== -1) {
                        sale.payments.splice(paymentInSaleIndex, 1);
                    }
                }
                
                sale.updatedAt = db.getCurrentDateTime();
                salesData.sales[saleIndex] = sale;
            }
        }
        
        // Guardar cambios en ventas
        if (!db.writeJSON('sales.json', salesData)) {
            return { success: false, message: 'Error al revertir los cambios en ventas' };
        }
        
        // Eliminar el abono del registro
        paymentsData.payments.splice(paymentIndex, 1);
        
        if (!db.writeJSON('payments.json', paymentsData)) {
            return { success: false, message: 'Error al eliminar el abono' };
        }
        
        return {
            success: true,
            message: 'Abono eliminado y revertido correctamente',
            revertedAmount: payment.amount,
            affectedSales: payment.appliedToSales
        };
    },
    
    /**
     * Obtiene estadísticas de abonos para reportes
     * Ordenados por fecha del pago (date) primero (más nuevos primero), luego por fecha de creación (createdAt)
     */
    getPaymentStats(startDate, endDate, options = {}) {
        const paymentsData = db.readJSON('payments.json');
        if (!paymentsData || !paymentsData.payments) {
            return {
                totalPayments: 0,
                paymentsCount: 0,
                cashTotal: 0,
                transferTotal: 0,
                payments: []
            };
        }
        
        let payments = paymentsData.payments.filter(p => 
            p.date >= startDate && p.date <= endDate
        );

        if (options.excludeInitial === true) {
            payments = payments.filter(p => p.isInitialPayment !== true);
        }

        if (options.onlyPortfolio) {
            const portfolioIndex = buildPortfolioPaymentIndex();
            payments = payments.filter(p => isPortfolioPayment(p, portfolioIndex));
        }
        
        // Ordenar por fecha del pago primero (más nuevos primero), luego por createdAt
        payments.sort((a, b) => {
            if (a.date !== b.date) {
                return b.date.localeCompare(a.date); // Más nuevos primero
            }
            const createdA = new Date(a.createdAt || a.date);
            const createdB = new Date(b.createdAt || b.date);
            return createdB - createdA; // Más nuevos primero
        });
        
        let totalPayments = 0;
        let cashTotal = 0;
        let transferTotal = 0;
        
        payments.forEach(payment => {
            totalPayments += payment.amount;
            if (payment.paymentMethod === 'cash') {
                cashTotal += payment.amount;
            } else if (payment.paymentMethod === 'transfer') {
                transferTotal += payment.amount;
            }
        });
        
        return {
            totalPayments: Math.round(totalPayments),
            paymentsCount: payments.length,
            cashTotal: Math.round(cashTotal),
            transferTotal: Math.round(transferTotal),
            payments: payments
        };
    },
    
    /**
     * Obtiene resumen general de cartera
     */
    getPortfolioSummary() {
        const clientsWithCredits = this.getClientsWithCredits();
        
        const totalClients = clientsWithCredits.length;
        const totalPending = clientsWithCredits.reduce((sum, c) => sum + c.totalPending, 0);
        const totalBaskets = clientsWithCredits.reduce((sum, c) => sum + c.totalBaskets, 0);
        
        const criticalCount = clientsWithCredits.filter(c => c.urgency === 'critical').length;
        const warningCount = clientsWithCredits.filter(c => c.urgency === 'warning').length;
        const attentionCount = clientsWithCredits.filter(c => c.urgency === 'attention').length;
        
        return {
            totalClients,
            totalPending: Math.round(totalPending),
            totalBaskets,
            urgencyCounts: {
                critical: criticalCount,
                warning: warningCount,
                attention: attentionCount,
                normal: totalClients - criticalCount - warningCount - attentionCount
            },
            hasAlerts: criticalCount > 0 || warningCount > 0
        };
    }
};

module.exports = PortfolioService;
