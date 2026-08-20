// 把 node.exe 与完整 dsh 依赖树拷贝到 kernel/ 暂存目录，供 electron-builder
// 的 extraResources 打入安装包，实现自包含内核。
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'kernel');
// node_modules 必须放在 runtime/ 子目录里：electron-builder 会硬排除 from 根部的
// node_modules 目录，但子目录里的 node_modules 不受影响。
const outDsh = join(outDir, 'runtime', 'node_modules', '@deepseek-ai', 'dsh');

function findDshInstall() {
  if (process.env.DSH_INSTALL_DIR && existsSync(process.env.DSH_INSTALL_DIR)) {
    return process.env.DSH_INSTALL_DIR;
  }
  const candidates = [
    'D:\\nodejs\\node_modules\\@deepseek-ai\\dsh',
    join(process.env.APPDATA || '', 'npm', 'node_modules', '@deepseek-ai', 'dsh'),
    'C:\\Program Files\\nodejs\\node_modules\\@deepseek-ai\\dsh',
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error('找不到 dsh 安装目录，请设置 DSH_INSTALL_DIR 指向 @deepseek-ai/dsh 包目录');
}

function findNodeExe() {
  if (process.env.DSH_NODE_EXE && existsSync(process.env.DSH_NODE_EXE)) {
    return process.env.DSH_NODE_EXE;
  }
  const candidates = [
    'D:\\nodejs\\node.exe',
    'C:\\Program Files\\nodejs\\node.exe',
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  throw new Error('找不到 node.exe，请设置 DSH_NODE_EXE 指向 node 可执行文件');
}

const installDir = findDshInstall();
const nodeExe = findNodeExe();

console.log(`[prepare-kernel] dsh:  ${installDir}`);
console.log(`[prepare-kernel] node: ${nodeExe}`);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, 'runtime', 'node_modules', '@deepseek-ai'), { recursive: true });
cpSync(nodeExe, join(outDir, 'node.exe'));
cpSync(installDir, outDsh, { recursive: true, dereference: true });

console.log('[prepare-kernel] 完成');
