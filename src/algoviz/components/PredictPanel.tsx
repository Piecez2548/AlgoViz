import { useEffect, useId, useState } from "react";
import type { Question } from "../../algorithms/shared/predict";

interface Props {
  /** The question for the step on screen, or null when this step has none. */
  question: Question | null;
  /** False for algorithms that have no questions at all. */
  supported: boolean;
  stepIndex: number;
  /** Scores start again when this changes (another algorithm or input). */
  resetKey: unknown;
  onContinue: () => void;
}

export function PredictPanel({ question, supported, stepIndex, resetKey, onContinue }: Props) {
  const [results, setResults] = useState<Record<number, { chosen: number; right: boolean }>>({});
  const promptId = useId();
  useEffect(() => { setResults({}); }, [resetKey]);
  const entries = Object.values(results);
  const result = results[stepIndex];
  const choose = (chosen: number) => { if (question && !result) setResults((current) => ({ ...current, [stepIndex]: { chosen, right: chosen === question.answer } })); };
  return <section className="algoviz-predict" aria-label="Predict the next step">
    <div className="algoviz-predict-head"><strong>Predict the next step</strong><span>{entries.filter((entry) => entry.right).length} of {entries.length} right</span></div>
    {!supported && <p className="algoviz-field-help">This algorithm has no prediction questions yet. Try BFS, DFS, Dijkstra, A*, Bubble, Insertion or Shell sort, Kruskal, Prim or Binary search.</p>}
    {supported && !question && <p className="algoviz-field-help">No question at this step. Move to the next step to continue.</p>}
    {question && <>
      <p id={promptId} className="algoviz-predict-prompt">{question.prompt}</p>
      <div className="algoviz-predict-options" role="group" aria-labelledby={promptId}>
        {question.options.map((option, index) => <button key={option} type="button" className={`algoviz-button algoviz-button-quiet${result && index === question.answer ? " is-right" : ""}${result && result.chosen === index && !result.right ? " is-wrong" : ""}`} disabled={Boolean(result)} aria-pressed={result?.chosen === index} onClick={() => choose(index)}>{option}</button>)}
      </div>
      {result && <>
        <p role="status" className="algoviz-predict-result"><strong>{result.right ? "Correct." : `Not quite. The answer was ${question.options[question.answer]}.`}</strong> {question.explanation}</p>
        <button type="button" className="algoviz-button" onClick={onContinue}>Show the step</button>
      </>}
    </>}
  </section>;
}
