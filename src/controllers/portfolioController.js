const PortfolioService = require('../services/portfolioService');

/**
 * Controlador de Cartera
 */
const PortfolioController = {
    /**
     * Obtiene lista de clientes con créditos pendientes
     */
    getClientsWithCredits(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const options = {};
            if (startDate && endDate) {
                options.startDate = startDate;
                options.endDate = endDate;
            }
            const clients = PortfolioService.getClientsWithCredits(options);
            const summary = PortfolioService.getPortfolioSummary();
            return res.json({ success: true, clients, summary });
        } catch (error) {
            console.error('Error obteniendo cartera:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener la cartera' });
        }
    },
    
    /**
     * Obtiene el detalle de cartera de un cliente específico
     */
    getClientPortfolio(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const options = {};
            if (startDate && endDate) {
                options.startDate = startDate;
                options.endDate = endDate;
            }
            
            const portfolio = PortfolioService.getClientPortfolio(req.params.clientId, options);
            if (!portfolio) {
                return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
            }
            
            const paymentHistory = PortfolioService.getClientPaymentHistory(req.params.clientId, options);
            
            return res.json({
                success: true,
                portfolio,
                paymentHistory
            });
        } catch (error) {
            console.error('Error obteniendo cartera del cliente:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener la cartera del cliente' });
        }
    },
    
    /**
     * Registra un abono para un cliente (FIFO)
     */
    addPayment(req, res) {
        try {
            const { clientId } = req.params;
            const { amount, paymentMethod, transferType, note } = req.body;
            
            const result = PortfolioService.addPayment(
                clientId,
                amount,
                paymentMethod || 'cash',
                transferType,
                note
            );
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            
            return res.status(201).json(result);
        } catch (error) {
            console.error('Error registrando abono:', error);
            return res.status(500).json({ success: false, message: 'Error al registrar el abono' });
        }
    },
    
    /**
     * Elimina un abono y revierte su efecto
     */
    deletePayment(req, res) {
        try {
            const { paymentId } = req.params;
            const result = PortfolioService.deletePayment(paymentId);
            
            if (!result.success) {
                return res.status(400).json(result);
            }
            
            return res.json(result);
        } catch (error) {
            console.error('Error eliminando abono:', error);
            return res.status(500).json({ success: false, message: 'Error al eliminar el abono' });
        }
    },
    
    /**
     * Obtiene estadísticas de abonos para reportes
     */
    getPaymentStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({ success: false, message: 'Se requieren fechas de inicio y fin' });
            }
            
            const stats = PortfolioService.getPaymentStats(startDate, endDate, { onlyPortfolio: true, excludeInitial: true });
            return res.json({ success: true, ...stats });
        } catch (error) {
            console.error('Error obteniendo estadísticas de abonos:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
        }
    },
    
    /**
     * Obtiene resumen general de cartera
     */
    getSummary(req, res) {
        try {
            const summary = PortfolioService.getPortfolioSummary();
            return res.json({ success: true, ...summary });
        } catch (error) {
            console.error('Error obteniendo resumen de cartera:', error);
            return res.status(500).json({ success: false, message: 'Error al obtener el resumen' });
        }
    }
};

module.exports = PortfolioController;
