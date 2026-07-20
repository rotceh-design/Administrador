const INITIAL_DATA = {
    config: {
        nombreEmpresa: 'Facility Management',
        administrador: '',
        emailNotif: '',
        telefono: '',
        theme: 'light'
    },

    edificios: ['Marriott', 'San 1', 'San 2', 'Valparaíso'],

    categorias: [
        'Electricidad', 'Gasfitería', 'Mantenciones', 'Infraestructura',
        'Climatización', 'Reparación', 'Terminaciones', 'Visitas',
        'Extintores', 'Vidrios', 'Jardinería'
    ],

    ubicaciones: [
        'Oficina', 'Pasillo', 'Baño', 'Área Común', 'Sala', 'Cocina',
        'Bodega', 'Exterior', 'Estacionamiento', 'Recepción', 'Terraza'
    ],

    tiposVisita: ['Inspección', 'Mantención Preventiva', 'Mantención Correctiva', 'Revisión', 'Emergencia', 'Seguimiento'],

    estados: ['Pendiente', 'En Progreso', 'Completado', 'Cancelado', 'Reprogramado'],
    prioridades: ['Alta', 'Media', 'Baja'],

    proveedores: [
        { id: 'PRV-001', servicio: 'Electricidad', empresa: 'ElectroServ', contacto: 'Ing. Ramírez', telefono: '555-1001', email: 'electro@email.com', estado: 'Activo', calificacion: 5 },
        { id: 'PRV-002', servicio: 'Gasfitería', empresa: 'Plomería Express', contacto: 'Juan Agua', telefono: '555-1002', email: 'plomeria@email.com', estado: 'Activo', calificacion: 4 },
        { id: 'PRV-003', servicio: 'Climatización', empresa: 'ClimaTech', contacto: 'Ing. Frío', telefono: '555-1003', email: 'clima@email.com', estado: 'Activo', calificacion: 5 },
        { id: 'PRV-004', servicio: 'Mantenciones', empresa: 'MantTotal', contacto: 'Carlos Mant', telefono: '555-1004', email: 'manttotal@email.com', estado: 'Activo', calificacion: 4 },
        { id: 'PRV-005', servicio: 'Extintores', empresa: 'FireSafe', contacto: 'Cap. Vega', telefono: '555-1005', email: 'firesafe@email.com', estado: 'Activo', calificacion: 5 },
        { id: 'PRV-006', servicio: 'Vidrios', empresa: 'CristalPlus', contacto: 'Ana Vidrio', telefono: '555-1006', email: 'cristal@email.com', estado: 'Activo', calificacion: 4 },
        { id: 'PRV-007', servicio: 'Jardinería', empresa: 'VerdeVida', contacto: 'María Flor', telefono: '555-1007', email: 'verdevida@email.com', estado: 'Activo', calificacion: 4 },
        { id: 'PRV-008', servicio: 'Infraestructura', empresa: 'ConstruMax', contacto: 'Ing. Torres', telefono: '555-1008', email: 'construmax@email.com', estado: 'Activo', calificacion: 5 },
        { id: 'PRV-009', servicio: 'Terminaciones', empresa: 'AcabadosPro', contacto: 'Pedro Acab', telefono: '555-1009', email: 'acabados@email.com', estado: 'Activo', calificacion: 4 },
        { id: 'PRV-010', servicio: 'Reparación', empresa: 'FixIt', contacto: 'Luis Rep', telefono: '555-1010', email: 'fixit@email.com', estado: 'Activo', calificacion: 5 }
    ],

    tareas: [
        { id: 'TAR-001', actividad: 'Revisión iluminación lobby', categoria: 'Electricidad', edificio: 'Marriott', ubicacion: 'Recepción', proveedor: 'ElectroServ', fecha: '2026-07-21', estado: 'Pendiente', observaciones: '' },
        { id: 'TAR-002', actividad: 'Mantención A/C central', categoria: 'Climatización', edificio: 'San 1', ubicacion: 'Área Común', proveedor: 'ClimaTech', fecha: '2026-07-21', estado: 'Pendiente', observaciones: 'Cambio de filtros' },
        { id: 'TAR-003', actividad: 'Revisión extintores piso 2', categoria: 'Extintores', edificio: 'San 2', ubicacion: 'Pasillo', proveedor: 'FireSafe', fecha: '2026-07-22', estado: 'Pendiente', observaciones: '' },
        { id: 'TAR-004', actividad: 'Poda jardín principal', categoria: 'Jardinería', edificio: 'Valparaíso', ubicacion: 'Exterior', proveedor: 'VerdeVida', fecha: '2026-07-22', estado: 'Pendiente', observaciones: '' },
        { id: 'TAR-005', actividad: 'Limpieza vidrios fachada', categoria: 'Vidrios', edificio: 'Marriott', ubicacion: 'Exterior', proveedor: 'CristalPlus', fecha: '2026-07-23', estado: 'Pendiente', observaciones: '' },
        { id: 'TAR-006', actividad: 'Reparación grifería baños', categoria: 'Gasfitería', edificio: 'San 1', ubicacion: 'Baño', proveedor: 'Plomería Express', fecha: '2026-07-23', estado: 'Pendiente', observaciones: '' },
        { id: 'TAR-007', actividad: 'Inspección infraestructura', categoria: 'Infraestructura', edificio: 'San 2', ubicacion: 'Área Común', proveedor: 'ConstruMax', fecha: '2026-07-24', estado: 'Pendiente', observaciones: '' },
        { id: 'TAR-008', actividad: 'Pintura pasillo piso 3', categoria: 'Terminaciones', edificio: 'Valparaíso', ubicacion: 'Pasillo', proveedor: 'AcabadosPro', fecha: '2026-07-24', estado: 'Pendiente', observaciones: '' }
    ],

    visitas: [
        { id: 'VIS-001', fecha: '2026-07-20', edificio: 'Marriott', tipo: 'Inspección', motivo: 'Revisión mensual de instalaciones', proveedor: 'MantTotal', estado: 'Completado', observaciones: 'Todo OK', responsable: '' },
        { id: 'VIS-002', fecha: '2026-07-20', edificio: 'San 1', tipo: 'Mantención Preventiva', motivo: 'Mantención trimestral A/C', proveedor: 'ClimaTech', estado: 'Completado', observaciones: 'Filtros cambiados', responsable: '' },
        { id: 'VIS-003', fecha: '2026-07-21', edificio: 'San 2', tipo: 'Revisión', motivo: 'Revisión extintores', proveedor: 'FireSafe', estado: 'Pendiente', observaciones: '', responsable: '' },
        { id: 'VIS-004', fecha: '2026-07-22', edificio: 'Valparaíso', tipo: 'Mantención Correctiva', motivo: 'Reparación de fuga', proveedor: 'Plomería Express', estado: 'Pendiente', observaciones: '', responsable: '' }
    ],

    incidencias: [
        { id: 'INC-001', fecha: '2026-07-19', descripcion: 'Fuga de agua en baño piso 2', edificio: 'San 1', categoria: 'Gasfitería', prioridad: 'Alta', proveedor: 'Plomería Express', estado: 'Completado', observaciones: 'Reparado', fotos: [] },
        { id: 'INC-002', fecha: '2026-07-20', descripcion: 'A/C no enfría sala conferencias', edificio: 'Marriott', categoria: 'Climatización', prioridad: 'Media', proveedor: 'ClimaTech', estado: 'En Progreso', observaciones: 'En revisión', fotos: [] },
        { id: 'INC-003', fecha: '2026-07-20', descripcion: 'Luz parpadea pasillo piso 3', edificio: 'Valparaíso', categoria: 'Electricidad', prioridad: 'Baja', proveedor: 'ElectroServ', estado: 'Pendiente', observaciones: '', fotos: [] }
    ],

    informesDiarios: [],

    fotos: [],

    cotizaciones: [],

    notificaciones: [
        { id: 1, tipo: 'tarea', mensaje: 'Visita programada hoy - Marriott', fecha: '2026-07-21', leida: false },
        { id: 2, tipo: 'incidencia', mensaje: 'Incidencia activa: A/C no enfría - Marriott', fecha: '2026-07-20', leida: false }
    ]
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
