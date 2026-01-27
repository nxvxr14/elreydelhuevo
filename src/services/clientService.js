const db = require('../utils/database');

/**
 * Servicio de clientes
 */
const ClientService = {
    /**
     * Obtiene todos los clientes
     */
    getAll() {
        const data = db.readJSON('clients.json');
        if (!data) return [];
        return data.clients;
    },
    
    /**
     * Obtiene todos los clientes con sus estadísticas de compra calculadas
     */
    getAllWithStats() {
        const clients = this.getAll();
        const salesData = db.readJSON('sales.json');
        const sales = salesData ? salesData.sales : [];
        
        return clients.map(client => {
            const clientSales = sales.filter(s => s.clientId === client.id);
            const totalPurchased = clientSales.reduce((sum, s) => sum + s.total, 0);
            const totalQuantity = clientSales.reduce((sum, s) => {
                return sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
            }, 0);
            
            return {
                ...client,
                totalPurchased,
                totalQuantity,
                salesCount: clientSales.length
            };
        });
    },
    
    /**
     * Obtiene un cliente por ID
     */
    getById(id) {
        const clients = this.getAll();
        return clients.find(c => c.id === parseInt(id));
    },
    
    /**
     * Obtiene un cliente con sus estadísticas
     */
    getByIdWithStats(id) {
        const client = this.getById(id);
        if (!client) return null;
        
        const salesData = db.readJSON('sales.json');
        const sales = salesData ? salesData.sales : [];
        const clientSales = sales.filter(s => s.clientId === parseInt(id));
        
        const totalPurchased = clientSales.reduce((sum, s) => sum + s.total, 0);
        const totalQuantity = clientSales.reduce((sum, s) => {
            return sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
        }, 0);
        
        return {
            ...client,
            totalPurchased,
            totalQuantity,
            salesCount: clientSales.length
        };
    },
    
    /**
     * Crea un nuevo cliente
     */
    create(clientData) {
        const data = db.readJSON('clients.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        if (!clientData.name || clientData.name.trim() === '') {
            return { success: false, message: 'El nombre del cliente es requerido' };
        }
        
        data.lastId++;
        
        const newClient = {
            id: data.lastId,
            name: clientData.name.trim(),
            phone: clientData.phone ? clientData.phone.trim() : '',
            email: clientData.email ? clientData.email.trim() : '',
            address: clientData.address ? clientData.address.trim() : '',
            createdAt: db.getCurrentDateTime(),
            updatedAt: db.getCurrentDateTime()
        };
        
        data.clients.push(newClient);
        
        if (!db.writeJSON('clients.json', data)) {
            return { success: false, message: 'Error al guardar el cliente' };
        }
        
        return { success: true, client: newClient };
    },
    
    /**
     * Actualiza un cliente
     */
    update(id, clientData) {
        const data = db.readJSON('clients.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.clients.findIndex(c => c.id === parseInt(id));
        if (index === -1) {
            return { success: false, message: 'Cliente no encontrado' };
        }
        
        if (clientData.name !== undefined) {
            if (clientData.name.trim() === '') {
                return { success: false, message: 'El nombre del cliente es requerido' };
            }
            data.clients[index].name = clientData.name.trim();
        }
        
        if (clientData.phone !== undefined) {
            data.clients[index].phone = clientData.phone.trim();
        }
        
        if (clientData.email !== undefined) {
            data.clients[index].email = clientData.email.trim();
        }
        
        if (clientData.address !== undefined) {
            data.clients[index].address = clientData.address.trim();
        }
        
        data.clients[index].updatedAt = db.getCurrentDateTime();
        
        if (!db.writeJSON('clients.json', data)) {
            return { success: false, message: 'Error al actualizar el cliente' };
        }
        
        return { success: true, client: data.clients[index] };
    },
    
    /**
     * Elimina un cliente
     */
    delete(id) {
        const data = db.readJSON('clients.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.clients.findIndex(c => c.id === parseInt(id));
        if (index === -1) {
            return { success: false, message: 'Cliente no encontrado' };
        }
        
        data.clients.splice(index, 1);
        
        if (!db.writeJSON('clients.json', data)) {
            return { success: false, message: 'Error al eliminar el cliente' };
        }
        
        return { success: true, message: 'Cliente eliminado correctamente' };
    }
};

module.exports = ClientService;
