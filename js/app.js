class MaintenanceApp {
    constructor() {
        this.data = {};
        this.currentSection = 'dashboard';
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.cronogramaView = 'monthly';
        this.currentWeekStart = this._getWeekStart(new Date());
        this.chartCategorias = null;
        this.modalOnSave = null;
    }

    _getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    async init() {
        await db.init();
        await db.migrateFromLocalStorage();
        await this.loadData();
        await quoteManager.init();
        this.populateFilters();
        this.bindEvents();
        this.renderDashboard();
        this.updateNotificationBadge();
    }

    async loadData() {
        this.data = {};
        for (const store of ['tareas', 'visitas', 'incidencias', 'proveedores', 'fotos', 'cotizaciones', 'notificaciones', 'informesDiarios']) {
            this.data[store] = await db.getAll(store);
        }
        this.data.listas = {};
        const listas = await db.getAll('listas');
        listas.forEach(l => this.data.listas[l.key] = l.value);

        const defaults = { categorias: [], ubicaciones: [], edificios: [], estados: INITIAL_DATA.estados, prioridades: INITIAL_DATA.prioridades, tiposVisita: [], meses: INITIAL_DATA.meses };
        for (const [k, v] of Object.entries(defaults)) {
            if (!this.data.listas[k]) { this.data.listas[k] = v; await db.put('listas', { key: k, value: v }); }
        }
    }

    populateFilters() {
        const cats = this.data.listas.categorias || [];
        const ubs = this.data.listas.ubicaciones || [];
        const eds = this.data.listas.edificios || [];
        const tps = this.data.listas.tiposVisita || [];

        const fillSelect = (id, items, placeholder) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<option value="">${placeholder}</option>` + items.map(i => `<option value="${i}">${i}</option>`).join('');
        };

        fillSelect('filterCategoria', cats, 'Todas las categorías');
        fillSelect('filterEdificio', eds, 'Todos los edificios');
        fillSelect('filterEdificioGlobal', eds, 'Todos los Edificios');
        fillSelect('filterIncidenciaEdificio', eds, 'Todos los edificios');
        fillSelect('filterVisitaEdificio', eds, 'Todos los edificios');
        fillSelect('filterFotoEdificio', eds, 'Todos los edificios');
        fillSelect('filterFotoCategoria', cats, 'Todas las categorías');
        fillSelect('filterServicio', cats, 'Todos los servicios');
        fillSelect('filterGanttEdificio', eds, 'Todos los edificios');
        fillSelect('filterGanttCategoria', cats, 'Todas las categorías');
        fillSelect('filterVisitaTipo', tps, 'Todos los tipos');
        fillSelect('filterInformeEdificio', eds, 'Todos los edificios');
        fillSelect('reportEdificio', eds, 'Todos');
    }

    bindEvents() {
        document.querySelectorAll('.nav-item').forEach(i => i.addEventListener('click', e => { e.preventDefault(); this.navigateTo(i.dataset.section); }));
        document.getElementById('toggleSidebar')?.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('collapsed'));
        document.getElementById('mobileMenu')?.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('active'));
        document.getElementById('addNewBtn')?.addEventListener('click', () => this.showAddModal());
        document.getElementById('modalClose')?.addEventListener('click', () => this.closeModal());
        document.getElementById('modalCancel')?.addEventListener('click', () => this.closeModal());
        document.getElementById('modalSave')?.addEventListener('click', () => this.saveModalData());
        document.getElementById('modalOverlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) this.closeModal(); });

        ['filterCategoria', 'filterEdificio', 'filterEstado'].forEach(id => document.getElementById(id)?.addEventListener('change', () => this.renderTareas()));
        ['filterIncidenciaEdificio', 'filterPrioridad', 'filterEstadoInc'].forEach(id => document.getElementById(id)?.addEventListener('change', () => this.renderIncidencias()));
        ['filterVisitaEdificio', 'filterVisitaTipo', 'filterVisitaEstado'].forEach(id => document.getElementById(id)?.addEventListener('change', () => this.renderVisitas()));
        ['filterFotoEdificio', 'filterFotoCategoria'].forEach(id => document.getElementById(id)?.addEventListener('change', () => this.loadPhotos()));
        document.getElementById('filterServicio')?.addEventListener('change', () => this.renderProveedores());
        document.getElementById('searchProveedor')?.addEventListener('input', () => this.renderProveedores());
        ['filterGanttEdificio', 'filterGanttCategoria'].forEach(id => document.getElementById(id)?.addEventListener('change', () => this.renderGantt()));
        ['filterInformeEdificio', 'filterInformeFecha'].forEach(id => document.getElementById(id)?.addEventListener('change', () => this.renderInformes()));

        document.getElementById('filterEdificioGlobal')?.addEventListener('change', () => this.renderSection(this.currentSection));

        document.getElementById('configForm')?.addEventListener('submit', e => { e.preventDefault(); this.saveConfig(); });
        document.getElementById('exportData')?.addEventListener('click', () => this.exportData());
        document.getElementById('importData')?.addEventListener('click', () => document.getElementById('importFile')?.click());
        document.getElementById('importFile')?.addEventListener('change', e => this.importData(e));
        document.getElementById('clearData')?.addEventListener('click', () => this.clearAllData());

        document.getElementById('notificationBtn')?.addEventListener('click', () => this.showNotifications());
        document.getElementById('fullscreenBtn')?.addEventListener('click', () => { !document.fullscreenElement ? document.documentElement.requestFullscreen() : document.exitFullscreen(); });

        document.getElementById('searchInput')?.addEventListener('focus', () => this.openSearchModal());
        document.getElementById('globalSearch')?.addEventListener('input', e => this.globalSearch(e.target.value));
        document.getElementById('searchModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) this.closeSearchModal(); });

        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); this.openSearchModal(); }
            if (e.key === 'Escape') { this.closeSearchModal(); this.closeModal(); }
        });

        document.getElementById('prevPeriod')?.addEventListener('click', () => {
            if (this.cronogramaView === 'monthly') {
                this.currentMonth--; if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
            } else {
                this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
            }
            this.renderCronograma();
        });
        document.getElementById('nextPeriod')?.addEventListener('click', () => {
            if (this.cronogramaView === 'monthly') {
                this.currentMonth++; if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
            } else {
                this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
            }
            this.renderCronograma();
        });
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.cronogramaView = btn.dataset.view;
                if (this.cronogramaView === 'weekly') {
                    this.currentWeekStart = this._getWeekStart(new Date());
                }
                this.renderCronograma();
            });
        });
        document.getElementById('exportCronogramaPDF')?.addEventListener('click', () => this.exportCronogramaPDF());

        document.getElementById('nuevoInformeBtn')?.addEventListener('click', () => this.showNewInformeModal());

        this.bindPhotoEvents();
        emailGenerator.bindEvents();
        this.bindQuoteEvents();
        this.bindReportEvents();
    }

    bindPhotoEvents() {
        const ua = document.getElementById('uploadArea'), fi = document.getElementById('fileInput'), ub = document.getElementById('uploadBtn');
        if (ub) ub.addEventListener('click', () => fi?.click());
        if (ua) {
            ua.addEventListener('dragover', e => { e.preventDefault(); ua.classList.add('drag-over'); });
            ua.addEventListener('dragleave', () => ua.classList.remove('drag-over'));
            ua.addEventListener('drop', e => { e.preventDefault(); ua.classList.remove('drag-over'); this.handlePhotoUpload(e.dataTransfer.files); });
            ua.addEventListener('click', e => { if (e.target === ua || e.target.parentElement === ua || e.target.tagName === 'I' || e.target.tagName === 'H3' || e.target.tagName === 'P') fi?.click(); });
        }
        if (fi) fi.addEventListener('change', e => this.handlePhotoUpload(e.target.files));
        document.getElementById('closeImageViewer')?.addEventListener('click', () => document.getElementById('imageViewerOverlay').classList.remove('active'));
    }

    async handlePhotoUpload(files) {
        if (!files.length) return;
        const eds = this.data.listas.edificios || [];
        const cats = this.data.listas.categorias || [];
        const ubs = this.data.listas.ubicaciones || [];
        this.showModal('Clasificar Fotografías', `
            <form id="photoForm">
                <div class="form-group"><label>Edificio *</label><select id="fotoEdificio">${eds.map(e => `<option value="${e}">${e}</option>`).join('')}</select></div>
                <div class="form-group"><label>Categoría</label><select id="fotoCategoria">${cats.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
                <div class="form-group"><label>Ubicación</label><select id="fotoUbicacion">${ubs.map(u => `<option value="${u}">${u}</option>`).join('')}</select></div>
                <div class="form-group"><label>Descripción</label><textarea id="fotoDescripcion" rows="2" placeholder="¿Qué se ve en la foto?"></textarea></div>
                <p><strong>${files.length}</strong> archivo(s) seleccionado(s)</p>
            </form>`, async () => {
            const processed = await photoManager.processFiles(files);
            for (const p of processed) {
                await photoManager.savePhoto(p, document.getElementById('fotoCategoria').value, document.getElementById('fotoEdificio').value, document.getElementById('fotoDescripcion').value, document.getElementById('fotoUbicacion').value);
            }
            this.loadPhotos();
            this.showToast(`${processed.length} foto(s) guardada(s)`, 'success');
        });
    }

    bindQuoteEvents() {
        document.getElementById('closeQuoteEditor')?.addEventListener('click', () => quoteManager.closeEditor());
        document.getElementById('addItemQuote')?.addEventListener('click', () => quoteManager.addItem());
        document.getElementById('saveQuote')?.addEventListener('click', () => quoteManager.saveCurrentQuote());
        document.getElementById('printQuote')?.addEventListener('click', () => { if (quoteManager.currentQuote) quoteManager.printQuote(quoteManager.currentQuote.id); });
    }

    bindReportEvents() {
        document.querySelectorAll('.report-type-btn').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('.report-type-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); this.generateReport(); }));
        document.getElementById('generateReport')?.addEventListener('click', () => this.generateReport());
        document.getElementById('printReport')?.addEventListener('click', () => reportManager.printReport());
        document.getElementById('exportReportExcel')?.addEventListener('click', () => reportManager.exportToExcel(reportManager.currentReport));
        document.getElementById('exportReportPDF')?.addEventListener('click', () => reportManager.printReport());
    }

    getGlobalFilter() { return document.getElementById('filterEdificioGlobal')?.value || ''; }

    navigateTo(section) {
        this.currentSection = section;
        document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.section === section));
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`${section}Section`)?.classList.add('active');
        const t = { dashboard: ['Dashboard', 'Panel de control'], tareas: ['Tareas', 'Gestión de tareas de mantenimiento'], cronograma: ['Cronograma', 'Calendario por edificio - 4 columnas'], gantt: ['Carta Gantt', 'Diagrama de Gantt - Cronograma visual'], visitas: ['Visitas', 'Registro de visitas a edificios'], incidencias: ['Incidencias', 'Registro y seguimiento de problemas'], informes: ['Informes Diarios', 'Reporte diario de actividades'], proveedores: ['Proveedores', 'Directorio de servicios'], fotos: ['Fotografías', 'Galería de imágenes'], emails: ['Correos', 'Generador de correos electrónicos'], cotizaciones: ['Cotizaciones', 'Presupuestos y cotizaciones'], reportes: ['Reportes', 'Estadísticas e informes'], config: ['Configuración', 'Ajustes del sistema'] };
        document.getElementById('pageTitle').textContent = t[section]?.[0] || section;
        document.getElementById('pageSubtitle').textContent = t[section]?.[1] || '';
        this.renderSection(section);
        document.getElementById('sidebar')?.classList.remove('active');
    }

    renderSection(section) {
        const r = { dashboard: () => this.renderDashboard(), tareas: () => this.renderTareas(), cronograma: () => this.renderCronograma(), gantt: () => this.renderGantt(), visitas: () => this.renderVisitas(), incidencias: () => this.renderIncidencias(), informes: () => this.renderInformes(), proveedores: () => this.renderProveedores(), fotos: () => this.loadPhotos(), cotizaciones: () => this.loadQuotes(), reportes: () => this.generateReport(), config: () => this.renderConfig() };
        if (r[section]) r[section]();
    }

    // =================== DASHBOARD ===================
    renderDashboard() {
        const gf = this.getGlobalFilter();
        let tareas = [...(this.data.tareas || [])];
        let incidencias = [...(this.data.incidencias || [])];
        let visitas = [...(this.data.visitas || [])];
        if (gf) { tareas = tareas.filter(t => t.edificio === gf); incidencias = incidencias.filter(i => i.edificio === gf); visitas = visitas.filter(v => v.edificio === gf); }

        document.getElementById('kpiEdificios').textContent = (this.data.listas.edificios || []).length;
        document.getElementById('kpiCompletadas').textContent = tareas.filter(t => t.estado === 'Completado').length;
        document.getElementById('kpiPendientes').textContent = tareas.filter(t => t.estado !== 'Completado').length;
        document.getElementById('kpiIncidencias').textContent = incidencias.filter(i => i.estado !== 'Completado').length;

        const proxVisitas = visitas.filter(v => v.estado !== 'Completado').sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).slice(0, 5);
        document.getElementById('proximasVisitas').innerHTML = proxVisitas.length ? proxVisitas.map(v => `
            <div class="task-item">
                <div class="task-category" style="background:${getEdificioColor(v.edificio, this.data.listas?.edificios)}"></div>
                <div class="task-info"><h4>${v.motivo}</h4><p>${v.edificio} - ${v.tipo}</p></div>
                <span class="status-badge status-${v.estado.toLowerCase().replace(' ', '')}">${v.estado}</span>
            </div>`).join('') : '<p class="text-center" style="padding:1.5rem;color:var(--text-secondary)">No hay visitas pendientes</p>';

        const proxTareas = tareas.filter(t => t.estado !== 'Completado').sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).slice(0, 5);
        document.getElementById('proximasTareas').innerHTML = proxTareas.length ? proxTareas.map(t => `
            <div class="task-item">
                <div class="task-category" style="background:${CATEGORY_COLORS[t.categoria] || '#6b7280'}"></div>
                <div class="task-info"><h4>${t.actividad}</h4><p>${t.edificio} - ${t.categoria}</p></div>
                <span class="status-badge status-${t.estado.toLowerCase().replace(' ', '')}">${t.estado}</span>
            </div>`).join('') : '<p class="text-center" style="padding:1.5rem;color:var(--text-secondary)">No hay tareas pendientes</p>';

        const incRec = incidencias.filter(i => i.estado !== 'Completado').slice(0, 4);
        document.getElementById('incidenciasRecientes').innerHTML = incRec.length ? incRec.map(i => `
            <div class="task-item">
                <div class="task-category" style="background:${i.prioridad === 'Alta' ? '#ef4444' : i.prioridad === 'Media' ? '#f59e0b' : '#3b82f6'}"></div>
                <div class="task-info"><h4>${i.descripcion}</h4><p>${i.edificio} - ${i.categoria}</p></div>
                <span class="status-badge status-${i.prioridad.toLowerCase()}">${i.prioridad}</span>
            </div>`).join('') : '<p class="text-center" style="padding:1.5rem;color:var(--text-secondary)">Sin incidencias</p>';

        this.renderChartCategorias();
    }

    renderChartCategorias() {
        const ctx = document.getElementById('chartCategorias');
        if (!ctx) return;
        const gf = this.getGlobalFilter();
        let tareas = [...(this.data.tareas || [])];
        if (gf) tareas = tareas.filter(t => t.edificio === gf);
        const c = {}; tareas.forEach(t => c[t.categoria] = (c[t.categoria] || 0) + 1);
        if (this.chartCategorias) this.chartCategorias.destroy();
        this.chartCategorias = new Chart(ctx, { type: 'doughnut', data: { labels: Object.keys(c), datasets: [{ data: Object.values(c), backgroundColor: Object.keys(c).map(k => CATEGORY_COLORS[k] || '#6b7280'), borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true } } } } });
    }

    // =================== TAREAS ===================
    renderTareas() {
        const cat = document.getElementById('filterCategoria')?.value || '';
        const edi = document.getElementById('filterEdificio')?.value || '';
        const est = document.getElementById('filterEstado')?.value || '';
        let tareas = [...(this.data.tareas || [])];
        if (cat) tareas = tareas.filter(t => t.categoria === cat);
        if (edi) tareas = tareas.filter(t => t.edificio === edi);
        if (est) tareas = tareas.filter(t => t.estado === est);

        const tbody = document.getElementById('tareasBody');
        if (!tbody) return;
        tbody.innerHTML = tareas.length ? tareas.map(t => `
            <tr>
                <td><strong>${t.id}</strong></td><td>${t.actividad}</td>
                <td><span style="color:${CATEGORY_COLORS[t.categoria]};font-weight:500">${t.categoria}</span></td>
                <td><span class="edificio-tag" style="background:${getEdificioColor(t.edificio, this.data.listas?.edificios)}">${t.edificio}</span></td>
                <td>${t.ubicacion}</td><td>${t.proveedor}</td><td>${this.formatDate(t.fecha)}</td>
                <td><span class="status-badge status-${t.estado.toLowerCase().replace(' ', '')}">${t.estado}</span></td>
                <td class="actions-cell">
                    <button class="btn-success btn-sm" onclick="app.editTarea('${t.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger btn-sm" onclick="app.deleteTarea('${t.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`).join('') : '<tr><td colspan="9" class="text-center">No se encontraron tareas</td></tr>';
        document.getElementById('navTareasBadge').textContent = this.data.tareas?.filter(t => t.estado !== 'Completado').length || 0;
    }

    getTareaForm(t = null) {
        const cats = this.data.listas.categorias || [], eds = this.data.listas.edificios || [], ubs = this.data.listas.ubicaciones || [], sts = this.data.listas.estados || [], provs = this.data.proveedores || [];
        return `<form>
            <div class="form-group"><label>Actividad *</label><input type="text" id="tareaActividad" value="${t?.actividad || ''}" required></div>
            <div class="form-group"><label>Categoría *</label><select id="tareaCategoria">${cats.map(c => `<option value="${c}" ${t?.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            <div class="form-group"><label>Edificio *</label><select id="tareaEdificio">${eds.map(e => `<option value="${e}" ${t?.edificio === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
            <div class="form-group"><label>Ubicación *</label><select id="tareaUbicacion">${ubs.map(u => `<option value="${u}" ${t?.ubicacion === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
            <div class="form-group"><label>Proveedor</label><select id="tareaProveedor"><option value="">Sin asignar</option>${provs.map(p => `<option value="${p.empresa}" ${t?.proveedor === p.empresa ? 'selected' : ''}>${p.empresa}</option>`).join('')}</select></div>
            <div class="form-group"><label>Fecha *</label><input type="date" id="tareaFecha" value="${t?.fecha || new Date().toISOString().split('T')[0]}" required></div>
            <div class="form-group"><label>Estado *</label><select id="tareaEstado">${sts.map(e => `<option value="${e}" ${t?.estado === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
            <div class="form-group"><label>Observaciones</label><textarea id="tareaObservaciones" rows="2">${t?.observaciones || ''}</textarea></div>
        </form>`;
    }

    async saveTarea(id = null) {
        const d = { actividad: this.gv('tareaActividad'), categoria: this.gv('tareaCategoria'), edificio: this.gv('tareaEdificio'), ubicacion: this.gv('tareaUbicacion'), proveedor: this.gv('tareaProveedor'), fecha: this.gv('tareaFecha'), estado: this.gv('tareaEstado'), observaciones: this.gv('tareaObservaciones') };
        if (id) { const i = this.data.tareas.findIndex(t => t.id === id); if (i !== -1) { d.id = id; this.data.tareas[i] = { ...this.data.tareas[i], ...d }; await db.put('tareas', this.data.tareas[i]); } }
        else { d.id = 'TAR-' + Date.now(); this.data.tareas.push(d); await db.put('tareas', d); }
        this.closeModal(); this.renderTareas(); this.showToast(id ? 'Tarea actualizada' : 'Tarea creada', 'success');
    }

    editTarea(id) { const t = this.data.tareas.find(x => x.id === id); if (t) this.showModal('Editar Tarea', this.getTareaForm(t), () => this.saveTarea(t.id)); }
    async deleteTarea(id) { if (!confirm('¿Eliminar tarea?')) return; this.data.tareas = this.data.tareas.filter(t => t.id !== id); await db.delete('tareas', id); this.renderTareas(); this.showToast('Tarea eliminada', 'success'); }

    // =================== VISITAS ===================
    renderVisitas() {
        const edi = document.getElementById('filterVisitaEdificio')?.value || '';
        const tipo = document.getElementById('filterVisitaTipo')?.value || '';
        const est = document.getElementById('filterVisitaEstado')?.value || '';
        let visitas = [...(this.data.visitas || [])];
        if (edi) visitas = visitas.filter(v => v.edificio === edi);
        if (tipo) visitas = visitas.filter(v => v.tipo === tipo);
        if (est) visitas = visitas.filter(v => v.estado === est);

        const tbody = document.getElementById('visitasBody');
        if (!tbody) return;
        tbody.innerHTML = visitas.length ? visitas.map(v => `
            <tr>
                <td><strong>${v.id}</strong></td><td>${this.formatDate(v.fecha)}</td>
                <td><span class="edificio-tag" style="background:${getEdificioColor(v.edificio, this.data.listas?.edificios)}">${v.edificio}</span></td>
                <td>${v.tipo}</td><td>${v.motivo}</td><td>${v.proveedor}</td>
                <td><span class="status-badge status-${v.estado.toLowerCase().replace(' ', '')}">${v.estado}</span></td>
                <td class="actions-cell">
                    <button class="btn-success btn-sm" onclick="app.editVisita('${v.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger btn-sm" onclick="app.deleteVisita('${v.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`).join('') : '<tr><td colspan="8" class="text-center">No se encontraron visitas</td></tr>';
        document.getElementById('navVisitasBadge').textContent = this.data.visitas?.filter(v => v.estado !== 'Completado').length || 0;
    }

    getVisitaForm(v = null) {
        const eds = this.data.listas.edificios || [], tps = this.data.listas.tiposVisita || [], provs = this.data.proveedores || [], sts = ['Pendiente', 'En Progreso', 'Completado'];
        return `<form>
            <div class="form-group"><label>Edificio *</label><select id="visitaEdificio">${eds.map(e => `<option value="${e}" ${v?.edificio === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
            <div class="form-group"><label>Tipo de Visita *</label><select id="visitaTipo">${tps.map(t => `<option value="${t}" ${v?.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
            <div class="form-group"><label>Fecha *</label><input type="date" id="visitaFecha" value="${v?.fecha || new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label>Motivo *</label><input type="text" id="visitaMotivo" value="${v?.motivo || ''}" placeholder="Motivo de la visita"></div>
            <div class="form-group"><label>Proveedor</label><select id="visitaProveedor"><option value="">Sin asignar</option>${provs.map(p => `<option value="${p.empresa}" ${v?.proveedor === p.empresa ? 'selected' : ''}>${p.empresa}</option>`).join('')}</select></div>
            <div class="form-group"><label>Estado</label><select id="visitaEstado">${sts.map(s => `<option value="${s}" ${v?.estado === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            <div class="form-group"><label>Observaciones</label><textarea id="visitaObservaciones" rows="2">${v?.observaciones || ''}</textarea></div>
        </form>`;
    }

    async saveVisita(id = null) {
        const d = { fecha: this.gv('visitaFecha'), edificio: this.gv('visitaEdificio'), tipo: this.gv('visitaTipo'), motivo: this.gv('visitaMotivo'), proveedor: this.gv('visitaProveedor'), estado: this.gv('visitaEstado'), observaciones: this.gv('visitaObservaciones'), responsable: '' };
        if (id) { const i = this.data.visitas.findIndex(v => v.id === id); if (i !== -1) { d.id = id; this.data.visitas[i] = { ...this.data.visitas[i], ...d }; await db.put('visitas', this.data.visitas[i]); } }
        else { d.id = 'VIS-' + Date.now(); this.data.visitas.push(d); await db.put('visitas', d); }
        this.closeModal(); this.renderVisitas(); this.showToast(id ? 'Visita actualizada' : 'Visita creada', 'success');
    }

    editVisita(id) { const v = this.data.visitas.find(x => x.id === id); if (v) this.showModal('Editar Visita', this.getVisitaForm(v), () => this.saveVisita(v.id)); }
    async deleteVisita(id) { if (!confirm('¿Eliminar visita?')) return; this.data.visitas = this.data.visitas.filter(v => v.id !== id); await db.delete('visitas', id); this.renderVisitas(); this.showToast('Visita eliminada', 'success'); }

    // =================== CRONOGRAMA ===================
    renderCronograma() {
        const meses = this.data.listas.meses || INITIAL_DATA.meses;
        const eds = this.data.listas.edificios || [];
        const grid = document.getElementById('cronogramaGrid');
        if (!grid) return;
        if (eds.length === 0) { grid.innerHTML = '<p class="crono-empty">Agrega edificios en Configuración para ver el cronograma</p>'; return; }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (this.cronogramaView === 'monthly') {
            document.getElementById('currentPeriod').textContent = `${meses[this.currentMonth]} ${this.currentYear}`;
            this._renderMonthlyCalendar(grid, eds, today);
        } else {
            const weekEnd = new Date(this.currentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            document.getElementById('currentPeriod').textContent = `${this.currentWeekStart.getDate()} ${meses[this.currentWeekStart.getMonth()]} - ${weekEnd.getDate()} ${meses[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
            this._renderWeeklyCalendar(grid, eds, today);
        }
    }

    _getItemsForRange(start, end, edificio) {
        const tareas = (this.data.tareas || []).filter(t => t.edificio === edificio);
        const visitas = (this.data.visitas || []).filter(v => v.edificio === edificio);
        const incidencias = (this.data.incidencias || []).filter(i => i.edificio === edificio);
        const result = [];
        tareas.forEach(t => {
            const f = new Date(t.fecha + 'T00:00:00');
            if (f >= start && f <= end) result.push({ date: f, label: t.actividad, cat: t.categoria, type: 'tarea', estado: t.estado });
        });
        visitas.forEach(v => {
            const f = new Date(v.fecha + 'T00:00:00');
            if (f >= start && f <= end) result.push({ date: f, label: v.motivo, cat: v.tipo, type: 'visita', estado: v.estado });
        });
        incidencias.forEach(i => {
            const f = new Date(i.fecha + 'T00:00:00');
            if (f >= start && f <= end) result.push({ date: f, label: i.descripcion, cat: i.categoria, type: 'incidencia', estado: i.estado });
        });
        return result;
    }

    _renderMonthlyCalendar(grid, eds, today) {
        const year = this.currentYear;
        const month = this.currentMonth;
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPad = (firstDay.getDay() + 6) % 7;
        const totalDays = lastDay.getDate();
        const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

        const rangeStart = new Date(year, month, 1);
        const rangeEnd = new Date(year, month + 1, 0);
        const allItems = eds.flatMap(ed => this._getItemsForRange(rangeStart, rangeEnd, ed));

        let html = '<div class="cal-monthly">';
        html += `<div class="cal-header-row">${dayNames.map(d => `<div class="cal-header-cell">${d}</div>`).join('')}</div>`;
        html += '<div class="cal-grid">';

        for (let i = 0; i < startPad; i++) {
            html += '<div class="cal-cell cal-cell-empty"></div>';
        }

        for (let day = 1; day <= totalDays; day++) {
            const cellDate = new Date(year, month, day);
            const isToday = cellDate.getTime() === today.getTime();
            const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
            const dayItems = allItems.filter(i => i.date.getDate() === day);

            html += `<div class="cal-cell ${isToday ? 'cal-today' : ''} ${isWeekend ? 'cal-weekend' : ''}">
                <div class="cal-day-header"><span class="cal-day-num ${isToday ? 'cal-day-today' : ''}">${day}</span></div>
                <div class="cal-day-items">`;

            dayItems.slice(0, 4).forEach(item => {
                const color = item.type === 'tarea' ? CATEGORY_COLORS[item.cat] || '#6b7280' : item.type === 'visita' ? '#8b5cf6' : '#ef4444';
                const edColor = getEdificioColor(eds.find(ed => this._getItemsForRange(cellDate, cellDate, ed).includes(item)), eds);
                const icon = item.type === 'tarea' ? 'fa-check-square' : item.type === 'visita' ? 'fa-calendar-check' : 'fa-exclamation-circle';
                const done = item.estado === 'Completado';
                html += `<div class="cal-event ${done ? 'cal-event-done' : ''}" style="--event-color:${color}">
                    <span class="cal-event-dot" style="background:${color}"></span>
                    <span class="cal-event-text">${item.label.substring(0, 20)}${item.label.length > 20 ? '...' : ''}</span>
                </div>`;
            });

            if (dayItems.length > 4) {
                html += `<div class="cal-more">+${dayItems.length - 4} más</div>`;
            }

            html += '</div></div>';
        }

        const endPad = (7 - ((startPad + totalDays) % 7)) % 7;
        for (let i = 0; i < endPad; i++) {
            html += '<div class="cal-cell cal-cell-empty"></div>';
        }

        html += '</div></div>';

        html += '<div class="cal-legend">';
        html += '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:#6b7280"></span>Tarea</div>';
        html += '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:#8b5cf6"></span>Visita</div>';
        html += '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:#ef4444"></span>Incidencia</div>';
        eds.forEach(ed => {
            html += `<div class="cal-legend-item"><span class="cal-legend-dot" style="background:${getEdificioColor(ed, eds)}"></span>${ed}</div>`;
        });
        html += '</div>';

        grid.innerHTML = html;
    }

    _renderWeeklyCalendar(grid, eds, today) {
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const dayNamesShort = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const allItems = eds.flatMap(ed => this._getItemsForRange(this.currentWeekStart, weekEnd, ed));

        let html = '<div class="cal-weekly">';

        html += '<div class="cal-week-header">';
        html += '<div class="cal-week-sidebar-spacer"></div>';
        for (let d = 0; d < 7; d++) {
            const dayDate = new Date(this.currentWeekStart);
            dayDate.setDate(dayDate.getDate() + d);
            const isToday = dayDate.getTime() === today.getTime();
            html += `<div class="cal-week-day-header ${isToday ? 'cal-week-today-header' : ''}">
                <span class="cal-week-day-name">${dayNamesShort[d]}</span>
                <span class="cal-week-day-num ${isToday ? 'cal-week-day-today' : ''}">${dayDate.getDate()}</span>
            </div>`;
        }
        html += '</div>';

        html += '<div class="cal-week-body">';
        eds.forEach(ed => {
            const edColor = getEdificioColor(ed, eds);
            html += `<div class="cal-week-building" style="--ed-color:${edColor}">
                <div class="cal-week-ed-label"><span class="cal-week-ed-dot" style="background:${edColor}"></span>${ed}</div>`;

            for (let d = 0; d < 7; d++) {
                const dayDate = new Date(this.currentWeekStart);
                dayDate.setDate(dayDate.getDate() + d);
                const isToday = dayDate.getTime() === today.getTime();
                const dayItems = allItems.filter(i => i.date.getTime() === dayDate.getTime() && eds.indexOf(ed) === eds.findIndex(e2 => {
                    return this._getItemsForRange(dayDate, dayDate, e2).includes(i);
                }));

                const cellItems = this._getItemsForRange(dayDate, dayDate, ed);

                html += `<div class="cal-week-cell ${isToday ? 'cal-week-today' : ''}">`;
                cellItems.forEach(item => {
                    const color = item.type === 'tarea' ? CATEGORY_COLORS[item.cat] || '#6b7280' : item.type === 'visita' ? '#8b5cf6' : '#ef4444';
                    const done = item.estado === 'Completado';
                    html += `<div class="cal-week-event ${done ? 'cal-event-done' : ''}" style="--event-color:${color}">
                        <span class="cal-event-dot" style="background:${color}"></span>
                        <span>${item.label.substring(0, 18)}${item.label.length > 18 ? '...' : ''}</span>
                    </div>`;
                });
                html += '</div>';
            }
            html += '</div>';
        });
        html += '</div>';

        html += '<div class="cal-legend">';
        html += '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:#3b82f6"></span>Tarea</div>';
        html += '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:#8b5cf6"></span>Visita</div>';
        html += '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:#ef4444"></span>Incidencia</div>';
        html += '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:#10b981"></span>Completado</div>';
        html += '</div>';

        grid.innerHTML = html;
    }

    exportCronogramaPDF() {
        const meses = this.data.listas.meses || INITIAL_DATA.meses;
        const eds = this.data.listas.edificios || [];
        const title = this.cronogramaView === 'monthly' ? `Cronograma Mensual - ${meses[this.currentMonth]} ${this.currentYear}` : `Cronograma Semanal - ${document.getElementById('currentPeriod').textContent}`;
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        let dateStart, dateEnd;
        if (this.cronogramaView === 'monthly') {
            dateStart = new Date(this.currentYear, this.currentMonth, 1);
            dateEnd = new Date(this.currentYear, this.currentMonth + 1, 0);
        } else {
            dateStart = new Date(this.currentWeekStart);
            dateEnd = new Date(this.currentWeekStart);
            dateEnd.setDate(dateEnd.getDate() + 6);
        }

        const allItems = eds.flatMap(ed => this._getItemsForRange(dateStart, dateEnd, ed));
        const today = new Date();

        let bodyContent = '';
        if (this.cronogramaView === 'monthly') {
            const firstDay = new Date(this.currentYear, this.currentMonth, 1);
            const totalDays = dateEnd.getDate();
            const startPad = (firstDay.getDay() + 6) % 7;

            bodyContent += `<table class="cal-table"><thead><tr>${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody><tr>`;
            for (let i = 0; i < startPad; i++) bodyContent += '<td class="empty-cell"></td>';

            for (let day = 1; day <= totalDays; day++) {
                const cellDate = new Date(this.currentYear, this.currentMonth, day);
                const isToday = cellDate.toDateString() === today.toDateString();
                const dayItems = allItems.filter(i => i.date.getDate() === day);
                bodyContent += `<td class="${isToday ? 'today-cell' : ''}"><div class="cell-day ${dayItems.length ? 'has-items' : ''}">${day}</div>`;
                dayItems.forEach(item => {
                    const color = item.type === 'tarea' ? '#3b82f6' : item.type === 'visita' ? '#8b5cf6' : '#ef4444';
                    const done = item.estado === 'Completado' ? ' ✓' : '';
                    bodyContent += `<div class="cell-event" style="border-left-color:${color}">${item.label.substring(0, 22)}${done}</div>`;
                });
                bodyContent += '</td>';
                if ((startPad + day) % 7 === 0 && day < totalDays) bodyContent += '</tr><tr>';
            }
            const endPad = (7 - ((startPad + totalDays) % 7)) % 7;
            for (let i = 0; i < endPad; i++) bodyContent += '<td class="empty-cell"></td>';
            bodyContent += '</tr></tbody></table>';
        } else {
            const dayNamesFull = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            bodyContent += `<table class="cal-table weekly-table"><thead><tr><th style="width:120px">Edificio</th>${dayNamesFull.map((d, i) => {
                const dd = new Date(this.currentWeekStart); dd.setDate(dd.getDate() + i);
                const isT = dd.toDateString() === today.toDateString();
                return `<th class="${isT ? 'today-header' : ''}">${d} ${dd.getDate()}</th>`;
            }).join('')}</tr></thead><tbody>`;
            eds.forEach(ed => {
                const edColor = getEdificioColor(ed, eds);
                bodyContent += `<tr><td class="ed-label" style="border-left:4px solid ${edColor};font-weight:700">${ed}</td>`;
                for (let d = 0; d < 7; d++) {
                    const dd = new Date(this.currentWeekStart); dd.setDate(dd.getDate() + d);
                    const cellItems = this._getItemsForRange(dd, dd, ed);
                    const isT = dd.toDateString() === today.toDateString();
                    bodyContent += `<td class="${isT ? 'today-cell' : ''}">`;
                    cellItems.forEach(item => {
                        const color = item.type === 'tarea' ? '#3b82f6' : item.type === 'visita' ? '#8b5cf6' : '#ef4444';
                        const done = item.estado === 'Completado' ? ' ✓' : '';
                        bodyContent += `<div class="cell-event" style="border-left-color:${color}">${item.label.substring(0, 20)}${done}</div>`;
                    });
                    bodyContent += '</td>';
                }
                bodyContent += '</tr>';
            });
            bodyContent += '</tbody></table>';
        }

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:Arial,Helvetica,sans-serif;padding:25px;color:#1e293b}
            .header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1e40af;padding-bottom:10px;margin-bottom:16px}
            h1{font-size:20px;color:#1e40af} .date{font-size:11px;color:#64748b}
            .cal-table{width:100%;border-collapse:collapse;table-layout:fixed}
            .cal-table th{background:#1e40af;color:white;padding:8px 4px;font-size:10px;text-transform:uppercase;letter-spacing:0.5px}
            .cal-table td{border:1px solid #e2e8f0;vertical-align:top;padding:3px;height:70px;width:14.28%}
            .empty-cell{background:#f8fafc}
            .today-cell{background:#eff6ff}
            .today-header{background:#1e3a8a}
            .cell-day{font-size:12px;font-weight:700;color:#475569;margin-bottom:3px}
            .cell-day.has-items{color:#1e293b}
            .cell-event{font-size:8px;padding:2px 4px;margin:1px 0;border-left:2px solid #ccc;background:#f8fafc;border-radius:0 3px 3px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
            .weekly-table td{height:60px}
            .ed-label{font-size:10px;padding:4px 8px}
            .legend{display:flex;gap:14px;margin-top:12px;padding-top:8px;border-top:1px solid #e2e8f0}
            .legend-item{display:flex;align-items:center;gap:4px;font-size:9px;color:#64748b}
            .legend-dot{width:8px;height:8px;border-radius:50%}
            @media print{body{padding:15px}.cal-table td{height:65px}}
        </style></head><body>
            <div class="header"><div><h1>${title}</h1><div class="date">Facility Management · ${today.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div></div></div>
            ${bodyContent}
            <div class="legend">
                <div class="legend-item"><span class="legend-dot" style="background:#3b82f6"></span>Tarea</div>
                <div class="legend-item"><span class="legend-dot" style="background:#8b5cf6"></span>Visita</div>
                <div class="legend-item"><span class="legend-dot" style="background:#ef4444"></span>Incidencia</div>
                ${eds.map(ed => `<div class="legend-item"><span class="legend-dot" style="background:${getEdificioColor(ed, eds)}"></span>${ed}</div>`).join('')}
            </div>
        </body></html>`;
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 500);
    }

    // =================== CARTA GANTT ===================
    renderGantt() {
        const container = document.getElementById('ganttContainer');
        if (!container) return;
        const gfEd = document.getElementById('filterGanttEdificio')?.value || '';
        const gfCat = document.getElementById('filterGanttCategoria')?.value || '';

        let tareas = [...(this.data.tareas || [])];
        let visitas = [...(this.data.visitas || [])];
        if (gfEd) { tareas = tareas.filter(t => t.edificio === gfEd); visitas = visitas.filter(v => v.edificio === gfEd); }
        if (gfCat) tareas = tareas.filter(t => t.categoria === gfCat);

        const allItems = [
            ...tareas.map(t => ({ id: t.id, label: t.actividad, edificio: t.edificio, categoria: t.categoria, fecha: new Date(t.fecha), estado: t.estado, type: 'Tarea' })),
            ...visitas.map(v => ({ id: v.id, label: v.motivo, edificio: v.edificio, categoria: v.tipo, fecha: new Date(v.fecha), estado: v.estado, type: 'Visita' }))
        ].sort((a, b) => a.fecha - b.fecha);

        if (allItems.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-project-diagram"></i><p>No hay actividades para mostrar en el Gantt</p></div>';
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const minDate = new Date(Math.min(...allItems.map(i => i.fecha.getTime())));
        minDate.setDate(minDate.getDate() - 1);
        const maxDate = new Date(Math.max(...allItems.map(i => i.fecha.getTime())));
        maxDate.setDate(maxDate.getDate() + 14);
        const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
        const dayWidth = 44;
        const rowHeight = 52;
        const headerHeight = 60;

        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        let html = `<div class="gantt-wrapper">
            <div class="gantt-sidebar" style="padding-top:${headerHeight}px">
                ${allItems.map(item => {
                    const edColor = getEdificioColor(item.edificio, eds);
                    const statusDot = item.estado === 'Completado' ? '#10b981' : item.estado === 'En Progreso' ? '#f59e0b' : '#94a3b8';
                    return `<div class="gantt-sidebar-row" style="height:${rowHeight}px">
                        <div class="gantt-sidebar-status" style="background:${statusDot}"></div>
                        <div class="gantt-sidebar-info">
                            <span class="gantt-sidebar-label">${item.label.substring(0, 28)}${item.label.length > 28 ? '...' : ''}</span>
                            <span class="gantt-sidebar-meta"><span class="edificio-dot" style="background:${edColor}"></span>${item.edificio} · ${item.type}</span>
                        </div>
                    </div>`;
                }).join('')}
            </div>
            <div class="gantt-chart-area">
                <div class="gantt-header" style="width:${totalDays * dayWidth}px;height:${headerHeight}px">
                    ${Array.from({ length: totalDays }, (_, i) => {
                        const d = new Date(minDate);
                        d.setDate(d.getDate() + i);
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        const isToday = d.getTime() === today.getTime();
                        const showMonth = d.getDate() === 1 || i === 0;
                        return `<div class="gantt-day ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}" style="width:${dayWidth}px">
                            ${showMonth ? `<span class="gantt-month-label">${monthNames[d.getMonth()]}</span>` : ''}
                            <span class="gantt-day-num ${isToday ? 'today-num' : ''}">${d.getDate()}</span>
                            <span class="gantt-day-name">${dayNames[d.getDay()]}</span>
                        </div>`;
                    }).join('')}
                </div>
                <div class="gantt-body">
                    ${allItems.map(item => {
                        const offset = Math.ceil((item.fecha - minDate) / (1000 * 60 * 60 * 24));
                        const color = item.type === 'Tarea' ? CATEGORY_COLORS[item.categoria] || '#6b7280' : '#8b5cf6';
                        const bgColor = color + '20';
                        const isCompleted = item.estado === 'Completado';
                        const barWidth = item.type === 'Visita' ? 2 : Math.max(4, Math.min(8, 1 + Math.floor(Math.random() * 3)));
                        return `<div class="gantt-row" style="height:${rowHeight}px">
                            <div class="gantt-track" style="width:${totalDays * dayWidth}px">
                                ${Array.from({ length: totalDays }, (_, i) => {
                                    const d = new Date(minDate);
                                    d.setDate(d.getDate() + i);
                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                    const isToday = d.getTime() === today.getTime();
                                    return `<div class="gantt-cell ${isWeekend ? 'weekend' : ''} ${isToday ? 'today-col' : ''}" style="width:${dayWidth}px"></div>`;
                                }).join('')}
                                <div class="gantt-bar ${isCompleted ? 'completed' : ''}" style="left:${offset * dayWidth}px;width:${barWidth * dayWidth}px;background:${color}" title="${item.label} (${item.estado})">
                                    <span class="gantt-bar-label">${item.label.substring(0, 15)}</span>
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                    <div class="gantt-today-line" style="left:${Math.ceil((today - minDate) / (1000 * 60 * 60 * 24)) * dayWidth}px;height:${allItems.length * rowHeight}px"></div>
                </div>
            </div>
        </div>`;
        container.innerHTML = html;

        const chartArea = container.querySelector('.gantt-chart-area');
        if (chartArea) {
            const todayOffset = Math.ceil((today - minDate) / (1000 * 60 * 60 * 24)) * dayWidth;
            chartArea.scrollLeft = Math.max(0, todayOffset - chartArea.clientWidth / 3);
        }
    }

    // =================== INCIDENCIAS ===================
    renderIncidencias() {
        const edi = document.getElementById('filterIncidenciaEdificio')?.value || '';
        const pri = document.getElementById('filterPrioridad')?.value || '';
        const est = document.getElementById('filterEstadoInc')?.value || '';
        let inc = [...(this.data.incidencias || [])];
        if (edi) inc = inc.filter(i => i.edificio === edi);
        if (pri) inc = inc.filter(i => i.prioridad === pri);
        if (est) inc = inc.filter(i => i.estado === est);

        const tbody = document.getElementById('incidenciasBody');
        if (!tbody) return;
        tbody.innerHTML = inc.length ? inc.map(i => `
            <tr>
                <td><strong>${i.id}</strong></td><td>${this.formatDate(i.fecha)}</td>
                <td><span class="edificio-tag" style="background:${getEdificioColor(i.edificio, this.data.listas?.edificios)}">${i.edificio}</span></td>
                <td>${i.descripcion}</td>
                <td><span style="color:${CATEGORY_COLORS[i.categoria]};font-weight:500">${i.categoria}</span></td>
                <td><span class="status-badge status-${i.prioridad.toLowerCase()}">${i.prioridad}</span></td>
                <td>${i.proveedor}</td>
                <td><span class="status-badge status-${i.estado.toLowerCase().replace(' ', '')}">${i.estado}</span></td>
                <td class="actions-cell">
                    <button class="btn-success btn-sm" onclick="app.editIncidencia('${i.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger btn-sm" onclick="app.deleteIncidencia('${i.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`).join('') : '<tr><td colspan="9" class="text-center">No se encontraron incidencias</td></tr>';
        document.getElementById('navIncidenciasBadge').textContent = this.data.incidencias?.filter(i => i.estado !== 'Completado').length || 0;
    }

    getIncidenciaForm(i = null) {
        const cats = this.data.listas.categorias || [], eds = this.data.listas.edificios || [], ubs = this.data.listas.ubicaciones || [], prs = this.data.listas.prioridades || [], provs = this.data.proveedores || [];
        return `<form>
            <div class="form-group"><label>Edificio *</label><select id="incEdificio">${eds.map(e => `<option value="${e}" ${i?.edificio === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
            <div class="form-group"><label>Descripción *</label><input type="text" id="incDescripcion" value="${i?.descripcion || ''}"></div>
            <div class="form-group"><label>Categoría *</label><select id="incCategoria">${cats.map(c => `<option value="${c}" ${i?.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            <div class="form-group"><label>Ubicación</label><select id="incUbicacion">${ubs.map(u => `<option value="${u}" ${i?.ubicacion === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
            <div class="form-group"><label>Prioridad *</label><select id="incPrioridad">${prs.map(p => `<option value="${p}" ${i?.prioridad === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
            <div class="form-group"><label>Proveedor</label><select id="incProveedor"><option value="">Sin asignar</option>${provs.map(p => `<option value="${p.empresa}" ${i?.proveedor === p.empresa ? 'selected' : ''}>${p.empresa}</option>`).join('')}</select></div>
            <div class="form-group"><label>Estado</label><select id="incEstado">${['Pendiente', 'En Progreso', 'Completado'].map(e => `<option value="${e}" ${i?.estado === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
            <div class="form-group"><label>Observaciones</label><textarea id="incObservaciones" rows="2">${i?.observaciones || ''}</textarea></div>
        </form>`;
    }

    async saveIncidencia(id = null) {
        const d = { fecha: new Date().toISOString().split('T')[0], edificio: this.gv('incEdificio'), descripcion: this.gv('incDescripcion'), categoria: this.gv('incCategoria'), ubicacion: this.gv('incUbicacion'), prioridad: this.gv('incPrioridad'), proveedor: this.gv('incProveedor'), estado: this.gv('incEstado'), observaciones: this.gv('incObservaciones'), fotos: [] };
        if (id) { const i = this.data.incidencias.findIndex(x => x.id === id); if (i !== -1) { d.id = id; this.data.incidencias[i] = { ...this.data.incidencias[i], ...d }; await db.put('incidencias', this.data.incidencias[i]); } }
        else {
            d.id = 'INC-' + Date.now();
            this.data.incidencias.push(d);
            await db.put('incidencias', d);

            const tarea = {
                id: 'TAR-' + Date.now(),
                actividad: `Resolver incidencia: ${d.descripcion}`,
                categoria: d.categoria,
                edificio: d.edificio,
                ubicacion: d.ubicacion,
                proveedor: d.proveedor,
                fecha: d.fecha,
                estado: 'Pendiente',
                observaciones: `Generada desde incidencia ${d.id}. Prioridad: ${d.prioridad}. ${d.observaciones || ''}`
            };
            this.data.tareas.push(tarea);
            await db.put('tareas', tarea);
            this.showToast(`Tarea automática creada: ${tarea.actividad}`, 'info');
        }
        this.closeModal(); this.renderIncidencias(); this.renderDashboard(); this.updateNotificationBadge(); this.showToast(id ? 'Incidencia actualizada' : 'Incidencia creada + tarea generada', 'success');
    }

    editIncidencia(id) { const i = this.data.incidencias.find(x => x.id === id); if (i) this.showModal('Editar Incidencia', this.getIncidenciaForm(i), () => this.saveIncidencia(i.id)); }
    async deleteIncidencia(id) { if (!confirm('¿Eliminar incidencia?')) return; this.data.incidencias = this.data.incidencias.filter(i => i.id !== id); await db.delete('incidencias', id); this.renderIncidencias(); this.showToast('Incidencia eliminada', 'success'); }

    // =================== INFORMES DIARIOS ===================
    renderInformes() {
        const edi = document.getElementById('filterInformeEdificio')?.value || '';
        const fec = document.getElementById('filterInformeFecha')?.value || '';
        let informes = [...(this.data.informesDiarios || [])];
        if (edi) informes = informes.filter(i => i.edificio === edi);
        if (fec) informes = informes.filter(i => i.fecha === fec);
        informes.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        const list = document.getElementById('informesList');
        if (!list) return;
        list.innerHTML = informes.length ? informes.map(inf => {
            const tareasCount = inf.tareasResumen?.length || 0;
            const visitasCount = inf.visitasResumen?.length || 0;
            const incCount = inf.incidenciasResumen?.length || 0;
            return `
            <div class="informe-card">
                <div class="informe-header">
                    <div><span class="edificio-tag" style="background:${getEdificioColor(inf.edificio, this.data.listas?.edificios)}">${inf.edificio}</span><span class="informe-date">${this.formatDate(inf.fecha)}</span></div>
                    <div class="informe-actions">
                        <button class="btn-secondary btn-sm" onclick="app.printInforme('${inf.id}')"><i class="fas fa-print"></i></button>
                        <button class="btn-success btn-sm" onclick="app.editInforme('${inf.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-danger btn-sm" onclick="app.deleteInforme('${inf.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="informe-body">
                    <h4>${inf.titulo}</h4>
                    <div class="informe-stats-row">
                        <div class="informe-stat"><span class="informe-stat-num">${tareasCount}</span><span class="informe-stat-label">Tareas</span></div>
                        <div class="informe-stat"><span class="informe-stat-num">${visitasCount}</span><span class="informe-stat-label">Visitas</span></div>
                        <div class="informe-stat"><span class="informe-stat-num">${incCount}</span><span class="informe-stat-label">Incidencias</span></div>
                    </div>
                    ${inf.descripcion ? `<div class="informe-section"><h5><i class="fas fa-align-left"></i> Resumen</h5><p>${inf.descripcion}</p></div>` : ''}
                    ${inf.tareasResumen?.length ? `<div class="informe-section"><h5><i class="fas fa-tasks"></i> Tareas del día</h5><ul>${inf.tareasResumen.map(t => `<li class="${t.completada ? 'done' : ''}"><span class="informe-item-dot" style="background:${t.completada ? '#10b981' : '#f59e0b'}"></span>${t.texto}</li>`).join('')}</ul></div>` : ''}
                    ${inf.visitasResumen?.length ? `<div class="informe-section"><h5><i class="fas fa-clipboard-check"></i> Visitas realizadas</h5><ul>${inf.visitasResumen.map(v => `<li class="${v.completada ? 'done' : ''}"><span class="informe-item-dot" style="background:${v.completada ? '#10b981' : '#8b5cf6'}"></span>${v.texto}</li>`).join('')}</ul></div>` : ''}
                    ${inf.incidenciasResumen?.length ? `<div class="informe-section"><h5><i class="fas fa-exclamation-triangle"></i> Incidencias</h5><ul>${inf.incidenciasResumen.map(i => `<li class="${i.completada ? 'done' : ''}"><span class="informe-item-dot" style="background:${i.completada ? '#10b981' : '#ef4444'}"></span>${i.texto}</li>`).join('')}</ul></div>` : ''}
                    ${inf.pendientes ? `<div class="informe-section informe-pendientes"><h5><i class="fas fa-clock"></i> Pendientes para próximas fechas</h5><p>${inf.pendientes}</p></div>` : ''}
                    ${inf.observaciones ? `<div class="informe-section"><h5><i class="fas fa-sticky-note"></i> Observaciones</h5><p>${inf.observaciones}</p></div>` : ''}
                </div>
            </div>`;
        }).join('') : '<div class="empty-state"><i class="fas fa-file-alt"></i><p>No hay informes diarios</p><button class="btn-primary" onclick="app.showNewInformeModal()"><i class="fas fa-plus"></i> Crear Primer Informe</button></div>';
    }

    getInformeForm(inf = null) {
        const eds = this.data.listas.edificios || [];
        const fecha = inf?.fecha || new Date().toISOString().split('T')[0];
        const fechafn = new Date(fecha + 'T00:00:00');

        const dayTareas = (this.data.tareas || []).filter(t => t.fecha === fecha);
        const dayVisitas = (this.data.visitas || []).filter(v => v.fecha === fecha);
        const dayIncidencias = (this.data.incidencias || []).filter(i => i.fecha === fecha);
        const pendingTareas = (this.data.tareas || []).filter(t => t.fecha > fecha && t.estado !== 'Completado');

        const summaryHTML = `
            <div class="informe-auto-summary">
                <p class="informe-auto-label"><i class="fas fa-magic"></i> Datos del ${this.formatDate(fecha)}:</p>
                <div class="informe-auto-stats">
                    <span><strong>${dayTareas.length}</strong> tareas (${dayTareas.filter(t => t.estado === 'Completado').length} completadas)</span>
                    <span><strong>${dayVisitas.length}</strong> visitas (${dayVisitas.filter(v => v.estado === 'Completado').length} completadas)</span>
                    <span><strong>${dayIncidencias.length}</strong> incidencias (${dayIncidencias.filter(i => i.estado === 'Completado').length} resueltas)</span>
                </div>
            </div>`;

        const autoTareas = dayTareas.map(t => `<div class="informe-check-item"><input type="checkbox" class="inf-tarea-check" data-text="${t.actividad} - ${t.edificio}" ${t.estado === 'Completado' ? 'checked' : ''}><span>${t.actividad} (${t.edificio})</span></div>`).join('');
        const autoVisitas = dayVisitas.map(v => `<div class="informe-check-item"><input type="checkbox" class="inf-visita-check" data-text="${v.motivo} - ${v.edificio}" ${v.estado === 'Completado' ? 'checked' : ''}><span>${v.motivo} (${v.edificio})</span></div>`).join('');
        const autoIncidencias = dayIncidencias.map(i => `<div class="informe-check-item"><input type="checkbox" class="inf-incidencia-check" data-text="${i.descripcion} - ${i.edificio}" ${i.estado === 'Completado' ? 'checked' : ''}><span>${i.descripcion} (${i.edificio})</span></div>`).join('');
        const pendientesHTML = pendingTareas.length ? `<p class="informe-pendientes-auto">${pendingTareas.map(t => `${t.actividad} (${t.edificio} - ${this.formatDate(t.fecha)})`).join(' · ')}</p>` : '';

        return `<form>
            <div class="form-group"><label>Edificio *</label><select id="informeEdificio" onchange="app._updateInformeSummary()">${eds.map(e => `<option value="${e}" ${inf?.edificio === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
            <div class="form-group"><label>Fecha *</label><input type="date" id="informeFecha" value="${fecha}" onchange="app._updateInformeSummary()"></div>
            ${summaryHTML}
            <div class="form-group"><label>Título del Informe *</label><input type="text" id="informeTitulo" value="${inf?.titulo || ''}" placeholder="Ej: Informe diario de mantención"></div>
            <div class="form-group"><label>Descripción / Resumen general *</label><textarea id="informeDescripcion" rows="3" placeholder="Resumen del día...">${inf?.descripcion || ''}</textarea></div>
            ${dayTareas.length ? `<div class="form-group"><label><i class="fas fa-tasks"></i> Tareas del día</label><div class="informe-check-list" id="infTareasList">${autoTareas || ''}</div></div>` : ''}
            ${dayVisitas.length ? `<div class="form-group"><label><i class="fas fa-clipboard-check"></i> Visitas del día</label><div class="informe-check-list" id="infVisitasList">${autoVisitas || ''}</div></div>` : ''}
            ${dayIncidencias.length ? `<div class="form-group"><label><i class="fas fa-exclamation-triangle"></i> Incidencias del día</label><div class="informe-check-list" id="infIncidenciasList">${autoIncidencias || ''}</div></div>` : ''}
            <div class="form-group"><label><i class="fas fa-clock"></i> Pendientes para próximas fechas</label><textarea id="informePendientes" rows="2" placeholder="Tareas pendientes, visitas futuras...">${inf?.pendientes || ''}</textarea>${pendientesHTML}</div>
            <div class="form-group"><label><i class="fas fa-sticky-note"></i> Observaciones</label><textarea id="informeObservaciones" rows="2" placeholder="Notas adicionales...">${inf?.observaciones || ''}</textarea></div>
        </form>`;
    }

    _updateInformeSummary() {
        const ed = document.getElementById('informeEdificio')?.value || '';
        const fecha = document.getElementById('informeFecha')?.value || new Date().toISOString().split('T')[0];
        const dayTareas = (this.data.tareas || []).filter(t => t.fecha === fecha && (!ed || t.edificio === ed));
        const dayVisitas = (this.data.visitas || []).filter(v => v.fecha === fecha && (!ed || v.edificio === ed));
        const dayIncidencias = (this.data.incidencias || []).filter(i => i.fecha === fecha && (!ed || i.edificio === ed));
        const label = document.querySelector('.informe-auto-label');
        if (label) label.innerHTML = `<i class="fas fa-magic"></i> Datos del ${this.formatDate(fecha)}:`;
        const stats = document.querySelector('.informe-auto-stats');
        if (stats) stats.innerHTML = `<span><strong>${dayTareas.length}</strong> tareas (${dayTareas.filter(t => t.estado === 'Completado').length} completadas)</span><span><strong>${dayVisitas.length}</strong> visitas (${dayVisitas.filter(v => v.estado === 'Completado').length} completadas)</span><span><strong>${dayIncidencias.length}</strong> incidencias (${dayIncidencias.filter(i => i.estado === 'Completado').length} resueltas)</span>`;
    }

    showNewInformeModal() {
        this.showModal('Nuevo Informe Diario', this.getInformeForm(), () => this.saveInforme());
    }

    async saveInforme(id = null) {
        const getTareas = () => Array.from(document.querySelectorAll('.inf-tarea-check')).map(el => ({ texto: el.dataset.text, completada: el.checked }));
        const getVisitas = () => Array.from(document.querySelectorAll('.inf-visita-check')).map(el => ({ texto: el.dataset.text, completada: el.checked }));
        const getIncidencias = () => Array.from(document.querySelectorAll('.inf-incidencia-check')).map(el => ({ texto: el.dataset.text, completada: el.checked }));

        const d = {
            edificio: this.gv('informeEdificio'), fecha: this.gv('informeFecha'), titulo: this.gv('informeTitulo'),
            descripcion: this.gv('informeDescripcion'), observaciones: this.gv('informeObservaciones'),
            pendientes: this.gv('informePendientes'),
            tareasResumen: getTareas(), visitasResumen: getVisitas(), incidenciasResumen: getIncidencias()
        };
        if (id) { const i = this.data.informesDiarios.findIndex(x => x.id === id); if (i !== -1) { d.id = id; this.data.informesDiarios[i] = { ...this.data.informesDiarios[i], ...d }; await db.put('informesDiarios', this.data.informesDiarios[i]); } }
        else { d.id = 'INF-' + Date.now(); this.data.informesDiarios.push(d); await db.put('informesDiarios', d); }
        this.closeModal(); this.renderInformes(); this.showToast(id ? 'Informe actualizado' : 'Informe creado', 'success');
    }

    editInforme(id) { const i = this.data.informesDiarios.find(x => x.id === id); if (i) this.showModal('Editar Informe', this.getInformeForm(i), () => this.saveInforme(i.id)); }
    async deleteInforme(id) { if (!confirm('¿Eliminar informe?')) return; this.data.informesDiarios = this.data.informesDiarios.filter(i => i.id !== id); await db.delete('informesDiarios', id); this.renderInformes(); this.showToast('Informe eliminado', 'success'); }

    printInforme(id) {
        const inf = this.data.informesDiarios.find(x => x.id === id);
        if (!inf) return;
        const edColor = getEdificioColor(inf.edificio, this.data.listas?.edificios);
        const section = (title, icon, items, color) => items?.length ? `<div class="section"><h3><i class="${icon}"></i> ${title}</h3><ul>${items.map(i => `<li style="border-left-color:${i.completada ? '#10b981' : color}"><span class="dot" style="background:${i.completada ? '#10b981' : color}"></span>${i.texto} ${i.completada ? '✓' : ''}</li>`).join('')}</ul></div>` : '';

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            body{font-family:Arial,sans-serif;margin:30px;color:#1e293b;line-height:1.6}
            .header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${edColor};padding-bottom:12px;margin-bottom:20px}
            h1{font-size:22px;margin:0} h2{font-size:14px;color:#64748b;margin:4px 0 0}
            .tag{background:${edColor};color:white;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:600}
            .stats{display:flex;gap:20px;margin:16px 0;padding:12px;background:#f8fafc;border-radius:8px}
            .stat{text-align:center} .stat strong{font-size:24px;display:block;color:${edColor}} .stat span{font-size:12px;color:#64748b}
            .section{margin:16px 0} .section h3{font-size:14px;color:#475569;border-bottom:1px solid #e2e8f0;padding-bottom:6px}
            ul{list-style:none;padding:0} li{padding:6px 12px;border-left:3px solid #ccc;margin:4px 0;background:#f8fafc;border-radius:0 4px 4px 0;font-size:13px}
            .dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px}
            .obs,.pend{margin:16px 0;padding:12px;border-radius:8px;font-size:13px}
            .obs{background:#fffbeb;border:1px solid #fde68a} .pend{background:#fef2f2;border:1px solid #fecaca}
            @media print{body{margin:15px}}
        </style></head><body>
            <div class="header"><div><h1>${inf.titulo}</h1><h2>Facility Management · ${this.formatDate(inf.fecha)}</h2></div><span class="tag">${inf.edificio}</span></div>
            <div class="stats">
                <div class="stat"><strong>${inf.tareasResumen?.length || 0}</strong><span>Tareas</span></div>
                <div class="stat"><strong>${inf.visitasResumen?.length || 0}</strong><span>Visitas</span></div>
                <div class="stat"><strong>${inf.incidenciasResumen?.length || 0}</strong><span>Incidencias</span></div>
            </div>
            ${inf.descripcion ? `<div class="section"><h3>Resumen</h3><p>${inf.descripcion}</p></div>` : ''}
            ${section('Tareas del día', 'fa-tasks', inf.tareasResumen, '#3b82f6')}
            ${section('Visitas realizadas', 'fa-clipboard-check', inf.visitasResumen, '#8b5cf6')}
            ${section('Incidencias', 'fa-exclamation-triangle', inf.incidenciasResumen, '#ef4444')}
            ${inf.pendientes ? `<div class="pend"><h3 style="margin:0 0 8px;font-size:14px"><i class="fas fa-clock"></i> Pendientes</h3><p style="margin:0">${inf.pendientes}</p></div>` : ''}
            ${inf.observaciones ? `<div class="obs"><h3 style="margin:0 0 8px;font-size:14px"><i class="fas fa-sticky-note"></i> Observaciones</h3><p style="margin:0">${inf.observaciones}</p></div>` : ''}
        </body></html>`;
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 500);
    }

    // =================== PROVEEDORES ===================
    renderProveedores() {
        const serv = document.getElementById('filterServicio')?.value || '';
        const search = document.getElementById('searchProveedor')?.value?.toLowerCase() || '';
        let provs = [...(this.data.proveedores || [])];
        if (serv) provs = provs.filter(p => p.servicio === serv);
        if (search) provs = provs.filter(p => p.empresa.toLowerCase().includes(search) || p.contacto.toLowerCase().includes(search));

        const grid = document.getElementById('providersGrid');
        if (!grid) return;
        grid.innerHTML = provs.length ? provs.map(p => `
            <div class="provider-card">
                <div class="provider-header">
                    <div class="provider-icon"><i class="fas ${CATEGORY_ICONS[p.servicio] || 'fa-tools'}"></i></div>
                    <div class="provider-info"><h4>${p.empresa}</h4><p>${p.servicio}</p></div>
                </div>
                <div class="provider-details">
                    <div class="detail-item"><label>Contacto</label><span>${p.contacto}</span></div>
                    <div class="detail-item"><label>Teléfono</label><span>${p.telefono}</span></div>
                    <div class="detail-item"><label>Email</label><span>${p.email}</span></div>
                    <div class="detail-item"><label>Calificación</label><span>${'★'.repeat(p.calificacion || 0)}${'☆'.repeat(5 - (p.calificacion || 0))}</span></div>
                </div>
                <div class="provider-actions">
                    <button class="btn-success btn-sm" onclick="app.editProveedor('${p.id}')"><i class="fas fa-edit"></i> Editar</button>
                    <button class="btn-danger btn-sm" onclick="app.deleteProveedor('${p.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`).join('') : '<p class="text-center" style="grid-column:1/-1;padding:2rem">No se encontraron proveedores</p>';
    }

    getProveedorForm(p = null) {
        const cats = this.data.listas.categorias || [];
        return `<form>
            <div class="form-group"><label>Empresa *</label><input type="text" id="provEmpresa" value="${p?.empresa || ''}"></div>
            <div class="form-group"><label>Servicio *</label><select id="provServicio">${cats.map(c => `<option value="${c}" ${p?.servicio === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            <div class="form-group"><label>Contacto *</label><input type="text" id="provContacto" value="${p?.contacto || ''}"></div>
            <div class="form-group"><label>Teléfono *</label><input type="text" id="provTelefono" value="${p?.telefono || ''}"></div>
            <div class="form-group"><label>Email</label><input type="email" id="provEmail" value="${p?.email || ''}"></div>
            <div class="form-group"><label>Calificación (1-5)</label><input type="number" id="provCalificacion" value="${p?.calificacion || 4}" min="1" max="5"></div>
        </form>`;
    }

    async saveProveedor(id = null) {
        const d = { empresa: this.gv('provEmpresa'), servicio: this.gv('provServicio'), contacto: this.gv('provContacto'), telefono: this.gv('provTelefono'), email: this.gv('provEmail'), calificacion: parseInt(this.gv('provCalificacion')) || 4, estado: 'Activo' };
        if (id) { const i = this.data.proveedores.findIndex(p => p.id === id); if (i !== -1) { d.id = id; this.data.proveedores[i] = { ...this.data.proveedores[i], ...d }; await db.put('proveedores', this.data.proveedores[i]); } }
        else { d.id = 'PRV-' + Date.now(); this.data.proveedores.push(d); await db.put('proveedores', d); }
        this.closeModal(); this.renderProveedores(); this.showToast(id ? 'Proveedor actualizado' : 'Proveedor creado', 'success');
    }

    editProveedor(id) { const p = this.data.proveedores.find(x => x.id === id); if (p) this.showModal('Editar Proveedor', this.getProveedorForm(p), () => this.saveProveedor(p.id)); }
    async deleteProveedor(id) { if (!confirm('¿Eliminar proveedor?')) return; this.data.proveedores = this.data.proveedores.filter(p => p.id !== id); await db.delete('proveedores', id); this.renderProveedores(); this.showToast('Proveedor eliminado', 'success'); }

    // =================== FOTOS ===================
    async loadPhotos() {
        const edi = document.getElementById('filterFotoEdificio')?.value || '';
        const cat = document.getElementById('filterFotoCategoria')?.value || '';
        let photos = await photoManager.getAllPhotos();
        if (edi) photos = photos.filter(p => p.edificio === edi);
        if (cat) photos = photos.filter(p => p.categoria === cat);
        photoManager.renderPhotosGrid(photos, document.getElementById('photosGrid'));
    }

    // =================== COTIZACIONES ===================
    async loadQuotes() {
        const quotes = await quoteManager.getAllQuotes();
        quoteManager.renderQuotesList(quotes, document.getElementById('quotesList'));
    }

    // =================== REPORTES ===================
    generateReport() {
        const activeBtn = document.querySelector('.report-type-btn.active');
        reportManager.generateReport(activeBtn?.dataset.report || 'resumen', document.getElementById('reportDateStart')?.value || '', document.getElementById('reportDateEnd')?.value || '', document.getElementById('reportEdificio')?.value || '');
    }

    // =================== CONFIG ===================
    async renderConfig() {
        const items = await db.getAll('config'); const c = {}; items.forEach(i => c[i.key] = i.value);
        document.getElementById('nombreEmpresa').value = c.nombreEmpresa || '';
        document.getElementById('administrador').value = c.administrador || '';
        document.getElementById('emailNotif').value = c.emailNotif || '';
        document.getElementById('telefonoEdificio').value = c.telefono || '';
        document.getElementById('statTareas').textContent = this.data.tareas?.length || 0;
        document.getElementById('statVisitas').textContent = this.data.visitas?.length || 0;
        document.getElementById('statIncidencias').textContent = this.data.incidencias?.length || 0;
        document.getElementById('statProveedores').textContent = this.data.proveedores?.length || 0;
        document.getElementById('statInformes').textContent = this.data.informesDiarios?.length || 0;
        this.renderLists();
    }

    renderLists() {
        const lists = { edificios: 'edificiosList', categorias: 'categoriasList', ubicaciones: 'ubicacionesList', tiposVisita: 'tiposVisitaList' };
        for (const [key, containerId] of Object.entries(lists)) {
            const container = document.getElementById(containerId);
            if (!container) continue;
            const items = this.data.listas[key] || [];
            container.innerHTML = items.length ? items.map(item => `<div class="list-item"><span>${item}</span><button class="btn-danger btn-sm" onclick="app.removeListItem('${key}','${item.replace(/'/g, "\\'")}')"><i class="fas fa-times"></i></button></div>`).join('') : '<p class="text-secondary" style="font-size:0.8rem">Sin elementos</p>';
        }
    }

    async addListItem(listKey, inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const value = input.value.trim();
        if (!value) return;
        if (!this.data.listas[listKey]) this.data.listas[listKey] = [];
        if (this.data.listas[listKey].includes(value)) { this.showToast('Ya existe este elemento', 'warning'); return; }
        this.data.listas[listKey].push(value);
        await db.put('listas', { key: listKey, value: this.data.listas[listKey] });
        input.value = '';
        this.renderLists();
        this.populateFilters();
        this.showToast('Elemento agregado', 'success');
    }

    async removeListItem(listKey, value) {
        if (!confirm(`¿Eliminar "${value}"?`)) return;
        this.data.listas[listKey] = (this.data.listas[listKey] || []).filter(i => i !== value);
        await db.put('listas', { key: listKey, value: this.data.listas[listKey] });
        this.renderLists();
        this.populateFilters();
        this.showToast('Elemento eliminado', 'success');
    }

    async saveConfig() {
        for (const [k, v] of [['nombreEmpresa', 'nombreEmpresa'], ['administrador', 'administrador'], ['emailNotif', 'emailNotif'], ['telefono', 'telefonoEdificio']]) {
            const el = document.getElementById(v);
            if (el) await db.put('config', { key: k, value: el.value });
        }
        this.showToast('Configuración guardada', 'success');
    }

    // =================== UTILITIES ===================
    gv(id) { const el = document.getElementById(id); return el ? el.value : ''; }
    formatDate(s) { if (!s) return ''; return new Date(s + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    showModal(title, content, onSave) { document.getElementById('modalTitle').textContent = title; document.getElementById('modalBody').innerHTML = content; document.getElementById('modalOverlay').classList.add('active'); this.modalOnSave = onSave; }
    closeModal() { document.getElementById('modalOverlay').classList.remove('active'); this.modalOnSave = null; }
    saveModalData() { if (this.modalOnSave) this.modalOnSave(); }

    showAddModal() {
        const forms = { tareas: ['Nueva Tarea', this.getTareaForm(), () => this.saveTarea()], visitas: ['Nueva Visita', this.getVisitaForm(), () => this.saveVisita()], incidencias: ['Nueva Incidencia', this.getIncidenciaForm(), () => this.saveIncidencia()], proveedores: ['Nuevo Proveedor', this.getProveedorForm(), () => this.saveProveedor()], cotizaciones: null };
        if (this.currentSection === 'cotizaciones') { quoteManager.openNewQuote(); return; }
        const f = forms[this.currentSection] || forms.tareas;
        this.showModal(f[0], f[1], f[2]);
    }

    showToast(msg, type = 'info') {
        const c = document.getElementById('toastContainer'), t = document.createElement('div');
        t.className = `toast ${type}`;
        const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        t.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${msg}</span>`;
        c.appendChild(t);
        setTimeout(() => { t.style.animation = 'toastOut 0.3s ease forwards'; setTimeout(() => t.remove(), 300); }, 3000);
    }

    updateNotificationBadge() {
        const unread = this.data.notificaciones?.filter(n => !n.leida).length || 0;
        const b = document.getElementById('notificationBadge');
        if (b) { b.textContent = unread; b.style.display = unread > 0 ? 'flex' : 'none'; }
    }

    async showNotifications() { if (this.data.notificaciones) { for (const n of this.data.notificaciones) { n.leida = true; await db.put('notificaciones', n); } } this.updateNotificationBadge(); this.showToast('Notificaciones marcadas como leídas', 'info'); }

    openSearchModal() { document.getElementById('searchModal').classList.add('active'); document.getElementById('globalSearch').focus(); }
    closeSearchModal() { document.getElementById('searchModal').classList.remove('active'); document.getElementById('globalSearch').value = ''; document.getElementById('searchResults').innerHTML = ''; }

    globalSearch(q) {
        const r = document.getElementById('searchResults');
        if (!q || q.length < 2) { r.innerHTML = ''; return; }
        const ql = q.toLowerCase(), m = [];
        this.data.tareas?.forEach(t => { if (t.actividad.toLowerCase().includes(ql) || t.edificio.toLowerCase().includes(ql)) m.push({ type: 'Tarea', text: `${t.actividad} (${t.edificio})`, section: 'tareas', icon: 'fa-tasks' }); });
        this.data.visitas?.forEach(v => { if (v.motivo.toLowerCase().includes(ql) || v.edificio.toLowerCase().includes(ql)) m.push({ type: 'Visita', text: `${v.motivo} (${v.edificio})`, section: 'visitas', icon: 'fa-clipboard-check' }); });
        this.data.incidencias?.forEach(i => { if (i.descripcion.toLowerCase().includes(ql) || i.edificio.toLowerCase().includes(ql)) m.push({ type: 'Incidencia', text: `${i.descripcion} (${i.edificio})`, section: 'incidencias', icon: 'fa-exclamation-triangle' }); });
        this.data.proveedores?.forEach(p => { if (p.empresa.toLowerCase().includes(ql)) m.push({ type: 'Proveedor', text: p.empresa, section: 'proveedores', icon: 'fa-users' }); });
        r.innerHTML = m.length ? m.slice(0, 8).map(x => `<div class="search-result-item" onclick="app.closeSearchModal();app.navigateTo('${x.section}')"><i class="fas ${x.icon}"></i><div><span class="search-result-type">${x.type}</span><span class="search-result-text">${x.text}</span></div></div>`).join('') : '<p class="search-no-results">Sin resultados</p>';
    }

    async exportData() {
        const data = await db.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = `facility_backup_${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
        this.showToast('Datos exportados', 'success');
    }

    async importData(e) {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async ev => { try { await db.importAll(JSON.parse(ev.target.result)); await this.loadData(); this.populateFilters(); this.renderSection(this.currentSection); this.showToast('Datos importados', 'success'); } catch (err) { this.showToast('Error: ' + err.message, 'error'); } };
        reader.readAsText(file);
    }

    async clearAllData() {
        if (!confirm('¿Eliminar TODOS los datos? Esto incluye edificios, categorías y toda configuración.')) return;
        for (const s of ['tareas', 'visitas', 'incidencias', 'proveedores', 'fotos', 'cotizaciones', 'notificaciones', 'informesDiarios', 'listas', 'config']) await db.clear(s);
        this.data.listas = {};
        const defaults = { categorias: [], ubicaciones: [], edificios: [], estados: INITIAL_DATA.estados, prioridades: INITIAL_DATA.prioridades, tiposVisita: [], meses: INITIAL_DATA.meses };
        for (const [k, v] of Object.entries(defaults)) { this.data.listas[k] = v; await db.put('listas', { key: k, value: v }); }
        await this.loadData(); this.populateFilters(); this.renderSection(this.currentSection); this.showToast('Datos eliminados', 'warning');
    }
}

const app = new MaintenanceApp();
document.addEventListener('DOMContentLoaded', () => app.init());
