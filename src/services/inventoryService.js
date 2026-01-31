const db = require('../utils/database');
const ProductService = require('./productService');

/**
 * Motivos válidos para salidas de inventario
 */
const EXIT_REASONS = {
    waste: 'Desecho',
    cracked: 'Picado',
    adjustment: 'Ajuste de inventario',
    gift_rodrigo: 'Obsequio Rodrigo'
};

/**
 * Servicio de inventario (entradas y salidas de productos)
 */
const InventoryService = {
    /**
     * Obtiene los motivos de salida válidos
     */
    getExitReasons() {
        return EXIT_REASONS;
    },
    
    /**
     * Obtiene todas las entradas/salidas de inventario
     */
    getAll() {
        const data = db.readJSON('inventory.json');
        if (!data) return [];
        return data.entries;
    },
    
    /**
     * Obtiene todas las entradas/salidas con detalles de producto
     */
    getAllWithDetails() {
        const entries = this.getAll();
        const productsData = db.readJSON('products.json');
        const products = productsData ? productsData.products : [];
        
        return entries.map(entry => {
            const product = products.find(p => p.id === entry.productId);
            return {
                ...entry,
                productName: product ? product.name : 'Producto eliminado',
                // Para registros antiguos sin tipo, asumir 'entry'
                type: entry.type || 'entry',
                // Traducir el motivo de salida
                reasonLabel: entry.reason ? (EXIT_REASONS[entry.reason] || entry.reason) : null
            };
        });
    },
    
    /**
     * Obtiene entradas/salidas filtradas
     */
    getFiltered(filters = {}) {
        let entries = this.getAllWithDetails();
        
        if (filters.startDate) {
            entries = entries.filter(e => e.date >= filters.startDate);
        }
        
        if (filters.endDate) {
            entries = entries.filter(e => e.date <= filters.endDate);
        }
        
        if (filters.productId) {
            entries = entries.filter(e => e.productId === parseInt(filters.productId));
        }
        
        // Filtrar por tipo (entry/exit)
        if (filters.type) {
            entries = entries.filter(e => (e.type || 'entry') === filters.type);
        }
        
        // Filtrar por motivo de salida
        if (filters.reason) {
            entries = entries.filter(e => e.reason === filters.reason);
        }
        
        return entries;
    },
    
    /**
     * Obtiene una entrada por ID
     */
    getById(id) {
        const entries = this.getAll();
        return entries.find(e => e.id === id);
    },
    
    /**
     * Crea una nueva entrada o salida de inventario
     * @param {Object} entryData - Datos del movimiento
     * @param {string} entryData.type - Tipo: 'entry' (entrada) o 'exit' (salida)
     * @param {number} entryData.productId - ID del producto
     * @param {number} entryData.quantity - Cantidad (siempre positiva)
     * @param {string} entryData.origin - Origen (solo para entradas)
     * @param {string} entryData.reason - Motivo de salida: 'waste', 'adjustment', 'gift_rodrigo' (solo para salidas)
     * @param {string} entryData.note - Nota opcional
     * @param {string} entryData.date - Fecha del movimiento
     */
    create(entryData) {
        const data = db.readJSON('inventory.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        // Tipo por defecto es 'entry' para compatibilidad
        const type = entryData.type || 'entry';
        
        // Validaciones
        if (!entryData.productId) {
            return { success: false, message: 'Debe seleccionar un producto' };
        }
        
        const product = ProductService.getById(entryData.productId);
        if (!product) {
            return { success: false, message: 'Producto no encontrado' };
        }
        
        if (!db.isPositiveNumber(entryData.quantity) || parseFloat(entryData.quantity) <= 0) {
            return { success: false, message: 'La cantidad debe ser un número positivo mayor a 0' };
        }
        
        if (!db.isValidQuantity(entryData.quantity)) {
            return { success: false, message: 'La cantidad solo puede tener .5 como decimal (ej: 10, 10.5)' };
        }
        
        const quantity = parseFloat(entryData.quantity);
        
        // Validaciones específicas según el tipo
        if (type === 'entry') {
            if (!entryData.origin || entryData.origin.trim() === '') {
                return { success: false, message: 'El origen del ingreso es requerido' };
            }
        } else if (type === 'exit') {
            if (!entryData.reason || !EXIT_REASONS[entryData.reason]) {
                return { success: false, message: 'Debe seleccionar un motivo válido para la salida' };
            }
            
            // Verificar que hay suficiente stock
            if (product.stock < quantity) {
                return { 
                    success: false, 
                    message: `Stock insuficiente. Stock actual: ${product.stock}, cantidad solicitada: ${quantity}` 
                };
            }
        } else {
            return { success: false, message: 'Tipo de movimiento no válido' };
        }
        
        if (entryData.date && !db.isValidDate(entryData.date)) {
            return { success: false, message: 'La fecha no es válida' };
        }
        
        // Generar referencia: I para entrada, S para salida
        const referencePrefix = type === 'entry' ? 'I' : 'S';
        const reference = db.generateReference(referencePrefix);
        
        const newEntry = {
            id: reference,
            reference,
            type: type,
            productId: parseInt(entryData.productId),
            quantity: quantity,
            date: entryData.date || db.getCurrentDate(),
            note: entryData.note ? entryData.note.substring(0, 200) : '',
            createdAt: db.getCurrentDateTime()
        };
        
        // Agregar campos específicos según el tipo
        if (type === 'entry') {
            newEntry.origin = entryData.origin.trim();
        } else {
            newEntry.reason = entryData.reason;
        }
        
        // Actualizar stock del producto (positivo para entrada, negativo para salida)
        const stockChange = type === 'entry' ? quantity : -quantity;
        const stockResult = ProductService.updateStock(entryData.productId, stockChange);
        if (!stockResult.success) {
            return { success: false, message: `Error al actualizar stock: ${stockResult.message}` };
        }
        
        data.entries.push(newEntry);
        
        if (!db.writeJSON('inventory.json', data)) {
            return { success: false, message: 'Error al guardar el movimiento' };
        }
        
        return { success: true, entry: newEntry };
    },
    
    /**
     * Elimina un movimiento de inventario (entrada o salida)
     */
    delete(id) {
        const data = db.readJSON('inventory.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.entries.findIndex(e => e.id === id);
        if (index === -1) {
            return { success: false, message: 'Movimiento no encontrado' };
        }
        
        const entry = data.entries[index];
        const type = entry.type || 'entry';
        
        // Verificar si se puede revertir el stock
        const product = ProductService.getById(entry.productId);
        
        if (type === 'entry') {
            // Para entradas: verificar que el stock actual permita restar
            if (product && product.stock < entry.quantity) {
                return { 
                    success: false, 
                    message: `No se puede eliminar. El stock actual (${product.stock}) es menor a la cantidad de entrada (${entry.quantity})` 
                };
            }
            // Revertir: restar del stock
            if (product) {
                ProductService.updateStock(entry.productId, -entry.quantity);
            }
        } else {
            // Para salidas: revertir sumando al stock
            if (product) {
                ProductService.updateStock(entry.productId, entry.quantity);
            }
        }
        
        data.entries.splice(index, 1);
        
        if (!db.writeJSON('inventory.json', data)) {
            return { success: false, message: 'Error al eliminar el movimiento' };
        }
        
        return { success: true, message: 'Movimiento eliminado correctamente' };
    },
    
    /**
     * Obtiene estadísticas de inventario
     */
    getStats(startDate, endDate) {
        const all = this.getAll().filter(e => {
            return e.date >= startDate && e.date <= endDate;
        });
        
        const entries = all.filter(e => (e.type || 'entry') === 'entry');
        const exits = all.filter(e => e.type === 'exit');
        
        const totalEntries = entries.reduce((sum, e) => sum + e.quantity, 0);
        const totalExits = exits.reduce((sum, e) => sum + e.quantity, 0);
        
        return {
            totalEntries,
            totalExits,
            entriesCount: entries.length,
            exitsCount: exits.length,
            netChange: totalEntries - totalExits
        };
    }
};

module.exports = InventoryService;
