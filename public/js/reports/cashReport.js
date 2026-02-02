/**
 * Cash Report Module - Reporte de Cajas
 */

Reports.loaders.cash = async function() {
    const { startDate, endDate } = Reports.getFilters();
    
    const result = await Utils.fetch(`/api/reports/cash?startDate=${startDate}&endDate=${endDate}`);
    const report = result.report;
    
    report.registers.sort((a, b) => b.date.localeCompare(a.date));
    
    Reports.cache.cash = report;
    Reports.pagination.cash = 1;
    
    Reports.getContent().innerHTML = `
        <div class="stats-grid mb-3">
            <div class="stat-card">
                <div class="stat-icon sales"><i class="fas fa-chart-line"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatCurrency(report.totals.totalSales)}</h3>
                    <p>Total Ventas</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon expenses"><i class="fas fa-arrow-down"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatCurrency(report.totals.totalExpenses)}</h3>
                    <p>Total Gastos</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon profit"><i class="fas fa-coins"></i></div>
                <div class="stat-info">
                    <h3 class="${(report.totals.totalSales - report.totals.totalExpenses) >= 0 ? 'text-success' : 'text-danger'}">
                        ${Utils.formatCurrency(report.totals.totalSales - report.totals.totalExpenses)}
                    </h3>
                    <p>Utilidad Total</p>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-calculator" style="margin-right: 0.5rem; color: var(--primary);"></i>Historial de Cajas</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Referencia</th>
                                <th>Inicial</th>
                                <th>Ventas</th>
                                <th>Gastos</th>
                                <th>Final</th>
                            </tr>
                        </thead>
                        <tbody id="cashTableBody"></tbody>
                    </table>
                </div>
                <div id="cashPagination" class="mt-2"></div>
            </div>
        </div>
    `;
    
    renderCashTable();
};

function renderCashTable() {
    if (!Reports.cache.cash) return;
    
    const { items: registers, currentPage, totalPages } = Utils.paginate(
        Reports.cache.cash.registers, Reports.pagination.cash, Reports.ITEMS_PER_PAGE
    );
    const tbody = document.getElementById('cashTableBody');
    if (!tbody) return;
    
    if (Reports.cache.cash.registers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay registros de caja en este período</td></tr>';
    } else {
        tbody.innerHTML = registers.map(r => `
            <tr>
                <td>${Utils.formatDateShort(r.date)}</td>
                <td><code>${r.reference}</code></td>
                <td>${Utils.formatCurrency(r.initialAmount)}</td>
                <td class="text-success">${Utils.formatCurrency(r.totalSales)}</td>
                <td class="text-danger">${Utils.formatCurrency(r.totalExpenses)}</td>
                <td><strong>${Utils.formatCurrency(r.expectedAmount)}</strong></td>
            </tr>
        `).join('');
    }
    
    Utils.renderPagination('cashPagination', currentPage, totalPages, 'goToCashPage');
}

function goToCashPage(page) {
    Reports.pagination.cash = page;
    renderCashTable();
}
