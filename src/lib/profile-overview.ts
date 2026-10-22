import { assessmentSchema, type AssessmentResult } from "./assessment";
import { profileMissing, profileSchema, type Profile } from "./profile";

export type ProfileOverview = { profile: Profile | null; assessment: AssessmentResult | null; basicsComplete: boolean; ready: boolean };
export async function readProfileOverview(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<ProfileOverview> {
  const read = async (url: string, key: string) => {
    const response = await fetcher(url, { signal, cache: "no-store" });
    if (response.status === 401) return null;
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") throw new Error("资料返回格式无效，请重新读取。");
    const data = body as Record<string, unknown>;
    if (!response.ok) {
      const error = data.error as { message?: unknown } | undefined;
      throw new Error(typeof error?.message === "string" ? error.message : "资料暂时无法读取，请重试。");
    }
    if (!(key in data)) throw new Error("资料返回不完整，请重新读取。");
    return data[key];
  };
  const [p, a] = await Promise.all([read("/api/profile", "profile"), read("/api/assessment", "assessment")]);
  const profile = p === null ? null : profileSchema.parse(p);
  const assessment = a === null ? null : assessmentSchema.parse(a);
  const basicsComplete = profile !== null && profileMissing(profile).length === 0;
  return { profile, assessment, basicsComplete, ready: basicsComplete && assessment !== null };
}
