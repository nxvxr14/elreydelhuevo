/**
 * Módulo de Bodegas
 */

let warehouses = [];
let currentWarehouse = null;

document.addEventListener('DOMContentLoaded', () => {
    loadWarehouses();
});

async function loadWarehouses() {
    try {
        Utils.showLoading();
        const result = await Utils.fetch('/api/warehouses');
        warehouses = result.warehouses;
        renderWarehouses();
    } catch (error) {
        console.error('Error cargando bodegas:', error);
        Utils.showToast('Error al cargar las bodegas', 'danger');
    } finally {
        Utils.hideLoading();
    }
}

function renderWarehouses() {
    const container = document.getElementById('warehousesContainer');
    
    if (warehouses.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <i class="fas fa-warehouse" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                <h3>No hay bodegas</h3>
                <p>Crea tu primera bodega para comenzar</p>
            </div>`;
        return;
    }
    
    container.innerHTML = warehouses.map(warehouse => `
        <div class="warehouse-card ${warehouse.isDefault ? 'default' : ''}" onclick="viewWarehouse(${warehouse.id})">
            <div class="warehouse-header">
                <h3 class="warehouse-name">${Utils.escapeHtml(warehouse.name)}</h3>
                ${warehouse.isDefault ? '<span class="warehouse-badge">Por defecto</span>' : ''}
            </div>
            <div class="warehouse-stats">
                <div class="warehouse-stat">
                    <span class="warehouse-stat-label">Total Canastas</span>
                    <span class="warehouse-stat-value">${Utils.formatQuantity(warehouse.totalStock)}</span>
                </div>
                <div class="warehouse-stat">
                    <span class="warehouse-stat-label">ID</span>
                    <span class="warehouse-stat-value">#${warehouse.id}</span>
                </div>
            </div>
            ${warehouse.description ? `<p class="warehouse-description">${Utils.escapeHtml(warehouse.description)}</p>` : ''}
            <div class="warehouse-actions" onclick="event.stopPropagation();">
                <button class="btn btn-sm btn-info" onclick="editWarehouse(${warehouse.id})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                ${!warehouse.isDefault ? `
                    <button class="btn btn-sm btn-danger" onclick="deleteWarehouse(${warehouse.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

async function viewWarehouse(id) {
    try {
        Utils.showLoading();
        const result = await Utils.fetch(`/api/warehouses/${id}/products`);
        currentWarehouse = result.warehouse;
        
        document.getElementById('detailWarehouseName').textContent = result.warehouse.name;
        document.getElementById('detailTotalStock').textContent = `${Utils.formatQuantity(result.totalStock)} canastas`;
        
        const productsContainer = document.getElementById('warehouseProductsList');
        
        if (result.products.length === 0) {
            productsContainer.innerHTML = `
                <div class="empty-products">
                    <i class="fas fa-box-open"></i>
                    <p>No hay productos en esta bodega</p>
                </div>`;
        } else {
            productsContainer.innerHTML = result.products.map(product => `
                <div class="product-row">
                    <div class="product-info">
                        <span class="product-name">${Utils.escapeHtml(product.name)}</span>
                        <span class="product-category">${Utils.escapeHtml(product.categoryName)}</span>
                    </div>
                    <span class="product-stock">${Utils.formatQuantity(product.stock)} uds</span>
                </div>
            `).join('');
        }
        
        document.getElementById('warehousesList').style.display = 'none';
        document.getElementById('warehouseDetail').style.display = 'block';
    } catch (error) {
        console.error('Error cargando detalle de bodega:', error);
        Utils.showToast('Error al cargar los detalles', 'danger');
    } finally {
        Utils.hideLoading();
    }
}

function showWarehousesList() {
    document.getElementById('warehouseDetail').style.display = 'none';
    document.getElementById('warehousesList').style.display = 'block';
    currentWarehouse = null;
}

function showWarehouseModal(warehouse = null) {
    const modal = document.getElementById('warehouseModal');
    const title = document.getElementById('warehouseModalTitle');
    const form = document.getElementById('warehouseForm');
    
    form.reset();
    document.getElementById('warehouseId').value = '';
    
    if (warehouse) {
        title.textContent = 'Editar Bodega';
        document.getElementById('warehouseId').value = warehouse.id;
        document.getElementById('warehouseName').value = warehouse.name;
        document.getElementById('warehouseDescription').value = warehouse.description || '';
    } else {
        title.textContent = 'Nueva Bodega';
    }
    
    modal.classList.add('active');
}

function closeWarehouseModal() {
    document.getElementById('warehouseModal').classList.remove('active');
}

async function saveWarehouse() {
    const id = document.getElementById('warehouseId').value;
    const data = {
        name: document.getElementById('warehouseName').value,
        description: document.getElementById('warehouseDescription').value
    };
    
    if (!data.name) {
        Utils.showToast('El nombre es requerido', 'warning');
        return;
    }
    
    try {
        Utils.showLoading();
        
        if (id) {
            const verified = await Utils.promptPassword('Ingrese la contraseña para editar la bodega');
            if (!verified) {
                Utils.hideLoading();
                return;
            }
            
            await Utils.fetch(`/api/warehouses/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            Utils.showToast('Bodega actualizada correctamente', 'success');
        } else {
            await Utils.fetch('/api/warehouses', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            Utils.showToast('Bodega creada correctamente', 'success');
        }
        
        closeWarehouseModal();
        loadWarehouses();
    } catch (error) {
        Utils.showToast(error.message || 'Error al guardar la bodega', 'danger');
    } finally {
        Utils.hideLoading();
    }
}

function editWarehouse(id) {
    const warehouse = warehouses.find(w => w.id === id);
    if (warehouse) {
        showWarehouseModal(warehouse);
    }
}

async function deleteWarehouse(id) {
    const warehouse = warehouses.find(w => w.id === id);
    if (!warehouse) return;
    
    if (warehouse.isDefault) {
        Utils.showToast('No se puede eliminar la bodega por defecto', 'warning');
        return;
    }
    
    const confirmed = await Utils.confirm(`¿Está seguro de eliminar la bodega "${warehouse.name}"?`, 'Eliminar Bodega');
    if (!confirmed) return;
    
    const verified = await Utils.promptPassword('Ingrese la contraseña para eliminar la bodega');
    if (!verified) return;
    
    try {
        Utils.showLoading();
        await Utils.fetch(`/api/warehouses/${id}`, { method: 'DELETE' });
        Utils.showToast('Bodega eliminada correctamente', 'success');
        loadWarehouses();
    } catch (error) {
        Utils.showToast(error.message || 'Error al eliminar la bodega', 'danger');
    } finally {
        Utils.hideLoading();
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}
