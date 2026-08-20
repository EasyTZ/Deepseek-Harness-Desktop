'use strict';

const { BrowserWindow, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

function iconPath() {
  const candidates = [
    path.join(__dirname, '..', '..', 'build', 'icon.png'),
    path.join(process.resourcesPath, 'icon.png'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

function isLoopback(u) {
  try {
    const h = new URL(u).hostname;
    return h === '127.0.0.1' || h === 'localhost' || h === '::1' || h === '[::1]';
  } catch {
    return false;
  }
}

function createMainWindow(url, { onCloseRequest } = {}) {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    title: 'DeepSeek',
    backgroundColor: '#0d1117',
    icon: iconPath(),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.loadURL(url);
  win.once('ready-to-show', () => win.show());

  // 新开窗口：回环地址放行（SPA 内部跳转），外部链接交给系统浏览器。
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (isLoopback(target)) return { action: 'allow' };
    shell.openExternal(target);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, target) => {
    if (!isLoopback(target)) {
      event.preventDefault();
      shell.openExternal(target);
    }
  });

  win.on('close', (event) => {
    if (typeof onCloseRequest === 'function') onCloseRequest(event, win);
  });

  return win;
}

module.exports = { createMainWindow, iconPath };
