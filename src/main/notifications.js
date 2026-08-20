'use strict';

const { Notification } = require('electron');
const http = require('node:http');

const EVENTS_PATH = '/api/events.mux';
const RECONNECT_MS = 5000;

/**
 * 订阅 dsh 内核的 /api/events.mux SSE 流，在「任务完成」「待确认」时弹系统通知。
 * 只在窗口未聚焦时通知（聚焦时用户看得到，不打扰）。
 */
class TaskNotifications {
  constructor(opts = {}) {
    this.logger = opts.logger ?? console;
    this.onActivate = opts.onActivate ?? null;
    this.baseUrl = null;
    this.focused = true;
    this.stopped = false;
    this.request = null;
    this.reconnectTimer = null;
    this.buffer = '';
  }

  setBaseUrl(url) {
    this.baseUrl = url;
  }

  setFocused(focused) {
    this.focused = focused;
  }

  start() {
    if (this.stopped || !this.baseUrl) return;
    this.#connect();
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.request) {
      try { this.request.destroy(); } catch {}
    }
  }

  #connect() {
    if (this.stopped || !this.baseUrl) return;
    let url;
    try {
      url = new URL(EVENTS_PATH, this.baseUrl);
    } catch {
      return;
    }
    this.request = http.get(url, (res) => {
      if (res.statusCode !== 200) {
        this.#scheduleReconnect();
        return;
      }
      res.setEncoding('utf8');
      res.on('data', (chunk) => this.#onData(chunk));
      res.on('end', () => this.#scheduleReconnect());
      res.on('error', () => this.#scheduleReconnect());
    });
    this.request.on('error', () => this.#scheduleReconnect());
  }

  #scheduleReconnect() {
    if (this.stopped) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.#connect(), RECONNECT_MS);
  }

  #onData(chunk) {
    this.buffer += chunk;
    const parts = this.buffer.split('\n\n');
    this.buffer = parts.pop() ?? '';
    for (const part of parts) this.#onFrameText(part);
  }

  #onFrameText(part) {
    const dataLines = part
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim());
    if (dataLines.length === 0) return;
    try {
      this.#handleFrame(JSON.parse(dataLines.join('\n')));
    } catch {}
  }

  #handleFrame(json) {
    const payload = json && json.payload ? json.payload : json;
    if (!payload || typeof payload.type !== 'string') return;
    switch (payload.type) {
      case 'session/event': {
        const event = payload.event;
        if (event && event.type === 'turn/end') {
          this.#notify('任务完成', 'DeepSeek 已完成当前任务，等待你的下一步');
        }
        break;
      }
      case 'approval/requested':
        this.#notify('需要你的批准', `待批准操作：${payload.toolName ?? '未知操作'}`);
        break;
      case 'question/requested':
        this.#notify('需要你的回答', 'DeepSeek 有一个问题需要你确认');
        break;
      default:
        break;
    }
  }

  #notify(title, body) {
    if (this.focused) return; // 窗口聚焦时不打扰
    if (!Notification.isSupported()) return;
    try {
      const n = new Notification({ title, body, silent: false });
      n.on('click', () => {
        if (typeof this.onActivate === 'function') this.onActivate();
      });
      n.show();
    } catch (error) {
      this.logger.warn('[notify] 通知失败:', error?.message ?? error);
    }
  }
}

module.exports = { TaskNotifications };
