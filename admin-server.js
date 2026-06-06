const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { spawn } = require('child_process');

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
app.use(express.static(__dirname)); // Serve files so images can be loaded in UI

// Configuration for Multer (File Uploads)
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const galleryId = req.body.galleryId;
    if (galleryId === 'favourites') {
        return cb(new Error("No puedes subir fotos directamente a favoritos. Súbelas a una galería específica primero."));
    }
    const dir = path.join(__dirname, 'images', galleryId);
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Routes

// 1. Get current data
app.get('/api/data', async (req, res) => {
    try {
        let galleriesData = [];
        let favouritesData = [];
        
        try { galleriesData = JSON.parse(await fs.readFile(path.join(__dirname, 'data', 'galleries.json'), 'utf-8')); } catch(e) {}
        try { favouritesData = JSON.parse(await fs.readFile(path.join(__dirname, 'data', 'favourites.json'), 'utf-8')); } catch(e) {}
        
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
            if (galleries) {
                await fs.writeFile(path.join(__dirname, 'data', 'galleries.json'), JSON.stringify(galleries, null, 2));
            }
            if (favourites) {
                await fs.writeFile(path.join(__dirname, 'data', 'favourites.json'), JSON.stringify(favourites, null, 2));
            }
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
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
        const { galleryId } = req.body;
        if (!galleryId || galleryId === 'favourites') throw new Error("ID de galería inválido");
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
            const { galleryId, photo } = req.body;
            if (!galleryId || !photo) throw new Error("Missing parameters");

            let favouritesData = [];
            try { favouritesData = JSON.parse(await fs.readFile(path.join(__dirname, 'data', 'favourites.json'), 'utf-8')); } catch(e) {}
            
            let galleriesData = [];
            try { galleriesData = JSON.parse(await fs.readFile(path.join(__dirname, 'data', 'galleries.json'), 'utf-8')); } catch(e) {}

            if (galleryId === 'favourites') {
                favouritesData = favouritesData.filter(f => {
                    const src = typeof f === 'string' ? f : f.src;
                    return src !== photo;
                });
                await fs.writeFile(path.join(__dirname, 'data', 'favourites.json'), JSON.stringify(favouritesData, null, 2));
                
                const favGallery = galleriesData.find(g => g.id === 'favourites');
                if (favGallery) {
                    favGallery.images = favGallery.images.filter(img => img !== photo);
                    await fs.writeFile(path.join(__dirname, 'data', 'galleries.json'), JSON.stringify(galleriesData, null, 2));
                }
            } else {
                const filePath = path.join(__dirname, 'images', galleryId, photo);
                try { await fs.unlink(filePath); } catch(e) { console.log("File not found to delete:", filePath); }
                
                const gallery = galleriesData.find(g => g.id === galleryId);
                if (gallery) {
                    gallery.images = gallery.images.filter(img => img !== photo);
                    await fs.writeFile(path.join(__dirname, 'data', 'galleries.json'), JSON.stringify(galleriesData, null, 2));
                }
                
                const srcPath = `${galleryId}/${photo}`;
                let removedFromFavs = false;
                favouritesData = favouritesData.filter(f => {
                    const src = typeof f === 'string' ? f : f.src;
                    if (src === srcPath) { removedFromFavs = true; return false; }
                    return true;
                });
                if (removedFromFavs) {
                    await fs.writeFile(path.join(__dirname, 'data', 'favourites.json'), JSON.stringify(favouritesData, null, 2));
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
            const { galleryId, photo } = req.body;
            if (!galleryId || !photo || galleryId === 'favourites') throw new Error("Invalid parameters");
            
            const srcPath = `${galleryId}/${photo}`;
            let favouritesData = [];
            try { favouritesData = JSON.parse(await fs.readFile(path.join(__dirname, 'data', 'favourites.json'), 'utf-8')); } catch(e) {}
            
            const isFav = favouritesData.some(f => (typeof f === 'string' ? f : f.src) === srcPath);
            if (isFav) {
                favouritesData = favouritesData.filter(f => (typeof f === 'string' ? f : f.src) !== srcPath);
            } else {
                favouritesData.push(srcPath);
            }
            await fs.writeFile(path.join(__dirname, 'data', 'favourites.json'), JSON.stringify(favouritesData, null, 2));
            
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
            
            let favouritesData = [];
            try { favouritesData = JSON.parse(await fs.readFile(path.join(__dirname, 'data', 'favourites.json'), 'utf-8')); } catch(e) {}
            
            // Normalize all entries to objects
            favouritesData = favouritesData.map(f => typeof f === 'string' ? { src: f } : f);
            
            const entry = favouritesData.find(f => f.src === photo);
            if (!entry) {
                return res.status(404).json({ error: "Photo not found in favourites" });
            }
            
            entry.featured = !entry.featured;
            
            await fs.writeFile(path.join(__dirname, 'data', 'favourites.json'), JSON.stringify(favouritesData, null, 2));
            
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
            const { galleryId, photo } = req.body;
            if (!galleryId || !photo) throw new Error("Missing parameters");
            
            let galleriesData = [];
            try { galleriesData = JSON.parse(await fs.readFile(path.join(__dirname, 'data', 'galleries.json'), 'utf-8')); } catch(e) {}
            
            const gallery = galleriesData.find(g => g.id === galleryId);
            if (gallery) {
                if (galleryId === 'favourites') {
                    gallery.coverImage = `images/${photo}`;
                } else {
                    gallery.coverImage = `images/${galleryId}/${photo}`;
                }
                await fs.writeFile(path.join(__dirname, 'data', 'galleries.json'), JSON.stringify(galleriesData, null, 2));
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

// Start Server
app.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`📸 Local Photo CMS is running!`);
    console.log(`➡️  Open your browser and go to: http://localhost:${port}/admin`);
    console.log(`======================================================\n`);
});
