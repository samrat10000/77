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
}) {
  const dispatch = useAppDispatch();

  if (!currentTrack) return null;

  return (
    <>
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

      <div className="w-full flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-bold tracking-tight truncate text-zinc-900" title={currentTrack.title}>
            {currentTrack.title}
          </h1>
          <p className="font-medium mt-1 truncate text-zinc-600" title={currentTrack.artist}>
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
    </>
  );
}
