const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, '../images');
const ORIGINALS_DIR = path.join(__dirname, '../originals');
const DATA_DIR = path.join(__dirname, '../data');

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

async function build() {
  console.log('Starting image optimization and data generation...');
  
  // Ensure data and originals dirs exist
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(ORIGINALS_DIR, { recursive: true });

  let existingGalleries = [];
  try {
    const jsonPath = path.join(DATA_DIR, 'galleries.json');
    existingGalleries = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
  } catch (err) { }

  const galleries = [];
  const folders = await fs.readdir(IMAGES_DIR);

  for (const folder of folders) {
    const folderPath = path.join(IMAGES_DIR, folder);
    const stat = await fs.stat(folderPath);

    if (!stat.isDirectory() || folder === 'favourites') continue;

    console.log(`Processing gallery: ${folder}`);
    const originalGalleryDir = path.join(ORIGINALS_DIR, folder);
    await fs.mkdir(originalGalleryDir, { recursive: true });

    const files = await fs.readdir(folderPath);
    const imageFiles = files.filter(f => /\.(jpe?g|png|webp)$/i.test(f) && !f.startsWith('thumb_'))
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

    for (const file of imageFiles) {
      const filePath = path.join(folderPath, file);
      const fileExt = path.extname(file);
      const baseName = path.basename(file, fileExt);
      
      const largeWebpName = fileExt.toLowerCase() === '.webp' ? file : `${baseName}.webp`;
      
      const largePath = path.join(folderPath, largeWebpName);
      const originalBackupPath = path.join(originalGalleryDir, file);

      if (fileExt.toLowerCase() === '.webp') {
        processedImages.push(largeWebpName);
        if (!coverImage) {
          coverImage = `images/${folder}/${largeWebpName}`;
        }
        continue;
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

        processedImages.push(largeWebpName);

        // Set the first image as cover image
        if (!coverImage) {
          coverImage = `images/${folder}/${largeWebpName}`;
        }
        
      } catch (err) {
        console.error(`  Error processing ${file}:`, err);
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
    const favDataRaw = JSON.parse(await fs.readFile(favPath, 'utf-8'));
    
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
    console.log('No data/favourites.json found or error reading it:', err.message);
  }

  // Write the JSON data file
  const jsonPath = path.join(DATA_DIR, 'galleries.json');
  await fs.writeFile(jsonPath, JSON.stringify(galleries, null, 2));
  console.log(`\nSuccessfully wrote gallery data to ${jsonPath}`);
  console.log('Build complete!');
}

build().catch(console.error);
