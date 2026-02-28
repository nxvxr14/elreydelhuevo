/**
 * Sales Report Module - Reporte de Ventas
 */

Reports.loaders.sales = async function() {
    const { startDate, endDate, clientId, productId, paymentMethod, transferType } = Reports.getFilters();
    
    let url = `/api/reports/sales?startDate=${startDate}&endDate=${endDate}`;
    if (clientId) url += `&clientId=${clientId}`;
    if (productId) url += `&productId=${productId}`;
    
    const result = await Utils.fetch(url);
    let report = result.report;
    
    // Filtro por método de pago (client-side)
    if (paymentMethod) {
        report.sales = report.sales.filter(s => s.paymentMethod === paymentMethod);
        if (paymentMethod === 'transfer' && transferType) {
            report.sales = report.sales.filter(s => s.transferType === transferType);
        }
        
        report.stats.totalSales = report.sales.reduce((sum, s) => sum + s.total, 0);
        report.stats.salesCount = report.sales.length;
        report.stats.averageSale = report.sales.length > 0 ? Math.round(report.stats.totalSales / report.sales.length) : 0;
        
        report.salesByDay = {};
        report.sales.forEach(s => {
            if (!report.salesByDay[s.date]) report.salesByDay[s.date] = 0;
            report.salesByDay[s.date] += s.total;
        });
    }
    
    report.sales.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    
    Reports.cache.sales = report;
    Reports.pagination.sales = 1;
    
    const labels = Object.keys(report.salesByDay).sort();
    const data = labels.map(date => report.salesByDay[date]);
    
    const paymentLabels = { '': '', 'cash': 'Efectivo', 'transfer': 'Transferencia', 'credit': 'Crédito' };
    const transferLabels = { '': '', 'nequi': ' (Nequi)', 'bancolombia': ' (Bancolombia)', 'davivienda': ' (Davivienda)' };
    const filterLabel = paymentMethod ? ` - ${paymentLabels[paymentMethod]}${paymentMethod === 'transfer' ? (transferLabels[transferType] || '') : ''}` : '';
    
    Reports.getContent().innerHTML = `
        <div class="stats-grid mb-3">
            <div class="stat-card">
                <div class="stat-icon sales"><i class="fas fa-chart-line"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatCurrency(report.stats.totalSales)}</h3>
                    <p>Total de Ventas${filterLabel}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon info"><i class="fas fa-receipt"></i></div>
                <div class="stat-info">
                    <h3>${report.stats.salesCount}</h3>
                    <p>Número de Ventas</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon profit"><i class="fas fa-calculator"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatCurrency(report.stats.averageSale)}</h3>
                    <p>Promedio por Venta</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(14, 165, 233, 0.15);"><i class="fas fa-boxes" style="color: #0ea5e9;"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatQuantity(report.sales.reduce((sum, sale) => sum + (sale.items || []).reduce((itemSum, item) => itemSum + (item.quantity || 0), 0), 0))}</h3>
                    <p>Canastas Vendidas</p>
                </div>
            </div>
        </div>
        
        <div class="chart-container mb-3">
            <div class="chart-header"><h3>Ventas por Día${filterLabel}</h3></div>
            <canvas id="salesReportChart"></canvas>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Listado de Ventas${filterLabel}</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Referencia</th>
                                <th>Cliente</th>
                                <th>Método</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody id="salesTableBody"></tbody>
                    </table>
                </div>
                <div id="salesPagination" class="mt-2"></div>
            </div>
        </div>
    `;
    
    renderSalesTable();
    
    // Crear gráfica
    if (labels.length > 0) {
        const ctx = document.getElementById('salesReportChart').getContext('2d');
        if (Reports.charts.sales) Reports.charts.sales.destroy();
        Reports.charts.sales = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(d => Utils.formatDate(d)),
                datasets: [{
                    label: 'Ventas',
                    data: data,
                    backgroundColor: 'rgba(34, 197, 94, 0.5)',
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }
};

function renderSalesTable() {
    if (!Reports.cache.sales) return;
    
    const { items: sales, currentPage, totalPages } = Utils.paginate(
        Reports.cache.sales.sales, Reports.pagination.sales, Reports.ITEMS_PER_PAGE
    );
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;
    
    if (Reports.cache.sales.sales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay ventas en este período</td></tr>';
    } else {
        tbody.innerHTML = sales.map(s => {
            const methodDisplay = s.paymentMethod === 'cash' ? 'Efectivo' : 
                                  s.paymentMethod === 'transfer' ? `Transfer${s.transferType ? ' (' + s.transferType.charAt(0).toUpperCase() + s.transferType.slice(1) + ')' : ''}` :
                                  s.paymentMethod === 'credit' ? 'Crédito' : s.paymentMethod;
            const badgeClass = s.paymentMethod === 'cash' ? 'badge-success' : s.paymentMethod === 'transfer' ? 'badge-info' : 'badge-warning';
            return `
                <tr>
                    <td>${Utils.formatDateShort(s.date)}</td>
                    <td><code>${s.reference}</code></td>
                    <td>${Utils.escapeHtml(s.clientName)}</td>
                    <td><span class="badge ${badgeClass}">${methodDisplay}</span></td>
                    <td><strong>${Utils.formatCurrency(s.total)}</strong></td>
                </tr>
            `;
        }).join('');
    }
    
    Utils.renderPagination('salesPagination', currentPage, totalPages, 'goToSalesPage');
}

function goToSalesPage(page) {
    Reports.pagination.sales = page;
    renderSalesTable();
}
