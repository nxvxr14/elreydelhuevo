const CategoryService = require('../services/categoryService');

/**
 * Controlador de categorías
 */
const CategoryController = {
    /**
     * Obtiene todas las categorías
     */
    getAll(req, res) {
        const categories = CategoryService.getAll();
        return res.json({
            success: true,
            categories
        });
    },
    
    /**
     * Obtiene una categoría por ID
     */
    getById(req, res) {
        const { id } = req.params;
        const category = CategoryService.getById(id);
        
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Categoría no encontrada'
            });
        }
        
        return res.json({
            success: true,
            category
        });
    },
    
    /**
     * Crea una nueva categoría
     */
    create(req, res) {
        const result = CategoryService.create(req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.status(201).json(result);
    },
    
    /**
     * Actualiza una categoría
     */
    update(req, res) {
        const { id } = req.params;
        const result = CategoryService.update(id, req.body);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.json(result);
    },
    
    /**
     * Elimina una categoría
     */
    delete(req, res) {
        const { id } = req.params;
        const result = CategoryService.delete(id);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        return res.json(result);
    }
};

module.exports = CategoryController;
