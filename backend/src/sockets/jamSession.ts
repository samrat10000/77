import { Server, Socket } from 'socket.io';

export interface Participant {
  socketId: string;
  username: string;
}

export interface PlaybackState {
  trackIndex: number;
  isPlaying: boolean;
  progress: number;
}

export interface MediaState {
  url: string | null;
  type: 'youtube' | 'video' | 'audio' | null;
}

export interface JamSessionState {
  hostUsername: string;
  participants: Participant[];
  trackIndex: number;
  isPlaying: boolean;
  progress: number;
  lastUpdated: number;
  media: MediaState;
}

export const setupJamSessionSockets = (io: Server) => {
  const sessions: Record<string, JamSessionState> = {};

  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    socket.on('create-session', ({ username }: { username: string }) => {
      const sessionId = Math.random().toString(36).substring(7);
      
      sessions[sessionId] = {
        hostUsername: username,
        participants: [{ socketId: socket.id, username }],
        trackIndex: 0,
        isPlaying: false,
        progress: 0,
        lastUpdated: Date.now(),
        media: { url: null, type: null }
      };
      
      socket.join(sessionId);
      socket.emit('session-created', { sessionId, state: sessions[sessionId] });
      console.log(`Session created: ${sessionId} by ${username} (${socket.id})`);
    });

    const addToSession = (sessionId: string, username: string, isRejoin: boolean = false) => {
      socket.join(sessionId);
      const session = sessions[sessionId];
      const existingIndex = session.participants.findIndex(p => p.username === username);
      
      if (existingIndex > -1) {
        session.participants[existingIndex].socketId = socket.id;
      } else {
        session.participants.push({ socketId: socket.id, username });
      }
      
      io.to(sessionId).emit('participants-update', session.participants);

      io.to(sessionId).emit('chat-message', {
        username: 'System',
        text: `${username} ${isRejoin ? 'rejoined' : 'joined'} the jam`,
        timestamp: Date.now(),
        type: 'system'
      });
    };

    socket.on('join-session', ({ sessionId, username }: { sessionId: string; username: string }) => {
      if (!sessions[sessionId]) {
        socket.emit('error', 'Session not found');
        return;
      }
      addToSession(sessionId, username, false);
      socket.emit('joined-session', { sessionId, state: sessions[sessionId] });
      console.log(`${username} (${socket.id}) joined session ${sessionId}`);
    });

    socket.on('rejoin-session', ({ sessionId, username }: { sessionId: string; username: string }) => {
      if (!sessions[sessionId]) {
        socket.emit('session-expired');
        return;
      }
      addToSession(sessionId, username, true);
      socket.emit('rejoined-session', { sessionId, state: sessions[sessionId] });
      console.log(`${username} (${socket.id}) rejoined session ${sessionId}`);
    });

    // ── WebRTC DataChannels now handle Chat, Reactions, Playback, and Media Sync ──

    // ── WebRTC Signaling (Relay) ─────────────────────────────────────────

    socket.on('webrtc-offer', ({ targetSocketId, offer, senderUsername }: { targetSocketId: string; offer: object; senderUsername: string }) => {
      io.to(targetSocketId).emit('webrtc-offer', { senderSocketId: socket.id, offer, senderUsername });
    });

    socket.on('webrtc-answer', ({ targetSocketId, answer }: { targetSocketId: string; answer: object }) => {
      io.to(targetSocketId).emit('webrtc-answer', { senderSocketId: socket.id, answer });
    });

    socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }: { targetSocketId: string; candidate: object }) => {
      io.to(targetSocketId).emit('webrtc-ice-candidate', { senderSocketId: socket.id, candidate });
    });

    socket.on('disconnect', () => {
      for (const [sessionId, session] of Object.entries(sessions)) {
        const participant = session.participants.find(p => p.socketId === socket.id);
        if (participant) {
          const username = participant.username;
          session.participants = session.participants.filter(p => p.socketId !== socket.id);
          io.to(sessionId).emit('participants-update', session.participants);
          
          io.to(sessionId).emit('chat-message', {
            username: 'System',
            text: `${username} left the jam`,
            timestamp: Date.now(),
            type: 'system'
          });
        }
      }
      console.log('User disconnected:', socket.id);
    });
  });
};
