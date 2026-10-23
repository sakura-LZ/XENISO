import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import expansion from "../data/knowledge/expansion.collected.json";
import pilot from "../data/knowledge/pilot.collected.json";
import retrievalCases from "../data/knowledge/retrieval-eval.json";
import directionMap from "../data/occupation_direction_map.json";
import { categories, knowledgeRoles, normalizeSourceUrl, recordSchema, searchSchema, sourceSchema, type KnowledgeRecord, type KnowledgeSource } from "../src/lib/knowledge";
import { knowledgeEvidence, rankKnowledge, searchKnowledge } from "../src/lib/knowledge-search";
import { retrieveKnowledge, reportKnowledge } from "../src/lib/server/knowledge-store";

const records = recordSchema.array().parse(expansion.records);
const sources = sourceSchema.array().parse(expansion.sources);
const directions = directionMap.directions.flatMap(group => group.specializations);
// Fixed collection-time clock keeps the corpus checks reproducible as evidence ages.
const now = new Date(expansion.generated_at);
function fixtureClient(rows: KnowledgeRecord[], refs: KnowledgeSource[]) {
  return { from(table: string) {
    return { select() {
      if (table === "kb_sources") return { in: async (_key: string, ids: string[]) => ({ data: refs.filter(source => ids.includes(source.id)), error: null }) };
      return { in: (_key: string, ids: string[]) => ({ order: () => ({
        limit: async (limit: number) => ({ data: rows.filter(record => ids.includes(record.role_id)).slice(0, limit), error: null }),
        range: async (from: number, to: number) => ({ data: rows.filter(record => ids.includes(record.role_id)).slice(from, to + 1), error: null }),
      }) }) };
    } };
  } } as unknown as SupabaseClient;
}

test("all nine interdisciplinary directions have separate official guide roles and admissions", () => {
  assert.equal(directions.length, 9);
  for (const direction of directions) {
    const role = knowledgeRoles.find(role => role.id === `guide_${direction.id}`);
    assert.ok(role);
    assert.deepEqual(role.direction_ids, [direction.id]);
    const hits = rankKnowledge(records, sources, { direction_id: direction.id }, now);
    for (const category of ["occupation", "admissions", "industry", "learning"]) assert.ok(hits.some(hit => hit.category === category), `${direction.id}: ${category}`);
  }
  assert.deepEqual(knowledgeRoles.find(role => role.id === "medicine_guide")?.direction_ids, []);
});

test("medicine and interdisciplinary evidence remain isolated in both directions", () => {
  const medicine = rankKnowledge(records, sources, { domain: "medicine" }, now);
  const interdisciplinary = rankKnowledge(records, sources, { domain: "interdisciplinary" }, now);
  assert.ok(medicine.length > 0 && interdisciplinary.length > 0);
  assert.ok(medicine.every(hit => hit.role_id === "medicine_guide"));
  assert.ok(interdisciplinary.every(hit => hit.role_id !== "medicine_guide"));
  assert.equal(rankKnowledge(records, sources, { domain: "medicine", direction_id: "devices" }, now).length, 0);
});

test("school and admission year filters preserve program and college provenance", () => {
  const hits = rankKnowledge(records, sources, { institution: "上海交通大学", admission_year: 2027, category: "admissions" }, now);
  assert.ok(hits.length >= 9);
  assert.ok(hits.every(hit => hit.context?.institution === "上海交通大学" && hit.context?.admission_year === 2027));
  assert.ok(hits.some(hit => hit.context?.college && hit.context?.program));
  assert.equal(rankKnowledge(records, sources, { institution: "不存在的simulation院校", admission_year: 2027 }, now).length, 0);
});

test("historical program evidence requires opt-in without silently changing its admission year", () => {
  const query = { direction_id: "devices", institution: "深圳大学", admission_year: 2026, category: "admissions" };
  assert.equal(rankKnowledge(records, sources, query, now).length, 0);
  const history = rankKnowledge(records, sources, { ...query, include_historical: true }, now);
  assert.ok(history.length > 0);
  assert.ok(history.every(hit => hit.historical && hit.context?.admission_year === 2026));
});

