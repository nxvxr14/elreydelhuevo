/**
 * Middleware de autenticación
 */
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    
    // Si es una petición API, devolver JSON
    if (req.xhr || req.headers.accept?.includes('application/json') || req.path.startsWith('/api')) {
        return res.status(401).json({
            success: false,
            message: 'No autorizado. Por favor inicie sesión.'
        });
    }
    
    // Si es una petición de página, redirigir al login
    return res.redirect('/login');
}

/**
 * Middleware para verificar la contraseña global
 */
function verifyGlobalPassword(req, res, next) {
    const { password } = req.body;
    const db = require('../utils/database');
    const usersData = db.readJSON('users.json');
    
    if (!usersData || password !== usersData.globalPassword) {
        return res.status(403).json({
            success: false,
            message: 'Contraseña incorrecta'
        });
    }
    
    next();
}

module.exports = {
    isAuthenticated,
    verifyGlobalPassword
};
