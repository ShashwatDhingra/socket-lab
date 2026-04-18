import { io } from "socket.io-client";

export class SocketManager {
  #socket = null;
  #history = [];
  #globalListener = null;

  connect(url, options = {}) {
    this.disconnect();

    this.#socket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 5000,
      ...options
    });

    return this.#socket;
  }

  attachGlobalListener(handler) {
    this.#globalListener = handler;

    if (!this.#socket) {
      return;
    }

    this.#socket.onAny((eventName, ...args) => {
      const payload = args.length <= 1 ? args[0] : args;
      this.#history.push({ eventName, payload, receivedAt: new Date().toISOString() });
      this.#globalListener?.(eventName, payload);
    });
  }

  emit(eventName, payload) {
    this.#assertConnected();
    this.#socket.emit(eventName, payload);
  }

  on(eventName, handler) {
    this.#assertConnected();
    this.#socket.on(eventName, handler);
  }

  off(eventName, handler) {
    this.#assertConnected();
    this.#socket.off(eventName, handler);
  }

  disconnect() {
    if (!this.#socket) {
      return;
    }

    this.#socket.disconnect();
    this.#socket = null;
    this.#history = [];
  }

  getHistory() {
    return [...this.#history];
  }

  getSocket() {
    return this.#socket;
  }

  isConnected() {
    return Boolean(this.#socket?.connected);
  }

  #assertConnected() {
    if (!this.#socket) {
      throw new Error("No active Socket.IO connection.");
    }
  }
}
