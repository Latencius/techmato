import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchiveBroadcastView } from "../../../components/ArchiveBroadcastView";
import { resolveBaseUrl } from "../../../lib/server/baseUrl";
import { historyStore } from "../../../lib/server/historyStoreSingleton";
import { createOutputStore, resolveWebOutputRoot } from "../../../lib/server/outputStore";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [baseUrl, readResult] = await Promise.all([resolveBaseUrl(), historyStore.read()]);
  const entry = readResult.isOk() ? readResult.value.items.find((item) => item.id === id) : null;
  const title = entry?.title ?? `techmato — ${id}`;
  const description = entry
    ? `${entry.mode === "long" ? "5分版" : "1分版"}・${entry.storyCount}件のニュース`
    : "techmato で生成された AI テックニュース放送";
  const shareUrl = `${baseUrl}/archive/${encodeURIComponent(id)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: shareUrl,
      siteName: "techmato",
      locale: "ja_JP",
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function ArchiveBroadcastPage({ params }: Props) {
  const { id } = await params;
  const [baseUrl, readResult] = await Promise.all([resolveBaseUrl(), historyStore.read()]);

  if (readResult.isErr()) {
    notFound();
  }

  const entry = readResult.value.items.find((item) => item.id === id);
  if (!entry) {
    notFound();
  }

  const outputStore = createOutputStore(resolveWebOutputRoot());
  const metadataResult = await outputStore.readMetadata(id);

  if (metadataResult.isErr()) {
    notFound();
  }

  return <ArchiveBroadcastView entry={entry} metadata={metadataResult.value} baseUrl={baseUrl} />;
}
