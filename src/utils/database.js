const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database');

/**
 * Lee un archivo JSON de la base de datos
 */
function readJSON(filename) {
    const filePath = path.join(DB_PATH, filename);
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error leyendo ${filename}:`, error.message);
        return null;
    }
}

/**
 * Escribe datos en un archivo JSON de la base de datos
 */
function writeJSON(filename, data) {
    const filePath = path.join(DB_PATH, filename);
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error escribiendo ${filename}:`, error.message);
        return false;
    }
}

/**
 * Genera una referencia única para ventas y gastos
 * Formato: [INICIAL] + Date.now() + 4 números aleatorios
 */
function generateReference(prefix) {
    const timestamp = Date.now();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${timestamp}${random}`;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (zona horaria Bogotá, Colombia)
 */
function getCurrentDate() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

/**
 * Obtiene la fecha y hora actual en formato ISO (zona horaria Bogotá, Colombia)
 */
function getCurrentDateTime() {
    return new Date().toLocaleString('sv-SE', { timeZone: 'America/Bogota' }).replace(' ', 'T') + '-05:00';
}

/**
 * Valida que un número sea positivo
 */
function isPositiveNumber(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
}

/**
 * Valida que una fecha sea válida
 */
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

/**
 * Formatea un número como moneda (pesos colombianos, sin decimales)
 */
function formatCurrency(amount) {
    return Math.round(amount);
}

/**
 * Valida que una cantidad solo tenga decimales de 0,5 o sea entera
 * Retorna true si es válida, false si tiene decimales inválidos
 */
function isValidQuantity(value) {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return false;
    
    // Verificar que el decimal sea 0 o 0.5
    const decimal = num - Math.floor(num);
    // Usar tolerancia para evitar errores de punto flotante
    return decimal < 0.001 || (decimal > 0.499 && decimal < 0.501);
}

/**
 * Redondea una cantidad al valor válido más cercano (entero o ,5)
 */
function roundQuantity(value) {
    const num = parseFloat(value) || 0;
    return Math.round(num * 2) / 2;
}

module.exports = {
    readJSON,
    writeJSON,
    generateReference,
    getCurrentDate,
    getCurrentDateTime,
    isPositiveNumber,
    isValidDate,
    formatCurrency,
    isValidQuantity,
    roundQuantity
};
