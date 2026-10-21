import test from "node:test";
import assert from "node:assert/strict";
import { readSavedExplanation, redactEvidence, requestAiExplanation, validateAiExplanation, type Evidence } from "../src/lib/ai";
const evidence: Evidence[] = [{ ref: "user_profile.tech_skills[0]", kind: "transfer", value: "simulation：自述 Python 入门" }];
const output = { explanations: [{ kind: "transfer", evidence_refs: [evidence[0].ref], text: "仅有入门自述，具体独立实践能力尚未核验。" }], unknowns: ["尚无项目成果"] };
const savedReport = { kind: "R2", source: "llm_live", rules: { direction: { id: "ml_cv" } }, evidence, ai: { explanation: output, generated_at: "2026-10-20T12:00:00.000Z", source: "llm_live" } };

test("mock=true saved AI: R2 never displays a different selected direction", () => {
  assert.deepEqual(readSavedExplanation(savedReport, "R2", "ml_cv").explanation, output);
  assert.throws(() => readSavedExplanation(savedReport, "R2", "software_eng"), /其他目标方向/);
  assert.throws(() => readSavedExplanation(savedReport, "R2"), /其他目标方向/);
  assert.throws(() => readSavedExplanation(savedReport, "R1"), /类型或结构/);
});
test("mock=true saved AI: missing metadata and invented references are rejected on read", () => {
  assert.throws(() => readSavedExplanation({ ...savedReport, source: "simulation" }, "R2", "ml_cv"));
  assert.throws(() => readSavedExplanation({ ...savedReport, evidence: [] }, "R2", "ml_cv"), /证据校验/);
  assert.throws(() => readSavedExplanation({ ...savedReport, ai: { ...savedReport.ai, generated_at: "unknown" } }, "R2", "ml_cv"));
});
test("mock=true AI: valid explanation requires existing evidence and matching kind", () => {
  assert.equal(validateAiExplanation(output, evidence).explanations.length, 1);
  assert.throws(() => validateAiExplanation({ ...output, invented: true }, evidence));
  assert.throws(() => validateAiExplanation({ ...output, explanations: [{ ...output.explanations[0], evidence_refs: ["fake"] }] }, evidence));
  assert.throws(() => validateAiExplanation({ ...output, explanations: [{ ...output.explanations[0], kind: "interest" }] }, evidence));
});
test("mock=true AI: rejects unsupported scores, URLs, HTML and overlong inputs", () => {
  for (const text of ["录取概率 95%", "https://example.invalid", "<script>alert(1)</script>"]) assert.throws(() => validateAiExplanation({ ...output, unknowns: [text] }, evidence));
  assert.throws(() => redactEvidence([{ ...evidence[0], value: "x".repeat(24001) }]));
  const redacted = redactEvidence([{ ...evidence[0], value: "simulation test@example.invalid 13800000000" }]);
  assert.ok(!redacted.includes("test@example.invalid")); assert.ok(!redacted.includes("13800000000"));
});
test("mock=true AI: bounded JSON schema call, no tools or stored prompts, no real request", async () => {
  const fakeFetch = (async (_url, init) => {
    const body = JSON.parse(String(init?.body)); assert.equal(body.store, false); assert.equal(body.max_completion_tokens, 1500); assert.equal(body.response_format.type, "json_schema"); assert.equal(body.tools, undefined);
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(output) } }] });
  }) as typeof fetch;
  const result = await requestAiExplanation({ baseUrl: "https://example.invalid/v1", key: "unit-test-placeholder", model: "mock=true" }, evidence, fakeFetch);
  assert.deepEqual(result.explanation, output);
});
test("mock=true AI: HTTP failure, malformed output and invalid endpoints do not produce reports", async () => {
  const config = { baseUrl: "https://example.invalid/v1", key: "unit-test-placeholder", model: "mock=true" };
  for (const response of [new Response("untrusted body", { status: 503 }), Response.json({ choices: [{ finish_reason: "length", message: { content: "{}" } }] }), Response.json({ choices: [{ finish_reason: "stop", message: { content: "not json" } }] })]) await assert.rejects(requestAiExplanation(config, evidence, (async () => response) as typeof fetch));
  await assert.rejects(requestAiExplanation({ ...config, baseUrl: "http://remote.invalid" }, evidence));
});
