const CashRegisterService = require('../services/cashRegisterService');

/**
 * Controlador de caja registradora
 */
const CashRegisterController = {
    /**
     * Obtiene el estado actual de la caja
     */
    getStatus(req, res) {
        const status = CashRegisterService.getStatus();
        return res.json({
            success: true,
            ...status
        });
    },
    
    /**
     * Obtiene el historial de cajas
     */
    getAll(req, res) {
        const { startDate, endDate } = req.query;
        
        const filters = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        
        const registers = CashRegisterService.getFiltered(filters);
        
        return res.json({
            success: true,
            registers
        });
    },
    
    /**
     * Obtiene una caja por ID
     */
    getById(req, res) {
        const { id } = req.params;
        const register = CashRegisterService.getById(id);
        
        if (!register) {
            return res.status(404).json({
                success: false,
                message: 'Registro de caja no encontrado'
            });
        }
        
        return res.json({
            success: true,
            register
        });
    },
    
    /**
     * Abre una nueva caja
     */
    open(req, res) {
        const { initialAmount } = req.body;
        
        if (initialAmount === undefined || initialAmount === null) {
            return res.status(400).json({
                success: false,
                message: 'El monto inicial es requerido'
            });
        }
        
        const result = CashRegisterService.open(initialAmount);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.status(201).json(result);
    },
    
    /**
     * Cierra la caja actual
     */
    close(req, res) {
        const result = CashRegisterService.close();
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.json(result);
    }
};

module.exports = CashRegisterController;
