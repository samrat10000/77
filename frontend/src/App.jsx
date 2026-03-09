import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Zap, Users, Share2, LogOut, User, Send, Smile } from "lucide-react";
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { nextTrack, previousTrack, setCurrentIndex } from '@/features/playlist/playlistSlice';
import { togglePlay, syncState, setProgress } from '@/features/player/playerSlice';
import { useAudioPlayer } from '@/lib/audio';
import { socketClient } from '@/lib/socketClient';
import { setSessionId, setIsHost, setParticipants, leaveSession } from '@/features/jam/jamSlice';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ────────────────────────────────────────────────────────────────

const BACKEND_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const LS_TOKEN = 'jam_token';
const LS_USERNAME = 'jam_username';
const LS_SESSION = 'jam_session_id';

// ─── Auth helpers ─────────────────────────────────────────────────────────────

const getStoredUsername = () => localStorage.getItem(LS_USERNAME) || '';
const getStoredToken = () => localStorage.getItem(LS_TOKEN) || '';

async function apiAuth(endpoint, body) {
  const res = await fetch(`${BACKEND_URL}/auth/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Floating Reactions ───────────────────────────────────────────────────────

function FloatingReaction({ emoji, onComplete, startX, endX }) {
  return (
    <motion.div
      initial={{ y: 0, opacity: 1, scale: 0.5, x: startX }}
      animate={{ y: -400, opacity: 0, scale: 1.5, x: endX }}
      transition={{ duration: 3, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      className="absolute bottom-20 text-4xl pointer-events-none select-none z-50 left-1/2 -translate-x-1/2"
    >
      {emoji}
    </motion.div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

function ChatPanel({ messages, onSendMessage, onClose, isTripMode, username }) {
  const [text, setText] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className={`fixed top-0 right-0 w-80 h-full z-40 flex flex-col border-l shadow-2xl backdrop-blur-xl ${
        isTripMode ? 'bg-black/60 border-white/10' : 'bg-white/80 border-zinc-200'
      }`}
    >
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
        <h2 className={`font-bold text-sm uppercase tracking-widest ${isTripMode ? 'text-white' : 'text-zinc-900'}`}>
          Jam Chat
        </h2>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">✕</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.type === 'system' ? 'items-center' : m.username === username ? 'items-end' : 'items-start'}`}>
            {m.type === 'system' ? (
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter bg-zinc-100/50 px-2 py-0.5 rounded-full mb-1">
                {m.text}
              </span>
            ) : (
              <>
                <span className="text-[10px] font-bold text-zinc-400 mb-1 px-1">{m.username}</span>
                <div className={`px-3 py-2 rounded-2xl text-xs max-w-[90%] wrap-break-word ${
                  m.username === username 
                    ? 'bg-zinc-900 text-white rounded-tr-none' 
                    : isTripMode ? 'bg-white/10 text-white rounded-tl-none' : 'bg-zinc-100 text-zinc-900 rounded-tl-none'
                }`}>
                  {m.text}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-100 flex space-x-2">
        <input
          type="text"
          placeholder="Say something..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`flex-1 px-4 py-2.5 rounded-xl text-xs border focus:ring-1 focus:outline-none transition-all ${
            isTripMode
              ? 'bg-white/5 border-white/10 text-white focus:ring-white/30 placeholder:text-zinc-500'
              : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-zinc-400 placeholder:text-zinc-400'
          }`}
        />
        <button type="submit" className="p-2.5 bg-zinc-900 text-white rounded-xl hover:scale-105 active:scale-95 transition-all">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </motion.div>
  );
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

function AuthModal({ onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, username: name } = await apiAuth(mode, { username, password });
      localStorage.setItem(LS_TOKEN, token);
      localStorage.setItem(LS_USERNAME, name);
      onSuccess(name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="w-full max-w-xs p-8 flex flex-col space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-zinc-900 tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-1 focus:ring-zinc-400 focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-1 focus:ring-zinc-400 focus:outline-none"
            required
          />
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-700 transition-all disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? 'Sign in' : 'Register'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          className="text-[11px] text-zinc-400 hover:text-zinc-700 transition-colors text-center"
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const dispatch = useAppDispatch();
  const { tracks, currentIndex } = useAppSelector((state) => state.playlist);
  const { isPlaying, progress, duration } = useAppSelector((state) => state.player);
  const { sessionId, isHost, participants, isJoined } = useAppSelector((state) => state.jam);

  const [username, setUsername] = useState(getStoredUsername);
  const [isTripMode, setIsTripMode] = useState(false);
  const [bgIndex, setBgIndex] = useState(1);
  const [joinId, setJoinId] = useState('');

  const currentTrack = tracks[currentIndex];
  const { audioRef, seek } = useAudioPlayer();

  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef(null);

  // ── Seek ──────────────────────────────────────────────────────────────────

  const handleSeek = useCallback((e) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    seek(pos * duration);
  }, [duration, seek]);

  const handleMouseDown = (e) => { setIsDragging(true); handleSeek(e); };
  const handleTouchStart = (e) => { setIsDragging(true); handleSeek(e); };

  useEffect(() => {
    const onMove = (e) => { if (isDragging) handleSeek(e); };
    const onUp = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMove);
      window.addEventListener('touchend', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging, handleSeek]);

  // ── Chat & Reactions State ────────────────────────────────────────────────
  
  const [messages, setMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeReactions, setActiveReactions] = useState([]);

  // ── Socket / Jam ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!username) return; // wait until logged in

    const socket = socketClient.connect();

    socket.on('session-created', ({ sessionId: id }) => {
      dispatch(setSessionId(id));
      dispatch(setIsHost(true));
      localStorage.setItem(LS_SESSION, id);
    });

    socket.on('joined-session', ({ sessionId: id, state }) => {
      dispatch(setSessionId(id));
      dispatch(setIsHost(false));
      dispatch(setCurrentIndex(state.trackIndex));
      dispatch(syncState({ isPlaying: state.isPlaying, progress: state.progress }));
      localStorage.setItem(LS_SESSION, id);
    });

    // Auto-rejoin after page refresh
    socket.on('rejoined-session', ({ sessionId: id, state }) => {
      dispatch(setSessionId(id));
      dispatch(setIsHost(state.hostUsername === username));
      dispatch(setCurrentIndex(state.trackIndex));
      dispatch(syncState({ isPlaying: state.isPlaying, progress: state.progress }));
    });

    socket.on('session-expired', () => {
      localStorage.removeItem(LS_SESSION);
    });

    socket.on('participants-update', (users) => {
      dispatch(setParticipants(users));
    });

    socket.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('new-reaction', (reaction) => {
      setActiveReactions((prev) => [...prev, {
        ...reaction,
        startX: (Math.random() - 0.5) * 100,
        endX: (Math.random() - 0.5) * 200
      }]);
    });

    socket.on('playback-update', (state) => {
      if (!isHost) {
        if (state.trackIndex !== undefined) dispatch(setCurrentIndex(state.trackIndex));
        if (state.isPlaying !== undefined) dispatch(syncState({ isPlaying: state.isPlaying }));
        if (state.progress !== undefined) {
          dispatch(setProgress(state.progress));
          if (audioRef.current) audioRef.current.currentTime = state.progress;
        }
      }
    });

    // Auto-rejoin saved jam session on mount
    const savedSession = localStorage.getItem(LS_SESSION);
    if (savedSession) {
      socket.emit('rejoin-session', { sessionId: savedSession, username });
    }

    return () => { 
      socket.off('session-created');
      socket.off('joined-session');
      socket.off('rejoined-session');
      socket.off('session-expired');
      socket.off('participants-update');
      socket.off('chat-message');
      socket.off('new-reaction');
      socket.off('playback-update');
    };
  }, [dispatch, isHost, audioRef, username]);

  // ── Host playback sync ────────────────────────────────────────────────────

  useEffect(() => {
    if (isHost && sessionId) {
      socketClient.emit('playback-sync', {
        sessionId,
        state: { trackIndex: currentIndex, isPlaying, progress }
      });
    }
  }, [isHost, sessionId, currentIndex, isPlaying, progress]);

  // ── Trip Mode ─────────────────────────────────────────────────────────────

  useEffect(() => {
    let interval;
    if (isTripMode) {
      interval = setInterval(() => setBgIndex((prev) => (prev % 5) + 1), 200);
    }
    return () => clearInterval(interval);
  }, [isTripMode]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  const handleCreateSession = () => socketClient.emit('create-session', { username });

  const handleJoinSession = (e) => {
    e.preventDefault();
    if (joinId.trim()) socketClient.emit('join-session', { sessionId: joinId.trim(), username });
  };

  const handleLeaveSession = () => {
    dispatch(leaveSession());
    localStorage.removeItem(LS_SESSION);
    socketClient.disconnect();
    setMessages([]);
  };

  const handleSendMessage = (text) => {
    if (sessionId) {
      socketClient.emit('chat-message', { sessionId, text, username });
    }
  };

  const handleSendReaction = (emoji) => {
    if (sessionId) {
      socketClient.emit('send-reaction', { sessionId, emoji });
    }
  };

  // ── Auth gate ─────────────────────────────────────────────────────────────

  if (!username || !getStoredToken()) {
    return <AuthModal onSuccess={(name) => setUsername(name)} />;
  }

  if (!currentTrack) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between p-8 md:p-12 font-sans selection:bg-zinc-200 overflow-hidden">

      {/* Trip Mode Background */}
      {isTripMode && (
        <div
          className="absolute inset-0 z-0 transition-none"
          style={{
            backgroundImage: `url('/trip/bg${bgIndex}.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      {isTripMode && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10" />}

      {/* Hidden Audio Element */}
      <audio ref={audioRef} crossOrigin="anonymous" />

      {/* ── Floating Reactions Overlay ── */}
      <AnimatePresence>
        {activeReactions.map((r) => (
          <FloatingReaction
            key={r.id}
            emoji={r.emoji}
            startX={r.startX}
            endX={r.endX}
            onComplete={() => setActiveReactions((prev) => prev.filter((item) => item.id !== r.id))}
          />
        ))}
      </AnimatePresence>

      {/* ── Chat Panel Overlay ── */}
      <AnimatePresence>
        {isChatOpen && (
          <ChatPanel
            messages={messages}
            username={username}
            isTripMode={isTripMode}
            onSendMessage={handleSendMessage}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Player Section ── */}
      <section className="relative z-20 w-full max-w-sm flex flex-col items-center mt-12 md:mt-24 space-y-10 transition-all duration-500">

        {/* Album Art */}
        <div className="w-full aspect-square bg-white shadow-xl shadow-black/5 p-4 md:p-5 flex flex-col justify-between">
          <div className="w-full h-full bg-zinc-100 flex items-center justify-center overflow-hidden relative">
            <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="absolute top-4 right-4 z-30 p-2 rounded-full bg-white/80 backdrop-blur shadow-sm hover:scale-110 transition-all"
            >
              <Share2 className="w-4 h-4 text-zinc-900 rotate-90" />
            </button>
            {currentTrack.albumArt ? (
              <img
                src={currentTrack.albumArt}
                alt={currentTrack.title}
                className="w-full h-full object-cover mix-blend-multiply opacity-90"
              />
            ) : (
              <div className="w-32 h-32 md:w-48 md:h-48 bg-blue-600 rounded-full blur-xl opacity-80 mix-blend-multiply animate-pulse" />
            )}
          </div>
          <div className="flex justify-between items-center text-[9px] text-zinc-400 uppercase tracking-widest mt-4 truncate">
            <span className="truncate pr-2">{currentTrack.artist}</span>
            <span>Single</span>
          </div>
        </div>

        {/* Song Info & Controls */}
        <div className="w-full flex flex-col">
          <div className="mb-6">
            <h1 className="text-3xl font-serif font-bold tracking-tight truncate text-zinc-900" title={currentTrack.title}>
              {currentTrack.title}
            </h1>
            <p className="font-medium mt-1 truncate text-zinc-600" title={currentTrack.artist}>
              {currentTrack.artist}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full space-y-3 select-none">
            <div
              ref={progressBarRef}
              className="w-full relative cursor-pointer group py-3 flex items-center"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              <div className="w-full h-[2px] bg-zinc-200 rounded-full relative overflow-visible">
                <div
                  className={`absolute top-0 left-0 h-full rounded-full transition-all ${isDragging ? 'duration-0' : 'duration-75'} linear bg-zinc-900`}
                  style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                />
                <div
                  className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-sm transition-all ${isDragging ? 'duration-0' : 'duration-75'} linear bg-zinc-900 scale-0 group-hover:scale-100 ${isDragging ? 'scale-110' : ''}`}
                  style={{ left: `${duration ? (progress / duration) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-medium tracking-tight font-mono text-zinc-400">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between mt-6 px-2">
            <button className="text-zinc-400 hover:text-zinc-800 transition-colors">
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={() => dispatch(previousTrack())} className="text-zinc-800 hover:text-zinc-600 transition-colors">
              <SkipBack className="w-6 h-6 fill-current" />
            </button>
            <button
              onClick={() => dispatch(togglePlay())}
              className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10 bg-zinc-900 text-white"
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
            </button>
            <button onClick={() => dispatch(nextTrack())} className="text-zinc-800 hover:text-zinc-600 transition-colors">
              <SkipForward className="w-6 h-6 fill-current" />
            </button>
            <button className="text-zinc-400 hover:text-zinc-800 transition-colors">
              <Repeat className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reaction Bar & Trip Mode */}
        <div className="flex flex-col items-center space-y-6 w-full">
          {isJoined && (
            <div className={`flex items-center space-x-4 p-2 px-4 rounded-2xl border ${
              isTripMode ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-100'
            }`}>
              {['❤️', '🔥', '🎸', '😮', '🙌'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendReaction(emoji)}
                  className="text-xl hover:scale-125 active:scale-90 transition-all grayscale-[0.5] hover:grayscale-0"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setIsTripMode(!isTripMode)}
            className={`flex items-center space-x-2 px-6 py-2 rounded-full border transition-all duration-300 group ${
              isTripMode
                ? 'bg-white/20 border-white/40 text-white hover:bg-white/30'
                : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200 hover:border-zinc-300'
            }`}
          >
            <Zap className={`w-4 h-4 ${isTripMode ? 'fill-white animate-pulse' : 'text-zinc-400 group-hover:text-zinc-600'}`} />
            <span className="text-[10px] font-bold tracking-widest uppercase">Trip Mode</span>
          </button>
        </div>

        {/* ── Jam Session UI ── */}
        <div className={`w-full pt-6 border-t ${isTripMode ? 'border-white/10' : 'border-zinc-100'}`}>
          {!isJoined ? (
            <div className="space-y-4">
              <button
                onClick={handleCreateSession}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all font-medium text-sm"
              >
                <Users className="w-4 h-4" />
                <span>Start Jam Session</span>
              </button>

              <form onSubmit={handleJoinSession} className="relative">
                <input
                  type="text"
                  placeholder="Paste Jam Code..."
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl text-sm border focus:ring-1 focus:outline-none transition-all ${
                    isTripMode
                      ? 'bg-white/5 border-white/10 text-white focus:ring-white/30 placeholder:text-zinc-500'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-zinc-400 placeholder:text-zinc-400'
                  }`}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-zinc-200 text-zinc-900 font-bold text-[10px] uppercase hover:bg-zinc-300 transition-all"
                >
                  Join
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border flex flex-col space-y-3 ${isTripMode ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'}`}>
                {/* Session header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isTripMode ? 'text-white' : 'text-zinc-900'}`}>
                      {isHost ? 'Hosting Jam' : 'Joined Jam'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className={`p-1.5 rounded-md transition-all ${isTripMode ? 'hover:bg-white/10' : 'hover:bg-zinc-200'}`}
                      title="Open Chat"
                    >
                      <Share2 className="w-4 h-4 rotate-90" />
                    </button>
                    <button
                      onClick={handleLeaveSession}
                      className="p-1 rounded-md hover:bg-red-500/10 text-red-500 transition-all"
                      title="Leave Session"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Session code */}
                <div className="flex items-center justify-between">
                  <code className={`text-xs font-mono font-bold ${isTripMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {sessionId}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(sessionId || '')}
                    className="flex items-center space-x-1 px-2 py-1 rounded bg-zinc-900 text-[9px] text-white font-bold uppercase hover:bg-zinc-800"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>

                {/* Participant avatars — now showing real usernames */}
                <div className="flex items-center -space-x-2">
                  {participants.slice(0, 5).map((p, i) => (
                    <div
                      key={p.socketId}
                      className="w-7 h-7 rounded-full border-2 border-zinc-50 bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                      title={p.username}
                      style={{ zIndex: participants.length - i }}
                    >
                      {p.username?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  ))}
                  {participants.length > 5 && (
                    <div className="pl-3 text-[10px] font-bold text-zinc-400">
                      +{participants.length - 5} others
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Lyrics footer */}
      <footer className="relative z-10 w-full max-w-sm text-center mt-12 md:mt-24 mb-8">
        <p className="text-sm leading-relaxed font-serif italic text-zinc-600">
          {currentTrack.quote?.split('\n').map((line, i) => (
            <span key={i}>{line}<br /></span>
          ))}
        </p>
      </footer>
    </main>
  );
}
