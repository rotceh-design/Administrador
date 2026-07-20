const INITIAL_DATA = {
    edificios: [],
    categorias: [],
    ubicaciones: [],
    tiposVisita: [],
    estados: ['Pendiente', 'En Progreso', 'Completado', 'Cancelado', 'Reprogramado'],
    prioridades: ['Alta', 'Media', 'Baja'],
    meses: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
};

const CATEGORY_COLORS = {
    'Electricidad': '#f59e0b',
    'Gasfitería': '#3b82f6',
    'Mantenciones': '#10b981',
    'Infraestructura': '#6366f1',
    'Climatización': '#06b6d4',
    'Reparación': '#ef4444',
    'Terminaciones': '#ec4899',
    'Visitas': '#8b5cf6',
    'Extintores': '#f97316',
    'Vidrios': '#14b8a6',
    'Jardinería': '#22c55e'
};

const CATEGORY_ICONS = {
    'Electricidad': 'fa-bolt',
    'Gasfitería': 'fa-tint',
    'Mantenciones': 'fa-tools',
    'Infraestructura': 'fa-building',
    'Climatización': 'fa-snowflake',
    'Reparación': 'fa-wrench',
    'Terminaciones': 'fa-paint-roller',
    'Visitas': 'fa-clipboard-check',
    'Extintores': 'fa-fire-extinguisher',
    'Vidrios': 'fa-window-maximize',
    'Jardinería': 'fa-leaf'
};

const EDIFICIO_COLORS = {
    'Marriott': '#1e40af',
    'San 1': '#059669',
    'San 2': '#d97706',
    'Valparaíso': '#dc2626'
};
