const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3430;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesiones
app.use(session({
    secret: 'elreydelhuevo-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 365 * 24 * 60 * 60 * 1000 // 1 año - sin cierre automático
    }
}));

// Importar rutas
const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const productRoutes = require('./src/routes/productRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const clientRoutes = require('./src/routes/clientRoutes');
const saleRoutes = require('./src/routes/saleRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes');
const inventoryRoutes = require('./src/routes/inventoryRoutes');
const posRoutes = require('./src/routes/posRoutes');
const cashRegisterRoutes = require('./src/routes/cashRegisterRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const seedRoutes = require('./src/routes/seedRoutes');
const warehouseRoutes = require('./src/routes/warehouseRoutes');
const portfolioRoutes = require('./src/routes/portfolioRoutes');

// Middleware de autenticación
const { isAuthenticated } = require('./src/middleware/auth');

// Rutas de autenticación (públicas)
app.use('/api/auth', authRoutes);
app.use('/api/seed', seedRoutes);

// Rutas protegidas
app.use('/api/dashboard', isAuthenticated, dashboardRoutes);
app.use('/api/products', isAuthenticated, productRoutes);
app.use('/api/categories', isAuthenticated, categoryRoutes);
app.use('/api/clients', isAuthenticated, clientRoutes);
app.use('/api/sales', isAuthenticated, saleRoutes);
app.use('/api/expenses', isAuthenticated, expenseRoutes);
app.use('/api/inventory', isAuthenticated, inventoryRoutes);
app.use('/api/pos', isAuthenticated, posRoutes);
app.use('/api/cash-register', isAuthenticated, cashRegisterRoutes);
app.use('/api/reports', isAuthenticated, reportRoutes);
app.use('/api/warehouses', isAuthenticated, warehouseRoutes);
app.use('/api/portfolio', isAuthenticated, portfolioRoutes);

// Ruta para verificar contraseña global
app.use('/api/verify-password', isAuthenticated, require('./src/routes/verifyPasswordRoute'));

// Servir páginas HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/views/login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/views/login.html'));
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/views/dashboard.html'));
});

app.get('/products', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/views/products.html'));
});

app.get('/categories', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/views/categories.html'));
});

app.get('/clients', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/views/clients.html'));
});

app.get('/sales', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/views/sales.html'));
});

app.get('/expenses', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/views/expenses.html'));
});

app.get('/inventory', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/views/inventory.html'));
});

app.get('/pos', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/views/pos.html'));
});

app.get('/cash-register', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/views/cashRegister.html'));
});

app.get('/reports', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/views/reports.html'));
});

app.get('/warehouses', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/views/warehouses.html'));
});

app.get('/portfolio', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/views/portfolio.html'));
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: err.message
    });
});

// Ruta 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════════╗
    ║        EL REY DEL HUEVO - POS              ║
    ║        Sistema de Inventario               ║
    ╠════════════════════════════════════════════╣
    ║  Servidor iniciado en:                     ║
    ║  http://localhost:${PORT}                      ║
    ╚════════════════════════════════════════════╝
    `);
});
