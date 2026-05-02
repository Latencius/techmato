export type ProgressEventStep =
  | "fetch"
  | "select"
  | "extract"
  | "script"
  | "tts"
  | "merge"
  | "write";

export type ProgressEvent =
  | { type: "step_start"; step: ProgressEventStep; stepIndex: number; totalSteps: 7 }
  | { type: "step_complete"; step: ProgressEventStep; stepIndex: number; totalSteps: 7 }
  | { type: "cue_complete"; cueIndex: number; totalCues: number }
  | { type: "warn"; stage: ProgressEventStep; message: string }
  | { type: "error"; stage: ProgressEventStep; message: string; cause?: string }
  | { type: "done"; broadcastId: string; outputDir: string; durationSec: number };
