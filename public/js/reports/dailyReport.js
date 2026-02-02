/**
 * Daily Report Module - Reporte Diario
 */

Reports.loaders.daily = async function() {
    const { date } = Reports.getFilters();
    const result = await Utils.fetch(`/api/reports/daily?date=${date}`);
    const report = result.report;
    
    Reports.getContent().innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon sales"><i class="fas fa-shopping-cart"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatCurrency(report.sales.stats.totalSales)}</h3>
                    <p>Ventas (${report.sales.count} transacciones)</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon expenses"><i class="fas fa-arrow-down"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatCurrency(report.expenses.stats.totalExpenses)}</h3>
                    <p>Gastos (${report.expenses.count} registros)</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon profit"><i class="fas fa-coins"></i></div>
                <div class="stat-info">
                    <h3 class="${report.profit >= 0 ? 'text-success' : 'text-danger'}">${Utils.formatCurrency(report.profit)}</h3>
                    <p>Utilidad del Día</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon inventory"><i class="fas fa-warehouse"></i></div>
                <div class="stat-info">
                    <h3>${report.inventory.stats.totalEntries}</h3>
                    <p>Entradas de Inventario</p>
                </div>
            </div>
        </div>
        
        ${report.cashRegister ? `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title"><i class="fas fa-calculator" style="margin-right: 0.5rem; color: var(--primary);"></i>Caja del Día</h3>
                </div>
                <div class="card-body">
                    <p><strong>Estado:</strong> <span class="badge ${report.cashRegister.status === 'closed' ? 'badge-success' : 'badge-info'}">${report.cashRegister.status === 'closed' ? 'Cerrada' : 'Abierta'}</span></p>
                    <p class="mt-1"><strong>Dinero inicial:</strong> ${Utils.formatCurrency(report.cashRegister.initialAmount)}</p>
                    <p class="mt-1"><strong>Dinero final:</strong> ${Utils.formatCurrency(report.cashRegister.expectedAmount)}</p>
                </div>
            </div>
        ` : `
            <div class="card">
                <div class="card-body">
                    <p class="text-muted"><i class="fas fa-info-circle" style="margin-right: 0.5rem;"></i>No hay registro de caja para este día.</p>
                </div>
            </div>
        `}
    `;
};
