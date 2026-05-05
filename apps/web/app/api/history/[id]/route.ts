import { NextResponse } from "next/server";
import { historyStore } from "../../../../lib/server/historyStoreSingleton";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type FavoriteRequestBody = {
  favorite?: unknown;
};

export async function PATCH(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const { id } = await params;
  const body = await readBody(request);

  if (!body.ok) {
    return NextResponse.json({ error: "request body must be valid JSON" }, { status: 400 });
  }
  if (typeof body.value.favorite !== "boolean") {
    return NextResponse.json({ error: "favorite must be boolean" }, { status: 400 });
  }

  const result = await historyStore.setFavorite(id, body.value.favorite);
  if (result.isErr()) {
    return historyErrorResponse(result.error.message);
  }

  return NextResponse.json(result.value);
}

export async function DELETE(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  const { id } = await params;
  const result = await historyStore.removeEntry(id, { deleteFiles: true });

  if (result.isErr()) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }
  if (!result.value.removed) {
    return NextResponse.json({ error: "broadcast not found" }, { status: 404 });
  }

  return NextResponse.json({
    removed: true,
    filesRemoved: result.value.filesRemoved ?? false,
  });
}

async function readBody(
  request: Request,
): Promise<{ ok: true; value: FavoriteRequestBody } | { ok: false }> {
  try {
    return { ok: true, value: (await request.json()) as FavoriteRequestBody };
  } catch {
    return { ok: false };
  }
}

function historyErrorResponse(message: string): NextResponse {
  if (message.startsWith("History entry not found:")) {
    return NextResponse.json({ error: "broadcast not found" }, { status: 404 });
  }

  return NextResponse.json({ error: message }, { status: 500 });
}
