const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SOURCE = path.join(__dirname, 'public', 'applogo.png');
const OUTPUT_DIR = path.join(__dirname, 'public', 'icons');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  // Create icons directory
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Also replace the main logo.png (512x512)
  await sharp(SOURCE)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(__dirname, 'public', 'logo.png'));
  console.log('  -> logo.png (512x512)');

  for (const size of SIZES) {
    const outFile = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    await sharp(SOURCE)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(outFile);
    console.log(`  -> icons/icon-${size}x${size}.png`);
  }

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
