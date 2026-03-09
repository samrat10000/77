import { useState, useEffect, useRef, useCallback } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { setCurrentIndex } from '@/features/playlist/playlistSlice';
import { syncState, setProgress } from '@/features/player/playerSlice';
import { useAudioPlayer } from '@/lib/audio';
import { socketClient } from '@/lib/socketClient';
import { setSessionId, setIsHost, setParticipants, leaveSession } from '@/features/jam/jamSlice';
import { AnimatePresence } from 'framer-motion';

import { getStoredUsername, getStoredToken, LS_SESSION } from '@/lib/auth';
import { AuthModal } from '@/components/auth/AuthModal';
import { FloatingReaction } from '@/components/chat/FloatingReaction';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { PlayerSection } from '@/components/player/PlayerSection';
import { JamSessionSection } from '@/components/jam/JamSessionSection';
import { MediaInput } from '@/components/media/MediaInput';
import { MediaPlayer } from '@/components/media/MediaPlayer';
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

  const currentTrack = tracks[currentIndex];
  const { audioRef, seek } = useAudioPlayer();

  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef(null);
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
      if (state.media?.url) {
        dispatch(setMedia(state.media));
      }
      localStorage.setItem(LS_SESSION, id);
    });

    // Auto-rejoin after page refresh
    socket.on('rejoined-session', ({ sessionId: id, state }) => {
      dispatch(setSessionId(id));
      dispatch(setIsHost(state.hostUsername === username));
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
    });

    socket.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
      
      // Show notification if chat is closed and msg is not from system or self
      if (!isChatOpenRef.current && msg.type === 'user' && msg.username !== username) {
        setChatNotification(msg);
        setTimeout(() => setChatNotification(null), 5000);
      }
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

    // ── Media events (guests only receive) ────────────────────────────────
    socket.on('media:load', ({ url, type }) => {
      dispatch(setMedia({ url, type }));
    });

    socket.on('media:sync', ({ time, state }) => {
      dispatch(setMediaTime(time));
      dispatch(setMediaState(state));
    });

    socket.on('media:seek', ({ time }) => {
      dispatch(setMediaTime(time));
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
      socket.off('media:load');
      socket.off('media:sync');
      socket.off('media:seek');
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
    dispatch(clearMedia());
    localStorage.removeItem(LS_SESSION);
    socketClient.disconnect();
    setMessages([]);
  };

  const handleMediaLoad = ({ url, type }) => {
    if (!isHost || !sessionId) return;
    dispatch(setMedia({ url, type }));
    socketClient.emit('media:load', { sessionId, url, type });
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
      {isTripMode && <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10" />}

      {/* Hidden Audio Element */}
      <audio ref={audioRef} crossOrigin="anonymous" />

      {/* ── Dark Mode Toggle ── */}
      {!isTripMode && (
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`fixed top-5 right-5 z-50 p-2.5 rounded-full border shadow-sm transition-all duration-300 hover:scale-110 active:scale-95 ${
            isDarkMode
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700'
              : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      )}

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

      {/* ── Chat Notifications ── */}
      <AnimatePresence>
        {chatNotification && !isChatOpen && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            onClick={() => { setIsChatOpen(true); setChatNotification(null); }}
            className={`fixed top-16 right-5 z-60 cursor-pointer p-4 rounded-2xl shadow-2xl border backdrop-blur-3xl flex items-center space-x-4 max-w-[18rem] transition-all hover:scale-105 active:scale-95 ${
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
                New Message • {chatNotification.username}
              </span>
              <p className="text-xs font-light truncate">
                {chatNotification.text}
              </p>
            </div>
          </motion.div>
        )}
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
          isDarkMode={isDarkMode}
        />

        {/* ── Media Input (host only) ── */}
        {isJoined && isHost && (
          <div className={`w-full pt-6 border-t ${isTripMode ? 'border-white/10' : 'border-zinc-100'}`}>
            <p className={`text-[10px] font-mono uppercase tracking-widest mb-3 ${isTripMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Load Media for Session
            </p>
            <MediaInput onLoad={handleMediaLoad} isTripMode={isTripMode} />
          </div>
        )}

        {/* ── Shared Media Player ── */}
        {mediaUrl && (
          <div className="w-full">
            <MediaPlayer
              url={mediaUrl}
              type={mediaType}
              mediaState={mediaState}
              mediaTime={mediaTime}
              sessionId={sessionId}
              isHost={isHost}
              isTripMode={isTripMode}
            />
          </div>
        )}
      </section>

      {/* Lyrics footer */}
      <footer className="relative z-10 w-full max-w-sm text-center mt-12 md:mt-24 mb-8">
        <p className={`text-sm leading-relaxed font-serif italic transition-colors duration-300 ${
          isTripMode ? 'text-white/50' : isDarkMode ? 'text-zinc-500' : 'text-zinc-600'
        }`}>
          {currentTrack.quote?.split('\n').map((line, i) => (
            <span key={i}>{line}<br /></span>
          ))}
        </p>
      </footer>
    </main>
  );
}

