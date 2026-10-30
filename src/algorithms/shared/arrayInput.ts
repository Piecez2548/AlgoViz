export const MIN_ARRAY = 2;
export const MAX_ARRAY = 24;
export const MAX_VALUE = 999;

export type ParsedArray = { values: number[]; error?: undefined } | { values?: undefined; error: string };

/** Accepts numbers separated by commas, spaces or new lines. */
export function parseNumberList(text: string): ParsedArray {
  const parts = text.split(/[\s,;]+/).filter(Boolean);
  if (parts.length < MIN_ARRAY) return { error: `Enter at least ${MIN_ARRAY} numbers.` };
  if (parts.length > MAX_ARRAY) return { error: `Use at most ${MAX_ARRAY} numbers.` };
  const values: number[] = [];
  for (const part of parts) {
    const value = Number(part);
    if (!Number.isInteger(value)) return { error: `"${part}" is not a whole number.` };
    if (value < 1 || value > MAX_VALUE) return { error: `Numbers must be between 1 and ${MAX_VALUE}.` };
    values.push(value);
  }
  return { values };
}

export type ArrayPreset = "random" | "sorted" | "reversed" | "nearly" | "few-unique";
export const PRESET_LABELS: Record<ArrayPreset, string> = { random: "Random", sorted: "Already sorted", reversed: "Reversed", nearly: "Nearly sorted", "few-unique": "Many duplicates" };

/** `random` is injectable so presets can be tested deterministically. */
export function makePreset(preset: ArrayPreset, size = 10, random: () => number = Math.random): number[] {
  const pick = () => 5 + Math.floor(random() * 95);
  const base = Array.from({ length: size }, pick);
  const ascending = [...base].sort((a, b) => a - b);
  switch (preset) {
    case "sorted": return ascending;
    case "reversed": return [...ascending].reverse();
    case "nearly": { const out = [...ascending]; for (let i = 0; i + 3 < out.length; i += 4) [out[i], out[i + 1]] = [out[i + 1], out[i]]; return out; }
    case "few-unique": return Array.from({ length: size }, () => [12, 47, 83][Math.floor(random() * 3)]);
    default: return base;
  }
}
