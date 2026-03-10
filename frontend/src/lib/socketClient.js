import { io } from "socket.io-client";

class SocketClient {
  constructor() {
    this.socket = io(this.getUrl(), {
      transports: ["websocket"],
      autoConnect: false,
      reconnection: true,
    });

    this.socket.on("connect", () => {
      console.log("✅ Socket connected:", this.socket.id);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
    });

    this.socket.on("connect_error", (err) => {
      console.error("⚠️ Socket error:", err.message);
    });
  }

  getUrl() {
    return import.meta.env.VITE_SOCKET_URL || "http://192.168.0.152:3001";
  }

  static getInstance() {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  connect() {
    if (!this.socket.connected) {
      this.socket.connect();
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      // Keep instance but disconnected
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else if (this.socket) {
      // Queue or wait for connect if absolutely necessary,
      // but for now just log and rely on socket.io's internal buffering if possible
      this.socket.emit(event, data);
    }
  }

  on(event, callback) {
    this.socket?.on(event, callback);
  }

  off(event) {
    this.socket?.off(event);
  }
}

export const socketClient = SocketClient.getInstance();