test("hospital department retrieval distinguishes clinical and medical technology sources", () => {
  const cardiovascular = rankKnowledge(records, sources, { domain: "medicine", medical_department: "心血管内科" }, now);
  assert.ok(cardiovascular.length > 0);
  assert.ok(cardiovascular.every(hit => hit.context?.medical_department === "心血管内科" && hit.context?.department_type === "clinical"));
  const laboratory = rankKnowledge(records, sources, { domain: "medicine", medical_department: "检验科" }, now);
  assert.ok(laboratory.length > 0);
  assert.ok(laboratory.every(hit => hit.context?.department_type === "medical_technology"));
  assert.equal(rankKnowledge(records, sources, { direction_id: "devices", medical_department: "心血管内科" }, now).length, 0);
});

test("hash-routed admissions links retain the exact program route and reject credentials", () => {
  const url = "https://ehall.szu.edu.cn/gsapp/sys/zsjzapp/index.do?utm_source=test#/2026/4/124/083100";
  assert.equal(normalizeSourceUrl(url), "https://ehall.szu.edu.cn/gsapp/sys/zsjzapp/index.do#/2026/4/124/083100");
  assert.throws(() => normalizeSourceUrl("https://user:secret@example.edu.cn/#/2026"));
  assert.ok(sources.some(source => source.url.includes("#/2026/4/124/083100")));
});

test("untruncated ranking and offset pagination enumerate the same complete result set", () => {
  const ranked = rankKnowledge(records, sources, { domain: "interdisciplinary" }, now);
  assert.ok(ranked.length > 20);
  const pages = Array.from({ length: Math.ceil(ranked.length / 20) }, (_, page) => searchKnowledge(records, sources, { domain: "interdisciplinary", limit: 20, offset: page * 20 }, now)).flat();
  assert.deepEqual(pages.map(hit => hit.id), ranked.map(hit => hit.id));
  assert.equal(new Set(pages.map(hit => hit.id)).size, ranked.length);
  assert.deepEqual(searchKnowledge(records, sources, { offset: ranked.length, domain: "interdisciplinary" }, now), []);
  for (const input of [{ offset: -1 }, { offset: 10001 }, { admission_year: 1999 }, { domain: "invented" }]) assert.throws(() => searchSchema.parse(input));
});

test("coverage and categories count all available records beyond the first page", async () => {
  const template = records.find(record => record.role_id === "guide_devices")!;
  const synthetic = Array.from({ length: 26 }, (_, index): KnowledgeRecord => ({ ...template, id: `simulation-coverage-${String(index).padStart(2, "0")}`, category: index === 25 ? "learning" : "occupation", collected_at: now.toISOString(), valid_through: null, context: { institution: index === 25 ? "simulation尾页院校" : "simulation首页院校", admission_year: 2027 } }));
  const client = fixtureClient(synthetic, sources);
  const first = await retrieveKnowledge(client, searchSchema.parse({ direction_id: "devices", limit: 20 }), now);
  assert.equal(first.total, 26); assert.equal(first.hits.length, 20); assert.equal(first.has_more, true);
  assert.equal(first.coverage.records, 26); assert.equal((first.coverage.by_category as Record<string, number>).learning, 1);
  assert.ok(!first.missing_categories.includes("learning"));
  assert.ok((first.facets.institutions as string[]).includes("simulation尾页院校"));
  const final = await retrieveKnowledge(client, searchSchema.parse({ direction_id: "devices", limit: 20, offset: 20 }), now);
  assert.equal(final.hits.length, 6); assert.equal(final.has_more, false);
  const filtered = await retrieveKnowledge(client, searchSchema.parse({ direction_id: "devices", institution: "simulation尾页院校", admission_year: 2027 }), now);
  assert.equal(filtered.total, 1); assert.equal(filtered.coverage.records, 26);
  const report = await reportKnowledge(client, ["devices"]);
  assert.equal(report.status, "available");
  assert.ok(report.evidence.some(entry => (entry.value as { category: string }).category === "learning"));
  assert.ok(report.citations.some(citation => citation.ref.includes("simulation-coverage-25")));
});

