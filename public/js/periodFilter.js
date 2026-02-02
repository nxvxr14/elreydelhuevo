/**
 * Period Filter Module - Selector de período reutilizable
 * Para usar en: sales.html, expenses.html, inventory.html
 */

const PeriodFilter = {
    MONTH_NAMES: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    availablePeriods: null,
    onChangeCallback: null,
    
    /**
     * Inicializa el filtro de período
     * @param {Function} onChange - Callback cuando cambia el período
     */
    async init(onChange) {
        this.onChangeCallback = onChange;
        
        const today = Utils.getCurrentDate();
        document.getElementById('filterStartDate').value = today;
        document.getElementById('filterEndDate').value = today;
        
        await this.initMonthYearSelectors();
        this.toggleDateFilters();
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
            if (yearSelect) {
                yearSelect.innerHTML = result.years.map(year => 
                    `<option value="${year}" ${parseInt(year) === currentYear ? 'selected' : ''}>${year}</option>`
                ).join('');
            }
            
            this.updateMonthOptions();
        } catch (error) {
            console.error('Error loading periods:', error);
            const yearSelect = document.getElementById('filterYear');
            const monthSelect = document.getElementById('filterMonth');
            if (yearSelect) yearSelect.innerHTML = `<option value="${currentYear}" selected>${currentYear}</option>`;
            if (monthSelect) monthSelect.innerHTML = `<option value="${currentMonth}" selected>${this.MONTH_NAMES[currentMonth - 1]}</option>`;
        }
    },
    
    updateMonthOptions() {
        const monthSelect = document.getElementById('filterMonth');
        const yearSelect = document.getElementById('filterYear');
        if (!monthSelect || !yearSelect) return;
        
        const selectedYear = yearSelect.value;
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
    
    getDateDaysAgo(days) {
        const now = new Date();
        const bogotaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
        bogotaDate.setDate(bogotaDate.getDate() - days);
        return bogotaDate.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
    },
    
    toggleDateFilters() {
        const dateType = document.getElementById('filterPeriod').value;
        const monthGroup = document.getElementById('filterMonthGroup');
        const yearGroup = document.getElementById('filterYearGroup');
        const startGroup = document.getElementById('filterStartDateGroup');
        const endGroup = document.getElementById('filterEndDateGroup');
        
        // Ocultar todos
        if (monthGroup) monthGroup.style.display = 'none';
        if (yearGroup) yearGroup.style.display = 'none';
        if (startGroup) startGroup.style.display = 'none';
        if (endGroup) endGroup.style.display = 'none';
        
        const today = Utils.getCurrentDate();
        
        if (dateType === '1d') {
            document.getElementById('filterStartDate').value = today;
            document.getElementById('filterEndDate').value = today;
        } else if (dateType === '7d') {
            document.getElementById('filterStartDate').value = this.getDateDaysAgo(6);
            document.getElementById('filterEndDate').value = today;
        } else if (dateType === 'month') {
            if (monthGroup) monthGroup.style.display = 'flex';
            if (yearGroup) yearGroup.style.display = 'flex';
            this.updateDateRange();
        } else if (dateType === 'range') {
            if (startGroup) startGroup.style.display = 'flex';
            if (endGroup) endGroup.style.display = 'flex';
        }
        
        if (this.onChangeCallback) this.onChangeCallback();
    },
    
    updateDateRange() {
        const monthSelect = document.getElementById('filterMonth');
        const yearSelect = document.getElementById('filterYear');
        if (!monthSelect || !yearSelect) return;
        
        const month = parseInt(monthSelect.value);
        const year = parseInt(yearSelect.value);
        
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        document.getElementById('filterStartDate').value = startDate;
        document.getElementById('filterEndDate').value = endDate;
    },
    
    onYearChange() {
        this.updateMonthOptions();
        this.updateDateRange();
        if (this.onChangeCallback) this.onChangeCallback();
    },
    
    onMonthChange() {
        this.updateDateRange();
        if (this.onChangeCallback) this.onChangeCallback();
    },
    
    getFilters() {
        return {
            startDate: document.getElementById('filterStartDate').value,
            endDate: document.getElementById('filterEndDate').value
        };
    }
};

// Funciones globales para eventos HTML
function onPeriodChange() { PeriodFilter.toggleDateFilters(); }
function onPeriodYearChange() { PeriodFilter.onYearChange(); }
function onPeriodMonthChange() { PeriodFilter.onMonthChange(); }
