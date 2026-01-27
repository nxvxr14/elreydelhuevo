const DashboardService = require('../services/dashboardService');

/**
 * Controlador de dashboard
 */
const DashboardController = {
    /**
     * Obtiene los períodos disponibles con datos
     */
    getAvailablePeriods(req, res) {
        const periods = DashboardService.getAvailablePeriods();
        return res.json({
            success: true,
            ...periods
        });
    },
    
    /**
     * Obtiene el resumen general del dashboard
     */
    getSummary(req, res) {
        const summary = DashboardService.getSummary();
        return res.json({
            success: true,
            ...summary
        });
    },
    
    /**
     * Obtiene métricas de un mes específico
     */
    getMonthMetrics(req, res) {
        const { year, month } = req.query;
        
        const now = new Date();
        const targetYear = parseInt(year) || now.getFullYear();
        const targetMonth = parseInt(month) || (now.getMonth() + 1);
        
        const metrics = DashboardService.getMonthMetrics(targetYear, targetMonth);
        
        return res.json({
            success: true,
            metrics
        });
    },
    
    /**
     * Obtiene datos para gráficos
     */
    getChartData(req, res) {
        const { year, month } = req.query;
        
        const now = new Date();
        const targetYear = parseInt(year) || now.getFullYear();
        const targetMonth = parseInt(month) || (now.getMonth() + 1);
        
        const chartData = DashboardService.getCombinedChartData(targetYear, targetMonth);
        
        return res.json({
            success: true,
            chartData
        });
    }
};

module.exports = DashboardController;
