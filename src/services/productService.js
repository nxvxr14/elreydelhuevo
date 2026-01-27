const db = require('../utils/database');

/**
 * Servicio de productos
 */
const ProductService = {
    /**
     * Obtiene todos los productos
     */
    getAll() {
        const data = db.readJSON('products.json');
        if (!data) return [];
        return data.products;
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
        
        // Incrementar ID
        data.lastId++;
        
        const newProduct = {
            id: data.lastId,
            name: productData.name.trim(),
            categoryId: parseInt(productData.categoryId) || 1,
            price: parseFloat(productData.price),
            stock: parseInt(productData.stock) || 0,
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
        
        if (productData.stock !== undefined && !db.isPositiveNumber(productData.stock)) {
            return { success: false, message: 'El stock debe ser un número positivo' };
        }
        
        // Actualizar campos
        if (productData.name !== undefined) {
            data.products[index].name = productData.name.trim();
        }
        if (productData.categoryId !== undefined) {
            data.products[index].categoryId = parseInt(productData.categoryId);
        }
        if (productData.price !== undefined) {
            data.products[index].price = parseFloat(productData.price);
        }
        if (productData.stock !== undefined) {
            data.products[index].stock = parseInt(productData.stock);
        }
        
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
     * Actualiza el stock de un producto
     */
    updateStock(id, quantity) {
        const data = db.readJSON('products.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.products.findIndex(p => p.id === parseInt(id));
        if (index === -1) {
            return { success: false, message: 'Producto no encontrado' };
        }
        
        const newStock = data.products[index].stock + quantity;
        
        if (newStock < 0) {
            return { success: false, message: 'Stock insuficiente' };
        }
        
        data.products[index].stock = newStock;
        data.products[index].updatedAt = db.getCurrentDateTime();
        
        if (!db.writeJSON('products.json', data)) {
            return { success: false, message: 'Error al actualizar el stock' };
        }
        
        return { success: true, product: data.products[index] };
    },
    
    /**
     * Verifica si hay stock disponible
     */
    checkStock(id, quantity) {
        const product = this.getById(id);
        if (!product) {
            return { available: false, message: 'Producto no encontrado' };
        }
        
        if (product.stock < quantity) {
            return { 
                available: false, 
                message: `Stock insuficiente. Disponible: ${product.stock}`,
                currentStock: product.stock
            };
        }
        
        return { available: true, currentStock: product.stock };
    }
};

module.exports = ProductService;
