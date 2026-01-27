const db = require('../utils/database');

/**
 * Servicio de categorías
 */
const CategoryService = {
    /**
     * Obtiene todas las categorías
     */
    getAll() {
        const data = db.readJSON('categories.json');
        if (!data) return [];
        return data.categories;
    },
    
    /**
     * Obtiene una categoría por ID
     */
    getById(id) {
        const categories = this.getAll();
        return categories.find(c => c.id === parseInt(id));
    },
    
    /**
     * Crea una nueva categoría
     */
    create(categoryData) {
        const data = db.readJSON('categories.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        if (!categoryData.name || categoryData.name.trim() === '') {
            return { success: false, message: 'El nombre de la categoría es requerido' };
        }
        
        // Verificar si ya existe
        const exists = data.categories.some(
            c => c.name.toLowerCase() === categoryData.name.trim().toLowerCase()
        );
        
        if (exists) {
            return { success: false, message: 'Ya existe una categoría con ese nombre' };
        }
        
        data.lastId++;
        
        const newCategory = {
            id: data.lastId,
            name: categoryData.name.trim(),
            createdAt: db.getCurrentDateTime()
        };
        
        data.categories.push(newCategory);
        
        if (!db.writeJSON('categories.json', data)) {
            return { success: false, message: 'Error al guardar la categoría' };
        }
        
        return { success: true, category: newCategory };
    },
    
    /**
     * Actualiza una categoría
     */
    update(id, categoryData) {
        const data = db.readJSON('categories.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.categories.findIndex(c => c.id === parseInt(id));
        if (index === -1) {
            return { success: false, message: 'Categoría no encontrada' };
        }
        
        if (!categoryData.name || categoryData.name.trim() === '') {
            return { success: false, message: 'El nombre de la categoría es requerido' };
        }
        
        // Verificar duplicados excluyendo la actual
        const exists = data.categories.some(
            c => c.id !== parseInt(id) && c.name.toLowerCase() === categoryData.name.trim().toLowerCase()
        );
        
        if (exists) {
            return { success: false, message: 'Ya existe una categoría con ese nombre' };
        }
        
        data.categories[index].name = categoryData.name.trim();
        
        if (!db.writeJSON('categories.json', data)) {
            return { success: false, message: 'Error al actualizar la categoría' };
        }
        
        return { success: true, category: data.categories[index] };
    },
    
    /**
     * Elimina una categoría
     */
    delete(id) {
        const data = db.readJSON('categories.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        // No permitir eliminar la categoría por defecto
        if (parseInt(id) === 1) {
            return { success: false, message: 'No se puede eliminar la categoría General' };
        }
        
        const index = data.categories.findIndex(c => c.id === parseInt(id));
        if (index === -1) {
            return { success: false, message: 'Categoría no encontrada' };
        }
        
        // Verificar si hay productos usando esta categoría
        const productsData = db.readJSON('products.json');
        if (productsData) {
            const hasProducts = productsData.products.some(p => p.categoryId === parseInt(id));
            if (hasProducts) {
                return { success: false, message: 'No se puede eliminar. Hay productos en esta categoría' };
            }
        }
        
        data.categories.splice(index, 1);
        
        if (!db.writeJSON('categories.json', data)) {
            return { success: false, message: 'Error al eliminar la categoría' };
        }
        
        return { success: true, message: 'Categoría eliminada correctamente' };
    }
};

module.exports = CategoryService;
