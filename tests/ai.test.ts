import test from "node:test";
import assert from "node:assert/strict";
import { readSavedExplanation, redactEvidence, requestAiExplanation, validateAiExplanation, type Evidence } from "../src/lib/ai";
import { fingerprint, reportInputsFresh } from "../src/lib/report-freshness";
const evidence: Evidence[] = [{ ref: "user_profile.tech_skills[0]", kind: "transfer", value: "simulation：自述 Python 入门" }];
const output = { explanations: [{ kind: "transfer", evidence_refs: [evidence[0].ref], text: "仅有入门自述，具体独立实践能力尚未核验。" }], unknowns: ["尚无项目成果"] };
const reportPlanning = { transition_year: 2030, weekly_hours: 4, pathway: "统考", weekly_allocation: { foundation: 2, practice: 1, review: 1 } };
const savedReport = { kind: "R2", source: "llm_live", rules: { direction: { id: "ml_cv" }, planning_input: reportPlanning }, evidence, ai: { explanation: output, generated_at: "2026-10-20T12:00:00.000Z", source: "llm_live" } };

test("mock=true saved AI: a changed year, pathway or allocation cannot reuse the old R2", () => {
  const planning = { transition_year: 2030, weekly_hours: 4, pathway: "统考", weekly_allocation: { foundation: 2, practice: 1, review: 1 } };
  const saved = { ...savedReport, rules: { ...savedReport.rules, planning_input: planning } };
  for (const changed of [{ ...planning, transition_year: 2031 }, { ...planning, weekly_hours: 5 }, { ...planning, pathway: "推免" }, { ...planning, weekly_allocation: { foundation: 1, practice: 2, review: 1 } }]) assert.throws(() => readSavedExplanation(saved, "R2", "ml_cv", changed));
  assert.deepEqual(readSavedExplanation(saved, "R2", "ml_cv", planning).planning, planning);
  assert.throws(() => readSavedExplanation(saved, "R2", "ml_cv", planning, ["software"]));
  assert.throws(() => readSavedExplanation({ ...saved, rules: { direction: { id: "ml_cv" } } }, "R2", "ml_cv", planning));
});
test("mock=true saved AI: R1 remains readable without R2 planning", () => {
  assert.deepEqual(readSavedExplanation({ ...savedReport, kind: "R1", rules: {} }, "R1").explanation, output);
});
test("saved reports: profile and assessment edits invalidate both reports; experience edits invalidate R2", () => {
  const current = { profile: { skills: ["Python"] }, assessment: { scores: [2] }, experience: { outputs: ["simulation"] } };
  const saved = { profile: fingerprint(current.profile), assessment: fingerprint(current.assessment), experience: fingerprint(current.experience) };
  assert.equal(reportInputsFresh({ kind: "R1", input_fingerprints: saved }, current), true);
  assert.equal(reportInputsFresh({ kind: "R1", input_fingerprints: saved }, { ...current, profile: { skills: ["R"] } }), false);
  assert.equal(reportInputsFresh({ kind: "R2", input_fingerprints: saved }, current), true);
  assert.equal(reportInputsFresh({ kind: "R2", input_fingerprints: saved }, { ...current, experience: { outputs: ["changed"] } }), false);
  assert.equal(reportInputsFresh({ kind: "R2" }, current), false);
  assert.equal(fingerprint({ a: 1, b: [2, 3] }), fingerprint({ b: [2, 3], a: 1 }));
});
test("mock=true saved AI: exported explanations retain the saved evidence snapshot", () => {
  const saved = { ...savedReport, kind: "R1", rules: {}, evidence: [{ ...evidence[0], value: "mock=true：生成时保存的项目依据" }] };
  const exported = JSON.parse(JSON.stringify(readSavedExplanation(saved, "R1")));
  assert.equal(exported.evidence[0].value, "mock=true：生成时保存的项目依据");
  assert.equal(exported.evidence[0].ref, "user_profile.tech_skills[0]");
});

test("mock=true saved AI: R2 never displays a different selected direction", () => {
  assert.deepEqual(readSavedExplanation(savedReport, "R2", "ml_cv", reportPlanning).explanation, output);
  assert.throws(() => readSavedExplanation(savedReport, "R2", "software_eng"), /其他目标方向/);
  assert.throws(() => readSavedExplanation(savedReport, "R2"), /其他目标方向/);
  assert.throws(() => readSavedExplanation(savedReport, "R1"), /类型或结构/);
  assert.throws(() => readSavedExplanation({ ...savedReport, rules: { ...savedReport.rules, direction: { id: "fake" } } }, "R2", "fake", reportPlanning), /其他目标方向/);
});
test("mock=true saved AI: missing metadata and invented references are rejected on read", () => {
  assert.throws(() => readSavedExplanation({ ...savedReport, source: "simulation" }, "R2", "ml_cv"));
  assert.throws(() => readSavedExplanation({ ...savedReport, evidence: [] }, "R2", "ml_cv", reportPlanning), /证据校验/);
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
