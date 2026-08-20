// 生成应用图标：DeepSeek 蓝圆角方 + 白色鲸鱼状月牙。
// 输出 build/icon.png (256x256) 与 build/icon.ico（内嵌 PNG）。
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = 256;
const R = 48;
const BLUE = [0x4d, 0x6b, 0xfe];
const WHITE = [0xff, 0xff, 0xff];

function roundedRect(x, y) {
  const x0 = R, y0 = R, x1 = S - 1 - R, y1 = S - 1 - R;
  const dx = x < x0 ? x0 - x : (x > x1 ? x - x1 : 0);
  const dy = y < y0 ? y0 - y : (y > y1 ? y - y1 : 0);
  const d = Math.hypot(dx, dy);
  if (d >= R) return 0;
  if (d <= R - 1) return 1;
  return R - d;
}

function circle(x, y, cx, cy, r) {
  const d = Math.hypot(x - cx, y - cy);
  if (d >= r) return 0;
  if (d <= r - 1) return 1;
  return r - d;
}

// 鲸鱼状月牙：白色大圆减去偏移的蓝色圆。
const cres = (x, y) => circle(x, y, 140, 128, 64) * (1 - circle(x, y, 108, 128, 64));

const rgba = Buffer.alloc(S * S * 4);
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const bg = roundedRect(x, y);
    if (bg <= 0) continue;
    const w = cres(x, y);
    const i = (y * S + x) * 4;
    rgba[i] = Math.round(BLUE[0] + (WHITE[0] - BLUE[0]) * w);
    rgba[i + 1] = Math.round(BLUE[1] + (WHITE[1] - BLUE[1]) * w);
    rgba[i + 2] = Math.round(BLUE[2] + (WHITE[2] - BLUE[2]) * w);
    rgba[i + 3] = Math.round(255 * bg);
  }
}

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng() {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0);
  ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = S * 4;
  const raw = Buffer.alloc((stride + 1) * S);
  for (let y = 0; y < S; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function encodeIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // count
  const entry = Buffer.alloc(16);
  entry[0] = 0; // width 256
  entry[1] = 0; // height 256
  entry[2] = 0; // palette
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bpp
  entry.writeUInt32LE(png.length, 8); // size
  entry.writeUInt32LE(22, 12); // offset
  return Buffer.concat([header, entry, png]);
}

const png = encodePng();
mkdirSync(join(root, 'build'), { recursive: true });
writeFileSync(join(root, 'build', 'icon.png'), png);
writeFileSync(join(root, 'build', 'icon.ico'), encodeIco(png));
console.log('已生成 build/icon.png 与 build/icon.ico');
