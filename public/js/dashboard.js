/**
 * Módulo del Dashboard
 */

let salesChart = null;
let expensesChart = null;
let combinedChart = null;
let availablePeriods = null;
let creditsSummary = null;

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

document.addEventListener('DOMContentLoaded', async () => {
    await initMonthSelector();
    loadDashboard();
    
    // Agregar event listeners después de la carga inicial
    document.getElementById('monthSelect').addEventListener('change', loadDashboard);
    document.getElementById('yearSelect').addEventListener('change', updateMonthOptions);
});

async function initMonthSelector() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    try {
        // Cargar períodos disponibles desde el servidor
        const result = await Utils.fetch('/api/dashboard/periods');
        availablePeriods = result;
        
        // Llenar años
        yearSelect.innerHTML = '';
        result.years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            option.selected = parseInt(year) === currentYear;
            yearSelect.appendChild(option);
        });
        
        // Llenar meses del año seleccionado
        updateMonthOptions();
        
    } catch (error) {
        console.error('Error cargando períodos:', error);
        // Fallback: mostrar solo mes y año actual
        yearSelect.innerHTML = `<option value="${currentYear}" selected>${currentYear}</option>`;
        monthSelect.innerHTML = `<option value="${currentMonth}" selected>${MONTH_NAMES[currentMonth - 1]}</option>`;
    }
}

function updateMonthOptions() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const selectedYear = yearSelect.value;
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    monthSelect.innerHTML = '';
    
    if (availablePeriods && availablePeriods.monthsByYear[selectedYear]) {
        const months = availablePeriods.monthsByYear[selectedYear];
        months.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.textContent = MONTH_NAMES[month - 1];
            // Seleccionar el mes actual si estamos en el año actual, sino el primer mes disponible
            if (parseInt(selectedYear) === currentYear && month === currentMonth) {
                option.selected = true;
            } else if (months.indexOf(month) === 0) {
                option.selected = true;
            }
            monthSelect.appendChild(option);
        });
    } else {
        // Fallback
        const option = document.createElement('option');
        option.value = currentMonth;
        option.textContent = MONTH_NAMES[currentMonth - 1];
        option.selected = true;
        monthSelect.appendChild(option);
    }
    
    // Recargar datos
    loadDashboard();
}

async function loadDashboard() {
    try {
        Utils.showLoading();
        
        const month = document.getElementById('monthSelect').value;
        const year = document.getElementById('yearSelect').value;
        
        // Cargar métricas y datos del dashboard
        const [summaryResult, metricsResult, chartResult] = await Promise.all([
            Utils.fetch('/api/dashboard/summary'),
            Utils.fetch(`/api/dashboard/metrics?year=${year}&month=${month}`),
            Utils.fetch(`/api/dashboard/charts?year=${year}&month=${month}`)
        ]);
        
        // Actualizar estadísticas
        updateStats(metricsResult.metrics);
        
        // Actualizar estado de caja
        updateCashStatus(summaryResult.cashStatus);
        
        // Actualizar productos con bajo stock
        updateLowStock(summaryResult.lowStockProducts);
        
        // Actualizar créditos pendientes
        updateCreditsAlerts(summaryResult.creditsSummary);
        
        // Actualizar gráficos
        updateCharts(chartResult.chartData);
        
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        Utils.showToast('Error al cargar el dashboard', 'danger');
    } finally {
        Utils.hideLoading();
    }
}

function updateStats(metrics) {
    document.getElementById('totalSales').textContent = Utils.formatCurrency(metrics.sales.totalSales);
    document.getElementById('totalExpenses').textContent = Utils.formatCurrency(metrics.expenses.totalExpenses);
    document.getElementById('totalProfit').textContent = Utils.formatCurrency(metrics.profit);
    
    // Colorear la utilidad según sea positiva o negativa
    const profitElement = document.getElementById('totalProfit');
    if (metrics.profit < 0) {
        profitElement.style.color = 'var(--danger)';
    } else {
        profitElement.style.color = 'var(--success)';
    }
}

