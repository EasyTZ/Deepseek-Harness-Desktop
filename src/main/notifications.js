'use strict';

const { Notification } = require('electron');

const EVENTS_PATH = '/api/events.mux';
const RECONNECT_MS = 5000;

/**
 * 订阅 dsh 内核的 /api/events.mux 事件流，在「任务完成」「待确认」时弹系统通知。
 *
 * 内核只对 /api/events.mux 提供 WebSocket 下行通道（普通 HTTP GET 返回 426，
 * 没有 SSE 回退），所以这里用 WebSocket 连接；每条下行消息是一个
 * `server-request` 信封（{ type, rpcId, method, payload }），`payload` 才是
 * 真正的 mux 帧。只在窗口未聚焦时通知（聚焦时用户看得到，不打扰）。
 */
class TaskNotifications {
  constructor(opts = {}) {
    this.logger = opts.logger ?? console;
    this.onActivate = opts.onActivate ?? null;
    // 每次真正弹出通知时回调（用于让主进程闪烁任务栏图标）。
    this.onAttention = opts.onAttention ?? null;
    this.baseUrl = null;
    this.focused = true;
    this.stopped = false;
    this.socket = null;
    this.reconnectTimer = null;
  }

  setBaseUrl(url) {
    this.baseUrl = url;
  }

  setFocused(focused) {
    this.focused = focused;
  }

  start() {
    if (this.stopped || !this.baseUrl) return;
    if (typeof WebSocket !== 'function') {
      this.logger.warn('[notify] 当前运行时不支持 WebSocket，系统通知不可用');
      return;
    }
    this.#connect();
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.socket) {
      const socket = this.socket;
      this.socket = null;
      try { socket.close(); } catch {}
    }
  }

  #connect() {
    if (this.stopped || !this.baseUrl) return;
    let url;
    try {
      const u = new URL(EVENTS_PATH, this.baseUrl);
      u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
      url = u.toString();
    } catch {
      return;
    }

    let socket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.#scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.addEventListener('message', (event) => this.#onMessage(event && event.data));
    // 连接失败 / 断开统一走 close 重连；这里留空监听，避免无监听时的事件噪音。
    socket.addEventListener('error', () => {});
    socket.addEventListener('close', () => {
      if (this.socket === socket) this.socket = null;
      this.#scheduleReconnect();
    });
  }

  #scheduleReconnect() {
    if (this.stopped) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.#connect(), RECONNECT_MS);
  }

  #onMessage(data) {
    if (typeof data === 'string') return this.#handleFrameText(data);
    if (data instanceof ArrayBuffer) return this.#handleFrameText(Buffer.from(data).toString('utf8'));
    if (ArrayBuffer.isView(data)) {
      return this.#handleFrameText(Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8'));
    }
    if (data && typeof data.text === 'function') {
      data.text().then((text) => this.#handleFrameText(text)).catch(() => {});
    }
  }

  #handleFrameText(text) {
    try {
      this.#handleFrame(JSON.parse(text));
    } catch {}
  }

  #handleFrame(json) {
    // 下行是 server-request 信封，payload 才是 mux 帧。
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
      if (typeof this.onAttention === 'function') this.onAttention();
    } catch (error) {
      this.logger.warn('[notify] 通知失败:', error?.message ?? error);
    }
  }
}

module.exports = { TaskNotifications };
