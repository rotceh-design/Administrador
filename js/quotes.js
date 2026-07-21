class QuoteManager {
    constructor() {
        this.currentQuote = null;
        this.nextNumber = 1;
    }

    async init() {
        const quotes = await db.getAll('cotizaciones');
        if (quotes.length > 0) {
            const numbers = quotes.map(q => parseInt(q.numero.replace('COT-', '')));
            this.nextNumber = Math.max(...numbers) + 1;
        }
    }

    getNewNumber() {
        const num = String(this.nextNumber).padStart(3, '0');
        this.nextNumber++;
        return `COT-${num}`;
    }

    createBlankQuote() {
        return {
            id: 'COT-' + Date.now(),
            numero: this.getNewNumber(),
            fecha: new Date().toISOString().split('T')[0],
            tipoDocumento: 'boleta',
            cliente: '',
            rutCliente: '',
            direccionCliente: '',
            telefonoCliente: '',
            emailCliente: '',
            items: [{ descripcion: '', cantidad: 1, precioUnitario: 0 }],
            subtotal: 0,
            iva: 0,
            ivaPorcentaje: 0,
            total: 0,
            notas: '',
            estado: 'Borrador'
        };
    }

    calculateTotals(quote) {
        quote.subtotal = quote.items.reduce((sum, item) => {
            return sum + (item.cantidad * item.precioUnitario);
        }, 0);
        if (quote.tipoDocumento === 'factura') {
            quote.ivaPorcentaje = 19;
            quote.iva = quote.subtotal * 0.19;
        } else {
            quote.ivaPorcentaje = 0;
            quote.iva = 0;
        }
        quote.total = quote.subtotal + quote.iva;
        return quote;
    }

    async saveQuote(quote) {
        quote = this.calculateTotals(quote);
        quote.fechaModificacion = new Date().toISOString();
        await db.put('cotizaciones', quote);
        return quote;
    }

    async deleteQuote(id) {
        await db.delete('cotizaciones', id);
    }

    async getQuote(id) {
        return await db.get('cotizaciones', id);
    }

    async getAllQuotes() {
        return await db.getAll('cotizaciones');
    }

    formatCurrency(amount) {
        return '$' + amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    renderQuotesList(quotes, container) {
        if (!quotes.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-invoice-dollar"></i>
                    <p>No hay cotizaciones</p>
                    <button class="btn-primary" onclick="quoteManager.openNewQuote()">
                        <i class="fas fa-plus"></i> Nueva Cotización
                    </button>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="quotes-header">
                <h3>Cotizaciones</h3>
                <button class="btn-primary" onclick="quoteManager.openNewQuote()">
                    <i class="fas fa-plus"></i> Nueva Cotización
                </button>
            </div>
            <div class="quotes-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Número</th>
                            <th>Tipo</th>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${quotes.map(q => `
                            <tr>
                                <td><strong>${q.numero}</strong></td>
                                <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:${q.tipoDocumento === 'factura' ? '#1e40af20;color:#1e40af' : '#05966920;color:#059669'}">${q.tipoDocumento === 'factura' ? 'Factura' : 'Boleta'}</span></td>
                                <td>${app.formatDate(q.fecha)}</td>
                                <td>${q.cliente || 'Sin cliente'}</td>
                                <td>${this.formatCurrency(q.total)}</td>
                                <td><span class="status-badge status-${q.estado.toLowerCase().replace(' ', '')}">${q.estado}</span></td>
                                <td>
                                    <button class="btn-success" onclick="quoteManager.editQuote('${q.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                                    <button class="btn-primary" onclick="quoteManager.printQuote('${q.id}')" title="Imprimir"><i class="fas fa-print"></i></button>
                                    <button class="btn-danger" onclick="quoteManager.confirmDelete('${q.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    }

    openNewQuote() {
        this.currentQuote = this.createBlankQuote();
        this.renderQuoteEditor();
    }

    async editQuote(id) {
        this.currentQuote = await this.getQuote(id);
        if (this.currentQuote) this.renderQuoteEditor();
    }

    renderQuoteEditor() {
        const quote = this.currentQuote;
        const editor = document.getElementById('quoteEditor');
        const list = document.getElementById('quotesList');

        document.getElementById('quoteNumber').textContent = quote.numero;
        document.getElementById('quoteDate').textContent = app.formatDate(quote.fecha);
        document.getElementById('quoteTipoDoc').value = quote.tipoDocumento || 'boleta';
        document.getElementById('quoteClient').value = quote.cliente;
        document.getElementById('quoteRut').value = quote.rutCliente || '';
        document.getElementById('quoteClientAddress').value = quote.direccionCliente;
        document.getElementById('quoteClientPhone').value = quote.telefonoCliente;
        document.getElementById('quoteNotes').value = quote.notas;

        this.renderItems();
        this.updateTotals();
        this._toggleRutField();

        list.style.display = 'none';
        editor.style.display = 'flex';
    }

    closeEditor() {
        const editor = document.getElementById('quoteEditor');
        const list = document.getElementById('quotesList');
        editor.style.display = 'none';
        list.style.display = 'block';
        this.currentQuote = null;
        app.loadQuotes();
    }

    renderItems() {
        const tbody = document.getElementById('quoteItems');
        tbody.innerHTML = this.currentQuote.items.map((item, index) => `
            <tr>
                <td><input type="text" value="${item.descripcion}" onchange="quoteManager.updateItem(${index}, 'descripcion', this.value)" placeholder="Descripción del servicio"></td>
                <td><input type="number" value="${item.cantidad}" min="1" onchange="quoteManager.updateItem(${index}, 'cantidad', parseFloat(this.value) || 1)"></td>
                <td><input type="number" value="${item.precioUnitario}" min="0" step="0.01" onchange="quoteManager.updateItem(${index}, 'precioUnitario', parseFloat(this.value) || 0)"></td>
                <td>${this.formatCurrency(item.cantidad * item.precioUnitario)}</td>
                <td><button class="btn-danger btn-sm" onclick="quoteManager.removeItem(${index})"><i class="fas fa-times"></i></button></td>
            </tr>
        `).join('');
    }

    addItem() {
        this.currentQuote.items.push({ descripcion: '', cantidad: 1, precioUnitario: 0 });
        this.renderItems();
    }

    removeItem(index) {
        if (this.currentQuote.items.length <= 1) return;
        this.currentQuote.items.splice(index, 1);
        this.renderItems();
        this.updateTotals();
    }

    updateItem(index, field, value) {
        this.currentQuote.items[index][field] = value;
        this.renderItems();
        this.updateTotals();
    }

    toggleTipoDocumento(tipo) {
        this.currentQuote.tipoDocumento = tipo;
        const btnBoleta = document.getElementById('btnTipoBoleta');
        const btnFactura = document.getElementById('btnTipoFactura');
        if (tipo === 'boleta') {
            if (btnBoleta) { btnBoleta.style.background = '#059669'; btnBoleta.style.borderColor = '#059669'; btnBoleta.style.color = '#fff'; }
            if (btnFactura) { btnFactura.style.background = '#f8fafc'; btnFactura.style.borderColor = '#e2e8f0'; btnFactura.style.color = '#64748b'; }
        } else {
            if (btnFactura) { btnFactura.style.background = '#1e40af'; btnFactura.style.borderColor = '#1e40af'; btnFactura.style.color = '#fff'; }
            if (btnBoleta) { btnBoleta.style.background = '#f8fafc'; btnBoleta.style.borderColor = '#e2e8f0'; btnBoleta.style.color = '#64748b'; }
        }
        this._toggleRutField();
        this.updateTotals();
    }

    _toggleRutField() {
        const rutGroup = document.getElementById('quoteRutGroup');
        const ivaRow = document.getElementById('quoteIvaRow');
        const tipo = this.currentQuote.tipoDocumento;
        if (rutGroup) rutGroup.style.display = tipo === 'factura' ? 'block' : 'none';
        if (ivaRow) ivaRow.style.display = tipo === 'factura' ? 'flex' : 'none';
        const btnBoleta = document.getElementById('btnTipoBoleta');
        const btnFactura = document.getElementById('btnTipoFactura');
        if (tipo === 'boleta') {
            if (btnBoleta) { btnBoleta.style.background = '#059669'; btnBoleta.style.borderColor = '#059669'; btnBoleta.style.color = '#fff'; }
            if (btnFactura) { btnFactura.style.background = '#f8fafc'; btnFactura.style.borderColor = '#e2e8f0'; btnFactura.style.color = '#64748b'; }
        } else {
            if (btnFactura) { btnFactura.style.background = '#1e40af'; btnFactura.style.borderColor = '#1e40af'; btnFactura.style.color = '#fff'; }
            if (btnBoleta) { btnBoleta.style.background = '#f8fafc'; btnBoleta.style.borderColor = '#e2e8f0'; btnBoleta.style.color = '#64748b'; }
        }
    }

    updateTotals() {
        this.calculateTotals(this.currentQuote);
        document.getElementById('quoteSubtotal').value = this.formatCurrency(this.currentQuote.subtotal);
        const ivaInput = document.getElementById('quoteTax');
        if (ivaInput) {
            ivaInput.value = this.formatCurrency(this.currentQuote.iva);
            const label = ivaInput.closest('.total-row')?.querySelector('span');
            if (label) label.textContent = `IVA (${this.currentQuote.ivaPorcentaje}%):`;
        }
        document.getElementById('quoteTotal').value = this.formatCurrency(this.currentQuote.total);
    }

    async saveCurrentQuote() {
        this.currentQuote.tipoDocumento = document.getElementById('quoteTipoDoc').value;
        this.currentQuote.cliente = document.getElementById('quoteClient').value;
        this.currentQuote.rutCliente = document.getElementById('quoteRut').value;
        this.currentQuote.direccionCliente = document.getElementById('quoteClientAddress').value;
        this.currentQuote.telefonoCliente = document.getElementById('quoteClientPhone').value;
        this.currentQuote.notas = document.getElementById('quoteNotes').value;
        this.currentQuote.estado = 'Guardada';

        await this.saveQuote(this.currentQuote);
        app.showToast('Cotización guardada', 'success');
        this.closeEditor();
    }

    printQuote(id) {
        db.get('cotizaciones', id).then(quote => {
            if (!quote) return;
            const printWindow = window.open('', '_blank');
            printWindow.document.write(this.generatePrintHTML(quote));
            printWindow.document.close();
            printWindow.print();
        });
    }

    generatePrintHTML(quote) {
        const isFactura = quote.tipoDocumento === 'factura';
        const docTitle = isFactura ? 'FACTURA' : 'BOLETA';
        const ivaLabel = isFactura ? `IVA (${quote.ivaPorcentaje || 19}%):` : '';

        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${docTitle} ${quote.numero}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid #1e40af; padding-bottom: 20px; }
        .logo { display: flex; align-items: center; gap: 10px; font-size: 1.5rem; font-weight: bold; color: #1e40af; }
        .title { text-align: right; }
        .title h1 { font-size: 1.8rem; color: #1e40af; }
        .title p { font-size: 0.9rem; color: #666; }
        .client { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .client h3 { color: #1e40af; margin-bottom: 10px; }
        .client p { margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #1e40af; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
        .totals { display: flex; justify-content: flex-end; }
        .totals-box { width: 300px; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .total-final { font-size: 1.2rem; font-weight: bold; color: #1e40af; border-bottom: none; }
        .notes { margin-top: 30px; padding: 20px; background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b; }
        .terms { margin-top: 20px; font-size: 0.85rem; color: #666; }
        .doc-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; color: #fff; background: ${isFactura ? '#1e40af' : '#059669'}; margin-bottom: 8px; }
        @media print { body { padding: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">
            <span style="font-size:2rem;">&#127970;</span> CIRION
        </div>
        <div class="title">
            <div class="doc-badge">${docTitle}</div>
            <h1>${docTitle}</h1>
            <p>N&ordm;: ${quote.numero}</p>
            <p>Fecha: ${app.formatDate(quote.fecha)}</p>
        </div>
    </div>
    <div class="client">
        <h3>CLIENTE:</h3>
        <p><strong>${quote.cliente || '---'}</strong></p>
        ${isFactura && quote.rutCliente ? `<p>RUT: ${quote.rutCliente}</p>` : ''}
        <p>${quote.direccionCliente || ''}</p>
        <p>${quote.telefonoCliente || ''}</p>
    </div>
    <table>
        <thead>
            <tr>
                <th>Descripci&oacute;n</th>
                <th>Cantidad</th>
                <th>Precio Unit.</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${quote.items.map(item => `
                <tr>
                    <td>${item.descripcion}</td>
                    <td>${item.cantidad}</td>
                    <td>${this.formatCurrency(item.precioUnitario)}</td>
                    <td>${this.formatCurrency(item.cantidad * item.precioUnitario)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    <div class="totals">
        <div class="totals-box">
            <div class="total-row"><span>Subtotal:</span><span>${this.formatCurrency(quote.subtotal)}</span></div>
            ${isFactura ? `<div class="total-row"><span>${ivaLabel}</span><span>${this.formatCurrency(quote.iva)}</span></div>` : ''}
            <div class="total-row total-final"><span>TOTAL:</span><span>${this.formatCurrency(quote.total)}</span></div>
        </div>
    </div>
    ${quote.notas ? `<div class="notes"><h4>Notas:</h4><p>${quote.notas}</p></div>` : ''}
    <div class="terms">
        <p>${isFactura ? 'Documento tributario conforme a la legislaci&oacute;n chilena.' : 'Esta boleta no constituye documento tributario.'}</p>
        <p>Validez: 30 d&iacute;as | Forma de pago: [Especificar]</p>
    </div>
</body>
</html>`;
    }

    async confirmDelete(id) {
        if (confirm('¿Eliminar esta cotización?')) {
            await this.deleteQuote(id);
            app.loadQuotes();
            app.showToast('Cotización eliminada', 'success');
        }
    }
}

const quoteManager = new QuoteManager();
