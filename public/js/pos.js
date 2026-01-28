/**
 * Módulo del Punto de Venta (POS)
 */

let products = [];
let clients = [];
let categories = [];
let cart = [];
let cashStatus = null;

document.addEventListener('DOMContentLoaded', () => {
    loadPOSData();
    
    // Setup money input for received amount
    const receivedInput = document.getElementById('receivedAmount');
    if (receivedInput) {
        Utils.setupMoneyInput(receivedInput);
    }
});

async function loadPOSData() {
    try {
        Utils.showLoading();
        
        const [posResult, categoriesResult] = await Promise.all([
            Utils.fetch('/api/pos/data'),
            Utils.fetch('/api/categories')
        ]);
        
        products = posResult.products;
        clients = posResult.clients;
        cashStatus = posResult.cashStatus;
        categories = categoriesResult.categories;
        
        // Check cash register status
        if (!cashStatus.isOpen) {
            document.getElementById('cashClosedWarning').style.display = 'block';
            document.getElementById('posMain').style.display = 'none';
        } else {
            document.getElementById('cashClosedWarning').style.display = 'none';
            document.getElementById('posMain').style.display = 'grid';
        }
        
        renderCategories();
        renderProducts();
        renderClients();
        
    } catch (error) {
        console.error('Error loading POS data:', error);
        Utils.showToast('Error al cargar los datos del POS', 'danger');
    } finally {
        Utils.hideLoading();
    }
}

function renderCategories() {
    const tabs = document.getElementById('categoryTabs');
    tabs.innerHTML = '<button class="category-tab active" data-category="all" onclick="filterByCategory(\'all\')">Todos</button>';
    
    categories.forEach(cat => {
        tabs.innerHTML += `
            <button class="category-tab" data-category="${cat.id}" onclick="filterByCategory(${cat.id})">
                ${Utils.escapeHtml(cat.name)}
            </button>
        `;
    });
}

function filterByCategory(categoryId) {
    // Update active tab
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.category === String(categoryId)) {
            tab.classList.add('active');
        }
    });
    
    renderProducts(categoryId);
}

function filterProducts() {
    const search = document.getElementById('productSearch').value.toLowerCase();
    const activeTab = document.querySelector('.category-tab.active');
    const categoryId = activeTab ? activeTab.dataset.category : 'all';
    
    let filtered = products;
    
    if (categoryId !== 'all') {
        filtered = filtered.filter(p => p.categoryId === parseInt(categoryId));
    }
    
    if (search) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
    }
    
    renderProductsGrid(filtered);
}

function renderProducts(categoryId = 'all') {
    let filtered = products;
    
    if (categoryId !== 'all') {
        filtered = products.filter(p => p.categoryId === parseInt(categoryId));
    }
    
    renderProductsGrid(filtered);
}

function renderProductsGrid(productsToShow) {
    const grid = document.getElementById('productsGrid');
    
    if (productsToShow.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>No hay productos disponibles</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = productsToShow.map(product => `
        <div class="pos-product-card ${product.stock <= 0 ? 'out-of-stock' : ''}" 
             onclick="${product.stock > 0 ? `addToCart(${product.id})` : ''}">
            <h4 title="${Utils.escapeHtml(product.name)}">${Utils.escapeHtml(product.name)}</h4>
            <div class="price">${Utils.formatCurrency(product.price)}</div>
            <div class="stock">${product.stock > 0 ? `Stock: ${Utils.formatNumber(product.stock)}` : 'Sin stock'}</div>
        </div>
    `).join('');
}

function renderClients() {
    const select = document.getElementById('clientSelect');
    select.innerHTML = '<option value="">Seleccionar cliente...</option>';
    
    clients.forEach(client => {
        select.innerHTML += `<option value="${client.id}">${Utils.escapeHtml(client.name)}</option>`;
    });
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;
    
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            Utils.showToast(`Stock máximo disponible: ${Utils.formatNumber(product.stock)}`, 'warning');
            return;
        }
        existingItem.quantity++;
    } else {
        cart.push({
            productId: product.id,
            name: product.name,
            unitPrice: product.price,
            originalPrice: product.price,
            quantity: 1,
            maxStock: product.stock
        });
    }
    
    renderCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    renderCart();
}

function updateQuantity(productId, delta) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    
    const newQty = item.quantity + delta;
    
    if (newQty <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (newQty > item.maxStock) {
        Utils.showToast(`Stock máximo disponible: ${Utils.formatNumber(item.maxStock)}`, 'warning');
        return;
    }
    
    item.quantity = newQty;
    renderCart();
}

