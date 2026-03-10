import { useRef, useEffect, useCallback } from 'react';
import YouTube from 'react-youtube';
import { useAppDispatch } from '@/lib/hooks';
import { setMediaState, setMediaTime } from '@/features/media/mediaSlice';
import { webrtcClient } from '@/lib/webrtcClient';

/**
 * Extract YouTube ID from various URL formats.
 */
function getYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.includes('/v/')) return u.pathname.split('/v/')[1];
      if (u.pathname.includes('/embed/')) return u.pathname.split('/embed/')[1];
      if (u.pathname.includes('/live/')) return u.pathname.split('/live/')[1];
      return u.searchParams.get('v');
    }
    return null;
  } catch {
    return null;
  }
}

export function MediaPlayer({ url, type, mediaState, mediaTime, sessionId, isHost, isTripMode }) {
  const dispatch = useAppDispatch();
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const isSyncing = useRef(false);

  // ── Sync Helpers ────────────────────────────────────────────────────────

  const emitSync = useCallback((state, time) => {
    if (isHost && sessionId) {
      webrtcClient.send('media:sync', { sessionId, time, state });
    }
  }, [isHost, sessionId]);

  const emitSeek = useCallback((time) => {
    if (isHost && sessionId) {
      webrtcClient.send('media:seek', { sessionId, time });
    }
  }, [isHost, sessionId]);

  // ── HTML5 Media Sync ────────────────────────────────────────────────────

  useEffect(() => {
    const el = videoRef.current;
    if (!el || isHost || type === 'youtube') return;
    isSyncing.current = true;
    if (mediaState === 'playing') el.play().catch(() => {});
    else el.pause();
    setTimeout(() => { isSyncing.current = false; }, 200);
  }, [mediaState, isHost, type]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || isHost || type === 'youtube') return;
    const diff = Math.abs(el.currentTime - mediaTime);
    if (diff > 2) el.currentTime = mediaTime;
  }, [mediaTime, isHost, type]);

  // ── YouTube Sync ────────────────────────────────────────────────────────

  useEffect(() => {
    const player = playerRef.current;
    if (!player || isHost || type !== 'youtube') return;
    
    isSyncing.current = true;
    if (mediaState === 'playing') {
      player.playVideo();
    } else {
      player.pauseVideo();
    }
    
    const currTime = player.getCurrentTime();
    if (Math.abs(currTime - mediaTime) > 2) {
      player.seekTo(mediaTime, true);
    }
    
    setTimeout(() => { isSyncing.current = false; }, 500);
  }, [mediaState, mediaTime, isHost, type]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handlePlay = () => {
    if (isSyncing.current) return;
    dispatch(setMediaState('playing'));
    const time = type === 'youtube' ? playerRef.current?.getCurrentTime() : videoRef.current?.currentTime;
    emitSync('playing', time ?? 0);
  };

  const handlePause = () => {
    if (isSyncing.current) return;
    dispatch(setMediaState('paused'));
    const time = type === 'youtube' ? playerRef.current?.getCurrentTime() : videoRef.current?.currentTime;
    emitSync('paused', time ?? 0);
  };

  const handleSeeked = () => {
    if (isSyncing.current) return;
    const time = type === 'youtube' ? playerRef.current?.getCurrentTime() : videoRef.current?.currentTime;
    emitSeek(time ?? 0);
  };

  const handleTimeUpdate = () => {
    const time = type === 'youtube' ? playerRef.current?.getCurrentTime() : videoRef.current?.currentTime;
    dispatch(setMediaTime(time ?? 0));
  };

  // ── Render ────────────────────────────────────────────────────────────

  const containerClass = `w-full rounded-2xl overflow-hidden border transition-all duration-500 ${
    isTripMode ? 'border-white/10 bg-black/40 shadow-2xl shadow-purple-500/10' : 'border-zinc-200 bg-zinc-50 shadow-sm'
  }`;

  if (type === 'youtube') {
    const videoId = getYouTubeId(url);
    if (!videoId) return null;

    return (
      <div className={containerClass}>
        <div className="relative w-full aspect-video">
          <YouTube
            videoId={videoId}
            opts={{
              width: '100%',
              height: '100%',
              playerVars: {
                autoplay: 1,
                controls: isHost ? 1 : 0,
                rel: 0,
                modestbranding: 1,
              },
            }}
            onReady={({ target }) => { playerRef.current = target; }}
            onPlay={handlePlay}
            onPause={handlePause}
            onEnd={handlePause}
            onStateChange={({ data }) => {
              // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
              if (data === 1) handlePlay();
              if (data === 2) handlePause();
            }}
            className="absolute inset-0 w-full h-full"
          />
        </div>
        {!isHost && (
          <p className={`text-[10px] text-center py-2 font-mono ${isTripMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Syncing with Host
          </p>
        )}
      </div>
    );
  }

  if (type === 'video' || type === 'audio') {
    const Tag = type === 'video' ? 'video' : 'audio';
    return (
      <div className={`${containerClass} ${type === 'audio' ? 'p-4' : ''}`}>
        <Tag
          ref={videoRef}
          src={url}
          controls={isHost}
          autoPlay
          className="w-full rounded-xl focus:outline-none"
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeked={handleSeeked}
          onTimeUpdate={handleTimeUpdate}
        />
        {!isHost && (
          <p className={`text-[10px] text-center mt-2 font-mono ${isTripMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Syncing with Host
          </p>
        )}
      </div>
    );
  }

  return null;
}

