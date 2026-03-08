import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

export interface PlaybackState {
  trackIndex: number;
  isPlaying: boolean;
  progress: number;
}

export interface JamSessionState {
  hostId: string;
  participants: string[];
  trackIndex: number;
  isPlaying: boolean;
  progress: number;
  lastUpdated: number;
}

const app = express();
const port = Number(process.env.PORT) || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

const sessions: Record<string, JamSessionState> = {};

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

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
  });
});

httpServer.listen(port, () => {
  console.log(`> Backend server running on http://localhost:${port}`);
});
