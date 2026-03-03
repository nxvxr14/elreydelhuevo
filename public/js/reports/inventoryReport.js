/**
 * Inventory Report Module - Reporte de Inventario
 */

const EXIT_REASONS = {
    waste: 'Desecho',
    cracked: 'Picado',
    adjustment: 'Ajuste de inventario',
    gift_rodrigo: 'Obsequio Rodrigo'
};

Reports.loaders.inventory = async function() {
    const { startDate, endDate, productId } = Reports.getFilters();
    
    let url = `/api/reports/inventory?startDate=${startDate}&endDate=${endDate}`;
    if (productId) url += `&productId=${productId}`;
    
    const result = await Utils.fetch(url);
    const report = result.report;
    
    report.entries.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
    
    Reports.cache.inventory = report;
    Reports.pagination.inventory = 1;
    
    const entries = report.entries.filter(e => (e.type || 'entry') === 'entry');
    const exits = report.entries.filter(e => e.type === 'exit');
    const totalEntriesQty = entries.reduce((sum, e) => sum + e.quantity, 0);
    const totalExitsQty = exits.reduce((sum, e) => sum + e.quantity, 0);
    const totalCurrentStock = report.totalStock || report.currentStock.reduce((sum, p) => sum + (p.stock || 0), 0);
    
    Reports.getContent().innerHTML = `
        <div class="stats-grid mb-3">
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(34, 197, 94, 0.15);"><i class="fas fa-arrow-up" style="color: var(--success);"></i></div>
                <div class="stat-info">
                    <h3 class="text-success">${Utils.formatQuantity(totalEntriesQty)}</h3>
                    <p>Unidades Ingresadas (${entries.length})</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(239, 68, 68, 0.15);"><i class="fas fa-arrow-down" style="color: var(--danger);"></i></div>
                <div class="stat-info">
                    <h3 class="text-danger">${Utils.formatQuantity(totalExitsQty)}</h3>
                    <p>Unidades Retiradas (${exits.length})</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon info"><i class="fas fa-balance-scale"></i></div>
                <div class="stat-info">
                    <h3 class="${(totalEntriesQty - totalExitsQty) >= 0 ? 'text-success' : 'text-danger'}">${totalEntriesQty >= totalExitsQty ? '+' : ''}${Utils.formatQuantity(totalEntriesQty - totalExitsQty)}</h3>
                    <p>Cambio Neto</p>
                </div>
            </div>
        </div>
        
        <div class="card mb-3">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-boxes" style="margin-right: 0.5rem; color: var(--primary);"></i>Stock Actual</h3>
                <div class="text-muted" style="font-size: 0.9rem;">Total: <strong style="color: var(--text-primary);">${Utils.formatQuantity(totalCurrentStock)}</strong></div>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Producto</th>
                                <th>Stock Total</th>
                                <th>Detalle por Bodega</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.currentStock.map(p => `
                                <tr onclick="toggleWarehouseDetails(${p.id})" style="cursor: pointer;">
                                    <td>${p.id}</td>
                                    <td>${Utils.escapeHtml(p.name)}</td>
                                    <td>
                                        <span class="badge ${p.stock === 0 ? 'badge-danger' : p.stock < 10 ? 'badge-warning' : 'badge-success'}">
                                            ${Utils.formatQuantity(p.stock)}
                                        </span>
                                    </td>
                                    <td class="text-muted" style="font-size: 0.85rem;">
                                        <i class="fas fa-warehouse"></i> Ver bodegas
                                    </td>
                                </tr>
                                <tr class="warehouse-detail-row" data-product-id="${p.id}" style="display: none;">
                                    <td colspan="4">
                                        <div class="warehouse-detail" id="warehouseDetail-${p.id}"></div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-history" style="margin-right: 0.5rem; color: var(--primary);"></i>Historial de Movimientos</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Referencia</th>
                                <th>Tipo</th>
                                <th>Producto</th>
                                <th>Cantidad</th>
                                <th>Origen/Motivo</th>
                            </tr>
                        </thead>
                        <tbody id="inventoryTableBody"></tbody>
                    </table>
                </div>
                <div id="inventoryPagination" class="mt-2"></div>
            </div>
        </div>
    `;
    
    renderInventoryTable();
};

function renderInventoryTable() {
    if (!Reports.cache.inventory) return;
    
    const { items: entries, currentPage, totalPages } = Utils.paginate(
        Reports.cache.inventory.entries, Reports.pagination.inventory, Reports.ITEMS_PER_PAGE
    );
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    
    if (Reports.cache.inventory.entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay movimientos en este período</td></tr>';
    } else {
        tbody.innerHTML = entries.map(e => {
            const type = e.type || 'entry';
            let typeClass = 'badge-success';
            let typeLabel = 'Entrada';
            let quantityPrefix = '+';
            let originOrReason = Utils.escapeHtml(e.origin || '');

            if (type === 'exit') {
                typeClass = 'badge-danger';
                typeLabel = 'Salida';
                quantityPrefix = '-';
                originOrReason = EXIT_REASONS[e.reason] || e.reason || '';
            } else if (type === 'transfer') {
                typeClass = 'badge-primary';
                typeLabel = 'Traslado';
                quantityPrefix = '';
                const fromName = e.fromWarehouseName ? Utils.escapeHtml(e.fromWarehouseName) : 'N/A';
                const toName = e.toWarehouseName ? Utils.escapeHtml(e.toWarehouseName) : 'N/A';
                const transferLabel = `${fromName} -> ${toName}`;
                const note = e.note ? Utils.escapeHtml(e.note) : '';
                originOrReason = note ? `${note} <span class="text-muted">(${transferLabel})</span>` : transferLabel;
            } else if (type === 'exchange') {
                typeClass = 'badge-warning';
                typeLabel = 'Intercambio';
                quantityPrefix = '';
                const sourceName = e.sourceProductName ? Utils.escapeHtml(e.sourceProductName) : 'N/A';
                const targetName = e.targetProductName ? Utils.escapeHtml(e.targetProductName) : 'N/A';
                const warehouseName = e.warehouseName ? Utils.escapeHtml(e.warehouseName) : 'N/A';
                const exchangeLabel = `${sourceName} -> ${targetName} (${warehouseName})`;
                const note = e.note ? Utils.escapeHtml(e.note) : '';
                originOrReason = note ? `${note} <span class="text-muted">(${exchangeLabel})</span>` : exchangeLabel;
            }
            
            return `
                <tr>
                    <td>${Utils.formatDateShort(e.date)}</td>
                    <td><code>${e.reference}</code></td>
                    <td><span class="badge ${typeClass}">${typeLabel}</span></td>
                    <td>${Utils.escapeHtml(e.productName)}</td>
                    <td><span class="badge ${typeClass}">${quantityPrefix}${Utils.formatQuantity(e.quantity)}</span></td>
                    <td>${originOrReason}</td>
                </tr>
            `;
        }).join('');
    }
    
    Utils.renderPagination('inventoryPagination', currentPage, totalPages, 'goToInventoryPage');
}

function goToInventoryPage(page) {
    Reports.pagination.inventory = page;
    renderInventoryTable();
}

function toggleWarehouseDetails(productId) {
    if (!Reports.cache.inventory) return;
    const detailRow = document.querySelector(`.warehouse-detail-row[data-product-id="${productId}"]`);
    const detailContainer = document.getElementById(`warehouseDetail-${productId}`);
    if (!detailRow || !detailContainer) return;

    if (!detailContainer.dataset.loaded) {
        const report = Reports.cache.inventory;
        const product = report.currentStock.find(p => p.id === productId);
        const warehouses = report.warehouses || [];
        const warehouseMap = {};
        warehouses.forEach(w => { warehouseMap[String(w.id)] = w.name; });

        if (!product) {
            detailContainer.innerHTML = '<span class="text-muted">Producto no encontrado</span>';
        } else {
            const stockEntries = Object.entries(product.warehouseStock || {});
            const visibleEntries = stockEntries.filter(([, qty]) => (qty || 0) > 0);

            if (visibleEntries.length === 0) {
                detailContainer.innerHTML = '<span class="text-muted">Sin stock en bodegas</span>';
            } else {
                detailContainer.innerHTML = `
                    <div class="d-flex flex-wrap gap-1">
                        ${visibleEntries.map(([warehouseId, qty]) => {
                            const name = warehouseMap[warehouseId] || `Bodega ${warehouseId}`;
                            return `<span class="badge badge-secondary">${Utils.escapeHtml(name)}: ${Utils.formatQuantity(qty)}</span>`;
                        }).join('')}
                    </div>
                `;
            }
        }

        detailContainer.dataset.loaded = 'true';
    }

    if (detailRow.style.display === 'none' || detailRow.style.display === '') {
        detailRow.style.display = 'table-row';
    } else {
        detailRow.style.display = 'none';
    }
}
