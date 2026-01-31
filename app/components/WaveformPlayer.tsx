"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

export type WaveformPlayerHandle = {
  seekToProgress: (progress: number) => void;
  getDuration: () => number;
  getCurrentTime: () => number;
};

type WaveformPlayerProps = {
  url: string;
  onTimeUpdate?: (currentTime: number) => void;
  height?: number;
  waveColor?: string;
  progressColor?: string;
  playerRef?: React.Ref<WaveformPlayerHandle | null>;
};

const SPEEDS = [0.5, 1, 1.5, 2] as const;

export function WaveformPlayer({
  url,
  onTimeUpdate,
  height = 80,
  waveColor = "#4ADE80",
  progressColor = "#60A5FA",
  playerRef,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<{
    play: () => void;
    pause: () => void;
    seekTo?: (progress: number) => void;
    setPlaybackRate?: (rate: number) => void;
    getDuration: () => number;
    getCurrentTime: () => number;
    destroy: () => void;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(
    playerRef,
    () => ({
      seekToProgress: (progress: number) => {
        wsRef.current?.seekTo?.(progress);
      },
      getDuration: () => wsRef.current?.getDuration() ?? 0,
      getCurrentTime: () => wsRef.current?.getCurrentTime() ?? 0,
    }),
    []
  );

  useEffect(() => {
    if (!containerRef.current || !url) return;

    let mounted = true;

    import("wavesurfer.js")
      .then((mod) => {
        const WaveSurfer = mod.default;
        if (!mounted || !containerRef.current) return;

        const ws = WaveSurfer.create({
          container: containerRef.current,
          waveColor,
          progressColor,
          cursorColor: "#FFFFFF",
          barWidth: 2,
          barGap: 2,
          height,
          responsive: true,
          url,
        });

        ws.on("ready", () => {
          if (mounted) setReady(true);
        });
        ws.on("play", () => setIsPlaying(true));
        ws.on("pause", () => setIsPlaying(false));
        ws.on("audioprocess", (t?: number) => onTimeUpdate?.(t ?? 0));
        ws.on("error", (err?: unknown) => {
          setError(err instanceof Error ? err.message : "Failed to load audio");
        });

        // Store the raw WaveSurfer instance so cleanup can call .destroy() (prototype method).
        wsRef.current = ws as unknown as typeof wsRef.current;
      })
      .catch(() => setError("WaveSurfer failed to load"));

    return () => {
      mounted = false;
      const ws = wsRef.current;
      if (ws && typeof (ws as { destroy?: () => void }).destroy === "function") {
        (ws as { destroy: () => void }).destroy();
      }
      wsRef.current = null;
    };
  }, [url, waveColor, progressColor, height, onTimeUpdate]);

  const togglePlay = useCallback(() => {
    const ws = wsRef.current;
    if (!ws) return;
    if (isPlaying) ws.pause();
    else ws.play();
  }, [isPlaying]);

  const setSpeed = useCallback(() => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    wsRef.current?.setPlaybackRate?.(SPEEDS[next]);
  }, [speedIndex]);

  if (error) {
    return (
      <div className="rounded-xl bg-slate-800/60 p-4 text-sm text-rose-300">
        {error}.{" "}
        <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
          Download recording
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="min-h-[80px] w-full rounded-lg bg-slate-800/40" />
      {ready && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-slate-950 hover:bg-sky-400"
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button
            type="button"
            onClick={setSpeed}
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            {SPEEDS[speedIndex]}x
          </button>
          <a
            href={url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            Download
          </a>
        </div>
      )}
    </div>
  );
}
