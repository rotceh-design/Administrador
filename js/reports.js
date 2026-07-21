class ReportManager {
    constructor() {
        this.currentReport = 'resumen';
    }

    async generateReport(type, dateStart, dateEnd, edificio) {
        this.currentReport = type;
        const tareas = await db.getAll('tareas');
        const incidencias = await db.getAll('incidencias');
        const visitas = await db.getAll('visitas');
        const proveedores = await db.getAll('proveedores');
        const fotos = await db.getAll('fotos');

        let ft = tareas, fi = incidencias, fv = visitas;
        if (edificio) { ft = ft.filter(t => t.edificio === edificio); fi = fi.filter(i => i.edificio === edificio); fv = fv.filter(v => v.edificio === edificio); }
        if (dateStart) { ft = ft.filter(t => t.fecha >= dateStart); fi = fi.filter(i => i.fecha >= dateStart); fv = fv.filter(v => v.fecha >= dateStart); }
        if (dateEnd) { ft = ft.filter(t => t.fecha <= dateEnd); fi = fi.filter(i => i.fecha <= dateEnd); fv = fv.filter(v => v.fecha <= dateEnd); }

        const edLabel = edificio || 'Todos los edificios';
        const dateLabel = (dateStart && dateEnd) ? `${app.formatDate(dateStart)} - ${app.formatDate(dateEnd)}` : 'Todos los registros';
        const preview = document.getElementById('reportPreview');

        switch (type) {
            case 'resumen': preview.innerHTML = this.renderResumen(ft, fi, fv, proveedores, fotos, dateLabel, edLabel); break;
            case 'tareas': preview.innerHTML = this.renderTareasReport(ft, dateLabel, edLabel); break;
            case 'visitas': preview.innerHTML = this.renderVisitasReport(fv, dateLabel, edLabel); break;
            case 'incidencias': preview.innerHTML = this.renderIncidenciasReport(fi, dateLabel, edLabel); break;
            case 'proveedores': preview.innerHTML = this.renderProveedoresReport(proveedores); break;
        }
    }

    renderResumen(tareas, incidencias, visitas, proveedores, fotos, dateRange, edLabel) {
        const comp = tareas.filter(t => t.estado === 'Completado').length;
        const pend = tareas.filter(t => t.estado === 'Pendiente').length;
        const prog = tareas.filter(t => t.estado === 'En Progreso').length;
        const incAb = incidencias.filter(i => i.estado !== 'Completado').length;
        const visComp = visitas.filter(v => v.estado === 'Completado').length;

        return `<div class="report-document">
            <div class="report-doc-header">
                <h2>Reporte Resumen General</h2>
                <p>${edLabel} | ${dateRange}</p>
                <p>Generado: ${new Date().toLocaleDateString('es-ES')}</p>
            </div>
            <div class="report-kpis">
                <div class="report-kpi"><h3>${tareas.length}</h3><p>Tareas</p></div>
                <div class="report-kpi green"><h3>${comp}</h3><p>Completadas</p></div>
                <div class="report-kpi yellow"><h3>${pend + prog}</h3><p>Pendientes</p></div>
                <div class="report-kpi"><h3>${visitas.length}</h3><p>Visitas</p></div>
                <div class="report-kpi red"><h3>${incAb}</h3><p>Incidencias</p></div>
                <div class="report-kpi blue"><h3>${proveedores.length}</h3><p>Proveedores</p></div>
            </div>
            <div class="report-section">
                <h3>Por Categoría</h3>
                <table class="report-table">
                    <thead><tr><th>Categoría</th><th>Tareas</th><th>Incidencias</th></tr></thead>
                    <tbody>${this.getCatStats(tareas, incidencias)}</tbody>
                </table>
            </div>
            <div class="report-section">
                <h3>Por Edificio</h3>
                <table class="report-table">
                    <thead><tr><th>Edificio</th><th>Tareas</th><th>Visitas</th><th>Incidencias</th></tr></thead>
                    <tbody>${this.getEdStats(tareas, visitas, incidencias)}</tbody>
                </table>
            </div>
        </div>`;
    }

    getCatStats(tareas, incidencias) {
        const cats = {};
        tareas.forEach(t => { if (!cats[t.categoria]) cats[t.categoria] = { t: 0, i: 0 }; cats[t.categoria].t++; });
        incidencias.forEach(i => { if (!cats[i.categoria]) cats[i.categoria] = { t: 0, i: 0 }; cats[i.categoria].i++; });
        return Object.entries(cats).map(([c, d]) => `<tr><td><span style="color:${CATEGORY_COLORS[c]};font-weight:600">${c}</span></td><td>${d.t}</td><td>${d.i}</td></tr>`).join('');
    }

    getEdStats(tareas, visitas, incidencias) {
        const eds = {};
        tareas.forEach(t => { if (!eds[t.edificio]) eds[t.edificio] = { t: 0, v: 0, i: 0 }; eds[t.edificio].t++; });
        visitas.forEach(v => { if (!eds[v.edificio]) eds[v.edificio] = { t: 0, v: 0, i: 0 }; eds[v.edificio].v++; });
        incidencias.forEach(i => { if (!eds[i.edificio]) eds[i.edificio] = { t: 0, v: 0, i: 0 }; eds[i.edificio].i++; });
        return Object.entries(eds).map(([e, d]) => `<tr><td><span class="edificio-tag" style="background:${getEdificioColor(e, Object.keys(eds))}">${e}</span></td><td>${d.t}</td><td>${d.v}</td><td>${d.i}</td></tr>`).join('');
    }

    renderTareasReport(tareas, dateRange, edLabel) {
        return `<div class="report-document">
            <div class="report-doc-header">
                <h2>Reporte de Tareas</h2>
                <p>${edLabel} | ${dateRange}</p>
            </div>
            <div class="report-kpis">
                <div class="report-kpi green"><h3>${tareas.filter(t => t.estado === 'Completado').length}</h3><p>Completadas</p></div>
                <div class="report-kpi yellow"><h3>${tareas.filter(t => t.estado === 'Pendiente').length}</h3><p>Pendientes</p></div>
                <div class="report-kpi"><h3>${tareas.filter(t => t.estado === 'En Progreso').length}</h3><p>En Progreso</p></div>
            </div>
            <table class="report-table">
                <thead><tr><th>ID</th><th>Actividad</th><th>Categoría</th><th>Edificio</th><th>Fecha</th><th>Estado</th></tr></thead>
                <tbody>${tareas.map(t => `<tr><td>${t.id}</td><td>${t.actividad}</td><td><span style="color:${CATEGORY_COLORS[t.categoria]}">${t.categoria}</span></td><td><span class="edificio-tag" style="background:${getEdificioColor(t.edificio, app.data.listas?.edificios || [])}">${t.edificio}</span></td><td>${app.formatDate(t.fecha)}</td><td><span class="status-badge status-${t.estado.toLowerCase().replace(' ','')}">${t.estado}</span></td></tr>`).join('')}</tbody>
            </table>
        </div>`;
    }

    renderVisitasReport(visitas, dateRange, edLabel) {
        return `<div class="report-document">
            <div class="report-doc-header">
                <h2>Reporte de Visitas</h2>
                <p>${edLabel} | ${dateRange}</p>
            </div>
            <div class="report-kpis">
                <div class="report-kpi green"><h3>${visitas.filter(v => v.estado === 'Completado').length}</h3><p>Completadas</p></div>
                <div class="report-kpi yellow"><h3>${visitas.filter(v => v.estado === 'Pendiente').length}</h3><p>Pendientes</p></div>
                <div class="report-kpi"><h3>${visitas.length}</h3><p>Total</p></div>
            </div>
            <table class="report-table">
                <thead><tr><th>ID</th><th>Fecha</th><th>Edificio</th><th>Tipo</th><th>Motivo</th><th>Proveedor</th><th>Estado</th></tr></thead>
                <tbody>${visitas.map(v => `<tr><td>${v.id}</td><td>${app.formatDate(v.fecha)}</td><td><span class="edificio-tag" style="background:${getEdificioColor(v.edificio, app.data.listas?.edificios || [])}">${v.edificio}</span></td><td>${v.tipo}</td><td>${v.motivo}</td><td>${v.proveedor}</td><td><span class="status-badge status-${v.estado.toLowerCase().replace(' ','')}">${v.estado}</span></td></tr>`).join('')}</tbody>
            </table>
        </div>`;
    }

    renderIncidenciasReport(incidencias, dateRange, edLabel) {
        return `<div class="report-document">
            <div class="report-doc-header">
                <h2>Reporte de Incidencias</h2>
                <p>${edLabel} | ${dateRange}</p>
            </div>
            <div class="report-kpis">
                <div class="report-kpi red"><h3>${incidencias.filter(i => i.prioridad === 'Alta').length}</h3><p>Alta Prioridad</p></div>
                <div class="report-kpi yellow"><h3>${incidencias.filter(i => i.estado !== 'Completado').length}</h3><p>Abiertas</p></div>
                <div class="report-kpi green"><h3>${incidencias.filter(i => i.estado === 'Completado').length}</h3><p>Resueltas</p></div>
            </div>
            <table class="report-table">
                <thead><tr><th>ID</th><th>Fecha</th><th>Edificio</th><th>Descripción</th><th>Prioridad</th><th>Estado</th></tr></thead>
                <tbody>${incidencias.map(i => `<tr><td>${i.id}</td><td>${app.formatDate(i.fecha)}</td><td><span class="edificio-tag" style="background:${getEdificioColor(i.edificio, app.data.listas?.edificios || [])}">${i.edificio}</span></td><td>${i.descripcion}</td><td><span class="status-badge status-${i.prioridad.toLowerCase()}">${i.prioridad}</span></td><td><span class="status-badge status-${i.estado.toLowerCase().replace(' ','')}">${i.estado}</span></td></tr>`).join('')}</tbody>
            </table>
        </div>`;
    }

    renderProveedoresReport(proveedores) {
        return `<div class="report-document">
            <div class="report-doc-header">
                <h2>Reporte de Proveedores</h2>
                <p>Generado: ${new Date().toLocaleDateString('es-ES')}</p>
            </div>
            <div class="report-kpis">
                <div class="report-kpi"><h3>${proveedores.length}</h3><p>Total</p></div>
                <div class="report-kpi green"><h3>${proveedores.filter(p => p.estado === 'Activo').length}</h3><p>Activos</p></div>
            </div>
            <table class="report-table">
                <thead><tr><th>Empresa</th><th>Servicio</th><th>Contacto</th><th>Teléfono</th><th>Calificación</th></tr></thead>
                <tbody>${proveedores.map(p => `<tr><td><strong>${p.empresa}</strong></td><td><span style="color:${CATEGORY_COLORS[p.servicio]}">${p.servicio}</span></td><td>${p.contacto}</td><td>${p.telefono}</td><td>${'★'.repeat(p.calificacion || 0)}${'☆'.repeat(5 - (p.calificacion || 0))}</td></tr>`).join('')}</tbody>
            </table>
        </div>`;
    }

    printReport() {
        const content = document.getElementById('reportPreview').innerHTML;
        const w = window.open('', '_blank');
        w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte</title>
            <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:30px;color:#333}.report-document{max-width:900px;margin:0 auto}.report-doc-header{text-align:center;margin-bottom:20px;border-bottom:3px solid #1e40af;padding-bottom:15px}.report-doc-header h2{color:#1e40af;font-size:1.4rem}.report-kpis{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px}.report-kpi{flex:1;min-width:100px;text-align:center;padding:12px;border:1px solid #e2e8f0;border-radius:8px}.report-kpi h3{font-size:1.5rem;color:#1e40af}.report-kpi.green h3{color:#10b981}.report-kpi.yellow h3{color:#f59e0b}.report-kpi.red h3{color:#ef4444}.report-kpi.blue h3{color:#06b6d4}.report-kpi p{font-size:0.75rem;color:#666}.report-table{width:100%;border-collapse:collapse;margin-bottom:15px}.report-table th{background:#1e40af;color:white;padding:8px;text-align:left;font-size:0.8rem}.report-table td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:0.82rem}.edificio-tag{padding:2px 8px;border-radius:6px;color:white;font-size:0.7rem;font-weight:600}.status-badge{padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600}.status-pendiente{background:#fef3c7;color:#92400e}.status-enprogreso{background:#dbeafe;color:#1e40af}.status-completado{background:#d1fae5;color:#065f46}.status-alta{background:#fee2e2;color:#991b1b}.status-media{background:#fef3c7;color:#92400e}.status-baja{background:#dbeafe;color:#1e40af}@media print{body{padding:15px}}</style></head><body>${content}</body></html>`);
        w.document.close(); w.print();
    }

    exportToExcel(type) {
        const table = document.querySelector('#reportPreview .report-table');
        if (!table) { app.showToast('No hay datos para exportar', 'warning'); return; }
        let csv = '';
        table.querySelectorAll('tr').forEach(row => {
            const cols = [];
            row.querySelectorAll('th, td').forEach(cell => cols.push('"' + cell.textContent.replace(/"/g, '""').trim() + '"'));
            csv += cols.join(',') + '\n';
        });
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = `reporte_${type}_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
        app.showToast('Exportado como CSV', 'success');
    }
}

const reportManager = new ReportManager();
