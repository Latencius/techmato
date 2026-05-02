export type { Article, Broadcast, BroadcastScript } from "@techmato/types";
export type { ProgressEvent, ProgressEventStep } from "./broadcast/progressEvents.js";
export type {
  MissingArticleMatchError,
  SegmentMetadataResult,
  SegmentsJson,
  StoriesJson,
} from "./broadcast/render.js";
export {
  buildSegmentMetadata,
  formatJstOffset,
  formatOutputTimestamp,
  formatSegmentsJson,
  formatStoriesJson,
  renderScriptText,
} from "./broadcast/render.js";
export type {
  RunBroadcastError,
  RunBroadcastOptions,
  RunBroadcastSuccess,
} from "./broadcast/runBroadcast.js";
export { runBroadcast } from "./broadcast/runBroadcast.js";
export { extractArticleContent, extractFullContent } from "./extract/extract.js";
export type {
  FfmpegRunner,
  MergeError,
  MergeOptions,
  MergeResult,
  SegmentMetadata,
} from "./merge/merge.js";
export { mergeBroadcast } from "./merge/merge.js";
export type { ScriptError } from "./script/script.js";
export { generateScript } from "./script/script.js";
export type { SelectError, Selection } from "./select/select.js";
export { selectArticles } from "./select/select.js";
export { fetchAllSources, fetchSourceArticles } from "./sources/fetch.js";
export type { NewsSource } from "./sources/registry.js";
export { SOURCES } from "./sources/registry.js";
export type { TtsCue, TtsCueKind, TtsError, TtsManifest, TtsOptions } from "./tts/tts.js";
export { synthesizeScript } from "./tts/tts.js";
