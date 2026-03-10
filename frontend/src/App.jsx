import { useState, useEffect, useRef, useCallback, lazy, Suspense, memo } from 'react';
import { Moon, Sun, MessageSquare, Heart } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { setCurrentIndex } from '@/features/playlist/playlistSlice';
import { syncState, setProgress } from "@/features/player/playerSlice";
import { useAudioPlayer } from '@/lib/audio';
import { socketClient } from '@/lib/socketClient';
import { webrtcClient } from '@/lib/webrtcClient';
import { setSessionId, setIsHost, setParticipants, leaveSession } from '@/features/jam/jamSlice';
import { AnimatePresence, motion } from 'framer-motion';

import { getStoredUsername, getStoredToken, LS_SESSION } from '@/lib/auth';
const AuthModal = lazy(() => import('@/components/auth/AuthModal').then(m => ({ default: m.AuthModal })));
const FloatingReaction = memo(lazy(() => import('@/components/chat/FloatingReaction').then(m => ({ default: m.FloatingReaction }))));
const ChatPanel = lazy(() => import('@/components/chat/ChatPanel').then(m => ({ default: m.ChatPanel })));
const PlayerSection = lazy(() => import('@/components/player/PlayerSection').then(m => ({ default: m.PlayerSection })));
const JamSessionSection = lazy(() => import('@/components/jam/JamSessionSection').then(m => ({ default: m.JamSessionSection })));
const MediaInput = lazy(() => import('@/components/media/MediaInput').then(m => ({ default: m.MediaInput })));
const MediaPlayer = lazy(() => import('@/components/media/MediaPlayer').then(m => ({ default: m.MediaPlayer })));
const SketchCanvas = lazy(() => import('@/components/media/SketchCanvas').then(m => ({ default: m.SketchCanvas })));
import { setMedia, setMediaState, setMediaTime, clearMedia } from '@/features/media/mediaSlice';

