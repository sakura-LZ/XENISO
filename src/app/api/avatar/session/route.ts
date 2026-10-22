import { checkOrigin, errorResponse, json, limit, readJson } from "@/lib/server/http";
import { requireSession } from "@/lib/server/supabase";
import { activeAvatarSession, avatarConfigured, avatarSession, requestedAvatarPresenter } from "@/lib/server/xingyun";
import { avatarStore } from "@/lib/server/avatar-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export async function GET(request: Request) {
  try {
    const { client, user } = await requireSession();
    const presenter = requestedAvatarPresenter(new URL(request.url).searchParams.get("presenter"));
    return json({ configured: avatarConfigured(presenter), active_session: await activeAvatarSession(user.id, avatarStore(client)) });
  }
  catch (error) { return errorResponse(error); }
}
async function proxy(request: Request, method: "POST" | "DELETE") {
  try {
    checkOrigin(request);
    const { client, user } = await requireSession();
    limit(`avatar:${method}:${user.id}`, method === "POST" ? 5 : 20);
    const presenter = requestedAvatarPresenter(new URL(request.url).searchParams.get("presenter"));
    return json(await avatarSession(method, user.id, await readJson(request, 32768), avatarStore(client), presenter));
  } catch (error) { return errorResponse(error); }
}
export function POST(request: Request) { return proxy(request, "POST"); }
export function DELETE(request: Request) { return proxy(request, "DELETE"); }
