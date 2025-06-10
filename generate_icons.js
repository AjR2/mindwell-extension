const fs = require('fs');
const { createCanvas } = require('canvas');

// Create assets directory if it doesn't exist
const assetsDir = './assets/icons';
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Sizes needed for Chrome extension
const sizes = [16, 48, 128];

sizes.forEach(size => {
  // Create a canvas
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Draw a simple colored circle with MW text
  const center = size / 2;
  const radius = size * 0.4;
  
  // Background
  ctx.fillStyle = '#4a90e2';
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Text (only for larger icons)
  if (size >= 48) {
    ctx.fillStyle = '#ffffff';
    const fontSize = size * 0.6;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MW', center, center);
  }
  
  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`${assetsDir}/icon${size}.png`, buffer);
});

console.log('Icons generated successfully!');
