import { useRef, useEffect, useCallback } from 'react';
import { useAppDispatch } from '@/lib/hooks';
import { setMediaState, setMediaTime } from '@/features/media/mediaSlice';
import { socketClient } from '@/lib/socketClient';

/**
 * Convert a YouTube watch/share URL to an embed URL.
 */
function toYouTubeEmbed(url) {
  try {
    const u = new URL(url);
    let id = null;
    if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1);
    } else {
      id = u.searchParams.get('v');
    }
    if (!id) return null;
    // enablejsapi=1 required for postMessage sync
    return `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&rel=0`;
  } catch {
    return null;
  }
}

export function MediaPlayer({ url, type, mediaState, mediaTime, sessionId, isHost, isTripMode }) {
  const dispatch = useAppDispatch();
  const videoRef = useRef(null);
  const isSyncing = useRef(false); // prevent echo loops

  // ── HTML5 video/audio sync ──────────────────────────────────────────────

  const emitSync = useCallback((state, time) => {
    if (isHost && sessionId) {
      socketClient.emit('media:sync', { sessionId, time, state });
    }
  }, [isHost, sessionId]);

  const emitSeek = useCallback((time) => {
    if (isHost && sessionId) {
      socketClient.emit('media:seek', { sessionId, time });
    }
  }, [isHost, sessionId]);

  // When remote mediaState or mediaTime changes (guest), apply to element
  useEffect(() => {
    const el = videoRef.current;
    if (!el || isHost) return;
    isSyncing.current = true;
    if (mediaState === 'playing') {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
    setTimeout(() => { isSyncing.current = false; }, 200);
  }, [mediaState, isHost]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || isHost) return;
    const diff = Math.abs(el.currentTime - mediaTime);
    if (diff > 1.5) { // re-sync if drifted more than 1.5s
      el.currentTime = mediaTime;
    }
  }, [mediaTime, isHost]);

  const handlePlay = () => {
    if (isSyncing.current) return;
    dispatch(setMediaState('playing'));
    emitSync('playing', videoRef.current?.currentTime ?? 0);
  };

  const handlePause = () => {
    if (isSyncing.current) return;
    dispatch(setMediaState('paused'));
    emitSync('paused', videoRef.current?.currentTime ?? 0);
  };

  const handleSeeked = () => {
    if (isSyncing.current) return;
    emitSeek(videoRef.current?.currentTime ?? 0);
  };

  const handleTimeUpdate = () => {
    dispatch(setMediaTime(videoRef.current?.currentTime ?? 0));
  };

  // ── Render ────────────────────────────────────────────────────────────

  const containerClass = `w-full rounded-2xl overflow-hidden border ${
    isTripMode ? 'border-white/10 bg-black/40' : 'border-zinc-200 bg-zinc-50'
  }`;

  if (type === 'youtube') {
    const embedUrl = toYouTubeEmbed(url);
    if (!embedUrl) return null;
    return (
      <div className={containerClass}>
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={embedUrl}
            title="Jam Media"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
        {!isHost && (
          <p className={`text-[10px] text-center py-2 font-mono ${isTripMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Controlled by host
          </p>
        )}
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className={containerClass}>
        <video
          ref={videoRef}
          src={url}
          controls={isHost}
          autoPlay
          className="w-full rounded-2xl"
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeked={handleSeeked}
          onTimeUpdate={handleTimeUpdate}
        />
        {!isHost && (
          <p className={`text-[10px] text-center py-2 font-mono ${isTripMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Controlled by host
          </p>
        )}
      </div>
    );
  }

  if (type === 'audio') {
    return (
      <div className={`${containerClass} p-4`}>
        <audio
          ref={videoRef}
          src={url}
          controls={isHost}
          autoPlay
          className="w-full"
          onPlay={handlePlay}
          onPause={handlePause}
          onSeeked={handleSeeked}
          onTimeUpdate={handleTimeUpdate}
        />
        {!isHost && (
          <p className={`text-[10px] text-center mt-2 font-mono ${isTripMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Controlled by host
          </p>
        )}
      </div>
    );
  }

  return null;
}
