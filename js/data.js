const INITIAL_DATA = {
    edificios: [],
    categorias: [],
    ubicaciones: [],
    tiposVisita: ['Inspección', 'Mantenimiento Preventivo', 'Mantenimiento Correctivo', 'Supervisión', 'Auditoría'],
    estados: ['Pendiente', 'En Progreso', 'Completado', 'Atrasada', 'Cancelado', 'Reprogramado'],
    prioridades: ['Alta', 'Media', 'Baja'],
    meses: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    cargos: [
        'Técnico Eléctrico',
        'Técnico HVAC',
        'Plomero',
        'Jardinero',
        'Auxiliar de Aseo',
        'Supervisor de Mantención',
        'Técnico de Infraestructura',
        'Guardia de Seguridad',
        'Administrador de Facility',
        'Técnico de Extintores'
    ],
    areasTrabajo: [
        'Eléctrico',
        'Gasfitería',
        'Climatización',
        'Jardinería',
        'Aseo',
        'Infraestructura',
        'Seguridad',
        'Prevención de Riesgos'
    ],
    certificaciones: [
        'Certificación Eléctrica',
        'Trabajo en Alturas',
        'Espacios Confinados',
        'Manipulador de Alimentos',
        'Manejo de Extintores',
        'Primeros Auxilios',
        'Certificación HVAC',
        'Licencia de Conducción',
        'Certificación IOSH',
        'Curse ABC'
    ]
};

const HABILIDADES_LIST = [
    'Soldadura',
    'Carpintería',
    'Pintura',
    'Electricidad general',
    'Plomería general',
    'Mecánica',
    'Soldadura MIG/TIG',
    'Electrónica',
    'Automatización',
    'Lectura de planos',
    'Instalación de vidrios',
    'Mantenimiento de jardines',
    'Uso de andamios',
    'Operación de grúas',
    'Idioma inglés',
    'Idioma portugués',
    'Uso de herramientas especiales',
    'Instalación de pisos',
    'Techumbres',
    'Impermeabilización'
];

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

const CARGO_COLORS = {
    'Técnico Eléctrico': '#f59e0b',
    'Técnico HVAC': '#06b6d4',
    'Plomero': '#3b82f6',
    'Jardinero': '#22c55e',
    'Auxiliar de Aseo': '#8b5cf6',
    'Supervisor de Mantención': '#ef4444',
    'Técnico de Infraestructura': '#6366f1',
    'Guardia de Seguridad': '#1e40af',
    'Administrador de Facility': '#dc2626',
    'Técnico de Extintores': '#f97316'
};

const EDIFICIO_COLORS = {
    'Marriott': '#1e40af',
    'San 1': '#059669',
    'San 2': '#d97706',
    'Valparaíso': '#dc2626'
};

const EDIFICIO_PALETTE = [
    '#1e40af', '#059669', '#d97706', '#dc2626',
    '#7c3aed', '#0891b2', '#c2410c', '#4f46e5',
    '#16a34a', '#ca8a04', '#e11d48', '#9333ea'
];

function getEdificioColor(edificio, edificios) {
    if (EDIFICIO_COLORS[edificio]) return EDIFICIO_COLORS[edificio];
    const idx = (edificios || []).indexOf(edificio);
    if (idx !== -1) return EDIFICIO_PALETTE[idx % EDIFICIO_PALETTE.length];
    return '#6b7280';
}

