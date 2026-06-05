const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "build");

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  const out = Buffer.alloc(4);
  out.writeUInt32BE(~crc >>> 0);
  return out;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const name = Buffer.from(type);
  return Buffer.concat([len, name, data, crc32(Buffer.concat([name, data]))]);
}

function pngFromRgba(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    header,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function fillRoundedRect(rgba, size, x, y, w, h, radius, color) {
  const [r, g, b, a] = color;
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const dx = px < x + radius ? x + radius - px : px >= x + w - radius ? px - (x + w - radius - 1) : 0;
      const dy = py < y + radius ? y + radius - py : py >= y + h - radius ? py - (y + h - radius - 1) : 0;
      if (dx * dx + dy * dy > radius * radius) continue;
      const i = (py * size + px) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = a;
    }
  }
}

function drawBar(rgba, size, x, y, w, h, color) {
  fillRoundedRect(rgba, size, x, y, w, h, Math.max(1, Math.floor(h / 2)), color);
}

function makeIconPng(size) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(15 + (124 - 15) * (x / size));
      rgba[i + 1] = Math.round(118 + (58 - 118) * (y / size));
      rgba[i + 2] = Math.round(110 + (237 - 110) * ((x + y) / (size * 2)));
      rgba[i + 3] = 255;
    }
  }

  const s = (n) => Math.round((n / 256) * size);
  fillRoundedRect(rgba, size, s(42), s(42), s(164), s(164), s(28), [236, 253, 255, 255]);
  fillRoundedRect(rgba, size, s(60), s(64), s(128), s(32), s(10), [15, 23, 42, 255]);
  fillRoundedRect(rgba, size, s(60), s(112), s(78), s(32), s(10), [15, 23, 42, 255]);
  fillRoundedRect(rgba, size, s(152), s(112), s(36), s(32), s(10), [15, 23, 42, 255]);
  drawBar(rgba, size, s(64), s(172), s(108), s(12), [15, 23, 42, 230]);
  fillRoundedRect(rgba, size, s(184), s(42), s(24), s(24), s(12), [34, 197, 94, 255]);

  return pngFromRgba(size, rgba);
}

function makeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + images.length * 16;
  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry[0] = image.size === 256 ? 0 : image.size;
    entry[1] = image.size === 256 ? 0 : image.size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += image.png.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

fs.mkdirSync(outDir, { recursive: true });
const sizes = [16, 32, 48, 64, 128, 256];
const images = sizes.map((size) => ({ size, png: makeIconPng(size) }));
fs.writeFileSync(path.join(outDir, "icon.png"), images.at(-1).png);
fs.writeFileSync(path.join(outDir, "icon.ico"), makeIco(images));
console.log("Generated build/icon.png and build/icon.ico");