function updateCashStatus(cashStatus) {
    const container = document.getElementById('cashStatus');
    
    if (cashStatus.isOpen) {
        container.innerHTML = `
            <div class="d-flex justify-between align-center flex-wrap gap-2">
                <div>
                    <span class="badge badge-success">Caja Abierta</span>
                    <p class="mt-1">
                        <strong>Dinero inicial:</strong> ${Utils.formatCurrency(cashStatus.register.initialAmount)}<br>
                        <strong>Ventas del día:</strong> ${Utils.formatCurrency(cashStatus.register.totalSales)}<br>
                        <strong>Gastos del día:</strong> ${Utils.formatCurrency(cashStatus.register.totalExpenses)}<br>
                        <strong>En caja:</strong> ${Utils.formatCurrency(cashStatus.register.currentAmount)}
                    </p>
                </div>
                <a href="/pos" class="btn btn-primary">
                    <i class="fas fa-cash-register"></i>
                    Ir al POS
                </a>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="d-flex justify-between align-center flex-wrap gap-2">
                <div>
                    <span class="badge badge-warning">Caja Cerrada</span>
                    <p class="mt-1 text-muted">No hay una caja abierta. Debe abrir la caja para realizar ventas.</p>
                </div>
                <a href="/pos" class="btn btn-primary">
                    <i class="fas fa-door-open"></i>
                    Abrir Caja
                </a>
            </div>
        `;
    }
}

function updateLowStock(products) {
    const card = document.getElementById('lowStockCard');
    const table = document.getElementById('lowStockTable');
    
    if (products.length === 0) {
        card.style.display = 'none';
        return;
    }
    
    card.style.display = 'block';
    table.innerHTML = products.map(product => `
        <tr>
            <td>${Utils.escapeHtml(product.name)}</td>
            <td>
                <span class="badge ${product.stock === 0 ? 'badge-danger' : 'badge-warning'}">
                    ${Utils.formatQuantity(product.stock)} unidades
                </span>
            </td>
            <td>
                <a href="/inventory" class="btn btn-sm btn-primary">
                    <i class="fas fa-plus"></i>
                    Agregar Stock
                </a>
            </td>
        </tr>
    `).join('');
}

