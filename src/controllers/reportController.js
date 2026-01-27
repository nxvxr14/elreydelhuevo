const SaleService = require('../services/saleService');
const ExpenseService = require('../services/expenseService');
const InventoryService = require('../services/inventoryService');
const CashRegisterService = require('../services/cashRegisterService');
const ProductService = require('../services/productService');
const ClientService = require('../services/clientService');

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
     */
    getDailyReport(req, res) {
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'La fecha es requerida'
            });
        }
        
        const salesStats = SaleService.getStats(date, date);
        const expensesStats = ExpenseService.getStats(date, date);
        const inventoryStats = InventoryService.getStats(date, date);
        const cashRegister = CashRegisterService.getByDate(date);
        
        const sales = SaleService.getFiltered({ startDate: date, endDate: date });
        const expenses = ExpenseService.getFiltered({ startDate: date, endDate: date });
        const entries = InventoryService.getFiltered({ startDate: date, endDate: date });
        
        return res.json({
            success: true,
            report: {
                date,
                sales: {
                    stats: salesStats,
                    count: sales.length
                },
                expenses: {
                    stats: expensesStats,
                    count: expenses.length
                },
                inventory: {
                    stats: inventoryStats,
                    count: entries.length
                },
                cashRegister: cashRegister || null,
                profit: Math.round(salesStats.totalSales - expensesStats.totalExpenses)
            }
        });
    }
};

module.exports = ReportController;
