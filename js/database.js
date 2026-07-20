class Database {
    constructor() {
        this.dbName = 'ProMantDB';
        this.dbVersion = 2;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('config')) {
                    db.createObjectStore('config', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('tareas')) {
                    const tareasStore = db.createObjectStore('tareas', { keyPath: 'id' });
                    tareasStore.createIndex('categoria', 'categoria', { unique: false });
                    tareasStore.createIndex('estado', 'estado', { unique: false });
                    tareasStore.createIndex('fecha', 'fecha', { unique: false });
                }
                if (!db.objectStoreNames.contains('incidencias')) {
                    const incStore = db.createObjectStore('incidencias', { keyPath: 'id' });
                    incStore.createIndex('prioridad', 'prioridad', { unique: false });
                    incStore.createIndex('estado', 'estado', { unique: false });
                }
                if (!db.objectStoreNames.contains('proveedores')) {
                    db.createObjectStore('proveedores', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('fotos')) {
                    const fotosStore = db.createObjectStore('fotos', { keyPath: 'id' });
                    fotosStore.createIndex('categoria', 'categoria', { unique: false });
                    fotosStore.createIndex('ubicacion', 'ubicacion', { unique: false });
                }
                if (!db.objectStoreNames.contains('cotizaciones')) {
                    db.createObjectStore('cotizaciones', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('notificaciones')) {
                    db.createObjectStore('notificaciones', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('visitas')) {
                    const visitasStore = db.createObjectStore('visitas', { keyPath: 'id' });
                    visitasStore.createIndex('edificio', 'edificio', { unique: false });
                    visitasStore.createIndex('estado', 'estado', { unique: false });
                }
                if (!db.objectStoreNames.contains('informesDiarios')) {
                    db.createObjectStore('informesDiarios', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('listas')) {
                    db.createObjectStore('listas', { keyPath: 'key' });
                }
            };
        });
    }

    _getStore(storeName, mode = 'readonly') {
        const tx = this.db.transaction(storeName, mode);
        return tx.objectStore(storeName);
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const store = this._getStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const store = this._getStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const store = this._getStore(storeName, 'readwrite');
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const store = this._getStore(storeName, 'readwrite');
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const store = this._getStore(storeName, 'readwrite');
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async count(storeName) {
        return new Promise((resolve, reject) => {
            const store = this._getStore(storeName);
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
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