function updateQuantityDirect(productId, value) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    
    const newQty = Utils.parseNumber(value);
    
    if (newQty <= 0 || isNaN(newQty)) {
        removeFromCart(productId);
        return;
    }
    
    if (newQty > item.maxStock) {
        Utils.showToast(`Stock máximo disponible: ${Utils.formatNumber(item.maxStock)}`, 'warning');
        item.quantity = item.maxStock;
    } else {
        item.quantity = newQty;
    }
    
    renderCart();
}

function updateItemPrice(productId, price) {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    
    const newPrice = Utils.parseNumber(price);
    if (newPrice < 0) {
        Utils.showToast('El precio no puede ser negativo', 'warning');
        return;
    }
    
    item.unitPrice = newPrice;
    renderCart();
}

function renderCart() {
    const cartItemsEl = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        cartItemsEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <p>Carrito vacío</p>
            </div>
        `;
        cartCount.textContent = '0';
        cartTotal.textContent = '$ 0';
        return;
    }
    
    let total = 0;
    let totalItems = 0;
    
    cartItemsEl.innerHTML = cart.map(item => {
        const subtotal = item.quantity * item.unitPrice;
        total += subtotal;
        totalItems += item.quantity;
        
        const modifiedBadge = item.unitPrice !== item.originalPrice ? 
            '<span class="price-modified">(modificado)</span>' : '';
        
        return `
            <div class="cart-item">
                <div class="cart-item-line line-name">
                    <span>${Utils.escapeHtml(item.name)}</span>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.productId})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="cart-item-line line-qty">
                    <span>Cantidad:</span>
                    <div class="cart-qty-control">
                        <button onclick="updateQuantity(${item.productId}, -1)">-</button>
                        <input type="text" class="qty-input" 
                               value="${Utils.formatNumber(item.quantity)}" 
                               onchange="updateQuantityDirect(${item.productId}, this.value)"
                               onclick="this.select()">
                        <button onclick="updateQuantity(${item.productId}, 1)">+</button>
                    </div>
                </div>
                <div class="cart-item-line line-price">
                    <span>Precio Unit.:</span>
                    <input type="text" class="cart-item-price-input" 
                           value="${Utils.formatNumber(item.unitPrice)}" 
                           onchange="updateItemPrice(${item.productId}, this.value)"
                           onclick="this.select()">
                    ${modifiedBadge}
                </div>
                <div class="cart-item-line line-subtotal">
                    <span>Subtotal:</span>
                    <span class="cart-item-subtotal">${Utils.formatCurrency(subtotal)}</span>
                </div>
            </div>
        `;
    }).join('');
    
    cartCount.textContent = Utils.formatNumber(totalItems);
    cartTotal.textContent = Utils.formatCurrency(total);
    
    // Update received amount to match total if empty
    const received = document.getElementById('receivedAmount');
    if (!received.value) {
        received.value = Utils.formatNumber(Math.round(total));
    }
    calculateChange();
}

function calculateChange() {
    const total = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const receivedStr = document.getElementById('receivedAmount').value;
    const received = Utils.parseNumber(receivedStr);
    const change = received - total;
    
    const changeInput = document.getElementById('changeAmount');
    changeInput.value = Utils.formatCurrency(change);
    
    if (change < 0) {
        changeInput.style.color = 'var(--danger)';
    } else {
        changeInput.style.color = 'var(--success)';
    }
}

function clearCart() {
    cart = [];
    document.getElementById('receivedAmount').value = '';
    document.getElementById('changeAmount').value = '';
    document.getElementById('saleNote').value = '';
    document.getElementById('clientSelect').value = '';
    document.getElementById('newClientName').value = '';
    renderCart();
}

async function createQuickClient() {
    const name = document.getElementById('newClientName').value.trim();
    
    if (!name) {
        Utils.showToast('Ingrese el nombre del cliente', 'warning');
        return;
    }
    
    try {
        Utils.showLoading();
        
        const result = await Utils.fetch('/api/pos/quick-client', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        
        clients.push(result.client);
        renderClients();
        document.getElementById('clientSelect').value = result.client.id;
        document.getElementById('newClientName').value = '';
        
        Utils.showToast('Cliente creado', 'success');
    } catch (error) {
        Utils.showToast(error.message, 'danger');
    } finally {
        Utils.hideLoading();
    }
}

async function processSale() {
    if (cart.length === 0) {
        Utils.showToast('El carrito está vacío', 'warning');
        return;
    }
    
    const clientId = document.getElementById('clientSelect').value;
    if (!clientId) {
        Utils.showToast('Seleccione o cree un cliente', 'warning');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const receivedStr = document.getElementById('receivedAmount').value;
    const received = Utils.parseNumber(receivedStr);
    
    if (received < total) {
        Utils.showToast('El monto recibido es menor al total', 'warning');
        return;
    }
    
    const saleData = {
        clientId: parseInt(clientId),
        items: cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
        })),
        received: received,
        note: document.getElementById('saleNote').value.substring(0, 200)
    };
    
    try {
        Utils.showLoading();
        
        const result = await Utils.fetch('/api/pos/sale', {
            method: 'POST',
            body: JSON.stringify(saleData)
        });
        
        // Show success modal
        const change = received - total;
        document.getElementById('saleSuccessContent').innerHTML = `
            <div class="text-center">
                <p style="font-size: 1.25rem; margin-bottom: 1rem;">
                    <strong>Referencia:</strong> <code>${result.sale.reference}</code>
                </p>
                <p><strong>Total:</strong> ${Utils.formatCurrency(total)}</p>
                <p><strong>Recibido:</strong> ${Utils.formatCurrency(received)}</p>
                <p style="font-size: 1.5rem; color: var(--success); margin-top: 1rem;">
                    <strong>Cambio: ${Utils.formatCurrency(change)}</strong>
                </p>
            </div>
        `;
        document.getElementById('saleSuccessModal').classList.add('active');
        
        // Clear cart and reload products
        clearCart();
        loadPOSData();
        
    } catch (error) {
        Utils.showToast(error.message, 'danger');
    } finally {
        Utils.hideLoading();
    }
}

function closeSaleSuccessModal() {
    document.getElementById('saleSuccessModal').classList.remove('active');
}

// Cash Register functions
function showOpenCashModal() {
    const amountInput = document.getElementById('initialCashAmount');
    amountInput.value = '';
    Utils.setupMoneyInput(amountInput);
    document.getElementById('openCashModal').classList.add('active');
}

function closeOpenCashModal() {
    document.getElementById('openCashModal').classList.remove('active');
}

async function openCashRegister() {
    const amountStr = document.getElementById('initialCashAmount').value;
    const amount = Utils.parseNumber(amountStr);
    
    if (amount < 0) {
        Utils.showToast('Ingrese un monto válido', 'warning');
        return;
    }
    
    try {
        Utils.showLoading();
        
        await Utils.fetch('/api/cash-register/open', {
            method: 'POST',
            body: JSON.stringify({ initialAmount: amount })
        });
        
        Utils.showToast('Caja abierta correctamente', 'success');
        closeOpenCashModal();
        loadPOSData();
        
    } catch (error) {
        Utils.showToast(error.message, 'danger');
    } finally {
        Utils.hideLoading();
    }
}

async function showCashStatus() {
    try {
        Utils.showLoading();
        
        const result = await Utils.fetch('/api/cash-register/status');
        
        if (!result.isOpen) {
            document.getElementById('cashStatusContent').innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    No hay una caja abierta
                </div>
            `;
            document.getElementById('closeCashBtn').style.display = 'none';
        } else {
            const reg = result.register;
            const cashColorClass = reg.currentAmount >= 0 ? 'text-success' : 'text-danger';
            document.getElementById('cashStatusContent').innerHTML = `
                <div class="mb-2">
                    <span class="badge badge-success">Caja Abierta</span>
                </div>
                <p><strong>Fecha:</strong> ${Utils.formatDate(reg.date)}</p>
                <p><strong>Hora de apertura:</strong> ${Utils.formatDateTime(reg.openedAt)}</p>
                <hr style="border-color: var(--border-color); margin: 1rem 0;">
                <p><strong>Dinero inicial:</strong> ${Utils.formatCurrency(reg.initialAmount)}</p>
                <p><strong>Ventas del día:</strong> <span class="text-success">${Utils.formatCurrency(reg.totalSales)}</span> (${reg.salesCount} ventas)</p>
                <p><strong>Gastos del día:</strong> <span class="text-danger">${Utils.formatCurrency(reg.totalExpenses)}</span></p>
                <hr style="border-color: var(--border-color); margin: 1rem 0;">
                <p style="font-size: 1.25rem;"><strong>En caja:</strong> <span class="${cashColorClass}">${Utils.formatCurrency(reg.currentAmount)}</span></p>
            `;
            document.getElementById('closeCashBtn').style.display = 'inline-flex';
        }
        
        document.getElementById('cashStatusModal').classList.add('active');
        
    } catch (error) {
        Utils.showToast('Error al obtener estado de caja', 'danger');
    } finally {
        Utils.hideLoading();
    }
}

