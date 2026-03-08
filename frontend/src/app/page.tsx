'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Zap, Users, Share2, LogOut } from "lucide-react";
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { nextTrack, previousTrack, setCurrentIndex } from '@/features/playlist/playlistSlice';
import { togglePlay, syncState, setProgress } from '@/features/player/playerSlice';
import { useAudioPlayer } from '@/lib/audio';
import { socketClient } from '@/lib/socketClient';
import { setSessionId, setIsHost, setParticipants, leaveSession } from '@/features/jam/jamSlice';
import { JamSessionState, PlaybackState } from '@/features/jam/types';

export default function Home() {
  const dispatch = useAppDispatch();
  const { tracks, currentIndex } = useAppSelector((state) => state.playlist);
  const { isPlaying, progress, duration } = useAppSelector((state) => state.player);
  const { sessionId, isHost, participants, isJoined } = useAppSelector((state) => state.jam);

  const [isTripMode, setIsTripMode] = useState(false);
  const [bgIndex, setBgIndex] = useState(1);
  const [joinId, setJoinId] = useState('');

  const currentTrack = tracks[currentIndex];
  const { audioRef, seek } = useAudioPlayer();

  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleSeek = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!progressBarRef.current || !duration) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    seek(pos * duration);
  }, [duration, seek]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleSeek(e);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleSeek(e);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleSeek(e);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) handleSeek(e);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleSeek]);

  // --- SOCKET LOGIC ---
  useEffect(() => {
    const socket = socketClient.connect();

    socket.on('session-created', ({ sessionId }: { sessionId: string }) => {
      dispatch(setSessionId(sessionId));
      dispatch(setIsHost(true));
    });

    socket.on('joined-session', ({ sessionId, state }: { sessionId: string, state: JamSessionState }) => {
      dispatch(setSessionId(sessionId));
      dispatch(setIsHost(false));
      dispatch(setCurrentIndex(state.trackIndex));
      dispatch(syncState({ isPlaying: state.isPlaying, progress: state.progress }));
    });

    socket.on('participants-update', (users: string[]) => {
      dispatch(setParticipants(users));
    });

    socket.on('playback-update', (state: Partial<PlaybackState>) => {
      if (!isHost) {
        if (state.trackIndex !== undefined) dispatch(setCurrentIndex(state.trackIndex));
        if (state.isPlaying !== undefined) dispatch(syncState({ isPlaying: state.isPlaying }));
        if (state.progress !== undefined) {
          dispatch(setProgress(state.progress));
          if (audioRef.current) audioRef.current.currentTime = state.progress;
        }
      }
    });

    return () => {
      socketClient.disconnect();
    };
  }, [dispatch, isHost, audioRef]);

  // Sync state to others if host
  useEffect(() => {
    if (isHost && sessionId) {
      socketClient.emit('playback-sync', {
        sessionId,
        state: {
          trackIndex: currentIndex,
          isPlaying,
          progress
        }
      });
    }
  }, [isHost, sessionId, currentIndex, isPlaying, progress]);

  // Background rotation for Trip Mode
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTripMode) {
      interval = setInterval(() => {
        setBgIndex((prev) => (prev % 5) + 1);
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isTripMode]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining.toString().padStart(2, '0')}`;
  };

  const toggleTripMode = () => setIsTripMode(!isTripMode);

  const handleCreateSession = () => socketClient.emit('create-session', {});
  const handleJoinSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) socketClient.emit('join-session', joinId.trim());
  };
  const handleLeaveSession = () => {
    dispatch(leaveSession());
    socketClient.disconnect();
  };

  if (!currentTrack) return null;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between p-8 md:p-12 font-sans selection:bg-zinc-200 overflow-hidden">
      {/* Background Layer for Trip Mode */}
      {isTripMode && (
        <div 
          className="absolute inset-0 z-0 transition-none"
          style={{
            backgroundImage: `url('/trip/bg${bgIndex}.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}

      {/* Overlay for Trip Mode */}
      {isTripMode && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10" />
      )}

      {/* Hidden Audio Element */}
      <audio ref={audioRef} crossOrigin="anonymous" />


      {/* --- CENTER ALBUM / PLAYER SECTION --- */}
      <section className="relative z-20 w-full max-w-sm flex flex-col items-center mt-12 md:mt-24 space-y-10 transition-all duration-500">


        {/* Album Art Card */}
        <div className="w-full aspect-square bg-white shadow-xl shadow-black/5 p-4 md:p-5 flex flex-col justify-between">
          <div className="w-full h-full bg-zinc-100 flex items-center justify-center overflow-hidden relative">
            {currentTrack.albumArt ? (
              /* eslint-disable-next-line @next/next/no-img-element */
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

          {/* Controls */}
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

        {/* Trip Mode Toggle Button */}
        <button
          onClick={toggleTripMode}
          className={`flex items-center space-x-2 px-6 py-2 rounded-full border transition-all duration-300 group ${
            isTripMode 
              ? 'bg-white/20 border-white/40 text-white hover:bg-white/30' 
              : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200 hover:border-zinc-300'
          }`}
        >
          <Zap className={`w-4 h-4 ${isTripMode ? 'fill-white animate-pulse' : 'text-zinc-400 group-hover:text-zinc-600'}`} />
          <span className="text-[10px] font-bold tracking-widest uppercase">Trip Mode</span>
        </button>

        {/* --- JAM SESSION UI --- */}
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
              <div className={`p-4 rounded-xl border flex flex-col space-y-3 ${
                isTripMode ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isTripMode ? 'text-white' : 'text-zinc-900'}`}>
                      {isHost ? 'Hosting Jam' : 'Joined Jam'}
                    </span>
                  </div>
                  <button 
                    onClick={handleLeaveSession}
                    className="p-1 rounded-md hover:bg-red-500/10 text-red-500 transition-all"
                    title="Leave Session"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <code className={`text-xs font-mono font-bold ${isTripMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {sessionId}
                  </code>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(sessionId || '');
                    }}
                    className={`flex items-center space-x-1 px-2 py-1 rounded bg-zinc-900 text-[9px] text-white font-bold uppercase hover:bg-zinc-800`}
                  >
                    <Share2 className="w-3 h-3" />
                    <span>Copy Link</span>
                  </button>
                </div>

                <div className="flex items-center -space-x-2">
                  {participants.map((p, i) => (
                    <div 
                      key={p} 
                      className="w-6 h-6 rounded-full border-2 border-zinc-50 bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-600 shadow-sm"
                      title={p}
                      style={{ zIndex: participants.length - i }}
                    >
                      {p.substring(0, 1).toUpperCase()}
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

      {/* --- BOTTOM LYRICS / QUOTE --- */}
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

