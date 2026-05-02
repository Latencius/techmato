import { NextResponse } from "next/server";
import { jobStore } from "../../../../lib/server/jobStore";
import { createOutputStore, resolveWebOutputRoot } from "../../../../lib/server/outputStore";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  const { id } = await params;
  const store = createOutputStore(resolveWebOutputRoot());
  const job = jobStore.get(id);

  if (job) {
    const metadataResult = job.status === "completed" ? await store.readMetadata(id) : null;

    if (metadataResult?.isErr()) {
      return metadataResult.error.type === "not_found"
        ? NextResponse.json({ error: "broadcast not found" }, { status: 404 })
        : NextResponse.json({ error: metadataResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      broadcastId: job.broadcastId,
      status: job.status,
      startedAt: job.startedAt.toISOString(),
      ...(job.completedAt ? { completedAt: job.completedAt.toISOString() } : {}),
      ...(job.error ? { error: job.error } : {}),
      ...(metadataResult?.isOk() ? { metadata: metadataResult.value } : {}),
    });
  }

  const metadataResult = await store.readMetadata(id);
  if (metadataResult.isErr()) {
    return metadataResult.error.type === "not_found"
      ? NextResponse.json({ error: "broadcast not found" }, { status: 404 })
      : NextResponse.json({ error: metadataResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    broadcastId: id,
    status: "completed",
    startedAt: metadataResult.value.segments.generatedAt,
    completedAt: metadataResult.value.segments.generatedAt,
    metadata: metadataResult.value,
  });
}
