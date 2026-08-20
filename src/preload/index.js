'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// DeepSeek 鲸鱼 logo（内联 SVG，来自官方 favicon，品牌蓝 #4D6BFE）。
const LOGO_SVG =
  '<svg viewBox="0 0 50 50" fill="none"><path fill="#4D6BFE" d="M48.8354 10.0479C48.3232 9.79199 48.1025 10.2798 47.8032 10.5278C47.7007 10.6079 47.6143 10.7119 47.5273 10.8076C46.7793 11.624 45.9048 12.1597 44.7622 12.0957C43.0923 12 41.666 12.5356 40.4058 13.8398C40.1377 12.2319 39.2476 11.272 37.8926 10.6558C37.1836 10.3359 36.4668 10.0156 35.9702 9.31982C35.6235 8.82373 35.5293 8.27197 35.356 7.72754C35.2456 7.3999 35.1353 7.06396 34.7651 7.00781C34.3633 6.94385 34.2056 7.2876 34.0479 7.57568C33.418 8.75195 33.1733 10.0479 33.1973 11.3599C33.2524 14.312 34.4736 16.6641 36.8999 18.3359C37.1758 18.5278 37.2466 18.7197 37.1597 19C36.9946 19.5757 36.7974 20.1357 36.624 20.7119C36.5137 21.0801 36.3486 21.1597 35.9624 21C34.6309 20.4321 33.481 19.5918 32.4644 18.5757C30.7393 16.8721 29.1792 14.9917 27.2334 13.52C26.7764 13.1758 26.3193 12.856 25.8467 12.5518C23.8618 10.584 26.1069 8.96777 26.627 8.77588C27.1704 8.57568 26.8159 7.8877 25.0591 7.896C23.3022 7.90381 21.6953 8.50391 19.647 9.30371C19.3477 9.42383 19.0322 9.51172 18.7095 9.58398C16.8501 9.22363 14.9199 9.14355 12.9033 9.37598C9.10596 9.80762 6.07275 11.6396 3.84326 14.7681C1.16455 18.5278 0.53418 22.7998 1.30664 27.2559C2.11768 31.9521 4.46582 35.8398 8.07373 38.8799C11.8159 42.0322 16.1255 43.5762 21.041 43.2803C24.0269 43.104 27.3516 42.6963 31.1016 39.4561C32.0469 39.936 33.0396 40.1279 34.686 40.272C35.9546 40.3921 37.1758 40.208 38.1211 40.0078C39.6021 39.688 39.4995 38.2881 38.9639 38.0322C34.623 35.9678 35.5762 36.8081 34.71 36.1279C36.9155 33.4639 40.2402 30.6958 41.54 21.728C41.6426 21.0161 41.5557 20.5679 41.54 19.9917C41.5322 19.6396 41.6108 19.5039 42.0049 19.4639C43.0923 19.3359 44.1479 19.0317 45.1167 18.4878C47.9292 16.9199 49.064 14.3438 49.3315 11.2559C49.3711 10.7837 49.3237 10.2959 48.8354 10.0479ZM24.3262 37.8398C20.1196 34.4639 18.0791 33.3521 17.2358 33.3999C16.4482 33.4482 16.5898 34.3682 16.7632 34.9678C16.9443 35.5601 17.1812 35.9683 17.5117 36.4878C17.7402 36.832 17.8979 37.3442 17.2832 37.728C15.9282 38.584 13.5728 37.4399 13.4624 37.3838C10.7207 35.7358 8.42822 33.5601 6.81348 30.584C5.25342 27.7197 4.34766 24.6479 4.19775 21.3677C4.1582 20.5757 4.38672 20.2959 5.15869 20.1519C6.17529 19.96 7.22314 19.9199 8.23926 20.0718C12.5327 20.7119 16.1885 22.6719 19.2529 25.7759C21.002 27.5439 22.3252 29.6558 23.6885 31.7202C25.1377 33.9121 26.6978 36 28.6831 37.7119C29.3843 38.312 29.9434 38.7681 30.479 39.104C28.8643 39.2881 26.1699 39.3281 24.3262 37.8398ZM26.3433 24.6001C26.3433 24.248 26.6191 23.9678 26.9658 23.9678C27.0444 23.9678 27.1152 23.9839 27.1782 24.0078C27.2651 24.04 27.3438 24.0879 27.4067 24.1602C27.5171 24.272 27.5801 24.4321 27.5801 24.6001C27.5801 24.9521 27.3042 25.2319 26.9575 25.2319C26.6108 25.2319 26.3433 24.9521 26.3433 24.6001ZM32.6064 27.8799C32.2046 28.0479 31.8027 28.1919 31.4165 28.208C30.8179 28.2397 30.1641 27.9922 29.8096 27.688C29.2583 27.2158 28.8643 26.9521 28.6987 26.1279C28.6279 25.7759 28.6675 25.2319 28.7305 24.9199C28.8721 24.248 28.7144 23.8159 28.2495 23.4238C27.8716 23.104 27.3911 23.0161 26.8633 23.0161C26.666 23.0161 26.4849 22.9277 26.3511 22.856C26.1304 22.7441 25.9492 22.4639 26.1226 22.1201C26.1777 22.0078 26.4458 21.7358 26.5088 21.688C27.2256 21.272 28.0527 21.4077 28.8169 21.7197C29.5259 22.0161 30.0615 22.5601 30.834 23.3281C31.6216 24.2559 31.7632 24.5117 32.2124 25.208C32.5669 25.752 32.8901 26.312 33.1104 26.9521C33.2446 27.3521 33.0713 27.6802 32.6064 27.8799Z"/></svg>';

