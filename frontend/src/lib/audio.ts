import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './hooks';
import { setProgress, setDuration, togglePlay } from '@/features/player/playerSlice';
import { nextTrack } from '@/features/playlist/playlistSlice';

export const useAudioPlayer = () => {
  const dispatch = useAppDispatch();
  const { isPlaying, volume } = useAppSelector((state) => state.player);
  const { tracks, currentIndex } = useAppSelector((state) => state.playlist);

  const currentTrack = tracks[currentIndex];
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // When the track changes: update src, load, and auto-play if already playing
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.url?.match(/\.(mp3|m4a|ogg|wav)$/i)) return;

    audio.pause();
    audio.src = currentTrack.url;
    audio.load();
    dispatch(setProgress(0));

    if (isPlaying) {
      const t = setTimeout(() => {
        audio.play().catch((err: Error) => {
          if (err.name !== 'AbortError') dispatch(togglePlay());
        });
      }, 50);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  // Sync play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err: Error) => {
          if (err.name !== 'AbortError') dispatch(togglePlay());
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, volume, dispatch]);

  // Wire up event listeners — this is what drives the progress bar
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      dispatch(setProgress(audio.currentTime));
    };

    const onLoadedMetadata = () => {
      dispatch(setDuration(audio.duration));
    };

    const onEnded = () => {
      dispatch(setProgress(0));
      dispatch(nextTrack());
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [dispatch]);

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      dispatch(setProgress(time));
    }
  };

  return { audioRef, seek };
};
