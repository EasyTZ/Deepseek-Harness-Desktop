'use strict';

const { Tray, Menu, nativeImage } = require('electron');
const { iconPath } = require('./window');

function createTray({ onShow, onQuit }) {
  const icon = iconPath();
  const img = icon ? nativeImage.createFromPath(icon) : nativeImage.createEmpty();
  const tray = new Tray(img.resize({ width: 16, height: 16 }));
  tray.setToolTip('DeepSeek Harness Desktop');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示 / 隐藏', click: onShow },
      { type: 'separator' },
      { label: '退出', click: onQuit },
    ])
  );
  tray.on('double-click', onShow);
  return tray;
}

module.exports = { createTray };
