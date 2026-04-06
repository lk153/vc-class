"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Props = {
  src: string;
  playLimit?: number | null;
  onPlay?: (el: HTMLAudioElement) => void;
  compact?: boolean;
};

export default function AudioPlayer({ src, playLimit, onPlay, compact }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const barsCount = compact ? 12 : 20;

  const isLimited = playLimit != null && playLimit > 0;
  const playsRemaining = isLimited ? playLimit - playCount : Infinity;
  const disabled = isLimited && playsRemaining <= 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onEnded = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [src]);

  // Reset on src change
  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setPlayCount(0);
  }, [src]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
    } else {
      if (disabled) return;
      if (audio.ended || audio.currentTime >= audio.duration) {
        audio.currentTime = 0;
      }
      setPlayCount((c) => c + 1);
      onPlay?.(audio);
      audio.play().catch(() => {});
    }
  }, [playing, disabled, onPlay]);

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  }

  const progressRatio = duration > 0 ? progress / duration : 0;

  // Pre-computed bar heights for waveform shape
  const heightPattern = [60, 80, 45, 90, 70, 55, 85, 40, 75, 95, 50, 65, 88, 42, 72, 58, 82, 48, 78, 62];
  const bars = Array.from({ length: barsCount }, (_, i) => heightPattern[i % heightPattern.length]);

  function formatDuration(s: number) {
    if (!s || !isFinite(s) || s < 0) return "0:00";
    const total = Math.max(0, Math.round(s));
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl ${compact ? "p-2.5 bg-[#f0eef6]" : "p-4 bg-[#f0eef6]/80 border border-[#c7c4d7]/15"}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause button */}
      <button
        type="button"
        onClick={togglePlay}
        disabled={disabled}
        className={`shrink-0 flex items-center justify-center rounded-full transition-colors no-ripple ${
          compact ? "w-8 h-8" : "w-10 h-10"
        } ${disabled ? "bg-[#c7c4d7]/30 text-[#777586]" : "bg-[#2a14b4] text-white hover:bg-[#4338ca]"}`}
      >
        <span className={`material-symbols-outlined ${compact ? "text-[16px]" : "text-[20px]"}`} style={{ fontVariationSettings: "'FILL' 1" }}>
          {playing ? "pause" : "play_arrow"}
        </span>
      </button>

      {/* Waveform bars — layered for smooth progress */}
      <div className="flex-1 relative h-8 cursor-pointer" onClick={handleSeek}>
        {/* Background bars (light) */}
        <div className="absolute inset-0 flex items-center gap-[2px]">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-full bg-[#2a14b4]/25" style={{ height: `${h}%` }} />
          ))}
        </div>
        {/* Active bars (dark) — clipped by progress */}
        <div
          className="absolute inset-0 flex items-center gap-[2px]"
          style={{ clipPath: `inset(0 ${100 - progressRatio * 100}% 0 0)`, transition: "clip-path 0.15s linear" }}
        >
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-full bg-[#2a14b4]" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>

      {/* Duration */}
      <span className={`font-body text-[#777586] shrink-0 ${compact ? "text-[10px]" : "text-xs"}`}>
        {formatDuration(playing || progress > 0 ? duration - progress : duration)}
      </span>

      {/* Play limit indicator */}
      {isLimited && (
        <span className={`font-body font-bold shrink-0 ${compact ? "text-[9px]" : "text-[10px]"} ${playsRemaining <= 0 ? "text-[#7b0020]" : "text-[#777586]"}`}>
          {playsRemaining > 0 ? `${playsRemaining}x` : "0x"}
        </span>
      )}
    </div>
  );
}
