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

    // =================== SECURITY HELPERS ===================
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    validateForm(formEl) {
        if (!formEl) return true;
        const invalid = formEl.querySelectorAll(':invalid');
        if (invalid.length > 0) {
            invalid[0].focus();
            invalid[0].style.borderColor = '#ef4444';
            setTimeout(() => { invalid[0].style.borderColor = ''; }, 2000);
            return false;
        }
        return true;
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

        // Auth state listener
        const loginOverlay = document.getElementById('loginOverlay');
        const appContainer = document.querySelector('.app-container');

        window._fbAuth.onAuthStateChanged(window._auth, async (user) => {
            if (user) {
                // User is logged in
                loginOverlay.style.display = 'none';
                appContainer.style.display = '';

                // Update user info in sidebar
                const userName = document.getElementById('userName');
                const userRole = document.getElementById('userRole');
                if (userName) userName.textContent = user.email.split('@')[0];
                if (userRole) userRole.textContent = user.email;

                await this.loadData();
                await quoteManager.init();
                this.populateFilters();
                this.bindEvents();
                this.renderDashboard();
                this.updateSidebarBadges();
                this.updateNotificationBadge();
            } else {
                // User is not logged in
                loginOverlay.style.display = 'flex';
                appContainer.style.display = 'none';
            }
        });
    }

    async loadData() {
        this.data = {};
        for (const store of ['tareas', 'visitas', 'incidencias', 'proveedores', 'fotos', 'cotizaciones', 'notificaciones', 'informesDiarios']) {
            this.data[store] = await db.getAll(store);
        }
        this.data.listas = {};
        const listas = await db.getAll('listas');
        listas.forEach(l => this.data.listas[l.key] = l.value);

        const defaults = { categorias: [], ubicaciones: [], edificios: [], estados: INITIAL_DATA.estados, prioridades: INITIAL_DATA.prioridades, tiposVisita: INITIAL_DATA.tiposVisita, meses: INITIAL_DATA.meses };
        for (const [k, v] of Object.entries(defaults)) {
            if (!this.data.listas[k] || (Array.isArray(this.data.listas[k]) && this.data.listas[k].length === 0 && v.length > 0)) {
                this.data.listas[k] = v;
                await db.put('listas', { key: k, value: v });
            }
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
        fillSelect('filterEdificio', eds, 'Todos los CIRION');
        fillSelect('filterEdificioGlobal', eds, 'Todos los CIRION');
        fillSelect('filterIncidenciaEdificio', eds, 'Todos los CIRION');
        fillSelect('filterVisitaEdificio', eds, 'Todos los CIRION');
        fillSelect('filterFotoEdificio', eds, 'Todos los CIRION');
        fillSelect('filterFotoCategoria', cats, 'Todas las categorías');
        fillSelect('filterServicio', cats, 'Todos los servicios');
        fillSelect('filterGanttEdificio', eds, 'Todos los CIRION');
        fillSelect('filterGanttCategoria', cats, 'Todas las categorías');
        fillSelect('filterVisitaTipo', tps, 'Todos los tipos');
        fillSelect('filterInformeEdificio', eds, 'Todos los CIRION');
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
                <div class="form-group"><label>CIRION *</label><select id="fotoEdificio">${eds.map(e => `<option value="${e}">${e}</option>`).join('')}</select></div>
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
        const t = { dashboard: ['Dashboard', 'Panel de control'], tareas: ['Tareas', 'Gestión de tareas de mantenimiento'], cronograma: ['Cronograma', 'Calendario por CIRION - 4 columnas'], gantt: ['Carta Gantt', 'Diagrama de Gantt - Cronograma visual'], visitas: ['Visitas', 'Registro de visitas a CIRION'], incidencias: ['Incidencias', 'Registro y seguimiento de problemas'], informes: ['Informes Diarios', 'Reporte diario de actividades'], proveedores: ['Proveedores', 'Directorio de servicios'], fotos: ['Fotografías', 'Galería de imágenes'], emails: ['Correos', 'Generador de correos electrónicos'], cotizaciones: ['Cotizaciones', 'Presupuestos y cotizaciones'], reportes: ['Reportes', 'Estadísticas e informes'], config: ['Configuración', 'Ajustes del sistema'] };
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
                <div class="task-info"><h4>${this.escapeHtml(v.motivo)}</h4><p>${this.escapeHtml(v.edificio)} - ${this.escapeHtml(v.tipo)}</p></div>
                <span class="status-badge status-${v.estado.toLowerCase().replace(' ', '')}">${this.escapeHtml(v.estado)}</span>
            </div>`).join('') : '<p class="text-center" style="padding:1.5rem;color:var(--text-secondary)">No hay visitas pendientes</p>';

        const proxTareas = tareas.filter(t => t.estado !== 'Completado').sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).slice(0, 5);
        document.getElementById('proximasTareas').innerHTML = proxTareas.length ? proxTareas.map(t => `
            <div class="task-item">
                <div class="task-category" style="background:${CATEGORY_COLORS[t.categoria] || '#6b7280'}"></div>
                <div class="task-info"><h4>${this.escapeHtml(t.actividad)}</h4><p>${this.escapeHtml(t.edificio)} - ${this.escapeHtml(t.categoria)}</p></div>
                <span class="status-badge status-${t.estado.toLowerCase().replace(' ', '')}">${this.escapeHtml(t.estado)}</span>
            </div>`).join('') : '<p class="text-center" style="padding:1.5rem;color:var(--text-secondary)">No hay tareas pendientes</p>';

        const incRec = incidencias.filter(i => i.estado !== 'Completado').slice(0, 4);
        document.getElementById('incidenciasRecientes').innerHTML = incRec.length ? incRec.map(i => `
            <div class="task-item">
                <div class="task-category" style="background:${i.prioridad === 'Alta' ? '#ef4444' : i.prioridad === 'Media' ? '#f59e0b' : '#3b82f6'}"></div>
                <div class="task-info"><h4>${this.escapeHtml(i.descripcion)}</h4><p>${this.escapeHtml(i.edificio)} - ${this.escapeHtml(i.categoria)}</p></div>
                <span class="status-badge status-${i.prioridad.toLowerCase()}">${this.escapeHtml(i.prioridad)}</span>
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
                <td><strong>${this.escapeHtml(t.id)}</strong></td><td>${this.escapeHtml(t.actividad)}</td>
                <td><span style="color:${CATEGORY_COLORS[t.categoria]};font-weight:500">${this.escapeHtml(t.categoria)}</span></td>
                <td><span class="edificio-tag" style="background:${getEdificioColor(t.edificio, this.data.listas?.edificios)}">${this.escapeHtml(t.edificio)}</span></td>
                <td>${this.escapeHtml(t.ubicacion)}</td><td>${this.escapeHtml(t.proveedor)}</td><td>${this.formatDate(t.fecha)}</td>
                <td><span class="status-badge status-${t.estado.toLowerCase().replace(' ', '')}">${this.escapeHtml(t.estado)}</span></td>
                <td class="actions-cell">
                    ${t.emails && t.emails.length ? `<button class="btn-sm" style="background:#8b5cf620;color:#8b5cf6;border:1px solid #8b5cf640" onclick="app.showRecordEmails('tarea','${t.id}')" title="${t.emails.length} correo(s)"><i class="fas fa-envelope"></i> ${t.emails.length}</button>` : ''}
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
            <div class="form-group"><label>CIRION *</label><select id="tareaEdificio">${eds.map(e => `<option value="${e}" ${t?.edificio === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
            <div class="form-group"><label>Ubicación *</label><select id="tareaUbicacion">${ubs.map(u => `<option value="${u}" ${t?.ubicacion === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
            <div class="form-group"><label>Proveedor</label><select id="tareaProveedor"><option value="">Sin asignar</option>${provs.map(p => `<option value="${p.empresa}" ${t?.proveedor === p.empresa ? 'selected' : ''}>${p.empresa}</option>`).join('')}</select></div>
            <div class="form-group"><label>Fecha *</label><input type="date" id="tareaFecha" value="${t?.fecha || new Date().toISOString().split('T')[0]}" required></div>
            <div class="form-group"><label>Estado *</label><select id="tareaEstado">${sts.map(e => `<option value="${e}" ${t?.estado === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
            <div class="form-group"><label>Observaciones</label><textarea id="tareaObservaciones" rows="2">${t?.observaciones || ''}</textarea></div>
        </form>`;
    }

    async saveTarea(id = null) {
        try {
            const d = { actividad: this.gv('tareaActividad'), categoria: this.gv('tareaCategoria'), edificio: this.gv('tareaEdificio'), ubicacion: this.gv('tareaUbicacion'), proveedor: this.gv('tareaProveedor'), fecha: this.gv('tareaFecha'), estado: this.gv('tareaEstado'), observaciones: this.gv('tareaObservaciones') };
            if (id) {
                const i = this.data.tareas.findIndex(t => t.id === id);
                if (i !== -1) {
                    const existing = this.data.tareas[i];
                    d.id = id;
                    d.updatedAt = new Date().toISOString();
                    if (d.estado === 'Completado' && existing.estado !== 'Completado') {
                        d.fechaCompletado = new Date().toISOString().split('T')[0];
                    }
                    if (existing.createdAt) d.createdAt = existing.createdAt;
                    if (existing.emails) d.emails = existing.emails;
                    this.data.tareas[i] = { ...existing, ...d };
                    await db.put('tareas', this.data.tareas[i]);
                }
            }
            else {
                d.id = 'TAR-' + Date.now(); d.createdAt = new Date().toISOString(); d.emails = [];
                if (d.proveedor) {
                    try {
                        const email = await emailGenerator.generateDraftEmail('tarea', { ...d, proveedorId: d.proveedor });
                        if (email.to) d.emails.push(email);
                    } catch (e) { console.error('Error generating email draft:', e); }
                }
                this.data.tareas.push(d); await db.put('tareas', d);
            }
            this.closeModal(); this.renderTareas(); this.updateSidebarBadges(); this.showToast(id ? 'Tarea actualizada' : 'Tarea creada', 'success');
        } catch (err) { console.error('Error guardando tarea:', err); this.showToast('Error al guardar', 'error'); }
    }

    editTarea(id) { const t = this.data.tareas.find(x => x.id === id); if (t) this.showModal('Editar Tarea', this.getTareaForm(t), () => this.saveTarea(t.id)); }
    async deleteTarea(id) { if (!confirm('¿Eliminar tarea?')) return; this.data.tareas = this.data.tareas.filter(t => t.id !== id); await db.delete('tareas', id); this.renderTareas(); this.updateSidebarBadges(); this.showToast('Tarea eliminada', 'success'); }

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
        tbody.innerHTML = visitas.length ? visitas.map(v => {
            const checklist = (v.checklist || []).slice(0, 3);
            const moreCount = (v.checklist || []).length - 3;
            const checklistBadges = checklist.map(c => {
                const cat = CHECKLIST_CATEGORIES[c];
                return cat ? `<span style="background:${cat.color}18;color:${cat.color};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;border:1px solid ${cat.color}30">${c}</span>` : '';
            }).join(' ') + (moreCount > 0 ? `<span style="background:#f1f5f9;color:#64748b;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600">+${moreCount}</span>` : '');

            return `
            <tr>
                <td><strong>${v.id}</strong></td><td>${this.formatDate(v.fecha)}</td>
                <td><span class="edificio-tag" style="background:${getEdificioColor(v.edificio, this.data.listas?.edificios)}">${v.edificio}</span></td>
                <td>${v.tipo}</td><td>${v.motivo}</td>
                <td>${checklistBadges || '<span style="color:#94a3b8;font-size:11px">Sin checklist</span>'}</td>
                <td><span class="status-badge status-${v.estado.toLowerCase().replace(' ', '')}">${v.estado}</span></td>
                <td class="actions-cell">
                    ${v.emails && v.emails.length ? `<button class="btn-sm" style="background:#8b5cf620;color:#8b5cf6;border:1px solid #8b5cf640" onclick="app.showRecordEmails('visita','${v.id}')" title="${v.emails.length} correo(s)"><i class="fas fa-envelope"></i> ${v.emails.length}</button>` : ''}
                    <button class="btn-success btn-sm" onclick="app.editVisita('${v.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                    ${v.checklist && v.checklist.length ? `<button class="btn-sm" style="background:#8b5cf6;color:#fff" onclick="app.openInspeccion('${v.id}')" title="Realizar Inspección"><i class="fas fa-clipboard-check"></i></button>` : ''}
                    <button class="btn-primary btn-sm" onclick="app.exportVisitaChecklist('${v.id}')" title="Exportar Plan Checklist"><i class="fas fa-file-excel"></i></button>
                    ${v.checklistResults ? `<button class="btn-sm" style="background:#059669;color:#fff" onclick="app.exportVisitaChecklist('${v.id}','results')" title="Exportar Resultados"><i class="fas fa-file-check"></i></button>` : ''}
                    <button class="btn-danger btn-sm" onclick="app.deleteVisita('${v.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('') : '<tr><td colspan="8" class="text-center">No se encontraron visitas</td></tr>';
        document.getElementById('navVisitasBadge').textContent = this.data.visitas?.filter(v => v.estado !== 'Completado').length || 0;
    }

    getVisitaForm(v = null) {
        const eds = this.data.listas.edificios || [], tps = this.data.listas.tiposVisita || [], provs = this.data.proveedores || [], sts = ['Pendiente', 'En Progreso', 'Completado'];
        const selectedChecklist = v?.checklist || [];
        const checklistHTML = Object.entries(CHECKLIST_CATEGORIES).map(([cat, data]) => {
            const checked = selectedChecklist.includes(cat) ? 'checked' : '';
            return `<label class="checklist-option" style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;cursor:pointer;background:${checked ? data.color + '18' : '#f8fafc'};border:1px solid ${checked ? data.color + '50' : '#e2e8f0'};transition:all 0.15s">
                <input type="checkbox" class="visita-checklist" value="${cat}" ${checked} style="accent-color:${data.color};width:16px;height:16px">
                <span style="color:${data.color};font-size:14px;width:20px;text-align:center"><i class="fas ${data.icon}"></i></span>
                <span style="font-size:13px;font-weight:500;color:#334155">${cat}</span>
            </label>`;
        }).join('');

        return `<form>
            <div class="form-group"><label>CIRION *</label><select id="visitaEdificio">${eds.map(e => `<option value="${e}" ${v?.edificio === e ? 'selected' : ''}>${this.escapeHtml(e)}</option>`).join('')}</select></div>
            <div class="form-group"><label>Tipo de Visita *</label><select id="visitaTipo">${tps.map(t => `<option value="${t}" ${v?.tipo === t ? 'selected' : ''}>${this.escapeHtml(t)}</option>`).join('')}</select></div>
            <div class="form-group"><label>Fecha *</label><input type="date" id="visitaFecha" value="${v?.fecha || new Date().toISOString().split('T')[0]}" required></div>
            <div class="form-group"><label>Motivo *</label><input type="text" id="visitaMotivo" value="${this.escapeHtml(v?.motivo || '')}" placeholder="Motivo de la visita" required></div>
            <div class="form-group"><label>Proveedor</label><select id="visitaProveedor"><option value="">Sin asignar</option>${provs.map(p => `<option value="${p.empresa}" ${v?.proveedor === p.empresa ? 'selected' : ''}>${this.escapeHtml(p.empresa)}</option>`).join('')}</select></div>
            <div class="form-group"><label>Estado</label><select id="visitaEstado">${sts.map(s => `<option value="${s}" ${v?.estado === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            <div class="form-group">
                <label style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><i class="fas fa-clipboard-check" style="color:#1e40af"></i> <strong>Checklist de Inspección</strong></label>
                <p style="font-size:11px;color:#64748b;margin-bottom:8px">Selecciona las áreas a inspeccionar en esta visita:</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:220px;overflow-y:auto;padding:4px">${checklistHTML}</div>
            </div>
            <div class="form-group"><label>Observaciones</label><textarea id="visitaObservaciones" rows="2">${v?.observaciones || ''}</textarea></div>
        </form>`;
    }

    async saveVisita(id = null) {
        try {
            const checklist = [...document.querySelectorAll('.visita-checklist:checked')].map(cb => cb.value);
            const d = { fecha: this.gv('visitaFecha'), edificio: this.gv('visitaEdificio'), tipo: this.gv('visitaTipo'), motivo: this.gv('visitaMotivo'), proveedor: this.gv('visitaProveedor'), estado: this.gv('visitaEstado'), observaciones: this.gv('visitaObservaciones'), responsable: '', checklist };
            if (id) {
                const i = this.data.visitas.findIndex(v => v.id === id);
                if (i !== -1) {
                    const existing = this.data.visitas[i];
                    d.id = id;
                    d.updatedAt = new Date().toISOString();
                    if (d.estado === 'Completado' && existing.estado !== 'Completado') {
                        d.fechaCompletado = new Date().toISOString().split('T')[0];
                    }
                    if (existing.fecha) d.fecha = existing.fecha;
                    if (existing.createdAt) d.createdAt = existing.createdAt;
                    if (existing.emails) d.emails = existing.emails;
                    if (existing.checklistResults) d.checklistResults = existing.checklistResults;
                    this.data.visitas[i] = { ...existing, ...d };
                    await db.put('visitas', this.data.visitas[i]);
                }
            }
            else {
                d.id = 'VIS-' + Date.now(); d.createdAt = new Date().toISOString(); d.emails = [];
                if (d.proveedor) {
                    try {
                        const email = await emailGenerator.generateDraftEmail('visita', { ...d, proveedorId: d.proveedor });
                        if (email.to) d.emails.push(email);
                    } catch (e) { console.error('Error generating email draft:', e); }
                }
                this.data.visitas.push(d); await db.put('visitas', d);
            }
            this.closeModal(); this.renderVisitas(); this.updateSidebarBadges(); this.showToast(id ? 'Visita actualizada' : 'Visita creada', 'success');
        } catch (err) { console.error('Error guardando visita:', err); this.showToast('Error al guardar', 'error'); }
    }

    editVisita(id) { const v = this.data.visitas.find(x => x.id === id); if (v) this.showModal('Editar Visita', this.getVisitaForm(v), () => this.saveVisita(v.id)); }
    async deleteVisita(id) { if (!confirm('¿Eliminar visita?')) return; this.data.visitas = this.data.visitas.filter(v => v.id !== id); await db.delete('visitas', id); this.renderVisitas(); this.updateSidebarBadges(); this.showToast('Visita eliminada', 'success'); }

    openInspeccion(id) {
        const v = this.data.visitas.find(x => x.id === id);
        if (!v) return;
        this._inspCats = v.checklist || [];
        this._inspIdx = 0;
        this.showModal(`Inspección — ${v.edificio}`, this.getInspeccionForm(v), () => this.saveInspeccionResults(id));
        setTimeout(() => this._setupInspeccionEvents(), 50);
    }

    _setupInspeccionEvents() {
        const cats = this._inspCats;
        const total = cats.length;
        const self = this;

        function showCard(idx) {
            document.querySelectorAll('.insp-card').forEach(c => c.style.display = 'none');
            const card = document.querySelector('.insp-card[data-idx="' + idx + '"]');
            if (card) card.style.display = 'block';
            document.querySelectorAll('.insp-dot').forEach((d, i) => {
                d.style.transform = i === idx ? 'scale(1.4)' : 'scale(1)';
                if (i === idx) { const cd = CHECKLIST_CATEGORIES[cats[i]]; d.style.background = cd?.color || '#3b82f6'; }
                else d.style.background = '#cbd5e1';
            });
            const prev = document.getElementById('inspPrev');
            const next = document.getElementById('inspNext');
            if (prev) prev.style.visibility = idx === 0 ? 'hidden' : 'visible';
            if (next) {
                if (idx === total - 1) { next.textContent = '✓ Guardar'; next.style.background = '#22c55e'; }
                else { next.innerHTML = 'Siguiente →'; next.style.background = '#3b82f6'; }
            }
        }

        const prev = document.getElementById('inspPrev');
        const next = document.getElementById('inspNext');
        if (prev) prev.onclick = () => { if (self._inspIdx > 0) { self._inspIdx--; showCard(self._inspIdx); } };
        if (next) next.onclick = () => {
            if (self._inspIdx < total - 1) { self._inspIdx++; showCard(self._inspIdx); }
            else { document.getElementById('modalSave')?.click(); }
        };

        document.querySelectorAll('.insp-dot').forEach(dot => {
            dot.onclick = () => { self._inspIdx = parseInt(dot.dataset.idx); showCard(self._inspIdx); };
        });

        document.querySelectorAll('.insp-btn-insp').forEach(btn => {
            btn.onclick = function() {
                const cat = this.dataset.cat, item = this.dataset.item;
                document.querySelectorAll('.insp-btn-insp[data-cat="' + cat + '"][data-item="' + item + '"]').forEach(b => {
                    b.style.background = '#f1f5f9'; b.style.borderColor = '#e2e8f0'; b.style.color = '#94a3b8'; b.dataset.selected = 'false';
                });
                if (this.dataset.status === 'pass') { this.style.background = '#22c55e'; this.style.borderColor = '#22c55e'; this.style.color = '#fff'; }
                else { this.style.background = '#ef4444'; this.style.borderColor = '#ef4444'; this.style.color = '#fff'; }
                this.dataset.selected = 'true';
            };
        });

        showCard(0);
    }

    getInspeccionForm(v) {
        const saved = v.checklistResults || {};
        const cats = v.checklist || [];
        if (!cats.length) return '<p style="color:#64748b;text-align:center;padding:20px">No hay categorías asignadas.</p>';

        const totalItems = cats.reduce((sum, cat) => {
            const catData = CHECKLIST_CATEGORIES[cat];
            return sum + (catData ? catData.items.length : 0);
        }, 0);
        let doneCount = 0;
        cats.forEach(cat => {
            const si = saved[cat]?.items || [];
            si.forEach(it => { if (it.status === 'pass' || it.status === 'fail') doneCount++; });
        });

        const dotsHTML = cats.map((cat, i) => {
            const catData = CHECKLIST_CATEGORIES[cat];
            const hasResults = saved[cat]?.items?.some(it => it.status === 'pass' || it.status === 'fail');
            return `<button type="button" class="insp-dot" data-idx="${i}" style="width:10px;height:10px;border-radius:50%;border:none;background:${i === 0 ? (catData?.color || '#3b82f6') : (hasResults ? '#22c55e' : '#cbd5e1')};cursor:pointer;transition:all 0.2s;padding:0"></button>`;
        }).join('');

        const cardsHTML = cats.map((cat, i) => {
            const catData = CHECKLIST_CATEGORIES[cat];
            if (!catData) return '';
            const items = catData.items || [];
            const savedItems = saved[cat]?.items || [];
            const catObs = saved[cat]?.catObs || '';
            const color = catData.color;

            const passCount = savedItems.filter(it => it.status === 'pass').length;
            const failCount = savedItems.filter(it => it.status === 'fail').length;

            const itemsHTML = items.map((itemName, j) => {
                const s = savedItems.find(si => si.name === itemName);
                const status = s?.status || '';
                const obs = s?.obs || '';
                const passBg = status === 'pass' ? '#22c55e' : '#f1f5f9';
                const passBorder = status === 'pass' ? '#22c55e' : '#e2e8f0';
                const passText = status === 'pass' ? '#fff' : '#94a3b8';
                const failBg = status === 'fail' ? '#ef4444' : '#f1f5f9';
                const failBorder = status === 'fail' ? '#ef4444' : '#e2e8f0';
                const failText = status === 'fail' ? '#fff' : '#94a3b8';
                return `<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:10px;border:1px solid #e2e8f0">
                    <div style="font-size:14px;font-weight:600;color:#1e293b;margin-bottom:10px">${itemName}</div>
                    <div style="display:flex;gap:10px;margin-bottom:10px">
                        <button type="button" class="insp-btn-insp" data-cat="${cat}" data-item="${j}" data-status="pass" data-selected="${status === 'pass' ? 'true' : 'false'}" style="flex:1;height:52px;border-radius:10px;border:2px solid ${passBorder};background:${passBg};cursor:pointer;font-size:20px;font-weight:700;color:${passText};transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:6px">✓ OK</button>
                        <button type="button" class="insp-btn-insp" data-cat="${cat}" data-item="${j}" data-status="fail" data-selected="${status === 'fail' ? 'true' : 'false'}" style="flex:1;height:52px;border-radius:10px;border:2px solid ${failBorder};background:${failBg};cursor:pointer;font-size:20px;font-weight:700;color:${failText};transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:6px">✗ Falla</button>
                    </div>
                    <input type="text" class="insp-obs" data-cat="${cat}" data-item="${j}" value="${this.escapeHtml(obs)}" placeholder="Observaciones..." style="width:100%;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;font-size:14px;color:#334155;outline:none;box-sizing:border-box">
                </div>`;
            }).join('');

            return `<div class="insp-card" data-cat="${cat}" data-idx="${i}" style="display:${i === 0 ? 'block' : 'none'}">
                <div style="background:${color};border-radius:16px;padding:16px 18px;margin-bottom:14px;color:#fff">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                        <i class="fas ${catData.icon}" style="font-size:20px"></i>
                        <div style="font-size:18px;font-weight:700">${cat}</div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;opacity:0.9">
                        <span>${items.length} items</span>
                        <span>${passCount} ✓ ${failCount > 0 ? ' · ' + failCount + ' ✗' : ''}</span>
                    </div>
                </div>
                ${itemsHTML}
                <div style="margin-top:6px">
                    <textarea class="insp-cat-obs" data-cat="${cat}" rows="2" placeholder="Observaciones generales de ${cat}..." style="width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:12px;font-size:14px;color:#334155;outline:none;resize:none;box-sizing:border-box">${this.escapeHtml(catObs)}</textarea>
                </div>
            </div>`;
        }).join('');

        return `<div style="overflow:hidden">
            <div style="text-align:center;margin-bottom:12px">
                <div style="font-size:13px;color:#64748b;margin-bottom:6px">${doneCount} de ${totalItems} items completados</div>
                <div style="display:flex;justify-content:center;gap:6px;align-items:center">${dotsHTML}</div>
            </div>
            <div id="inspCardsContainer">${cardsHTML}</div>
            <div style="display:flex;justify-content:space-between;margin-top:14px;gap:10px">
                <button type="button" id="inspPrev" style="padding:12px 20px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;color:#64748b;font-size:14px;font-weight:600;cursor:pointer">← Anterior</button>
                <button type="button" id="inspNext" style="padding:12px 20px;border-radius:10px;border:none;background:#3b82f6;color:#fff;font-size:14px;font-weight:600;cursor:pointer;flex:1;max-width:200px">Siguiente →</button>
            </div>
        </div>`;
    }

    async saveInspeccionResults(id) {
        try {
            const v = this.data.visitas.find(x => x.id === id);
            if (!v) return;
            const results = {};
            const cats = v.checklist || [];

            cats.forEach(cat => {
                const catData = CHECKLIST_CATEGORIES[cat];
                if (!catData) return;
                const items = catData.items.map((itemName, j) => {
                    const passBtn = document.querySelector(`.insp-btn-insp[data-cat="${cat}"][data-item="${j}"][data-status="pass"]`);
                    const failBtn = document.querySelector(`.insp-btn-insp[data-cat="${cat}"][data-item="${j}"][data-status="fail"]`);
                    const obsInput = document.querySelector(`.insp-obs[data-cat="${cat}"][data-item="${j}"]`);
                    let status = 'pending';
                    if (passBtn?.dataset.selected === 'true') status = 'pass';
                    else if (failBtn?.dataset.selected === 'true') status = 'fail';
                    return { name: itemName, status, obs: obsInput?.value || '' };
                });
                const catObsEl = document.querySelector(`.insp-cat-obs[data-cat="${cat}"]`);
                results[cat] = { items, catObs: catObsEl?.value || '' };
            });

            v.checklistResults = results;
            v.updatedAt = new Date().toISOString();
            await db.put('visitas', v);
            this.closeModal();
            this.renderVisitas();
            this.showToast('Inspección guardada', 'success');
        } catch (err) {
            console.error('Error guardando inspección:', err);
            this.showToast('Error al guardar inspección', 'error');
        }
    }

    async exportVisitaChecklist(id, mode = 'plan') {
        const visita = this.data.visitas.find(v => v.id === id);
        if (!visita) return;
        if (!visita.checklist || !visita.checklist.length) { this.showToast('Esta visita no tiene checklist asignado', 'warning'); return; }
        if (mode === 'results' && !visita.checklistResults) { this.showToast('Aún no hay resultados de inspección', 'warning'); return; }

        try {
            this.showToast(mode === 'results' ? 'Generando Excel de resultados...' : 'Generando Excel...', 'info');
            const empresa = document.getElementById('nombreEmpresa')?.value || 'Facility Management';
            const edificios = this.data.listas.edificios || [];

            const res = await fetch('/api/export-visita-checklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visita, empresa, edificios, mode })
            });

            if (!res.ok) throw new Error('Error generating file');

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const suffix = mode === 'results' ? '_Resultados' : '';
            a.download = `Checklist${suffix}_${visita.edificio}_${visita.fecha}_${visita.id}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast(mode === 'results' ? 'Resultados exportados' : 'Checklist exportado', 'success');
        } catch (err) {
            this.showToast('Error al exportar', 'error');
        }
    }

    async exportVisitasExcel() {
        const edi = document.getElementById('filterVisitaEdificio')?.value || '';
        const tipo = document.getElementById('filterVisitaTipo')?.value || '';
        const est = document.getElementById('filterVisitaEstado')?.value || '';
        let visitas = [...(this.data.visitas || [])];
        if (edi) visitas = visitas.filter(v => v.edificio === edi);
        if (tipo) visitas = visitas.filter(v => v.tipo === tipo);
        if (est) visitas = visitas.filter(v => v.estado === est);

        if (!visitas.length) { this.showToast('No hay visitas para exportar', 'warning'); return; }

        try {
            this.showToast('Generando Excel...', 'info');
            const empresa = document.getElementById('nombreEmpresa')?.value || 'Facility Management';
            const edificios = this.data.listas.edificios || [];

            const res = await fetch('/api/export-visitas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visitas, empresa, edificios })
            });

            if (!res.ok) throw new Error('Error generating file');

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Programa_Visitas_${new Date().toISOString().split('T')[0]}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            this.showToast('Programa de visitas exportado', 'success');
        } catch (err) {
            this.showToast('Error al exportar', 'error');
        }
    }

    // =================== CRONOGRAMA ===================
    renderCronograma() {
        const meses = this.data.listas.meses || INITIAL_DATA.meses;
        const eds = this.data.listas.edificios || [];
        const grid = document.getElementById('cronogramaGrid');
        if (!grid) return;
        if (eds.length === 0) { grid.innerHTML = '<p class="crono-empty">Agrega CIRION en Configuración para ver el cronograma</p>'; return; }

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
            const isDone = t.estado === 'Completado';
            const f = new Date((isDone && t.fechaCompletado ? t.fechaCompletado : t.fecha) + 'T00:00:00');
            if (f >= start && f <= end) result.push({ date: f, label: t.actividad, cat: t.categoria, type: 'tarea', estado: t.estado, edificio });
        });
        visitas.forEach(v => {
            const isDone = v.estado === 'Completado';
            const f = new Date((isDone && v.fechaCompletado ? v.fechaCompletado : v.fecha) + 'T00:00:00');
            if (f >= start && f <= end) result.push({ date: f, label: v.motivo, cat: v.tipo, type: 'visita', estado: v.estado, edificio });
        });
        incidencias.forEach(i => {
            const isDone = i.estado === 'Completado';
            const f = new Date((isDone && i.fechaCompletado ? i.fechaCompletado : i.fecha) + 'T00:00:00');
            if (f >= start && f <= end) result.push({ date: f, label: i.descripcion, cat: i.categoria, type: 'incidencia', estado: i.estado, edificio });
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
        const dayNamesFull = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const meses = this.data.listas.meses || INITIAL_DATA.meses;

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
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            html += `<div class="cal-cell ${isToday ? 'cal-today' : ''} ${isWeekend ? 'cal-weekend' : ''} cal-cell-clickable" data-date="${dateStr}" onclick="app.showDayDetail('${dateStr}', '${eds.join(',')}')">
                <div class="cal-day-header"><span class="cal-day-num ${isToday ? 'cal-day-today' : ''}">${day}</span>${dayItems.length ? `<span class="cal-day-count">${dayItems.length}</span>` : ''}</div>
                <div class="cal-day-items">`;

            dayItems.slice(0, 4).forEach(item => {
                const color = item.type === 'tarea' ? CATEGORY_COLORS[item.cat] || '#3b82f6' : item.type === 'visita' ? '#8b5cf6' : '#ef4444';
                const icon = item.type === 'tarea' ? 'fa-check-square' : item.type === 'visita' ? 'fa-calendar-day' : 'fa-exclamation-triangle';
                const done = item.estado === 'Completado';
                html += `<div class="cal-event ${done ? 'cal-event-done' : ''}" style="--event-color:${color}">
                    <span class="cal-event-icon" style="background:${color}"><i class="fas ${icon}"></i></span>
                    <span class="cal-event-text">${item.label}</span>
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
        html += '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:#3b82f6"></span>Tarea</div>';
        html += '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:#8b5cf6"></span>Visita</div>';
        html += '<div class="cal-legend-item"><span class="cal-legend-dot" style="background:#ef4444"></span>Incidencia</div>';
        eds.forEach(ed => {
            html += `<div class="cal-legend-item"><span class="cal-legend-dot" style="background:${getEdificioColor(ed, eds)}"></span>${ed}</div>`;
        });
        html += '</div>';

        html += '<div id="dayDetailPanel"></div>';

        grid.innerHTML = html;
    }

    showDayDetail(dateStr, edsStr) {
        const eds = edsStr.split(',');
        const [y, m, d] = dateStr.split('-').map(Number);
        const cellDate = new Date(y, m - 1, d);
        const dayItems = eds.flatMap(ed => this._getItemsForRange(cellDate, cellDate, ed));
        const meses = this.data.listas.meses || INITIAL_DATA.meses;
        const dayNamesFull = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const panel = document.getElementById('dayDetailPanel');
        if (!panel) return;

        document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('cal-cell-selected'));
        const selected = document.querySelector(`.cal-cell[data-date="${dateStr}"]`);
        if (selected) selected.classList.add('cal-cell-selected');

        if (!dayItems.length) {
            panel.innerHTML = `<div class="day-detail">
                <div class="day-detail-header">
                    <div><span class="day-detail-title">${dayNamesFull[cellDate.getDay()]} ${d} de ${meses[m - 1]} ${y}</span></div>
                    <button class="day-detail-close" onclick="app.closeDayDetail()"><i class="fas fa-times"></i></button>
                </div>
                <div class="day-detail-empty"><i class="fas fa-calendar-day"></i><p>Sin actividades programadas</p></div>
            </div>`;
            panel.style.display = 'block';
            return;
        }

        const itemsHTML = dayItems.map(item => {
            const color = item.type === 'tarea' ? CATEGORY_COLORS[item.cat] || '#3b82f6' : item.type === 'visita' ? '#8b5cf6' : '#ef4444';
            const icon = item.type === 'tarea' ? 'fa-check-square' : item.type === 'visita' ? 'fa-calendar-day' : 'fa-exclamation-triangle';
            const typeLabel = item.type === 'tarea' ? 'Tarea' : item.type === 'visita' ? 'Visita' : 'Incidencia';
            const done = item.estado === 'Completado';
            const edColor = getEdificioColor(item.edificio || eds[0], eds);
            return `<div class="day-detail-item ${done ? 'day-detail-item-done' : ''}" style="border-left-color:${color}">
                <div class="day-detail-item-header">
                    <span class="day-detail-item-icon" style="background:${color}"><i class="fas ${icon}"></i></span>
                    <div class="day-detail-item-info">
                        <span class="day-detail-item-title">${item.label}</span>
                        <span class="day-detail-item-meta">
                            <span class="day-detail-item-type">${typeLabel}</span>
                            ${item.cat ? `<span class="day-detail-item-cat">${item.cat}</span>` : ''}
                            <span class="day-detail-item-ed" style="background:${edColor}20;color:${edColor}">${item.edificio || eds[0]}</span>
                        </span>
                    </div>
                    <span class="day-detail-item-status ${done ? 'status-done' : 'status-pending'}">${item.estado}</span>
                </div>
            </div>`;
        }).join('');

        const tareas = dayItems.filter(i => i.type === 'tarea');
        const visitas = dayItems.filter(i => i.type === 'visita');
        const incidencias = dayItems.filter(i => i.type === 'incidencia');

        panel.innerHTML = `<div class="day-detail">
            <div class="day-detail-header">
                <div>
                    <span class="day-detail-title">${dayNamesFull[cellDate.getDay()]} ${d} de ${meses[m - 1]} ${y}</span>
                    <span class="day-detail-count">${dayItems.length} actividad${dayItems.length > 1 ? 'es' : ''}</span>
                </div>
                <button class="day-detail-close" onclick="app.closeDayDetail()"><i class="fas fa-times"></i></button>
            </div>
            <div class="day-detail-stats">
                ${tareas.length ? `<span class="day-detail-stat" style="background:#3b82f610;color:#3b82f6"><i class="fas fa-check-square"></i> ${tareas.length} Tareas</span>` : ''}
                ${visitas.length ? `<span class="day-detail-stat" style="background:#8b5cf610;color:#8b5cf6"><i class="fas fa-calendar-day"></i> ${visitas.length} Visitas</span>` : ''}
                ${incidencias.length ? `<span class="day-detail-stat" style="background:#ef444410;color:#ef4444"><i class="fas fa-exclamation-triangle"></i> ${incidencias.length} Incidencias</span>` : ''}
            </div>
            <div class="day-detail-items">${itemsHTML}</div>
        </div>`;
        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    closeDayDetail() {
        const panel = document.getElementById('dayDetailPanel');
        if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
        document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('cal-cell-selected'));
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
                    const color = item.type === 'tarea' ? CATEGORY_COLORS[item.cat] || '#3b82f6' : item.type === 'visita' ? '#8b5cf6' : '#ef4444';
                    const icon = item.type === 'tarea' ? 'fa-check-square' : item.type === 'visita' ? 'fa-calendar-day' : 'fa-exclamation-triangle';
                    const done = item.estado === 'Completado';
                    html += `<div class="cal-week-event ${done ? 'cal-event-done' : ''}" style="--event-color:${color}">
                        <span class="cal-event-icon" style="background:${color}"><i class="fas ${icon}"></i></span>
                        <span class="cal-week-event-text">${item.label}</span>
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
        const today = new Date();

        let dateStart, dateEnd;
        if (this.cronogramaView === 'monthly') {
            dateStart = new Date(this.currentYear, this.currentMonth, 1);
            dateEnd = new Date(this.currentYear, this.currentMonth + 1, 0);
        } else {
            dateStart = new Date(this.currentWeekStart);
            dateEnd = new Date(this.currentWeekStart);
            dateEnd.setDate(dateEnd.getDate() + 6);
        }

        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        let sections = '';

        eds.forEach(ed => {
            const edColor = getEdificioColor(ed, eds);
            const items = this._getItemsForRange(dateStart, dateEnd, ed);
            items.sort((a, b) => a.date - b.date);

            let itemsHTML = '';
            if (items.length === 0) {
                itemsHTML = '<p class="no-items">Sin actividades programadas</p>';
            } else {
                if (this.cronogramaView === 'monthly') {
                    const byDay = {};
                    items.forEach(item => {
                        const key = item.date.getDate();
                        if (!byDay[key]) byDay[key] = [];
                        byDay[key].push(item);
                    });
                    Object.entries(byDay).forEach(([day, dayItems]) => {
                        const d = new Date(dateStart.getFullYear(), dateStart.getMonth(), parseInt(day));
                        itemsHTML += `<div class="day-group"><div class="day-label">${dayNames[d.getDay()]} ${day} de ${meses[d.getMonth()]}</div>`;
                        dayItems.forEach(item => {
                            itemsHTML += this._pdfEventRow(item);
                        });
                        itemsHTML += '</div>';
                    });
                } else {
                    const byDay = {};
                    items.forEach(item => {
                        const key = item.date.toISOString().split('T')[0];
                        if (!byDay[key]) byDay[key] = [];
                        byDay[key].push(item);
                    });
                    Object.entries(byDay).forEach(([dateStr, dayItems]) => {
                        const d = new Date(dateStr + 'T00:00:00');
                        itemsHTML += `<div class="day-group"><div class="day-label">${dayNames[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]}</div>`;
                        dayItems.forEach(item => {
                            itemsHTML += this._pdfEventRow(item);
                        });
                        itemsHTML += '</div>';
                    });
                }
            }

            const tareasCount = items.filter(i => i.type === 'tarea').length;
            const visitasCount = items.filter(i => i.type === 'visita').length;
            const incCount = items.filter(i => i.type === 'incidencia').length;

            sections += `
                <div class="building-section">
                    <div class="building-header" style="border-left:5px solid ${edColor}">
                        <div class="building-name">${ed}</div>
                        <div class="building-stats">
                            ${tareasCount ? `<span class="stat-item stat-tarea">${tareasCount} Tareas</span>` : ''}
                            ${visitasCount ? `<span class="stat-item stat-visita">${visitasCount} Visitas</span>` : ''}
                            ${incCount ? `<span class="stat-item stat-incidencia">${incCount} Incidencias</span>` : ''}
                        </div>
                    </div>
                    <div class="building-body">${itemsHTML}</div>
                </div>`;
        });

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:Arial,Helvetica,sans-serif;padding:30px;color:#1e293b;font-size:12px;line-height:1.5}
            .header{border-bottom:3px solid #1e40af;padding-bottom:12px;margin-bottom:20px}
            .header h1{font-size:22px;color:#1e40af;margin-bottom:4px}
            .header .date{font-size:12px;color:#64748b}
            .building-section{margin-bottom:20px;page-break-inside:avoid}
            .building-header{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#f8fafc;border-radius:6px;margin-bottom:8px}
            .building-name{font-size:15px;font-weight:800;color:#1e293b}
            .building-stats{display:flex;gap:10px}
            .stat-item{font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;color:white}
            .stat-tarea{background:#3b82f6}
            .stat-visita{background:#8b5cf6}
            .stat-incidencia{background:#ef4444}
            .building-body{padding-left:10px}
            .day-group{margin-bottom:8px}
            .day-label{font-size:11px;font-weight:700;color:#475569;padding:4px 0;border-bottom:1px solid #e2e8f0;margin-bottom:4px}
            .event-row{display:flex;align-items:center;gap:8px;padding:5px 8px;margin:3px 0;background:#f8fafc;border-radius:4px;border-left:3px solid #ccc}
            .event-icon{width:20px;height:20px;border-radius:4px;display:flex;align-items:center;justify-content:center;color:white;font-size:9px;flex-shrink:0}
            .event-text{font-size:11.5px;font-weight:500;flex:1}
            .event-type{font-size:9px;color:#64748b;font-weight:600;text-transform:uppercase}
            .event-done{opacity:0.45;text-decoration:line-through}
            .no-items{color:#94a3b8;font-style:italic;padding:6px 0;font-size:11px}
            .legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:20px;padding-top:12px;border-top:2px solid #e2e8f0}
            .legend-item{display:flex;align-items:center;gap:5px;font-size:10px;color:#64748b;font-weight:500}
            .legend-dot{width:10px;height:10px;border-radius:50%}
            @media print{body{padding:20px;font-size:11px}.building-section{page-break-inside:avoid}}
        </style></head><body>
            <div class="header">
                <h1>${title}</h1>
                <div class="date">Facility Management · Generado el ${today.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            ${sections}
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

    _pdfEventRow(item) {
        const color = item.type === 'tarea' ? '#3b82f6' : item.type === 'visita' ? '#8b5cf6' : '#ef4444';
        const icon = item.type === 'tarea' ? 'fa-check-square' : item.type === 'visita' ? 'fa-calendar-day' : 'fa-exclamation-triangle';
        const typeLabel = item.type === 'tarea' ? 'Tarea' : item.type === 'visita' ? 'Visita' : 'Incidencia';
        const done = item.estado === 'Completado' ? ' event-done' : '';
        return `<div class="event-row${done}" style="border-left-color:${color}">
            <span class="event-icon" style="background:${color}"><i class="fas ${icon}" style="font-size:8px"></i></span>
            <span class="event-text">${item.label}</span>
            <span class="event-type">${typeLabel}</span>
        </div>`;
    }

    // =================== CARTA GANTT ===================
    renderGantt() {
        const container = document.getElementById('ganttContainer');
        if (!container) return;
        const gfEd = document.getElementById('filterGanttEdificio')?.value || '';
        const gfCat = document.getElementById('filterGanttCategoria')?.value || '';
        const eds = this.data.listas.edificios || [];

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
                    const label = this.escapeHtml(item.label.substring(0, 28) + (item.label.length > 28 ? '...' : ''));
                    const edificio = this.escapeHtml(item.edificio);
                    return `<div class="gantt-sidebar-row" style="height:${rowHeight}px">
                        <div class="gantt-sidebar-status" style="background:${statusDot}"></div>
                        <div class="gantt-sidebar-info">
                            <span class="gantt-sidebar-label">${label}</span>
                            <span class="gantt-sidebar-meta"><span class="edificio-dot" style="background:${edColor}"></span>${edificio} · ${item.type}</span>
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
                        const barWidth = item.type === 'Visita' ? 2 : Math.min(8, Math.max(4, Math.ceil((allItems.length > 10 ? 1 : 1.5))));
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
                <td><strong>${this.escapeHtml(i.id)}</strong></td><td>${this.formatDate(i.fecha)}</td>
                <td><span class="edificio-tag" style="background:${getEdificioColor(i.edificio, this.data.listas?.edificios)}">${this.escapeHtml(i.edificio)}</span></td>
                <td>${this.escapeHtml(i.descripcion)}</td>
                <td><span style="color:${CATEGORY_COLORS[i.categoria]};font-weight:500">${this.escapeHtml(i.categoria)}</span></td>
                <td><span class="status-badge status-${i.prioridad.toLowerCase()}">${this.escapeHtml(i.prioridad)}</span></td>
                <td>${this.escapeHtml(i.proveedor)}</td>
                <td><span class="status-badge status-${i.estado.toLowerCase().replace(' ', '')}">${this.escapeHtml(i.estado)}</span></td>
                <td class="actions-cell">
                    ${i.emails && i.emails.length ? `<button class="btn-sm" style="background:#8b5cf620;color:#8b5cf6;border:1px solid #8b5cf640" onclick="app.showRecordEmails('incidencia','${i.id}')" title="${i.emails.length} correo(s)"><i class="fas fa-envelope"></i> ${i.emails.length}</button>` : ''}
                    <button class="btn-success btn-sm" onclick="app.editIncidencia('${i.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger btn-sm" onclick="app.deleteIncidencia('${i.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`).join('') : '<tr><td colspan="9" class="text-center">No se encontraron incidencias</td></tr>';
        document.getElementById('navIncidenciasBadge').textContent = this.data.incidencias?.filter(i => i.estado !== 'Completado').length || 0;
    }

    getIncidenciaForm(i = null) {
        const cats = this.data.listas.categorias || [], eds = this.data.listas.edificios || [], ubs = this.data.listas.ubicaciones || [], prs = this.data.listas.prioridades || [], provs = this.data.proveedores || [];
        return `<form>
            <div class="form-group"><label>CIRION *</label><select id="incEdificio">${eds.map(e => `<option value="${e}" ${i?.edificio === e ? 'selected' : ''}>${this.escapeHtml(e)}</option>`).join('')}</select></div>
            <div class="form-group"><label>Descripción *</label><input type="text" id="incDescripcion" value="${this.escapeHtml(i?.descripcion || '')}" required></div>
            <div class="form-group"><label>Categoría *</label><select id="incCategoria">${cats.map(c => `<option value="${c}" ${i?.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            <div class="form-group"><label>Ubicación</label><select id="incUbicacion">${ubs.map(u => `<option value="${u}" ${i?.ubicacion === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
            <div class="form-group"><label>Prioridad *</label><select id="incPrioridad">${prs.map(p => `<option value="${p}" ${i?.prioridad === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
            <div class="form-group"><label>Proveedor</label><select id="incProveedor"><option value="">Sin asignar</option>${provs.map(p => `<option value="${p.empresa}" ${i?.proveedor === p.empresa ? 'selected' : ''}>${p.empresa}</option>`).join('')}</select></div>
            <div class="form-group"><label>Estado</label><select id="incEstado">${['Pendiente', 'En Progreso', 'Completado'].map(e => `<option value="${e}" ${i?.estado === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
            <div class="form-group"><label>Observaciones</label><textarea id="incObservaciones" rows="2">${i?.observaciones || ''}</textarea></div>
        </form>`;
    }

    async saveIncidencia(id = null) {
        try {
            const d = { fecha: new Date().toISOString().split('T')[0], edificio: this.gv('incEdificio'), descripcion: this.gv('incDescripcion'), categoria: this.gv('incCategoria'), ubicacion: this.gv('incUbicacion'), prioridad: this.gv('incPrioridad'), proveedor: this.gv('incProveedor'), estado: this.gv('incEstado'), observaciones: this.gv('incObservaciones'), fotos: [] };
            if (id) {
                const i = this.data.incidencias.findIndex(x => x.id === id);
                if (i !== -1) {
                    const existing = this.data.incidencias[i];
                    d.id = id;
                    d.updatedAt = new Date().toISOString();
                    if (d.estado === 'Completado' && existing.estado !== 'Completado') {
                        d.fechaCompletado = new Date().toISOString().split('T')[0];
                    }
                    if (existing.fecha) d.fecha = existing.fecha;
                    if (existing.createdAt) d.createdAt = existing.createdAt;
                    if (existing.emails) d.emails = existing.emails;
                    this.data.incidencias[i] = { ...existing, ...d };
                    await db.put('incidencias', this.data.incidencias[i]);
                }
            }
            else {
                d.id = 'INC-' + Date.now();
                d.createdAt = new Date().toISOString();
                d.emails = [];
                this.data.incidencias.push(d);
                await db.put('incidencias', d);

                if (d.proveedor) {
                    try {
                        const email = await emailGenerator.generateDraftEmail('incidencia', { ...d, proveedorId: d.proveedor });
                        if (email.to) {
                            d.emails.push(email);
                            await db.put('incidencias', d);
                        }
                    } catch (e) { console.error('Error generating email draft:', e); }
                }

                const tarea = {
                    id: 'TAR-' + Date.now(),
                    actividad: `Resolver incidencia: ${d.descripcion}`,
                    categoria: d.categoria,
                    edificio: d.edificio,
                    ubicacion: d.ubicacion,
                    proveedor: d.proveedor,
                    fecha: d.fecha,
                    estado: 'Pendiente',
                    observaciones: `Generada desde incidencia ${d.id}. Prioridad: ${d.prioridad}. ${d.observaciones || ''}`,
                    createdAt: new Date().toISOString(),
                    emails: d.emails ? [...d.emails] : []
                };
                this.data.tareas.push(tarea);
                await db.put('tareas', tarea);
                this.showToast(`Tarea automática creada: ${tarea.actividad}`, 'info');
            }
            this.closeModal(); this.renderIncidencias(); this.updateSidebarBadges(); this.renderDashboard(); this.updateNotificationBadge(); this.showToast(id ? 'Incidencia actualizada' : 'Incidencia creada + tarea generada', 'success');
        } catch (err) { console.error('Error guardando incidencia:', err); this.showToast('Error al guardar', 'error'); }
    }

    editIncidencia(id) { const i = this.data.incidencias.find(x => x.id === id); if (i) this.showModal('Editar Incidencia', this.getIncidenciaForm(i), () => this.saveIncidencia(i.id)); }
    async deleteIncidencia(id) { if (!confirm('¿Eliminar incidencia?')) return; this.data.incidencias = this.data.incidencias.filter(i => i.id !== id); await db.delete('incidencias', id); this.renderIncidencias(); this.updateSidebarBadges(); this.showToast('Incidencia eliminada', 'success'); }

    showRecordEmails(type, id) {
        let record;
        if (type === 'tarea') record = this.data.tareas.find(t => t.id === id);
        else if (type === 'visita') record = this.data.visitas.find(v => v.id === id);
        else if (type === 'incidencia') record = this.data.incidencias.find(i => i.id === id);
        if (!record || !record.emails || !record.emails.length) return;

        const emailsHTML = record.emails.map(email => {
            const estadoColor = email.estado === 'Borrador' ? '#f59e0b' : email.estado === 'Enviado' ? '#22c55e' : '#64748b';
            return `<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                    <span style="font-size:12px;font-weight:600;color:${estadoColor};background:${estadoColor}15;padding:2px 8px;border-radius:4px">${email.estado}</span>
                    <span style="font-size:11px;color:#94a3b8">${email.createdAt ? new Date(email.createdAt).toLocaleDateString('es-CL') : ''}</span>
                </div>
                <div style="font-size:12px;color:#64748b;margin-bottom:4px"><strong>Para:</strong> ${email.to || 'Sin destinatario'} ${email.toEmpresa ? `(${email.toEmpresa})` : ''}</div>
                <div style="font-size:13px;font-weight:600;color:#1e293b;margin-bottom:6px">${email.subject}</div>
                <pre style="font-size:12px;color:#475569;white-space:pre-wrap;font-family:Arial,sans-serif;background:#f8fafc;padding:10px;border-radius:6px;max-height:150px;overflow-y:auto;margin:0">${email.body}</pre>
                <div style="display:flex;gap:6px;margin-top:8px">
                    <button class="btn-sm btn-primary" onclick="app.copyEmailBody('${type}','${id}','${email.id}')" title="Copiar texto"><i class="fas fa-copy"></i> Copiar</button>
                    <button class="btn-sm btn-success" onclick="app.openEmailClientFor('${email.to}','${email.subject}','${email.body}')" title="Abrir correo"><i class="fas fa-envelope"></i> Enviar</button>
                </div>
            </div>`;
        }).join('');

        this.showModal(`Correos — ${record.id}`, `<div>${emailsHTML}</div>`, null);
        document.getElementById('modalSave').style.display = 'none';
    }

    copyEmailBody(type, id, emailId) {
        let record;
        if (type === 'tarea') record = this.data.tareas.find(t => t.id === id);
        else if (type === 'visita') record = this.data.visitas.find(v => v.id === id);
        else if (type === 'incidencia') record = this.data.incidencias.find(i => i.id === id);
        const email = record?.emails?.find(e => e.id === emailId);
        if (!email) return;
        navigator.clipboard.writeText(email.body).then(() => this.showToast('Correo copiado', 'success'));
    }

    openEmailClientFor(to, subject, body) {
        window.open(`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    }

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
            <div class="form-group"><label>CIRION *</label><select id="informeEdificio" onchange="app._updateInformeSummary()">${eds.map(e => `<option value="${e}" ${inf?.edificio === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
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
        try {
            const getTareas = () => Array.from(document.querySelectorAll('.inf-tarea-check')).map(el => ({ texto: el.dataset.text, completada: el.checked }));
            const getVisitas = () => Array.from(document.querySelectorAll('.inf-visita-check')).map(el => ({ texto: el.dataset.text, completada: el.checked }));
            const getIncidencias = () => Array.from(document.querySelectorAll('.inf-incidencia-check')).map(el => ({ texto: el.dataset.text, completada: el.checked }));

            const d = {
                edificio: this.gv('informeEdificio'), fecha: this.gv('informeFecha'), titulo: this.gv('informeTitulo'),
                descripcion: this.gv('informeDescripcion'), observaciones: this.gv('informeObservaciones'),
                pendientes: this.gv('informePendientes'),
                tareasResumen: getTareas(), visitasResumen: getVisitas(), incidenciasResumen: getIncidencias()
            };
            if (id) { const i = this.data.informesDiarios.findIndex(x => x.id === id); if (i !== -1) { d.id = id; d.updatedAt = new Date().toISOString(); this.data.informesDiarios[i] = { ...this.data.informesDiarios[i], ...d }; await db.put('informesDiarios', this.data.informesDiarios[i]); } }
            else { d.id = 'INF-' + Date.now(); d.createdAt = new Date().toISOString(); this.data.informesDiarios.push(d); await db.put('informesDiarios', d); }
            this.closeModal(); this.renderInformes(); this.showToast(id ? 'Informe actualizado' : 'Informe creado', 'success');
        } catch (err) { console.error('Error guardando informe:', err); this.showToast('Error al guardar', 'error'); }
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
        try {
            const d = { empresa: this.gv('provEmpresa'), servicio: this.gv('provServicio'), contacto: this.gv('provContacto'), telefono: this.gv('provTelefono'), email: this.gv('provEmail'), calificacion: parseInt(this.gv('provCalificacion')) || 4, estado: 'Activo' };
            if (id) { const i = this.data.proveedores.findIndex(p => p.id === id); if (i !== -1) { d.id = id; d.updatedAt = new Date().toISOString(); this.data.proveedores[i] = { ...this.data.proveedores[i], ...d }; await db.put('proveedores', this.data.proveedores[i]); } }
            else { d.id = 'PRV-' + Date.now(); d.createdAt = new Date().toISOString(); this.data.proveedores.push(d); await db.put('proveedores', d); }
            this.closeModal(); this.renderProveedores(); this.showToast(id ? 'Proveedor actualizado' : 'Proveedor creado', 'success');
        } catch (err) { console.error('Error guardando proveedor:', err); this.showToast('Error al guardar', 'error'); }
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
        try {
            for (const [k, v] of [['nombreEmpresa', 'nombreEmpresa'], ['administrador', 'administrador'], ['emailNotif', 'emailNotif'], ['telefono', 'telefonoEdificio']]) {
                const el = document.getElementById(v);
                if (el) await db.put('config', { key: k, value: el.value });
            }
            this.showToast('Configuración guardada', 'success');
        } catch (err) { console.error('Error guardando configuración:', err); this.showToast('Error al guardar', 'error'); }
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

    updateSidebarBadges() {
        const tareas = this.data.tareas?.filter(t => t.estado !== 'Completado').length || 0;
        const visitas = this.data.visitas?.filter(v => v.estado !== 'Completado').length || 0;
        const incidencias = this.data.incidencias?.filter(i => i.estado !== 'Completado').length || 0;
        const t = document.getElementById('navTareasBadge');
        const v = document.getElementById('navVisitasBadge');
        const inc = document.getElementById('navIncidenciasBadge');
        if (t) t.textContent = tareas;
        if (v) v.textContent = visitas;
        if (inc) inc.textContent = incidencias;
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

// Global error handler
window.onerror = function(msg, url, line, col, error) {
    console.error('Global error:', { msg, url, line, col, error });
    if (app.showToast) app.showToast('Error inesperado. Revisa la consola.', 'error');
    return false;
};
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    if (app.showToast) app.showToast('Error de conexión.', 'error');
});
