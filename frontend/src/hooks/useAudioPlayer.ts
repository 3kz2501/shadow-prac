import { useRef, useState, useCallback, useEffect } from "react";

interface UseAudioPlayerOptions {
  onTimeUpdate?: (time: number) => void;
  startTime?: number;
  endTime?: number;
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const t = audio.currentTime;
    setCurrentTime(t);
    options.onTimeUpdate?.(t);

    // Stop at endTime if specified
    if (options.endTime && t >= options.endTime) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    if (!audio.paused) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [options.endTime, options.onTimeUpdate]);

  const load = useCallback((src: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      cancelAnimationFrame(rafRef.current);
    }
    setIsPlaying(false);
    setCurrentTime(0);
    const audio = new Audio(src);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
      if (options.startTime) {
        audio.currentTime = options.startTime;
      }
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
    });

    audio.playbackRate = playbackRate;
  }, [options.startTime, playbackRate]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (options.startTime && audio.currentTime < options.startTime) {
      audio.currentTime = options.startTime;
    }
    audio.playbackRate = playbackRate;
    audio.play();
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, options.startTime, playbackRate]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const changeRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { load, play, pause, seek, isPlaying, currentTime, duration, playbackRate, changeRate };
}
