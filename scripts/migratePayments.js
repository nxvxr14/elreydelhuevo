/**
 * Script de migración: Migrar abonos existentes al nuevo sistema de cartera
 * 
 * Este script lee los abonos existentes en las ventas a crédito y los registra
 * en el nuevo archivo payments.json, manteniendo la trazabilidad.
 */

const fs = require('fs');
const path = require('path');

const DATABASE_PATH = path.join(__dirname, '../database');
const SALES_FILE = path.join(DATABASE_PATH, 'sales.json');
const PAYMENTS_FILE = path.join(DATABASE_PATH, 'payments.json');

function generateReference(prefix) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000000);
    return `${prefix}${timestamp}${random}`;
}

function migrate() {
    console.log('Iniciando migración de abonos al nuevo sistema de cartera...\n');
    
    // Leer ventas
    const salesData = JSON.parse(fs.readFileSync(SALES_FILE, 'utf8'));
    
    // Leer o crear payments.json
    let paymentsData;
    try {
        paymentsData = JSON.parse(fs.readFileSync(PAYMENTS_FILE, 'utf8'));
    } catch (e) {
        paymentsData = { payments: [] };
    }
    
    // Obtener IDs de pagos ya migrados para evitar duplicados
    const existingPaymentRefs = new Set(paymentsData.payments.map(p => p.reference));
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    // Procesar cada venta a crédito con abonos
    salesData.sales.forEach(sale => {
        if (sale.paymentMethod !== 'credit') return;
        if (!sale.payments || sale.payments.length === 0) return;
        
        sale.payments.forEach((payment, index) => {
            // Crear un ID único basado en la venta y el índice del abono
            const legacyRef = `LEGACY_${sale.id}_${index}`;
            
            // Verificar si ya fue migrado
            if (existingPaymentRefs.has(legacyRef)) {
                console.log(`✓ Abono ya migrado: ${sale.reference} - ${payment.amount}`);
                skippedCount++;
                return;
            }
            
            // Crear el nuevo registro de pago
            const newPayment = {
                id: generateReference('P'),
                reference: legacyRef,
                clientId: sale.clientId,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod || 'cash',
                transferType: payment.transferType || null,
                note: payment.note || 'Migrado del sistema anterior',
                date: payment.date || sale.date,
                appliedToSales: [{
                    saleId: sale.id,
                    saleReference: sale.reference,
                    amountApplied: payment.amount,
                    newStatus: sale.status
                }],
                createdAt: sale.updatedAt || sale.createdAt,
                migratedFrom: 'legacy_sale_payments'
            };
            
            paymentsData.payments.push(newPayment);
            console.log(`→ Migrado: ${sale.reference} - Cliente ${sale.clientId} - ${payment.amount}`);
            migratedCount++;
        });
    });
    
    // Guardar cambios
    fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(paymentsData, null, 2));
    
    console.log(`\n========================================`);
    console.log(`Migración completada:`);
    console.log(`- Abonos migrados: ${migratedCount}`);
    console.log(`- Abonos ya existentes (omitidos): ${skippedCount}`);
    console.log(`- Total de pagos en el sistema: ${paymentsData.payments.length}`);
    console.log(`========================================\n`);
}

// Ejecutar migración
migrate();
