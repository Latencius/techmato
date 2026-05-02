export type Article = {
  source: string;
  title: string;
  url: string;
  summary: string;
  content?: string;
  publishedAt: Date;
};

export type ScriptSegment = {
  title: string;
  url: string;
  narration: string;
};

export type BroadcastScript = {
  opening: string;
  segments: ScriptSegment[];
  closing: string;
};

export type BroadcastSegment = {
  title: string;
  url: string;
  source: string;
  startSec: number;
  endSec: number;
};

export type Broadcast = {
  id: string;
  audioUrl: string;
  durationSec: number;
  segments: BroadcastSegment[];
  generatedAt: Date;
};
