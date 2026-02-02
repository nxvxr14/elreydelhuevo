/**
 * Script de migración: Asignar stock de productos existentes a la bodega por defecto
 * 
 * Este script migra todos los productos existentes que no tienen warehouseStock
 * y les asigna su stock actual a la bodega por defecto (Bodega Punto de Venta, ID: 1)
 */

const fs = require('fs');
const path = require('path');

const DATABASE_PATH = path.join(__dirname, '../database');
const PRODUCTS_FILE = path.join(DATABASE_PATH, 'products.json');
const WAREHOUSES_FILE = path.join(DATABASE_PATH, 'warehouses.json');
const INVENTORY_FILE = path.join(DATABASE_PATH, 'inventory.json');

function migrate() {
    console.log('Iniciando migración de stock a bodegas...\n');
    
    // Leer productos
    const productsData = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    const warehousesData = JSON.parse(fs.readFileSync(WAREHOUSES_FILE, 'utf8'));
    
    // Obtener bodega por defecto
    const defaultWarehouse = warehousesData.warehouses.find(w => w.isDefault);
    if (!defaultWarehouse) {
        console.error('Error: No se encontró bodega por defecto');
        process.exit(1);
    }
    
    console.log(`Bodega por defecto: ${defaultWarehouse.name} (ID: ${defaultWarehouse.id})\n`);
    
    let migratedCount = 0;
    
    productsData.products.forEach(product => {
        // Si el producto ya tiene warehouseStock, verificar que esté completo
        if (product.warehouseStock && Object.keys(product.warehouseStock).length > 0) {
            console.log(`✓ ${product.name}: ya tiene stock asignado a bodegas`);
            return;
        }
        
        // Migrar stock a bodega por defecto
        product.warehouseStock = {
            [defaultWarehouse.id]: product.stock || 0
        };
        
        console.log(`→ ${product.name}: stock ${product.stock} asignado a "${defaultWarehouse.name}"`);
        migratedCount++;
    });
    
    // Guardar cambios
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(productsData, null, 2));
    
    // Migrar también los registros de inventario existentes
    const inventoryData = JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8'));
    let inventoryMigrated = 0;
    
    inventoryData.entries.forEach(entry => {
        if (!entry.warehouseId) {
            entry.warehouseId = defaultWarehouse.id;
            inventoryMigrated++;
        }
    });
    
    fs.writeFileSync(INVENTORY_FILE, JSON.stringify(inventoryData, null, 2));
    
    console.log(`\n========================================`);
    console.log(`Migración completada:`);
    console.log(`- Productos migrados: ${migratedCount}`);
    console.log(`- Movimientos de inventario actualizados: ${inventoryMigrated}`);
    console.log(`========================================\n`);
}

// Ejecutar migración
migrate();
