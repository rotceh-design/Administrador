class TeamManager {
    constructor() {
        this.currentView = 'directory';
        this.currentTab = 'personal';
    }

    init() {
        this.render();
    }

    render() {
        switch (this.currentTab) {
            case 'personal': this.renderPersonal(); break;
            case 'cargos': this.renderCargos(); break;
            case 'turnos': this.renderTurnos(); break;
            case 'certificaciones': this.renderCertificaciones(); break;
        }
    }

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.team-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        this.render();
    }

    // =================== DIRECTORIO DE PERSONAL ===================
    renderPersonal() {
        const container = document.getElementById('teamContent');
        if (!container) return;

        const personal = app.data.personal || [];
        const edificio = document.getElementById('filterTeamEdificio')?.value || '';
        const cargo = document.getElementById('filterTeamCargo')?.value || '';
        const busqueda = document.getElementById('filterTeamSearch')?.value?.toLowerCase() || '';

        let filtered = [...personal];
        if (edificio) filtered = filtered.filter(p => p.edificioAsignado === edificio);
        if (cargo) filtered = filtered.filter(p => p.cargo === cargo);
        if (busqueda) filtered = filtered.filter(p => `${p.nombre} ${p.apellido}`.toLowerCase().includes(busqueda) || p.email?.toLowerCase().includes(busqueda));

        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>${personal.length === 0 ? 'No hay personal registrado' : 'No se encontraron resultados'}</p>
                ${personal.length === 0 ? '<button class="btn-primary" onclick="teamManager.showNewPersonal()"><i class="fas fa-plus"></i> Agregar Primer Miembro</button>' : ''}</div>`;
            return;
        }

        container.innerHTML = `<div class="team-grid">${filtered.map(p => this.getPersonalCard(p)).join('')}</div>`;
    }

    getPersonalCard(p) {
        const edificios = app.data.listas?.edificios || [];
        const edColor = getEdificioColor(p.edificioAsignado, edificios);
        const cargoColor = CARGO_COLORS[p.cargo] || '#6366f1';
        const initials = `${(p.nombre || '')[0] || ''}${(p.apellido || '')[0] || ''}`.toUpperCase();
        const certCount = (p.certificaciones || []).length;
        const habCount = (p.habilidades || []).length;
        const estadoColor = p.estado === 'Activo' ? '#10b981' : p.estado === 'Inactivo' ? '#ef4444' : '#f59e0b';

        return `<div class="team-card">
            <div class="team-card-header">
                <div class="team-avatar" style="background:${cargoColor}20;color:${cargoColor};border:2px solid ${cargoColor}40">
                    ${p.foto ? `<img src="${p.foto}" alt="${p.nombre}">` : `<span>${initials}</span>`}
                </div>
                <div class="team-card-info">
                    <h4>${app.escapeHtml(p.nombre)} ${app.escapeHtml(p.apellido)}</h4>
                    <span class="team-cargo-tag" style="background:${cargoColor}18;color:${cargoColor}">${app.escapeHtml(p.cargo)}</span>
                </div>
                <span class="team-estado-dot" style="background:${estadoColor}" title="${p.estado}"></span>
            </div>
            <div class="team-card-body">
                <div class="team-card-row"><i class="fas fa-envelope"></i><span>${app.escapeHtml(p.email || 'Sin email')}</span></div>
                <div class="team-card-row"><i class="fas fa-phone"></i><span>${app.escapeHtml(p.telefono || 'Sin teléfono')}</span></div>
                ${p.edificioAsignado ? `<div class="team-card-row"><i class="fas fa-building"></i><span class="edificio-tag" style="background:${edColor}20;color:${edColor};font-size:11px;padding:2px 8px;border-radius:4px">${app.escapeHtml(p.edificioAsignado)}</span></div>` : ''}
                ${p.fechaIngreso ? `<div class="team-card-row"><i class="fas fa-calendar"></i><span>Desde ${app.formatDate(p.fechaIngreso)}</span></div>` : ''}
            </div>
            <div class="team-card-footer">
                ${certCount > 0 ? `<span class="team-badge cert"><i class="fas fa-certificate"></i> ${certCount}</span>` : ''}
                ${habCount > 0 ? `<span class="team-badge hab"><i class="fas fa-star"></i> ${habCount}</span>` : ''}
                <div class="team-card-actions">
                    <button class="btn-sm btn-success" onclick="teamManager.editPersonal('${p.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-sm btn-danger" onclick="teamManager.deletePersonal('${p.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>`;
    }

    getPersonalForm(p = null) {
        const cargos = app.data.listas?.cargos || [];
        const areas = app.data.listas?.areasTrabajo || [];
        const eds = app.data.listas?.edificios || [];
        const certs = app.data.listas?.certificaciones || [];
        const selectedCerts = p?.certificaciones || [];
        const selectedHabs = p?.habilidades || [];

        return `<form id="personalForm">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group"><label>Nombre *</label><input type="text" id="pNombre" value="${app.escapeHtml(p?.nombre || '')}" required></div>
                <div class="form-group"><label>Apellido *</label><input type="text" id="pApellido" value="${app.escapeHtml(p?.apellido || '')}" required></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group"><label>Email</label><input type="email" id="pEmail" value="${app.escapeHtml(p?.email || '')}"></div>
                <div class="form-group"><label>Teléfono</label><input type="tel" id="pTelefono" value="${app.escapeHtml(p?.telefono || '')}"></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group"><label>Cargo *</label><select id="pCargo">${cargos.map(c => `<option value="${c}" ${p?.cargo === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
                <div class="form-group"><label>Área de Trabajo</label><select id="pArea">${areas.map(a => `<option value="${a}" ${p?.area === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group"><label>CIRION Asignado</label><select id="pEdificio"><option value="">Sin asignar</option>${eds.map(e => `<option value="${e}" ${p?.edificioAsignado === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
                <div class="form-group"><label>Estado</label><select id="pEstado">${['Activo', 'Inactivo', 'Vacaciones', 'Permiso'].map(e => `<option value="${e}" ${p?.estado === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
            </div>
            <div class="form-group"><label>Fecha de Ingreso</label><input type="date" id="pFechaIngreso" value="${p?.fechaIngreso || ''}"></div>
            <div class="form-group">
                <label><i class="fas fa-certificate" style="color:#f59e0b"></i> Certificaciones</label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:120px;overflow-y:auto;padding:4px">
                    ${certs.map(c => `<label style="display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;cursor:pointer;background:${selectedCerts.includes(c) ? '#fef3c7' : '#f8fafc'};border:1px solid ${selectedCerts.includes(c) ? '#f59e0b50' : '#e2e8f0'}">
                        <input type="checkbox" class="p-cert" value="${c}" ${selectedCerts.includes(c) ? 'checked' : ''} style="accent-color:#f59e0b">
                        <span style="font-size:12px;color:#334155">${c}</span>
                    </label>`).join('')}
                </div>
            </div>
            <div class="form-group">
                <label><i class="fas fa-star" style="color:#8b5cf6"></i> Habilidades</label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;max-height:120px;overflow-y:auto;padding:4px">
                    ${HABILIDADES_LIST.map(h => `<label style="display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;cursor:pointer;background:${selectedHabs.includes(h) ? '#ede9fe' : '#f8fafc'};border:1px solid ${selectedHabs.includes(h) ? '#8b5cf650' : '#e2e8f0'}">
                        <input type="checkbox" class="p-hab" value="${h}" ${selectedHabs.includes(h) ? 'checked' : ''} style="accent-color:#8b5cf6">
                        <span style="font-size:12px;color:#334155">${h}</span>
                    </label>`).join('')}
                </div>
            </div>
            <div class="form-group"><label>Observaciones</label><textarea id="pObservaciones" rows="2">${app.escapeHtml(p?.observaciones || '')}</textarea></div>
        </form>`;
    }

    async savePersonal(id = null) {
        try {
            const certs = [...document.querySelectorAll('.p-cert:checked')].map(cb => cb.value);
            const habs = [...document.querySelectorAll('.p-hab:checked')].map(cb => cb.value);
            const d = {
                nombre: app.gv('pNombre'),
                apellido: app.gv('pApellido'),
                email: app.gv('pEmail'),
                telefono: app.gv('pTelefono'),
                cargo: app.gv('pCargo'),
                area: app.gv('pArea'),
                edificioAsignado: app.gv('pEdificio'),
                estado: app.gv('pEstado'),
                fechaIngreso: app.gv('pFechaIngreso'),
                certificaciones: certs,
                habilidades: habs,
                observaciones: app.gv('pObservaciones')
            };

            if (id) {
                const i = app.data.personal.findIndex(p => p.id === id);
                if (i !== -1) {
                    const existing = app.data.personal[i];
                    d.id = id;
                    d.updatedAt = new Date().toISOString();
                    if (existing.createdAt) d.createdAt = existing.createdAt;
                    if (existing.foto) d.foto = existing.foto;
                    app.data.personal[i] = { ...existing, ...d };
                    await db.put('personal', app.data.personal[i]);
                }
            } else {
                d.id = 'PER-' + Date.now();
                d.createdAt = new Date().toISOString();
                app.data.personal.push(d);
                await db.put('personal', d);
            }

            app.closeModal();
            this.render();
            app.showToast(id ? 'Personal actualizado' : 'Personal agregado', 'success');
        } catch (err) {
            console.error('Error guardando personal:', err);
            app.showToast('Error al guardar', 'error');
        }
    }

    showNewPersonal() {
        app.showModal('Nuevo Miembro del Equipo', this.getPersonalForm(), () => this.savePersonal());
    }

    editPersonal(id) {
        const p = app.data.personal.find(x => x.id === id);
        if (p) app.showModal('Editar Personal', this.getPersonalForm(p), () => this.savePersonal(p.id));
    }

    async deletePersonal(id) {
        if (!confirm('¿Eliminar este miembro del equipo?')) return;
        app.data.personal = app.data.personal.filter(p => p.id !== id);
        await db.delete('personal', id);
        this.render();
        app.showToast('Personal eliminado', 'success');
    }

    // =================== CARGOS ===================
    renderCargos() {
        const container = document.getElementById('teamContent');
        if (!container) return;

        const cargos = app.data.listas?.cargos || [];
        const areas = app.data.listas?.areasTrabajo || [];
        const personal = app.data.personal || [];

        const cargosHTML = cargos.map(c => {
            const count = personal.filter(p => p.cargo === c).length;
            const color = CARGO_COLORS[c] || '#6366f1';
            return `<div class="cargo-card" style="border-left:4px solid ${color}">
                <div class="cargo-info">
                    <h4 style="color:${color}">${c}</h4>
                    <span>${count} miembro${count !== 1 ? 's' : ''}</span>
                </div>
                <button class="btn-sm btn-danger" onclick="teamManager.removeCargo('${c}')" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>`;
        }).join('');

        const areasHTML = areas.map(a => {
            const color = CATEGORY_COLORS[a] || '#6b7280';
            return `<div class="cargo-card" style="border-left:4px solid ${color}">
                <div class="cargo-info">
                    <h4 style="color:${color}">${a}</h4>
                </div>
                <button class="btn-sm btn-danger" onclick="teamManager.removeArea('${a}')" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>`;
        }).join('');

        container.innerHTML = `
            <div class="cargos-grid">
                <div class="cargos-section">
                    <div class="cargos-header">
                        <h3><i class="fas fa-id-badge"></i> Cargos</h3>
                        <div class="list-input-row">
                            <input type="text" id="newCargoInput" placeholder="Nuevo cargo...">
                            <button class="btn-primary btn-sm" onclick="teamManager.addCargo()"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>
                    <div class="cargos-list">${cargosHTML || '<p style="color:#94a3b8;text-align:center;padding:20px">Sin cargos definidos</p>'}</div>
                </div>
                <div class="cargos-section">
                    <div class="cargos-header">
                        <h3><i class="fas fa-tools"></i> Áreas de Trabajo</h3>
                        <div class="list-input-row">
                            <input type="text" id="newAreaInput" placeholder="Nueva área...">
                            <button class="btn-primary btn-sm" onclick="teamManager.addArea()"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>
                    <div class="cargos-list">${areasHTML || '<p style="color:#94a3b8;text-align:center;padding:20px">Sin áreas definidas</p>'}</div>
                </div>
            </div>`;
    }

    async addCargo() {
        const input = document.getElementById('newCargoInput');
        const val = input?.value.trim();
        if (!val) return;
        const cargos = app.data.listas?.cargos || [];
        if (cargos.includes(val)) { app.showToast('El cargo ya existe', 'warning'); return; }
        cargos.push(val);
        app.data.listas.cargos = cargos;
        await db.put('listas', { key: 'cargos', value: cargos });
        input.value = '';
        this.render();
        app.showToast('Cargo agregado', 'success');
    }

    async removeCargo(cargo) {
        if (!confirm(`¿Eliminar el cargo "${cargo}"?`)) return;
        let cargos = app.data.listas?.cargos || [];
        cargos = cargos.filter(c => c !== cargo);
        app.data.listas.cargos = cargos;
        await db.put('listas', { key: 'cargos', value: cargos });
        this.render();
        app.showToast('Cargo eliminado', 'success');
    }

    async addArea() {
        const input = document.getElementById('newAreaInput');
        const val = input?.value.trim();
        if (!val) return;
        const areas = app.data.listas?.areasTrabajo || [];
        if (areas.includes(val)) { app.showToast('El área ya existe', 'warning'); return; }
        areas.push(val);
        app.data.listas.areasTrabajo = areas;
        await db.put('listas', { key: 'areasTrabajo', value: areas });
        input.value = '';
        this.render();
        app.showToast('Área agregada', 'success');
    }

    async removeArea(area) {
        if (!confirm(`¿Eliminar el área "${area}"?`)) return;
        let areas = app.data.listas?.areasTrabajo || [];
        areas = areas.filter(a => a !== area);
        app.data.listas.areasTrabajo = areas;
        await db.put('listas', { key: 'areasTrabajo', value: areas });
        this.render();
        app.showToast('Área eliminada', 'success');
    }

    // =================== TURNOS ===================
    renderTurnos() {
        const container = document.getElementById('teamContent');
        if (!container) return;

        const turnos = app.data.turnos || [];
        const personal = app.data.personal || [];
        const eds = app.data.listas?.edificios || [];

        const filterEd = document.getElementById('filterTurnoEdificio')?.value || '';
        const filterFecha = document.getElementById('filterTurnoFecha')?.value || '';

        let filtered = [...turnos];
        if (filterEd) filtered = filtered.filter(t => t.edificio === filterEd);
        if (filterFecha) filtered = filtered.filter(t => t.fecha === filterFecha);

        filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || (a.horaEntrada || '').localeCompare(b.horaEntrada || ''));

        const turnosHTML = filtered.length ? filtered.map(t => {
            const pers = personal.find(p => p.id === t.personalId);
            const edColor = getEdificioColor(t.edificio, eds);
            const estadoColor = t.estado === 'Completado' ? '#10b981' : t.estado === 'En Curso' ? '#f59e0b' : t.estado === 'Cancelado' ? '#ef4444' : '#3b82f6';

            return `<div class="turno-card">
                <div class="turno-header">
                    <div class="turno-pers">
                        <strong>${pers ? app.escapeHtml(pers.nombre + ' ' + pers.apellido) : 'Sin asignar'}</strong>
                        <span class="team-cargo-tag" style="background:${CARGO_COLORS[pers?.cargo] || '#6366f1'}20;color:${CARGO_COLORS[pers?.cargo] || '#6366f1'}">${app.escapeHtml(pers?.cargo || '')}</span>
                    </div>
                    <span class="turno-estado" style="background:${estadoColor}20;color:${estadoColor}">${t.estado}</span>
                </div>
                <div class="turno-body">
                    <div class="turno-detail"><i class="fas fa-calendar"></i> ${app.formatDate(t.fecha)}</div>
                    <div class="turno-detail"><i class="fas fa-clock"></i> ${t.horaEntrada || '--:--'} - ${t.horaSalida || '--:--'}</div>
                    <div class="turno-detail"><i class="fas fa-building"></i> <span class="edificio-tag" style="background:${edColor}20;color:${edColor}">${app.escapeHtml(t.edificio)}</span></div>
                    ${t.observaciones ? `<div class="turno-detail"><i class="fas fa-sticky-note"></i> ${app.escapeHtml(t.observaciones)}</div>` : ''}
                </div>
                <div class="turno-actions">
                    <button class="btn-sm btn-success" onclick="teamManager.editTurno('${t.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-sm btn-danger" onclick="teamManager.deleteTurno('${t.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('') : '<div class="empty-state"><i class="fas fa-calendar-alt"></i><p>No hay turnos programados</p><button class="btn-primary" onclick="teamManager.showNewTurno()"><i class="fas fa-plus"></i> Programar Turno</button></div>';

        container.innerHTML = `
            <div style="padding:14px 20px;background:var(--bg-card);border-bottom:1px solid var(--border);display:flex;gap:10px;flex-wrap:wrap;align-items:center">
                <select id="filterTurnoEdificio" class="filter-select" onchange="teamManager.renderTurnos()"><option value="">Todos los CIRION</option>${eds.map(e => `<option value="${e}">${e}</option>`).join('')}</select>
                <input type="date" id="filterTurnoFecha" class="filter-input" onchange="teamManager.renderTurnos()" value="${filterFecha}">
                <button class="btn-primary" onclick="teamManager.showNewTurno()"><i class="fas fa-plus"></i> Programar Turno</button>
            </div>
            <div class="turnos-container">${turnosHTML}</div>`;
    }

    getTurnoForm(t = null) {
        const personal = (app.data.personal || []).filter(p => p.estado === 'Activo');
        const eds = app.data.listas?.edificios || [];

        return `<form>
            <div class="form-group"><label>Miembro del Equipo *</label><select id="turnoPersonalId">
                <option value="">Seleccionar...</option>
                ${personal.map(p => `<option value="${p.id}" ${t?.personalId === p.id ? 'selected' : ''}>${p.nombre} ${p.apellido} - ${p.cargo}</option>`).join('')}
            </select></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group"><label>CIRION *</label><select id="turnoEdificio">${eds.map(e => `<option value="${e}" ${t?.edificio === e ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
                <div class="form-group"><label>Fecha *</label><input type="date" id="turnoFecha" value="${t?.fecha || new Date().toISOString().split('T')[0]}"></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group"><label>Hora Entrada</label><input type="time" id="turnoHoraEntrada" value="${t?.horaEntrada || '08:00'}"></div>
                <div class="form-group"><label>Hora Salida</label><input type="time" id="turnoHoraSalida" value="${t?.horaSalida || '17:00'}"></div>
            </div>
            <div class="form-group"><label>Estado</label><select id="turnoEstado">
                ${['Programado', 'En Curso', 'Completado', 'Cancelado'].map(e => `<option value="${e}" ${t?.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
            </select></div>
            <div class="form-group"><label>Observaciones</label><textarea id="turnoObservaciones" rows="2">${app.escapeHtml(t?.observaciones || '')}</textarea></div>
        </form>`;
    }

    showNewTurno() {
        app.showModal('Programar Turno', this.getTurnoForm(), () => this.saveTurno());
    }

    async saveTurno(id = null) {
        try {
            const d = {
                personalId: app.gv('turnoPersonalId'),
                edificio: app.gv('turnoEdificio'),
                fecha: app.gv('turnoFecha'),
                horaEntrada: app.gv('turnoHoraEntrada'),
                horaSalida: app.gv('turnoHoraSalida'),
                estado: app.gv('turnoEstado'),
                observaciones: app.gv('turnoObservaciones')
            };

            if (id) {
                const i = app.data.turnos.findIndex(t => t.id === id);
                if (i !== -1) {
                    d.id = id;
                    d.updatedAt = new Date().toISOString();
                    app.data.turnos[i] = { ...app.data.turnos[i], ...d };
                    await db.put('turnos', app.data.turnos[i]);
                }
            } else {
                d.id = 'TUR-' + Date.now();
                d.createdAt = new Date().toISOString();
                app.data.turnos.push(d);
                await db.put('turnos', d);
            }

            app.closeModal();
            this.render();
            app.showToast(id ? 'Turno actualizado' : 'Turno programado', 'success');
        } catch (err) {
            console.error('Error guardando turno:', err);
            app.showToast('Error al guardar', 'error');
        }
    }

    editTurno(id) {
        const t = app.data.turnos.find(x => x.id === id);
        if (t) app.showModal('Editar Turno', this.getTurnoForm(t), () => this.saveTurno(t.id));
    }

    async deleteTurno(id) {
        if (!confirm('¿Eliminar este turno?')) return;
        app.data.turnos = app.data.turnos.filter(t => t.id !== id);
        await db.delete('turnos', id);
        this.render();
        app.showToast('Turno eliminado', 'success');
    }

    // =================== CERTIFICACIONES ===================
    renderCertificaciones() {
        const container = document.getElementById('teamContent');
        if (!container) return;

        const personal = app.data.personal || [];
        const allCerts = app.data.listas?.certificaciones || [];

        const certStats = {};
        allCerts.forEach(c => { certStats[c] = { total: 0, members: [] }; });
        personal.forEach(p => {
            (p.certificaciones || []).forEach(c => {
                if (!certStats[c]) certStats[c] = { total: 0, members: [] };
                certStats[c].total++;
                certStats[c].members.push(`${p.nombre} ${p.apellido}`);
            });
        });

        const certsHTML = Object.entries(certStats).map(([cert, data]) => {
            return `<div class="cert-card">
                <div class="cert-icon"><i class="fas fa-certificate"></i></div>
                <div class="cert-info">
                    <h4>${cert}</h4>
                    <span>${data.total} miembro${data.total !== 1 ? 's' : ''} certificado${data.total !== 1 ? 's' : ''}</span>
                    ${data.members.length > 0 ? `<p class="cert-members">${data.members.slice(0, 3).join(', ')}${data.members.length > 3 ? ` +${data.members.length - 3} más` : ''}</p>` : ''}
                </div>
            </div>`;
        }).join('');

        const habStats = {};
        HABILIDADES_LIST.forEach(h => { habStats[h] = { total: 0, members: [] }; });
        personal.forEach(p => {
            (p.habilidades || []).forEach(h => {
                if (!habStats[h]) habStats[h] = { total: 0, members: [] };
                habStats[h].total++;
                habStats[h].members.push(`${p.nombre} ${p.apellido}`);
            });
        });

        const habsHTML = Object.entries(habStats).map(([hab, data]) => {
            return `<div class="cert-card hab">
                <div class="cert-icon hab"><i class="fas fa-star"></i></div>
                <div class="cert-info">
                    <h4>${hab}</h4>
                    <span>${data.total} miembro${data.total !== 1 ? 's' : ''}</span>
                </div>
            </div>`;
        }).join('');

        container.innerHTML = `
            <div class="cert-grid">
                <div class="cert-section">
                    <div class="cert-section-header">
                        <h3><i class="fas fa-certificate"></i> Certificaciones</h3>
                        <div class="list-input-row">
                            <input type="text" id="newCertInput" placeholder="Nueva certificación...">
                            <button class="btn-primary btn-sm" onclick="teamManager.addCertificacion()"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>
                    <div class="cert-list">${certsHTML || '<p style="color:#94a3b8;text-align:center;padding:20px">Sin certificaciones definidas</p>'}</div>
                </div>
                <div class="cert-section">
                    <div class="cert-section-header">
                        <h3><i class="fas fa-star"></i> Habilidades</h3>
                    </div>
                    <div class="cert-list">${habsHTML || '<p style="color:#94a3b8;text-align:center;padding:20px">Sin datos</p>'}</div>
                </div>
            </div>`;
    }

    async addCertificacion() {
        const input = document.getElementById('newCertInput');
        const val = input?.value.trim();
        if (!val) return;
        const certs = app.data.listas?.certificaciones || [];
        if (certs.includes(val)) { app.showToast('La certificación ya existe', 'warning'); return; }
        certs.push(val);
        app.data.listas.certificaciones = certs;
        await db.put('listas', { key: 'certificaciones', value: certs });
        input.value = '';
        this.render();
        app.showToast('Certificación agregada', 'success');
    }

    // =================== ASIGNACIÓN RÁPIDA ===================
    showAssignModal(tareaId) {
        const tarea = app.data.tareas?.find(t => t.id === tareaId);
        if (!tarea) return;

        const personal = (app.data.personal || []).filter(p => p.estado === 'Activo');
        const matchByCargo = personal.filter(p => {
            const tareaCat = (tarea.categoria || '').toLowerCase();
            const pCargo = (p.cargo || '').toLowerCase();
            const pArea = (p.area || '').toLowerCase();
            return tareaCat.includes(pCargo) || tareaCat.includes(pArea) || pArea.includes(tareaCat);
        });

        const html = `<div>
            <p style="margin-bottom:12px;color:#64748b">Tarea: <strong>${app.escapeHtml(tarea.actividad)}</strong> (${tarea.categoria})</p>
            ${matchByCargo.length > 0 ? `
                <div class="form-group"><label><i class="fas fa-magic" style="color:#10b981"></i> Sugeridos por categoría</label>
                    <div style="display:grid;gap:6px">${matchByCargo.map(p => `
                        <div class="assign-card" onclick="teamManager.assignToTask('${tareaId}','${p.id}')">
                            <div class="team-avatar-sm" style="background:${CARGO_COLORS[p.cargo] || '#6366f1'}20;color:${CARGO_COLORS[p.cargo] || '#6366f1'}">${(p.nombre[0] || '').toUpperCase()}${(p.apellido[0] || '').toUpperCase()}</div>
                            <div><strong>${app.escapeHtml(p.nombre)} ${app.escapeHtml(p.apellido)}</strong><br><small style="color:#64748b">${p.cargo} · ${p.edificioAsignado || 'Sin asignar'}</small></div>
                        </div>
                    `).join('')}</div>
                </div>` : ''}
            <div class="form-group"><label>Todos los miembros activos</label>
                <select id="assignPersonalId"><option value="">Seleccionar...</option>
                ${personal.map(p => `<option value="${p.id}">${p.nombre} ${p.apellido} - ${p.cargo}</option>`).join('')}
                </select>
            </div>
        </div>`;

        app.showModal('Asignar Personal a Tarea', html, () => {
            const perId = app.gv('assignPersonalId');
            if (perId) this.assignToTask(tareaId, perId);
        });
    }

    async assignToTask(tareaId, personalId) {
        const tarea = app.data.tareas?.find(t => t.id === tareaId);
        const pers = app.data.personal?.find(p => p.id === personalId);
        if (!tarea || !pers) return;

        tarea.proveedor = `${pers.nombre} ${pers.apellido}`;
        tarea.updatedAt = new Date().toISOString();
        await db.put('tareas', tarea);

        app.closeModal();
        app.renderTareas();
        app.showToast(`${pers.nombre} ${pers.apellido} asignado a la tarea`, 'success');
    }
}

const teamManager = new TeamManager();
