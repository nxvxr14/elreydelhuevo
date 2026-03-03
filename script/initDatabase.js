const fs = require('fs');
const path = require('path');

const databaseDir = path.join(__dirname, '..', 'database');
const now = new Date().toISOString();

const baseFiles = {
    'users.json': {
        users: [
            {
                id: 1,
                username: 'admin',
                password: 'huevos',
                role: 'admin',
                createdAt: now
            }
        ],
        globalPassword: '961114'
    },
    'categories.json': {
        categories: [
            {
                id: 1,
                name: 'General',
                createdAt: now
            }
        ],
        lastId: 1
    },
    'warehouses.json': {
        warehouses: [
            {
                id: 1,
                name: 'Bodega Principal',
                description: 'Bodega por defecto',
                isDefault: true,
                createdAt: now,
                updatedAt: now
            }
        ],
        lastId: 1
    },
    'clients.json': {
        clients: [
            {
                id: 1,
                name: 'Público General',
                phone: '',
                email: '',
                address: '',
                createdAt: now,
                updatedAt: now
            }
        ],
        lastId: 1
    },
    'products.json': {
        products: [],
        lastId: 0
    },
    'sales.json': {
        sales: []
    },
    'expenses.json': {
        expenses: []
    },
    'inventory.json': {
        entries: []
    },
    'payments.json': {
        payments: []
    },
    'cashRegisters.json': {
        cashRegisters: [],
        currentRegister: null
    }
};

function ensureDatabase() {
    if (!fs.existsSync(databaseDir)) {
        fs.mkdirSync(databaseDir, { recursive: true });
        console.log('📁 Carpeta database creada');
    }

    let created = 0;
    let skipped = 0;

    for (const [fileName, content] of Object.entries(baseFiles)) {
        const filePath = path.join(databaseDir, fileName);

        if (fs.existsSync(filePath)) {
            console.log(`⏭️  ${fileName} ya existe, no se modifica`);
            skipped += 1;
            continue;
        }

        fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
        console.log(`✅ ${fileName} creado`);
        created += 1;
    }

    console.log('\n=== Inicialización completada ===');
    console.log(`Archivos creados: ${created}`);
    console.log(`Archivos omitidos: ${skipped}`);
}

ensureDatabase();
