import type {
  Article,
  BroadcastScript,
  MergeResult,
  SegmentMetadata,
  Selection,
} from "@techmato/pipeline";

export type MissingArticleMatchError = {
  type: "missing_article_match";
  message: string;
  url: string;
};

export type SegmentMetadataResult =
  | { ok: true; value: SegmentMetadata[] }
  | { ok: false; error: MissingArticleMatchError };

export type StoriesJson = {
  selectedAt: string;
  stories: {
    title: string;
    url: string;
    source: string;
    publishedAt: string;
    summary: string;
    contentPreview: string;
    selectionReason: string;
    includedInScript: boolean;
  }[];
};

export type SegmentsJson = {
  id: string;
  audioFile: string;
  audioUrl: string;
  durationSec: number;
  generatedAt: string;
  segments: MergeResult["segments"];
};

export function renderScriptText(
  script: BroadcastScript,
  generatedAt: Date,
  totalDurationSec: number,
): string {
  const lines = [
    "techmato broadcast",
    `generated: ${formatJstOffset(generatedAt)}`,
    `total: ${script.segments.length} segments / 約 ${totalDurationSec.toFixed(1)}秒`,
    "",
    "[opening]",
    script.opening,
    "",
  ];

  for (const [index, segment] of script.segments.entries()) {
    lines.push(`[${index + 1}] ${segment.title}`, segment.url, segment.narration, "");
  }

  lines.push("[closing]", script.closing);

  return lines.join("\n");
}

export function buildSegmentMetadata(
  script: BroadcastScript,
  enrichedArticles: Article[],
): SegmentMetadataResult {
  const articlesByUrl = new Map(enrichedArticles.map((article) => [article.url, article]));
  const metadata: SegmentMetadata[] = [];

  for (const segment of script.segments) {
    const article = articlesByUrl.get(segment.url);

    if (!article) {
      return {
        ok: false,
        error: {
          type: "missing_article_match",
          message: `No enriched article matched script segment URL: ${segment.url}`,
          url: segment.url,
        },
      };
    }

    metadata.push({
      title: article.title,
      url: article.url,
      source: article.source,
    });
  }

  return { ok: true, value: metadata };
}

export function formatStoriesJson(
  selected: Selection[],
  scriptSegments: BroadcastScript["segments"],
  generatedAt: Date,
): StoriesJson {
  const includedUrls = new Set(scriptSegments.map((segment) => segment.url));

  return {
    selectedAt: formatJstOffset(generatedAt),
    stories: selected.map((selection) => ({
      title: selection.article.title,
      url: selection.article.url,
      source: selection.article.source,
      publishedAt: selection.article.publishedAt.toISOString(),
      summary: selection.article.summary,
      contentPreview: (selection.article.content ?? selection.article.summary).slice(0, 500),
      selectionReason: selection.reason,
      includedInScript: includedUrls.has(selection.article.url),
    })),
  };
}

export function formatSegmentsJson(
  broadcastId: string,
  mergeResult: MergeResult,
  generatedAt: Date,
): SegmentsJson {
  return {
    id: broadcastId,
    audioFile: "broadcast.wav",
    audioUrl: "broadcast.wav",
    durationSec: mergeResult.totalDurationSec,
    generatedAt: formatJstOffset(generatedAt),
    segments: mergeResult.segments,
  };
}

export function formatJstOffset(date: Date): string {
  const parts = jstParts(date);

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+09:00`;
}

export function formatOutputTimestamp(date: Date): string {
  return formatJstOffset(date).replace("+09:00", "").replaceAll(":", "-");
}

function jstParts(date: Date): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return {
    year: part(parts, "year"),
    month: part(parts, "month"),
    day: part(parts, "day"),
    hour: part(parts, "hour"),
    minute: part(parts, "minute"),
    second: part(parts, "second"),
  };
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((entry) => entry.type === type)?.value ?? "00";
}
