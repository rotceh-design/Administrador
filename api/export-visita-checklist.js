const ExcelJS = require('exceljs');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { visita, empresa, edificios } = req.body;

        if (!visita || !visita.checklist || !visita.checklist.length) {
            return res.status(400).json({ error: 'No checklist data' });
        }

        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const d = new Date(visita.fecha + 'T00:00:00');
        const edColor = getEdificioColorFromList(visita.edificio, edificios || []);
        const edArgb = edColor.replace('#', 'FF');

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Facility Management';
        workbook.created = new Date();

        // ============ SHEET 1: VISITA RESUMEN ============
        const resumenSheet = workbook.addWorksheet('Resumen', {
            properties: { tabColor: { argb: edArgb } },
            pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1 }
        });

        resumenSheet.mergeCells('A1:F1');
        const titleCell = resumenSheet.getCell('A1');
        titleCell.value = 'CHECKLIST DE INSPECCIÓN';
        titleCell.font = { name: 'Arial', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: edArgb } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        resumenSheet.getRow(1).height = 45;

        resumenSheet.mergeCells('A2:F2');
        const subCell = resumenSheet.getCell('A2');
        subCell.value = empresa || 'Facility Management';
        subCell.font = { name: 'Arial', size: 11, color: { argb: 'FF64748B' } };
        subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        subCell.alignment = { vertical: 'middle', horizontal: 'center' };
        resumenSheet.getRow(2).height = 24;
        resumenSheet.getRow(3).height = 8;

        const infoData = [
            ['CIRION:', visita.edificio],
            ['Fecha:', `${visita.fecha} (${dayNames[d.getDay()]})`],
            ['Tipo:', visita.tipo],
            ['Motivo:', visita.motivo],
            ['Proveedor:', visita.proveedor || 'Sin asignar'],
            ['Estado:', visita.estado],
            ['Observaciones:', visita.observaciones || 'Ninguna']
        ];
        infoData.forEach((row) => {
            const r = resumenSheet.addRow(row);
            r.height = 22;
            r.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
            r.getCell(1).alignment = { vertical: 'middle', horizontal: 'right' };
            r.getCell(2).font = { name: 'Arial', size: 10, color: { argb: 'FF1E293B' } };
            r.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
        });

        resumenSheet.getRow(11).height = 8;
        resumenSheet.mergeCells('A12:F12');
        const sumTitle = resumenSheet.getCell('A12');
        sumTitle.value = 'ÁREAS A INSPECCIONAR';
        sumTitle.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1E40AF' } };
        resumenSheet.getRow(12).height = 28;

        const catHeaders = ['#', 'Área / Categoría', 'Items'];
        const catHeaderRow = resumenSheet.addRow(catHeaders);
        catHeaderRow.height = 26;
        catHeaderRow.eachCell(cell => {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        let catIdx = 1;
        visita.checklist.forEach((cat) => {
            const catData = CHECKLIST_CATS[cat];
            if (!catData) return;
            const r = resumenSheet.addRow([catIdx, cat, `${catData.items.length} items`]);
            r.height = 24;
            r.eachCell(cell => {
                cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
                cell.alignment = { vertical: 'middle' };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
            });
            r.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
            catIdx++;
        });

        resumenSheet.getColumn(1).width = 5;
        resumenSheet.getColumn(2).width = 22;
        resumenSheet.getColumn(3).width = 12;

        // ============ SHEETS PER CATEGORY ============
        visita.checklist.forEach(cat => {
            const catData = CHECKLIST_CATS[cat];
            if (!catData) return;

            const catColor = (CHECKLIST_COLORS[cat] || edColor).replace('#', 'FF');
            const safeName = cat.substring(0, 31).replace(/[\\/*?:\[\]]/g, '');
            const ws = workbook.addWorksheet(safeName, {
                properties: { tabColor: { argb: catColor } },
                pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1 }
            });

            // Category header
            ws.mergeCells('A1:F1');
            const catHeader = ws.getCell('A1');
            catHeader.value = cat.toUpperCase();
            catHeader.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
            catHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catColor } };
            catHeader.alignment = { vertical: 'middle', horizontal: 'center' };
            ws.getRow(1).height = 42;

            // Info bar
            ws.mergeCells('A2:F2');
            const infoBar = ws.getCell('A2');
            infoBar.value = `${visita.edificio} · ${visita.fecha} · ${visita.tipo} · ${visita.proveedor || 'Sin proveedor'}`;
            infoBar.font = { name: 'Arial', size: 10, color: { argb: 'FF64748B' } };
            infoBar.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            infoBar.alignment = { vertical: 'middle', horizontal: 'center' };
            ws.getRow(2).height = 26;
            ws.getRow(3).height = 8;

            // Headers
            const headers = ['#', 'Item a Verificar', '✓', '✗', 'Observaciones', 'Firma'];
            const headerRow = ws.addRow(headers);
            headerRow.height = 30;
            headerRow.eachCell(cell => {
                cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catColor } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
            });

            // Items
            catData.items.forEach((item, rowIdx) => {
                const row = ws.addRow([rowIdx + 1, item, '☐', '☐', '', '']);
                const rowBg = rowIdx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
                row.height = 30;
                row.eachCell((cell, colNumber) => {
                    cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
                    cell.alignment = { vertical: 'middle', horizontal: colNumber <= 4 ? 'center' : 'left' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                    if (colNumber === 3 || colNumber === 4) {
                        cell.font = { name: 'Arial', size: 16, color: { argb: 'FF94A3B8' } };
                    }
                });
            });

            // Signature
            ws.addRow([]);
            ws.addRow(['', 'Revisado por:', '___________________', '', '', '']);
            ws.addRow(['', 'Fecha:', '___________________', '', '', '']);
            ws.addRow(['', 'Firma:', '___________________', '', '', '']);

            ws.getColumn(1).width = 5;
            ws.getColumn(2).width = 35;
            ws.getColumn(3).width = 6;
            ws.getColumn(4).width = 6;
            ws.getColumn(5).width = 28;
            ws.getColumn(6).width = 18;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Checklist_${visita.edificio}_${visita.fecha}.xlsx"`);
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error('Checklist export error:', error);
        res.status(500).json({ error: 'Error generating checklist' });
    }
}

function getEdificioColorFromList(edificio, edificios) {
    const EDIFICIO_COLORS = { 'Marriott': '#1e40af', 'San 1': '#059669', 'San 2': '#d97706', 'Valparaíso': '#dc2626' };
    const PALETTE = ['#1e40af', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#c2410c', '#4f46e5', '#16a34a', '#ca8a04', '#e11d48', '#9333ea'];
    if (EDIFICIO_COLORS[edificio]) return EDIFICIO_COLORS[edificio];
    const idx = edificios.indexOf(edificio);
    if (idx !== -1) return PALETTE[idx % PALETTE.length];
    return '#6b7280';
}

const CHECKLIST_CATS = {
    'Plomería': { items: ['Grifos / Llaves de paso', 'Inodoros / Vidrios sanitarios', 'Tuberías y conexiones', 'Presión de agua', 'Drenajes y desagües', 'Calentadores de agua', 'Fugas detectadas', 'Cisternas / Estanques'] },
    'Baños': { items: ['Limpieza general', 'Dispensadores de jabón/toallas', 'Secadores de mano', 'Estado de cerámicas', 'Espejos y accesorios', 'Olores y ventilación', 'Papel higiénico / Insumos', 'Puertas y cerraduras'] },
    'Luminarias': { items: ['Luces encendidas / funcionales', 'Emergencia y señalización', 'Sensores de presencia', 'Estado de lámparas', 'Interruptores', 'Cableado visible', 'Cuadros eléctricos', 'Iluminación exterior'] },
    'Jardinería': { items: ['Césped cortado', 'Plantas y arbustos', 'Sistema de riego', 'Maleza controlada', 'Árboles (poda)', 'Jardineras y maceteros', 'Drenaje de áreas verdes', 'Fertilización'] },
    'Vidrios': { items: ['Ventanas limpias', 'Puertas de vidrio', 'Cristales dañados / agrietados', 'Sellos y burletes', 'Persianas / Cortinas', 'Vidrios polarizados', 'Marcos y perchas', 'Limpieza programada'] },
    'Áreas Comunes': { items: ['Lobby / Recepción', 'Pasillos y escaleras', 'Ascensores', 'Salas de estar', 'Estacionamiento', 'Bodegas', 'Techos y paredes', 'Señalética'] },
    'Limpieza': { items: ['Pisos / Baldosas', 'Alfombras', 'Contenedores de basura', 'Recepción y mesones', 'Cocinas / Comedores', 'Zonas de descanso', 'Laboratorios', 'Áreas exteriores'] },
    'Cocina': { items: ['Estufas y hornos', 'Campana extractora', 'Refrigeradores', 'Lavavajillas', 'Mesones de trabajo', 'Desperdicios y limpieza', 'Gas y conexiones', 'Almacenamiento'] },
    'Climatización': { items: ['Aire acondicionado funcional', 'Filtros limpios', 'Termostatos', 'Ductos y rejillas', 'Temperatura adecuada', 'Ruidos anormales', 'Mantenimiento preventivo', 'Control de humedad'] },
    'Extintores': { items: ['Extintores visibles y accesibles', 'Fecha de recarga vigente', 'Pin de seguridad intacto', 'Manguera en buen estado', 'Señalización correcta', 'Presión en rango', 'Capacitación del personal', 'Registro de mantenimiento'] },
    'Infraestructura': { items: ['Paredes (grietas / pintura)', 'Techos (filtraciones / manchas)', 'Pisos (desgaste / daños)', 'Puertas y marcos', 'Ventanas y marcos', 'Barandillas y escaleras', 'Estructura general', 'Accesos y rampas'] },
    'Seguridad': { items: ['Cámaras de vigilancia', 'Control de acceso', 'Alarmas', 'Emergencias / Rutas de evacuación', 'Luces de emergencia', 'Botones de pánico', 'Vigilancia / Guardia', 'Protocolos activos'] }
};

const CHECKLIST_COLORS = {
    'Plomería': '#3b82f6',
    'Baños': '#8b5cf6',
    'Luminarias': '#f59e0b',
    'Jardinería': '#22c55e',
    'Vidrios': '#14b8a6',
    'Áreas Comunes': '#6366f1',
    'Limpieza': '#06b6d4',
    'Cocina': '#ef4444',
    'Climatización': '#0891b2',
    'Extintores': '#f97316',
    'Infraestructura': '#dc2626',
    'Seguridad': '#be185d'
};
