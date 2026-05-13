import { useRef, useState, useCallback, useEffect } from "react";

interface UseAudioPlayerOptions {
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  startTime?: number;
  endTime?: number;
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const optionsRef = useRef(options);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const playbackRateRef = useRef(playbackRate);
  const [volume, setVolume] = useState(1.0);
  const volumeRef = useRef(volume);

  // Keep refs in sync
  useEffect(() => { optionsRef.current = options; });
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

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
      optionsRef.current.onEnded?.();
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
    // Clean up previous source node
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    setIsPlaying(false);
    setCurrentTime(0);
    const audio = new Audio(src);
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    // Set up Web Audio API for volume boost (allows > 1.0)
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      gainNodeRef.current = audioCtxRef.current.createGain();
      gainNodeRef.current.connect(audioCtxRef.current.destination);
    }
    const source = audioCtxRef.current!.createMediaElementSource(audio);
    source.connect(gainNodeRef.current!);
    sourceNodeRef.current = source;
    gainNodeRef.current!.gain.value = volumeRef.current;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
      const { startTime } = optionsRef.current;
      if (startTime) {
        audio.currentTime = startTime;
      }
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      optionsRef.current.onEnded?.();
    });

    audio.playbackRate = playbackRateRef.current;
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Resume AudioContext if suspended (browser autoplay policy)
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
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

  const changeVolume = useCallback((vol: number) => {
    setVolume(vol);
    volumeRef.current = vol;
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = vol;
    }
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { load, play, pause, seek, isPlaying, currentTime, duration, playbackRate, changeRate, volume, changeVolume };
}
