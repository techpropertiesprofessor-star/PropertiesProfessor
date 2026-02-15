/**
 * Simple PWA Icon Generator - no dependencies required
 * Creates minimal valid PNG icons with "PP" branding
 * Run: node generate-icons-simple.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create SVG template and convert to PNG via data URI
// For environments without canvas, we create SVG icons
sizes.forEach((size) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#3B82F6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.15)}" fill="url(#bg)"/>
  <text x="50%" y="52%" font-family="Arial,sans-serif" font-weight="bold" font-size="${Math.floor(size * 0.38)}" fill="white" text-anchor="middle" dominant-baseline="middle">PP</text>
</svg>`;
  
  const filePath = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filePath, svg);
  console.log(`Generated SVG: ${filePath}`);
});

console.log('\nAll PWA icons generated as SVG!');
console.log('Note: Update manifest.json to use .svg extension and type "image/svg+xml" if needed.');
