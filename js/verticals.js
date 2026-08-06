const VERTICALS = {
    facility: {
        id: 'facility',
        name: 'Facility',
        subtitle: 'Management',
        icon: 'fas fa-building',
        theme: {
            '--primary': '#1e40af',
            '--primary-light': '#3b82f6',
            '--primary-dark': '#1e3a8a',
        },
        nav: [
            { section: 'PRINCIPAL', items: [
                { id: 'dashboard', icon: 'fas fa-chart-pie', label: 'Dashboard' },
                { id: 'tareas', icon: 'fas fa-tasks', label: 'Tareas', badge: 'navTareasBadge' },
                { id: 'cronograma', icon: 'fas fa-calendar-alt', label: 'Cronograma' },
                { id: 'gantt', icon: 'fas fa-project-diagram', label: 'Carta Gantt' },
            ]},
            { section: 'OPERACIONES', items: [
                { id: 'visitas', icon: 'fas fa-clipboard-check', label: 'Visitas', badge: 'navVisitasBadge' },
                { id: 'incidencias', icon: 'fas fa-exclamation-triangle', label: 'Incidencias', badge: 'navIncidenciasBadge', danger: true },
                { id: 'informes', icon: 'fas fa-file-alt', label: 'Informes Diarios' },
            ]},
            { section: 'GESTIÓN', items: [
                { id: 'equipo', icon: 'fas fa-users-cog', label: 'Equipo' },
                { id: 'proveedores', icon: 'fas fa-users', label: 'Proveedores' },
                { id: 'fotos', icon: 'fas fa-camera', label: 'Fotografías' },
            ]},
            { section: 'HERRAMIENTAS', items: [
                { id: 'emails', icon: 'fas fa-envelope', label: 'Correos' },
                { id: 'cotizaciones', icon: 'fas fa-file-invoice-dollar', label: 'Cotizaciones' },
                { id: 'reportes', icon: 'fas fa-chart-bar', label: 'Reportes' },
            ]},
            { section: 'SISTEMA', items: [
                { id: 'config', icon: 'fas fa-cog', label: 'Configuración' },
            ]},
        ],
        kpis: [
            { id: 'kpiEdificios', icon: 'fas fa-building', color: 'kpi-blue', label: 'CIRION' },
            { id: 'kpiCompletadas', icon: 'fas fa-check-circle', color: 'kpi-green', label: 'Completadas' },
            { id: 'kpiPendientes', icon: 'fas fa-clock', color: 'kpi-yellow', label: 'Pendientes' },
            { id: 'kpiIncidencias', icon: 'fas fa-exclamation-circle', color: 'kpi-red', label: 'Incidencias Abiertas' },
            { id: 'kpiVisitasPend', icon: 'fas fa-calendar-check', color: 'kpi-purple', label: 'Visitas Pendientes' },
            { id: 'kpiHoy', icon: 'fas fa-calendar-day', color: 'kpi-orange', label: 'Actividad Hoy' },
            { id: 'kpiVencidas', icon: 'fas fa-exclamation-triangle', color: 'kpi-darkred', label: 'Vencidas' },
            { id: 'kpiEnProgreso', icon: 'fas fa-spinner', color: 'kpi-teal', label: 'En Progreso' },
        ],
        roleDefault: 'Facility Manager',
        filterLabel: 'Todos los CIRION',
        pageSubtitle: 'Panel de control general',
    },

    construccion: {
        id: 'construccion',
        name: 'Construcción',
        subtitle: 'Projects',
        icon: 'fas fa-hard-hat',
        theme: {
            '--primary': '#b45309',
            '--primary-light': '#d97706',
            '--primary-dark': '#92400e',
        },
        nav: [
            { section: 'PRINCIPAL', items: [
                { id: 'dashboard', icon: 'fas fa-chart-pie', label: 'Dashboard' },
                { id: 'tareas', icon: 'fas fa-tasks', label: 'Tareas', badge: 'navTareasBadge' },
                { id: 'cronograma', icon: 'fas fa-calendar-alt', label: 'Cronograma' },
                { id: 'gantt', icon: 'fas fa-project-diagram', label: 'Carta Gantt' },
            ]},
            { section: 'OPERACIONES', items: [
                { id: 'visitas', icon: 'fas fa-clipboard-check', label: 'Inspecciones', badge: 'navVisitasBadge' },
                { id: 'incidencias', icon: 'fas fa-exclamation-triangle', label: 'No Conformidades', badge: 'navIncidenciasBadge', danger: true },
                { id: 'informes', icon: 'fas fa-file-alt', label: 'Informes de Obra' },
            ]},
            { section: 'GESTIÓN', items: [
                { id: 'equipo', icon: 'fas fa-users-cog', label: 'Brigada' },
                { id: 'proveedores', icon: 'fas fa-truck', label: 'Proveedores' },
                { id: 'fotos', icon: 'fas fa-camera', label: 'Fotografías' },
            ]},
            { section: 'HERRAMIENTAS', items: [
                { id: 'emails', icon: 'fas fa-envelope', label: 'Correos' },
                { id: 'cotizaciones', icon: 'fas fa-file-invoice-dollar', label: 'Presupuestos' },
                { id: 'reportes', icon: 'fas fa-chart-bar', label: 'Reportes' },
            ]},
            { section: 'SISTEMA', items: [
                { id: 'config', icon: 'fas fa-cog', label: 'Configuración' },
            ]},
        ],
        kpis: [
            { id: 'kpiEdificios', icon: 'fas fa-hard-hat', color: 'kpi-blue', label: 'Obras' },
            { id: 'kpiCompletadas', icon: 'fas fa-check-circle', color: 'kpi-green', label: 'Completadas' },
            { id: 'kpiPendientes', icon: 'fas fa-clock', color: 'kpi-yellow', label: 'Pendientes' },
            { id: 'kpiIncidencias', icon: 'fas fa-exclamation-circle', color: 'kpi-red', label: 'No Conformidades' },
            { id: 'kpiVisitasPend', icon: 'fas fa-calendar-check', color: 'kpi-purple', label: 'Inspecciones Pend.' },
            { id: 'kpiHoy', icon: 'fas fa-calendar-day', color: 'kpi-orange', label: 'Actividad Hoy' },
            { id: 'kpiVencidas', icon: 'fas fa-exclamation-triangle', color: 'kpi-darkred', label: 'Atrasadas' },
            { id: 'kpiEnProgreso', icon: 'fas fa-spinner', color: 'kpi-teal', label: 'En Progreso' },
        ],
        roleDefault: 'Jefe de Obra',
        filterLabel: 'Todas las Obras',
        pageSubtitle: 'Gestión de proyectos de construcción',
    },

    marketing: {
        id: 'marketing',
        name: 'Marketing',
        subtitle: 'Hub',
        icon: 'fas fa-bullhorn',
        theme: {
            '--primary': '#7c3aed',
            '--primary-light': '#8b5cf6',
            '--primary-dark': '#6d28d9',
        },
        nav: [
            { section: 'PRINCIPAL', items: [
                { id: 'dashboard', icon: 'fas fa-chart-pie', label: 'Dashboard' },
                { id: 'tareas', icon: 'fas fa-tasks', label: 'Tareas', badge: 'navTareasBadge' },
                { id: 'cronograma', icon: 'fas fa-calendar-alt', label: 'Calendario' },
                { id: 'gantt', icon: 'fas fa-project-diagram', label: 'Cronograma de Campañas' },
            ]},
            { section: 'CAMPAÑAS', items: [
                { id: 'visitas', icon: 'fas fa-bullseye', label: 'Campañas', badge: 'navVisitasBadge' },
                { id: 'incidencias', icon: 'fas fa-exclamation-triangle', label: 'Pendientes de Aprobación', badge: 'navIncidenciasBadge', danger: true },
                { id: 'informes', icon: 'fas fa-file-alt', label: 'Informes de Resultados' },
            ]},
            { section: 'EQUIPO', items: [
                { id: 'equipo', icon: 'fas fa-users-cog', label: 'Equipo Creativo' },
                { id: 'proveedores', icon: 'fas fa-handshake', label: 'Agencias / Freelancers' },
                { id: 'fotos', icon: 'fas fa-camera', label: 'Activos Creativos' },
            ]},
            { section: 'HERRAMIENTAS', items: [
                { id: 'emails', icon: 'fas fa-envelope', label: 'Correos' },
                { id: 'cotizaciones', icon: 'fas fa-file-invoice-dollar', label: 'Presupuestos' },
                { id: 'reportes', icon: 'fas fa-chart-bar', label: 'Reportes & Analytics' },
            ]},
            { section: 'SISTEMA', items: [
                { id: 'config', icon: 'fas fa-cog', label: 'Configuración' },
            ]},
        ],
        kpis: [
            { id: 'kpiEdificios', icon: 'fas fa-bullhorn', color: 'kpi-blue', label: 'Campañas Activas' },
            { id: 'kpiCompletadas', icon: 'fas fa-check-circle', color: 'kpi-green', label: 'Completadas' },
            { id: 'kpiPendientes', icon: 'fas fa-clock', color: 'kpi-yellow', label: 'Pendientes' },
            { id: 'kpiIncidencias', icon: 'fas fa-exclamation-circle', color: 'kpi-red', label: 'Por Aprobar' },
            { id: 'kpiVisitasPend', icon: 'fas fa-calendar-check', color: 'kpi-purple', label: 'Próximas Entregas' },
            { id: 'kpiHoy', icon: 'fas fa-calendar-day', color: 'kpi-orange', label: 'Actividad Hoy' },
            { id: 'kpiVencidas', icon: 'fas fa-exclamation-triangle', color: 'kpi-darkred', label: 'Atrasadas' },
            { id: 'kpiEnProgreso', icon: 'fas fa-spinner', color: 'kpi-teal', label: 'En Progreso' },
        ],
        roleDefault: 'Marketing Manager',
        filterLabel: 'Todas las Campañas',
        pageSubtitle: 'Gestión de campañas y contenido',
    },
};

