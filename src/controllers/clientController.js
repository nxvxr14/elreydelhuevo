const ClientService = require('../services/clientService');

/**
 * Controlador de clientes
 */
const ClientController = {
    /**
     * Obtiene todos los clientes con estadísticas
     */
    getAll(req, res) {
        const clients = ClientService.getAllWithStats();
        return res.json({
            success: true,
            clients
        });
    },
    
    /**
     * Obtiene un cliente por ID con estadísticas
     */
    getById(req, res) {
        const { id } = req.params;
        const client = ClientService.getByIdWithStats(id);
        
        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Cliente no encontrado'
            });
        }
        
        return res.json({
            success: true,
            client
        });
    },
    
    /**
     * Crea un nuevo cliente
     */
    create(req, res) {
        const result = ClientService.create(req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.status(201).json(result);
    },
    
    /**
     * Actualiza un cliente
     */
    update(req, res) {
        const { id } = req.params;
        const result = ClientService.update(id, req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.json(result);
    },
    
    /**
     * Elimina un cliente
     */
    delete(req, res) {
        const { id } = req.params;
        const result = ClientService.delete(id);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.json(result);
    }
};

module.exports = ClientController;
