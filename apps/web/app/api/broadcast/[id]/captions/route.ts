import { NextResponse } from "next/server";
import { createCaptionsStore } from "../../../../../lib/server/captionsStore";
import { resolveWebOutputRoot } from "../../../../../lib/server/outputStore";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props): Promise<Response> {
  const { id } = await params;
  const store = createCaptionsStore(resolveWebOutputRoot());
  const readResult = await store.read(id);
  const result =
    readResult.isOk() || readResult.error.type !== "not_found"
      ? readResult
      : await store.backfill(id);

  if (result.isErr()) {
    return NextResponse.json({ error: "captions not found" }, { status: 404 });
  }

  return new Response(result.value, {
    headers: {
      "Content-Type": "text/vtt; charset=utf-8",
      "Cache-Control": "private, max-age=60",
    },
  });
}