function closeCashStatusModal() {
    document.getElementById('cashStatusModal').classList.remove('active');
}

async function closeCashRegister() {
    const confirmed = await Utils.confirm(
        '¿Está seguro de cerrar la caja? Esta acción no se puede deshacer.',
        'Cerrar Caja'
    );
    
    if (!confirmed) return;
    
    try {
        Utils.showLoading();
        
        const result = await Utils.fetch('/api/cash-register/close', {
            method: 'POST'
        });
        
        const reg = result.register;
        const cashColorClass = reg.expectedAmount >= 0 ? 'text-success' : 'text-danger';
        
        // Show closing summary - modal stays open until user closes it
        document.getElementById('cashStatusContent').innerHTML = `
            <div class="text-center mb-2">
                <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--success);"></i>
                <h3 class="mt-1">Caja Cerrada</h3>
            </div>
            <hr style="border-color: var(--border-color); margin: 1rem 0;">
            <p><strong>Dinero inicial:</strong> ${Utils.formatCurrency(reg.initialAmount)}</p>
            <p><strong>Ventas totales:</strong> <span class="text-success">${Utils.formatCurrency(reg.totalSales)}</span></p>
            <p><strong>Gastos totales:</strong> <span class="text-danger">${Utils.formatCurrency(reg.totalExpenses)}</span></p>
            <hr style="border-color: var(--border-color); margin: 1rem 0;">
            <p style="font-size: 1.5rem;"><strong>Dinero en caja:</strong> <span class="${cashColorClass}">${Utils.formatCurrency(reg.expectedAmount)}</span></p>
        `;
        
        document.getElementById('closeCashBtn').style.display = 'none';
        
        Utils.showToast('Caja cerrada correctamente', 'success');
        
        // Mark that we need to reload when modal closes
        window.cashJustClosed = true;
        
    } catch (error) {
        Utils.showToast(error.message, 'danger');
    } finally {
        Utils.hideLoading();
    }
}

