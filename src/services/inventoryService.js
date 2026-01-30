const db = require('../utils/database');
const ProductService = require('./productService');

/**
 * Servicio de inventario (entradas de productos)
 */
const InventoryService = {
    /**
     * Obtiene todas las entradas de inventario
     */
    getAll() {
        const data = db.readJSON('inventory.json');
        if (!data) return [];
        return data.entries;
    },
    
    /**
     * Obtiene todas las entradas con detalles de producto
     */
    getAllWithDetails() {
        const entries = this.getAll();
        const productsData = db.readJSON('products.json');
        const products = productsData ? productsData.products : [];
        
        return entries.map(entry => {
            const product = products.find(p => p.id === entry.productId);
            return {
                ...entry,
                productName: product ? product.name : 'Producto eliminado'
            };
        });
    },
    
    /**
     * Obtiene entradas filtradas
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
     * Crea una nueva entrada de inventario
     */
    create(entryData) {
        const data = db.readJSON('inventory.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
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
        
        if (!entryData.origin || entryData.origin.trim() === '') {
            return { success: false, message: 'El origen del ingreso es requerido' };
        }
        
        if (entryData.date && !db.isValidDate(entryData.date)) {
            return { success: false, message: 'La fecha no es válida' };
        }
        
        // Generar referencia
        const reference = db.generateReference('I');
        
        const newEntry = {
            id: reference,
            reference,
            productId: parseInt(entryData.productId),
            quantity: parseFloat(entryData.quantity),
            origin: entryData.origin.trim(),
            note: entryData.note ? entryData.note.substring(0, 200) : '',
            date: entryData.date || db.getCurrentDate(),
            createdAt: db.getCurrentDateTime()
        };
        
        // Actualizar stock del producto
        const stockResult = ProductService.updateStock(entryData.productId, parseFloat(entryData.quantity));
        if (!stockResult.success) {
            return { success: false, message: `Error al actualizar stock: ${stockResult.message}` };
        }
        
        data.entries.push(newEntry);
        
        if (!db.writeJSON('inventory.json', data)) {
            return { success: false, message: 'Error al guardar la entrada' };
        }
        
        return { success: true, entry: newEntry };
    },
    
    /**
     * Elimina una entrada de inventario
     */
    delete(id) {
        const data = db.readJSON('inventory.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.entries.findIndex(e => e.id === id);
        if (index === -1) {
            return { success: false, message: 'Entrada no encontrada' };
        }
        
        const entry = data.entries[index];
        
        // Verificar si se puede revertir el stock
        const product = ProductService.getById(entry.productId);
        if (product && product.stock < entry.quantity) {
            return { 
                success: false, 
                message: `No se puede eliminar. El stock actual (${product.stock}) es menor a la cantidad de entrada (${entry.quantity})` 
            };
        }
        
        // Revertir stock
        if (product) {
            ProductService.updateStock(entry.productId, -entry.quantity);
        }
        
        data.entries.splice(index, 1);
        
        if (!db.writeJSON('inventory.json', data)) {
            return { success: false, message: 'Error al eliminar la entrada' };
        }
        
        return { success: true, message: 'Entrada eliminada correctamente' };
    },
    
    /**
     * Obtiene estadísticas de inventario
     */
    getStats(startDate, endDate) {
        const entries = this.getAll().filter(e => {
            return e.date >= startDate && e.date <= endDate;
        });
        
        const totalEntries = entries.reduce((sum, e) => sum + e.quantity, 0);
        const entriesCount = entries.length;
        
        return {
            totalEntries,
            entriesCount
        };
    }
};

module.exports = InventoryService;
