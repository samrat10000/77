"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = Number(process.env.PORT) || 3001;
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
});
const sessions = {};
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
    socket.on('join-session', (sessionId) => {
        if (sessions[sessionId]) {
            socket.join(sessionId);
            if (!sessions[sessionId].participants.includes(socket.id)) {
                sessions[sessionId].participants.push(socket.id);
            }
            socket.emit('joined-session', { sessionId, state: sessions[sessionId] });
            io.to(sessionId).emit('participants-update', sessions[sessionId].participants);
            console.log(`User ${socket.id} joined session ${sessionId}`);
        }
        else {
            socket.emit('error', 'Session not found');
        }
    });
    socket.on('playback-sync', ({ sessionId, state }) => {
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
