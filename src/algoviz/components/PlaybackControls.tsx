import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useT } from "../preferences";
import type { Speed } from "./usePlayback";

interface Props {
  stepIndex: number;
  last: number;
  isPlaying: boolean;
  speed: Speed;
  onToggle: () => void;
  onAdvance: (delta: number) => void;
  onSeek: (index: number) => void;
  onSpeed: (speed: Speed) => void;
}

export function PlaybackControls({ stepIndex, last, isPlaying, speed, onToggle, onAdvance, onSeek, onSpeed }: Props) {
  const t = useT();
  return <div className="algoviz-playback-wrap">
    <input className="algoviz-seek" type="range" min={0} max={last} value={stepIndex} onChange={(event) => onSeek(Number(event.target.value))} aria-label={t("Step position")} aria-valuetext={t("Step {0} of {1}", stepIndex + 1, last + 1)} />
    <div className="algoviz-playback">
      <button type="button" className="algoviz-control" onClick={() => onAdvance(-1)} disabled={stepIndex === 0} aria-label={t("Previous step")} aria-keyshortcuts="ArrowLeft"><SkipBack size={16} /></button>
      <button type="button" className="algoviz-control algoviz-control-play" onClick={onToggle} aria-label={t(isPlaying ? "Pause playback" : "Play playback")} aria-keyshortcuts="Space">{isPlaying ? <Pause size={16} /> : <Play size={16} />}</button>
      <button type="button" className="algoviz-control" onClick={() => onAdvance(1)} disabled={stepIndex >= last} aria-label={t("Next step")} aria-keyshortcuts="ArrowRight"><SkipForward size={16} /></button>
      <button type="button" className="algoviz-control algoviz-control-reset" onClick={() => onSeek(0)} aria-label={t("Restart playback")} aria-keyshortcuts="Home"><RotateCcw size={15} /> {t("Restart")}</button>
      <label className="algoviz-speed">{t("Speed")} <select value={speed} onChange={(event) => onSpeed(Number(event.target.value) as Speed)} aria-label={t("Playback speed")}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label>
    </div>
    <p className="algoviz-key-hint">{t("Keys:")} <kbd>Space</kbd> {t("play/pause")} · <kbd>←</kbd> <kbd>→</kbd> {t("step")} · <kbd>Home</kbd> <kbd>End</kbd> {t("jump")}</p>
  </div>;
}
