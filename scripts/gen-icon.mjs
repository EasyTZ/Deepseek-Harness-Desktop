// 用 DeepSeek 官方鲸鱼 logo（build/logo.svg）生成应用图标：
// build/icon.png（256x256 透明背景）与 build/icon.ico（内嵌 PNG）。
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const logoPath = join(root, 'build', 'logo.svg');
const S = 256;
const PAD = 28; // 四周透明留白，避免图标贴边

const png = await sharp(readFileSync(logoPath), { density: 300 })
  .resize(S - PAD * 2, S - PAD * 2)
  .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

// 单张 256x256 PNG 内嵌的 ICO（Vista+ 支持 PNG 压缩 ICO）。
function encodeIco(pngBuf) {
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
  entry.writeUInt32LE(pngBuf.length, 8); // size
  entry.writeUInt32LE(22, 12); // offset
  return Buffer.concat([header, entry, pngBuf]);
}

mkdirSync(join(root, 'build'), { recursive: true });
writeFileSync(join(root, 'build', 'icon.png'), png);
writeFileSync(join(root, 'build', 'icon.ico'), encodeIco(png));
console.log('已生成 build/icon.png 与 build/icon.ico（DeepSeek 鲸鱼 logo）');
