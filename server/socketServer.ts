import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { PlaybackState, JamSessionState } from '../src/features/jam/types';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for local network testing
    methods: ["GET", "POST"]
  }
});

const sessions: Record<string, JamSessionState> = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-session', () => {
    const sessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
    sessions[sessionId] = {
      hostId: socket.id,
      participants: [socket.id],
      trackIndex: 0,
      isPlaying: false,
      progress: 0,
      lastUpdated: Date.now()
    };
    socket.join(sessionId);
    socket.emit('session-created', { sessionId, state: sessions[sessionId] });
    console.log(`Session created: ${sessionId} by ${socket.id}`);
  });

  socket.on('join-session', (sessionId: string) => {
    if (sessions[sessionId]) {
      socket.join(sessionId);
      if (!sessions[sessionId].participants.includes(socket.id)) {
        sessions[sessionId].participants.push(socket.id);
      }
      socket.emit('joined-session', { sessionId, state: sessions[sessionId] });
      io.to(sessionId).emit('participants-update', sessions[sessionId].participants);
      console.log(`User ${socket.id} joined session ${sessionId}`);
    } else {
      socket.emit('error', 'Session not found');
    }
  });

  socket.on('playback-sync', ({ sessionId, state }: { sessionId: string, state: Partial<PlaybackState> }) => {
    if (sessions[sessionId]) {
      sessions[sessionId] = { ...sessions[sessionId], ...state, lastUpdated: Date.now() };
      socket.to(sessionId).emit('playback-update', state);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Cleanup logic could go here (e.g., removing participant, closing session if host leaves)
  });
});

const PORT = Number(process.env.PORT) || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket server running on port ${PORT}`);
});
