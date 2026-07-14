const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Simple image compression script using ImageMagick
// Run with: node scripts/compress-images.js

const imageDirs = [
  'frontend/data/products',
  'frontend/data/hero',
  'frontend/data/banners'
];

const compressImage = (inputPath, outputPath) => {
  try {
    // Create compressed WebP version for listings
    const webpOutput = outputPath.replace(/\.(png|jpg|jpeg)$/i, '_listing.webp');
    execSync(`magick "${inputPath}" -quality 75 -resize 800x800\> "${webpOutput}"`);

    // Create compressed PNG version for listings (fallback)
    const pngOutput = outputPath.replace(/\.(png|jpg|jpeg)$/i, '_listing.png');
    execSync(`magick "${inputPath}" -quality 80 -resize 800x800\> "${pngOutput}"`);

    console.log(`✓ Compressed: ${path.basename(inputPath)}`);
  } catch (error) {
    console.log(`✗ Failed to compress: ${path.basename(inputPath)} - ${error.message}`);
  }
};

const processDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    console.log(`Directory not found: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath);
  const imageFiles = files.filter(file =>
    /\.(png|jpg|jpeg)$/i.test(file) &&
    !file.includes('_listing') &&
    !file.includes('_compressed')
  );

  imageFiles.forEach(file => {
    const inputPath = path.join(dirPath, file);
    const outputPath = path.join(dirPath, file);
    compressImage(inputPath, outputPath);
  });
};

console.log('Starting image compression...');
imageDirs.forEach(dir => {
  console.log(`\nProcessing ${dir}...`);
  processDirectory(dir);
});

console.log('\nImage compression completed!');
console.log('Note: Make sure ImageMagick is installed on your system.');
console.log('Install with: brew install imagemagick (macOS) or apt-get install imagemagick (Ubuntu)');


