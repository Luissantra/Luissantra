const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { spawn } = require('child_process');
const {
  safeSegment,
  safeFilename,
  safeRelativeImagePath,
  normalizeUploadFilename,
  dedupeFilename
} = require('./scripts/lib/safe-path');
const { VARIANT_WIDTHS, variantName } = require('./scripts/lib/variants');

class AsyncQueue {
  constructor() {
    this.promise = Promise.resolve();
  }
  enqueue(task) {
    return new Promise((resolve, reject) => {
      this.promise = this.promise.then(() => {
        return task().then(resolve).catch(reject);
      });
    });
  }
}
const dbQueue = new AsyncQueue();

const app = express();
const port = 3030;

app.use(express.json({ limit: '50mb' }));
// Solo lo que el panel necesita cargar por HTTP. Servir __dirname entero
// publicaría .git, node_modules y los JSON de datos.
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/tools/admin', express.static(path.join(__dirname, 'tools', 'admin')));

// Configuration for Multer (File Uploads)
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      const galleryId = safeSegment(req.body.galleryId);
      if (galleryId === 'favourites') {
        throw new Error('No puedes subir fotos directamente a favoritos. Súbelas a una galería específica primero.');
      }
      const dir = path.join(__dirname, 'images', galleryId);
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (e) {
      cb(e);
    }
  },
  // Normaliza en vez de rechazar: el formato de captura de PlayStation
  // ("Ghost of Tsushima_20240115181523.jpg") y nombres similares con
  // espacios, acentos o símbolos no pasan safeFilename, pero no son
  // maliciosos. normalizeUploadFilename los transcribe a algo que sí pasa
  // safeFilename por construcción. safeFilename ya solo se usa aquí en
  // /api/photo/delete, /api/photo/toggle-favourite y /api/gallery/set-cover,
  // que reciben nombres de ficheros que YA existen en disco: ahí seguir
  // validando (y rechazando) es lo correcto.
  filename: async function (req, file, cb) {
    try {
      const galleryId = safeSegment(req.body.galleryId);
      const normalized = normalizeUploadFilename(file.originalname);

      // Recuerda qué nombres están ocupados en este mismo lote (además de en
      // disco) para que dos capturas que normalicen al mismo nombre no se
      // pisen entre sí en una sola subida.
      if (!req.__uploadTakenNames) {
        let existing = [];
        try {
          existing = await fs.readdir(path.join(__dirname, 'images', galleryId));
        } catch (e) {
          existing = [];
        }
        req.__uploadTakenNames = new Set(existing);
      }

      cb(null, dedupeFilename(normalized, req.__uploadTakenNames));
    } catch (e) {
      cb(e);
    }
  }
});

const upload = multer({ storage: storage });

// Helpers for DRY JSON read/write
async function readJsonFile(filename, defaultData = []) {
    let content;
    try {
        content = await fs.readFile(path.join(__dirname, 'data', filename), 'utf-8');
    } catch (e) {
        // Fichero ausente: es el arranque normal antes del primer build o
        // guardado, así que el valor por defecto es correcto.
        if (e.code === 'ENOENT') return defaultData;
        throw e;
    }
    try {
        return JSON.parse(content);
    } catch (e) {
        // El fichero existe pero está corrupto. Degradar en silencio al
        // valor por defecto arrancaría el CMS con estado vacío, y el
        // siguiente guardado escribiría ese vacío encima con HTTP 200 y sin
        // aviso: hay que distinguir "ausente" de "ilegible" y propagar.
        throw new Error(`El fichero de datos "${filename}" existe pero no contiene JSON válido: ${e.message}`);
    }
}

async function writeJsonFile(filename, data) {
    await fs.writeFile(path.join(__dirname, 'data', filename), JSON.stringify(data, null, 2));
}

// Valida la forma de una entrada de imagen (galleries[i].images[j] o
// favourites[i]): puede ser una cadena o un objeto { src, featured }. La
// mitad "featured", si está presente, debe ser boolean.
function validateImageEntry(galleryId, entry, label) {
    const src = typeof entry === 'string' ? entry : (entry && typeof entry === 'object' && !Array.isArray(entry) ? entry.src : undefined);
    if (typeof src !== 'string') {
        throw new Error(`${label} no tiene una ruta de imagen válida`);
    }
    // La galería "favourites" (tanto la propia lista de favourites.json como
    // la galería sintética del mismo id dentro de galleries.json) usa rutas
    // "galeria/fichero"; el resto de galerías usan nombres de fichero sueltos.
    if (galleryId === 'favourites') {
        safeRelativeImagePath(src);
    } else {
        safeFilename(src);
    }
    if (entry && typeof entry === 'object' && !Array.isArray(entry) && 'featured' in entry && typeof entry.featured !== 'boolean') {
        throw new Error(`${label}.featured debe ser boolean`);
    }
}

