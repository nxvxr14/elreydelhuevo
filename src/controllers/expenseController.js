const ExpenseService = require('../services/expenseService');

/**
 * Controlador de gastos
 */
const ExpenseController = {
    /**
     * Obtiene todos los gastos
     */
    getAll(req, res) {
        const { startDate, endDate } = req.query;
        
        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        
        const expenses = ExpenseService.getFiltered(filters);
        
        return res.json({
            success: true,
            expenses
        });
    },
    
    /**
     * Obtiene un gasto por ID
     */
    getById(req, res) {
        const { id } = req.params;
        const expense = ExpenseService.getById(id);
        
        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Gasto no encontrado'
            });
        }
        
        return res.json({
            success: true,
            expense
        });
    },
    
    /**
     * Crea un nuevo gasto
     */
    create(req, res) {
        const result = ExpenseService.create(req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.status(201).json(result);
    },
    
    /**
     * Actualiza un gasto
     */
    update(req, res) {
        const { id } = req.params;
        const result = ExpenseService.update(id, req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.json(result);
    },
    
    /**
     * Elimina un gasto
     */
    delete(req, res) {
        const { id } = req.params;
        const result = ExpenseService.delete(id);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.json(result);
    },
    
    /**
     * Obtiene estadísticas de gastos
     */
    getStats(req, res) {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Las fechas de inicio y fin son requeridas'
            });
        }
        
        const stats = ExpenseService.getStats(startDate, endDate);
        
        return res.json({
            success: true,
            stats
        });
    }
};

module.exports = ExpenseController;
