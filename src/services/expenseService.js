const db = require('../utils/database');

/**
 * Servicio de gastos
 */
const ExpenseService = {
    /**
     * Obtiene todos los gastos
     */
    getAll() {
        const data = db.readJSON('expenses.json');
        if (!data) return [];
        return data.expenses;
    },
    
    /**
     * Obtiene gastos filtrados
     */
    getFiltered(filters = {}) {
        let expenses = this.getAll();
        
        if (filters.startDate) {
            expenses = expenses.filter(e => e.date >= filters.startDate);
        }
        
        if (filters.endDate) {
            expenses = expenses.filter(e => e.date <= filters.endDate);
        }
        
        return expenses;
    },
    
    /**
     * Obtiene un gasto por ID
     */
    getById(id) {
        const expenses = this.getAll();
        return expenses.find(e => e.id === id);
    },
    
    /**
     * Crea un nuevo gasto
     * @param {Object} expenseData - Datos del gasto
     * @param {string} source - Origen del gasto: 'pos' o 'dashboard'
     */
    create(expenseData, source = 'dashboard') {
        const data = db.readJSON('expenses.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        // Validaciones
        if (!expenseData.concept || expenseData.concept.trim() === '') {
            return { success: false, message: 'El concepto del gasto es requerido' };
        }
        
        if (!db.isPositiveNumber(expenseData.amount) || parseFloat(expenseData.amount) <= 0) {
            return { success: false, message: 'El monto debe ser un número positivo mayor a 0' };
        }
        
        if (expenseData.date && !db.isValidDate(expenseData.date)) {
            return { success: false, message: 'La fecha no es válida' };
        }
        
        // Generar referencia
        const reference = db.generateReference('G');
        
        const newExpense = {
            id: reference,
            reference,
            concept: expenseData.concept.trim(),
            amount: parseFloat(expenseData.amount),
            date: expenseData.date || db.getCurrentDate(),
            note: expenseData.note ? expenseData.note.substring(0, 200) : '',
            source: source, // 'pos' o 'dashboard'
            createdAt: db.getCurrentDateTime()
        };
        
        data.expenses.push(newExpense);
        
        if (!db.writeJSON('expenses.json', data)) {
            return { success: false, message: 'Error al guardar el gasto' };
        }
        
        return { success: true, expense: newExpense };
    },
    
    /**
     * Actualiza un gasto
     */
    update(id, expenseData) {
        const data = db.readJSON('expenses.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.expenses.findIndex(e => e.id === id);
        if (index === -1) {
            return { success: false, message: 'Gasto no encontrado' };
        }
        
        // Validaciones
        if (expenseData.concept !== undefined && expenseData.concept.trim() === '') {
            return { success: false, message: 'El concepto del gasto es requerido' };
        }
        
        if (expenseData.amount !== undefined) {
            if (!db.isPositiveNumber(expenseData.amount) || parseFloat(expenseData.amount) <= 0) {
                return { success: false, message: 'El monto debe ser un número positivo mayor a 0' };
            }
        }
        
        if (expenseData.date !== undefined && !db.isValidDate(expenseData.date)) {
            return { success: false, message: 'La fecha no es válida' };
        }
        
        // Actualizar campos
        if (expenseData.concept !== undefined) {
            data.expenses[index].concept = expenseData.concept.trim();
        }
        if (expenseData.amount !== undefined) {
            data.expenses[index].amount = parseFloat(expenseData.amount);
        }
        if (expenseData.date !== undefined) {
            data.expenses[index].date = expenseData.date;
        }
        if (expenseData.note !== undefined) {
            data.expenses[index].note = expenseData.note.substring(0, 200);
        }
        
        data.expenses[index].updatedAt = db.getCurrentDateTime();
        
        if (!db.writeJSON('expenses.json', data)) {
            return { success: false, message: 'Error al actualizar el gasto' };
        }
        
        return { success: true, expense: data.expenses[index] };
    },
    
    /**
     * Elimina un gasto
     */
    delete(id) {
        const data = db.readJSON('expenses.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const index = data.expenses.findIndex(e => e.id === id);
        if (index === -1) {
            return { success: false, message: 'Gasto no encontrado' };
        }
        
        data.expenses.splice(index, 1);
        
        if (!db.writeJSON('expenses.json', data)) {
            return { success: false, message: 'Error al eliminar el gasto' };
        }
        
        return { success: true, message: 'Gasto eliminado correctamente' };
    },
    
    /**
     * Obtiene estadísticas de gastos por rango de fechas
     * @param {string} startDate 
     * @param {string} endDate 
     * @param {string|null} source - Filtrar por origen: 'pos', 'dashboard' o null para todos
     */
    getStats(startDate, endDate, source = null) {
        let expenses = this.getAll().filter(e => {
            return e.date >= startDate && e.date <= endDate;
        });
        
        // Filtrar por origen si se especifica
        if (source) {
            expenses = expenses.filter(e => e.source === source);
        }
        
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const expensesCount = expenses.length;
        
        return {
            totalExpenses: Math.round(totalExpenses),
            expensesCount
        };
    },
    
    /**
     * Obtiene gastos agrupados por día
     */
    getByDay(startDate, endDate) {
        const expenses = this.getAll().filter(e => {
            return e.date >= startDate && e.date <= endDate;
        });
        
        const byDay = {};
        expenses.forEach(expense => {
            if (!byDay[expense.date]) {
                byDay[expense.date] = 0;
            }
            byDay[expense.date] += expense.amount;
        });
        
        return byDay;
    }
};

module.exports = ExpenseService;