function updateCreditsAlerts(summary) {
    creditsSummary = summary;
    
    // Update stat card
    const totalCreditsEl = document.getElementById('totalCredits');
    const creditsLabelEl = document.getElementById('creditsLabel');
    const creditsStatIcon = document.getElementById('creditsStatIcon');
    
    totalCreditsEl.textContent = Utils.formatCurrency(summary.totalPending);
    creditsLabelEl.textContent = `${summary.totalCount} Créditos Pendientes`;
    
    // Change icon color based on urgency
    if (summary.urgencyCounts.critical > 0) {
        creditsStatIcon.style.background = 'rgba(239, 68, 68, 0.15)';
        creditsStatIcon.querySelector('i').style.color = 'var(--danger)';
        totalCreditsEl.classList.remove('text-warning');
        totalCreditsEl.classList.add('text-danger');
    } else if (summary.urgencyCounts.warning > 0) {
        creditsStatIcon.style.background = 'rgba(245, 158, 11, 0.15)';
        creditsStatIcon.querySelector('i').style.color = 'var(--warning)';
        totalCreditsEl.classList.remove('text-danger');
        totalCreditsEl.classList.add('text-warning');
    } else {
        creditsStatIcon.style.background = 'rgba(245, 158, 11, 0.15)';
        creditsStatIcon.querySelector('i').style.color = 'var(--warning)';
        totalCreditsEl.classList.remove('text-danger');
        totalCreditsEl.classList.add('text-warning');
    }
    
    // Update credits alert card
    const alertCard = document.getElementById('creditsAlertCard');
    const alertContent = document.getElementById('creditsAlertContent');
    
    if (summary.totalCount === 0) {
        alertCard.style.display = 'none';
        return;
    }
    
    alertCard.style.display = 'block';
    
    // Build urgency summary
    let urgencyHtml = '<div class="d-flex gap-2 flex-wrap mb-2">';
    
    if (summary.urgencyCounts.critical > 0) {
        urgencyHtml += `
            <span class="badge badge-danger" style="padding: 0.5rem 1rem;">
                <i class="fas fa-exclamation-circle"></i> ${summary.urgencyCounts.critical} Vencidos (+30 días)
            </span>
        `;
    }
    if (summary.urgencyCounts.warning > 0) {
        urgencyHtml += `
            <span class="badge badge-warning" style="padding: 0.5rem 1rem;">
                <i class="fas fa-clock"></i> ${summary.urgencyCounts.warning} Por vencer (15-29 días)
            </span>
        `;
    }
    if (summary.urgencyCounts.attention > 0) {
        urgencyHtml += `
            <span class="badge badge-primary" style="padding: 0.5rem 1rem;">
                <i class="fas fa-info-circle"></i> ${summary.urgencyCounts.attention} Recientes (7-14 días)
            </span>
        `;
    }
    if (summary.urgencyCounts.normal > 0) {
        urgencyHtml += `
            <span class="badge badge-success" style="padding: 0.5rem 1rem;">
                <i class="fas fa-check-circle"></i> ${summary.urgencyCounts.normal} Nuevos (&lt;7 días)
            </span>
        `;
    }
    
    urgencyHtml += '</div>';
    
    // Build credits table (show max 5 most urgent)
    const creditsToShow = summary.credits.slice(0, 5);
    
    let tableHtml = `
        <div class="table-container">
            <table class="table" style="font-size: 0.85rem;">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Días</th>
                        <th>Pendiente</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    creditsToShow.forEach(credit => {
        let statusBadge = '';
        switch (credit.urgency) {
            case 'critical':
                statusBadge = '<span class="badge badge-danger">Vencido</span>';
                break;
            case 'warning':
                statusBadge = '<span class="badge badge-warning">Por vencer</span>';
                break;
            case 'attention':
                statusBadge = '<span class="badge badge-primary">Reciente</span>';
                break;
            default:
                statusBadge = '<span class="badge badge-success">Nuevo</span>';
        }
        
        tableHtml += `
            <tr>
                <td>${Utils.escapeHtml(credit.clientName)}</td>
                <td>${Utils.formatDate(credit.date)}</td>
                <td><strong>${credit.daysSinceSale}</strong></td>
                <td><strong class="text-warning">${Utils.formatCurrency(credit.pendingAmount)}</strong></td>
                <td>${statusBadge}</td>
            </tr>
        `;
    });
    
    tableHtml += `
                </tbody>
            </table>
        </div>
    `;
    
    if (summary.totalCount > 5) {
        tableHtml += `<p class="text-muted text-center mt-1">Y ${summary.totalCount - 5} créditos más...</p>`;
    }
    
    alertContent.innerHTML = urgencyHtml + tableHtml;
}

function scrollToCredits() {
    const alertCard = document.getElementById('creditsAlertCard');
    if (alertCard.style.display !== 'none') {
        alertCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        // If no credits, go to sales page with filter
        window.location.href = '/sales';
    }
}

function updateCharts(chartData) {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                labels: {
                    color: '#94a3b8'
                }
            }
        },
        scales: {
            x: {
                ticks: { color: '#94a3b8' },
                grid: { color: 'rgba(148, 163, 184, 0.1)' }
            },
            y: {
                ticks: { 
                    color: '#94a3b8',
                    callback: function(value) {
                        return '$ ' + value.toLocaleString('es-CO');
                    }
                },
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                beginAtZero: true
            }
        }
    };
    
    // Gráfico de ventas
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    if (salesChart) salesChart.destroy();
    salesChart = new Chart(salesCtx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Ventas',
                data: chartData.sales,
                backgroundColor: 'rgba(34, 197, 94, 0.5)',
                borderColor: 'rgb(34, 197, 94)',
                borderWidth: 1
            }]
        },
        options: chartOptions
    });
    
    // Gráfico de gastos
    const expensesCtx = document.getElementById('expensesChart').getContext('2d');
    if (expensesChart) expensesChart.destroy();
    expensesChart = new Chart(expensesCtx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Gastos',
                data: chartData.expenses,
                backgroundColor: 'rgba(239, 68, 68, 0.5)',
                borderColor: 'rgb(239, 68, 68)',
                borderWidth: 1
            }]
        },
        options: chartOptions
    });
    
    // Gráfico combinado
    const combinedCtx = document.getElementById('combinedChart').getContext('2d');
    if (combinedChart) combinedChart.destroy();
    combinedChart = new Chart(combinedCtx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [
                {
                    label: 'Ventas',
                    data: chartData.sales,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Gastos',
                    data: chartData.expenses,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: chartOptions
    });
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Cerrar sidebar al hacer clic fuera (mobile)
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    
    if (window.innerWidth <= 992 && 
        !sidebar.contains(e.target) && 
        !menuBtn.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});
