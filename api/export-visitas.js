const ExcelJS = require('exceljs');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { visitas, empresa, edificios } = req.body;

        if (!visitas || !visitas.length) {
            return res.status(400).json({ error: 'No visitas to export' });
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Facility Management';
        workbook.created = new Date();

        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

        const edificioColors = {};
        const palette = ['#1e40af', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#be185d', '#4338ca', '#b45309', '#065f46', '#9333ea', '#1d4ed8'];
        (edificios || []).forEach((ed, i) => {
            edificioColors[ed] = palette[i % palette.length];
        });

        const statusStyles = {
            'Pendiente': { fill: 'FFFFF3CD', font: 'FF856404', border: 'FFFFE69A' },
            'En Progreso': { fill: 'FFD1ECF1', font: 'FF0C5460', border: 'FFBEE5EB' },
            'Completado': { fill: 'FFD4EDDA', font: 'FF155724', border: 'FFC3E6CB' }
        };

        // Group visits by CIRION
        const byEdificio = {};
        visitas.forEach(v => {
            const key = v.edificio || 'Sin CIRION';
            if (!byEdificio[key]) byEdificio[key] = [];
            byEdificio[key].push(v);
        });
        Object.values(byEdificio).forEach(arr => arr.sort((a, b) => a.fecha.localeCompare(b.fecha)));

        // Sort edificios by name
        const sortedEdificios = Object.keys(byEdificio).sort();

        // --- SHEET 1: RESUMEN GENERAL ---
        const summarySheet = workbook.addWorksheet('Resumen', {
            properties: { tabColor: { argb: '1E40AF' } },
            pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
        });

        summarySheet.mergeCells('A1:H1');
        const titleCell = summarySheet.getCell('A1');
        titleCell.value = 'PROGRAMA DE VISITAS';
        titleCell.font = { name: 'Arial', size: 22, bold: true, color: { argb: 'FF1E40AF' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
        summarySheet.getRow(1).height = 40;

        summarySheet.mergeCells('A2:H2');
        const subCell = summarySheet.getCell('A2');
        subCell.value = `${empresa || 'Facility Management'} · Generado el ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
        subCell.font = { name: 'Arial', size: 11, color: { argb: 'FF64748B' } };
        summarySheet.getRow(2).height = 22;

        summarySheet.getRow(3).height = 8;

        // Summary headers
        const summHeaders = ['#', 'CIRION', 'Total Visitas', 'Pendientes', 'En Progreso', 'Completadas', 'Próxima Visita', 'Última Visita'];
        const summHeaderRow = summarySheet.addRow(summHeaders);
        summHeaderRow.height = 30;
        summHeaderRow.eachCell((cell, colNumber) => {
            cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF1E3A8A' } },
                bottom: { style: 'thin', color: { argb: 'FF1E3A8A' } },
                left: { style: 'thin', color: { argb: 'FF3B82F6' } },
                right: { style: 'thin', color: { argb: 'FF3B82F6' } }
            };
        });

        let idx = 1;
        sortedEdificios.forEach((ed, rowIdx) => {
            const visits = byEdificio[ed];
            const pendientes = visits.filter(v => v.estado === 'Pendiente').length;
            const enProgreso = visits.filter(v => v.estado === 'En Progreso').length;
            const completadas = visits.filter(v => v.estado === 'Completado').length;
            const nextVisit = visits.find(v => v.estado !== 'Completado');
            const lastVisit = [...visits].reverse().find(v => v.estado === 'Completado') || visits[visits.length - 1];

            const row = summarySheet.addRow([
                idx,
                ed,
                visits.length,
                pendientes,
                enProgreso,
                completadas,
                nextVisit ? `${nextVisit.fecha} - ${nextVisit.motivo}` : '—',
                lastVisit ? `${lastVisit.fecha} - ${lastVisit.motivo}` : '—'
            ]);

            const rowBg = rowIdx % 2 === 0 ? 'FFF0F7FF' : 'FFFFFFFF';
            row.eachCell((cell, colNumber) => {
                cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
                cell.alignment = { vertical: 'middle', horizontal: colNumber <= 2 ? 'left' : 'center', wrapText: true };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };
                if (colNumber === 2) {
                    const edColor = edificioColors[ed] || 'FF1E40AF';
                    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: edColor } };
                    cell.alignment = { horizontal: 'center' };
                }
                if (colNumber === 4 && pendientes > 0) {
                    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF856404' } };
                }
                if (colNumber === 5 && enProgreso > 0) {
                    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0C5460' } };
                }
                if (colNumber === 6 && completadas > 0) {
                    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF155724' } };
                }
            });
            row.height = 28;
            idx++;
        });

        summarySheet.getColumn(1).width = 5;
        summarySheet.getColumn(2).width = 20;
        summarySheet.getColumn(3).width = 14;
        summarySheet.getColumn(4).width = 14;
        summarySheet.getColumn(5).width = 14;
        summarySheet.getColumn(6).width = 14;
        summarySheet.getColumn(7).width = 35;
        summarySheet.getColumn(8).width = 35;

        // --- SHEETS PER CIRION ---
        sortedEdificios.forEach(ed => {
            const safeName = ed.substring(0, 31).replace(/[\\/*?:\[\]]/g, '');
            const ws = workbook.addWorksheet(safeName, {
                properties: { tabColor: { argb: (edificioColors[ed] || 'FF1E40AF').replace('FF', '') } },
                pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
            });

            const visits = byEdificio[ed];
            const edColor = edificioColors[ed] || 'FF1E40AF';

            // Header
            ws.mergeCells('A1:H1');
            const hCell = ws.getCell('A1');
            hCell.value = ed;
            hCell.font = { name: 'Arial', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
            hCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: edColor } };
            hCell.alignment = { vertical: 'middle', horizontal: 'center' };
            ws.getRow(1).height = 42;

            // Subheader with count
            ws.mergeCells('A2:H2');
            const subH = ws.getCell('A2');
            subH.value = `${visits.length} visita${visits.length !== 1 ? 's' : ''} programada${visits.length !== 1 ? 's' : ''}`;
            subH.font = { name: 'Arial', size: 11, color: { argb: 'FF64748B' } };
            subH.alignment = { vertical: 'middle', horizontal: 'center' };
            subH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            ws.getRow(2).height = 26;

            ws.getRow(3).height = 6;

            // Table headers
            const headers = ['Fecha', 'Día', 'Tipo de Visita', 'Motivo', 'Checklist', 'Proveedor', 'Estado', 'Observaciones'];
            const headerRow = ws.addRow(headers);
            headerRow.height = 30;
            headerRow.eachCell((cell) => {
                cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: edColor } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'medium', color: { argb: edColor } },
                    bottom: { style: 'medium', color: { argb: edColor } },
                    left: { style: 'thin', color: { argb: edColor } },
                    right: { style: 'thin', color: { argb: edColor } }
                };
            });

            // Data rows
            visits.forEach((v, rowIdx) => {
                const d = new Date(v.fecha + 'T00:00:00');
                const sc = statusStyles[v.estado] || statusStyles['Pendiente'];
                const checklistText = (v.checklist || []).join(', ') || '—';

                const row = ws.addRow([
                    v.fecha,
                    dayNames[d.getDay()],
                    v.tipo,
                    v.motivo,
                    checklistText,
                    v.proveedor || 'Sin asignar',
                    v.estado,
                    v.observaciones || ''
                ]);

                const rowBg = rowIdx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
                row.eachCell((cell, colNumber) => {
                    cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
                    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                    if (colNumber === 7) {
                        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: sc.font } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sc.fill } };
                        cell.alignment = { horizontal: 'center' };
                        cell.border = {
                            top: { style: 'thin', color: { argb: sc.border } },
                            bottom: { style: 'thin', color: { argb: sc.border } },
                            left: { style: 'thin', color: { argb: sc.border } },
                            right: { style: 'thin', color: { argb: sc.border } }
                        };
                    }
                    if (colNumber === 1 || colNumber === 2) {
                        cell.alignment = { horizontal: 'center' };
                    }
                });
                row.height = 26;
            });

            ws.getColumn(1).width = 14;
            ws.getColumn(2).width = 14;
            ws.getColumn(3).width = 18;
            ws.getColumn(4).width = 30;
            ws.getColumn(5).width = 35;
            ws.getColumn(6).width = 18;
            ws.getColumn(7).width = 14;
            ws.getColumn(8).width = 28;

            // Auto filter
            ws.autoFilter = { from: 'A4', to: `H${4 + visits.length - 1}` };
        });

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Programa_Visitas_${new Date().toISOString().split('T')[0]}.xlsx"`);
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Error generating Excel' });
    }
};
