const ProductService = require('../services/productService');
const CategoryService = require('../services/categoryService');

/**
 * Controlador de productos
 */
const ProductController = {
    /**
     * Obtiene todos los productos
     */
    getAll(req, res) {
        const products = ProductService.getAll();
        const categories = CategoryService.getAll();
        
        // Agregar nombre de categoría a cada producto
        const productsWithCategory = products.map(p => {
            const category = categories.find(c => c.id === p.categoryId);
            return {
                ...p,
                categoryName: category ? category.name : 'Sin categoría'
            };
        });
        
        return res.json({
            success: true,
            products: productsWithCategory
        });
    },
    
    /**
     * Obtiene un producto por ID
     */
    getById(req, res) {
        const { id } = req.params;
        const product = ProductService.getById(id);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        const category = CategoryService.getById(product.categoryId);
        
        return res.json({
            success: true,
            product: {
                ...product,
                categoryName: category ? category.name : 'Sin categoría'
            }
        });
    },
    
    /**
     * Crea un nuevo producto
     */
    create(req, res) {
        const result = ProductService.create(req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.status(201).json(result);
    },
    
    /**
     * Actualiza un producto
     */
    update(req, res) {
        const { id } = req.params;
        const result = ProductService.update(id, req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.json(result);
    },
    
    /**
     * Elimina un producto
     */
    delete(req, res) {
        const { id } = req.params;
        const result = ProductService.delete(id);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.json(result);
    },
    
    /**
     * Verifica stock de un producto (opcional por bodega: ?warehouseId=1)
     */
    checkStock(req, res) {
        const { id } = req.params;
        const { quantity, warehouseId } = req.query;
        const qty = parseInt(quantity) || 1;
        const whId = warehouseId ? parseInt(warehouseId) : null;
        
        const result = ProductService.checkStock(id, qty, whId);
        return res.json(result);
    }
};

module.exports = ProductController;
