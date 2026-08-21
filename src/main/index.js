'use strict';

const { app, globalShortcut, ipcMain, dialog, Notification, shell } = require('electron');
const path = require('node:path');
const { DshService } = require('./dsh-service');
const { createMainWindow } = require('./window');
const { createTray } = require('./tray');
const { TaskNotifications } = require('./notifications');

const APP_ID = 'com.deepseek.desktop';
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.setAppUserModelId(APP_ID);

  let win = null;
  let tray = null;
  let dsh = null;
  let isQuitting = false;

  const showWindow = () => {
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    win.flashFrame(false);
  };

  /**
   * Windows 通知（toast）要求应用有一个指向它的开始菜单快捷方式，且快捷方式的
   * AppUserModelID 与 app.setAppUserModelId 一致。安装版由安装器创建；绿色版 /
   * win-unpacked 没有，这里首次启动时补建一个，否则后台通知会静默丢失。
   */
  const ensureStartMenuShortcut = () => {
    if (process.platform !== 'win32') return;
    try {
      const lnk = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'DeepSeek Harness Desktop.lnk');
      shell.writeShortcutLink(lnk, 'replace', {
        target: process.execPath,
        appUserModelId: APP_ID,
        description: 'DeepSeek Harness Desktop',
      });
    } catch (error) {
      console.warn('[app] 创建开始菜单快捷方式失败:', error?.message ?? error);
    }
  };

  const notifications = new TaskNotifications({
    logger: console,
    onActivate: showWindow,
    onAttention: () => { if (win && !win.isDestroyed()) win.flashFrame(true); },
  });

  const toggleWindow = () => {
    if (!win || win.isDestroyed()) return;
    if (win.isVisible() && !win.isMinimized()) win.hide();
    else showWindow();
  };

  const quitApp = () => {
    isQuitting = true;
    globalShortcut.unregisterAll();
    if (tray) {
      tray.destroy();
      tray = null;
    }
    app.quit();
  };

  const startDsh = () => {
    dsh = new DshService({ logger: console });
    dsh.on('ready', (url) => {
      console.log(`[app] dsh 就绪: ${url}`);
      notifications.setBaseUrl(url);
      notifications.start();
      if (win && !win.isDestroyed()) {
        win.loadURL(url).catch(() => {});
      } else {
        win = createMainWindow(url, {
          onCloseRequest,
          onFocusChanged: (focused) => {
            notifications.setFocused(focused);
            // 窗口重新获得焦点即停止任务栏闪烁。
            if (focused) win.flashFrame(false);
          }
        });
        if (!tray) tray = createTray({ onShow: toggleWindow, onQuit: quitApp });
      }
    });
    dsh.on('error', (err) => {
      console.error('[app] dsh 错误:', err);
      const msg = String(err && err.message ? err.message : err);
      if (!win) {
        dialog.showErrorBox('DeepSeek 启动失败', msg);
        quitApp();
      } else if (Notification.isSupported()) {
        new Notification({ title: 'DeepSeek', body: msg }).show();
      }
    });
    dsh.on('exit', ({ code, signal }) => {
      console.log(`[app] dsh 退出 code=${code} signal=${signal}`);
      if (!isQuitting && win && !win.isDestroyed()) {
        win.loadURL('about:blank').catch(() => {});
      }
    });
    dsh.start().catch((err) => console.error('[app] 启动失败:', err));
  };

  const onCloseRequest = (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  };

  // 预留的无边框窗口控制通道（当前原生边框下为空操作）。
  ipcMain.on('window:minimize', () => win && win.minimize());
  ipcMain.on('window:maximize', () => win && (win.isMaximized() ? win.unmaximize() : win.maximize()));
  ipcMain.on('window:close', () => win && win.close());

  app.on('second-instance', () => showWindow());

  app.whenReady().then(() => {
    ensureStartMenuShortcut();
    globalShortcut.register('CommandOrControl+Alt+Space', toggleWindow);
    startDsh();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    globalShortcut.unregisterAll();
    notifications.stop();
  });

  app.on('will-quit', (event) => {
    if (dsh && !dsh.stopped) {
      event.preventDefault();
      dsh.stopped = true;
      dsh.stop().finally(() => app.exit(0));
    }
  });

  app.on('window-all-closed', () => {
    // 保持托盘驻留；仅显式退出时真正退出。
  });
}
