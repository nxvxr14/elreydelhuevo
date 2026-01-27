const db = require('../utils/database');

/**
 * Servicio de autenticación
 */
const AuthService = {
    /**
     * Valida las credenciales del usuario
     */
    login(username, password) {
        const usersData = db.readJSON('users.json');
        
        if (!usersData) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        const user = usersData.users.find(
            u => u.username === username && u.password === password
        );
        
        if (!user) {
            return { success: false, message: 'Usuario o contraseña incorrectos' };
        }
        
        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        };
    },
    
    /**
     * Verifica la contraseña global para edición/eliminación
     */
    verifyGlobalPassword(password) {
        const usersData = db.readJSON('users.json');
        
        if (!usersData) {
            return { success: false, message: 'Error al acceder a la base de datos' };
        }
        
        if (password === usersData.globalPassword) {
            return { success: true };
        }
        
        return { success: false, message: 'Contraseña incorrecta' };
    }
};

module.exports = AuthService;
