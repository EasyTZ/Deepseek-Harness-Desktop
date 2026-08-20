'use strict';

const { app, globalShortcut, ipcMain, dialog, Notification } = require('electron');
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
  };

  const notifications = new TaskNotifications({ logger: console, onActivate: showWindow });

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
          onFocusChanged: (focused) => notifications.setFocused(focused)
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
