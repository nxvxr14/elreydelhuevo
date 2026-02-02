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
 * Servicio de inventario (entradas, salidas y traslados de productos)
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
     * Obtiene todas las entradas/salidas con detalles de producto y bodega
     */
    getAllWithDetails() {
        const entries = this.getAll();
        const productsData = db.readJSON('products.json');
        const warehousesData = db.readJSON('warehouses.json');
        const products = productsData ? productsData.products : [];
        const warehouses = warehousesData ? warehousesData.warehouses : [];
        
        return entries.map(entry => {
            const product = products.find(p => p.id === entry.productId);
            const warehouse = entry.warehouseId ? warehouses.find(w => w.id === entry.warehouseId) : null;
            const fromWarehouse = entry.fromWarehouseId ? warehouses.find(w => w.id === entry.fromWarehouseId) : null;
            const toWarehouse = entry.toWarehouseId ? warehouses.find(w => w.id === entry.toWarehouseId) : null;
            
            return {
                ...entry,
                productName: product ? product.name : 'Producto eliminado',
                warehouseName: warehouse ? warehouse.name : (entry.warehouseId ? 'Bodega eliminada' : null),
                fromWarehouseName: fromWarehouse ? fromWarehouse.name : null,
                toWarehouseName: toWarehouse ? toWarehouse.name : null,
                // Para registros antiguos sin tipo, asumir 'entry'
                type: entry.type || 'entry',
                // Traducir el motivo de salida
                reasonLabel: entry.reason ? (EXIT_REASONS[entry.reason] || entry.reason) : null
            };
        });
    },
    
    /**
     * Obtiene entradas/salidas filtradas
     * Ordenadas por fecha (date) primero, luego por fecha de creación (createdAt)
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
        
        // Filtrar por tipo (entry/exit/transfer)
        if (filters.type) {
            entries = entries.filter(e => (e.type || 'entry') === filters.type);
        }
        
        // Filtrar por motivo de salida
        if (filters.reason) {
            entries = entries.filter(e => e.reason === filters.reason);
        }
        
        // Filtrar por bodega (cualquier bodega involucrada)
        if (filters.warehouseId) {
            const wId = parseInt(filters.warehouseId);
            entries = entries.filter(e => 
                e.warehouseId === wId || 
                e.fromWarehouseId === wId || 
                e.toWarehouseId === wId
            );
        }
        
        // Ordenar por fecha (date) primero, luego por fecha de creación
        entries.sort((a, b) => {
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            const createdA = new Date(a.createdAt || a.date);
            const createdB = new Date(b.createdAt || b.date);
            return createdA - createdB;
        });
        
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
     * @param {number} entryData.warehouseId - ID de la bodega
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
        
        // Obtener bodega (usar la primera del producto o la defecto si no se especifica)
        let warehouseId = entryData.warehouseId ? parseInt(entryData.warehouseId) : null;
        if (!warehouseId) {
            if (product.warehouseStock) {
                const warehouseIds = Object.keys(product.warehouseStock);
                warehouseId = warehouseIds.length > 0 ? parseInt(warehouseIds[0]) : null;
            }
            if (!warehouseId) {
                const defaultWarehouse = ProductService.getDefaultWarehouse();
                warehouseId = defaultWarehouse ? defaultWarehouse.id : 1;
            }
        }
        
        // Validaciones específicas según el tipo
        if (type === 'entry') {
            if (!entryData.origin || entryData.origin.trim() === '') {
                return { success: false, message: 'El origen del ingreso es requerido' };
            }
        } else if (type === 'exit') {
            if (!entryData.reason || !EXIT_REASONS[entryData.reason]) {
                return { success: false, message: 'Debe seleccionar un motivo válido para la salida' };
            }
            
            // Verificar que hay suficiente stock en la bodega
            const stockInWarehouse = ProductService.getStockByWarehouse(entryData.productId, warehouseId);
            if (stockInWarehouse < quantity) {
                return { 
                    success: false, 
                    message: `Stock insuficiente en bodega. Stock actual: ${stockInWarehouse}, cantidad solicitada: ${quantity}` 
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
            warehouseId: warehouseId,
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
        
        // Actualizar stock del producto en la bodega específica
        const stockChange = type === 'entry' ? quantity : -quantity;
        const stockResult = ProductService.updateStock(entryData.productId, stockChange, warehouseId);
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
     * Crea un traslado entre bodegas
     */
    createTransfer(transferData) {
        const data = db.readJSON('inventory.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        // Validaciones
        if (!transferData.productId) {
            return { success: false, message: 'Debe seleccionar un producto' };
        }
        
        if (!transferData.fromWarehouseId) {
            return { success: false, message: 'Debe seleccionar la bodega de origen' };
        }
        
        if (!transferData.toWarehouseId) {
            return { success: false, message: 'Debe seleccionar la bodega de destino' };
        }
        
        if (transferData.fromWarehouseId === transferData.toWarehouseId) {
            return { success: false, message: 'La bodega de origen y destino no pueden ser la misma' };
        }
        
        const product = ProductService.getById(transferData.productId);
        if (!product) {
            return { success: false, message: 'Producto no encontrado' };
        }
        
        if (!db.isPositiveNumber(transferData.quantity) || parseFloat(transferData.quantity) <= 0) {
            return { success: false, message: 'La cantidad debe ser un número positivo mayor a 0' };
        }
        
        if (!db.isValidQuantity(transferData.quantity)) {
            return { success: false, message: 'La cantidad solo puede tener .5 como decimal (ej: 10, 10.5)' };
        }
        
        const quantity = parseFloat(transferData.quantity);
        const fromWarehouseId = parseInt(transferData.fromWarehouseId);
        const toWarehouseId = parseInt(transferData.toWarehouseId);
        
        // Verificar stock en bodega origen
        const stockInOrigin = ProductService.getStockByWarehouse(transferData.productId, fromWarehouseId);
        if (stockInOrigin < quantity) {
            return { 
                success: false, 
                message: `Stock insuficiente en bodega origen. Disponible: ${stockInOrigin}` 
            };
        }
        
        // Verificar que las bodegas existan
        const warehousesData = db.readJSON('warehouses.json');
        const warehouses = warehousesData ? warehousesData.warehouses : [];
        const fromWarehouse = warehouses.find(w => w.id === fromWarehouseId);
        const toWarehouse = warehouses.find(w => w.id === toWarehouseId);
        
        if (!fromWarehouse) {
            return { success: false, message: 'La bodega de origen no existe' };
        }
        if (!toWarehouse) {
            return { success: false, message: 'La bodega de destino no existe' };
        }
        
        // Realizar el traslado de stock
        const transferResult = ProductService.transferStock(
            transferData.productId,
            fromWarehouseId,
            toWarehouseId,
            quantity
        );
        
        if (!transferResult.success) {
            return { success: false, message: `Error al realizar traslado: ${transferResult.message}` };
        }
        
        // Generar referencia: T para traslado
        const reference = db.generateReference('T');
        
        const newTransfer = {
            id: reference,
            reference,
            type: 'transfer',
            productId: parseInt(transferData.productId),
            quantity: quantity,
            fromWarehouseId: fromWarehouseId,
            toWarehouseId: toWarehouseId,
            date: transferData.date || db.getCurrentDate(),
            note: transferData.note ? transferData.note.substring(0, 200) : '',
            createdAt: db.getCurrentDateTime()
        };
        
        data.entries.push(newTransfer);
        
        if (!db.writeJSON('inventory.json', data)) {
            return { success: false, message: 'Error al guardar el traslado' };
        }
        
        return { success: true, entry: newTransfer };
    },
    
    /**
     * Elimina un movimiento de inventario (entrada, salida o traslado)
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
            // Para entradas: verificar que el stock actual en la bodega permita restar
            const warehouseId = entry.warehouseId;
            const stockInWarehouse = warehouseId ? ProductService.getStockByWarehouse(entry.productId, warehouseId) : (product ? product.stock : 0);
            
            if (stockInWarehouse < entry.quantity) {
                return { 
                    success: false, 
                    message: `No se puede eliminar. El stock actual (${stockInWarehouse}) es menor a la cantidad de entrada (${entry.quantity})` 
                };
            }
            // Revertir: restar del stock
            if (product) {
                ProductService.updateStock(entry.productId, -entry.quantity, warehouseId);
            }
        } else if (type === 'exit') {
            // Para salidas: revertir sumando al stock
            if (product) {
                ProductService.updateStock(entry.productId, entry.quantity, entry.warehouseId);
            }
        } else if (type === 'transfer') {
            // Para traslados: revertir el traslado
            if (product) {
                ProductService.transferStock(
                    entry.productId,
                    entry.toWarehouseId,   // De destino
                    entry.fromWarehouseId, // A origen
                    entry.quantity
                );
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
    getStats(startDate, endDate, warehouseId = null) {
        let all = this.getAll().filter(e => {
            return e.date >= startDate && e.date <= endDate;
        });
        
        // Filtrar por bodega si se especifica
        if (warehouseId) {
            const wId = parseInt(warehouseId);
            all = all.filter(e => 
                e.warehouseId === wId || 
                e.fromWarehouseId === wId || 
                e.toWarehouseId === wId
            );
        }
        
        const entries = all.filter(e => (e.type || 'entry') === 'entry');
        const exits = all.filter(e => e.type === 'exit');
        const transfers = all.filter(e => e.type === 'transfer');
        
        const totalEntries = entries.reduce((sum, e) => sum + e.quantity, 0);
        const totalExits = exits.reduce((sum, e) => sum + e.quantity, 0);
        const totalTransfers = transfers.reduce((sum, e) => sum + e.quantity, 0);
        
        return {
            totalEntries,
            totalExits,
            totalTransfers,
            entriesCount: entries.length,
            exitsCount: exits.length,
            transfersCount: transfers.length,
            netChange: totalEntries - totalExits
        };
    }
};

module.exports = InventoryService;
