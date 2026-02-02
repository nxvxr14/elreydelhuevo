/**
 * Daily Report Module - Reporte Diario
 */

Reports.loaders.daily = async function() {
    const { date } = Reports.getFilters();
    
    // Obtener reporte diario general
    const result = await Utils.fetch(`/api/reports/daily?date=${date}`);
    const report = result.report;
    
    // Obtener estadísticas de abonos de cartera del día
    const paymentStats = await Utils.fetch(`/api/portfolio/stats?startDate=${date}&endDate=${date}`);
    const abonosDelDia = paymentStats.totalPayments || 0;
    
    // Calcular ingreso real (ventas + abonos cartera)
    // Los abonos del día para ventas a crédito del mismo día ya están en salesStats
    // Pero los abonos de facturas anteriores vienen del sistema de cartera
    const ingresoEfectivo = report.sales.stats.cashTotal || 0;
    const ingresoTransferencia = report.sales.stats.transferTotal || 0;
    const abonosCreditoDelDia = report.sales.stats.creditPaidTotal || 0;
    const ingresoTotal = report.sales.stats.totalIncome || 0;
    
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
                <div class="stat-icon" style="background: rgba(59, 130, 246, 0.15);"><i class="fas fa-wallet" style="color: #3b82f6;"></i></div>
                <div class="stat-info">
                    <h3 style="color: #3b82f6;">${Utils.formatCurrency(ingresoTotal)}</h3>
                    <p>Ingresos del Día</p>
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
        </div>
        
        <!-- Desglose de Ingresos -->
        <div class="card mb-2">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-money-bill-wave" style="margin-right: 0.5rem; color: var(--success);"></i>Desglose de Ingresos</h3>
            </div>
            <div class="card-body">
                <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
                    <div style="padding: 1rem; text-align: center; background: var(--bg-input); border-radius: 8px;">
                        <div style="font-size: 1.25rem; font-weight: 600; color: var(--success);">${Utils.formatCurrency(ingresoEfectivo)}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-money-bill-wave"></i> Efectivo</div>
                    </div>
                    <div style="padding: 1rem; text-align: center; background: var(--bg-input); border-radius: 8px;">
                        <div style="font-size: 1.25rem; font-weight: 600; color: #3b82f6;">${Utils.formatCurrency(ingresoTransferencia)}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-university"></i> Transferencia</div>
                    </div>
                    <div style="padding: 1rem; text-align: center; background: var(--bg-input); border-radius: 8px;">
                        <div style="font-size: 1.25rem; font-weight: 600; color: var(--warning);">${Utils.formatCurrency(abonosCreditoDelDia)}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-hand-holding-usd"></i> Abonos Cartera</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Información de Inventario -->
        <div class="card mb-2">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-warehouse" style="margin-right: 0.5rem; color: var(--primary);"></i>Inventario del Día</h3>
            </div>
            <div class="card-body">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <div style="padding: 1rem; text-align: center; background: var(--bg-input); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 600; color: var(--success);">${report.inventory.stats.totalEntries || 0}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-arrow-up"></i> Entradas</div>
                    </div>
                    <div style="padding: 1rem; text-align: center; background: var(--bg-input); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 600; color: var(--danger);">${report.inventory.stats.totalExits || 0}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-arrow-down"></i> Salidas</div>
                    </div>
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
