import { useRef, useState, useCallback, useEffect } from "react";

interface UseAudioPlayerOptions {
  onTimeUpdate?: (time: number) => void;
  startTime?: number;
  endTime?: number;
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const optionsRef = useRef(options);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const playbackRateRef = useRef(playbackRate);

  // Keep refs in sync
  useEffect(() => { optionsRef.current = options; });
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const t = audio.currentTime;
    setCurrentTime(t);
    optionsRef.current.onTimeUpdate?.(t);

    const { endTime } = optionsRef.current;
    if (endTime && t >= endTime) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    if (!audio.paused) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, []);

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
      const { startTime } = optionsRef.current;
      if (startTime) {
        audio.currentTime = startTime;
      }
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
    });

    audio.playbackRate = playbackRateRef.current;
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const { startTime } = optionsRef.current;
    if (startTime && audio.currentTime < startTime) {
      audio.currentTime = startTime;
    }
    audio.playbackRate = playbackRateRef.current;
    audio.play();
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

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
    playbackRateRef.current = rate;
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
