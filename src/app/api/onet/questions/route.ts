import { OnetClient } from "@/lib/onet/client";
import { requiredEnv } from "@/lib/server/env";
import { errorResponse, json, limit } from "@/lib/server/http";

export const dynamic = "force-dynamic";
let cached: { value: Awaited<ReturnType<OnetClient["questions"]>>; until: number } | undefined;
export async function GET() {
  try {
    limit("onet-questions", 20);
    if (!cached || cached.until <= Date.now()) {
      const value = await new OnetClient(requiredEnv("ONET_API_KEY")).questions();
      cached = { value, until: Date.now() + 60 * 60 * 1000 };
    }
    return json(cached.value);
  } catch (error) { return errorResponse(error); }
}
