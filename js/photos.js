class PhotoManager {
    constructor() {
        this.maxSizeKB = 500;
        this.maxWidth = 1920;
        this.maxHeight = 1080;
        this.quality = 0.8;
    }

    async compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;

                    if (width > this.maxWidth || height > this.maxHeight) {
                        const ratio = Math.min(this.maxWidth / width, this.maxHeight / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    let quality = this.quality;
                    let dataUrl = canvas.toDataURL('image/jpeg', quality);

                    while (dataUrl.length * 0.75 / 1024 > this.maxSizeKB && quality > 0.1) {
                        quality -= 0.1;
                        dataUrl = canvas.toDataURL('image/jpeg', quality);
                    }

                    canvas.toBlob((blob) => {
                        resolve({
                            blob,
                            dataUrl,
                            originalName: file.name,
                            width,
                            height,
                            sizeKB: Math.round(dataUrl.length * 0.75 / 1024)
                        });
                    }, 'image/jpeg', quality);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async processFiles(files) {
        const results = [];
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            if (file.size > 10 * 1024 * 1024) {
                app.showToast(`Archivo ${file.name} excede 10MB`, 'warning');
                continue;
            }
            try {
                const compressed = await this.compressImage(file);
                results.push(compressed);
            } catch (e) {
                app.showToast(`Error al procesar ${file.name}`, 'error');
            }
        }
        return results;
    }

    async savePhoto(photoData, categoria, edificio, descripcion, ubicacion) {
        const id = 'FOTO-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
        let photoUrl = photoData.dataUrl;

        // Upload to Firebase Storage if available
        if (window._storage && window._fbStorage && photoData.blob) {
            try {
                const storageRef = window._fbStorage.ref(window._storage, `fotos/${id}.jpg`);
                await window._fbStorage.uploadBytes(storageRef, photoData.blob);
                photoUrl = await window._fbStorage.getDownloadURL(storageRef);
            } catch (e) {
                console.warn('Storage upload failed, using base64 fallback:', e);
            }
        }

        const photo = {
            id,
            url: photoUrl,
            originalName: photoData.originalName,
            width: photoData.width,
            height: photoData.height,
            sizeKB: photoData.sizeKB,
            categoria: categoria || 'Sin categoría',
            edificio: edificio || 'Sin CIRION',
            ubicacion: ubicacion || 'Sin ubicación',
            descripcion: descripcion || '',
            fecha: new Date().toISOString().split('T')[0],
            hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            createdAt: new Date().toISOString()
        };

        await db.put('fotos', photo);
        return photo;
    }

    async deletePhoto(id) {
        // Delete from Storage if available
        if (window._storage && window._fbStorage) {
            try {
                const storageRef = window._fbStorage.ref(window._storage, `fotos/${id}.jpg`);
                await window._fbStorage.deleteObject(storageRef);
            } catch (e) {
                console.warn('Storage delete failed:', e);
            }
        }
        await db.delete('fotos', id);
    }

    async getAllPhotos() {
        const photos = await db.getAll('fotos');
        // Support both old (dataUrl) and new (url) format
        return photos.map(p => ({ ...p, displayUrl: p.url || p.dataUrl }));
    }

    async getPhotosByFilter(categoria, ubicacion) {
        let photos = await this.getAllPhotos();
        if (categoria) photos = photos.filter(p => p.categoria === categoria);
        if (ubicacion) photos = photos.filter(p => p.ubicacion === ubicacion);
        return photos;
    }

    renderPhotosGrid(photos, container) {
        if (!photos.length) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-camera"></i><p>No hay fotografías</p></div>';
            return;
        }

        container.innerHTML = photos.map(photo => `
            <div class="photo-card" data-id="${photo.id}">
                <div class="photo-image" onclick="photoManager.viewPhoto('${photo.id}')">
                    <img src="${photo.displayUrl || photo.url || photo.dataUrl}" alt="${photo.descripcion || photo.originalName}" loading="lazy">
                    <div class="photo-overlay">
                        <button class="photo-action-btn" onclick="event.stopPropagation(); photoManager.viewPhoto('${photo.id}')" title="Ver"><i class="fas fa-expand"></i></button>
                        ${getUserRole() === 'Facility Manager' ? `<button class="photo-action-btn danger" onclick="event.stopPropagation(); photoManager.confirmDelete('${photo.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
                <div class="photo-info">
                    <p class="photo-desc">${photo.descripcion || photo.originalName}</p>
                    <div class="photo-meta">
                        <span><i class="fas fa-building"></i> ${photo.edificio || ''}</span>
                        <span><i class="fas fa-calendar"></i> ${app.formatDate(photo.fecha)}</span>
                    </div>
                    <span class="photo-category-tag" style="background: ${CATEGORY_COLORS[photo.categoria] || '#6b7280'}">${photo.categoria}</span>
                </div>
            </div>
        `).join('');
    }

    async viewPhoto(id) {
        const photo = await db.get('fotos', id);
        if (!photo) return;

        const overlay = document.getElementById('imageViewerOverlay');
        const img = document.getElementById('imageViewerImg');
        const info = document.getElementById('imageViewerInfo');

        img.src = photo.url || photo.dataUrl;
        info.innerHTML = `
            <h4>${photo.descripcion || photo.originalName}</h4>
            <p><strong>Ubicación:</strong> ${photo.ubicacion} | <strong>Categoría:</strong> ${photo.categoria}</p>
            <p><strong>Fecha:</strong> ${app.formatDate(photo.fecha)} ${photo.hora} | <strong>Tamaño:</strong> ${photo.sizeKB}KB</p>
        `;
        overlay.classList.add('active');
    }

    async confirmDelete(id) {
        if (confirm('¿Eliminar esta fotografía?')) {
            await this.deletePhoto(id);
            app.loadPhotos();
            app.showToast('Fotografía eliminada', 'success');
        }
    }
}

const photoManager = new PhotoManager();
