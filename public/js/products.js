/**
 * Módulo de Productos
 */

let allProducts = [];
let categories = [];
let filteredProducts = [];
let currentPage = 1;
let originalStock = null; // Para detectar cambios de stock

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadProducts();
});

async function loadCategories() {
    try {
        const result = await Utils.fetch('/api/categories');
        categories = result.categories;
        
        // Llenar selectores
        const filterCategory = document.getElementById('filterCategory');
        const productCategory = document.getElementById('productCategory');
        
        filterCategory.innerHTML = '<option value="">Todas</option>';
        productCategory.innerHTML = '';
        
        categories.forEach(cat => {
            filterCategory.innerHTML += `<option value="${cat.id}">${Utils.escapeHtml(cat.name)}</option>`;
            productCategory.innerHTML += `<option value="${cat.id}">${Utils.escapeHtml(cat.name)}</option>`;
        });
    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

async function loadProducts() {
    try {
        Utils.showLoading();
        
        const result = await Utils.fetch('/api/products');
        allProducts = result.products;
        
        filterProducts();
    } catch (error) {
        console.error('Error cargando productos:', error);
        Utils.showToast('Error al cargar los productos', 'danger');
    } finally {
        Utils.hideLoading();
    }
}

function filterProducts() {
    const categoryId = document.getElementById('filterCategory').value;
    const search = document.getElementById('filterSearch').value.toLowerCase();
    
    filteredProducts = allProducts;
    
    if (categoryId) {
        filteredProducts = filteredProducts.filter(p => p.categoryId === parseInt(categoryId));
    }
    
    if (search) {
        filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(search));
    }
    
    currentPage = 1;
    renderProducts();
}

function renderProducts() {
    const table = document.getElementById('productsTable');
    
    if (filteredProducts.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <h3>No hay productos</h3>
                        <p>Agrega tu primer producto para comenzar</p>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('productsPagination').innerHTML = '';
        return;
    }
    
    const { items, currentPage: page, totalPages } = Utils.paginate(filteredProducts, currentPage, 10);
    currentPage = page;
    
    table.innerHTML = items.map(product => `
        <tr>
            <td>${product.id}</td>
            <td>${Utils.escapeHtml(product.name)}</td>
            <td>${Utils.escapeHtml(product.categoryName)}</td>
            <td>
                <span class="badge ${product.stock <= 0 ? 'badge-danger' : product.stock < 10 ? 'badge-warning' : 'badge-success'}">
                    ${Utils.formatNumber(product.stock)}
                </span>
            </td>
            <td>${Utils.formatCurrency(product.price)}</td>
            <td class="table-actions">
                <button class="btn btn-sm btn-info" onclick="editProduct(${product.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${product.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    Utils.renderPagination('productsPagination', currentPage, totalPages, 'goToPage');
}

function goToPage(page) {
    currentPage = page;
    renderProducts();
}

function showProductModal(product = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    
    form.reset();
    document.getElementById('productId').value = '';
    originalStock = null;
    
    const priceInput = document.getElementById('productPrice');
    const stockInput = document.getElementById('productStock');
    Utils.setupMoneyInput(priceInput);
    Utils.setupMoneyInput(stockInput);
    
    if (product) {
        title.textContent = 'Editar Producto';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.categoryId;
        priceInput.value = Utils.formatNumber(product.price);
        stockInput.value = Utils.formatNumber(product.stock);
        originalStock = product.stock; // Guardar stock original
    } else {
        title.textContent = 'Nuevo Producto';
        stockInput.value = '0';
    }
    
    modal.classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

async function saveProduct() {
    const id = document.getElementById('productId').value;
    const stockStr = document.getElementById('productStock').value;
    const newStock = Utils.parseNumber(stockStr);
    const priceStr = document.getElementById('productPrice').value;
    const price = Utils.parseNumber(priceStr);
    const data = {
        name: document.getElementById('productName').value,
        categoryId: document.getElementById('productCategory').value,
        price: price,
        stock: newStock
    };
    
    if (!data.name || !priceStr) {
        Utils.showToast('Complete los campos requeridos', 'warning');
        return;
    }
    
    if (price < 0) {
        Utils.showToast('El precio no puede ser negativo', 'warning');
        return;
    }
    
    if (newStock < 0) {
        Utils.showToast('El stock no puede ser negativo', 'warning');
        return;
    }
    
    try {
        Utils.showLoading();
        
        if (id) {
            // Editar requiere contraseña
            const stockChanged = originalStock !== null && newStock !== originalStock;
            const message = stockChanged 
                ? 'Ingrese la contraseña para editar el producto (incluye cambio de stock)'
                : 'Ingrese la contraseña para editar el producto';
            
            const verified = await Utils.promptPassword(message);
            if (!verified) {
                Utils.hideLoading();
                return;
            }
            
            await Utils.fetch(`/api/products/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            Utils.showToast('Producto actualizado correctamente', 'success');
        } else {
            await Utils.fetch('/api/products', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            Utils.showToast('Producto creado correctamente', 'success');
        }
        
        closeProductModal();
        loadProducts();
    } catch (error) {
        Utils.showToast(error.message || 'Error al guardar el producto', 'danger');
    } finally {
        Utils.hideLoading();
    }
}

async function editProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (product) {
        showProductModal(product);
    }
}

async function deleteProduct(id) {
    const confirmed = await Utils.confirm('¿Está seguro de eliminar este producto?', 'Eliminar Producto');
    if (!confirmed) return;
    
    const verified = await Utils.promptPassword('Ingrese la contraseña para eliminar el producto');
    if (!verified) return;
    
    try {
        Utils.showLoading();
        
        await Utils.fetch(`/api/products/${id}`, {
            method: 'DELETE'
        });
        
        Utils.showToast('Producto eliminado correctamente', 'success');
        loadProducts();
    } catch (error) {
        Utils.showToast(error.message || 'Error al eliminar el producto', 'danger');
    } finally {
        Utils.hideLoading();
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}
