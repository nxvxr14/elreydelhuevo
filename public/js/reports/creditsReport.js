/**
 * Credits Report Module - Reporte de Créditos
 */

Reports.loaders.credits = async function() {
    const { startDate, endDate, clientId, creditStatus } = Reports.getFilters();
    
    const result = await Utils.fetch('/api/sales?startDate=' + startDate + '&endDate=' + endDate);
    let allSales = result.sales || [];
    
    let creditSales = allSales.filter(s => s.paymentMethod === 'credit');
    
    if (creditStatus === 'pending') {
        creditSales = creditSales.filter(s => s.status === 'pending');
    }
    
    if (clientId) {
        creditSales = creditSales.filter(s => s.clientId === parseInt(clientId));
    }
    
    creditSales.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    
    const totalPending = creditSales.reduce((sum, s) => sum + (s.pendingAmount || 0), 0);
    const totalSalesValue = creditSales.reduce((sum, s) => sum + s.total, 0);
    const pendingCount = creditSales.filter(s => s.status === 'pending').length;
    
    // Calcular abonos y recaudo
    const allCreditsResult = await Utils.fetch('/api/sales');
    let allCreditSales = (allCreditsResult.sales || []).filter(s => s.paymentMethod === 'credit');
    
    if (clientId) {
        allCreditSales = allCreditSales.filter(s => s.clientId === parseInt(clientId));
    }
    
    let abonosDelDia = 0;
    let recaudoCartera = 0;
    
    allCreditSales.forEach(sale => {
        if (sale.payments && sale.payments.length > 0) {
            sale.payments.forEach(payment => {
                if (payment.date >= startDate && payment.date <= endDate) {
                    if (payment.date === sale.date) {
                        abonosDelDia += payment.amount;
                    } else {
                        recaudoCartera += payment.amount;
                    }
                }
            });
        }
    });
    
    Reports.cache.credits = { creditSales, creditStatus };
    Reports.pagination.credits = 1;
    
    Reports.getContent().innerHTML = `
        <div class="stats-grid mb-3">
            <div class="stat-card">
                <div class="stat-icon profit"><i class="fas fa-coins"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatCurrency(totalSalesValue)}</h3>
                    <p>Valor Total Créditos</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(245, 158, 11, 0.15);"><i class="fas fa-clock" style="color: var(--warning);"></i></div>
                <div class="stat-info">
                    <h3 class="text-warning">${Utils.formatCurrency(totalPending)}</h3>
                    <p>Por Cobrar (${pendingCount} pendientes)</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(59, 130, 246, 0.15);"><i class="fas fa-wallet" style="color: #3b82f6;"></i></div>
                <div class="stat-info">
                    <h3 style="color: #3b82f6;">${Utils.formatCurrency(recaudoCartera)}</h3>
                    <p>Recaudo Cartera</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon sales"><i class="fas fa-hand-holding-usd"></i></div>
                <div class="stat-info">
                    <h3 class="text-success">${Utils.formatCurrency(abonosDelDia)}</h3>
                    <p>Abonos del Día</p>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-credit-card" style="margin-right: 0.5rem; color: var(--primary);"></i>Créditos ${creditStatus === 'pending' ? 'Pendientes de Cobro' : '(Todos)'}</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Referencia</th>
                                <th>Cliente</th>
                                <th>Total Venta</th>
                                <th>Abonado</th>
                                <th>Pendiente</th>
                                <th>Estado</th>
                                <th>Acc.</th>
                            </tr>
                        </thead>
                        <tbody id="creditsTableBody"></tbody>
                    </table>
                </div>
                <div id="creditsPagination" class="mt-2"></div>
            </div>
        </div>
    `;
    
    renderCreditsTable();
};

function renderCreditsTable() {
    if (!Reports.cache.credits) return;
    
    const { items: creditSales, currentPage, totalPages } = Utils.paginate(
        Reports.cache.credits.creditSales, Reports.pagination.credits, Reports.ITEMS_PER_PAGE
    );
    const tbody = document.getElementById('creditsTableBody');
    if (!tbody) return;
    
    if (Reports.cache.credits.creditSales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay créditos en este período</td></tr>';
    } else {
        tbody.innerHTML = creditSales.map(s => `
            <tr>
                <td>${Utils.formatDateShort(s.date)}</td>
                <td><code>${s.reference.substring(0, 8)}...</code></td>
                <td>${Utils.escapeHtml(s.clientName)}</td>
                <td>${Utils.formatCurrency(s.total)}</td>
                <td class="text-success">${Utils.formatCurrency(s.paidAmount || 0)}</td>
                <td><strong class="${s.pendingAmount > 0 ? 'text-warning' : 'text-success'}">${Utils.formatCurrency(s.pendingAmount || 0)}</strong></td>
                <td>${s.status === 'pending' ? '<span class="badge badge-warning">Pendiente</span>' : '<span class="badge badge-success">Pagado</span>'}</td>
                <td>
                    <a href="/sales" class="btn btn-sm btn-info" title="Ver en ventas">
                        <i class="fas fa-external-link-alt"></i>
                    </a>
                </td>
            </tr>
        `).join('');
    }
    
    Utils.renderPagination('creditsPagination', currentPage, totalPages, 'goToCreditsPage');
}

function goToCreditsPage(page) {
    Reports.pagination.credits = page;
    renderCreditsTable();
}
