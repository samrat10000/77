import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose, { Schema, model } from 'mongoose';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'jam-session-secret-key';
const SALT_ROUNDS = 10;

// ─── MongoDB ──────────────────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGODB_URI || '';

if (!MONGO_URI) {
  console.warn('⚠️  No MONGODB_URI set — users will not persist across restarts');
}

interface IUser {
  username: string;
  passwordHash: string;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
});

const User = model<IUser>('User', UserSchema);

// Connect to MongoDB (non-blocking — server starts regardless)
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));
}


// ─── Types ────────────────────────────────────────────────────────────────────

interface Participant {
  socketId: string;
  username: string;
}

export interface PlaybackState {
  trackIndex: number;
  isPlaying: boolean;
  progress: number;
}

export interface JamSessionState {
  hostId: string;
  participants: Participant[];
  trackIndex: number;
  isPlaying: boolean;
  progress: number;
  lastUpdated: number;
}

// ─── In-memory stores (sessions only — users are persisted in MongoDB) ──────────

const sessions: Record<string, JamSessionState> = {};

// ─── Express setup ───────────────────────────────────────────────────────────

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

// ─── Socket.io ───────────────────────────────────────────────────────────────

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling']
});

// ─── Auth Routes ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  try {
    // Ensure we don't try to query if DB isn't ready
    if (mongoose.connection.readyState !== 1 && MONGO_URI) {
      console.log('⏳ Waiting for DB connection...');
      await mongoose.connect(MONGO_URI);
    }

    const existing = await User.findOne({ username });
    if (existing) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await User.create({ username, passwordHash });
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, username });
  } catch (err) {
    console.error('❌ Registration Error:', err);
    res.status(500).json({ error: 'Server error during registration', details: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    if (mongoose.connection.readyState !== 1 && MONGO_URI) {
      await mongoose.connect(MONGO_URI);
    }

    const user = await User.findOne({ username });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username });
  } catch (err) {
    console.error('❌ Login Error:', err);
    res.status(500).json({ error: 'Server error during login', details: err instanceof Error ? err.message : String(err) });
  }
});

// ─── Socket Events ───────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-session', ({ username }: { username: string }) => {
    const sessionId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const participant: Participant = { socketId: socket.id, username };
    sessions[sessionId] = {
      hostId: socket.id,
      participants: [participant],
      trackIndex: 0,
      isPlaying: false,
      progress: 0,
      lastUpdated: Date.now()
    };
    socket.join(sessionId);
    socket.emit('session-created', { sessionId, state: sessions[sessionId] });
    io.to(sessionId).emit('participants-update', sessions[sessionId].participants);
    console.log(`Session created: ${sessionId} by ${username} (${socket.id})`);
  });

  const addToSession = (sessionId: string, username: string) => {
    socket.join(sessionId);
    const existing = sessions[sessionId].participants.find(p => p.socketId === socket.id);
    if (!existing) {
      sessions[sessionId].participants.push({ socketId: socket.id, username });
    } else {
      existing.username = username; // refresh name in case of rejoin
    }
    io.to(sessionId).emit('participants-update', sessions[sessionId].participants);
  };

  socket.on('join-session', ({ sessionId, username }: { sessionId: string; username: string }) => {
    if (!sessions[sessionId]) {
      socket.emit('error', 'Session not found');
      return;
    }
    addToSession(sessionId, username);
    socket.emit('joined-session', { sessionId, state: sessions[sessionId] });
    console.log(`${username} (${socket.id}) joined session ${sessionId}`);
  });

  // Rejoin after page refresh — same logic as join but doesn't clear state
  socket.on('rejoin-session', ({ sessionId, username }: { sessionId: string; username: string }) => {
    if (!sessions[sessionId]) {
      socket.emit('session-expired'); // let frontend clear localStorage
      return;
    }
    addToSession(sessionId, username);
    socket.emit('rejoined-session', { sessionId, state: sessions[sessionId] });
    console.log(`${username} (${socket.id}) rejoined session ${sessionId}`);
  });

  socket.on('playback-sync', ({ sessionId, state }: { sessionId: string; state: Partial<PlaybackState> }) => {
    if (sessions[sessionId]) {
      sessions[sessionId] = { ...sessions[sessionId], ...state, lastUpdated: Date.now() };
      socket.to(sessionId).emit('playback-update', state);
    }
  });

  socket.on('disconnect', () => {
    // Clean up participant from all sessions
    for (const [sessionId, session] of Object.entries(sessions)) {
      const before = session.participants.length;
      session.participants = session.participants.filter(p => p.socketId !== socket.id);
      if (session.participants.length !== before) {
        io.to(sessionId).emit('participants-update', session.participants);
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

httpServer.listen(port, () => {
  console.log(`> Backend running on http://localhost:${port}`);
});
