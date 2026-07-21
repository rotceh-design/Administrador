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

        // ============ SHEET 1: PORTADA RESUMEN ============
        const resumenSheet = workbook.addWorksheet('Portada', {
            properties: { tabColor: { argb: edArgb } },
            pageSetup: { orientation: 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.7, right: 0.7, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } }
        });

        // Columnas: A=label, B=dato, C=separador, D=label2, E=dato2
        resumenSheet.getColumn('A').width = 20;
        resumenSheet.getColumn('B').width = 32;
        resumenSheet.getColumn('C').width = 4;
        resumenSheet.getColumn('D').width = 20;
        resumenSheet.getColumn('E').width = 28;

        // ── HEADER BLOCK ──
        resumenSheet.getRow(1).height = 8;
        resumenSheet.mergeCells('A2:E2');
        const hdr2 = resumenSheet.getCell('A2');
        hdr2.value = empresa || 'Facility Management';
        hdr2.font = { name: 'Arial', size: 11, bold: true, color: { argb: edArgb } };
        hdr2.alignment = { vertical: 'middle', horizontal: 'left' };
        resumenSheet.getRow(2).height = 22;

        resumenSheet.mergeCells('A3:E3');
        const hdr3 = resumenSheet.getCell('A3');
        hdr3.value = 'CHECKLIST DE INSPECCIÓN — INFORME DE VISITA';
        hdr3.font = { name: 'Arial', size: 22, bold: true, color: { argb: 'FFFFFFFF' } };
        hdr3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: edArgb } };
        hdr3.alignment = { vertical: 'middle', horizontal: 'center' };
        resumenSheet.getRow(3).height = 52;

        resumenSheet.mergeCells('A4:E4');
        const hdr4 = resumenSheet.getCell('A4');
        hdr4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: edArgb } };
        resumenSheet.getRow(4).height = 5;

        resumenSheet.getRow(5).height = 12;

        // ── SECCIÓN: INFORMACIÓN GENERAL ──
        resumenSheet.mergeCells('A6:E6');
        const secInfo = resumenSheet.getCell('A6');
        secInfo.value = 'INFORMACIÓN GENERAL';
        secInfo.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        secInfo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
        secInfo.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        resumenSheet.getRow(6).height = 28;

        const infoRows = [
            ['CIRION / Edificio:', visita.edificio, '', 'Fecha de inspección:', `${visita.fecha} (${dayNames[d.getDay()]})`],
            ['Tipo de visita:', visita.tipo, '', 'Estado:', visita.estado],
            ['Motivo:', visita.motivo, '', 'Proveedor:', visita.proveedor || 'Sin asignar'],
            ['Observaciones:', visita.observaciones || 'Sin observaciones', '', '', ''],
        ];
        infoRows.forEach((vals, idx) => {
            const r = resumenSheet.addRow(vals);
            r.height = 26;
            const rowBg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF1F5F9';
            r.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
                cell.alignment = { vertical: 'middle' };
            });
            r.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
            r.getCell(1).alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
            r.getCell(2).font = { name: 'Arial', size: 10, color: { argb: 'FF1E293B' } };
            r.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
            r.getCell(4).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
            r.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
            r.getCell(5).font = { name: 'Arial', size: 10, color: { argb: 'FF1E293B' } };
            r.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
        });

        // Observaciones row spans B to E
        const lastInfoRow = resumenSheet.lastRow.number;
        resumenSheet.mergeCells(`B${lastInfoRow}:E${lastInfoRow}`);
        resumenSheet.getCell(`B${lastInfoRow}`).font = { name: 'Arial', size: 10, color: { argb: 'FF1E293B' } };
        resumenSheet.getCell(`B${lastInfoRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

        resumenSheet.getRow(resumenSheet.lastRow.number + 1).height = 10;

        // ── SECCIÓN: CATEGORÍAS A INSPECCIONAR ──
        const secCatRow = resumenSheet.lastRow.number + 1;
        resumenSheet.mergeCells(`A${secCatRow}:E${secCatRow}`);
        const secCat = resumenSheet.getCell(`A${secCatRow}`);
        secCat.value = 'CATEGORÍAS A INSPECCIONAR';
        secCat.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        secCat.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
        secCat.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        resumenSheet.getRow(secCatRow).height = 28;

        // Table header
        const catHeaderRow = resumenSheet.addRow(['#', 'Categoría', '', 'Items', '']);
        resumenSheet.mergeCells(`B${catHeaderRow.number}:C${catHeaderRow.number}`);
        resumenSheet.mergeCells(`D${catHeaderRow.number}:E${catHeaderRow.number}`);
        catHeaderRow.height = 26;
        catHeaderRow.eachCell(cell => {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // Category rows
        let catIdx = 1;
        const catStartRow = resumenSheet.lastRow.number + 1;
        visita.checklist.forEach((cat) => {
            const catData = CHECKLIST_CATS[cat];
            if (!catData) return;
            const catColor = (CHECKLIST_COLORS[cat] || edColor).replace('#', 'FF');
            const r = resumenSheet.addRow([catIdx, cat, '', `${catData.items.length} items`, '']);
            resumenSheet.mergeCells(`B${r.number}:C${r.number}`);
            resumenSheet.mergeCells(`D${r.number}:E${r.number}`);
            r.height = 24;
            const rowBg = catIdx % 2 === 0 ? 'FFF1F5F9' : 'FFFFFFFF';
            r.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
                cell.alignment = { vertical: 'middle' };
            });
            r.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF94A3B8' } };
            r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
            r.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: catColor } };
            r.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
            r.getCell(4).font = { name: 'Arial', size: 10, color: { argb: 'FF64748B' } };
            r.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
            catIdx++;
        });

        // ── SECCIÓN: FIRMA Y AUTORIZACIÓN ──
        resumenSheet.getRow(resumenSheet.lastRow.number + 1).height = 14;
        const secSignRow = resumenSheet.lastRow.number + 1;
        resumenSheet.mergeCells(`A${secSignRow}:E${secSignRow}`);
        const secSign = resumenSheet.getCell(`A${secSignRow}`);
        secSign.value = 'FIRMA Y AUTORIZACIÓN';
        secSign.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        secSign.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
        secSign.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        resumenSheet.getRow(secSignRow).height = 28;

        resumenSheet.addRow([]);
        const s1 = resumenSheet.addRow(['Realizado por:', '___________________________', '', 'Recibido por:', '___________________________']);
        s1.height = 28;
        s1.eachCell(cell => { cell.alignment = { vertical: 'bottom' }; });
        s1.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
        s1.getCell(4).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };

        const s2 = resumenSheet.addRow(['Cargo:', '___________________________', '', 'Fecha:', '___________________________']);
        s2.height = 28;
        s2.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
        s2.getCell(4).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };

        const s3 = resumenSheet.addRow(['Firma:', '', '', 'Firma:', '']);
        s3.height = 42;
        s3.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
        s3.getCell(4).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };

        // Footer
        resumenSheet.getRow(resumenSheet.lastRow.number + 1).height = 6;
        const footRow = resumenSheet.lastRow.number + 1;
        resumenSheet.mergeCells(`A${footRow}:E${footRow}`);
        const footCell = resumenSheet.getCell(`A${footRow}`);
        footCell.value = `Documento generado el ${new Date().toLocaleDateString('es-PR', { year: 'numeric', month: 'long', day: 'numeric' })} · Facility Management · CIRION`;
        footCell.font = { name: 'Arial', size: 8, italic: true, color: { argb: 'FF94A3B8' } };
        footCell.alignment = { vertical: 'middle', horizontal: 'center' };

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