// Valida galleries.json completo antes de escribir nada. Lanza en el primer
// problema con un mensaje que dice exactamente qué entrada falló.
function validateGalleries(galleries) {
    if (!Array.isArray(galleries)) {
        throw new Error('galleries debe ser un array');
    }
    galleries.forEach((gallery, i) => {
        if (!gallery || typeof gallery !== 'object' || Array.isArray(gallery)) {
            throw new Error(`galleries[${i}] debe ser un objeto`);
        }
        let galleryId;
        try {
            galleryId = safeSegment(gallery.id);
        } catch (e) {
            throw new Error(`galleries[${i}].id: ${e.message}`);
        }
        if (!Array.isArray(gallery.images)) {
            throw new Error(`galleries[${i}].images debe ser un array`);
        }
        gallery.images.forEach((img, j) => {
            validateImageEntry(galleryId, img, `galleries[${i}].images[${j}]`);
        });
    });
}

// Valida favourites.json completo antes de escribir nada. Las rutas ahí
// siempre son del tipo "galeria/fichero", nunca nombres sueltos.
function validateFavourites(favourites) {
    if (!Array.isArray(favourites)) {
        throw new Error('favourites debe ser un array');
    }
    favourites.forEach((entry, i) => {
        validateImageEntry('favourites', entry, `favourites[${i}]`);
    });
}

// Routes

