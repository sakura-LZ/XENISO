import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { knowledgeRoles } from "../src/lib/knowledge";
const origin = process.env.LIMEN_TEST_ORIGIN ?? "http://127.0.0.1:3001";
assert(["127.0.0.1", "localhost"].includes(new URL(origin).hostname));
const checks: { name: string; passed: boolean }[] = [];
async function check(name: string, run: () => Promise<void>) { try { await run(); checks.push({ name, passed: true }); } catch { checks.push({ name, passed: false }); throw new Error(name); } }
let failure: string | null = null;
try {
  await check("real Supabase China-only five-category result", async () => {
    const response = await fetch(`${origin}/api/knowledge?role_id=medical_ai_pm&limit=20`);
    assert.equal(response.status, 200); assert.match(response.headers.get("cache-control")!, /no-store/);
    const data = await response.json(); assert.equal(data.source, "supabase_live"); assert.equal(data.status, "available"); assert.equal(data.hits.length, 8); assert.deepEqual(data.missing_categories, []);
    assert.ok(data.hits.every((hit: { source: { jurisdiction: string }; citation: string; facts: { quote: string }[] }) => hit.source.jurisdiction === "CN" && hit.citation.startsWith("kb:") && hit.facts.every(fact => fact.quote.length >= 10)));
  });
  await check("2027 admissions evidence is scoped to program and exams", async () => {
    const response = await fetch(`${origin}/api/knowledge?role_id=medical_ai_pm&category=admissions&q=408`), data = await response.json();
    assert.equal(response.status, 200); assert.equal(data.hits.length, 1); assert.equal(data.hits[0].id, "medical-ai-pm-sjtu-2027-catalog");
    assert.ok(data.hits[0].facts.some((fact: { field: string; quote: string }) => fact.field === "exam_subjects" && fact.quote.includes("085400电子信息")));
    assert.ok(data.hits[0].missing_fields.includes("cross_major_restrictions"));
  });
  await check("all nine directions have official source coverage", async () => {
    const directionIds = knowledgeRoles.filter(role => role.id.startsWith("guide_")).flatMap(role => role.direction_ids);
    assert.equal(directionIds.length, 9);
    const results = await Promise.all(directionIds.map(async id => {
      const response = await fetch(`${origin}/api/knowledge?direction_id=${id}&limit=20`);
      assert.equal(response.status, 200); return response.json();
    }));
    for (const data of results) {
      assert.equal(data.status, "available");
      for (const category of ["occupation", "admissions", "industry", "learning"]) assert.ok(data.coverage.by_category[category] > 0);
      assert.ok(data.hits.every((hit: { role_id: string }) => hit.role_id !== "medicine_guide"));
    }
  });
  await check("pagination preserves full coverage beyond twenty records", async () => {
    const response = await fetch(`${origin}/api/knowledge?domain=interdisciplinary&limit=20`), data = await response.json();
    assert.equal(response.status, 200); assert.equal(data.hits.length, 20); assert.ok(data.total > 20 && data.has_more);
    assert.equal(data.coverage.records, data.total);
    const rest = await Promise.all(Array.from({ length: Math.ceil(data.total / 20) - 1 }, async (_, index) => {
      const page = await fetch(`${origin}/api/knowledge?domain=interdisciplinary&limit=20&offset=${(index + 1) * 20}`);
      assert.equal(page.status, 200); return page.json();
    }));
    const ids = [data, ...rest].flatMap(page => page.hits.map((hit: { id: string }) => hit.id));
    assert.equal(ids.length, data.total); assert.equal(new Set(ids).size, data.total);
    assert.equal(rest.at(-1)?.has_more, false);
  });
  await check("school and admission-year filters preserve specific program context", async () => {
    const params = new URLSearchParams({ institution: "上海交通大学", admission_year: "2027", category: "admissions", limit: "20" });
    const response = await fetch(`${origin}/api/knowledge?${params}`), data = await response.json();
    assert.equal(response.status, 200); assert.ok(data.hits.length >= 9);
    assert.ok(data.hits.every((hit: { context: { institution: string; admission_year: number } }) => hit.context.institution === "上海交通大学" && hit.context.admission_year === 2027));
    assert.ok(data.hits.some((hit: { context: { college?: string; program?: string } }) => hit.context.college && hit.context.program));
  });
  await check("historical admissions require opt-in and preserve hash program route", async () => {
    const params = new URLSearchParams({ direction_id: "devices", institution: "深圳大学", admission_year: "2026", category: "admissions" });
    const current = await fetch(`${origin}/api/knowledge?${params}`);
    assert.equal(current.status, 200); assert.deepEqual((await current.json()).hits, []);
    params.set("include_historical", "true");
    const historical = await fetch(`${origin}/api/knowledge?${params}`), data = await historical.json();
    assert.equal(historical.status, 200); assert.ok(data.hits.length > 0);
    assert.ok(data.hits.every((hit: { historical: boolean; source: { url: string }; context: { admission_year: number } }) => hit.historical && hit.context.admission_year === 2026 && hit.source.url.includes("#/2026/4/124/083100")));
  });
  await check("hospital clinical department and medical technology evidence stay separate", async () => {
    for (const [department, type] of [["心血管内科", "clinical"], ["检验科", "medical_technology"]]) {
      const params = new URLSearchParams({ domain: "medicine", medical_department: department });
      const response = await fetch(`${origin}/api/knowledge?${params}`), data = await response.json();
      assert.equal(response.status, 200); assert.ok(data.hits.length > 0);
      assert.ok(data.hits.every((hit: { role_id: string; context: { medical_department: string; department_type: string } }) => hit.role_id === "medicine_guide" && hit.context.medical_department === department && hit.context.department_type === type));
    }
  });
  await check("explicit medicine direction returns hospital career sources", async () => {
    const params = new URLSearchParams({ direction_id: "medicine", medical_department: "心血管内科" });
    const response = await fetch(`${origin}/api/knowledge?${params}`), data = await response.json();
    assert.equal(response.status, 200); assert.equal(data.status, "available"); assert.ok(data.hits.length > 0);
    assert.ok(data.hits.every((hit: { role_id: string }) => hit.role_id === "medicine_guide"));
  });
  await check("incompatible medical domain and interdisciplinary direction is explicit", async () => {
    const response = await fetch(`${origin}/api/knowledge?direction_id=devices&domain=medicine`), data = await response.json();
    assert.equal(response.status, 200); assert.equal(data.status, "not_covered"); assert.deepEqual(data.hits, []); assert.equal(data.total, 0); assert.equal(data.has_more, false);
  });
  await check("unrelated query stays empty", async () => { const response = await fetch(`${origin}/api/knowledge?q=${encodeURIComponent("火星采矿")}`); assert.equal(response.status, 200); assert.deepEqual((await response.json()).hits, []); });
  for (const query of ["role_id=invented", "direction_id=invented", "category=salary", "limit=100", "include_historical=1", "limit=1&limit=2", "unexpected=x", "domain=invented", "offset=-1", "offset=10001", "admission_year=1999", `q=${"x".repeat(161)}`]) {
    await check(`invalid parameter rejected: ${query.slice(0, 40)}`, async () => { const response = await fetch(`${origin}/api/knowledge?${query}`); assert.equal(response.status, 400); });
  }
} catch { failure = checks.find(check => !check.passed)?.name ?? "Knowledge HTTP assertion failed"; }
const report = { at: new Date().toISOString(), origin, passed: !failure, checks, failure, source: "local_production_http_to_supabase_live" };
writeFileSync("docs/testing/knowledge-http.latest.json", JSON.stringify(report, null, 2) + "\n"); console.log(JSON.stringify(report, null, 2)); if (failure) process.exitCode = 1;
