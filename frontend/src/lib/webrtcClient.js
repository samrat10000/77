import { socketClient } from "./socketClient";

class WebRTCClient {
  constructor() {
    this.peers = new Map();
    this.channels = new Map();
    this.listeners = new Map();
    this.isHost = false;
    this.username = "";
    this.mySocketId = "";

    // Bind signaling events once. We assume socketClient is singleton.
    socketClient.on("webrtc-offer", this.handleOffer.bind(this));
    socketClient.on("webrtc-answer", this.handleAnswer.bind(this));
    socketClient.on("webrtc-ice-candidate", this.handleIceCandidate.bind(this));
  }

  init(isHost, username, socketId) {
    this.isHost = isHost;
    this.username = username;
    this.mySocketId = socketId;
  }

  syncPeers(participants) {
    if (!this.mySocketId) return;

    participants.forEach((p) => {
      // Connect to any new peer
      if (p.socketId !== this.mySocketId && !this.peers.has(p.socketId)) {
        // Tie-breaker: only the peer with lexicographically "larger" socketId initiates the offer
        if (this.mySocketId > p.socketId) {
          console.log("Initiating WebRTC to", p.username);
          this.connectToPeer(p.socketId);
        }
      }
    });

    // Proactively clean up disconnected peers
    const activeIds = new Set(participants.map((p) => p.socketId));
    for (const socketId of this.peers.keys()) {
      if (!activeIds.has(socketId)) {
        this.cleanupPeer(socketId);
      }
    }
  }

  // Only Host calls this
  async connectToPeer(targetSocketId) {
    const pc = this.createPeerConnection(targetSocketId);

    const dc = pc.createDataChannel("jam-data");
    this.setupDataChannel(targetSocketId, dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketClient.emit("webrtc-offer", {
      targetSocketId,
      offer,
      senderUsername: this.username,
    });
  }

  createPeerConnection(targetSocketId) {
    console.log(`Creating RTCPeerConnection for ${targetSocketId}`);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketClient.emit("webrtc-ice-candidate", {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.ondatachannel = (event) => {
      this.setupDataChannel(targetSocketId, event.channel);
    };

    pc.onconnectionstatechange = () => {
      console.log(`P2P [${targetSocketId}] State:`, pc.connectionState);
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed" ||
        pc.connectionState === "closed"
      ) {
        this.cleanupPeer(targetSocketId);
      }
    };

    this.peers.set(targetSocketId, pc);
    return pc;
  }

  setupDataChannel(targetSocketId, dc) {
    dc.onopen = () => {
      console.log(`DataChannel open with ${targetSocketId}`);
      this.emitLocal("peer-connected", { socketId: targetSocketId });
    };
    dc.onclose = () => console.log(`DataChannel closed with ${targetSocketId}`);
    dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // data = { type: 'chat-message', payload: {...} }
        this.emitLocal(data.type, data.payload);
      } catch (e) {
        console.error("DataChannel parse error", e);
      }
    };
    this.channels.set(targetSocketId, dc);
  }

  async handleOffer({ senderSocketId, offer, senderUsername }) {
    console.log(
      `Received WebRTC Offer from ${senderUsername} (${senderSocketId})`,
    );

    // Cleanup any existing connection to this socket just in case
    if (this.peers.has(senderSocketId)) {
      this.cleanupPeer(senderSocketId);
    }

    const pc = this.createPeerConnection(senderSocketId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socketClient.emit("webrtc-answer", {
      targetSocketId: senderSocketId,
      answer,
    });
  }

  async handleAnswer({ senderSocketId, answer }) {
    console.log(`Received WebRTC Answer from ${senderSocketId}`);
    const pc = this.peers.get(senderSocketId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async handleIceCandidate({ senderSocketId, candidate }) {
    const pc = this.peers.get(senderSocketId);
    if (pc) {
      await pc
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch((e) => console.error("Error adding ice candidate", e));
    }
  }

  cleanupPeer(socketId) {
    const pc = this.peers.get(socketId);
    if (pc) pc.close();
    this.peers.delete(socketId);
    this.channels.delete(socketId);
  }

  destroy() {
    this.listeners.clear();
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    this.channels.clear();
  }

  // --- API for App.jsx ---

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      if (callback) {
        this.listeners.get(event).delete(callback);
      } else {
        this.listeners.delete(event);
      }
    }
  }

  emitLocal(event, payload) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => cb(payload));
    }
  }

  send(type, payload) {
    const message = JSON.stringify({ type, payload });
    // Broadcast to all connected peers
    this.channels.forEach((dc) => {
      if (dc.readyState === "open") {
        dc.send(message);
      }
    });
  }
}

export const webrtcClient = new WebRTCClient();