function closeCashStatusModal() {
    document.getElementById('cashStatusModal').classList.remove('active');
    // Reload POS data if cash was just closed
    if (window.cashJustClosed) {
        window.cashJustClosed = false;
        loadPOSData();
    }
}

function toggleCart() {
    if (window.innerWidth <= 992) {
        document.getElementById('cartSection').classList.toggle('active');
    }
}

// Close cart when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 992) {
        const cart = document.getElementById('cartSection');
        if (!cart.contains(e.target) && cart.classList.contains('active')) {
            cart.classList.remove('active');
        }
    }
});

// Quick Expense functions
function showQuickExpenseModal() {
    if (!cashStatus || !cashStatus.isOpen) {
        Utils.showToast('Debe abrir la caja antes de registrar gastos', 'warning');
        return;
    }
    
    document.getElementById('quickExpenseForm').reset();
    document.getElementById('quickExpenseModal').classList.add('active');
    
    // Setup money input formatting
    const amountInput = document.getElementById('quickExpenseAmount');
    Utils.setupMoneyInput(amountInput);
    
    document.getElementById('quickExpenseConcept').focus();
}

function closeQuickExpenseModal() {
    document.getElementById('quickExpenseModal').classList.remove('active');
}

async function saveQuickExpense() {
    const concept = document.getElementById('quickExpenseConcept').value.trim();
    const amountStr = document.getElementById('quickExpenseAmount').value;
    const amount = Utils.parseNumber(amountStr);
    const note = document.getElementById('quickExpenseNote').value.trim();
    
    if (!concept) {
        Utils.showToast('Ingrese el concepto del gasto', 'warning');
        return;
    }
    
    if (!amount || amount <= 0) {
        Utils.showToast('Ingrese un monto válido', 'warning');
        return;
    }
    
    try {
        Utils.showLoading();
        
        const data = {
            concept: concept,
            amount: amount,
            date: new Date().toISOString().split('T')[0],
            note: note
        };
        
        // Usar endpoint del POS para que el gasto afecte la caja
        await Utils.fetch('/api/pos/expense', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        Utils.showToast('Gasto registrado correctamente', 'success');
        closeQuickExpenseModal();
        
        // Refresh cash status
        loadPOSData();
        
    } catch (error) {
        Utils.showToast(error.message || 'Error al registrar el gasto', 'danger');
    } finally {
        Utils.hideLoading();
    }
}
