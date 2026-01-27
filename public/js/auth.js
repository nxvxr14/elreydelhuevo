/**
 * Módulo de autenticación
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    
    // Solo verificar auth en la página de login
    if (loginForm) {
        checkAuth();
        loginForm.addEventListener('submit', handleLogin);
    }
});

async function checkAuth() {
    try {
        const result = await Utils.fetch('/api/auth/check');
        if (result.authenticated) {
            window.location.href = '/dashboard';
        }
    } catch (error) {
        // No autenticado, permanecer en login
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const loginError = document.getElementById('loginError');
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showLoginError('Por favor complete todos los campos');
        return;
    }
    
    try {
        Utils.showLoading();
        
        const result = await Utils.fetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (result.success) {
            window.location.href = '/dashboard';
        } else {
            showLoginError(result.message || 'Error al iniciar sesión');
        }
    } catch (error) {
        showLoginError(error.message || 'Error al conectar con el servidor');
    } finally {
        Utils.hideLoading();
    }
}

function showLoginError(message) {
    const loginError = document.getElementById('loginError');
    if (loginError) {
        loginError.textContent = message;
        loginError.style.display = 'block';
    }
}

async function logout() {
    try {
        await Utils.fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        window.location.href = '/login';
    }
}

// Hacer logout global
window.logout = logout;