// 1. Get current data
app.get('/api/data', async (req, res) => {
    try {
        const galleriesData = await readJsonFile('galleries.json');
        const favouritesData = await readJsonFile('favourites.json');
        
        // Also get list of folders in images/
        const folders = await fs.readdir(path.join(__dirname, 'images'), { withFileTypes: true });
        const availableFolders = folders
            .filter(dirent => dirent.isDirectory() && dirent.name !== 'favourites')
            .map(dirent => dirent.name);

        res.json({ galleries: galleriesData, favourites: favouritesData, availableFolders });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. Save order and data
app.post('/api/save', async (req, res) => {
    dbQueue.enqueue(async () => {
        try {
            const { galleries, favourites } = req.body;
            // Validar TODO antes de escribir NADA: un guardado parcial (p.ej.
            // galleries.json válido pero favourites.json corrupto) sería peor
            // que rechazar la petición entera, porque el frontend confía en
            // que estos dos ficheros son datos bien formados.
            if (galleries !== undefined) validateGalleries(galleries);
            if (favourites !== undefined) validateFavourites(favourites);

            if (galleries !== undefined) await writeJsonFile('galleries.json', galleries);
            if (favourites !== undefined) await writeJsonFile('favourites.json', favourites);
            res.json({ success: true });
        } catch (e) {
            res.status(400).json({ error: e.message });
        }
    });
});

// 3. Upload photos
app.post('/api/upload', upload.array('photos'), (req, res) => {
    res.json({ success: true, files: req.files.map(f => f.filename) });
});

// 4. Create new gallery folder
app.post('/api/gallery/new', async (req, res) => {
    try {
        const galleryId = safeSegment(req.body.galleryId);
        if (galleryId === 'favourites') throw new Error('ID de galería inválido');
        const dir = path.join(__dirname, 'images', galleryId);
        await fs.mkdir(dir, { recursive: true });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6. Delete photo
app.post('/api/photo/delete', async (req, res) => {
    dbQueue.enqueue(async () => {
        try {
            const galleryId = safeSegment(req.body.galleryId);
            const photo = galleryId === 'favourites'
              ? String(req.body.photo)
              : safeFilename(req.body.photo);

            let favouritesData = await readJsonFile('favourites.json');
            let galleriesData = await readJsonFile('galleries.json');

            if (galleryId === 'favourites') {
                favouritesData = favouritesData.filter(f => {
                    const src = typeof f === 'string' ? f : f.src;
                    return src !== photo;
                });
                await writeJsonFile('favourites.json', favouritesData);
                
                const favGallery = galleriesData.find(g => g.id === 'favourites');
                if (favGallery) {
                    favGallery.images = favGallery.images.filter(img => img !== photo);
                    await writeJsonFile('galleries.json', galleriesData);
                }
            } else {
                const targets = [photo, ...VARIANT_WIDTHS.map(w => variantName(photo, w))];
                for (const name of targets) {
                    const filePath = path.join(__dirname, 'images', galleryId, name);
                    try {
                        await fs.unlink(filePath);
                    } catch (e) {
                        if (e.code !== 'ENOENT') console.log('No se pudo borrar:', filePath, e.message);
                    }
                }

                const gallery = galleriesData.find(g => g.id === galleryId);
                if (gallery) {
                    gallery.images = gallery.images.filter(img => img !== photo);
                    await writeJsonFile('galleries.json', galleriesData);
                }
                
                const srcPath = `${galleryId}/${photo}`;
                let removedFromFavs = false;
                favouritesData = favouritesData.filter(f => {
                    const src = typeof f === 'string' ? f : f.src;
                    if (src === srcPath) { removedFromFavs = true; return false; }
                    return true;
                });
                if (removedFromFavs) {
                    await writeJsonFile('favourites.json', favouritesData);
                }
            }
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
});

// 7. Toggle favourite
app.post('/api/photo/toggle-favourite', async (req, res) => {
    dbQueue.enqueue(async () => {
        try {
            const galleryId = safeSegment(req.body.galleryId);
            const photo = safeFilename(req.body.photo);
            if (galleryId === 'favourites') throw new Error('Invalid parameters');

            const srcPath = `${galleryId}/${photo}`;
            let favouritesData = await readJsonFile('favourites.json');
            
            const isFav = favouritesData.some(f => (typeof f === 'string' ? f : f.src) === srcPath);
            if (isFav) {
                favouritesData = favouritesData.filter(f => (typeof f === 'string' ? f : f.src) !== srcPath);
            } else {
                favouritesData.push(srcPath);
            }
            await writeJsonFile('favourites.json', favouritesData);
            
            res.json({ success: true, isFavourite: !isFav });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
});

// 9. Toggle featured
app.post('/api/photo/toggle-featured', async (req, res) => {
    dbQueue.enqueue(async () => {
        try {
            const { photo } = req.body;
            if (!photo) throw new Error("Missing photo parameter");
            
            let favouritesData = await readJsonFile('favourites.json');
            
            // Normalize all entries to objects
            favouritesData = favouritesData.map(f => typeof f === 'string' ? { src: f } : f);
            
            const entry = favouritesData.find(f => f.src === photo);
            if (!entry) {
                return res.status(404).json({ error: "Photo not found in favourites" });
            }
            
            entry.featured = !entry.featured;
            
            await writeJsonFile('favourites.json', favouritesData);
            
            res.json({ success: true, isFeatured: entry.featured });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
});

// 8. Set Cover
app.post('/api/gallery/set-cover', async (req, res) => {
    dbQueue.enqueue(async () => {
        try {
            const galleryId = safeSegment(req.body.galleryId);
            const photo = galleryId === 'favourites'
              ? String(req.body.photo)
              : safeFilename(req.body.photo);

            let galleriesData = await readJsonFile('galleries.json');
            
            const gallery = galleriesData.find(g => g.id === galleryId);
            if (gallery) {
                if (galleryId === 'favourites') {
                    gallery.coverImage = `images/${photo}`;
                } else {
                    gallery.coverImage = `images/${galleryId}/${photo}`;
                }
                await writeJsonFile('galleries.json', galleriesData);
            }
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
});

// 5. Execute Build Script
app.post('/api/build', (req, res) => {
    console.log("Ejecutando build...");
    const buildProcess = spawn('npm', ['run', 'build'], { cwd: __dirname });
    let output = '';
    
    buildProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log(data.toString());
    });
    
    buildProcess.stderr.on('data', (data) => {
        output += data.toString();
        console.error(data.toString());
    });
    
    buildProcess.on('close', (code) => {
        if (code === 0) {
            res.json({ success: true, output });
        } else {
            res.status(500).json({ success: false, output });
        }
    });
});

// Serve the Admin UI
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'tools', 'admin', 'index.html'));
});

// Manejador de errores centralizado. Los callbacks de multer (destination/filename)
// llaman a cb(e) cuando el sanitizador rechaza galleryId o el nombre de fichero, y eso
// llega aquí vía next(err). Sin este middleware, Express cae en su manejador por defecto:
// HTML 500 con la traza completa, incluidas rutas absolutas del servidor. Debe ir
// registrado después de todas las rutas y antes de app.listen.
// El código de estado respeta err.status/err.statusCode cuando el error ya trae uno
// (por ejemplo el NotFoundError de res.sendFile, que es un 404 real): sin esto, un
// fichero servido con sendFile que no se encuentra se reportaba como 500 en vez de 404.
app.use((err, req, res, next) => {
    res.status(err.status || err.statusCode || 500).json({ error: err.message });
});

// Start Server
app.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`📸 Local Photo CMS is running!`);
    console.log(`➡️  Open your browser and go to: http://localhost:${port}/admin`);
    console.log(`======================================================\n`);
});
