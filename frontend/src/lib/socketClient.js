import { io } from "socket.io-client";

class SocketClient {
  constructor() {
    this.socket = null;
  }

  getUrl() {
    return import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";
  }

  static getInstance() {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  connect() {
    if (!this.socket) {
      this.socket = io(this.getUrl(), {
        transports: ["websocket"],
        upgrade: false,
      });

      this.socket.on("connect", () => {
        console.log(
          "✅ Connected to socket server at:",
          this.getUrl(),
          "Socket ID:",
          this.socket?.id,
        );
      });

      this.socket.on("disconnect", (reason) => {
        console.log("❌ Disconnected from socket server. Reason:", reason);
      });

      this.socket.on("connect_error", (err) => {
        console.error(
          "⚠️ Socket Connection Error to",
          this.getUrl(),
          ":",
          err.message,
        );
      });

      this.socket.on("error", (err) => {
        console.error("🛑 Socket internal error:", err);
      });
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event, data) {
    this.socket?.emit(event, data);
  }

  on(event, callback) {
    this.socket?.on(event, callback);
  }

  off(event) {
    this.socket?.off(event);
  }
}

export const socketClient = SocketClient.getInstance();
