const SaleService = require('../services/saleService');
const ExpenseService = require('../services/expenseService');
const InventoryService = require('../services/inventoryService');
const CashRegisterService = require('../services/cashRegisterService');
const ProductService = require('../services/productService');
const ClientService = require('../services/clientService');
const PortfolioService = require('../services/portfolioService');

/**
 * Controlador de reportes
 */
const ReportController = {
    /**
     * Reporte de ventas
     */
    getSalesReport(req, res) {
        const { startDate, endDate, clientId, productId } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Las fechas de inicio y fin son requeridas'
            });
        }
        
        const filters = { startDate, endDate };
        if (clientId) filters.clientId = clientId;
        if (productId) filters.productId = productId;
        
        const sales = SaleService.getFiltered(filters);
        const stats = SaleService.getStats(startDate, endDate);
        const salesByDay = SaleService.getByDay(startDate, endDate);
        
        // Remover notas de los items para el reporte
        const salesWithoutNotes = sales.map(sale => {
            const { note, ...saleWithoutNote } = sale;
            return saleWithoutNote;
        });
        
        return res.json({
            success: true,
            report: {
                period: { startDate, endDate },
                stats,
                salesByDay,
                sales: salesWithoutNotes
            }
        });
    },
    
    /**
     * Reporte de gastos
     */
    getExpensesReport(req, res) {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Las fechas de inicio y fin son requeridas'
            });
        }
        
        const expenses = ExpenseService.getFiltered({ startDate, endDate });
        const stats = ExpenseService.getStats(startDate, endDate);
        const expensesByDay = ExpenseService.getByDay(startDate, endDate);
        
        // Remover notas para el reporte
        const expensesWithoutNotes = expenses.map(expense => {
            const { note, ...expenseWithoutNote } = expense;
            return expenseWithoutNote;
        });
        
        return res.json({
            success: true,
            report: {
                period: { startDate, endDate },
                stats,
                expensesByDay,
                expenses: expensesWithoutNotes
            }
        });
    },
    
    /**
     * Reporte de inventario
     */
    getInventoryReport(req, res) {
        const { startDate, endDate, productId } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Las fechas de inicio y fin son requeridas'
            });
        }
        
        const filters = { startDate, endDate };
        if (productId) filters.productId = productId;
        
        const entries = InventoryService.getFiltered(filters);
        const stats = InventoryService.getStats(startDate, endDate);
        
        // Remover notas para el reporte
        const entriesWithoutNotes = entries.map(entry => {
            const { note, ...entryWithoutNote } = entry;
            return entryWithoutNote;
        });
        
        // Agregar stock actual de productos
        const products = ProductService.getAll();
        
        return res.json({
            success: true,
            report: {
                period: { startDate, endDate },
                stats,
                entries: entriesWithoutNotes,
                currentStock: products.map(p => ({
                    id: p.id,
                    name: p.name,
                    stock: p.stock
                }))
            }
        });
    },
    
    /**
     * Reporte de caja
     */
    getCashReport(req, res) {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Las fechas de inicio y fin son requeridas'
            });
        }
        
        const registers = CashRegisterService.getFiltered({ startDate, endDate });
        
        // Calcular totales
        const totals = registers.reduce((acc, r) => {
            acc.totalSales += r.totalSales || 0;
            acc.totalExpenses += r.totalExpenses || 0;
            acc.totalInitial += r.initialAmount || 0;
            acc.totalFinal += r.expectedAmount || 0;
            return acc;
        }, { totalSales: 0, totalExpenses: 0, totalInitial: 0, totalFinal: 0 });
        
        return res.json({
            success: true,
            report: {
                period: { startDate, endDate },
                totals,
                registers
            }
        });
    },
    
    /**
     * Reporte diario
     * Desglose de ingresos: Efectivo + Transferencias (por tipo) + Abonos créditos
     */
    getDailyReport(req, res) {
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'La fecha es requerida'
            });
        }
        
        const expensesStats = ExpenseService.getStats(date, date);
        const inventoryStats = InventoryService.getStats(date, date);
        const cashRegister = CashRegisterService.getByDate(date);
        
        const sales = SaleService.getFiltered({ startDate: date, endDate: date });
        const expenses = ExpenseService.getFiltered({ startDate: date, endDate: date });
        const entries = InventoryService.getFiltered({ startDate: date, endDate: date });
        
        // Calcular desglose de ingresos y canastas vendidas
        let ventasEfectivo = 0;
        let ventasTransferencia = 0;
        let ventasNequi = 0;
        let ventasBancolombia = 0;
        let ventasDavivienda = 0;
        let totalVentas = 0;
        let totalCanastasVendidas = 0;
        
        sales.forEach(sale => {
            totalVentas += sale.total;
            
            // Calcular canastas vendidas (suma de cantidades de todos los items)
            if (sale.items && sale.items.length > 0) {
                sale.items.forEach(item => {
                    totalCanastasVendidas += item.quantity || 0;
                });
            }
            
            if (sale.paymentMethod === 'cash') {
                ventasEfectivo += sale.total;
            } else if (sale.paymentMethod === 'transfer') {
                ventasTransferencia += sale.total;
                if (sale.transferType === 'nequi') ventasNequi += sale.total;
                else if (sale.transferType === 'bancolombia') ventasBancolombia += sale.total;
                else if (sale.transferType === 'davivienda') ventasDavivienda += sale.total;
            }
            // Las ventas a crédito NO suman como ingreso directo (solo los abonos)
        });
        
        // Obtener abonos de créditos del día (desde payments.json)
        const paymentStats = PortfolioService.getPaymentStats(date, date);
        const abonosCreditos = paymentStats.totalPayments || 0;
        const abonosEfectivo = paymentStats.cashTotal || 0;
        const abonosTransferencia = paymentStats.transferTotal || 0;
        
        // Desglose de abonos por tipo de transferencia
        let abonosNequi = 0;
        let abonosBancolombia = 0;
        let abonosDavivienda = 0;
        if (paymentStats.payments) {
            paymentStats.payments.forEach(p => {
                if (p.paymentMethod === 'transfer') {
                    if (p.transferType === 'nequi') abonosNequi += p.amount;
                    else if (p.transferType === 'bancolombia') abonosBancolombia += p.amount;
                    else if (p.transferType === 'davivienda') abonosDavivienda += p.amount;
                }
            });
        }
        
        // Total ingresos = ventas efectivo + ventas transferencia + abonos créditos
        const totalIngresos = ventasEfectivo + ventasTransferencia + abonosCreditos;
        
        // Total efectivo del día (ventas + abonos en efectivo)
        const totalEfectivo = ventasEfectivo + abonosEfectivo;
        
        // Total transferencias del día (ventas + abonos en transferencia)
        const totalTransferencias = ventasTransferencia + abonosTransferencia;
        
        return res.json({
            success: true,
            report: {
                date,
                // Resumen general
                totalVentas: Math.round(totalVentas),
                totalIngresos: Math.round(totalIngresos),
                totalGastos: Math.round(expensesStats.totalExpenses),
                utilidad: Math.round(totalIngresos - expensesStats.totalExpenses),
                
                // Desglose de ventas
                ventas: {
                    efectivo: Math.round(ventasEfectivo),
                    transferencia: Math.round(ventasTransferencia),
                    nequi: Math.round(ventasNequi),
                    bancolombia: Math.round(ventasBancolombia),
                    davivienda: Math.round(ventasDavivienda),
                    count: sales.length,
                    canastas: totalCanastasVendidas
                },
                
                // Abonos de créditos
                abonos: {
                    total: Math.round(abonosCreditos),
                    efectivo: Math.round(abonosEfectivo),
                    transferencia: Math.round(abonosTransferencia),
                    nequi: Math.round(abonosNequi),
                    bancolombia: Math.round(abonosBancolombia),
                    davivienda: Math.round(abonosDavivienda),
                    count: paymentStats.paymentsCount || 0
                },
                
                // Totales consolidados por método
                totales: {
                    efectivo: Math.round(totalEfectivo),
                    transferencia: Math.round(totalTransferencias),
                    nequi: Math.round(ventasNequi + abonosNequi),
                    bancolombia: Math.round(ventasBancolombia + abonosBancolombia),
                    davivienda: Math.round(ventasDavivienda + abonosDavivienda)
                },
                
                // Gastos e inventario
                expenses: {
                    stats: expensesStats,
                    count: expenses.length
                },
                inventory: {
                    stats: inventoryStats,
                    count: entries.length
                },
                cashRegister: cashRegister || null
            }
        });
    }
};

module.exports = ReportController;
