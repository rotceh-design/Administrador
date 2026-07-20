class EmailGenerator {
    constructor() {
        this.currentType = null;
        this.config = {};
    }

    async getConfig() {
        const items = await db.getAll('config');
        const config = {};
        items.forEach(item => config[item.key] = item.value);
        this.config = {
            nombreEmpresa: config.nombreEmpresa || 'Facility Management',
            administrador: config.administrador || 'Administrador',
            emailNotif: config.emailNotif || '',
            telefono: config.telefono || ''
        };
        return this.config;
    }

    getForms() {
        const cats = app.data.listas.categorias || [];
        const ubs = app.data.listas.ubicaciones || [];
        const eds = app.data.listas.edificios || [];
        const prs = app.data.listas.prioridades || [];
        const provs = app.data.proveedores || [];
        const provOptions = provs.map(p => `<option value="${p.id}">${p.empresa} - ${p.contacto} (${p.email})</option>`).join('');
        const catOptions = cats.map(c => `<option value="${c}">${c}</option>`).join('');
        const ubiOptions = ubs.map(u => `<option value="${u}">${u}</option>`).join('');
        const ediOptions = eds.map(e => `<option value="${e}">${e}</option>`).join('');
        const priOptions = prs.map(p => `<option value="${p}">${p}</option>`).join('');
        const today = new Date().toISOString().split('T')[0];

        return {
            solicitud: `
                <div class="form-row">
                    <div class="form-group"><label>Edificio *</label><select id="emailEdificio" onchange="emailGenerator.updatePreview()"><option value="">Seleccionar...</option>${ediOptions}</select></div>
                    <div class="form-group"><label>Proveedor *</label><select id="emailProveedor" onchange="emailGenerator.onProveedorChange()"><option value="">Seleccionar proveedor...</option>${provOptions}</select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Categoría *</label><select id="emailCategoria" onchange="emailGenerator.updatePreview()">${catOptions}</select></div>
                    <div class="form-group"><label>Ubicación *</label><select id="emailUbicacion" onchange="emailGenerator.updatePreview()">${ubiOptions}</select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Prioridad</label><select id="emailPrioridad" onchange="emailGenerator.updatePreview()">${priOptions}</select></div>
                    <div class="form-group"><label>Fecha solicitada</label><input type="date" id="emailFecha" value="${today}" onchange="emailGenerator.updatePreview()"></div>
                </div>
                <div class="form-group"><label>Descripción del servicio *</label><textarea id="emailDescripcion" rows="3" placeholder="Ej: Se requiere revisión del sistema eléctrico en las oficinas..." oninput="emailGenerator.updatePreview()"></textarea></div>
                <div class="form-group"><label>Mensaje adicional</label><textarea id="emailMensajeExtra" rows="2" placeholder="Instrucciones adicionales, horarios preferidos, etc. (opcional)" oninput="emailGenerator.updatePreview()"></textarea></div>
            `,
            incidencia: `
                <div class="form-row">
                    <div class="form-group"><label>Edificio *</label><select id="emailEdificio" onchange="emailGenerator.updatePreview()"><option value="">Seleccionar...</option>${ediOptions}</select></div>
                    <div class="form-group"><label>Proveedor *</label><select id="emailProveedor" onchange="emailGenerator.onProveedorChange()"><option value="">Seleccionar proveedor...</option>${provOptions}</select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Categoría *</label><select id="emailCategoria" onchange="emailGenerator.updatePreview()">${catOptions}</select></div>
                    <div class="form-group"><label>Ubicación *</label><select id="emailUbicacion" onchange="emailGenerator.updatePreview()">${ubiOptions}</select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Prioridad *</label><select id="emailPrioridad" onchange="emailGenerator.updatePreview()">${priOptions}</select></div>
                    <div class="form-group"><label>Fecha del problema</label><input type="date" id="emailFecha" value="${today}" onchange="emailGenerator.updatePreview()"></div>
                </div>
                <div class="form-group"><label>Descripción del problema *</label><textarea id="emailDescripcion" rows="3" placeholder="Ej: Se detectó una fuga de agua en el baño del pasillo principal..." oninput="emailGenerator.updatePreview()"></textarea></div>
                <div class="form-group"><label>Observaciones</label><textarea id="emailObservaciones" rows="2" placeholder="Detalles adicionales, nivel de urgencia, si hay daños colaterales... (opcional)" oninput="emailGenerator.updatePreview()"></textarea></div>
            `,
            seguimiento: `
                <div class="form-row">
                    <div class="form-group"><label>Edificio *</label><select id="emailEdificio" onchange="emailGenerator.updatePreview()"><option value="">Seleccionar...</option>${ediOptions}</select></div>
                    <div class="form-group"><label>Proveedor *</label><select id="emailProveedor" onchange="emailGenerator.onProveedorChange()"><option value="">Seleccionar proveedor...</option>${provOptions}</select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Actividad *</label><input type="text" id="emailActividad" placeholder="Ej: Mantenimiento A/C central" oninput="emailGenerator.updatePreview()"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Categoría</label><select id="emailCategoria" onchange="emailGenerator.updatePreview()">${catOptions}</select></div>
                    <div class="form-group"><label>Ubicación</label><select id="emailUbicacion" onchange="emailGenerator.updatePreview()">${ubiOptions}</select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Estado actual</label><select id="emailEstado" onchange="emailGenerator.updatePreview()"><option value="Pendiente">Pendiente</option><option value="En Progreso">En Progreso</option><option value="Completado">Completado</option></select></div>
                    <div class="form-group"><label>Fecha</label><input type="date" id="emailFecha" value="${today}" onchange="emailGenerator.updatePreview()"></div>
                </div>
                <div class="form-group"><label>Mensaje de seguimiento *</label><textarea id="emailDescripcion" rows="3" placeholder="Ej: Quisiera conocer el avance de la actividad y fecha estimada de finalización..." oninput="emailGenerator.updatePreview()"></textarea></div>
            `,
            confirmacion: `
                <div class="form-row">
                    <div class="form-group"><label>Edificio *</label><select id="emailEdificio" onchange="emailGenerator.updatePreview()"><option value="">Seleccionar...</option>${ediOptions}</select></div>
                    <div class="form-group"><label>Proveedor *</label><select id="emailProveedor" onchange="emailGenerator.onProveedorChange()"><option value="">Seleccionar proveedor...</option>${provOptions}</select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Actividad realizada *</label><input type="text" id="emailActividad" placeholder="Ej: Reparación de fuga en baño" oninput="emailGenerator.updatePreview()"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Ubicación</label><select id="emailUbicacion" onchange="emailGenerator.updatePreview()">${ubiOptions}</select></div>
                    <div class="form-group"><label>Fecha de realización</label><input type="date" id="emailFecha" value="${today}" onchange="emailGenerator.updatePreview()"></div>
                </div>
                <div class="form-group"><label>Comentarios sobre el trabajo</label><textarea id="emailDescripcion" rows="3" placeholder="Ej: Trabajo realizado satisfactoriamente, sin observaciones..." oninput="emailGenerator.updatePreview()"></textarea></div>
            `,
            recordatorio: `
                <div class="form-row">
                    <div class="form-group"><label>Edificio *</label><select id="emailEdificio" onchange="emailGenerator.updatePreview()"><option value="">Seleccionar...</option>${ediOptions}</select></div>
                    <div class="form-group"><label>Proveedor *</label><select id="emailProveedor" onchange="emailGenerator.onProveedorChange()"><option value="">Seleccionar proveedor...</option>${provOptions}</select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Actividad pendiente *</label><input type="text" id="emailActividad" placeholder="Ej: Limpieza de ventanas del pasillo" oninput="emailGenerator.updatePreview()"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Categoría</label><select id="emailCategoria" onchange="emailGenerator.updatePreview()">${catOptions}</select></div>
                    <div class="form-group"><label>Ubicación</label><select id="emailUbicacion" onchange="emailGenerator.updatePreview()">${ubiOptions}</select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Fecha programada</label><input type="date" id="emailFecha" value="${today}" onchange="emailGenerator.updatePreview()"></div>
                    <div class="form-group"><label>Estado</label><select id="emailEstado" onchange="emailGenerator.updatePreview()"><option value="Pendiente">Pendiente</option><option value="En Progreso">En Progreso</option></select></div>
                </div>
                <div class="form-group"><label>Mensaje adicional</label><textarea id="emailDescripcion" rows="2" placeholder="Instrucciones o recordatorios adicionales... (opcional)" oninput="emailGenerator.updatePreview()"></textarea></div>
            `,
            cotizacion: `
                <div class="form-row">
                    <div class="form-group"><label>Edificio *</label><select id="emailEdificio" onchange="emailGenerator.updatePreview()"><option value="">Seleccionar...</option>${ediOptions}</select></div>
                    <div class="form-group"><label>Proveedor *</label><select id="emailProveedor" onchange="emailGenerator.onProveedorChange()"><option value="">Seleccionar proveedor...</option>${provOptions}</select></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label>Tipo de servicio *</label><select id="emailCategoria" onchange="emailGenerator.updatePreview()">${catOptions}</select></div>
                    <div class="form-group"><label>Ubicación</label><select id="emailUbicacion" onchange="emailGenerator.updatePreview()">${ubiOptions}</select></div>
                </div>
                <div class="form-group"><label>Descripción del servicio *</label><textarea id="emailDescripcion" rows="3" placeholder="Ej: Se requiere cotización para instalación de 5 extintores..." oninput="emailGenerator.updatePreview()"></textarea></div>
                <div class="form-row">
                    <div class="form-group"><label>Cantidad estimada</label><input type="text" id="emailCantidad" placeholder="Ej: 5 unidades, 20 m², etc." oninput="emailGenerator.updatePreview()"></div>
                    <div class="form-group"><label>Fecha necesitada</label><input type="date" id="emailFecha" value="${today}" onchange="emailGenerator.updatePreview()"></div>
                </div>
                <div class="form-group"><label>Requisitos adicionales</label><textarea id="emailMensajeExtra" rows="2" placeholder="Incluir garantía, especificaciones técnicas, opciones de pago... (opcional)" oninput="emailGenerator.updatePreview()"></textarea></div>
            `
        };
    }

    getTitle(type) {
        const titles = {
            solicitud: 'Solicitud de Mantenimiento',
            incidencia: 'Reporte de Incidencia',
            seguimiento: 'Seguimiento de Actividad',
            confirmacion: 'Confirmación de Trabajo',
            recordatorio: 'Recordatorio',
            cotizacion: 'Solicitud de Cotización'
        };
        return titles[type] || '';
    }

    selectType(type) {
        this.currentType = type;
        document.getElementById('emailStep1').classList.remove('active');
        document.getElementById('emailStep2').classList.add('active');
        document.getElementById('emailFormTitle').textContent = this.getTitle(type);
        document.getElementById('emailFormBody').innerHTML = this.getForms()[type];
        document.getElementById('emailPreviewContent').innerHTML = '<p class="email-preview-placeholder">Completa el formulario para ver la vista previa...</p>';
    }

    backToTypes() {
        this.currentType = null;
        document.getElementById('emailStep2').classList.remove('active');
        document.getElementById('emailStep1').classList.add('active');
    }

    getVal(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }

    getProveedorInfo() {
        const provId = this.getVal('emailProveedor');
        if (!provId) return null;
        const prov = app.data.proveedores.find(p => p.id === provId);
        return prov;
    }

    onProveedorChange() {
        const prov = this.getProveedorInfo();
        if (prov) {
            const catSelect = document.getElementById('emailCategoria');
            if (catSelect) {
                const opt = Array.from(catSelect.options).find(o => o.value === prov.servicio);
                if (opt) catSelect.value = prov.servicio;
            }
        }
        this.updatePreview();
    }

    formatDate(dateStr) {
        if (!dateStr) return '';
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    async buildEmail() {
        await this.getConfig();
        const prov = this.getProveedorInfo();
        const proveedorNombre = prov ? prov.contacto : 'Proveedor';
        const proveedorEmpresa = prov ? prov.empresa : '';
        const edificio = this.getVal('emailEdificio') || '';
        const categoria = this.getVal('emailCategoria') || '';
        const ubicacion = this.getVal('emailUbicacion') || '';
        const prioridad = this.getVal('emailPrioridad') || 'Media';
        const fecha = this.formatDate(this.getVal('emailFecha'));
        const descripcion = this.getVal('emailDescripcion') || '';
        const observaciones = this.getVal('emailObservaciones') || '';
        const mensajeExtra = this.getVal('emailMensajeExtra') || '';
        const actividad = this.getVal('emailActividad') || '';
        const estado = this.getVal('emailEstado') || '';
        const cantidad = this.getVal('emailCantidad') || '';

        const cfg = this.config;
        let subject = '';
        let body = '';

        switch (this.currentType) {
            case 'solicitud':
                subject = `Solicitud de Servicio - ${categoria} - ${edificio}`;
                body = `Estimado/a ${proveedorNombre}:

Reciba un cordial saludo.

Por medio de la presente, nos dirigimos a usted para solicitar el servicio de mantenimiento de tipo "${categoria}" para las instalaciones del edificio ${edificio}.

DETALLE DEL SERVICIO:
• Edificio: ${edificio}
• Categoría: ${categoria}
• Ubicación: ${ubicacion}
• Prioridad: ${prioridad}
• Fecha solicitada: ${fecha}

DESCRIPCIÓN:
${descripcion}
${mensajeExtra ? `\nINSTRUCCIONES ADICIONALES:\n${mensajeExtra}` : ''}

Agradecemos confirmar disponibilidad y proporcionar cotización para dicho servicio.

Quedamos a sus órdenes para cualquier consulta.

Atentamente,
${cfg.administrador}
Edificio ${edificio}
${cfg.telefono ? `Tel: ${cfg.telefono}` : ''}
${cfg.emailNotif ? `Email: ${cfg.emailNotif}` : ''}`;
                break;

            case 'incidencia':
                subject = `REPORTE DE INCIDENCIA - ${edificio} - ${ubicacion} [${prioridad}]`;
                body = `Estimado/a ${proveedorNombre}:

Se reporta la siguiente incidencia que requiere atención:

DATOS DE LA INCIDENCIA:
• Edificio: ${edificio}
• Fecha: ${fecha}
• Ubicación: ${ubicacion}
• Categoría: ${categoria}
• Prioridad: ${prioridad}

DESCRIPCIÓN DEL PROBLEMA:
${descripcion}
${observaciones ? `\nOBSERVACIONES:\n${observaciones}` : ''}

Solicitamos su pronta intervención para la resolución del problema.

Atentamente,
${cfg.administrador}
Edificio ${edificio}
${cfg.telefono ? `Tel: ${cfg.telefono}` : ''}
${cfg.emailNotif ? `Email: ${cfg.emailNotif}` : ''}`;
                break;

            case 'seguimiento':
                subject = `Seguimiento - ${actividad || categoria} - ${edificio}`;
                body = `Estimado/a ${proveedorNombre}:

Le escribimos para dar seguimiento a la siguiente actividad:

DATOS DE LA ACTIVIDAD:
• Edificio: ${edificio}
• Actividad: ${actividad || 'No especificada'}
• Categoría: ${categoria}
• Ubicación: ${ubicacion}
• Estado actual: ${estado}
• Fecha: ${fecha}

MENSAJE:
${descripcion}

Agradecemos nos proporcione una actualización del avance.

Atentamente,
${cfg.administrador}
Edificio ${edificio}`;
                break;

            case 'confirmacion':
                subject = `Confirmación de Trabajo - ${actividad} - ${edificio}`;
                body = `Estimado/a ${proveedorNombre}:

Por medio de la presente confirmamos la recepción y conformidad del trabajo realizado:

DETALLE:
• Edificio: ${edificio}
• Actividad: ${actividad}
• Ubicación: ${ubicacion}
• Fecha de realización: ${fecha}
• Estado: Completado
${descripcion ? `\nCOMENTARIOS:\n${descripcion}` : ''}

Agradecemos su pronta respuesta y quedamos a disposición para futuros trabajos.

Atentamente,
${cfg.administrador}
Edificio ${edificio}`;
                break;

            case 'recordatorio':
                subject = `RECORDATORIO - ${actividad || 'Tarea pendiente'} - ${edificio}`;
                body = `Estimado/a ${proveedorNombre}:

Le recordamos que la siguiente actividad se encuentra pendiente:

DATOS:
• Edificio: ${edificio}
• Actividad: ${actividad || 'No especificada'}
• Categoría: ${categoria}
• Ubicación: ${ubicacion}
• Fecha programada: ${fecha}
• Estado: ${estado}
${descripcion ? `\nMENSAJE:\n${descripcion}` : ''}

Solicitamos atender a la mayor brevedad posible.

Atentamente,
${cfg.administrador}
Edificio ${edificio}`;
                break;

            case 'cotizacion':
                subject = `Solicitud de Cotización - ${categoria} - ${edificio}`;
                body = `Estimado/a ${proveedorNombre}:

Reciba un cordial saludo.

Solicitamos nos proporcione cotización para el siguiente servicio:

DETALLE:
• Edificio: ${edificio}
• Tipo de servicio: ${categoria}
• Ubicación: ${ubicacion}
${cantidad ? `• Cantidad estimada: ${cantidad}` : ''}
• Fecha necesitada: ${fecha}

DESCRIPCIÓN DEL SERVICIO:
${descripcion}
${mensajeExtra ? `\nREQUISITOS ADICIONALES:\n${mensajeExtra}` : ''}

Agradecemos incluir:
• Costo unitario y total
• Tiempo estimado de ejecución
• Condiciones de pago
• Vigencia de la cotización

Quedamos a sus órdenes.

Atentamente,
${cfg.administrador}
Edificio ${edificio}
${cfg.telefono ? `Tel: ${cfg.telefono}` : ''}
${cfg.emailNotif ? `Email: ${cfg.emailNotif}` : ''}`;
                break;
        }

        return { subject, body, to: prov ? prov.email : '' };
    }

    async updatePreview() {
        if (!this.currentType) return;
        const hasRequired = this.getVal('emailProveedor') || this.getVal('emailDescripcion') || this.getVal('emailActividad');
        if (!hasRequired) {
            document.getElementById('emailPreviewContent').innerHTML = '<p class="email-preview-placeholder">Completa el formulario para ver la vista previa...</p>';
            return;
        }

        const email = await this.buildEmail();
        const preview = document.getElementById('emailPreviewContent');
        preview.innerHTML = `
            <div class="email-preview-to">
                <strong>Para:</strong> ${email.to || '<em>No seleccionado</em>'}
            </div>
            <div class="email-preview-subject">
                <strong>Asunto:</strong> ${email.subject}
            </div>
            <div class="email-preview-body">
                <pre>${email.body}</pre>
            </div>`;
    }

    async copyToClipboard() {
        if (!this.currentType) return;
        const email = await this.buildEmail();
        const text = `Para: ${email.to}\nAsunto: ${email.subject}\n\n${email.body}`;

        try {
            await navigator.clipboard.writeText(text);
            app.showToast('Email copiado al portapapeles', 'success');
        } catch (e) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            app.showToast('Email copiado al portapapeles', 'success');
        }
    }

    async openEmailClient() {
        if (!this.currentType) return;
        const email = await this.buildEmail();
        const to = encodeURIComponent(email.to || '');
        const subject = encodeURIComponent(email.subject);
        const body = encodeURIComponent(email.body);
        window.open(`mailto:${to}?subject=${subject}&body=${body}`);
    }

    bindEvents() {
        document.querySelectorAll('.email-type-card').forEach(card => {
            card.addEventListener('click', () => this.selectType(card.dataset.type));
        });

        document.getElementById('emailBackStep1')?.addEventListener('click', () => this.backToTypes());
        document.getElementById('copyEmail')?.addEventListener('click', () => this.copyToClipboard());
        document.getElementById('openEmailClient')?.addEventListener('click', () => this.openEmailClient());
    }
}

const emailGenerator = new EmailGenerator();