const TITLEBAR_HEIGHT = 40;

// 窗口控制按钮图标（SVG，stroke 跟随 currentColor）。
const ICONS = {
  minimize: '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M1 5 H9"/></svg>',
  maximize: '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.1"><rect x="1" y="1" width="8" height="8"/></svg>',
  restore: '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M3 3 V1 H9 V7 H7"/><rect x="1" y="3" width="6" height="6"/></svg>',
  close: '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.1"><path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5"/></svg>',
};

function injectTitlebar() {
  const bar = document.createElement('div');
  bar.id = 'dsh-titlebar';
  bar.innerHTML =
    '<div class="tb-title">' +
    '<span class="tb-logo">' + LOGO_SVG + '</span>' +
    '<span class="tb-name">DeepSeek Harness Desktop</span>' +
    '</div>' +
    '<div class="tb-controls">' +
    '<button class="tb-btn" data-action="minimize" aria-label="最小化">' + ICONS.minimize + '</button>' +
    '<button class="tb-btn" data-action="maximize" aria-label="最大化">' + ICONS.maximize + '</button>' +
    '<button class="tb-btn tb-close" data-action="close" aria-label="关闭">' + ICONS.close + '</button>' +
    '</div>';
  document.body.appendChild(bar);

  bar.querySelectorAll('.tb-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      ipcRenderer.send('window:' + btn.dataset.action);
    });
  });

  // 最大化 / 还原按钮图标随窗口状态切换。
  const maxBtn = bar.querySelector('[data-action="maximize"]');
  ipcRenderer.on('window:maximized-changed', (_e, isMax) => {
    if (!maxBtn) return;
    maxBtn.innerHTML = isMax ? ICONS.restore : ICONS.maximize;
    maxBtn.setAttribute('aria-label', isMax ? '还原' : '最大化');
  });

  // 双击标题栏切换最大化（避开按钮区域）。
  bar.addEventListener('dblclick', (e) => {
    if (e.target.closest('.tb-controls')) return;
    ipcRenderer.send('window:maximize');
  });
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent =
    '#dsh-titlebar{' +
    'position:fixed;top:0;left:0;right:0;height:' + TITLEBAR_HEIGHT + 'px;' +
    'z-index:2147483000;display:flex;align-items:center;justify-content:space-between;' +
    'padding-left:14px;-webkit-app-region:drag;user-select:none;box-sizing:border-box;' +
    'background:var(--dsw-alias-bg-base,#0d1117);color:var(--dsw-alias-label-primary,#e6e6e6);' +
    'border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.05));' +
    'box-shadow:0 1px 4px rgba(0,0,0,.04);}' +
    '#dsh-titlebar .tb-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;letter-spacing:.2px;}' +
    '#dsh-titlebar .tb-logo{display:inline-flex;width:24px;height:24px;padding:4px;align-items:center;justify-content:center;border-radius:7px;background:rgba(77,107,254,.14);}' +
    '#dsh-titlebar .tb-logo svg{width:100%;height:100%;display:block;}' +
    '#dsh-titlebar .tb-controls{display:flex;align-items:center;height:100%;gap:2px;padding-right:8px;-webkit-app-region:no-drag;}' +
    '#dsh-titlebar .tb-btn{' +
    'width:40px;height:30px;border:none;background:transparent;color:inherit;' +
    'font-size:12px;line-height:1;cursor:pointer;border-radius:8px;' +
    'display:inline-flex;align-items:center;justify-content:center;' +
    'transition:background .15s ease,color .15s ease;}' +
    '#dsh-titlebar .tb-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.08));}' +
    '#dsh-titlebar .tb-btn svg{width:11px;height:11px;display:block;}' +
    '#dsh-titlebar .tb-close:hover{background:#f0617a;color:#fff;}' +
    '#root{padding-top:' + TITLEBAR_HEIGHT + 'px;box-sizing:border-box;}';
  document.head.appendChild(style);
}

function mount() {
  injectTitlebar();
  injectStyles();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  platform: process.platform,
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
});
