const db = require('../utils/database');
const SaleService = require('./saleService');
const ExpenseService = require('./expenseService');
const InventoryService = require('./inventoryService');
const CashRegisterService = require('./cashRegisterService');

/**
 * Servicio de Dashboard
 */
const DashboardService = {
    /**
     * Obtiene los períodos (años y meses) que tienen datos
     */
    getAvailablePeriods() {
        const salesData = db.readJSON('sales.json');
        const expensesData = db.readJSON('expenses.json');
        const inventoryData = db.readJSON('inventory.json');
        
        const periods = new Set();
        
        // Extraer períodos de ventas
        if (salesData && salesData.sales) {
            salesData.sales.forEach(sale => {
                if (sale.date) {
                    const date = sale.date.substring(0, 7); // YYYY-MM
                    periods.add(date);
                }
            });
        }
        
        // Extraer períodos de gastos
        if (expensesData && expensesData.expenses) {
            expensesData.expenses.forEach(expense => {
                if (expense.date) {
                    const date = expense.date.substring(0, 7); // YYYY-MM
                    periods.add(date);
                }
            });
        }
        
        // Extraer períodos de inventario
        if (inventoryData && inventoryData.entries) {
            inventoryData.entries.forEach(entry => {
                if (entry.date) {
                    const date = entry.date.substring(0, 7); // YYYY-MM
                    periods.add(date);
                }
            });
        }
        
        // Siempre incluir el mes actual
        const now = new Date();
        const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        periods.add(currentPeriod);
        
        // Convertir a array ordenado descendente
        const sortedPeriods = Array.from(periods).sort().reverse();
        
        // Organizar por años y meses
        const years = {};
        sortedPeriods.forEach(period => {
            const [year, month] = period.split('-');
            if (!years[year]) {
                years[year] = [];
            }
            years[year].push(parseInt(month));
        });
        
        // Ordenar meses dentro de cada año (descendente)
        Object.keys(years).forEach(year => {
            years[year].sort((a, b) => b - a);
        });
        
        return {
            years: Object.keys(years).sort((a, b) => b - a),
            monthsByYear: years
        };
    },
    
    /**
     * Obtiene las métricas del mes especificado
     */
    getMonthMetrics(year, month) {
        // Calcular fechas del mes
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        // Obtener estadísticas
        const salesStats = SaleService.getStats(startDate, endDate);
        const expensesStats = ExpenseService.getStats(startDate, endDate);
        const inventoryStats = InventoryService.getStats(startDate, endDate);
        
        // Calcular utilidad
        const profit = salesStats.totalSales - expensesStats.totalExpenses;
        
        return {
            period: {
                year,
                month,
                startDate,
                endDate
            },
            sales: salesStats,
            expenses: expensesStats,
            inventory: inventoryStats,
            profit: Math.round(profit)
        };
    },
    
    /**
     * Obtiene datos para gráficos de ventas por día del mes
     */
    getSalesChartData(year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        const salesByDay = SaleService.getByDay(startDate, endDate);
        
        // Crear array con todos los días del mes
        const labels = [];
        const data = [];
        
        for (let day = 1; day <= lastDay; day++) {
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            labels.push(day.toString());
            data.push(salesByDay[date] || 0);
        }
        
        return { labels, data };
    },
    
    /**
     * Obtiene datos para gráficos de gastos por día del mes
     */
    getExpensesChartData(year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        const expensesByDay = ExpenseService.getByDay(startDate, endDate);
        
        // Crear array con todos los días del mes
        const labels = [];
        const data = [];
        
        for (let day = 1; day <= lastDay; day++) {
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            labels.push(day.toString());
            data.push(expensesByDay[date] || 0);
        }
        
        return { labels, data };
    },
    
    /**
     * Obtiene datos combinados para el gráfico
     */
    getCombinedChartData(year, month) {
        const salesData = this.getSalesChartData(year, month);
        const expensesData = this.getExpensesChartData(year, month);
        
        return {
            labels: salesData.labels,
            sales: salesData.data,
            expenses: expensesData.data
        };
    },
    
    /**
     * Obtiene resumen general
     */
    getSummary() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        
        // Métricas del mes actual
        const monthMetrics = this.getMonthMetrics(currentYear, currentMonth);
        
        // Estado de la caja
        const cashStatus = CashRegisterService.getStatus();
        
        // Productos con bajo stock (menos de 10 unidades)
        const productsData = db.readJSON('products.json');
        const lowStockProducts = productsData ? 
            productsData.products.filter(p => p.stock < 10) : [];
        
        // Resumen de créditos pendientes
        const creditsSummary = SaleService.getCreditsSummary();
        
        return {
            currentMonth: monthMetrics,
            cashStatus,
            lowStockProducts,
            lowStockCount: lowStockProducts.length,
            creditsSummary
        };
    }
};

module.exports = DashboardService;
