import test from "node:test";
import assert from "node:assert/strict";
import { readProfileOverview } from "../src/lib/profile-overview";
import { emptyProfile, simulationProfile } from "../src/lib/profile";
import { areas } from "../src/lib/onet/contracts";

const mockAssessment = {
  source: "onet_live", instrument: "Mini-IP-30", onet_version: "mock=true", api_version: "mock=true", returned_at: "2026-10-22T00:00:00Z",
  answers: Array.from({ length: 30 }, (_, i) => ({ index: i + 1, answer: 3 })),
  question_snapshot: Array.from({ length: 30 }, (_, i) => ({ index: i + 1, original_en: `mock=true question ${i + 1}`, area: areas[i % 6], onet_version: "mock=true" })),
  scores: areas.map(code => ({ code, title: "mock=true", score: 15 })), careers: [], career_total: 0,
};
const fetcher = (profile: unknown, assessment: unknown): typeof fetch => async input => Response.json(String(input).endsWith("profile") ? { profile } : { assessment });
test("mock=true profile hub requires both saved basic fields and a valid official-result contract", async () => {
  assert.equal((await readProfileOverview(fetcher(simulationProfile, mockAssessment))).ready, true);
  assert.equal((await readProfileOverview(fetcher(emptyProfile, mockAssessment))).ready, false);
  assert.equal((await readProfileOverview(fetcher(simulationProfile, null))).ready, false);
});
test("mock=true profile hub treats unauthenticated visits as empty, without creating an account", async () => {
  const methods: (string | undefined)[] = [];
  const result = await readProfileOverview(async (_url, init) => { methods.push(init?.method); return Response.json({ error: { code: "AUTH_REQUIRED" } }, { status: 401 }); });
  assert.equal(result.ready, false); assert.equal(result.profile, null); assert.equal(result.assessment, null);
  assert.deepEqual(methods, [undefined, undefined]);
});
test("mock=true profile hub preserves API errors instead of reporting unfinished input", async () => {
  await assert.rejects(readProfileOverview(async () => Response.json({ error: { message: "数据库连接失败" } }, { status: 502 })), /数据库连接失败/);
});
test("mock=true profile hub refuses document snapshots and malformed official results", async () => {
  for (const assessment of [{ ...mockAssessment, source: "official_document_snapshot" }, { ...mockAssessment, answers: [] }, { ...mockAssessment, scores: [] }]) {
    await assert.rejects(readProfileOverview(fetcher(simulationProfile, assessment)));
  }
});
test("mock=true profile hub validates stored profile and response envelopes", async () => {
  await assert.rejects(readProfileOverview(fetcher({ ...simulationProfile, gpa: 8, gpa_scale: 4 }, null)));
  await assert.rejects(readProfileOverview(async () => Response.json({})), /不完整/);
});
test("mock=true profile reads use no-store and propagate cancellation", async () => {
  const controller = new AbortController();
  await readProfileOverview(async (_url, init) => { assert.equal(init?.cache, "no-store"); assert.equal(init?.signal, controller.signal); return Response.json({ profile: null, assessment: null }); }, controller.signal);
});
