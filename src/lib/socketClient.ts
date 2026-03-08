import { io, Socket } from 'socket.io-client';

class SocketClient {
  private static instance: SocketClient;
  public socket: Socket | null = null;
  private getUrl() {
    let url = '';
    if (typeof window !== 'undefined') {
      url = process.env.NEXT_PUBLIC_SOCKET_URL || `http://${window.location.hostname}:3001`;
    } else {
      url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    }
    // Remove trailing slash to prevent 308 redirects
    return url.replace(/\/$/, "");
  }

  private constructor() {}

  public static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  public connect() {
    if (!this.socket) {
      this.socket = io(this.getUrl(), {
        transports: ['websocket'], // Force websocket to avoid 308 polling redirects
        upgrade: false
      });
      
      this.socket.on('connect', () => {
        console.log('✅ Connected to socket server at:', this.getUrl(), 'Socket ID:', this.socket?.id);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from socket server. Reason:', reason);
      });

      this.socket.on('connect_error', (err) => {
        console.error('⚠️ Socket Connection Error to', this.getUrl(), ':', err.message);
      });

      this.socket.on('error', (err: string) => {
        console.error('🛑 Socket internal error:', err);
      });
    }
    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public emit<T = unknown>(event: string, data: T) {
    this.socket?.emit(event, data);
  }

  public on<T = unknown>(event: string, callback: (data: T) => void) {
    this.socket?.on(event, callback);
  }

  public off(event: string) {
    this.socket?.off(event);
  }
}

export const socketClient = SocketClient.getInstance();
