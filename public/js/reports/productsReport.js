/**
 * Products Report Module - Reporte de Productos
 */

Reports.loaders.products = async function() {
    const { startDate, endDate, productId } = Reports.getFilters();
    
    let url = `/api/reports/sales?startDate=${startDate}&endDate=${endDate}`;
    if (productId) url += `&productId=${productId}`;
    
    const result = await Utils.fetch(url);
    const report = result.report;
    
    const productsResult = await Utils.fetch('/api/products');
    const productsMap = {};
    (productsResult.products || []).forEach(p => productsMap[p.id] = p.name);
    
    const productStats = {};
    let totalQuantitySold = 0;
    let totalRevenue = 0;
    
    report.sales.forEach(sale => {
        sale.items.forEach(item => {
            if (!productStats[item.productId]) {
                productStats[item.productId] = {
                    productId: item.productId,
                    productName: productsMap[item.productId] || 'Producto eliminado',
                    quantitySold: 0,
                    totalRevenue: 0
                };
            }
            productStats[item.productId].quantitySold += item.quantity;
            productStats[item.productId].totalRevenue += item.subtotal;
            totalQuantitySold += item.quantity;
            totalRevenue += item.subtotal;
        });
    });
    
    const productsArray = Object.values(productStats).sort((a, b) => b.quantitySold - a.quantitySold);
    
    Reports.cache.products = { products: productsArray, totalQuantitySold, totalRevenue };
    Reports.pagination.products = 1;
    
    Reports.getContent().innerHTML = `
        <div class="stats-grid mb-3">
            <div class="stat-card">
                <div class="stat-icon sales"><i class="fas fa-box"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatQuantity(totalQuantitySold)}</h3>
                    <p>Total Canastas Vendidas</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon info"><i class="fas fa-list"></i></div>
                <div class="stat-info">
                    <h3>${productsArray.length}</h3>
                    <p>Productos Diferentes</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon profit"><i class="fas fa-coins"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatCurrency(totalRevenue)}</h3>
                    <p>Ingresos por Productos</p>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Cantidades Vendidas por Producto</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th style="text-align: right;">Cantidad Vendida</th>
                                <th style="text-align: right;">Total Ingresos</th>
                            </tr>
                        </thead>
                        <tbody id="productsTableBody"></tbody>
                    </table>
                </div>
                <div id="productsPagination" class="mt-2"></div>
            </div>
        </div>
    `;
    
    renderProductsTable();
};

function renderProductsTable() {
    if (!Reports.cache.products) return;
    
    const { items: products, currentPage, totalPages } = Utils.paginate(
        Reports.cache.products.products, Reports.pagination.products, Reports.ITEMS_PER_PAGE
    );
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    if (Reports.cache.products.products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No hay datos de productos en este período</td></tr>';
    } else {
        tbody.innerHTML = products.map(p => `
            <tr>
                <td>${Utils.escapeHtml(p.productName)}</td>
                <td style="text-align: right;"><strong>${Utils.formatQuantity(p.quantitySold)}</strong></td>
                <td style="text-align: right;">${Utils.formatCurrency(p.totalRevenue)}</td>
            </tr>
        `).join('');
    }
    
    Utils.renderPagination('productsPagination', currentPage, totalPages, 'goToProductsPage');
}

function goToProductsPage(page) {
    Reports.pagination.products = page;
    renderProductsTable();
}
