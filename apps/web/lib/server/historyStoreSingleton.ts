import { createHistoryStore, type HistoryStore } from "@techmato/pipeline";
import { resolveWebOutputRoot } from "./outputStore";

declare global {
  var __techmatoHistoryStore: HistoryStore | undefined;
}

if (!globalThis.__techmatoHistoryStore) {
  globalThis.__techmatoHistoryStore = createHistoryStore(resolveWebOutputRoot());
}

export const historyStore: HistoryStore = globalThis.__techmatoHistoryStore;
