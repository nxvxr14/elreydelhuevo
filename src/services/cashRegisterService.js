const db = require('../utils/database');
const SaleService = require('./saleService');
const ExpenseService = require('./expenseService');

/**
 * Servicio de caja registradora
 */
const CashRegisterService = {
    /**
     * Obtiene todos los registros de caja
     */
    getAll() {
        const data = db.readJSON('cashRegisters.json');
        if (!data) return [];
        return data.cashRegisters;
    },
    
    /**
     * Obtiene la caja actual (abierta)
     */
    getCurrentRegister() {
        const data = db.readJSON('cashRegisters.json');
        if (!data) return null;
        return data.currentRegister;
    },
    
    /**
     * Verifica si hay una caja abierta para hoy
     */
    isCashRegisterOpen() {
        const current = this.getCurrentRegister();
        return current !== null && current.status === 'open';
    },
    
    /**
     * Obtiene caja por fecha
     */
    getByDate(date) {
        const registers = this.getAll();
        return registers.find(r => r.date === date);
    },
    
    /**
     * Obtiene caja por ID
     */
    getById(id) {
        const registers = this.getAll();
        return registers.find(r => r.id === id);
    },
    
    /**
     * Abre una nueva caja
     */
    open(initialAmount) {
        const data = db.readJSON('cashRegisters.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        // Verificar si ya hay una caja abierta
        if (data.currentRegister && data.currentRegister.status === 'open') {
            return { success: false, message: 'Ya hay una caja abierta. Debe cerrarla primero.' };
        }
        
        const today = db.getCurrentDate();
        
        // Verificar si ya existe caja cerrada para hoy
        const existingClosed = data.cashRegisters.find(r => r.date === today && r.status === 'closed');
        if (existingClosed) {
            return { success: false, message: 'Ya existe una caja cerrada para hoy. No se puede reabrir.' };
        }
        
        // Validar monto inicial
        if (!db.isPositiveNumber(initialAmount)) {
            return { success: false, message: 'El monto inicial debe ser un número positivo' };
        }
        
        // Generar referencia
        const reference = db.generateReference('C');
        
        const newRegister = {
            id: reference,
            reference,
            date: today,
            initialAmount: parseFloat(initialAmount),
            status: 'open',
            openedAt: db.getCurrentDateTime(),
            closedAt: null,
            totalSales: 0,
            totalExpenses: 0,
            expectedAmount: parseFloat(initialAmount),
            finalAmount: null
        };
        
        data.currentRegister = newRegister;
        
        if (!db.writeJSON('cashRegisters.json', data)) {
            return { success: false, message: 'Error al abrir la caja' };
        }
        
        return { success: true, register: newRegister };
    },
    
    /**
     * Cierra la caja actual
     */
    close() {
        const data = db.readJSON('cashRegisters.json');
        if (!data) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        if (!data.currentRegister || data.currentRegister.status !== 'open') {
            return { success: false, message: 'No hay una caja abierta para cerrar' };
        }
        
        const register = data.currentRegister;
        const today = register.date;
        
        // Calcular totales del día - SOLO ventas y gastos del POS (source: 'pos')
        // Usar totalIncome en vez de totalSales para no contar créditos como efectivo
        const salesStats = SaleService.getStats(today, today, 'pos');
        const expensesStats = ExpenseService.getStats(today, today, 'pos');
        
        const totalIncome = salesStats.totalIncome;
        const totalExpenses = expensesStats.totalExpenses;
        const expectedAmount = register.initialAmount + totalIncome - totalExpenses;
        
        // Actualizar registro de caja
        register.status = 'closed';
        register.closedAt = db.getCurrentDateTime();
        register.totalSales = totalIncome;
        register.salesCount = salesStats.salesCount;
        register.totalExpenses = totalExpenses;
        register.expensesCount = expensesStats.expensesCount;
        register.expectedAmount = Math.round(expectedAmount);
        register.finalAmount = Math.round(expectedAmount);
        
        // Agregar al historial
        data.cashRegisters.push(register);
        data.currentRegister = null;
        
        if (!db.writeJSON('cashRegisters.json', data)) {
            return { success: false, message: 'Error al cerrar la caja' };
        }
        
        return { success: true, register };
    },
    
    /**
     * Obtiene el estado actual de la caja
     */
    getStatus() {
        const current = this.getCurrentRegister();
        
        if (!current || current.status !== 'open') {
            return {
                isOpen: false,
                register: null
            };
        }
        
        const today = current.date;
        
        // Calcular totales actuales - SOLO ventas y gastos del POS (source: 'pos')
        // Usar totalIncome en vez de totalSales para no contar créditos como efectivo
        const salesStats = SaleService.getStats(today, today, 'pos');
        const expensesStats = ExpenseService.getStats(today, today, 'pos');
        
        const currentAmount = current.initialAmount + salesStats.totalIncome - expensesStats.totalExpenses;
        
        return {
            isOpen: true,
            register: {
                ...current,
                totalSales: salesStats.totalIncome,
                salesCount: salesStats.salesCount,
                totalExpenses: expensesStats.totalExpenses,
                expensesCount: expensesStats.expensesCount,
                currentAmount: Math.round(currentAmount)
            }
        };
    },
    
    /**
     * Obtiene historial de cajas filtrado
     */
    getFiltered(filters = {}) {
        let registers = this.getAll();
        
        if (filters.startDate) {
            registers = registers.filter(r => r.date >= filters.startDate);
        }
        
        if (filters.endDate) {
            registers = registers.filter(r => r.date <= filters.endDate);
        }
        
        return registers;
    }
};

module.exports = CashRegisterService;
