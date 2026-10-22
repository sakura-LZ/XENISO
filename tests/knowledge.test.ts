import test from "node:test";
import assert from "node:assert/strict";
import { knowledgeRoles, normalizeSourceUrl, recordSchema, searchSchema, sourceSchema, verifyQuotes, type KnowledgeRecord, type KnowledgeSource } from "../src/lib/knowledge";
import { knowledgeEvidence, searchKnowledge } from "../src/lib/knowledge-search";
import { validateAiExplanation } from "../src/lib/ai";
import { classifyFacts } from "../scripts/knowledge/classify";
import { htmlText } from "../scripts/knowledge/html";

// Synthetic fixtures validate retrieval and evidence semantics, never employment facts.
const quote = "simulation: 本条为模拟产品需求与临床工作流证据，仅供软件测试。";
const source: KnowledgeSource = { id: "simulation-cn-source", url: "https://example.edu.cn/simulation", organization: "simulation", title: "simulation", jurisdiction: "CN", source_tier: "primary", published_at: null, publication_date_note: "simulation unknown" };
const base: KnowledgeRecord = {
  id: "simulation-cn-record", source_id: source.id, role_id: "medical_ai_pm", category: "occupation", title: "simulation 产品需求", summary: "simulation 临床工作流", applicability: "simulation 测试，非真实职业资料", relation: "related", tags: ["产品需求", "临床工作流"], facts: [{ field: "responsibilities", value: quote, quote, start: 0, end: quote.length }], missing_fields: ["salary"], verification: "quote_verified", content_hash: "a".repeat(64), collected_at: "2026-10-21T00:00:00Z", verified_at: "2026-10-21T00:00:00Z", valid_through: null, freshness_days: 30,
};
const now = new Date("2026-10-22T00:00:00Z");
test("role associations preserve the PM editorial mapping as the catalog expands", () => {
  const pm = knowledgeRoles.find(role => role.id === "medical_ai_pm");
  assert.ok(pm);
  assert.ok(pm.mapping_basis.includes("LIMEN"));
  assert.ok(pm.direction_ids.includes("health_systems"));
  assert.equal(new Set(knowledgeRoles.map(role => role.id)).size, knowledgeRoles.length);
});
test("source canonicalization removes tracking but preserves meaningful admissions parameters", () => {
  assert.equal(normalizeSourceUrl("https://example.edu.cn/a?year=2027&utm_source=test#details"), "https://example.edu.cn/a?year=2027");
  for (const url of ["http://example.edu.cn/", "https://key@example.edu.cn/", "https://127.0.0.1/", "https://localhost/"]) assert.throws(() => normalizeSourceUrl(url));
});
test("evidence must exactly equal its claimed source interval and value", () => {
  assert.equal(verifyQuotes(recordSchema.parse(base), quote), true);
  assert.equal(verifyQuotes({ ...base, facts: [{ ...base.facts[0], value: "invented salary" }] }, quote), false);
  assert.equal(verifyQuotes({ ...base, facts: [{ ...base.facts[0], start: 1 }] }, quote), false);
});
test("missing publication date and salary remain explicit unknowns", () => {
  assert.equal(sourceSchema.parse(source).published_at, null);
  const hit = searchKnowledge([base], [source], {}, now)[0];
  assert.deepEqual(hit.missing_fields, ["salary"]);
  assert.ok(!hit.facts.some(fact => fact.field === "salary"));
});
test("retrieval defaults to China and supports explicit supplementary scope", () => {
  const foreign: KnowledgeSource = { ...source, id: "simulation-us-source", jurisdiction: "US" };
  const records = [base, { ...base, id: "simulation-us-record", source_id: foreign.id }];
  assert.equal(searchKnowledge(records, [source, foreign], {}, now).length, 1);
  assert.equal(searchKnowledge(records, [source, foreign], { jurisdiction: "all" }, now).length, 2);
});
test("direction/category filtering cannot leak unrelated direction evidence", () => {
  assert.equal(searchKnowledge([base], [source], { direction_id: "devices" }, now).length, 0);
  assert.equal(searchKnowledge([base], [source], { direction_id: "health_systems", category: "learning" }, now).length, 0);
  assert.equal(searchKnowledge([base], [source], { direction_id: "health_systems", q: "临床工作流" }, now).length, 1);
});
test("unknown query produces no invented recommendations and no-match stays empty", () => {
  assert.equal(searchKnowledge([base], [source], { q: "火星采矿" }, now).length, 0);
  assert.throws(() => searchSchema.parse({ role_id: "made_up_role" }));
  assert.throws(() => searchSchema.parse({ direction_id: "made_up_direction" }));
  assert.throws(() => searchSchema.parse({ limit: 100 }));
});
test("historical admissions and stale records require explicit opt-in", () => {
  const expired = { ...base, category: "admissions" as const, valid_through: "2026-10-20" };
  assert.equal(searchKnowledge([expired], [source], {}, now).length, 0);
  assert.equal(searchKnowledge([expired], [source], { include_historical: true }, now)[0].historical, true);
  assert.equal(searchKnowledge([base], [source], {}, new Date("2027-01-01T00:00:00Z")).length, 0);
});
test("citation freezes content version and supports existing report evidence contract", () => {
  const hits = searchKnowledge([base], [source], {}, now), evidence = knowledgeEvidence(hits);
  assert.equal(hits[0].citation, "kb:simulation-cn-record:aaaaaaaaaaaa");
  assert.equal((evidence[0].value as { source_url: string }).source_url, source.url);
  assert.doesNotThrow(() => validateAiExplanation({ explanations: [{ kind: "direction", evidence_refs: [hits[0].citation], text: "模拟证据只提供任务线索，薪资未知。" }], unknowns: ["薪资未知"] }, evidence));
  assert.throws(() => validateAiExplanation({ explanations: [{ kind: "direction", evidence_refs: ["kb:invented"], text: "模拟" }], unknowns: [] }, evidence));
});
test("PostgREST UTC offsets are accepted without losing the original timestamp", () => {
  assert.equal(recordSchema.parse({ ...base, collected_at: "2026-10-21T00:00:00+00:00" }).collected_at, "2026-10-21T00:00:00+00:00");
});
test("classification requires evidence fields and flags contradictory categories for review", () => {
  assert.equal(classifyFacts([{ field: "exam_subjects" }, { field: "program" }]), "admissions");
  assert.equal(classifyFacts([{ field: "city" }, { field: "education" }]), "recruitment");
  assert.equal(classifyFacts([{ field: "city" }, { field: "exam_subjects" }]), null);
  assert.equal(classifyFacts([{ field: "made_up_fact" }]), null);
});
test("HTML extraction excludes executable content and decodes source quote entities", () => {
  assert.equal(htmlText('<script>invented salary</script><nav>irrelevant menu</nav><p>simulation A &amp; B &#x4E2D;文</p>'), "simulation A & B 中文");
});
