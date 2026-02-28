/**
 * Payments Report Module - Reporte de Abonos
 * Muestra el total de dinero abonado, desglose por método de pago y lista de abonos
 */

Reports.loaders.payments = async function() {
    const { startDate, endDate, clientId } = Reports.getFilters();
    
    // Obtener estadísticas de abonos del período
    const paymentStats = await Utils.fetch(`/api/portfolio/stats?startDate=${startDate}&endDate=${endDate}`);
    
    let payments = paymentStats.payments || [];
    
    // Filtrar por cliente si se seleccionó
    if (clientId) {
        payments = payments.filter(p => p.clientId === parseInt(clientId));
    }
    
    // Recalcular totales filtrados
    let totalPayments = 0;
    let cashTotal = 0;
    let transferTotal = 0;
    let nequiTotal = 0;
    let bancolombiaTotal = 0;
    let daviviendaTotal = 0;
    
    payments.forEach(payment => {
        totalPayments += payment.amount;
        if (payment.paymentMethod === 'cash') {
            cashTotal += payment.amount;
        } else if (payment.paymentMethod === 'transfer') {
            transferTotal += payment.amount;
            if (payment.transferType === 'nequi') nequiTotal += payment.amount;
            else if (payment.transferType === 'bancolombia') bancolombiaTotal += payment.amount;
            else if (payment.transferType === 'davivienda') daviviendaTotal += payment.amount;
        }
    });

    const averagePayment = payments.length > 0 ? (totalPayments / payments.length) : 0;
    
    // Obtener nombres de clientes
    const clientsResult = await Utils.fetch('/api/clients');
    const clients = clientsResult.clients || [];
    
    Reports.cache.payments = { payments };
    Reports.pagination.payments = 1;
    
    Reports.getContent().innerHTML = `
        <div class="stats-grid mb-3">
            <div class="stat-card">
                <div class="stat-icon sales"><i class="fas fa-hand-holding-usd"></i></div>
                <div class="stat-info">
                    <h3 class="text-success">${Utils.formatCurrency(Math.round(totalPayments))}</h3>
                    <p>Total Abonado (${payments.length} abonos)</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(34, 197, 94, 0.15);"><i class="fas fa-money-bill-wave" style="color: var(--success);"></i></div>
                <div class="stat-info">
                    <h3 style="color: var(--success);">${Utils.formatCurrency(Math.round(cashTotal))}</h3>
                    <p>En Efectivo</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(59, 130, 246, 0.15);"><i class="fas fa-university" style="color: #3b82f6;"></i></div>
                <div class="stat-info">
                    <h3 style="color: #3b82f6;">${Utils.formatCurrency(Math.round(transferTotal))}</h3>
                    <p>En Transferencia</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i class="fas fa-list"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatCurrency(Math.round(averagePayment))}</h3>
                    <p>Promedio por Abono</p>
                </div>
            </div>
        </div>
        
        ${transferTotal > 0 ? `
            <div class="card mb-3">
                <div class="card-header">
                    <h3 class="card-title"><i class="fas fa-university" style="margin-right: 0.5rem; color: var(--primary);"></i>Desglose por Tipo de Transferencia</h3>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                        <div style="padding: 1rem; text-align: center; background: var(--bg-input); border-radius: 8px;">
                            <div style="font-size: 1.25rem; font-weight: 600; color: #a855f7;">${Utils.formatCurrency(Math.round(nequiTotal))}</div>
                            <div style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-mobile-alt"></i> Nequi</div>
                        </div>
                        <div style="padding: 1rem; text-align: center; background: var(--bg-input); border-radius: 8px;">
                            <div style="font-size: 1.25rem; font-weight: 600; color: #fbbf24;">${Utils.formatCurrency(Math.round(bancolombiaTotal))}</div>
                            <div style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-university"></i> Bancolombia</div>
                        </div>
                        <div style="padding: 1rem; text-align: center; background: var(--bg-input); border-radius: 8px;">
                            <div style="font-size: 1.25rem; font-weight: 600; color: #ef4444;">${Utils.formatCurrency(Math.round(daviviendaTotal))}</div>
                            <div style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-university"></i> Davivienda</div>
                        </div>
                    </div>
                </div>
            </div>
        ` : ''}
        
        <div class="card">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-list" style="margin-right: 0.5rem; color: var(--primary);"></i>Lista de Abonos</h3>
            </div>
            <div class="card-body">
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Referencia</th>
                                <th>Cliente</th>
                                <th>Monto</th>
                                <th>Método</th>
                                <th>Aplicado a</th>
                            </tr>
                        </thead>
                        <tbody id="paymentsTableBody"></tbody>
                    </table>
                </div>
                <div id="paymentsPagination" class="mt-2"></div>
            </div>
        </div>
    `;
    
    renderPaymentsTable(clients);
};

function renderPaymentsTable(clients) {
    if (!Reports.cache.payments) return;
    
    const { items: payments, currentPage, totalPages } = Utils.paginate(
        Reports.cache.payments.payments, Reports.pagination.payments, Reports.ITEMS_PER_PAGE
    );
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    
    if (Reports.cache.payments.payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay abonos en este período</td></tr>';
    } else {
        const transferLabels = { nequi: 'Nequi', bancolombia: 'Bancolombia', davivienda: 'Davivienda' };
        
        tbody.innerHTML = payments.map(payment => {
            const client = clients.find(c => c.id === payment.clientId);
            const clientName = client ? client.name : 'Cliente eliminado';
            
            let methodLabel = payment.paymentMethod === 'transfer' 
                ? `Transfer (${transferLabels[payment.transferType] || payment.transferType})`
                : 'Efectivo';
            
            // Format applied sales
            let appliedTo = '-';
            if (payment.appliedToSales && payment.appliedToSales.length > 0) {
                appliedTo = payment.appliedToSales.map(s => 
                    `${s.saleReference.substring(0, 10)}... (${Utils.formatCurrency(s.amountApplied)})`
                ).join('<br>');
            }
            
            return `
                <tr>
                    <td>${Utils.formatDateShort(payment.date)}</td>
                    <td><code>${payment.reference.substring(0, 12)}...</code></td>
                    <td>${Utils.escapeHtml(clientName)}</td>
                    <td style="color: var(--success); font-weight: 600;">${Utils.formatCurrency(payment.amount)}</td>
                    <td><span class="badge ${payment.paymentMethod === 'transfer' ? 'badge-info' : 'badge-success'}">${methodLabel}</span></td>
                    <td style="font-size: 0.85rem;">${appliedTo}</td>
                </tr>
            `;
        }).join('');
    }
    
    Utils.renderPagination('paymentsPagination', currentPage, totalPages, 'goToPaymentsPage');
}

function goToPaymentsPage(page) {
    Reports.pagination.payments = page;
    if (Reports.cache.payments) {
        Utils.fetch('/api/clients').then(result => {
            const clients = result.clients || [];
            renderPaymentsTable(clients);
        });
    }
}
