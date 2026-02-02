/**
 * Expenses Report Module - Reporte de Gastos
 */

Reports.loaders.expenses = async function() {
    const { startDate, endDate } = Reports.getFilters();
    
    const result = await Utils.fetch(`/api/reports/expenses?startDate=${startDate}&endDate=${endDate}`);
    const report = result.report;
    
    report.expenses.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
    
    Reports.cache.expenses = report;
    Reports.pagination.expenses = 1;
    
    const labels = Object.keys(report.expensesByDay).sort();
    const data = labels.map(date => report.expensesByDay[date]);
    
    Reports.getContent().innerHTML = `
        <div class="stats-grid mb-3">
            <div class="stat-card">
                <div class="stat-icon expenses"><i class="fas fa-arrow-down"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatCurrency(report.stats.totalExpenses)}</h3>
                    <p>Total de Gastos</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon info"><i class="fas fa-receipt"></i></div>
                <div class="stat-info">
                    <h3>${report.stats.expensesCount}</h3>
                    <p>Número de Gastos</p>
                </div>
            </div>
        </div>
        
        <div class="chart-container mb-3">
            <div class="chart-header"><h3>Gastos por Día</h3></div>
            <canvas id="expensesReportChart"></canvas>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Listado de Gastos</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Referencia</th>
                                <th>Concepto</th>
                                <th>Monto</th>
                            </tr>
                        </thead>
                        <tbody id="expensesTableBody"></tbody>
                    </table>
                </div>
                <div id="expensesPagination" class="mt-2"></div>
            </div>
        </div>
    `;
    
    renderExpensesTable();
    
    // Crear gráfica
    if (labels.length > 0) {
        const ctx = document.getElementById('expensesReportChart').getContext('2d');
        if (Reports.charts.expenses) Reports.charts.expenses.destroy();
        Reports.charts.expenses = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(d => Utils.formatDate(d)),
                datasets: [{
                    label: 'Gastos',
                    data: data,
                    backgroundColor: 'rgba(239, 68, 68, 0.5)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }
};

function renderExpensesTable() {
    if (!Reports.cache.expenses) return;
    
    const { items: expenses, currentPage, totalPages } = Utils.paginate(
        Reports.cache.expenses.expenses, Reports.pagination.expenses, Reports.ITEMS_PER_PAGE
    );
    const tbody = document.getElementById('expensesTableBody');
    if (!tbody) return;
    
    if (Reports.cache.expenses.expenses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay gastos en este período</td></tr>';
    } else {
        tbody.innerHTML = expenses.map(e => `
            <tr>
                <td>${Utils.formatDateShort(e.date)}</td>
                <td><code>${e.reference}</code></td>
                <td>${Utils.escapeHtml(e.concept)}</td>
                <td><strong class="text-danger">${Utils.formatCurrency(e.amount)}</strong></td>
            </tr>
        `).join('');
    }
    
    Utils.renderPagination('expensesPagination', currentPage, totalPages, 'goToExpensesPage');
}

function goToExpensesPage(page) {
    Reports.pagination.expenses = page;
    renderExpensesTable();
}
