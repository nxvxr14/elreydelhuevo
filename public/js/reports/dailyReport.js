/**
 * Daily Report Module - Reporte Diario
 * Desglose completo: Efectivo + Transferencias (por tipo) + Abonos créditos
 */

Reports.loaders.daily = async function() {
    const { date } = Reports.getFilters();
    const result = await Utils.fetch(`/api/reports/daily?date=${date}`);
    const r = result.report;
    
    Reports.getContent().innerHTML = `
        <!-- Resumen Principal -->
        <div class="stats-grid mb-2">
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(59, 130, 246, 0.15);"><i class="fas fa-wallet" style="color: #3b82f6;"></i></div>
                <div class="stat-info">
                    <h3 style="color: #3b82f6;">${Utils.formatCurrency(r.totalIngresos)}</h3>
                    <p>Ingresos Totales (Ventas + Abonos)</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon sales"><i class="fas fa-shopping-cart"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatCurrency(r.totalVentas)}</h3>
                    <p>Total Ventas (${r.ventas.count})</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(14, 165, 233, 0.15);"><i class="fas fa-hand-holding-usd" style="color: #0ea5e9;"></i></div>
                <div class="stat-info">
                    <h3 style="color: #0ea5e9;">${Utils.formatCurrency(r.abonos.total)}</h3>
                    <p>Abonos del Día (${r.abonos.count})</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(245, 158, 11, 0.15);"><i class="fas fa-boxes" style="color: var(--primary);"></i></div>
                <div class="stat-info">
                    <h3 style="color: var(--primary);">${Utils.formatQuantity(r.ventas.canastas || 0)}</h3>
                    <p>Canastas Vendidas</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon expenses"><i class="fas fa-arrow-down"></i></div>
                <div class="stat-info">
                    <h3>${Utils.formatCurrency(r.totalGastos)}</h3>
                    <p>Gastos (${r.expenses.count})</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon profit"><i class="fas fa-coins"></i></div>
                <div class="stat-info">
                    <h3 class="${r.utilidad >= 0 ? 'text-success' : 'text-danger'}">${Utils.formatCurrency(r.utilidad)}</h3>
                    <p>Utilidad del Día</p>
                </div>
            </div>
        </div>
        
        <!-- Desglose de Ingresos -->
        <div class="card mb-2">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-chart-pie" style="margin-right: 0.5rem; color: var(--primary);"></i>Desglose de Ingresos</h3>
            </div>
            <div class="card-body">
                <!-- Ventas -->
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                        <i class="fas fa-shopping-cart"></i> Ventas
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                        <div style="padding: 1rem; text-align: center; background: var(--bg-input); border-radius: 8px;">
                            <div style="font-size: 1.25rem; font-weight: 600; color: var(--success);">${Utils.formatCurrency(r.ventas.efectivo)}</div>
                            <div style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-money-bill-wave"></i> Efectivo</div>
                        </div>
                        <div style="padding: 1rem; text-align: center; background: var(--bg-input); border-radius: 8px;">
                            <div style="font-size: 1.25rem; font-weight: 600; color: #3b82f6;">${Utils.formatCurrency(r.ventas.transferencia)}</div>
                            <div style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-university"></i> Transferencias</div>
                        </div>
                    </div>
                    ${r.ventas.transferencia > 0 ? `
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-top: 0.75rem; padding-left: 1rem;">
                            <div style="padding: 0.5rem; text-align: center; background: var(--bg-dark); border-radius: 6px; font-size: 0.85rem;">
                                <div style="color: #a855f7; font-weight: 600;">${Utils.formatCurrency(r.ventas.nequi)}</div>
                                <div style="color: var(--text-secondary); font-size: 0.75rem;">Nequi</div>
                            </div>
                            <div style="padding: 0.5rem; text-align: center; background: var(--bg-dark); border-radius: 6px; font-size: 0.85rem;">
                                <div style="color: #fbbf24; font-weight: 600;">${Utils.formatCurrency(r.ventas.bancolombia)}</div>
                                <div style="color: var(--text-secondary); font-size: 0.75rem;">Bancolombia</div>
                            </div>
                            <div style="padding: 0.5rem; text-align: center; background: var(--bg-dark); border-radius: 6px; font-size: 0.85rem;">
                                <div style="color: #ef4444; font-weight: 600;">${Utils.formatCurrency(r.ventas.davivienda)}</div>
                                <div style="color: var(--text-secondary); font-size: 0.75rem;">Davivienda</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Abonos de Créditos -->
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                        <i class="fas fa-hand-holding-usd"></i> Abonos de Créditos (${r.abonos.count})
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                        <div style="padding: 1rem; text-align: center; background: var(--bg-input); border-radius: 8px;">
                            <div style="font-size: 1.25rem; font-weight: 600; color: var(--success);">${Utils.formatCurrency(r.abonos.efectivo)}</div>
                            <div style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-money-bill-wave"></i> Efectivo</div>
                        </div>
                        <div style="padding: 1rem; text-align: center; background: var(--bg-input); border-radius: 8px;">
                            <div style="font-size: 1.25rem; font-weight: 600; color: #3b82f6;">${Utils.formatCurrency(r.abonos.transferencia)}</div>
                            <div style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-university"></i> Transferencias</div>
                        </div>
                    </div>
                    ${r.abonos.transferencia > 0 ? `
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-top: 0.75rem; padding-left: 1rem;">
                            <div style="padding: 0.5rem; text-align: center; background: var(--bg-dark); border-radius: 6px; font-size: 0.85rem;">
                                <div style="color: #a855f7; font-weight: 600;">${Utils.formatCurrency(r.abonos.nequi)}</div>
                                <div style="color: var(--text-secondary); font-size: 0.75rem;">Nequi</div>
                            </div>
                            <div style="padding: 0.5rem; text-align: center; background: var(--bg-dark); border-radius: 6px; font-size: 0.85rem;">
                                <div style="color: #fbbf24; font-weight: 600;">${Utils.formatCurrency(r.abonos.bancolombia)}</div>
                                <div style="color: var(--text-secondary); font-size: 0.75rem;">Bancolombia</div>
                            </div>
                            <div style="padding: 0.5rem; text-align: center; background: var(--bg-dark); border-radius: 6px; font-size: 0.85rem;">
                                <div style="color: #ef4444; font-weight: 600;">${Utils.formatCurrency(r.abonos.davivienda)}</div>
                                <div style="color: var(--text-secondary); font-size: 0.75rem;">Davivienda</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Totales Consolidados -->
                <div style="background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-input) 100%); border-radius: 12px; padding: 1.25rem; border: 2px solid var(--primary);">
                    <h4 style="color: var(--primary); font-size: 1rem; margin-bottom: 1rem; text-align: center;">
                        <i class="fas fa-calculator"></i> TOTALES DEL DÍA
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${Utils.formatCurrency(r.totales.efectivo)}</div>
                            <div style="color: var(--text-secondary);"><i class="fas fa-money-bill-wave"></i> Total Efectivo</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: #3b82f6;">${Utils.formatCurrency(r.totales.transferencia)}</div>
                            <div style="color: var(--text-secondary);"><i class="fas fa-university"></i> Total Transferencias</div>
                        </div>
                    </div>
                    ${r.totales.transferencia > 0 ? `
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-top: 1rem;">
                            <div style="text-align: center; padding: 0.5rem; background: var(--bg-dark); border-radius: 6px;">
                                <div style="color: #a855f7; font-weight: 600;">${Utils.formatCurrency(r.totales.nequi)}</div>
                                <div style="color: var(--text-secondary); font-size: 0.75rem;">Nequi</div>
                            </div>
                            <div style="text-align: center; padding: 0.5rem; background: var(--bg-dark); border-radius: 6px;">
                                <div style="color: #fbbf24; font-weight: 600;">${Utils.formatCurrency(r.totales.bancolombia)}</div>
                                <div style="color: var(--text-secondary); font-size: 0.75rem;">Bancolombia</div>
                            </div>
                            <div style="text-align: center; padding: 0.5rem; background: var(--bg-dark); border-radius: 6px;">
                                <div style="color: #ef4444; font-weight: 600;">${Utils.formatCurrency(r.totales.davivienda)}</div>
                                <div style="color: var(--text-secondary); font-size: 0.75rem;">Davivienda</div>
                            </div>
                        </div>
                    ` : ''}
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
                        <div style="font-size: 1.5rem; font-weight: 600; color: var(--success);">${r.inventory.stats.totalEntries || 0}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-arrow-up"></i> Entradas</div>
                    </div>
                    <div style="padding: 1rem; text-align: center; background: var(--bg-input); border-radius: 8px;">
                        <div style="font-size: 1.5rem; font-weight: 600; color: var(--danger);">${r.inventory.stats.totalExits || 0}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;"><i class="fas fa-arrow-down"></i> Salidas</div>
                    </div>
                </div>
            </div>
        </div>
        
        ${r.cashRegister ? `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title"><i class="fas fa-calculator" style="margin-right: 0.5rem; color: var(--primary);"></i>Caja del Día</h3>
                </div>
                <div class="card-body">
                    <p><strong>Estado:</strong> <span class="badge ${r.cashRegister.status === 'closed' ? 'badge-success' : 'badge-info'}">${r.cashRegister.status === 'closed' ? 'Cerrada' : 'Abierta'}</span></p>
                    <p class="mt-1"><strong>Dinero inicial:</strong> ${Utils.formatCurrency(r.cashRegister.initialAmount)}</p>
                    <p class="mt-1"><strong>Dinero final:</strong> ${Utils.formatCurrency(r.cashRegister.expectedAmount)}</p>
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
