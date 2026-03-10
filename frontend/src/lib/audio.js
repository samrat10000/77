import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  setProgress,
  setDuration,
  togglePlay,
} from "@/features/player/playerSlice";
import { nextTrack } from "@/features/playlist/playlistSlice";

export const useAudioPlayer = () => {
  const dispatch = useAppDispatch();
  const { isPlaying, volume, progress } = useAppSelector(
    (state) => state.player,
  );
  const { tracks, currentIndex } = useAppSelector((state) => state.playlist);

  const currentTrack = tracks[currentIndex];
  const audioRef = useRef(null);

  // When the track changes: update src, load, and auto-play if already playing
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.url) return;

    audio.pause();
    audio.src = currentTrack.url;
    audio.load();

    // If we just got a progress from network sync (e.g. joined session), start there.
    // Otherwise, it starts at 0 naturally.
    if (progress > 0) {
      audio.currentTime = progress;
    } else {
      dispatch(setProgress(0));
    }

    if (isPlaying) {
      const t = setTimeout(() => {
        audio.play().catch((err) => {
          if (err.name !== "AbortError") {
            console.warn("Autoplay prevented:", err);
            // If it's a listener, we don't dispatch togglePlay here to avoid
            // flickering state. They just need to interact with the page.
          }
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
        playPromise.catch((err) => {
          if (err.name !== "AbortError") {
            console.warn("Autoplay prevented on sync:", err);
          }
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, volume]);

  // Global interaction kickstart for listeners whose audio might be blocked
  useEffect(() => {
    const handleInteraction = () => {
      if (isPlaying && audioRef.current?.paused) {
        audioRef.current.play().catch(() => {});
      }
    };
    window.addEventListener("click", handleInteraction);
    window.addEventListener("touchstart", handleInteraction);
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };
  }, [isPlaying]);

  // Wire up event listeners
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

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [dispatch]);

  const seek = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      dispatch(setProgress(time));
    }
  };

  return { audioRef, seek };
};
