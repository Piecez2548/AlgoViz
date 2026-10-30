import { useCallback, useEffect, useState } from "react";

export type Speed = 0.5 | 1 | 2 | 4;

/** True when a key press belongs to a form control, so shortcuts must not steal it. */
export function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("input, select, textarea, [contenteditable='true']"));
}

/**
 * Step position, autoplay and keyboard shortcuts for one recorded execution.
 * Playback restarts whenever `resetKey` changes (a different algorithm or input).
 */
export function usePlayback(stepCount: number, resetKey: unknown) {
  const [stepIndex, setStepIndexState] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const last = Math.max(0, stepCount - 1);

  useEffect(() => { setStepIndexState(0); setIsPlaying(false); }, [resetKey]);
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => setStepIndexState((current) => {
      if (current >= last) { setIsPlaying(false); return current; }
      return current + 1;
    }), 900 / speed);
    return () => window.clearInterval(timer);
  }, [isPlaying, last, speed]);

  const seek = useCallback((index: number) => { setIsPlaying(false); setStepIndexState(Math.max(0, Math.min(last, index))); }, [last]);
  const advance = useCallback((delta: number) => { setIsPlaying(false); setStepIndexState((current) => Math.max(0, Math.min(last, current + delta))); }, [last]);
  const toggle = useCallback(() => setIsPlaying((playing) => {
    // Pressing play on the finished run starts it over instead of doing nothing.
    if (!playing && stepIndex >= last) setStepIndexState(0);
    return !playing;
  }), [last, stepIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;
      const onButton = event.target instanceof HTMLElement && Boolean(event.target.closest("button, a"));
      if (event.key === " " && !onButton) { event.preventDefault(); toggle(); }
      else if (event.key === "ArrowRight") { event.preventDefault(); advance(1); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); advance(-1); }
      else if (event.key === "Home") { event.preventDefault(); seek(0); }
      else if (event.key === "End") { event.preventDefault(); seek(last); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, last, seek, toggle]);

  return { stepIndex: Math.min(stepIndex, last), isPlaying, speed, setSpeed, seek, advance, toggle, last };
}
