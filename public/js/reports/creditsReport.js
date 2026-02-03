/**
 * Credits Report Module - Reporte de Créditos Pendientes
 * Muestra SOLO los créditos pendientes de pago (no los pagados completamente)
 */

Reports.loaders.credits = async function() {
    const { startDate, endDate, clientId, creditStatus } = Reports.getFilters();
    
    // Obtener datos de cartera
    const portfolioResult = await Utils.fetch('/api/portfolio');
    let clientsWithCredits = portfolioResult.clients || [];
    
    // IMPORTANTE: Filtrar SOLO clientes con créditos pendientes (totalPending > 0)
    clientsWithCredits = clientsWithCredits.filter(c => c.totalPending > 0);
    
    // Filtrar por cliente si se seleccionó
    if (clientId) {
        clientsWithCredits = clientsWithCredits.filter(c => c.clientId === parseInt(clientId));
    }
    
    // Ordenar por saldo pendiente (mayor primero)
    clientsWithCredits.sort((a, b) => b.totalPending - a.totalPending);
    
    // Calcular totales (solo de créditos pendientes)
    const totalPendingFiltered = clientsWithCredits.reduce((sum, c) => sum + c.totalPending, 0);
    const totalCreditFiltered = clientsWithCredits.reduce((sum, c) => sum + c.totalCredit, 0);
    const totalBasketsFiltered = clientsWithCredits.reduce((sum, c) => sum + c.totalBaskets, 0);
    
    Reports.cache.credits = { clientsWithCredits };
    Reports.pagination.credits = 1;
    
    // Alertas de cartera
    const criticalCount = clientsWithCredits.filter(c => c.urgency === 'critical').length;
    const warningCount = clientsWithCredits.filter(c => c.urgency === 'warning').length;
    const alertHtml = (criticalCount + warningCount) > 0 ? `
        <div class="alert alert-warning mb-2" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border-radius: 8px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger);">
            <i class="fas fa-exclamation-triangle" style="font-size: 1.5rem; color: var(--danger);"></i>
            <div>
                <strong style="color: var(--danger);">Alertas de Cartera</strong><br>
                <small>${criticalCount} cliente(s) con más de 30 días • ${warningCount} cliente(s) con 15-29 días</small>
            </div>
        </div>
    ` : '';
    
    Reports.getContent().innerHTML = `
        ${alertHtml}
        
        <div class="stats-grid mb-3">
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(245, 158, 11, 0.15);"><i class="fas fa-clock" style="color: var(--warning);"></i></div>
                <div class="stat-info">
                    <h3 class="text-warning">${Utils.formatCurrency(totalPendingFiltered)}</h3>
                    <p>Total Pendiente</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon profit"><i class="fas fa-coins"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatCurrency(totalCreditFiltered)}</h3>
                    <p>Total Créditos Otorgados</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-boxes"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatQuantity(totalBasketsFiltered)}</h3>
                    <p>Canastas en Crédito</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-users"></i></div>
                <div class="stat-info">
                    <h3>${clientsWithCredits.length}</h3>
                    <p>Clientes con Crédito Pendiente</p>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-credit-card" style="margin-right: 0.5rem; color: var(--primary);"></i>Créditos Pendientes (${clientsWithCredits.length} clientes)</h3>
                <a href="/portfolio" class="btn btn-sm btn-primary" style="margin-left: auto;">
                    <i class="fas fa-external-link-alt"></i> Ir a Cartera
                </a>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Total Créditos</th>
                                <th>Total Abonado</th>
                                <th>Saldo Pendiente</th>
                                <th>Canastas</th>
                                <th>Días Mora</th>
                                <th>Estado</th>
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
    
    const { items: clients, currentPage, totalPages } = Utils.paginate(
        Reports.cache.credits.clientsWithCredits, Reports.pagination.credits, Reports.ITEMS_PER_PAGE
    );
    const tbody = document.getElementById('creditsTableBody');
    if (!tbody) return;
    
    if (Reports.cache.credits.clientsWithCredits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay clientes con créditos pendientes</td></tr>';
    } else {
        const urgencyLabels = {
            critical: '<span class="badge badge-danger">+30 días</span>',
            warning: '<span class="badge badge-warning">15-29 días</span>',
            attention: '<span class="badge" style="background: #f97316; color: white;">7-14 días</span>',
            normal: '<span class="badge" style="background: #3b82f6; color: white;">Recién</span>'
        };
        
        tbody.innerHTML = clients.map(client => `
            <tr>
                <td>
                    <strong>${Utils.escapeHtml(client.clientName)}</strong>
                    ${client.clientPhone ? `<br><small class="text-muted">${Utils.escapeHtml(client.clientPhone)}</small>` : ''}
                </td>
                <td>${Utils.formatCurrency(client.totalCredit)}</td>
                <td class="text-success">${Utils.formatCurrency(client.totalPaid)}</td>
                <td><strong class="text-warning">${Utils.formatCurrency(client.totalPending)}</strong></td>
                <td>${Utils.formatQuantity(client.totalBaskets)}</td>
                <td>${client.daysPastDue} días</td>
                <td>${urgencyLabels[client.urgency] || urgencyLabels.normal}</td>
            </tr>
        `).join('');
    }
    
    Utils.renderPagination('creditsPagination', currentPage, totalPages, 'goToCreditsPage');
}

function goToCreditsPage(page) {
    Reports.pagination.credits = page;
    renderCreditsTable();
}
