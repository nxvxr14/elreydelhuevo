const db = require('../utils/database');

/**
 * Servicio de productos con soporte para bodegas
 */
const ProductService = {
    /**
     * Obtiene todas las bodegas
     */
    getWarehouses() {
        const data = db.readJSON('warehouses.json');
        return data ? data.warehouses : [];
    },
    
    /**
     * Obtiene la bodega por defecto
     */
    getDefaultWarehouse() {
        const warehouses = this.getWarehouses();
        return warehouses.find(w => w.isDefault) || warehouses[0];
    },
    
    /**
     * Obtiene todos los productos
     */
    getAll() {
        const data = db.readJSON('products.json');
        if (!data) return [];
        return data.products;
    },
    
    /**
     * Obtiene todos los productos con información de categoría
     */
    getAllWithDetails() {
        const products = this.getAll();
        const categoriesData = db.readJSON('categories.json');
        const warehousesData = db.readJSON('warehouses.json');
        const categories = categoriesData ? categoriesData.categories : [];
        const warehouses = warehousesData ? warehousesData.warehouses : [];
        
        return products.map(product => {
            const category = categories.find(c => c.id === product.categoryId);
            
            // Calcular stock total de todas las bodegas
            let totalStock = product.stock || 0;
            if (product.warehouseStock) {
                totalStock = Object.values(product.warehouseStock).reduce((sum, s) => sum + s, 0);
            }
            
            // Información de bodega principal (donde tiene más stock)
            let mainWarehouse = null;
            if (product.warehouseStock) {
                const warehouseEntries = Object.entries(product.warehouseStock);
                if (warehouseEntries.length > 0) {
                    const maxEntry = warehouseEntries.reduce((max, curr) => 
                        curr[1] > max[1] ? curr : max
                    );
                    const warehouse = warehouses.find(w => w.id === parseInt(maxEntry[0]));
                    mainWarehouse = warehouse ? warehouse.name : null;
                }
            }
            
            return {
                ...product,
                categoryName: category ? category.name : 'Sin categoría',
                stock: totalStock,
                mainWarehouse
            };
        });
    },
    
    /**
     * Obtiene productos filtrados por bodega
     */
    getByWarehouse(warehouseId) {
        const products = this.getAllWithDetails();
        return products.filter(p => {
            if (!p.warehouseStock) return false;
            return p.warehouseStock[warehouseId] !== undefined && p.warehouseStock[warehouseId] > 0;
        }).map(p => ({
            ...p,
            stock: p.warehouseStock[warehouseId] || 0
        }));
    },
    
    /**
     * Obtiene un producto por ID
     */
    getById(id) {
        const products = this.getAll();
        return products.find(p => p.id === parseInt(id));
    },
    
    /**
     * Crea un nuevo producto
     */
    create(productData) {
        const data = db.readJSON('products.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        // Validaciones
        if (!productData.name || productData.name.trim() === '') {
            return { success: false, message: 'El nombre del producto es requerido' };
        }
        
        if (!db.isPositiveNumber(productData.price)) {
            return { success: false, message: 'El precio debe ser un número positivo' };
        }
        
        if (!db.isPositiveNumber(productData.stock)) {
            return { success: false, message: 'El stock debe ser un número positivo' };
        }
        
        if (!db.isValidQuantity(productData.stock)) {
            return { success: false, message: 'El stock solo puede tener .5 como decimal (ej: 10, 10.5)' };
        }
        
        // Obtener bodega (usar defecto si no se especifica)
        let warehouseId = productData.warehouseId ? parseInt(productData.warehouseId) : null;
        if (!warehouseId) {
            const defaultWarehouse = this.getDefaultWarehouse();
            warehouseId = defaultWarehouse ? defaultWarehouse.id : 1;
        }
        
        // Verificar que la bodega existe
        const warehouses = this.getWarehouses();
        const warehouse = warehouses.find(w => w.id === warehouseId);
        if (!warehouse) {
            return { success: false, message: 'La bodega seleccionada no existe' };
        }
        
        // Incrementar ID
        data.lastId++;
        
        const stockValue = parseFloat(productData.stock) || 0;
        
        const newProduct = {
            id: data.lastId,
            name: productData.name.trim(),
            categoryId: parseInt(productData.categoryId) || 1,
            price: parseFloat(productData.price),
            stock: stockValue, // Stock total
            warehouseStock: {
                [warehouseId]: stockValue // Stock por bodega
            },
            createdAt: db.getCurrentDateTime(),
            updatedAt: db.getCurrentDateTime()
        };
        
        data.products.push(newProduct);
        
        if (!db.writeJSON('products.json', data)) {
            return { success: false, message: 'Error al guardar el producto' };
        }
        
        return { success: true, product: newProduct };
    },
    
    /**
     * Actualiza un producto
     * NOTA: El stock NO se puede modificar desde aquí. Solo desde inventario (entradas/salidas).
     */
    update(id, productData) {
        const data = db.readJSON('products.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.products.findIndex(p => p.id === parseInt(id));
        if (index === -1) {
            return { success: false, message: 'Producto no encontrado' };
        }
        
        // Validaciones
        if (productData.name !== undefined && productData.name.trim() === '') {
            return { success: false, message: 'El nombre del producto es requerido' };
        }
        
        if (productData.price !== undefined && !db.isPositiveNumber(productData.price)) {
            return { success: false, message: 'El precio debe ser un número positivo' };
        }
        
        // NOTA: Ignorar cambios de stock y bodega en la edición de producto
        // El stock solo se modifica a través de inventario (entradas/salidas)
        
        // Actualizar campos (excepto stock y bodega)
        if (productData.name !== undefined) {
            data.products[index].name = productData.name.trim();
        }
        if (productData.categoryId !== undefined) {
            data.products[index].categoryId = parseInt(productData.categoryId);
        }
        if (productData.price !== undefined) {
            data.products[index].price = parseFloat(productData.price);
        }
        // Stock NO se actualiza aquí - solo desde inventario
        // Bodega NO se puede cambiar después de crear
        
        data.products[index].updatedAt = db.getCurrentDateTime();
        
        if (!db.writeJSON('products.json', data)) {
            return { success: false, message: 'Error al actualizar el producto' };
        }
        
        return { success: true, product: data.products[index] };
    },
    
    /**
     * Elimina un producto
     */
    delete(id) {
        const data = db.readJSON('products.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.products.findIndex(p => p.id === parseInt(id));
        if (index === -1) {
            return { success: false, message: 'Producto no encontrado' };
        }
        
        data.products.splice(index, 1);
        
        if (!db.writeJSON('products.json', data)) {
            return { success: false, message: 'Error al eliminar el producto' };
        }
        
        return { success: true, message: 'Producto eliminado correctamente' };
    },
    
    /**
     * Actualiza el stock de un producto en una bodega específica
     */
    updateStock(id, quantity, warehouseId = null) {
        const data = db.readJSON('products.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.products.findIndex(p => p.id === parseInt(id));
        if (index === -1) {
            return { success: false, message: 'Producto no encontrado' };
        }
        
        const product = data.products[index];
        
        // Si no se especifica bodega, usar la primera donde tenga stock o la defecto
        if (!warehouseId) {
            if (product.warehouseStock) {
                const warehouseIds = Object.keys(product.warehouseStock);
                warehouseId = warehouseIds.length > 0 ? parseInt(warehouseIds[0]) : null;
            }
            if (!warehouseId) {
                const defaultWarehouse = this.getDefaultWarehouse();
                warehouseId = defaultWarehouse ? defaultWarehouse.id : 1;
            }
        }
        
        // Inicializar warehouseStock si no existe
        if (!product.warehouseStock) {
            product.warehouseStock = {};
        }
        
        // Calcular nuevo stock para la bodega
        const currentWarehouseStock = product.warehouseStock[warehouseId] || 0;
        const newWarehouseStock = currentWarehouseStock + quantity;
        
        if (newWarehouseStock < 0) {
            return { 
                success: false, 
                message: `Stock insuficiente en bodega. Disponible: ${currentWarehouseStock}` 
            };
        }
        
        // Actualizar stock de la bodega
        product.warehouseStock[warehouseId] = newWarehouseStock;
        
        // Recalcular stock total
        product.stock = Object.values(product.warehouseStock).reduce((sum, s) => sum + s, 0);
        product.updatedAt = db.getCurrentDateTime();
        
        data.products[index] = product;
        
        if (!db.writeJSON('products.json', data)) {
            return { success: false, message: 'Error al actualizar el stock' };
        }
        
        return { success: true, product: data.products[index] };
    },
    
    /**
     * Traslada stock de una bodega a otra
     */
    transferStock(productId, fromWarehouseId, toWarehouseId, quantity) {
        const data = db.readJSON('products.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.products.findIndex(p => p.id === parseInt(productId));
        if (index === -1) {
            return { success: false, message: 'Producto no encontrado' };
        }
        
        const product = data.products[index];
        
        if (!product.warehouseStock) {
            product.warehouseStock = {};
        }
        
        const fromStock = product.warehouseStock[fromWarehouseId] || 0;
        
        if (fromStock < quantity) {
            return { 
                success: false, 
                message: `Stock insuficiente en bodega origen. Disponible: ${fromStock}` 
            };
        }
        
        // Realizar el traslado
        product.warehouseStock[fromWarehouseId] = fromStock - quantity;
        product.warehouseStock[toWarehouseId] = (product.warehouseStock[toWarehouseId] || 0) + quantity;
        
        // El stock total no cambia en un traslado
        product.updatedAt = db.getCurrentDateTime();
        
        data.products[index] = product;
        
        if (!db.writeJSON('products.json', data)) {
            return { success: false, message: 'Error al realizar el traslado' };
        }
        
        return { success: true, product: data.products[index] };
    },
    
    /**
     * Verifica si hay stock disponible en una bodega
     */
    checkStock(id, quantity, warehouseId = null) {
        const product = this.getById(id);
        if (!product) {
            return { available: false, message: 'Producto no encontrado' };
        }
        
        let availableStock = product.stock;
        
        if (warehouseId && product.warehouseStock) {
            availableStock = product.warehouseStock[warehouseId] || 0;
        }
        
        if (availableStock < quantity) {
            return { 
                available: false, 
                message: `Stock insuficiente. Disponible: ${availableStock}`,
                currentStock: availableStock
            };
        }
        
        return { available: true, currentStock: availableStock };
    },
    
    /**
     * Obtiene el stock de un producto en una bodega específica
     */
    getStockByWarehouse(productId, warehouseId) {
        const product = this.getById(productId);
        if (!product || !product.warehouseStock) return 0;
        return product.warehouseStock[warehouseId] || 0;
    }
};

module.exports = ProductService;
