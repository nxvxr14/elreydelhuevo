/**
 * Reports Base Module - Configuración y funciones compartidas
 */

const Reports = {
    // Configuración de reportes
    config: {
        daily: { title: 'Reporte Diario', icon: 'fa-calendar-day', filters: ['date'] },
        sales: { title: 'Reporte de Ventas', icon: 'fa-shopping-cart', filters: ['dateRange', 'client', 'product', 'paymentMethod'] },
        products: { title: 'Reporte de Productos', icon: 'fa-box', filters: ['dateRange', 'product'] },
        expenses: { title: 'Reporte de Gastos', icon: 'fa-money-bill-wave', filters: ['dateRange'] },
        credits: { title: 'Reporte de Créditos', icon: 'fa-credit-card', filters: ['dateRange', 'client', 'creditStatus'] },
        inventory: { title: 'Reporte de Inventario', icon: 'fa-warehouse', filters: ['dateRange', 'product'] },
        cash: { title: 'Reporte de Cajas', icon: 'fa-calculator', filters: ['dateRange'] }
    },
    
    MONTH_NAMES: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    ITEMS_PER_PAGE: 20,
    
    // Estado
    currentType: 'daily',
    availablePeriods: null,
    charts: { sales: null, expenses: null },
    pagination: { sales: 1, products: 1, expenses: 1, inventory: 1, credits: 1, cash: 1 },
    cache: { sales: null, products: null, expenses: null, inventory: null, credits: null, cash: null },
    
    // Loaders de reportes (se registran desde cada módulo)
    loaders: {},
    
    // Inicialización
    async init() {
        const today = Utils.getCurrentDate();
        document.getElementById('filterDate').value = today;
        document.getElementById('filterStartDate').value = Utils.getFirstDayOfMonth();
        document.getElementById('filterEndDate').value = today;
        
        await this.initMonthYearSelectors();
        await this.loadFilterOptions();
        this.updateFiltersVisibility();
        this.loadReport();
    },
    
    async initMonthYearSelectors() {
        const now = new Date();
        const bogotaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
        const currentMonth = bogotaDate.getMonth() + 1;
        const currentYear = bogotaDate.getFullYear();
        
        try {
            const result = await Utils.fetch('/api/dashboard/periods');
            this.availablePeriods = result;
            
            const yearSelect = document.getElementById('filterYear');
            yearSelect.innerHTML = result.years.map(year => 
                `<option value="${year}" ${parseInt(year) === currentYear ? 'selected' : ''}>${year}</option>`
            ).join('');
            
            this.updateMonthOptions();
        } catch (error) {
            console.error('Error loading periods:', error);
            document.getElementById('filterYear').innerHTML = `<option value="${currentYear}" selected>${currentYear}</option>`;
            document.getElementById('filterMonth').innerHTML = `<option value="${currentMonth}" selected>${this.MONTH_NAMES[currentMonth - 1]}</option>`;
        }
    },
    
    updateMonthOptions() {
        const monthSelect = document.getElementById('filterMonth');
        const selectedYear = document.getElementById('filterYear').value;
        
        const now = new Date();
        const bogotaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
        const currentMonth = bogotaDate.getMonth() + 1;
        const currentYear = bogotaDate.getFullYear();
        
        monthSelect.innerHTML = '';
        
        if (this.availablePeriods && this.availablePeriods.monthsByYear[selectedYear]) {
            const months = this.availablePeriods.monthsByYear[selectedYear];
            months.forEach((month, index) => {
                const option = document.createElement('option');
                option.value = month;
                option.textContent = this.MONTH_NAMES[month - 1];
                if (parseInt(selectedYear) === currentYear && month === currentMonth) option.selected = true;
                else if (index === 0) option.selected = true;
                monthSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = currentMonth;
            option.textContent = this.MONTH_NAMES[currentMonth - 1];
            option.selected = true;
            monthSelect.appendChild(option);
        }
    },
    
    async loadFilterOptions() {
        try {
            const [clientsResult, productsResult] = await Promise.all([
                Utils.fetch('/api/clients'),
                Utils.fetch('/api/products')
            ]);
            
            const clientSelect = document.getElementById('filterClient');
            clientsResult.clients.forEach(c => {
                clientSelect.innerHTML += `<option value="${c.id}">${Utils.escapeHtml(c.name)}</option>`;
            });
            
            const productSelect = document.getElementById('filterProduct');
            productsResult.products.forEach(p => {
                productSelect.innerHTML += `<option value="${p.id}">${Utils.escapeHtml(p.name)}</option>`;
            });
        } catch (error) {
            console.error('Error loading filters:', error);
        }
    },
    
    updateFiltersVisibility() {
        const config = this.config[this.currentType];
        const filters = config.filters;
        
        const allGroups = ['filterDateGroup', 'filterDateTypeGroup', 'filterMonthGroup', 'filterYearGroup', 
                          'filterStartDateGroup', 'filterEndDateGroup', 'filterClientGroup', 'filterProductGroup', 
                          'filterPaymentMethodGroup', 'filterTransferTypeGroup', 'filterCreditStatusGroup', 'dateSeparator'];
        
        allGroups.forEach(id => document.getElementById(id).style.display = 'none');
        
        if (filters.includes('date')) document.getElementById('filterDateGroup').style.display = 'flex';
        if (filters.includes('dateRange')) {
            document.getElementById('filterDateTypeGroup').style.display = 'flex';
            this.toggleDateFilters();
        }
        
        let hasExtra = false;
        if (filters.includes('client')) { document.getElementById('filterClientGroup').style.display = 'flex'; hasExtra = true; }
        if (filters.includes('product')) { document.getElementById('filterProductGroup').style.display = 'flex'; hasExtra = true; }
        if (filters.includes('paymentMethod')) { document.getElementById('filterPaymentMethodGroup').style.display = 'flex'; hasExtra = true; }
        if (filters.includes('creditStatus')) { document.getElementById('filterCreditStatusGroup').style.display = 'flex'; hasExtra = true; }
        
        if (hasExtra && filters.includes('dateRange')) document.getElementById('dateSeparator').style.display = 'block';
        this.updateFiltersSummary();
    },
    
    toggleDateFilters() {
        const dateType = document.getElementById('filterDateType').value;
        
        ['filterMonthGroup', 'filterYearGroup', 'filterStartDateGroup', 'filterEndDateGroup'].forEach(id => 
            document.getElementById(id).style.display = 'none');
        
        const today = Utils.getCurrentDate();
        
        if (dateType === '1d') {
            document.getElementById('filterStartDate').value = today;
            document.getElementById('filterEndDate').value = today;
        } else if (dateType === '7d') {
            document.getElementById('filterStartDate').value = this.getDateDaysAgo(6);
            document.getElementById('filterEndDate').value = today;
        } else if (dateType === 'month') {
            document.getElementById('filterMonthGroup').style.display = 'flex';
            document.getElementById('filterYearGroup').style.display = 'flex';
            this.updateDateRange();
        } else if (dateType === 'range') {
            document.getElementById('filterStartDateGroup').style.display = 'flex';
            document.getElementById('filterEndDateGroup').style.display = 'flex';
        }
        
        this.updateFiltersSummary();
        this.loadReport();
    },
    
    getDateDaysAgo(days) {
        const now = new Date();
        const bogotaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
        bogotaDate.setDate(bogotaDate.getDate() - days);
        return bogotaDate.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    },
    
    updateDateRange() {
        const month = parseInt(document.getElementById('filterMonth').value);
        const year = parseInt(document.getElementById('filterYear').value);
        
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        document.getElementById('filterStartDate').value = startDate;
        document.getElementById('filterEndDate').value = endDate;
    },
    
    updateFiltersSummary() {
        const config = this.config[this.currentType];
        let summary = '';
        
        if (config.filters.includes('date')) {
            summary = Utils.formatDate(document.getElementById('filterDate').value);
        } else if (config.filters.includes('dateRange')) {
            const dateType = document.getElementById('filterDateType').value;
            if (dateType === '1d') summary = 'Hoy';
            else if (dateType === '7d') summary = 'Últimos 7 días';
            else if (dateType === 'month') {
                summary = `${this.MONTH_NAMES[document.getElementById('filterMonth').value - 1]} ${document.getElementById('filterYear').value}`;
            } else {
                summary = `${Utils.formatDateShort(document.getElementById('filterStartDate').value)} - ${Utils.formatDateShort(document.getElementById('filterEndDate').value)}`;
            }
        }
        
        document.getElementById('filtersSummary').textContent = summary;
    },
    
    onYearChange() { this.updateMonthOptions(); this.updateDateRange(); this.updateFiltersSummary(); this.loadReport(); },
    onMonthChange() { this.updateDateRange(); this.updateFiltersSummary(); this.loadReport(); },
    
    onPaymentMethodChange() {
        const paymentMethod = document.getElementById('filterPaymentMethod').value;
        document.getElementById('filterTransferTypeGroup').style.display = paymentMethod === 'transfer' ? 'flex' : 'none';
        if (paymentMethod !== 'transfer') document.getElementById('filterTransferType').value = '';
        this.loadReport();
    },
    
    selectType(type) {
        this.currentType = type;
        Object.keys(this.pagination).forEach(key => this.pagination[key] = 1);
        
        document.querySelectorAll('.report-nav-item').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-report="${type}"]`).classList.add('active');
        
        document.getElementById('filterPaymentMethod').value = '';
        document.getElementById('filterTransferType').value = '';
        
        this.updateFiltersVisibility();
        this.loadReport();
    },
    
    async loadReport() {
        try {
            Utils.showLoading();
            this.updateFiltersSummary();
            if (this.loaders[this.currentType]) await this.loaders[this.currentType]();
        } catch (error) {
            Utils.showToast('Error al cargar el reporte', 'danger');
            console.error(error);
        } finally {
            Utils.hideLoading();
        }
    },
    
    // Helpers
    getFilters() {
        return {
            date: document.getElementById('filterDate').value,
            startDate: document.getElementById('filterStartDate').value,
            endDate: document.getElementById('filterEndDate').value,
            clientId: document.getElementById('filterClient').value,
            productId: document.getElementById('filterProduct').value,
            paymentMethod: document.getElementById('filterPaymentMethod').value,
            transferType: document.getElementById('filterTransferType').value,
            creditStatus: document.getElementById('filterCreditStatus').value
        };
    },
    
    getContent() { return document.getElementById('reportContent'); }
};

// Funciones globales para los eventos HTML
function selectReportType(type) { Reports.selectType(type); }
function toggleDateFilters() { Reports.toggleDateFilters(); }
function onYearChange() { Reports.onYearChange(); }
function onMonthChange() { Reports.onMonthChange(); }
function onPaymentMethodChange() { Reports.onPaymentMethodChange(); }
function loadReport() { Reports.loadReport(); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => Reports.init());
