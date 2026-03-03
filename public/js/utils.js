/**
 * Utilidades generales del sistema
 */

const Utils = {
    /**
     * Formatea un número como moneda (Pesos Colombianos)
     */
    formatCurrency(amount) {
        return '$ ' + Math.round(amount || 0).toLocaleString('es-CO');
    },
    
    /**
     * Formatea una fecha
     */
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'America/Bogota'
        });
    },
    
    /**
     * Formatea una fecha en formato corto DD/MM/AA
     */
    formatDateShort(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    },
    
    /**
     * Formatea fecha y hora
     */
    formatDateTime(dateTimeString) {
        if (!dateTimeString) return '';
        const date = new Date(dateTimeString);
        return date.toLocaleString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Bogota'
        });
    },
    
    /**
     * Obtiene la fecha actual en formato YYYY-MM-DD (zona horaria Bogotá)
     */
    getCurrentDate() {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    },
    
    /**
     * Obtiene el primer día del mes actual (zona horaria Bogotá)
     */
    getFirstDayOfMonth() {
        const now = new Date();
        const bogotaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
        return new Date(bogotaDate.getFullYear(), bogotaDate.getMonth(), 1).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    },
    
    /**
     * Obtiene el último día del mes actual (zona horaria Bogotá)
     */
    getLastDayOfMonth() {
        const now = new Date();
        const bogotaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
        return new Date(bogotaDate.getFullYear(), bogotaDate.getMonth() + 1, 0).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    },
    
    /**
     * Hace una petición fetch con manejo de errores
     */
    async fetch(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error en la petición');
            }
            
            return data;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    },
    
    /**
     * Muestra un toast de notificación
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer') || this.createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast alert-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${this.escapeHtml(message)}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
    
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    },
    
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            danger: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    },
    
    /**
     * Muestra loading overlay
     */
    showLoading() {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(overlay);
        }
        overlay.classList.add('active');
    },
    
    /**
     * Oculta loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    },
    
    /**
     * Muestra modal de confirmación
     */
    async confirm(message, title = 'Confirmar') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">${this.escapeHtml(title)}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${this.escapeHtml(message)}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="confirmCancel">Cancelar</button>
                        <button class="btn btn-danger" id="confirmOk">Confirmar</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            overlay.querySelector('#confirmOk').onclick = () => {
                overlay.remove();
                resolve(true);
            };
            
            overlay.querySelector('#confirmCancel').onclick = () => {
                overlay.remove();
                resolve(false);
            };
        });
    },
    
    /**
     * Muestra modal para ingresar contraseña
     */
    async promptPassword(message = 'Ingrese la contraseña para continuar') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay active';
            overlay.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">Contraseña Requerida</h3>
                        <button class="modal-close" id="passwordCancel">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-2">${this.escapeHtml(message)}</p>
                        <div class="form-group">
                            <input type="password" id="passwordInput" class="form-control" 
                                   placeholder="Contraseña" autofocus>
                        </div>
                        <div id="passwordError" class="alert alert-danger" style="display: none;"></div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="passwordCancelBtn">Cancelar</button>
                        <button class="btn btn-primary" id="passwordOk">Verificar</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            const input = overlay.querySelector('#passwordInput');
            const errorDiv = overlay.querySelector('#passwordError');
            
            const verify = async () => {
                const password = input.value;
                if (!password) {
                    errorDiv.textContent = 'Ingrese la contraseña';
                    errorDiv.style.display = 'block';
                    return;
                }
                
                try {
                    const result = await Utils.fetch('/api/verify-password', {
                        method: 'POST',
                        body: JSON.stringify({ password })
                    });
                    
                    if (result.success) {
                        overlay.remove();
                        resolve(true);
                    } else {
                        errorDiv.textContent = result.message || 'Contraseña incorrecta';
                        errorDiv.style.display = 'block';
                        input.value = '';
                        input.focus();
                    }
                } catch (error) {
                    errorDiv.textContent = error.message || 'Error al verificar';
                    errorDiv.style.display = 'block';
                }
            };
            
            overlay.querySelector('#passwordOk').onclick = verify;
            input.onkeypress = (e) => {
                if (e.key === 'Enter') verify();
            };
            
            overlay.querySelector('#passwordCancel').onclick = 
            overlay.querySelector('#passwordCancelBtn').onclick = () => {
                overlay.remove();
                resolve(false);
            };
            
            input.focus();
        });
    },
    
    /**
     * Escapa HTML para prevenir XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Formatea un número con separadores de miles colombianos
     */
    formatNumber(num) {
        if (num === null || num === undefined || num === '') return '';
        return Math.round(Number(num) || 0).toLocaleString('es-CO');
    },
    
    /**
     * Parsea un número formateado (quita puntos de miles)
     */
    parseNumber(str) {
        if (!str) return 0;
        // Quitar puntos de miles y convertir a número
        return parseInt(String(str).replace(/\./g, '').replace(/[^0-9-]/g, '')) || 0;
    },
    
    /**
     * Formatea una cantidad de producto (permite ,5 para media unidad)
     * Ejemplos: 1000 -> "1.000", 1000.5 -> "1.000,5", 0.5 -> "0,5"
     */
    formatQuantity(num) {
        if (num === null || num === undefined || num === '') return '';
        const value = Number(num) || 0;
        const intPart = Math.floor(value);
        const hasHalf = (value - intPart) === 0.5;
        
        const formattedInt = intPart.toLocaleString('es-CO');
        return hasHalf ? `${formattedInt},5` : formattedInt;
    },
    
    /**
     * Parsea una cantidad de producto (acepta ,5 para media unidad)
     * Solo permite decimales de 0,5 - cualquier otro decimal se redondea a ,5 o entero
     * Ejemplos: "1.000,5" -> 1000.5, "1.000" -> 1000, "0,5" -> 0.5
     */
    parseQuantity(str) {
        if (!str) return 0;
        const s = String(str).trim();
        
        // Verificar si tiene ,5 al final
        const hasHalf = s.endsWith(',5');
        
        // Quitar puntos de miles y la coma con el 5
        let cleanStr = s.replace(/\./g, '').replace(',5', '').replace(/[^0-9-]/g, '');
        const intPart = parseInt(cleanStr) || 0;
        
        return hasHalf ? intPart + 0.5 : intPart;
    },
    
    /**
     * Valida que una cantidad solo tenga decimales de 0,5 o sea entera
     * Retorna true si es válida, false si tiene decimales inválidos
     */
    isValidQuantity(num) {
        if (num === null || num === undefined) return false;
        const value = Number(num);
        if (isNaN(value) || value < 0) return false;
        
        // Verificar que el decimal sea 0 o 0.5
        const decimal = value - Math.floor(value);
        return decimal === 0 || decimal === 0.5;
    },
    
    /**
     * Redondea una cantidad al valor válido más cercano (entero o ,5)
     */
    roundQuantity(num) {
        if (num === null || num === undefined) return 0;
        const value = Number(num) || 0;
        // Redondear a 0.5 más cercano
        return Math.round(value * 2) / 2;
    },
    
    /**
     * Configura un input para formatear dinero automáticamente
     * Evita agregar listeners duplicados si ya fue configurado
     */
    setupMoneyInput(input) {
        if (input.dataset.moneySetup) return;
        input.dataset.moneySetup = 'true';
        
        input.addEventListener('input', function(e) {
            // Guardar posición del cursor
            const cursorPos = this.selectionStart;
            const oldLength = this.value.length;
            
            // Obtener solo números
            let value = this.value.replace(/\./g, '').replace(/[^0-9]/g, '');
            
            // Formatear con separadores de miles
            if (value) {
                value = parseInt(value).toLocaleString('es-CO');
            }
            
            this.value = value;
            
            // Ajustar posición del cursor
            const newLength = this.value.length;
            const diff = newLength - oldLength;
            this.setSelectionRange(cursorPos + diff, cursorPos + diff);
        });
        
        // Al perder foco, asegurar formato correcto
        input.addEventListener('blur', function() {
            if (this.value) {
                const num = Utils.parseNumber(this.value);
                this.value = num > 0 ? Utils.formatNumber(num) : '';
            }
        });
    },
    
    /**
     * Configura un input para formatear cantidades (permite ,5 para media unidad)
     * Evita agregar listeners duplicados si ya fue configurado
     */
    setupQuantityInput(input) {
        if (input.dataset.quantitySetup) return;
        input.dataset.quantitySetup = 'true';
        
        input.addEventListener('input', function(e) {
            // Guardar posición del cursor
            const cursorPos = this.selectionStart;
            const oldLength = this.value.length;
            
            // Permitir números, puntos (miles) y coma seguida de 5
            let value = this.value;
            
            // Verificar si termina en coma o en ,5
            const endsWithComma = value.endsWith(',');
            const endsWithComma5 = value.endsWith(',5');
            
            // Limpiar: quitar todo excepto números, puntos y coma
            let cleanValue = value.replace(/[^0-9.,]/g, '');
            
            // Quitar puntos de miles para procesar
            let numericPart = cleanValue.replace(/\./g, '').replace(',5', '').replace(',', '');
            
            // Formatear parte entera
            if (numericPart) {
                numericPart = parseInt(numericPart).toLocaleString('es-CO');
            }
            
            // Agregar ,5 si corresponde
            if (endsWithComma5) {
                this.value = numericPart + ',5';
            } else if (endsWithComma) {
                this.value = numericPart + ',';
            } else {
                this.value = numericPart;
            }
            
            // Ajustar posición del cursor
            const newLength = this.value.length;
            const diff = newLength - oldLength;
            this.setSelectionRange(cursorPos + diff, cursorPos + diff);
        });
        
        // Al perder foco, asegurar formato correcto (solo ,5 permitido)
        input.addEventListener('blur', function() {
            if (this.value) {
                const qty = Utils.parseQuantity(this.value);
                this.value = qty > 0 ? Utils.formatQuantity(qty) : '';
            }
        });
    },
    
    /**
     * Renderiza controles de paginación
     */
    renderPagination(containerId, currentPage, totalPages, onPageChange) {
        const container = document.getElementById(containerId);
        if (!container || totalPages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }
        
        let html = '<div class="pagination">';
        html += `<span class="pagination-info">Página ${currentPage} de ${totalPages}</span>`;
        
        // Botón anterior
        html += `<button class="pagination-btn" onclick="${onPageChange}(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>`;
        
        // Números de página (máximo 5 visibles)
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="${onPageChange}(${i})">${i}</button>`;
        }
        
        // Botón siguiente
        html += `<button class="pagination-btn" onclick="${onPageChange}(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>`;
        
        html += '</div>';
        container.innerHTML = html;
    },
    
    /**
     * Pagina un array de items
     */
    paginate(items, page, perPage = 10) {
        const totalPages = Math.ceil(items.length / perPage);
        const currentPage = Math.min(Math.max(1, page), totalPages || 1);
        const start = (currentPage - 1) * perPage;
        const end = start + perPage;
        
        return {
            items: items.slice(start, end),
            currentPage,
            totalPages,
            totalItems: items.length
        };
    }
};

// Hacer Utils global
window.Utils = Utils;
