class Database {
    constructor() {
        this.db = null;
        this._fb = null;
        this._ready = false;
    }

    async init() {
        if (this._ready) return;

        if (window._firestore && window._fb) {
            this.db = window._firestore;
            this._fb = window._fb;
            this._ready = true;
            return;
        }

        return new Promise((resolve) => {
            const check = () => {
                if (window._firestore && window._fb) {
                    this.db = window._firestore;
                    this._fb = window._fb;
                    this._ready = true;
                    resolve();
                } else {
                    setTimeout(check, 50);
                }
            };
            check();
        });
    }

    _col(name) {
        return this._fb.collection(this.db, name);
    }

    _doc(name, id) {
        return this._fb.doc(this.db, name, id);
    }

    async getAll(storeName) {
        try {
            const snap = await this._fb.getDocs(this._col(storeName));
            return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !d.isDeleted);
        } catch (e) { console.error(`Error leyendo ${storeName}:`, e); return []; }
    }

    async getAllIncludingDeleted(storeName) {
        try {
            const snap = await this._fb.getDocs(this._col(storeName));
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) { console.error(`Error leyendo ${storeName}:`, e); return []; }
    }

    async getDeleted(storeName) {
        try {
            const all = await this.getAllIncludingDeleted(storeName);
            return all.filter(d => d.isDeleted);
        } catch (e) { console.error(`Error leyendo eliminados de ${storeName}:`, e); return []; }
    }

    async get(storeName, key) {
        try {
            const snap = await this._fb.getDoc(this._doc(storeName, key));
            return snap.exists() ? { id: snap.id, ...snap.data() } : undefined;
        } catch (e) { console.error(`Error leyendo ${storeName}/${key}:`, e); return undefined; }
    }

    async put(storeName, data) {
        try {
            const id = data.id || data.key || String(Date.now());
            const docData = { ...data, id };
            await this._fb.setDoc(this._doc(storeName, id), docData);
            return id;
        } catch (e) { console.error(`Error guardando en ${storeName}:`, e); throw e; }
    }

    async delete(storeName, key) {
        try {
            // Soft delete: mark as deleted instead of removing
            const docRef = this._doc(storeName, key);
            const snap = await this._fb.getDoc(docRef);
            if (snap.exists()) {
                await this._fb.setDoc(docRef, { ...snap.data(), isDeleted: true, deletedAt: new Date().toISOString() });
            }
        } catch (e) { console.error(`Error eliminando ${storeName}/${key}:`, e); throw e; }
    }

    async hardDelete(storeName, key) {
        try {
            await this._fb.deleteDoc(this._doc(storeName, key));
        } catch (e) { console.error(`Error eliminando permanentemente ${storeName}/${key}:`, e); throw e; }
    }

    async restore(storeName, key) {
        try {
            const docRef = this._doc(storeName, key);
            const snap = await this._fb.getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                delete data.isDeleted;
                delete data.deletedAt;
                await this._fb.setDoc(docRef, data);
            }
        } catch (e) { console.error(`Error restaurando ${storeName}/${key}:`, e); throw e; }
    }

    async clear(storeName) {
        try {
            const snap = await this._fb.getDocs(this._col(storeName));
            const batch = this._fb.writeBatch(this.db);
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        } catch (e) { console.error(`Error limpiando ${storeName}:`, e); throw e; }
    }

    async count(storeName) {
        const snap = await this._fb.getDocs(this._col(storeName));
        return snap.size;
    }

    async importAll(data) {
        const stores = ['tareas', 'visitas', 'incidencias', 'proveedores', 'fotos', 'cotizaciones', 'notificaciones', 'informesDiarios', 'listas'];
        for (const storeName of stores) {
            if (data[storeName]) {
                await this.clear(storeName);
                for (const item of data[storeName]) {
                    await this.put(storeName, item);
                }
            }
        }
        if (data.config) {
            for (const [key, value] of Object.entries(data.config)) {
                await this.put('config', { key, value });
            }
        }
    }

    async exportAll() {
        const result = {};
        const stores = ['tareas', 'visitas', 'incidencias', 'proveedores', 'fotos', 'cotizaciones', 'notificaciones', 'informesDiarios', 'listas'];
        for (const storeName of stores) {
            result[storeName] = await this.getAll(storeName);
        }
        result.config = {};
        const configItems = await this.getAll('config');
        configItems.forEach(item => {
            result.config[item.key] = item.value;
        });
        return result;
    }

    async migrateFromLocalStorage() {
        const saved = localStorage.getItem('maintenanceData');
        if (!saved) return false;

        try {
            const data = JSON.parse(saved);
            await this.importAll(data);
            localStorage.removeItem('maintenanceData');
            return true;
        } catch (e) {
            console.error('Migration error:', e);
            return false;
        }
    }
}

const db = new Database();
