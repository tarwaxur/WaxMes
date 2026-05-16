const fs = require('fs');
const path = require('path');

const SIZES = [64];
const outDir = path.join(__dirname, '..', 'assets');
const icoPath = path.join(outDir, 'icon.ico');

async function generate() {
  let useManual = false;

  try {
    const sharp = require('sharp');

    for (const size of SIZES) {
      const svgIcon = Buffer.from(`
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#2563eb"/>
              <stop offset="100%" stop-color="#6d28d9"/>
            </linearGradient>
          </defs>
          <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#0b101f"/>
          <circle cx="${size * 0.5}" cy="${size * 0.42}" r="${size * 0.38}" fill="url(#g)" opacity=".15"/>
          <rect x="${size * 0.16}" y="${size * 0.28}" width="${size * 0.68}" height="${size * 0.52}" rx="${size * 0.1}" fill="url(#g)" opacity=".95"/>
          <line x1="${size * 0.25}" y1="${size * 0.42}" x2="${size * 0.75}" y2="${size * 0.42}" stroke="white" stroke-width="${size * 0.05}" stroke-linecap="round"/>
          <line x1="${size * 0.25}" y1="${size * 0.54}" x2="${size * 0.62}" y2="${size * 0.54}" stroke="white" stroke-width="${size * 0.05}" stroke-linecap="round"/>
          <line x1="${size * 0.25}" y1="${size * 0.66}" x2="${size * 0.50}" y2="${size * 0.66}" stroke="white" stroke-width="${size * 0.05}" stroke-linecap="round"/>
        </svg>
      `);

      const pngBuffer = await sharp(svgIcon).png().toBuffer();
      useManual = true;
      createIcoFromPng(pngBuffer, size, icoPath);
    }
    console.log('ICO created with sharp:', icoPath);
  } catch (e) {
    console.log('Sharp not available, using manual generation...');
    useManual = true;
  }

  if (useManual && !fs.existsSync(icoPath)) {
    generateManualIco();
  }
}

function createIcoFromPng(pngBuffer, size, outputPath) {
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);

  const ico = Buffer.concat([icoHeader, entry, pngBuffer]);
  fs.writeFileSync(outputPath, ico);
}

function generateManualIco() {
  const size = 64;
  const pixels = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = ((size - 1 - y) * size + x) * 4;
      const cx = size / 2, cy = size / 2 - 2, r = 26;

      let inIcon = false;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= r) {
        const t = (Math.atan2(dy, dx) / Math.PI + 1) / 2;
        pixels[idx] = Math.round(37 + t * 72);
        pixels[idx + 1] = Math.round(99 - t * 59);
        pixels[idx + 2] = Math.round(235 - t * 18);
        pixels[idx + 3] = 255;
        inIcon = true;
      }

      const bx = 12, by = 16, bw = 40, bh = 32, br = 6;
      let inBox = false;
      if (x >= bx && x < bx + bw && y >= by && y < by + bh) {
        const cornerX = x < bx + br ? bx + br : (x > bx + bw - br - 1 ? bx + bw - br - 1 : x);
        const cornerY = y < by + br ? by + br : (y > by + bh - br - 1 ? by + bh - br - 1 : y);
        const d2 = Math.sqrt((x - cornerX) ** 2 + (y - cornerY) ** 2);
        if ((x >= bx + br && x < bx + bw - br) || (y >= by + br && y < by + bh - br) || d2 <= br) {
          inBox = true;
        }
      }

      if (inBox) {
        pixels[idx] = 37; pixels[idx + 1] = 99; pixels[idx + 2] = 235;
        pixels[idx + 3] = 255;
        inIcon = true;
      }

      const lines = [
        { x1: 18, x2: 46, y: 26 },
        { x1: 18, x2: 40, y: 34 },
        { x1: 18, x2: 32, y: 42 },
      ];
      for (const l of lines) {
        if (y === l.y && x >= l.x1 && x <= l.x2 && inBox) {
          pixels[idx] = 255; pixels[idx + 1] = 255; pixels[idx + 2] = 255;
        }
      }

      if (!inIcon) {
        pixels[idx] = 0; pixels[idx + 1] = 0; pixels[idx + 2] = 0; pixels[idx + 3] = 0;
      }
    }
  }

  const bmpHeader = Buffer.alloc(40);
  bmpHeader.writeUInt32LE(40, 0);
  bmpHeader.writeInt32LE(size, 4);
  bmpHeader.writeInt32LE(size * 2, 8);
  bmpHeader.writeUInt16LE(1, 12);
  bmpHeader.writeUInt16LE(32, 14);
  bmpHeader.writeUInt32LE(0, 16);

  const andMask = Buffer.alloc(size * size / 8);
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(1, 4);

  const dataSize = 40 + pixels.length + andMask.length;
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(dataSize, 8);
  entry.writeUInt32LE(22, 12);

  const ico = Buffer.concat([icoHeader, entry, bmpHeader, pixels, andMask]);
  fs.writeFileSync(icoPath, ico);
  console.log('Manual ICO created:', icoPath, `(${ico.length} bytes)`);
}

generate();
