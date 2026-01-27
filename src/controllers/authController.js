const AuthService = require('../services/authService');

/**
 * Controlador de autenticación
 */
const AuthController = {
    /**
     * Login
     */
    login(req, res) {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son requeridos'
            });
        }
        
        const result = AuthService.login(username, password);
        
        if (!result.success) {
            return res.status(401).json(result);
        }
        
        // Guardar sesión
        req.session.user = result.user;
        
        return res.json({
            success: true,
            message: 'Inicio de sesión exitoso',
            user: result.user
        });
    },
    
    /**
     * Logout
     */
    logout(req, res) {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error al cerrar sesión'
                });
            }
            
            return res.json({
                success: true,
                message: 'Sesión cerrada correctamente'
            });
        });
    },
    
    /**
     * Verificar sesión
     */
    checkSession(req, res) {
        if (req.session && req.session.user) {
            return res.json({
                success: true,
                authenticated: true,
                user: req.session.user
            });
        }
        
        return res.json({
            success: true,
            authenticated: false
        });
    },
    
    /**
     * Verificar contraseña global
     */
    verifyGlobalPassword(req, res) {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña es requerida'
            });
        }
        
        const result = AuthService.verifyGlobalPassword(password);
        return res.json(result);
    }
};

module.exports = AuthController;
