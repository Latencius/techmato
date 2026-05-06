import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchiveBroadcastView } from "../../../components/ArchiveBroadcastView";
import { historyStore } from "../../../lib/server/historyStoreSingleton";
import { createOutputStore, resolveWebOutputRoot } from "../../../lib/server/outputStore";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `techmato — ${id}` };
}

export default async function ArchiveBroadcastPage({ params }: Props) {
  const { id } = await params;
  const readResult = await historyStore.read();

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

  return <ArchiveBroadcastView entry={entry} metadata={metadataResult.value} />;
}
