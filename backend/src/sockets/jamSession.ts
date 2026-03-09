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

    socket.on('chat-message', ({ sessionId, text, username }: { sessionId: string; text: string; username: string }) => {
      if (sessions[sessionId]) {
        io.to(sessionId).emit('chat-message', {
          username,
          text,
          timestamp: Date.now(),
          type: 'user'
        });
      }
    });

    socket.on('send-reaction', ({ sessionId, emoji }: { sessionId: string; emoji: string }) => {
      if (sessions[sessionId]) {
        io.to(sessionId).emit('new-reaction', {
          emoji,
          id: Math.random().toString(36).substring(7)
        });
      }
    });

    socket.on('playback-sync', ({ sessionId, state }: { sessionId: string; state: Partial<PlaybackState> }) => {
      if (sessions[sessionId]) {
        sessions[sessionId] = { ...sessions[sessionId], ...state, lastUpdated: Date.now() };
        socket.to(sessionId).emit('playback-update', state);
      }
    });

    // ── Media events (host only) ──────────────────────────────────────────

    socket.on('media:load', ({ sessionId, url, type }: { sessionId: string; url: string; type: 'youtube' | 'video' | 'audio' }) => {
      const session = sessions[sessionId];
      if (!session) return;
      const sender = session.participants.find(p => p.socketId === socket.id);
      if (!sender || sender.username !== session.hostUsername) return; // host only
      session.media = { url, type };
      io.to(sessionId).emit('media:load', { url, type });
    });

    socket.on('media:sync', ({ sessionId, time, state }: { sessionId: string; time: number; state: 'playing' | 'paused' }) => {
      const session = sessions[sessionId];
      if (!session) return;
      const sender = session.participants.find(p => p.socketId === socket.id);
      if (!sender || sender.username !== session.hostUsername) return;
      socket.to(sessionId).emit('media:sync', { time, state });
    });

    socket.on('media:seek', ({ sessionId, time }: { sessionId: string; time: number }) => {
      const session = sessions[sessionId];
      if (!session) return;
      const sender = session.participants.find(p => p.socketId === socket.id);
      if (!sender || sender.username !== session.hostUsername) return;
      socket.to(sessionId).emit('media:seek', { time });
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
