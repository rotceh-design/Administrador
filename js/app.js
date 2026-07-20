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
                <div class="task-category" style="background:${EDIFICIO_COLORS[v.edificio] || '#6b7280'}"></div>
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
                <td><span class="edificio-tag" style="background:${EDIFICIO_COLORS[t.edificio] || '#6b7280'}">${t.edificio}</span></td>
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
                <td><span class="edificio-tag" style="background:${EDIFICIO_COLORS[v.edificio] || '#6b7280'}">${v.edificio}</span></td>
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

        let dateRange, periodLabel;
        if (this.cronogramaView === 'monthly') {
            document.getElementById('currentPeriod').textContent = `${meses[this.currentMonth]} ${this.currentYear}`;
            const firstDay = new Date(this.currentYear, this.currentMonth, 1);
            const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
            dateRange = { start: firstDay, end: lastDay, daysInPeriod: lastDay.getDate() };
            periodLabel = `${meses[this.currentMonth]} ${this.currentYear}`;
        } else {
            const weekEnd = new Date(this.currentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const startStr = `${this.currentWeekStart.getDate()}/${this.currentWeekStart.getMonth() + 1}`;
            const endStr = `${weekEnd.getDate()}/${weekEnd.getMonth() + 1}/${weekEnd.getFullYear()}`;
            document.getElementById('currentPeriod').textContent = `Semana ${startStr} - ${endStr}`;
            dateRange = { start: new Date(this.currentWeekStart), end: weekEnd, daysInPeriod: 7 };
            periodLabel = `Semana ${startStr} - ${endStr}`;
        }

        const tareas = (this.data.tareas || []).filter(t => { const f = new Date(t.fecha); return f >= dateRange.start && f <= dateRange.end; });
        const visitas = (this.data.visitas || []).filter(v => { const f = new Date(v.fecha); return f >= dateRange.start && f <= dateRange.end; });
        const incidencias = (this.data.incidencias || []).filter(i => { const f = new Date(i.fecha); return f >= dateRange.start && f <= dateRange.end; });

        let gridHtml = '';
        eds.forEach(ed => {
            const edColor = EDIFICIO_COLORS[ed] || '#6b7280';
            const edTareas = tareas.filter(t => t.edificio === ed);
            const edVisitas = visitas.filter(v => v.edificio === ed);
            const edIncidencias = incidencias.filter(i => i.edificio === ed);
            const allItems = [
                ...edTareas.map(t => ({ date: new Date(t.fecha), label: t.actividad, cat: t.categoria, type: 'tarea', estado: t.estado })),
                ...edVisitas.map(v => ({ date: new Date(v.fecha), label: v.motivo, cat: v.tipo, type: 'visita', estado: v.estado })),
                ...edIncidencias.map(i => ({ date: new Date(i.fecha), label: i.descripcion, cat: i.categoria, type: 'incidencia', estado: i.estado }))
            ].sort((a, b) => a.date - b.date);

            let bodyHtml = '';
            if (this.cronogramaView === 'monthly') {
                for (let day = 1; day <= dateRange.daysInPeriod; day++) {
                    const dayItems = allItems.filter(i => i.date.getDate() === day);
                    if (dayItems.length === 0) continue;
                    bodyHtml += `<div class="crono-day"><span class="crono-day-num">${day}</span>`;
                    dayItems.forEach(item => { bodyHtml += this._cronoItemHTML(item); });
                    bodyHtml += '</div>';
                }
            } else {
                const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
                for (let d = 0; d < 7; d++) {
                    const dayDate = new Date(this.currentWeekStart);
                    dayDate.setDate(dayDate.getDate() + d);
                    const dayItems = allItems.filter(i => i.date.getDate() === dayDate.getDate() && i.date.getMonth() === dayDate.getMonth());
                    const isToday = dayDate.toDateString() === new Date().toDateString();
                    bodyHtml += `<div class="crono-day ${isToday ? 'crono-today' : ''}"><span class="crono-day-num">${dayNames[d]} ${dayDate.getDate()}</span>`;
                    if (dayItems.length > 0) {
                        dayItems.forEach(item => { bodyHtml += this._cronoItemHTML(item); });
                    } else {
                        bodyHtml += '<div class="crono-item crono-empty-day">Sin actividades</div>';
                    }
                    bodyHtml += '</div>';
                }
            }

            gridHtml += `<div class="cronograma-col"><div class="cronograma-col-header" style="border-color:${edColor}"><h4><span class="edificio-dot" style="background:${edColor}"></span>${ed}</h4></div><div class="cronograma-col-body">${bodyHtml || '<p class="crono-empty">Sin actividades</p>'}</div></div>`;
        });
        grid.innerHTML = gridHtml;
    }

    _cronoItemHTML(item) {
        const color = item.type === 'tarea' ? CATEGORY_COLORS[item.cat] || '#6b7280' : item.type === 'visita' ? '#8b5cf6' : '#ef4444';
        const icon = item.type === 'tarea' ? 'fa-tasks' : item.type === 'visita' ? 'fa-clipboard-check' : 'fa-exclamation-triangle';
        const estadoClass = item.estado === 'Completado' ? 'crono-item-done' : '';
        const label = item.label.length > 25 ? item.label.substring(0, 25) + '...' : item.label;
        return `<div class="crono-item ${estadoClass}" style="border-left-color:${color}" title="${item.label}"><i class="fas ${icon}" style="color:${color}"></i><span>${label}</span></div>`;
    }

    exportCronogramaPDF() {
        const meses = this.data.listas.meses || INITIAL_DATA.meses;
        const eds = this.data.listas.edificios || [];
        const title = this.cronogramaView === 'monthly' ? `Cronograma - ${meses[this.currentMonth]} ${this.currentYear}` : document.getElementById('currentPeriod').textContent;

        let dateRange;
        if (this.cronogramaView === 'monthly') {
            dateRange = { start: new Date(this.currentYear, this.currentMonth, 1), end: new Date(this.currentYear, this.currentMonth + 1, 0) };
        } else {
            const weekEnd = new Date(this.currentWeekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            dateRange = { start: new Date(this.currentWeekStart), end: weekEnd };
        }

        const tareas = (this.data.tareas || []).filter(t => { const f = new Date(t.fecha); return f >= dateRange.start && f <= dateRange.end; });
        const visitas = (this.data.visitas || []).filter(v => { const f = new Date(v.fecha); return f >= dateRange.start && f <= dateRange.end; });
        const incidencias = (this.data.incidencias || []).filter(i => { const f = new Date(i.fecha); return f >= dateRange.start && f <= dateRange.end; });

        let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            body{font-family:Arial,sans-serif;margin:20px;color:#1e293b}
            h1{font-size:18px;margin-bottom:4px} h2{font-size:13px;color:#64748b;margin-top:0;margin-bottom:16px}
            .grid{display:grid;grid-template-columns:repeat(${eds.length},1fr);gap:10px}
            .col{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;min-height:120px}
            .col-header{padding:8px 12px;font-weight:700;font-size:12px;color:white}
            .col-body{padding:8px}
            .item{border-left:3px solid #ccc;padding:4px 8px;margin-bottom:4px;font-size:10px;background:#f8fafc;border-radius:0 4px 4px 0}
            .item-tarea{border-left-color:#3b82f6}.item-visita{border-left-color:#8b5cf6}.item-incidencia{border-left-color:#ef4444}
            .day-label{font-weight:700;font-size:10px;color:#64748b;margin-bottom:4px;margin-top:8px}
            .empty{color:#94a3b8;font-size:10px;font-style:italic}
            @media print{body{margin:10px}.grid{gap:6px}}
        </style></head><body>
        <h1>${title}</h1>
        <h2>Facility Management - ${new Date().toLocaleDateString('es-ES')}</h2>
        <div class="grid">`;

        eds.forEach(ed => {
            const edColor = EDIFICIO_COLORS[ed] || '#6b7280';
            const edTareas = tareas.filter(t => t.edificio === ed);
            const edVisitas = visitas.filter(v => v.edificio === ed);
            const edIncidencias = incidencias.filter(i => i.edificio === ed);
            const allItems = [
                ...edTareas.map(t => ({ date: new Date(t.fecha), label: t.actividad, type: 'tarea', estado: t.estado })),
                ...edVisitas.map(v => ({ date: new Date(v.fecha), label: v.motivo, type: 'visita', estado: v.estado })),
                ...edIncidencias.map(i => ({ date: new Date(i.fecha), label: i.descripcion, type: 'incidencia', estado: i.estado }))
            ].sort((a, b) => a.date - b.date);

            html += `<div class="col"><div class="col-header" style="background:${edColor}">${ed}</div><div class="col-body">`;
            if (allItems.length === 0) {
                html += '<p class="empty">Sin actividades</p>';
            } else {
                if (this.cronogramaView === 'monthly') {
                    const daysInMonth = dateRange.end.getDate();
                    for (let day = 1; day <= daysInMonth; day++) {
                        const dayItems = allItems.filter(i => i.date.getDate() === day);
                        if (dayItems.length === 0) continue;
                        html += `<div class="day-label">Día ${day}</div>`;
                        dayItems.forEach(item => {
                            html += `<div class="item item-${item.type}">${item.label} ${item.estado === 'Completado' ? '✓' : ''}</div>`;
                        });
                    }
                } else {
                    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                    for (let d = 0; d < 7; d++) {
                        const dayDate = new Date(this.currentWeekStart);
                        dayDate.setDate(dayDate.getDate() + d);
                        const dayItems = allItems.filter(i => i.date.getDate() === dayDate.getDate() && i.date.getMonth() === dayDate.getMonth());
                        html += `<div class="day-label">${dayNames[d]} ${dayDate.getDate()}</div>`;
                        if (dayItems.length > 0) {
                            dayItems.forEach(item => { html += `<div class="item item-${item.type}">${item.label} ${item.estado === 'Completado' ? '✓' : ''}</div>`; });
                        } else {
                            html += '<p class="empty">Sin actividades</p>';
                        }
                    }
                }
            }
            html += '</div></div>';
        });

        html += '</div></body></html>';

        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 500);
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

        const minDate = new Date(Math.min(...allItems.map(i => i.fecha.getTime())));
        const maxDate = new Date(Math.max(...allItems.map(i => i.fecha.getTime())));
        maxDate.setDate(maxDate.getDate() + 7);
        const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
        const dayWidth = 40;
        const rowHeight = 40;

        let html = `<div class="gantt-wrapper"><div class="gantt-header" style="width:${totalDays * dayWidth}px">`;
        for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
            const dayNum = d.getDate();
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            html += `<div class="gantt-day ${isWeekend ? 'weekend' : ''}" style="width:${dayWidth}px"><span>${dayNum}</span></div>`;
        }
        html += '</div><div class="gantt-body">';

        allItems.forEach((item, idx) => {
            const offset = Math.ceil((item.fecha - minDate) / (1000 * 60 * 60 * 24));
            const color = item.type === 'Tarea' ? CATEGORY_COLORS[item.categoria] || '#6b7280' : '#8b5cf6';
            const edColor = EDIFICIO_COLORS[item.edificio] || '#6b7280';
            const width = item.type === 'Visita' ? 2 : 5;
            html += `<div class="gantt-row" style="height:${rowHeight}px">
                <div class="gantt-label" style="width:260px"><span class="edificio-dot" style="background:${edColor}"></span><span class="gantt-item-text">${item.label.substring(0, 30)}</span><span class="gantt-item-ed">${item.edificio}</span></div>
                <div class="gantt-track" style="width:${totalDays * dayWidth}px">`;
            for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                html += `<div class="gantt-cell ${isWeekend ? 'weekend' : ''}" style="width:${dayWidth}px"></div>`;
            }
            html += `<div class="gantt-bar" style="left:${offset * dayWidth}px;width:${width * dayWidth}px;background:${color}" title="${item.label} (${item.estado})"></div>`;
            html += `</div></div>`;
        });

        html += '</div></div>';
        container.innerHTML = html;
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
                <td><span class="edificio-tag" style="background:${EDIFICIO_COLORS[i.edificio] || '#6b7280'}">${i.edificio}</span></td>
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
        else { d.id = 'INC-' + Date.now(); this.data.incidencias.push(d); await db.put('incidencias', d); }
        this.closeModal(); this.renderIncidencias(); this.showToast(id ? 'Incidencia actualizada' : 'Incidencia creada', 'success');
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
        list.innerHTML = informes.length ? informes.map(inf => `
            <div class="informe-card">
                <div class="informe-header">
                    <div><span class="edificio-tag" style="background:${EDIFICIO_COLORS[inf.edificio] || '#6b7280'}">${inf.edificio}</span><span class="informe-date">${this.formatDate(inf.fecha)}</span></div>
                    <div class="informe-actions">
                        <button class="btn-success btn-sm" onclick="app.editInforme('${inf.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-danger btn-sm" onclick="app.deleteInforme('${inf.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="informe-body">
                    <h4>${inf.titulo}</h4>
                    <p>${inf.descripcion}</p>
                    ${inf.actividades ? `<div class="informe-actividades"><h5>Actividades realizadas:</h5><p>${inf.actividades}</p></div>` : ''}
                    ${inf.observaciones ? `<div class="informe-obs"><h5>Observaciones:</h5><p>${inf.observaciones}</p></div>` : ''}
                </div>
            </div>`).join('') : '<div class="empty-state"><i class="fas fa-file-alt"></i><p>No hay informes diarios</p><button class="btn-primary" onclick="app.showNewInformeModal()"><i class="fas fa-plus"></i> Crear Primer Informe</button></div>';
    }

    getInformeForm(inf = null) {
        const eds = this.data.listas.edificios || [];
        return `<form>
            <div class="form-group"><label>Edificio *</label><select id="informeEdificio">${eds.map(e => `<option value="${e}" ${inf?.edificio === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
            <div class="form-group"><label>Fecha *</label><input type="date" id="informeFecha" value="${inf?.fecha || new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label>Título del Informe *</label><input type="text" id="informeTitulo" value="${inf?.titulo || ''}" placeholder="Ej: Mantención preventiva A/C"></div>
            <div class="form-group"><label>Descripción general *</label><textarea id="informeDescripcion" rows="3" placeholder="Resumen del día...">${inf?.descripcion || ''}</textarea></div>
            <div class="form-group"><label>Actividades realizadas</label><textarea id="informeActividades" rows="3" placeholder="Lista de actividades completadas...">${inf?.actividades || ''}</textarea></div>
            <div class="form-group"><label>Observaciones</label><textarea id="informeObservaciones" rows="2" placeholder="Notas adicionales...">${inf?.observaciones || ''}</textarea></div>
        </form>`;
    }

    showNewInformeModal() {
        this.showModal('Nuevo Informe Diario', this.getInformeForm(), () => this.saveInforme());
    }

    async saveInforme(id = null) {
        const d = { edificio: this.gv('informeEdificio'), fecha: this.gv('informeFecha'), titulo: this.gv('informeTitulo'), descripcion: this.gv('informeDescripcion'), actividades: this.gv('informeActividades'), observaciones: this.gv('informeObservaciones') };
        if (id) { const i = this.data.informesDiarios.findIndex(x => x.id === id); if (i !== -1) { d.id = id; this.data.informesDiarios[i] = { ...this.data.informesDiarios[i], ...d }; await db.put('informesDiarios', this.data.informesDiarios[i]); } }
        else { d.id = 'INF-' + Date.now(); this.data.informesDiarios.push(d); await db.put('informesDiarios', d); }
        this.closeModal(); this.renderInformes(); this.showToast(id ? 'Informe actualizado' : 'Informe creado', 'success');
    }

    editInforme(id) { const i = this.data.informesDiarios.find(x => x.id === id); if (i) this.showModal('Editar Informe', this.getInformeForm(i), () => this.saveInforme(i.id)); }
    async deleteInforme(id) { if (!confirm('¿Eliminar informe?')) return; this.data.informesDiarios = this.data.informesDiarios.filter(i => i.id !== id); await db.delete('informesDiarios', id); this.renderInformes(); this.showToast('Informe eliminado', 'success'); }

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