const CHECKLIST_CATEGORIES = {
    'Plomería': {
        color: '#3b82f6',
        icon: 'fa-tint',
        items: ['Grifos / Llaves de paso', 'Inodoros / Vidrios sanitarios', 'Tuberías y conexiones', 'Presión de agua', 'Drenajes y desagües', 'Calentadores de agua', 'Fugas detectadas', 'Cisternas / Estanques']
    },
    'Baños': {
        color: '#8b5cf6',
        icon: 'fa-bathroom',
        items: ['Limpieza general', 'Dispensadores de jabón/toallas', 'Secadores de mano', 'Estado de cerámicas', 'Espejos y accesorios', 'Olores y ventilación', 'Papel higiénico / Insumos', 'Puertas y cerraduras']
    },
    'Luminarias': {
        color: '#f59e0b',
        icon: 'fa-lightbulb',
        items: ['Luces encendidas / funcionales', 'Emergencia y señalización', 'Sensores de presencia', 'Estado de lámparas', 'Interruptores', 'Cableado visible', 'Cuadros eléctricos', 'Iluminación exterior']
    },
    'Electricidad': {
        color: '#eab308',
        icon: 'fa-bolt',
        items: ['Tableros eléctricos', 'Interruptores termomagnéticos', 'Contactos / Enchufes', 'Cableado general', 'Puesta a tierra', 'Registros eléctricos', 'Carga eléctrica por circuito', 'Medidor de consumo']
    },
    'Jardinería': {
        color: '#22c55e',
        icon: 'fa-leaf',
        items: ['Césped cortado', 'Plantas y arbustos', 'Sistema de riego', 'Maleza controlada', 'Árboles (poda)', 'Jardineras y maceteros', 'Drenaje de áreas verdes', 'Fertilización']
    },
    'Vidrios': {
        color: '#14b8a6',
        icon: 'fa-window-maximize',
        items: ['Ventanas limpias', 'Puertas de vidrio', 'Cristales dañados / agrietados', 'Sellos y burletes', 'Persianas / Cortinas', 'Vidrios polarizados', 'Marcos y perchas', 'Limpieza programada']
    },
    'Áreas Comunes': {
        color: '#6366f1',
        icon: 'fa-building',
        items: ['Lobby / Recepción', 'Pasillos y escaleras', 'Ascensores', 'Salas de estar', 'Estacionamiento', 'Bodegas', 'Techos y paredes', 'Señalética']
    },
    'Limpieza': {
        color: '#06b6d4',
        icon: 'fa-broom',
        items: ['Pisos / Baldosas', 'Alfombras', 'Contenedores de basura', 'Recepción y mesones', 'Cocinas / Comedores', 'Zonas de descanso', 'Laboratorios', 'Áreas exteriores']
    },
    'Cocina': {
        color: '#ef4444',
        icon: 'fa-utensils',
        items: ['Estufas y hornos', 'Campana extractora', 'Refrigeradores', 'Lavavajillas', 'Mesones de trabajo', 'Desperdicios y limpieza', 'Gas y conexiones', 'Almacenamiento']
    },
    'Climatización': {
        color: '#0891b2',
        icon: 'fa-snowflake',
        items: ['Aire acondicionado funcional', 'Filtros limpios', 'Termostatos', 'Ductos y rejillas', 'Temperatura adecuada', 'Ruidos anormales', 'Mantenimiento preventivo', 'Control de humedad']
    },
    'Extintores': {
        color: '#f97316',
        icon: 'fa-fire-extinguisher',
        items: ['Extintores visibles y accesibles', 'Fecha de recarga vigente', 'Pin de seguridad intacto', 'Manguera en buen estado', 'Señalización correcta', 'Presión en rango', 'Capacitación del personal', 'Registro de mantenimiento']
    },
    'Infraestructura': {
        color: '#dc2626',
        icon: 'fa-hammer',
        items: ['Paredes (grietas / pintura)', 'Techos (filtraciones / manchas)', 'Pisos (desgaste / daños)', 'Puertas y marcos', 'Ventanas y marcos', 'Barandillas y escaleras', 'Estructura general', 'Accesos y rampas']
    },
    'Seguridad': {
        color: '#be185d',
        icon: 'fa-shield-alt',
        items: [' Cámaras de vigilancia', 'Control de acceso', 'Alarmas', 'Emergencias / Rutas de evacuación', 'Luces de emergencia', 'Botones de pánico', 'Vigilancia / Guardia', 'Protocolos activos']
    }
};
