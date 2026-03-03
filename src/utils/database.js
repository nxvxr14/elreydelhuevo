const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database');

/**
 * Lee un archivo JSON de la base de datos
 * Si el archivo principal está corrupto, intenta recuperar desde respaldo
 */
function readJSON(filename) {
    const filePath = path.join(DB_PATH, filename);
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Intentar recuperar desde respaldo
        const backupPath = filePath + '.bak';
        try {
            if (fs.existsSync(backupPath)) {
                console.warn(`Recuperando ${filename} desde respaldo...`);
                const backupData = fs.readFileSync(backupPath, 'utf8');
                const parsed = JSON.parse(backupData);
                // Restaurar archivo principal desde respaldo
                fs.writeFileSync(filePath, backupData, 'utf8');
                return parsed;
            }
        } catch (backupError) {
            console.error(`Error leyendo respaldo de ${filename}:`, backupError.message);
        }
        console.error(`Error leyendo ${filename}:`, error.message);
        return null;
    }
}

/**
 * Escribe datos en un archivo JSON de la base de datos
 * Usa escritura atómica: escribe a archivo temporal, luego renombra
 * Mantiene respaldo del archivo anterior para recuperación
 */
function writeJSON(filename, data) {
    const filePath = path.join(DB_PATH, filename);
    const tempPath = filePath + '.tmp';
    const backupPath = filePath + '.bak';
    try {
        const jsonData = JSON.stringify(data, null, 2);
        // Escribir a archivo temporal primero
        fs.writeFileSync(tempPath, jsonData, 'utf8');
        // Respaldar archivo actual antes de reemplazar
        if (fs.existsSync(filePath)) {
            fs.copyFileSync(filePath, backupPath);
        }
        // Renombrar (atómico en la mayoría de sistemas de archivos)
        fs.renameSync(tempPath, filePath);
        return true;
    } catch (error) {
        console.error(`Error escribiendo ${filename}:`, error.message);
        // Limpiar archivo temporal si quedó
        try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch(e) {}
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
