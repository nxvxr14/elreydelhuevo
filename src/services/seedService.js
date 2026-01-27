const db = require('../utils/database');

/**
 * Servicio para gestionar datos de ejemplo
 */
const SeedService = {
    /**
     * Genera datos de ejemplo
     */
    loadSampleData() {
        try {
            // Primero limpiar datos existentes
            this.clearAllData();
            
            // Cargar categorías
            const categories = this._generateCategories();
            db.writeJSON('categories.json', categories);
            
            // Cargar productos
            const products = this._generateProducts();
            db.writeJSON('products.json', products);
            
            // Cargar clientes
            const clients = this._generateClients();
            db.writeJSON('clients.json', clients);
            
            // Cargar ventas (últimos 30 días)
            const sales = this._generateSales(products, clients);
            db.writeJSON('sales.json', sales);
            
            // Actualizar stock después de ventas
            this._updateProductStock(products, sales);
            db.writeJSON('products.json', products);
            
            // Cargar gastos
            const expenses = this._generateExpenses();
            db.writeJSON('expenses.json', expenses);
            
            // Cargar entradas de inventario
            const inventory = this._generateInventory(products);
            db.writeJSON('inventory.json', inventory);
            
            // Resetear caja
            const cashRegisters = {
                cashRegisters: [],
                currentRegister: null
            };
            db.writeJSON('cashRegisters.json', cashRegisters);
            
            return { 
                success: true, 
                message: 'Datos de ejemplo cargados correctamente',
                summary: {
                    categories: categories.categories.length,
                    products: products.products.length,
                    clients: clients.clients.length,
                    sales: sales.sales.length,
                    expenses: expenses.expenses.length,
                    inventory: inventory.entries.length
                }
            };
        } catch (error) {
            console.error('Error al cargar datos de ejemplo:', error);
            return { success: false, message: 'Error al cargar datos de ejemplo: ' + error.message };
        }
    },
    
    /**
     * Limpia todos los datos (excepto usuarios)
     */
    clearAllData() {
        try {
            // Resetear categorías (mantener "General")
            db.writeJSON('categories.json', {
                categories: [
                    {
                        id: 1,
                        name: 'General',
                        createdAt: '2024-01-01T00:00:00.000Z'
                    }
                ],
                lastId: 1
            });
            
            // Resetear productos
            db.writeJSON('products.json', {
                products: [],
                lastId: 0
            });
            
            // Resetear clientes
            db.writeJSON('clients.json', {
                clients: [],
                lastId: 0
            });
            
            // Resetear ventas
            db.writeJSON('sales.json', {
                sales: []
            });
            
            // Resetear gastos
            db.writeJSON('expenses.json', {
                expenses: []
            });
            
            // Resetear inventario
            db.writeJSON('inventory.json', {
                entries: []
            });
            
            // Resetear caja
            db.writeJSON('cashRegisters.json', {
                cashRegisters: [],
                currentRegister: null
            });
            
            return { success: true, message: 'Todos los datos han sido eliminados' };
        } catch (error) {
            console.error('Error al limpiar datos:', error);
            return { success: false, message: 'Error al limpiar datos: ' + error.message };
        }
    },
    
    /**
     * Verifica si hay datos de ejemplo cargados
     */
    hasSampleData() {
        const products = db.readJSON('products.json');
        const sales = db.readJSON('sales.json');
        
        return products && products.products.length > 0 || 
               sales && sales.sales.length > 0;
    },
    
    /**
     * Genera categorías de ejemplo
     */
    _generateCategories() {
        return {
            categories: [
                { id: 1, name: 'General', createdAt: '2024-01-01T00:00:00.000Z' },
                { id: 2, name: 'Huevos', createdAt: db.getCurrentDateTime() },
                { id: 3, name: 'Aves', createdAt: db.getCurrentDateTime() },
                { id: 4, name: 'Alimentos', createdAt: db.getCurrentDateTime() },
                { id: 5, name: 'Accesorios', createdAt: db.getCurrentDateTime() }
            ],
            lastId: 5
        };
    },
    
    /**
     * Genera productos de ejemplo
     */
    _generateProducts() {
        const now = db.getCurrentDateTime();
        return {
            products: [
                // Huevos (precios en pesos colombianos)
                { id: 1, name: 'Huevo Blanco Grande (30 pzas)', categoryId: 2, price: 18000, stock: 150, createdAt: now, updatedAt: now },
                { id: 2, name: 'Huevo Blanco Mediano (30 pzas)', categoryId: 2, price: 15000, stock: 120, createdAt: now, updatedAt: now },
                { id: 3, name: 'Huevo Rojo Grande (30 pzas)', categoryId: 2, price: 20000, stock: 80, createdAt: now, updatedAt: now },
                { id: 4, name: 'Huevo Rojo Mediano (30 pzas)', categoryId: 2, price: 17000, stock: 60, createdAt: now, updatedAt: now },
                { id: 5, name: 'Huevo Jumbo (30 pzas)', categoryId: 2, price: 22000, stock: 45, createdAt: now, updatedAt: now },
                { id: 6, name: 'Huevo Orgánico (12 pzas)', categoryId: 2, price: 12000, stock: 30, createdAt: now, updatedAt: now },
                
                // Aves
                { id: 7, name: 'Gallina Ponedora', categoryId: 3, price: 45000, stock: 25, createdAt: now, updatedAt: now },
                { id: 8, name: 'Pollo de Engorda (vivo)', categoryId: 3, price: 28000, stock: 40, createdAt: now, updatedAt: now },
                { id: 9, name: 'Pollitos (10 pzas)', categoryId: 3, price: 35000, stock: 15, createdAt: now, updatedAt: now },
                
                // Alimentos
                { id: 10, name: 'Alimento Ponedoras (40kg)', categoryId: 4, price: 95000, stock: 20, createdAt: now, updatedAt: now },
                { id: 11, name: 'Alimento Pollos (40kg)', categoryId: 4, price: 85000, stock: 25, createdAt: now, updatedAt: now },
                { id: 12, name: 'Maíz Molido (25kg)', categoryId: 4, price: 42000, stock: 35, createdAt: now, updatedAt: now },
                { id: 13, name: 'Suplemento Vitamínico', categoryId: 4, price: 25000, stock: 50, createdAt: now, updatedAt: now },
                
                // Accesorios
                { id: 14, name: 'Bebedero Automático', categoryId: 5, price: 65000, stock: 12, createdAt: now, updatedAt: now },
                { id: 15, name: 'Comedero Grande', categoryId: 5, price: 48000, stock: 18, createdAt: now, updatedAt: now },
                { id: 16, name: 'Lámpara Calefactora', categoryId: 5, price: 85000, stock: 8, createdAt: now, updatedAt: now },
                { id: 17, name: 'Nido para Ponedoras', categoryId: 5, price: 38000, stock: 20, createdAt: now, updatedAt: now }
            ],
            lastId: 17
        };
    },
    
    /**
     * Genera clientes de ejemplo
     */
    _generateClients() {
        const now = db.getCurrentDateTime();
        return {
            clients: [
                { id: 1, name: 'Público General', phone: '', email: '', address: '', createdAt: now },
                { id: 2, name: 'María García', phone: '555-1234', email: 'maria@email.com', address: 'Calle Principal 123', createdAt: now },
                { id: 3, name: 'Juan Pérez', phone: '555-5678', email: 'juan@email.com', address: 'Av. Central 456', createdAt: now },
                { id: 4, name: 'Tienda La Esquina', phone: '555-9012', email: 'laesquina@email.com', address: 'Mercado Municipal Local 12', createdAt: now },
                { id: 5, name: 'Restaurant El Buen Sabor', phone: '555-3456', email: 'buensabor@email.com', address: 'Plaza Mayor 78', createdAt: now },
                { id: 6, name: 'Panadería San José', phone: '555-7890', email: 'sanjose@email.com', address: 'Calle Hidalgo 90', createdAt: now },
                { id: 7, name: 'Roberto Martínez', phone: '555-2468', email: '', address: 'Col. Centro', createdAt: now },
                { id: 8, name: 'Ana López', phone: '555-1357', email: 'ana@email.com', address: 'Fracc. Las Flores 45', createdAt: now }
            ],
            lastId: 8
        };
    },
    
    /**
     * Genera ventas de ejemplo (últimos 30 días)
     */
    _generateSales(productsData, clientsData) {
        const sales = [];
        const today = new Date();
        
        // Productos más vendidos (huevos principalmente)
        const popularProducts = [1, 2, 3, 4, 5];
        const allProductIds = productsData.products.map(p => p.id);
        
        // Generar entre 3-8 ventas por día durante los últimos 30 días
        for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
            const date = new Date(today);
            date.setDate(date.getDate() - daysAgo);
            const dateStr = date.toISOString().split('T')[0];
            
            const salesForDay = Math.floor(Math.random() * 6) + 3; // 3-8 ventas
            
            for (let s = 0; s < salesForDay; s++) {
                const clientId = clientsData.clients[Math.floor(Math.random() * clientsData.clients.length)].id;
                const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
                const items = [];
                let total = 0;
                
                const usedProducts = new Set();
                for (let i = 0; i < numItems; i++) {
                    // 70% probabilidad de producto popular
                    let productId;
                    if (Math.random() < 0.7) {
                        productId = popularProducts[Math.floor(Math.random() * popularProducts.length)];
                    } else {
                        productId = allProductIds[Math.floor(Math.random() * allProductIds.length)];
                    }
                    
                    if (usedProducts.has(productId)) continue;
                    usedProducts.add(productId);
                    
                    const product = productsData.products.find(p => p.id === productId);
                    const quantity = Math.floor(Math.random() * 5) + 1;
                    const unitPrice = product.price;
                    const subtotal = quantity * unitPrice;
                    total += subtotal;
                    
                    items.push({
                        productId,
                        quantity,
                        unitPrice,
                        subtotal: Math.round(subtotal)
                    });
                }
                
                if (items.length === 0) continue;
                
                const reference = `V${Date.now()}${Math.floor(1000 + Math.random() * 9000)}${s}`;
                const received = Math.ceil(total / 1000) * 1000; // Redondear al siguiente mil
                
                sales.push({
                    id: reference,
                    reference,
                    clientId,
                    items,
                    total: Math.round(total),
                    received,
                    change: received - Math.round(total),
                    note: '',
                    date: dateStr,
                    createdAt: date.toISOString()
                });
            }
        }
        
        return { sales };
    },
    
    /**
     * Actualiza el stock de productos basado en ventas
     */
    _updateProductStock(productsData, salesData) {
        // Restar stock por cada venta
        for (const sale of salesData.sales) {
            for (const item of sale.items) {
                const product = productsData.products.find(p => p.id === item.productId);
                if (product) {
                    product.stock = Math.max(0, product.stock - item.quantity);
                }
            }
        }
        
        // Asegurar que hay stock mínimo
        for (const product of productsData.products) {
            if (product.stock < 10) {
                product.stock += Math.floor(Math.random() * 30) + 20;
            }
        }
    },
    
    /**
     * Genera gastos de ejemplo
     */
    _generateExpenses() {
        const expenses = [];
        const today = new Date();
        
        const expenseTypes = [
            { description: 'Compra de alimento para aves', minAmount: 450000, maxAmount: 1200000 },
            { description: 'Pago de luz', minAmount: 180000, maxAmount: 350000 },
            { description: 'Pago de agua', minAmount: 45000, maxAmount: 95000 },
            { description: 'Combustible para transporte', minAmount: 120000, maxAmount: 280000 },
            { description: 'Mantenimiento de equipo', minAmount: 80000, maxAmount: 200000 },
            { description: 'Compra de vitaminas', minAmount: 95000, maxAmount: 220000 },
            { description: 'Reparaciones menores', minAmount: 35000, maxAmount: 120000 },
            { description: 'Limpieza y desinfección', minAmount: 50000, maxAmount: 100000 },
            { description: 'Compra de empaques', minAmount: 75000, maxAmount: 150000 }
        ];
        
        // Generar gastos para los últimos 30 días
        for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
            // 50% probabilidad de tener gasto ese día
            if (Math.random() < 0.5) {
                const date = new Date(today);
                date.setDate(date.getDate() - daysAgo);
                const dateStr = date.toISOString().split('T')[0];
                
                const expenseType = expenseTypes[Math.floor(Math.random() * expenseTypes.length)];
                const amount = Math.floor(Math.random() * (expenseType.maxAmount - expenseType.minAmount)) + expenseType.minAmount;
                
                const reference = `G${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
                
                expenses.push({
                    id: reference,
                    reference,
                    description: expenseType.description,
                    amount: Math.round(amount),
                    note: '',
                    date: dateStr,
                    createdAt: date.toISOString()
                });
            }
        }
        
        return { expenses };
    },
    
    /**
     * Genera entradas de inventario de ejemplo
     */
    _generateInventory(productsData) {
        const entries = [];
        const today = new Date();
        
        // Generar entradas de inventario para los últimos 30 días
        for (let daysAgo = 28; daysAgo >= 0; daysAgo -= 7) {
            const date = new Date(today);
            date.setDate(date.getDate() - daysAgo);
            const dateStr = date.toISOString().split('T')[0];
            
            // 3-5 productos por entrada
            const numProducts = Math.floor(Math.random() * 3) + 3;
            const usedProducts = new Set();
            
            for (let i = 0; i < numProducts; i++) {
                const product = productsData.products[Math.floor(Math.random() * productsData.products.length)];
                if (usedProducts.has(product.id)) continue;
                usedProducts.add(product.id);
                
                const quantity = Math.floor(Math.random() * 50) + 20;
                const reference = `I${Date.now()}${Math.floor(1000 + Math.random() * 9000)}${i}`;
                
                entries.push({
                    id: reference,
                    reference,
                    productId: product.id,
                    quantity,
                    note: 'Reposición de inventario',
                    date: dateStr,
                    createdAt: date.toISOString()
                });
            }
        }
        
        return { entries };
    }
};

module.exports = SeedService;
