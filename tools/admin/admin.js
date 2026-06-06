let apiData = { galleries: [], favourites: [], availableFolders: [] };
let currentGalleryId = null;
let sortableInstance = null;
let sidebarSortable = null;

async function init(preserveGallery = false) {
    try {
        const res = await fetch('/api/data');
        apiData = await res.json();
        renderSidebar();
        if (!preserveGallery && apiData.galleries.length > 0) {
            loadGallery(apiData.galleries[0].id);
        }
    } catch (e) {
        showToast("Error loading data", "error");
    }
}

function renderSidebar() {
    const list = document.getElementById('gallery-list');
    list.innerHTML = '';
    
    const renderedIds = new Set();
    let photoIndex = 0;
    let inGameIndex = 0;
    
    apiData.galleries.forEach(g => {
        const btn = document.createElement('button');
        btn.className = 'btn-gallery';
        btn.onclick = () => loadGallery(g.id);
        btn.dataset.id = g.id;
        
        let titleHtml = g.title;
        if (g.id !== 'favourites') {
            let layoutIndex = 0;
            if (g.category === 'photography') {
                layoutIndex = photoIndex++;
            } else if (g.category === 'in-game') {
                layoutIndex = inGameIndex++;
            }
            const arrow = layoutIndex % 2 === 0 ? '←' : '→';
            titleHtml = `<span style="float:right; opacity:0.5">${arrow}</span> ${g.title}`;
        } else {
            titleHtml = `★ ${g.title}`;
        }
        
        btn.innerHTML = titleHtml;
        list.appendChild(btn);
        renderedIds.add(g.id);
    });

    // Render empty folders that exist but aren't in galleries.json yet
    if (apiData.availableFolders) {
        apiData.availableFolders.forEach(folder => {
            if (!renderedIds.has(folder)) {
                const btn = document.createElement('button');
                btn.className = 'btn-gallery';
                btn.innerText = folder + " (Draft)";
                btn.style.fontStyle = "italic";
                btn.onclick = () => loadGallery(folder);
                btn.dataset.id = folder;
                list.appendChild(btn);
            }
        });
    }

    if (sidebarSortable) sidebarSortable.destroy();
    sidebarSortable = new Sortable(list, {
        animation: 150,
        ghostClass: 'ghost',
        filter: '[data-id="favourites"]',
        onMove: function (evt) {
            if (evt.related.dataset.id === 'favourites') {
                return false;
            }
        },
        onEnd: function () {
            updateGalleryOrder();
        }
    });
    
    if (currentGalleryId) {
        const activeBtn = document.querySelector(`.btn-gallery[data-id="${currentGalleryId}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }
}

function updateGalleryOrder() {
    const list = document.getElementById('gallery-list');
    const newOrderIds = Array.from(list.children).map(btn => btn.dataset.id);
    
    const newGalleries = [];
    newOrderIds.forEach(id => {
        const gallery = apiData.galleries.find(g => g.id === id);
        if (gallery) {
            newGalleries.push(gallery);
        }
    });
    
    apiData.galleries = newGalleries;
    saveOrder().then(() => {
        renderSidebar();
    });
}

function loadGallery(id) {
    document.querySelectorAll('.btn-gallery').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.btn-gallery[data-id="${id}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    currentGalleryId = id;
    
    const gallery = apiData.galleries.find(g => g.id === id);
    document.getElementById('current-gallery-title').innerText = gallery ? gallery.title : id;
    
    const uploadSection = document.getElementById('upload-section');
    if (id === 'favourites') {
        uploadSection.classList.add('hidden');
    } else {
        uploadSection.classList.remove('hidden');
    }

    const grid = document.getElementById('sortable-grid');
    grid.innerHTML = '';

    let images = [];
    let rawFavourites = [];
    if (id === 'favourites') {
        rawFavourites = Array.isArray(apiData.favourites) ? apiData.favourites : [];
        images = rawFavourites.map(i => typeof i === 'string' ? i : i.src);
    } else if (gallery) {
        images = gallery.images || [];
    }

    images.forEach((img, idx) => {
        let imgSrc = id === 'favourites' ? `/images/${img}` : `/images/${id}/${img}`;
        
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.dataset.img = img;
        
        let badgeHtml = '';
        let isCover = false;
        if (id !== 'favourites' && gallery && gallery.coverImage && gallery.coverImage.endsWith(img)) {
            badgeHtml = '<div class="badge">Portada</div>';
            isCover = true;
        }

        const srcPath = id === 'favourites' ? img : `${id}/${img}`;
        const isFav = apiData.favourites && apiData.favourites.some(f => (typeof f === 'string' ? f : f.src) === srcPath);

        let favBadgeHtml = '';
        if (id !== 'favourites' && isFav) {
            favBadgeHtml = '<div class="badge-fav">❤</div>';
        }

        // Featured badge (only in favourites view)
        let featuredBadgeHtml = '';
        let isFeatured = false;
        if (id === 'favourites') {
            const rawEntry = rawFavourites[idx];
            isFeatured = rawEntry && typeof rawEntry === 'object' && rawEntry.featured === true;
            if (isFeatured) {
                featuredBadgeHtml = '<div class="badge-featured">★ Destacada</div>';
            }
        }

        item.innerHTML = `
            ${badgeHtml}
            ${favBadgeHtml}
            ${featuredBadgeHtml}
            <img src="${imgSrc}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' fill=\\'none\\' viewBox=\\'0 0 24 24\\' stroke=\\'%23666\\'><path stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\' stroke-width=\\'2\\' d=\\'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z\\'/></svg>'">
            <div class="actions">
                ${id !== 'favourites' ? `<button class="action-btn ${isCover ? 'active' : ''}" onclick="setCover('${img}')" title="Marcar como portada"><svg fill="${isCover ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></button>` : ''}
                ${id !== 'favourites' ? `<button class="action-btn fav-btn ${isFav ? 'fav-active' : ''}" onclick="toggleFavourite('${img}', this.closest('.grid-item'))" title="Añadir a favoritos"><svg fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg></button>` : ''}
                ${id === 'favourites' ? `<button class="action-btn featured-btn ${isFeatured ? 'featured-active' : ''}" onclick="toggleFeatured('${img}', this.closest('.grid-item'))" title="Marcar como destacada"><svg fill="${isFeatured ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></button>` : ''}
                <button class="action-btn delete" onclick="deletePhoto('${img}')" title="Eliminar"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
            </div>
        `;
        grid.appendChild(item);
    });

    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = new Sortable(grid, {
        animation: 150,
        ghostClass: 'ghost',
        filter: '.action-btn',
        onEnd: function () {
            updateLocalDataFromGrid();
        }
    });
}

function updateLocalDataFromGrid() {
    if (!currentGalleryId) return;
    const grid = document.getElementById('sortable-grid');
    const newOrder = Array.from(grid.children).map(child => child.dataset.img);
    
    let oldOrder = [];
    if (currentGalleryId === 'favourites') {
        oldOrder = (apiData.favourites || []).map(f => typeof f === 'string' ? f : f.src);
    } else {
        const gallery = apiData.galleries.find(g => g.id === currentGalleryId);
        if (gallery) {
            oldOrder = gallery.images || [];
        }
    }

    // Comparar si el orden realmente cambió
    const orderChanged = oldOrder.length !== newOrder.length || newOrder.some((img, idx) => img !== oldOrder[idx]);
    if (!orderChanged) return;

    if (currentGalleryId === 'favourites') {
        apiData.favourites = newOrder;
        const favGallery = apiData.galleries.find(g => g.id === 'favourites');
        if (favGallery) favGallery.images = newOrder;
    } else {
        const gallery = apiData.galleries.find(g => g.id === currentGalleryId);
        if (gallery) {
            gallery.images = newOrder;
        }
    }
    saveOrder();
}

async function saveOrder() {
    try {
        await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ galleries: apiData.galleries, favourites: apiData.favourites })
        });
        showToast("Orden guardado. (No olvides hacer Build al terminar)", "success");
    } catch (e) {
        showToast("Error al guardar", "error");
    }
}

function handleDragOver(e) { e.preventDefault(); document.getElementById('upload-section').classList.add('dragover'); }
function handleDragLeave(e) { e.preventDefault(); document.getElementById('upload-section').classList.remove('dragover'); }
function handleDrop(e) {
    e.preventDefault();
    document.getElementById('upload-section').classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
}
function handleFileSelect(e) {
    if (e.target.files.length > 0) uploadFiles(e.target.files);
}

async function uploadFiles(fileList) {
    if (!currentGalleryId || currentGalleryId === 'favourites') return;
    
    const formData = new FormData();
    formData.append('galleryId', currentGalleryId);
    for (let i = 0; i < fileList.length; i++) {
        formData.append('photos', fileList[i]);
    }

    showLoader("Subiendo fotos...");
    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            showToast(`¡Subidas ${data.files.length} fotos! Ejecuta "Build" para optimizarlas.`, "success");
            
            const grid = document.getElementById('sortable-grid');
            data.files.forEach(filename => {
                const item = document.createElement('div');
                item.className = 'grid-item';
                item.dataset.img = filename;
                item.innerHTML = `<img src="/images/${currentGalleryId}/${filename}" loading="lazy">`;
                grid.appendChild(item);
                
                const gallery = apiData.galleries.find(g => g.id === currentGalleryId);
                if (gallery) gallery.images.push(filename);
            });
            if (apiData.galleries.find(g => g.id === currentGalleryId)) {
                saveOrder();
            }
        }
    } catch (e) {
        showToast("Error al subir", "error");
    }
    hideLoader();
}

async function createGallery() {
    const input = document.getElementById('new-gallery-id');
    const id = input.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!id) return;

    try {
        const res = await fetch('/api/gallery/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ galleryId: id })
        });
        if (res.ok) {
            document.getElementById('new-gallery-dialog').close();
            input.value = '';
            await init(true);
            loadGallery(id);
            showToast("¡Galería creada! Arrastra fotos para empezar.", "success");
        }
    } catch (e) {
        showToast("Error al crear la galería", "error");
    }
}

async function buildProject() {
    showLoader("Construyendo y optimizando fotos...");
    try {
        const res = await fetch('/api/build', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast("¡Optimización completada!", "success");
            await init(true); 
        } else {
            showToast("Error en Build. Revisa la consola.", "error");
        }
    } catch (e) {
        showToast("Error de conexión", "error");
    }
    hideLoader();
}

async function deletePhoto(photo) {
    if (currentGalleryId !== 'favourites') {
        if (!confirm("¿Seguro que quieres borrar esta foto de tu disco duro? Esta acción no se puede deshacer.")) return;
    } else {
        if (!confirm("¿Quitar esta foto de tus favoritos?")) return;
    }
    
    showLoader("Eliminando...");
    try {
        const res = await fetch('/api/photo/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ galleryId: currentGalleryId, photo })
        });
        if (res.ok) {
            await init(true);
            loadGallery(currentGalleryId);
            showToast("Foto eliminada", "success");
        }
    } catch (e) {
        showToast("Error al eliminar", "error");
    }
    hideLoader();
}

async function toggleFavourite(photo, itemElement) {
    const srcPath = `${currentGalleryId}/${photo}`;
    const isFav = apiData.favourites && apiData.favourites.some(f => (typeof f === 'string' ? f : f.src) === srcPath);
    
    // 1. Actualización optimista inmediata
    updateFavouriteUI(itemElement, photo, !isFav);
    if (!isFav) {
        apiData.favourites.push(srcPath);
        // También agregarlo al objeto gallery de apiData por si acaso se vuelve a renderizar
        const favGallery = apiData.galleries.find(g => g.id === 'favourites');
        if (favGallery) {
            if (!favGallery.images) favGallery.images = [];
            favGallery.images.push(srcPath);
        }
    } else {
        apiData.favourites = apiData.favourites.filter(f => (typeof f === 'string' ? f : f.src) !== srcPath);
        const favGallery = apiData.galleries.find(g => g.id === 'favourites');
        if (favGallery && favGallery.images) {
            favGallery.images = favGallery.images.filter(f => (typeof f === 'string' ? f : f.src) !== srcPath);
        }
    }

    try {
        const res = await fetch('/api/photo/toggle-favourite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ galleryId: currentGalleryId, photo })
        });
        if (res.ok) {
            showToast("Favorito actualizado", "success");
        } else {
            throw new Error("Failed to save favourite state");
        }
    } catch (e) {
        // 3. Revertir en caso de error
        updateFavouriteUI(itemElement, photo, isFav);
        if (isFav) {
            apiData.favourites.push(srcPath);
            const favGallery = apiData.galleries.find(g => g.id === 'favourites');
            if (favGallery) {
                if (!favGallery.images) favGallery.images = [];
                favGallery.images.push(srcPath);
            }
        } else {
            apiData.favourites = apiData.favourites.filter(f => (typeof f === 'string' ? f : f.src) !== srcPath);
            const favGallery = apiData.galleries.find(g => g.id === 'favourites');
            if (favGallery && favGallery.images) {
                favGallery.images = favGallery.images.filter(f => (typeof f === 'string' ? f : f.src) !== srcPath);
            }
        }
        showToast("Error al actualizar favorito", "error");
    }
}

function updateFavouriteUI(itemElement, photo, isFav) {
    // Actualiza botón de corazón
    const favBtn = itemElement.querySelector('.fav-btn');
    if (favBtn) {
        favBtn.classList.toggle('fav-active', isFav);
        const svg = favBtn.querySelector('svg');
        if (svg) {
            svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
        }
    }
    // Actualiza badge visible (sólo si no estamos en favoritos, lo cual ya se valida al llamar toggle)
    if (currentGalleryId !== 'favourites') {
        let badge = itemElement.querySelector('.badge-fav');
        if (isFav && !badge) {
            badge = document.createElement('div');
            badge.className = 'badge-fav';
            badge.textContent = '❤';
            itemElement.prepend(badge);
        } else if (!isFav && badge) {
            badge.remove();
        }
    }
}

async function toggleFeatured(photo, itemElement) {
    // Optimistic UI update
    const featuredBtn = itemElement.querySelector('.featured-btn');
    let badge = itemElement.querySelector('.badge-featured');
    const wasActive = featuredBtn && featuredBtn.classList.contains('featured-active');
    const newState = !wasActive;

    if (featuredBtn) {
        featuredBtn.classList.toggle('featured-active', newState);
        const svg = featuredBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', newState ? 'currentColor' : 'none');
    }
    if (newState && !badge) {
        badge = document.createElement('div');
        badge.className = 'badge-featured';
        badge.textContent = '★ Destacada';
        itemElement.prepend(badge);
    } else if (!newState && badge) {
        badge.remove();
    }

    // Update local data
    if (apiData.favourites) {
        apiData.favourites = apiData.favourites.map(f => {
            const src = typeof f === 'string' ? f : f.src;
            if (src === photo) {
                return { src, featured: newState };
            }
            return typeof f === 'string' ? { src: f } : f;
        });
    }

    try {
        const res = await fetch('/api/photo/toggle-featured', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photo })
        });
        if (res.ok) {
            showToast(newState ? "Marcada como destacada" : "Destacada quitada", "success");
        } else {
            throw new Error("Failed");
        }
    } catch (e) {
        // Revert on error
        if (featuredBtn) {
            featuredBtn.classList.toggle('featured-active', wasActive);
            const svg = featuredBtn.querySelector('svg');
            if (svg) svg.setAttribute('fill', wasActive ? 'currentColor' : 'none');
        }
        badge = itemElement.querySelector('.badge-featured');
        if (wasActive && !badge) {
            badge = document.createElement('div');
            badge.className = 'badge-featured';
            badge.textContent = '★ Destacada';
            itemElement.prepend(badge);
        } else if (!wasActive && badge) {
            badge.remove();
        }
        showToast("Error al actualizar destacada", "error");
    }
}

async function setCover(photo) {
    showLoader("Estableciendo portada...");
    try {
        const res = await fetch('/api/gallery/set-cover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ galleryId: currentGalleryId, photo })
        });
        if (res.ok) {
            await init(true);
            loadGallery(currentGalleryId);
            showToast("Portada actualizada", "success");
        }
    } catch (e) {
        showToast("Error al establecer portada", "error");
    }
    hideLoader();
}

function showLoader(text) {
    document.getElementById('loader-text').innerText = text;
    document.getElementById('loader').classList.add('active');
}
function hideLoader() {
    document.getElementById('loader').classList.remove('active');
}
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

init();
