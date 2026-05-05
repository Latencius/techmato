export type BroadcastMode = "short" | "long";

export const BROADCAST_MODES = {
  short: {
    mode: "short" as const,
    maxStories: 4,
    scriptMin: 250,
    scriptMax: 450,
    selectPromptKey: "1. 記事選定プロンプト",
    scriptPromptKey: "2. 台本生成プロンプト",
    shortenPromptKey: "3. 短縮再生成プロンプト",
  },
  long: {
    mode: "long" as const,
    maxStories: 3,
    scriptMin: 1700,
    scriptMax: 2200,
    selectPromptKey: "4. 長尺記事選定プロンプト",
    scriptPromptKey: "5. 長尺台本生成プロンプト",
    shortenPromptKey: "6. 長尺短縮再生成プロンプト",
  },
} as const;

export type BroadcastModeConfig = (typeof BROADCAST_MODES)[BroadcastMode];
