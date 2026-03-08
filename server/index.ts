import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { PlaybackState, JamSessionState } from '../src/features/jam/types';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = Number(process.env.PORT) || 3000;

// prepare next app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Still allow all for flexible access, though same-origin is now default
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'] // Allow both, but unified server handles polling better
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
    });
  });

  httpServer.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
