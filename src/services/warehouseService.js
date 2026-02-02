const db = require('../utils/database');

/**
 * Servicio de bodegas
 */
const WarehouseService = {
    /**
     * Obtiene todas las bodegas
     */
    getAll() {
        const data = db.readJSON('warehouses.json');
        if (!data) return [];
        return data.warehouses;
    },
    
    /**
     * Obtiene una bodega por ID
     */
    getById(id) {
        const warehouses = this.getAll();
        return warehouses.find(w => w.id === parseInt(id));
    },
    
    /**
     * Obtiene la bodega por defecto
     */
    getDefault() {
        const warehouses = this.getAll();
        return warehouses.find(w => w.isDefault) || warehouses[0];
    },
    
    /**
     * Crea una nueva bodega
     */
    create(warehouseData) {
        const data = db.readJSON('warehouses.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        // Validaciones
        if (!warehouseData.name || warehouseData.name.trim() === '') {
            return { success: false, message: 'El nombre de la bodega es requerido' };
        }
        
        // Verificar nombre único
        const exists = data.warehouses.some(w => 
            w.name.toLowerCase() === warehouseData.name.trim().toLowerCase()
        );
        if (exists) {
            return { success: false, message: 'Ya existe una bodega con ese nombre' };
        }
        
        data.lastId++;
        
        const newWarehouse = {
            id: data.lastId,
            name: warehouseData.name.trim(),
            description: warehouseData.description ? warehouseData.description.trim() : '',
            isDefault: false,
            createdAt: db.getCurrentDateTime(),
            updatedAt: db.getCurrentDateTime()
        };
        
        data.warehouses.push(newWarehouse);
        
        if (!db.writeJSON('warehouses.json', data)) {
            return { success: false, message: 'Error al guardar la bodega' };
        }
        
        return { success: true, warehouse: newWarehouse };
    },
    
    /**
     * Actualiza una bodega
     */
    update(id, warehouseData) {
        const data = db.readJSON('warehouses.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.warehouses.findIndex(w => w.id === parseInt(id));
        if (index === -1) {
            return { success: false, message: 'Bodega no encontrada' };
        }
        
        // Validaciones
        if (warehouseData.name !== undefined && warehouseData.name.trim() === '') {
            return { success: false, message: 'El nombre de la bodega es requerido' };
        }
        
        // Verificar nombre único (excluyendo la bodega actual)
        if (warehouseData.name) {
            const exists = data.warehouses.some(w => 
                w.id !== parseInt(id) && 
                w.name.toLowerCase() === warehouseData.name.trim().toLowerCase()
            );
            if (exists) {
                return { success: false, message: 'Ya existe una bodega con ese nombre' };
            }
        }
        
        // Actualizar campos
        if (warehouseData.name !== undefined) {
            data.warehouses[index].name = warehouseData.name.trim();
        }
        if (warehouseData.description !== undefined) {
            data.warehouses[index].description = warehouseData.description.trim();
        }
        
        data.warehouses[index].updatedAt = db.getCurrentDateTime();
        
        if (!db.writeJSON('warehouses.json', data)) {
            return { success: false, message: 'Error al actualizar la bodega' };
        }
        
        return { success: true, warehouse: data.warehouses[index] };
    },
    
    /**
     * Elimina una bodega
     */
    delete(id) {
        const data = db.readJSON('warehouses.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const warehouse = data.warehouses.find(w => w.id === parseInt(id));
        if (!warehouse) {
            return { success: false, message: 'Bodega no encontrada' };
        }
        
        // No permitir eliminar la bodega por defecto
        if (warehouse.isDefault) {
            return { success: false, message: 'No se puede eliminar la bodega por defecto' };
        }
        
        // Verificar que no haya productos con stock en esta bodega
        const productsData = db.readJSON('products.json');
        if (productsData) {
            const productsInWarehouse = productsData.products.filter(p => {
                if (!p.warehouseStock) return false;
                const stock = p.warehouseStock[id];
                return stock && stock > 0;
            });
            
            if (productsInWarehouse.length > 0) {
                return { 
                    success: false, 
                    message: `No se puede eliminar. Hay ${productsInWarehouse.length} producto(s) con stock en esta bodega` 
                };
            }
        }
        
        const index = data.warehouses.findIndex(w => w.id === parseInt(id));
        data.warehouses.splice(index, 1);
        
        if (!db.writeJSON('warehouses.json', data)) {
            return { success: false, message: 'Error al eliminar la bodega' };
        }
        
        return { success: true, message: 'Bodega eliminada correctamente' };
    },
    
    /**
     * Obtiene el stock total de una bodega
     */
    getTotalStock(warehouseId) {
        const productsData = db.readJSON('products.json');
        if (!productsData) return 0;
        
        let total = 0;
        productsData.products.forEach(product => {
            if (product.warehouseStock && product.warehouseStock[warehouseId]) {
                total += product.warehouseStock[warehouseId];
            }
        });
        
        return total;
    },
    
    /**
     * Obtiene los productos y cantidades de una bodega
     */
    getProducts(warehouseId) {
        const productsData = db.readJSON('products.json');
        const categoriesData = db.readJSON('categories.json');
        
        if (!productsData) return [];
        
        const categories = categoriesData ? categoriesData.categories : [];
        
        return productsData.products
            .filter(product => {
                if (!product.warehouseStock) return false;
                const stock = product.warehouseStock[warehouseId];
                return stock !== undefined;
            })
            .map(product => {
                const category = categories.find(c => c.id === product.categoryId);
                return {
                    id: product.id,
                    name: product.name,
                    categoryName: category ? category.name : 'Sin categoría',
                    stock: product.warehouseStock[warehouseId] || 0,
                    price: product.price
                };
            });
    },
    
    /**
     * Obtiene todas las bodegas con su stock total
     */
    getAllWithStock() {
        const warehouses = this.getAll();
        return warehouses.map(warehouse => ({
            ...warehouse,
            totalStock: this.getTotalStock(warehouse.id)
        }));
    }
};

module.exports = WarehouseService;