test("incompatible domain and direction returns a complete empty coverage contract", async () => {
  const result = await retrieveKnowledge(fixtureClient(records, sources), searchSchema.parse({ domain: "medicine", direction_id: "devices" }), now);
  assert.equal(result.status, "not_covered"); assert.equal(result.total, 0); assert.equal(result.has_more, false);
  assert.deepEqual(result.hits, []); assert.deepEqual(result.facets.institutions, []);
  assert.deepEqual(result.missing_categories, [...categories]);
});

test("official facts remain verbatim and statistical scope stays attached to report evidence", () => {
  assert.ok(records.every(record => record.facts.every(fact => fact.value === fact.quote && fact.end - fact.start === fact.quote.length)));
  assert.ok(sources.every(source => source.jurisdiction === "CN" && source.source_tier === "primary"));
  const statistics = records.filter(record => record.facts.some(fact => ["salary_statistics", "employment_statistics"].includes(fact.field)));
  assert.ok(statistics.length > 0);
  assert.ok(statistics.every(record => record.context?.statistic_scope));
  const hit = searchKnowledge(records, sources, { role_id: "medicine_guide", q: "税前", category: "industry" }, now)[0];
  assert.ok(hit);
  const evidence = knowledgeEvidence([hit])[0].value as { context: { statistic_scope?: string }; source_url: string; facts: { quote: string }[] };
  assert.equal(evidence.context.statistic_scope, hit.context?.statistic_scope);
  assert.equal(evidence.source_url, hit.source.url);
  assert.deepEqual(evidence.facts.map(fact => fact.quote), hit.facts.slice(0, 6).map(fact => fact.quote));
});

test("multi-direction report context includes distinct direction evidence and bounded citations", async () => {
  const context = await reportKnowledge(fixtureClient(records, sources), ["devices", "ml_cv", "devices"]);
  assert.equal(context.status, "available");
  assert.ok(context.evidence.some(entry => (entry.value as { role_id: string }).role_id === "guide_devices"));
  assert.ok(context.evidence.some(entry => (entry.value as { role_id: string }).role_id === "guide_ml_cv"));
  assert.equal(new Set(context.citations.map(citation => citation.ref)).size, context.citations.length);
  assert.ok(context.citations.length <= 15);
});

test("versioned retrieval regression retains pilot cases and adds source-scoped expansion cases", () => {
  const allRecords = recordSchema.array().parse([...pilot.records, ...expansion.records]);
  const allSources = sourceSchema.array().parse([...new Map([...pilot.sources, ...expansion.sources].map(source => [source.id, source])).values()]);
  for (const row of retrievalCases) {
    const hits = searchKnowledge(allRecords, allSources, row.query, now);
    if ("expect_empty" in row && row.expect_empty) assert.equal(hits.length, 0, row.name);
    else assert.ok(hits.some(hit => (row.relevant_ids as string[]).includes(hit.id)), `${row.name}: ${hits.map(hit => hit.id).join(",")}`);
  }
});

test("UESTC conditions contain actual eligibility rules rather than navigation text", () => {
  const rows = records.filter(record => record.id.endsWith("uestc-2027-charter"));
  assert.equal(rows.length, 3);
  for (const row of rows) {
    assert.ok(row.facts.some(fact => fact.quote.includes("高职（专科）毕业学历后满2年")));
    assert.ok(row.facts.some(fact => fact.quote.includes("加试方式为笔试")));
    assert.ok(row.facts.every(fact => !fact.quote.includes("首页 新闻中心")));
  }
});

test("explicit medicine direction retrieves hospital sources and supplies report context", async () => {
  const client = fixtureClient(records, sources);
  const result = await retrieveKnowledge(client, searchSchema.parse({ direction_id: "medicine", medical_department: "心血管内科" }), now);
  assert.equal(result.status, "available"); assert.ok(result.hits.length > 0);
  assert.ok(result.hits.every(hit => hit.role_id === "medicine_guide" && hit.context?.medical_department === "心血管内科"));
  assert.deepEqual(rankKnowledge(records, sources, { direction_id: "medicine", domain: "interdisciplinary" }, now), []);
  const report = await reportKnowledge(client, ["medicine"]);
  assert.equal(report.status, "available"); assert.ok(report.evidence.length > 0);
  assert.ok(report.evidence.every(entry => (entry.value as { role_id: string }).role_id === "medicine_guide"));
  assert.ok(report.citations.every(citation => citation.url.startsWith("https://")));
});
