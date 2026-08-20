'use strict';

const { spawn, execFile } = require('node:child_process');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { app } = require('electron');

const URL_LINE_RE = /dsh web:\s+(https?:\/\/\S+)/;

/** Ask the OS for a free loopback port, then release it. */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/**
 * Owns the `dsh web` child process: resolves the node binary + dsh bin.js for
 * dev or packaged layouts, starts the server on a free port, waits for the
 * HTTP surface to answer, and tears the process down on quit.
 */
class DshService extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.logger = opts.logger ?? console;
    this.child = null;
    this.url = null;
    this.stopped = false;
  }

  resolveKernel() {
    if (app.isPackaged) {
      const kernel = path.join(process.resourcesPath, 'kernel');
      return {
        nodeExe: path.join(kernel, 'node.exe'),
        binJs: path.join(kernel, 'runtime', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
      };
    }
    const nodeExe = process.env.DSH_NODE_EXE || 'node';
    const binJs = process.env.DSH_BIN_JS || this.#guessDevBin();
    return { nodeExe, binJs };
  }

  #guessDevBin() {
    const candidates = [
      path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
      'D:\\nodejs\\node_modules\\@deepseek-ai\\dsh\\lib\\bin.js',
      'C:\\Program Files\\nodejs\\node_modules\\@deepseek-ai\\dsh\\lib\\bin.js',
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    throw new Error(
      '找不到 dsh 安装目录。请设置环境变量 DSH_BIN_JS 指向 dsh/lib/bin.js，或先安装 DeepSeek Harness。'
    );
  }

  async start() {
    const { nodeExe, binJs } = this.resolveKernel();
    const port = await findFreePort();
    this.url = `http://127.0.0.1:${port}`;
    const args = [binJs, 'web', '--host', '127.0.0.1', '--port', String(port)];

    this.logger.log(`[dsh] 启动: ${nodeExe} ${args.join(' ')}`);
    this.child = spawn(nodeExe, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      // 打上唯一标记：桌面版内核进程可据此与网页版/其他实例精确区分，
      // 避免后续清理进程时误杀正在开发它的 agent 自己。
      env: { ...process.env, DSH_DESKTOP: '1', DSH_DESKTOP_PARENT_PID: String(process.pid) },
    });

    this.child.stdout.on('data', (d) => this.#scanStdout(d));
    this.child.stderr.on('data', (d) => this.logger.log(`[dsh:err] ${d.toString('utf8').trimEnd()}`));
    this.child.on('error', (err) => {
      this.logger.error('[dsh] 进程错误:', err.message);
      this.emit('error', err);
    });
    this.child.on('exit', (code, signal) => {
      this.logger.log(`[dsh] 退出 code=${code} signal=${signal}`);
      this.emit('exit', { code, signal });
      this.child = null;
    });

    this.#pollReady();
    return this;
  }

  #stdoutBuffer = '';

  #scanStdout(d) {
    this.#stdoutBuffer += d.toString('utf8');
    const lines = this.#stdoutBuffer.split(/\r?\n/);
    this.#stdoutBuffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      this.logger.log(`[dsh:out] ${line}`);
      const m = URL_LINE_RE.exec(line);
      if (m) {
        this.url = m[1];
        this.logger.log(`[dsh] URL 行: ${this.url}`);
      }
    }
  }

  #pollReady() {
    const deadline = Date.now() + 30000;
    const url = this.url;
    const attempt = () => {
      if (this.stopped) return;
      const req = http.get(url + '/', (res) => {
        res.resume();
        this.emit('ready', url);
      });
      req.on('error', () => this.#schedule(deadline, attempt));
      req.setTimeout(2000, () => {
        req.destroy();
        this.#schedule(deadline, attempt);
      });
    };
    attempt();
  }

  #schedule(deadline, attempt) {
    if (this.stopped) return;
    if (Date.now() > deadline) {
      this.emit('error', new Error(`dsh web 未在 30 秒内就绪（${this.url}）`));
      return;
    }
    setTimeout(attempt, 250);
  }

  /** Force-stop the dsh process tree; always resolves. */
  stop() {
    return new Promise((resolve) => {
      this.stopped = true;
      const child = this.child;
      if (!child || child.exitCode !== null) return resolve();
      child.once('exit', () => resolve());
      if (process.platform === 'win32') {
        execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], () => {
          if (child.exitCode === null) {
            try { child.kill(); } catch {}
          }
        });
      } else {
        child.kill('SIGTERM');
      }
      const t = setTimeout(() => {
        try { if (child.exitCode === null) child.kill('SIGKILL'); } catch {}
        resolve();
      }, 3000);
      if (t.unref) t.unref();
    });
  }
}

module.exports = { DshService };
