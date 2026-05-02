import { NextResponse } from "next/server";
import { jobStore } from "../../../../../lib/server/jobStore";
import { createSseStream } from "../../../../../lib/server/sseStream";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  const job = jobStore.get(id);

  if (!job) {
    return NextResponse.json({ error: "broadcast not found" }, { status: 404 });
  }

  const stream = createSseStream((write) => jobStore.subscribe(id, write), [...job.events]);

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}