let currentVertical = localStorage.getItem('vertical') || 'facility';

function getVertical() {
    return VERTICALS[currentVertical] || VERTICALS.facility;
}

function setVertical(id) {
    if (VERTICALS[id]) {
        currentVertical = id;
        localStorage.setItem('vertical', id);
        applyVerticalTheme(VERTICALS[id]);
        renderSidebar(VERTICALS[id]);
    }
}

function applyVerticalTheme(v) {
    const root = document.documentElement;
    for (const [prop, val] of Object.entries(v.theme)) {
        root.style.setProperty(prop, val);
    }
}

function renderSidebar(v) {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    let html = '';
    for (const group of v.nav) {
        html += `<div class="nav-section">${group.section}</div>`;
        for (const item of group.items) {
            const active = app && app.currentSection === item.id ? ' active' : '';
            const badgeHtml = item.badge
                ? `<span class="nav-badge${item.danger ? ' danger' : ''}" id="${item.badge}">0</span>`
                : '';
            html += `<a href="#" class="nav-item${active}" data-section="${item.id}">
                <i class="${item.icon}"></i><span>${item.label}</span>${badgeHtml}</a>`;
        }
    }
    nav.innerHTML = html;

    const logoName = document.querySelector('.logo-name');
    const logoSubtitle = document.querySelector('.logo-subtitle');
    const logoIcon = document.querySelector('.logo-icon i');
    if (logoName) logoName.textContent = window._companyName || v.name;
    if (logoSubtitle) logoSubtitle.textContent = v.subtitle;
    if (logoIcon) logoIcon.className = v.icon;

    const userRole = document.getElementById('userRole');
    if (userRole) userRole.textContent = v.roleDefault;

    const filterSelect = document.getElementById('filterEdificioGlobal');
    if (filterSelect) {
        const firstOpt = filterSelect.querySelector('option');
        if (firstOpt) firstOpt.textContent = v.filterLabel;
    }

    const subtitle = document.getElementById('pageSubtitle');
    if (subtitle && app && app.currentSection === 'dashboard') {
        subtitle.textContent = (window._companyName ? window._companyName + ' — ' : '') + v.pageSubtitle;
    }

    nav.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (app) app.navigateTo(section);
        });
    });

    if (app) app.updateSidebarBadges();
}

function renderKpis(v) {
    const grid = document.querySelector('.kpi-grid');
    if (!grid) return;

    let html = '';
    for (const kpi of v.kpis) {
        html += `<div class="kpi-card ${kpi.color}">
            <div class="kpi-icon"><i class="${kpi.icon}"></i></div>
            <div class="kpi-info"><h3 id="${kpi.id}">0</h3><p>${kpi.label}</p></div>
        </div>`;
    }
    grid.innerHTML = html;
}
