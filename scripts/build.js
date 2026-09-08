const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const { mergeSizes, SIZES_FILE } = require('./lib/image-sizes');
const { VARIANT_WIDTHS, variantName, isVariant } = require('./lib/variants');

const IMAGES_DIR = path.join(__dirname, '../images');
const ORIGINALS_DIR = path.join(__dirname, '../originals');
const DATA_DIR = path.join(__dirname, '../data');

// Promise concurrency limiter
function limitConcurrency(concurrency) {
  let activeCount = 0;
  const queue = [];
  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      const { task, resolve, reject } = queue.shift();
      runTask(task, resolve, reject);
    }
  };
  const runTask = async (task, resolve, reject) => {
    activeCount++;
    try {
      const result = await task();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      next();
    }
  };
  return (task) => {
    return new Promise((resolve, reject) => {
      if (activeCount < concurrency) {
        runTask(task, resolve, reject);
      } else {
        queue.push({ task, resolve, reject });
      }
    });
  };
}

// Helper to capitalize titles nicely
function formatTitle(folderName) {
  return folderName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Generate descriptive text based on folder (since we don't have descriptions yet)
function getDescription(folderName) {
  if (['japan', 'italy', 'new-york'].includes(folderName)) {
    return 'Photography - Real World';
  }
  return 'In-Game Photography';
}

function getCategory(folderName) {
  if (['japan', 'italy', 'new-york'].includes(folderName)) {
    return 'photography';
  }
  return 'in-game';
}

// Genera las variantes reducidas junto al fichero base. withoutEnlargement
// evita crear una "variante" mayor que el original en fotos pequeñas.
async function writeVariants(sourcePath, folderPath, largeWebpName, sourceWidth) {
  for (const width of VARIANT_WIDTHS) {
    if (sourceWidth && sourceWidth <= width) continue;
    const target = path.join(folderPath, variantName(largeWebpName, width));
    await sharp(sourcePath)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(target);
  }
}

async function build() {
  console.log('Starting image optimization and data generation...');
  
  // Ensure data and originals dirs exist
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(ORIGINALS_DIR, { recursive: true });

  let existingGalleries = [];
  try {
    const jsonPath = path.join(DATA_DIR, 'galleries.json');
    const content = await fs.readFile(jsonPath, 'utf-8');
    existingGalleries = JSON.parse(content);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('Warning: Could not parse galleries.json. Proceeding with empty state.', err.message);
    }
  }

  const galleries = [];
  const discoveredSizes = {};
  const folders = await fs.readdir(IMAGES_DIR);

  for (const folder of folders) {
    const folderPath = path.join(IMAGES_DIR, folder);
    const stat = await fs.stat(folderPath);

    if (!stat.isDirectory() || folder === 'favourites') continue;

    console.log(`Processing gallery: ${folder}`);
    const originalGalleryDir = path.join(ORIGINALS_DIR, folder);
    await fs.mkdir(originalGalleryDir, { recursive: true });

    const files = await fs.readdir(folderPath);
    const imageFiles = files.filter(f => /\.(jpe?g|png|webp)$/i.test(f) && !f.startsWith('thumb_') && !isVariant(f))
      .sort((a, b) => {
        if (a.includes('-caratula')) return -1;
        if (b.includes('-caratula')) return 1;
        return a.localeCompare(b);
      });
    
    if (imageFiles.length === 0) {
      console.log(`  No images found in ${folder}, skipping.`);
      continue;
    }

    const processedImages = [];
    let coverImage = '';
    
    const limit = limitConcurrency(10); // Process 10 images concurrently

    const tasks = imageFiles.map(file => limit(async () => {
      const filePath = path.join(folderPath, file);
      const fileExt = path.extname(file);
      const baseName = path.basename(file, fileExt);
      
      const largeWebpName = fileExt.toLowerCase() === '.webp' ? file : `${baseName}.webp`;
      
      const largePath = path.join(folderPath, largeWebpName);
      const originalBackupPath = path.join(originalGalleryDir, file);

      if (fileExt.toLowerCase() === '.webp') {
        try {
          const meta = await sharp(filePath).metadata();
          await writeVariants(filePath, folderPath, largeWebpName, meta.width);
          return { success: true, file, largeWebpName, width: meta.width, height: meta.height };
        } catch (err) {
          console.error(`  Error processing ${file}:`, err);
          return { success: false, file };
        }
      }

      try {
        // Convert to large WebP (max width 1920px)
        await sharp(filePath)
          .rotate()
          .resize({ width: 1920, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(largePath);

        // Move original to backup folder
        await fs.rename(filePath, originalBackupPath);

        const meta = await sharp(largePath).metadata();
        await writeVariants(largePath, folderPath, largeWebpName, meta.width);
        return { success: true, file, largeWebpName, width: meta.width, height: meta.height };
      } catch (err) {
        console.error(`  Error processing ${file}:`, err);
        return { success: false, file };
      }
    }));

    const results = await Promise.all(tasks);
    
    for (const result of results) {
      if (result.success) {
        processedImages.push(result.largeWebpName);
        if (result.width && result.height) {
          discoveredSizes[`${folder}/${result.largeWebpName}`] = { w: result.width, h: result.height };
        }
        if (!coverImage) {
          coverImage = `images/${folder}/${result.largeWebpName}`;
        }
      }
    }

    if (processedImages.length > 0) {
      const existingGallery = existingGalleries.find(g => g.id === folder);
      
      if (existingGallery && existingGallery.images) {
        // Create an index map to preserve order
        const orderMap = new Map();
        existingGallery.images.forEach((img, idx) => orderMap.set(img, idx));
        
        processedImages.sort((a, b) => {
          const indexA = orderMap.has(a) ? orderMap.get(a) : Infinity;
          const indexB = orderMap.has(b) ? orderMap.get(b) : Infinity;
          if (indexA !== Infinity || indexB !== Infinity) {
             return indexA - indexB;
          }
          if (a.includes('-caratula')) return -1;
          if (b.includes('-caratula')) return 1;
          return a.localeCompare(b);
        });

        // Preserve coverImage if it's still valid
        if (existingGallery.coverImage && processedImages.includes(path.basename(existingGallery.coverImage))) {
            coverImage = existingGallery.coverImage;
        }
      }

      galleries.push({
        id: folder,
        title: formatTitle(folder),
        description: getDescription(folder),
        category: getCategory(folder),
        coverImage: coverImage,
        images: processedImages
      });
      console.log(`  Processed ${processedImages.length} images for ${folder}`);
    }
  }

  // Add favourites gallery from data/favourites.json if exists
  try {
    const favPath = path.join(DATA_DIR, 'favourites.json');
    const favContent = await fs.readFile(favPath, 'utf-8');
    const favDataRaw = JSON.parse(favContent);
    
    // Normalize to objects for internal use
    const favData = favDataRaw.map(f => typeof f === 'string' ? { src: f } : f);
    
    // Find cover image (prefer japan-caratula if it exists, else first image)
    const coverObj = favData.find(f => f.src.includes('japan-caratula')) || favData[0];
    const coverPath = coverObj ? coverObj.src : '';
    
    galleries.unshift({
      id: 'favourites',
      title: 'Favourites',
      description: 'A curated collection of my favourite shots',
      category: 'featured',
      coverImage: coverPath ? `images/${coverPath}` : '',
      images: favData
    });
    console.log(`Added favourites gallery with ${favData.length} images`);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('Warning: Could not parse favourites.json. Proceeding without favourites.', err.message);
    } else {
      console.log('No data/favourites.json found, skipping favourites gallery.');
    }
  }

  // Mapa de dimensiones: lo consume el frontend para conocer la relación de
  // aspecto antes de que la imagen cargue.
  const sizesPath = path.join(DATA_DIR, SIZES_FILE);
  let previousSizes = {};
  try {
    previousSizes = JSON.parse(await fs.readFile(sizesPath, 'utf-8'));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`Warning: no se pudo leer ${SIZES_FILE}, se regenera desde cero.`, err.message);
    }
  }
  const sizes = mergeSizes(previousSizes, discoveredSizes);
  await fs.writeFile(sizesPath, JSON.stringify(sizes, null, 2));
  console.log(`Wrote ${Object.keys(sizes).length} image sizes to ${sizesPath}`);

  // Write the JSON data file
  const jsonPath = path.join(DATA_DIR, 'galleries.json');
  await fs.writeFile(jsonPath, JSON.stringify(galleries, null, 2));
  console.log(`\nSuccessfully wrote gallery data to ${jsonPath}`);

  // El hero de index.html apunta a un fichero fijo. Avisar si desaparece.
  const HERO_IMAGE = 'spider-man-miles-morales/spider-man-miles-morales-01.webp';
  try {
    await fs.access(path.join(IMAGES_DIR, HERO_IMAGE));
  } catch (err) {
    console.warn(`\nAviso: falta ${HERO_IMAGE}, que index.html usa como hero. Actualiza el marcado o restaura la foto.`);
  }

  console.log('Build complete!');
}

build().catch(console.error);
