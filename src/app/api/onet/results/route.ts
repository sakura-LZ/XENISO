import { OnetClient } from "@/lib/onet/client";
import { requiredEnv } from "@/lib/server/env";
import { checkOrigin, errorResponse, json, limit, readJson } from "@/lib/server/http";
import { requireSession } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { user } = await requireSession();
    limit(`onet-results:${user.id}`, 5);
    return json(await new OnetClient(requiredEnv("ONET_API_KEY")).results(await readJson(request)));
  } catch (error) { return errorResponse(error); }
}
