import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
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
  return <div className="algoviz-playback-wrap">
    <input className="algoviz-seek" type="range" min={0} max={last} value={stepIndex} onChange={(event) => onSeek(Number(event.target.value))} aria-label="Step position" aria-valuetext={`Step ${stepIndex + 1} of ${last + 1}`} />
    <div className="algoviz-playback">
      <button type="button" className="algoviz-control" onClick={() => onAdvance(-1)} disabled={stepIndex === 0} aria-label="Previous step" aria-keyshortcuts="ArrowLeft"><SkipBack size={16} /></button>
      <button type="button" className="algoviz-control algoviz-control-play" onClick={onToggle} aria-label={isPlaying ? "Pause playback" : "Play playback"} aria-keyshortcuts="Space">{isPlaying ? <Pause size={16} /> : <Play size={16} />}</button>
      <button type="button" className="algoviz-control" onClick={() => onAdvance(1)} disabled={stepIndex >= last} aria-label="Next step" aria-keyshortcuts="ArrowRight"><SkipForward size={16} /></button>
      <button type="button" className="algoviz-control algoviz-control-reset" onClick={() => onSeek(0)} aria-label="Restart playback" aria-keyshortcuts="Home"><RotateCcw size={15} /> Restart</button>
      <label className="algoviz-speed">Speed <select value={speed} onChange={(event) => onSpeed(Number(event.target.value) as Speed)} aria-label="Playback speed"><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label>
    </div>
    <p className="algoviz-key-hint">Keys: <kbd>Space</kbd> play/pause · <kbd>←</kbd> <kbd>→</kbd> step · <kbd>Home</kbd> <kbd>End</kbd> jump</p>
  </div>;
}
