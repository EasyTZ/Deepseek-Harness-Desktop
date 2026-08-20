// 打包后整理最终产物：把安装包与 zip 绿色版复制到 release/，与中间产物分开。
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const releaseDir = join(root, 'release');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;

if (!existsSync(distDir)) {
  console.error('[collect-release] 未找到 dist 目录，请先执行 electron-builder --win');
  process.exit(1);
}

const files = readdirSync(distDir);
const setup = files.find((f) => /^DeepSeek-Setup-.*\.exe$/.test(f));
const zip = files.find((f) => f.endsWith('.zip'));

if (!setup) {
  console.error('[collect-release] 未找到安装包（DeepSeek-Setup-*.exe）');
  process.exit(1);
}

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(releaseDir, { recursive: true });

cpSync(join(distDir, setup), join(releaseDir, `DeepSeek-Setup-${version}.exe`));
if (zip) {
  cpSync(join(distDir, zip), join(releaseDir, `DeepSeek-Portable-${version}.zip`));
}

console.log('[collect-release] 完成，产物：');
for (const f of readdirSync(releaseDir)) {
  console.log(`  - ${f}`);
}
