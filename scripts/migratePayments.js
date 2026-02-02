/**
 * Script de migración: Migrar abonos existentes al nuevo sistema de cartera
 * Incluye abonos iniciales y abonos posteriores
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
    
    // Obtener referencias de pagos ya migrados para evitar duplicados
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
            
            // Determinar si es abono inicial o posterior
            const isInitialPayment = payment.note === 'Abono inicial' || index === 0;
            
            // Crear el nuevo registro de pago
            const newPayment = {
                id: generateReference('P'),
                reference: legacyRef,
                clientId: sale.clientId,
                amount: payment.amount,
                paymentMethod: payment.paymentMethod || 'cash',
                transferType: payment.transferType || null,
                note: payment.note || (isInitialPayment ? 'Abono inicial' : 'Abono'),
                date: payment.date || sale.date,
                appliedToSales: [{
                    saleId: sale.id,
                    saleReference: sale.reference,
                    amountApplied: payment.amount,
                    newStatus: sale.status
                }],
                createdAt: sale.updatedAt || sale.createdAt,
                migratedFrom: 'legacy_sale_payments',
                isInitialPayment: isInitialPayment
            };
            
            paymentsData.payments.push(newPayment);
            console.log(`→ Migrado${isInitialPayment ? ' (inicial)' : ''}: ${sale.reference} - Cliente ${sale.clientId} - ${payment.amount}`);
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
