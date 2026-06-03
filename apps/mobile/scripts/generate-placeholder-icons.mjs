/**
 * Placeholder app-icon generator for Klasso mobile (no native deps).
 *
 * Writes the PNG assets Expo/EAS need to build & submit to the stores:
 *   - assets/icon.png            1024×1024 opaque  (iOS + base icon)
 *   - assets/adaptive-icon.png   1024×1024 transp. (Android foreground)
 *   - assets/splash.png           512×512  transp. (splash mark)
 *   - assets/favicon.png           48×48   opaque  (web export)
 *
 * It draws a brand-indigo tile with a white "K". This is a PLACEHOLDER — drop a
 * designed icon at the same paths to replace it (then rebuild). Re-run with:
 *   node scripts/generate-placeholder-icons.mjs
 */
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BRAND = [0x4f, 0x46, 0xe5]; // #4f46e5 (DEFAULT_BRAND indigo-600)
const WHITE = [0xff, 0xff, 0xff];

const here = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(here, '..', 'assets');

// ── Minimal PNG writer (8-bit RGBA) ───────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function writePng(file, width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  fs.writeFileSync(
    file,
    Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]),
  );
}

// ── Geometry helpers ──────────────────────────────────────────────────────
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Is pixel (x,y) part of the white "K" glyph on an SxS canvas? */
function inK(x, y, S) {
  const stemX0 = 0.30 * S;
  const stemX1 = 0.40 * S;
  const top = 0.26 * S;
  const bot = 0.74 * S;
  if (x >= stemX0 && x <= stemX1 && y >= top && y <= bot) return true;
  const hw = 0.055 * S; // stroke half-width
  const joinX = 0.40 * S;
  const midY = 0.50 * S;
  const rightX = 0.72 * S;
  if (distToSegment(x, y, joinX, midY, rightX, top) <= hw) return true;
  if (distToSegment(x, y, joinX, midY, rightX, bot) <= hw) return true;
  return false;
}

function render(S, { opaqueBg }) {
  const buf = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const i = (y * S + x) * 4;
      const k = inK(x, y, S);
      if (opaqueBg) {
        const [r, g, b] = k ? WHITE : BRAND;
        buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
      } else if (k) {
        buf[i] = BRAND[0]; buf[i + 1] = BRAND[1]; buf[i + 2] = BRAND[2]; buf[i + 3] = 255;
      } // else fully transparent
    }
  }
  return buf;
}

fs.mkdirSync(assetsDir, { recursive: true });
writePng(path.join(assetsDir, 'icon.png'), 1024, 1024, render(1024, { opaqueBg: true }));
writePng(path.join(assetsDir, 'adaptive-icon.png'), 1024, 1024, render(1024, { opaqueBg: false }));
writePng(path.join(assetsDir, 'splash.png'), 512, 512, render(512, { opaqueBg: false }));
writePng(path.join(assetsDir, 'favicon.png'), 48, 48, render(48, { opaqueBg: true }));
console.log('Wrote icon.png, adaptive-icon.png, splash.png, favicon.png to', assetsDir);