export default function App() {
  const dispatch = useAppDispatch();
  const { tracks, currentIndex } = useAppSelector((state) => state.playlist);
  const { isPlaying, progress, duration } = useAppSelector((state) => state.player);
  const { sessionId, isHost, participants, isJoined } = useAppSelector((state) => state.jam);
  const { url: mediaUrl, type: mediaType, mediaState, mediaTime } = useAppSelector((state) => state.media);

  const [username, setUsername] = useState(getStoredUsername);
  const [isTripMode, setIsTripMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [bgIndex, setBgIndex] = useState(1);
  const [joinId, setJoinId] = useState('');
  const [chatNotification, setChatNotification] = useState(null);
  const [nudgeVisual, setNudgeVisual] = useState(false);
  const [isPerfectSync, setIsPerfectSync] = useState(false);
  const [incomingStroke, setIncomingStroke] = useState(null);
  const [isDoodling, setIsDoodling] = useState(false);
  const [clearSketchSignal, setClearSketchSignal] = useState(0);
  const lastLocalTapRef = useRef(0);

  const currentTrack = tracks[currentIndex];
  const { audioRef, seek } = useAudioPlayer();

  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef(null);

  // ── Chat & Reactions State ────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeReactions, setActiveReactions] = useState([]);

  const isChatOpenRef = useRef(isChatOpen);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

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

  // ── Socket / Jam ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!username) return; // wait until logged in

    const socket = socketClient.connect();

    socket.on('session-created', ({ sessionId: id }) => {
      dispatch(setSessionId(id));
      dispatch(setIsHost(true));
      localStorage.setItem(LS_SESSION, id);
      webrtcClient.init(true, username, socket.id);
    });

    socket.on('joined-session', ({ sessionId, state }) => {
      dispatch(setSessionId(sessionId));
      dispatch(setParticipants(state.participants || []));
      dispatch(setIsHost(false));
      webrtcClient.init(false, username, socket.id);
      webrtcClient.syncPeers(state.participants || []);
      
      // Sync music player
      if (state.trackIndex !== undefined) dispatch(setCurrentIndex(state.trackIndex));
      if (state.isPlaying !== undefined) dispatch(syncState({ isPlaying: state.isPlaying }));
      
      // Catch up on progress
      const now = Date.now();
      const elapsedSinceUpdate = (now - (state.lastUpdated || now)) / 1000;
      const actualProgress = state.isPlaying ? state.progress + elapsedSinceUpdate : state.progress;
      dispatch(setProgress(actualProgress));
      
      // Force audio sync immediately on join
      if (audioRef.current && actualProgress > 0) {
        audioRef.current.currentTime = actualProgress;
      }
      
      // Update media if exists
      if (state.media && state.media.url) {
        dispatch(setMedia(state.media));
      }
      localStorage.setItem(LS_SESSION, sessionId);
    });

    // Auto-rejoin after page refresh
    socket.on('rejoined-session', ({ sessionId: id, state }) => {
      dispatch(setSessionId(id));
      const hostCheck = state.hostUsername === username;
      dispatch(setIsHost(hostCheck));
      webrtcClient.init(hostCheck, username, socket.id);
      webrtcClient.syncPeers(state.participants || []);

      dispatch(setCurrentIndex(state.trackIndex));
      dispatch(syncState({ isPlaying: state.isPlaying, progress: state.progress }));
      if (state.media?.url) {
        dispatch(setMedia(state.media));
      }
    });

    socket.on('session-expired', () => {
      localStorage.removeItem(LS_SESSION);
    });

    socket.on('participants-update', (users) => {
      dispatch(setParticipants(users));
      webrtcClient.syncPeers(users);
    });

    const handleChatMsg = (msg) => {
      if (!msg) return;
      setMessages((prev) => [...prev, msg]);
      
      if (!isChatOpenRef.current && msg.type === 'user' && msg.username && msg.username !== username) {
        setChatNotification(msg);
        setTimeout(() => setChatNotification(null), 5000);
      }
    };

    const handleReaction = (reaction) => {
      setActiveReactions((prev) => [...prev, {
        ...reaction,
        startX: (Math.random() - 0.5) * 100,
        endX: (Math.random() - 0.5) * 200
      }]);
    };

    const handlePlaybackUpdate = (state) => {
      if (!state) return;
      if (!isHost) {
        if (state.trackIndex !== undefined) dispatch(setCurrentIndex(state.trackIndex));
        if (state.isPlaying !== undefined) dispatch(syncState({ isPlaying: state.isPlaying }));
        if (state.progress !== undefined && typeof state.progress === 'number' && !isNaN(state.progress)) {
          dispatch(setProgress(state.progress));
          if (audioRef?.current) {
            try {
              const diff = Math.abs(audioRef.current.currentTime - state.progress);
              if (diff > 1) { // 1 second tolerance to prevent stuttering
                audioRef.current.currentTime = state.progress;
              }
            } catch (e) {
              console.warn("Failed to sync audio time:", e);
            }
          }
        }
      }
    };

    const handleMediaLoad = (data) => {
      if (data?.url) dispatch(setMedia(data));
    };

    const handleMediaSync = (data) => {
      if (!data) return;
      if (data.time !== undefined && typeof data.time === 'number' && !isNaN(data.time)) {
        dispatch(setMediaTime(data.time));
      }
      if (data.state) dispatch(setMediaState(data.state));
    };

    const handleMediaSeek = (data) => {
      if (data?.time !== undefined && typeof data.time === 'number' && !isNaN(data.time)) {
        dispatch(setMediaTime(data.time));
      }
    };
    
    const handleNudge = (payload) => {
      const remoteTimestamp = payload?.timestamp || 0;
      
      // If taps are within 200ms of each other (adjusting for network jitter)
      // or if the remote tap is very close to our last local tap
      const isSync = (remoteTimestamp && Math.abs(remoteTimestamp - lastLocalTapRef.current) < 200);

      if (isSync) {
        setIsPerfectSync(true);
        setTimeout(() => setIsPerfectSync(false), 2000);
      } else {
        setNudgeVisual(true);
        setTimeout(() => setNudgeVisual(false), 1000);
      }
      
      if ('vibrate' in navigator) {
        if (isSync) {
          navigator.vibrate([100, 50, 100, 50, 300]); // Intense sync vibration
        } else {
          navigator.vibrate([200, 100, 200]);
        }
      }
    };

    webrtcClient.on('chat-message', handleChatMsg);
    webrtcClient.on('new-reaction', handleReaction);
    webrtcClient.on('playback-update', handlePlaybackUpdate);
    webrtcClient.on('media:load', handleMediaLoad);
    webrtcClient.on('media:sync', handleMediaSync);
    webrtcClient.on('media:seek', handleMediaSeek);
    webrtcClient.on('haptic-pulse', handleNudge);
    webrtcClient.on('drawing-data', (data) => setIncomingStroke(data));
    webrtcClient.on('clear-sketch', () => setClearSketchSignal(prev => prev + 1));

    // Re-bind socket listener specifically for system messages from the backend
    socket.on('chat-message', handleChatMsg);

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
      socket.off('chat-message', handleChatMsg);
      
      webrtcClient.off('chat-message', handleChatMsg);
      webrtcClient.off('new-reaction', handleReaction);
      webrtcClient.off('playback-update', handlePlaybackUpdate);
      webrtcClient.off('media:load', handleMediaLoad);
      webrtcClient.off('media:sync', handleMediaSync);
      webrtcClient.off('media:seek', handleMediaSeek);
      webrtcClient.off('haptic-pulse', handleNudge);
      webrtcClient.off('drawing-data');
      webrtcClient.off('clear-sketch');
    };
  }, [dispatch, isHost, audioRef, username]);

  // ── Host New Peer Sync ──────────────────────────────────────────────────
  useEffect(() => {
    const handlePeerConnected = () => {
      if (isHost && sessionId) {
        webrtcClient.send('playback-update', { trackIndex: currentIndex, isPlaying, progress });
        if (mediaUrl) {
          webrtcClient.send('media:load', { url: mediaUrl, type: mediaType });
          webrtcClient.send('media:sync', { time: mediaTime, state: mediaState });
        }
      }
    };
    webrtcClient.on('peer-connected', handlePeerConnected);
    return () => webrtcClient.off('peer-connected', handlePeerConnected);
  }, [isHost, sessionId, currentIndex, isPlaying, progress, mediaUrl, mediaType, mediaTime, mediaState]);

  // ── Host playback sync (Throttled) ─────────────────────────────────────────

  const lastSyncRef = useRef(0);
  useEffect(() => {
    if (isHost && sessionId) {
      const now = Date.now();
      // Only sync once every 800ms while playing, OR immediately if state changes
      const isImportantUpdate = !isPlaying || currentIndex !== lastSyncRef.current.trackIndex;
      
      if (isImportantUpdate || (now - lastSyncRef.current.time > 800)) {
        webrtcClient.send('playback-update', { trackIndex: currentIndex, isPlaying, progress });
        lastSyncRef.current = { time: now, trackIndex: currentIndex };
      }
    }
  }, [isHost, sessionId, currentIndex, isPlaying, progress]);

  // ── Trip Mode ─────────────────────────────────────────────────────────────

  useEffect(() => {
    let interval;
    if (isTripMode) {
      // Reduced frequency and using CSS transitions for smoother feel with less CPU
      interval = setInterval(() => setBgIndex((prev) => (prev % 5) + 1), 135);
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
    dispatch(clearMedia());
    localStorage.removeItem(LS_SESSION);
    socketClient.disconnect();
    setMessages([]);
  };

  const handleMediaLoad = ({ url, type }) => {
    if (!isHost || !sessionId) return;
    dispatch(setMedia({ url, type }));
    webrtcClient.send('media:load', { url, type });
  };

  const handleSendMessage = (text) => {
    if (sessionId) {
      const msg = { username, text, timestamp: Date.now(), type: 'user' };
      setMessages((prev) => [...prev, msg]); // Show locally
      webrtcClient.send('chat-message', msg);
    }
  };

  const handleSendReaction = (emoji) => {
    if (sessionId) {
      const reaction = { emoji, id: Math.random().toString(36).substring(7) };
      setActiveReactions((prev) => [...prev, {
        ...reaction,
        startX: (Math.random() - 0.5) * 100,
        endX: (Math.random() - 0.5) * 200
      }]);
      webrtcClient.send('new-reaction', reaction);
    }
  };

  const handleSendNudge = () => {
    if (sessionId) {
      const now = Date.now();
      lastLocalTapRef.current = now;
      setNudgeVisual(true);
      setTimeout(() => setNudgeVisual(false), 1000);
      webrtcClient.send('haptic-pulse', { timestamp: now });
    }
  };

  const handleClearSketch = () => {
    setClearSketchSignal(prev => prev + 1);
    webrtcClient.send('clear-sketch', {});
  };

  // ── Auth gate ─────────────────────────────────────────────────────────────

  if (!username || !getStoredToken()) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-zinc-500 font-mono text-xs uppercase tracking-widest animate-pulse">Loading Auth...</div>}>
        <AuthModal onSuccess={(name) => setUsername(name)} />
      </Suspense>
    );
  }

  if (!currentTrack) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className={`relative flex min-h-screen flex-col items-center justify-between p-8 md:p-12 font-sans overflow-hidden transition-colors duration-500 ${
      isTripMode ? 'selection:bg-white/20' : 'selection:bg-zinc-200'
    } ${
      isDarkMode && !isTripMode ? 'bg-zinc-950' : !isTripMode ? 'bg-white' : ''
    }`}>

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
      {isTripMode && <div className="absolute inset-0 bg-black/40 z-10 transition-all duration-700" />}

      {/* ── Sketch-It Canvas ── */}
      <Suspense fallback={null}>
        {isJoined && (
          <SketchCanvas 
            onDraw={(data) => webrtcClient.send('drawing-data', data)} 
            incomingStroke={incomingStroke} 
            isTripMode={isTripMode}
            enabled={isDoodling}
            clearTrigger={clearSketchSignal}
          />
        )}
      </Suspense>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} crossOrigin="anonymous" />

      {/* ── Dark Mode Toggle ── */}
      {!isTripMode && (
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`fixed top-5 left-5 z-100 p-2.5 rounded-full border shadow-sm transition-all duration-300 hover:scale-110 active:scale-95 ${
            isDarkMode
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700'
              : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      )}

      {/* ── Floating Reactions Overlay ── */}
      <Suspense fallback={null}>
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
      </Suspense>

      {/* ── Chat Notifications ── */}
      <AnimatePresence>
        {chatNotification && !isChatOpen && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            onClick={() => { setIsChatOpen(true); setChatNotification(null); }}
            className={`fixed top-16 right-5 z-100 cursor-pointer p-4 rounded-2xl shadow-2xl border backdrop-blur-3xl flex items-center space-x-4 max-w-[18rem] transition-all hover:scale-105 active:scale-95 ${
              isTripMode 
                ? 'bg-black/60 border-white/10 text-white' 
                : 'bg-white/90 border-zinc-200 text-zinc-900'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isTripMode ? 'bg-white/10' : 'bg-zinc-100'}`}>
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest leading-none mb-1">
                New Message • {chatNotification?.username || 'Guest'}
              </span>
              <p className="text-xs font-light truncate">
                {chatNotification?.text || '...'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chat Panel Overlay ── */}
      <Suspense fallback={null}>
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
      </Suspense>

      {/* ── Player Section ── */}
      <section className="relative w-full max-w-sm flex flex-col items-center mt-12 md:mt-24 space-y-10 transition-all duration-700 ease-in-out">
        <Suspense fallback={<div className="h-64 w-full flex items-center justify-center">Loading Player...</div>}>
          <PlayerSection
            currentTrack={currentTrack}
            isChatOpen={isChatOpen}
            setIsChatOpen={setIsChatOpen}
            progress={progress}
            duration={duration}
            isDragging={isDragging}
            progressBarRef={progressBarRef}
            handleMouseDown={handleMouseDown}
            handleTouchStart={handleTouchStart}
            formatTime={formatTime}
            isPlaying={isPlaying}
            isTripMode={isTripMode}
            isDarkMode={isDarkMode}
          />

          <JamSessionSection
            isJoined={isJoined}
            isTripMode={isTripMode}
            isDarkMode={isDarkMode}
            setIsTripMode={setIsTripMode}
            handleSendReaction={handleSendReaction}
            handleCreateSession={handleCreateSession}
            handleJoinSession={handleJoinSession}
            joinId={joinId}
            setJoinId={setJoinId}
            isHost={isHost}
            setIsChatOpen={setIsChatOpen}
            handleLeaveSession={handleLeaveSession}
            sessionId={sessionId}
            participants={participants}
            onSendNudge={handleSendNudge}
            isDoodling={isDoodling}
            setIsDoodling={setIsDoodling}
            onClearSketch={handleClearSketch}
          />
        </Suspense>

        {/* ── Media Input (host only) ── */}
        {isJoined && isHost && (
          <div className={`w-full pt-6 border-t ${isTripMode ? 'border-white/10' : 'border-zinc-100'}`}>
            <p className={`text-[10px] font-mono uppercase tracking-widest mb-3 ${isTripMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Load Media for Session
            </p>
            <Suspense fallback={<div className="h-20" />}>
              <MediaInput onLoad={handleMediaLoad} isTripMode={isTripMode} />
            </Suspense>
          </div>
        )}

        {/* ── Shared Media Player ── */}
        {mediaUrl && (
          <div className="w-full">
            <Suspense fallback={<div className="aspect-video w-full bg-black/10 rounded-2xl animate-pulse" />}>
              <MediaPlayer
                url={mediaUrl}
                type={mediaType}
                mediaState={mediaState}
                mediaTime={mediaTime}
                sessionId={sessionId}
                isHost={isHost}
                isTripMode={isTripMode}
              />
            </Suspense>
          </div>
        )}
      </section>

      {/* Lyrics footer */}
      <footer className="relative z-10 w-full max-w-sm text-center mt-12 md:mt-24 mb-8 transition-all duration-700 ease-in-out">
        <p className={`text-sm leading-relaxed font-serif italic transition-all duration-700 ease-in-out ${
          isTripMode ? 'text-white/50' : isDarkMode ? 'text-zinc-500' : 'text-zinc-600'
        }`}
        style={{ filter: isTripMode ? 'blur(6px)' : 'none' }}>
          {currentTrack.quote?.split('\n').map((line, i) => (
            <span key={i}>{line}<br /></span>
          ))}
        </p>
      </footer>

      {/* ── Nudge Visual (Bloom) ── */}
      <AnimatePresence>
        {nudgeVisual && !isPerfectSync && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.5 }}
            exit={{ opacity: 0, scale: 2 }}
            className="fixed inset-0 z-100 pointer-events-none flex items-center justify-center"
          >
            <div className={`w-64 h-64 rounded-full blur-[100px] ${isTripMode ? 'bg-white/30' : 'bg-rose-500/25'}`} />
            <motion.div 
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12 }}
              className="absolute"
            >
              <Heart className={`w-16 h-16 fill-current drop-shadow-2xl ${isTripMode ? 'text-white' : 'text-rose-500'}`} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Perfect Sync Visual (Golden Aura) ── */}
      <AnimatePresence>
        {isPerfectSync && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-110 pointer-events-none flex items-center justify-center overflow-hidden"
          >
            {/* Massive Gold Glow */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [1, 2, 1.5], opacity: [0.5, 0.8, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute w-screen h-screen rounded-full bg-gradient-radial from-amber-400/40 via-yellow-500/10 to-transparent blur-[120px]"
            />
            
            {/* Spinning Aura Rings */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ rotate: 0, scale: 0.8, opacity: 0 }}
                animate={{ rotate: 360, scale: 1.2, opacity: 1 }}
                transition={{ duration: 3, delay: i * 0.5, repeat: Infinity, ease: "linear" }}
                className="absolute w-80 h-80 rounded-full border border-amber-400/30 border-dashed"
              />
            ))}

            {/* Main Sync Heart */}
            <motion.div
              initial={{ scale: 0, y: 50 }}
              animate={{ scale: [1, 1.2, 1], y: 0 }}
              transition={{ type: "spring", bounce: 0.6 }}
              className="relative flex flex-col items-center"
            >
              <div className="absolute inset-0 blur-2xl bg-amber-500/50 rounded-full scale-150" />
              <Heart className="w-32 h-32 text-amber-400 fill-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]" />
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 text-amber-200 font-mono text-xs font-black uppercase tracking-[0.4em] drop-shadow-md"
              >
                Perfect Sync
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

