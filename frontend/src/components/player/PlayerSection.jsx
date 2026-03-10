import { Share2, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat } from "lucide-react";
import { useAppDispatch } from '@/lib/hooks';
import { nextTrack, previousTrack } from '@/features/playlist/playlistSlice';
import { togglePlay } from '@/features/player/playerSlice';

export function PlayerSection({
  currentTrack,
  isChatOpen,
  setIsChatOpen,
  progress,
  duration,
  isDragging,
  progressBarRef,
  handleMouseDown,
  handleTouchStart,
  formatTime,
  isPlaying,
  isTripMode,
  isDarkMode,
}) {
  const dispatch = useAppDispatch();
  const dark = isDarkMode && !isTripMode;

  if (!currentTrack) return null;

  return (
    <>
      <div className={`w-full aspect-square shadow-xl p-4 md:p-5 flex flex-col justify-between transition-all duration-700 ease-in-out transform-gpu border ${
        isTripMode ? 'bg-white/5 border-white/10 relative z-50' : 'bg-white border-transparent shadow-black/5'
      }`}>
        <div className={`w-full h-full flex items-center justify-center overflow-hidden relative bg-zinc-100`}>
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`absolute top-4 right-4 z-100 p-2 rounded-full backdrop-blur shadow-sm hover:scale-110 transition-all bg-white/80 text-zinc-900`}
          >
            <Share2 className="w-4 h-4 rotate-90" />
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
        <div className={`flex justify-between items-center text-[9px] uppercase tracking-widest mt-4 truncate text-zinc-400`}>
          <span className="truncate pr-2">{currentTrack.artist}</span>
          <span>Single</span>
        </div>
      </div>

      <div className="w-full space-y-3 select-none">
        <div className="mb-6 transition-all duration-700" style={{ filter: isTripMode ? 'blur(10px)' : 'none' }}>
          <h1 className={`text-3xl font-serif font-bold tracking-tight truncate transition-colors duration-300 ${dark ? 'text-red-950/70' : 'text-zinc-900'}`} title={currentTrack.title}>
            {currentTrack.title}
          </h1>
          <p className={`font-medium mt-1 truncate transition-colors duration-300 ${dark ? 'text-zinc-400' : 'text-zinc-600'}`} title={currentTrack.artist}>
            {currentTrack.artist}
          </p>
        </div>

      <div className="w-full space-y-3 select-none">
          <div
            ref={progressBarRef}
            className="w-full relative cursor-pointer group py-3 flex items-center"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            <div className={`w-full h-[2px] rounded-full relative overflow-visible ${dark ? 'bg-zinc-700' : 'bg-zinc-200'}`}>
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all ${isDragging ? 'duration-0' : 'duration-75'} linear ${dark ? 'bg-zinc-100' : 'bg-zinc-900'}`}
                style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
              />
              <div
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-sm transition-all ${isDragging ? 'duration-0' : 'duration-75'} linear ${dark ? 'bg-zinc-100' : 'bg-zinc-900'} scale-0 group-hover:scale-100 ${isDragging ? 'scale-110' : ''}`}
                style={{ left: `${duration ? (progress / duration) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className={`flex justify-between text-[10px] font-medium tracking-tight font-mono ${dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 px-2 relative z-100">
          <button className={`transition-colors ${dark ? 'text-zinc-600 hover:text-zinc-200' : 'text-zinc-400 hover:text-zinc-800'}`}>
            <Shuffle className="w-4 h-4" />
          </button>
          <button onClick={() => dispatch(previousTrack())} className={`transition-colors ${dark ? 'text-zinc-200 hover:text-zinc-400' : 'text-zinc-800 hover:text-zinc-600'}`}>
            <SkipBack className="w-6 h-6 fill-current" />
          </button>
          <button
            onClick={() => dispatch(togglePlay())}
            className={`w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg ${dark ? 'bg-white text-zinc-900 shadow-white/10' : 'bg-zinc-900 text-white shadow-black/10'}`}
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
          </button>
          <button onClick={() => dispatch(nextTrack())} className={`transition-colors ${dark ? 'text-zinc-200 hover:text-zinc-400' : 'text-zinc-800 hover:text-zinc-600'}`}>
            <SkipForward className="w-6 h-6 fill-current" />
          </button>
          <button className={`transition-colors ${dark ? 'text-zinc-600 hover:text-zinc-200' : 'text-zinc-400 hover:text-zinc-800'}`}>
            <Repeat className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

