import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import { setupJamSessionSockets } from './sockets/jamSession';

dotenv.config();

// ─── Setup ────────────────────────────────────────────────────────────
const app = express();
const port = Number(process.env.PORT) || 3001;

// ─── Middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Database ─────────────────────────────────────────────────────────
connectDB();

// ─── Routes ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.use('/auth', authRoutes);

// ─── Servers ──────────────────────────────────────────────────────────
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling']
});

// ─── WebSockets ───────────────────────────────────────────────────────
setupJamSessionSockets(io);

// ─── Start ────────────────────────────────────────────────────────────
httpServer.listen(port, () => {
  console.log(`> Backend running on http://localhost:${port}`);
});

