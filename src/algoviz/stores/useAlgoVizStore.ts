import { create } from "zustand";

export type AlgoVizCategory = "search" | "pathfinding" | "sorting";
export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

interface AlgoVizState {
  activeCategory: AlgoVizCategory;
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  setActiveCategory: (category: AlgoVizCategory) => void;
  setCurrentStep: (step: number) => void;
  setTotalSteps: (steps: number) => void;
  setPlaying: (isPlaying: boolean) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  resetPlayback: () => void;
}

export const useAlgoVizStore = create<AlgoVizState>((set) => ({
  activeCategory: "search",
  currentStep: 0,
  totalSteps: 0,
  isPlaying: false,
  speed: 1,
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  setTotalSteps: (totalSteps) => set({ totalSteps }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setSpeed: (speed) => set({ speed }),
  resetPlayback: () => set({ currentStep: 0, isPlaying: false }),
}));
