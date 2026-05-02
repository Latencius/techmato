import { NextResponse } from "next/server";
import { createOutputStore, resolveWebOutputRoot } from "../../../../../lib/server/outputStore";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const { id } = await params;
  const result = await createOutputStore(resolveWebOutputRoot()).audioStream(id);

  if (result.isErr()) {
    return result.error.type === "not_found"
      ? NextResponse.json({ error: "broadcast not found" }, { status: 404 })
      : NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return new Response(result.value.stream, {
    headers: {
      "Content-Length": String(result.value.size),
      "Content-Type": "audio/wav",
    },
  });
}
