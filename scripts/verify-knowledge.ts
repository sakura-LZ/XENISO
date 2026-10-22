import { loadEnvFile } from "node:process";
import { existsSync, writeFileSync, readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { retrieveKnowledge, reportKnowledge } from "../src/lib/server/knowledge-store";
import { categories, knowledgeRoles, recordSchema, searchSchema, sourceSchema, verifyQuotes } from "../src/lib/knowledge";
import { knowledgeEvidence, rankKnowledge, searchKnowledge } from "../src/lib/knowledge-search";
import { validateAiExplanation } from "../src/lib/ai";

if (existsSync(".env.local")) loadEnvFile(".env.local");
const checks: { name: string; passed: boolean }[] = [];
function expect(name: string, value: unknown) { checks.push({ name, passed: Boolean(value) }); if (!value) throw new Error(name); }
function fresh() { return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000), redirect: "error" }) } }); }
let userClient: SupabaseClient | null = null, failure: string | null = null, cleanupFailures = 0;
let counts: unknown = null, benchmark: unknown = null;
const run = `simulation-kb-${randomUUID()}`;
type Snapshot = { content_hash: string; raw_hash: string; raw_base64: string; text_body: string };
const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
try {
  const client = fresh();
  const result = await retrieveKnowledge(client, searchSchema.parse({ role_id: "medical_ai_pm", limit: 20 }));
  expect("anonymous_reads_real_supabase_knowledge", result.status === "available" && result.hits.length > 0);
  expect("default_results_are_chinese_primary_sources", result.hits.every(hit => hit.source.jurisdiction === "CN" && hit.source.source_tier === "primary"));
  expect("all_five_categories_have_chinese_evidence", result.missing_categories.length === 0);
  const rawRecords = await client.from("kb_records").select("*").order("id");
  const rawSources = await client.from("kb_sources").select("*").order("id");
  expect("public_records_and_sources_read_without_error", !rawRecords.error && !rawSources.error);
  const records = recordSchema.array().parse(rawRecords.data), sources = sourceSchema.array().parse(rawSources.data);
  const bundles = ["pilot", "expansion"].map(name => JSON.parse(readFileSync(`work/knowledge-${name}/bundle.json`, "utf8")) as { records: { id: string; content_hash: string }[]; snapshots: Snapshot[] });
  const imported = bundles.flatMap(bundle => bundle.records), snapshots = bundles.flatMap(bundle => bundle.snapshots);
  expect("persistent_records_match_both_imported_corpora_and_versions", imported.every(record => records.some(stored => stored.id === record.id && stored.content_hash === record.content_hash)) && records.every(record => imported.some(local => local.id === record.id && local.content_hash === record.content_hash)));
  expect("local_source_snapshots_match_raw_and_text_sha256", snapshots.every(snapshot => sha256(Buffer.from(snapshot.raw_base64, "base64")) === snapshot.raw_hash && sha256(snapshot.text_body) === snapshot.content_hash));
  expect("every_imported_quote_matches_collected_snapshot", records.every(record => {
    const snapshot = snapshots.find(snapshot => snapshot.content_hash === record.content_hash);
    return snapshot && verifyQuotes(record, snapshot.text_body);
  }));
  expect("no_duplicate_sources_or_record_categories", new Set(sources.map(source => source.url)).size === sources.length && new Set(records.map(record => `${record.source_id}:${record.role_id}:${record.category}`)).size === records.length);
  expect("raw_snapshots_not_publicly_readable", (await client.from("kb_snapshots").select("content_hash")).error?.code === "42501");
  expect("anonymous_insert_denied", Boolean((await client.from("kb_records").insert({ ...records[0], id: run })).error));
  expect("anonymous_update_denied", Boolean((await client.from("kb_sources").update({ title: "simulation tamper" }).eq("id", sources[0].id)).error));
  const rows = JSON.parse(readFileSync("data/knowledge/retrieval-eval.json", "utf8")) as { name: string; query: Record<string, unknown>; relevant_ids: string[]; expect_empty?: boolean }[];
  const evaluations = rows.map(row => {
    const hits = searchKnowledge(records, sources, row.query);
    const relevant = hits.filter(hit => row.relevant_ids.includes(hit.id));
    return { name: row.name, hit_ids: hits.map(hit => hit.id), relevant_ids: row.relevant_ids, passed: row.expect_empty ? hits.length === 0 : relevant.length > 0, recall_at_k: row.relevant_ids.length ? relevant.length / row.relevant_ids.length : null, precision_at_k: hits.length ? relevant.length / hits.length : null };
  });
  benchmark = { curated_cases: rows.length, cases: evaluations, note: "人工指定少量相关资料的检索回归，不是广泛语义检索准确率或职业匹配准确率" };
  expect("curated_retrieval_benchmark", evaluations.every(row => row.passed));
  const guideDirections = knowledgeRoles.filter(role => role.id.startsWith("guide_")).flatMap(role => role.direction_ids);
  expect("all_nine_editorial_directions_have_live_coverage", guideDirections.length === 9 && (await Promise.all(guideDirections.map(async direction_id => {
    const result = await retrieveKnowledge(client, searchSchema.parse({ direction_id, limit: 20 }));
    return result.status === "available" && ["occupation", "admissions", "industry", "learning"].every(category => (result.coverage.by_category as Record<string, number>)[category] > 0);
  }))).every(Boolean));
  const firstPage = await retrieveKnowledge(client, searchSchema.parse({ domain: "interdisciplinary", limit: 20 }));
  const allRanked = rankKnowledge(records, sources, { domain: "interdisciplinary" });
  expect("coverage_and_total_are_not_capped_at_first_twenty", firstPage.hits.length === 20 && firstPage.total === allRanked.length && firstPage.total > 20 && firstPage.has_more && firstPage.coverage.records === allRanked.length && categories.every(category => (firstPage.coverage.by_category as Record<string, number>)[category] === allRanked.filter(hit => hit.category === category).length));
  const pages = (await Promise.all(Array.from({ length: Math.ceil(firstPage.total / 20) }, (_, page) => retrieveKnowledge(client, searchSchema.parse({ domain: "interdisciplinary", limit: 20, offset: page * 20 }))))).flatMap(page => page.hits);
  expect("live_pagination_has_no_lost_or_duplicate_records", isDeepStrictEqual(pages.map(hit => hit.id), allRanked.map(hit => hit.id)) && new Set(pages.map(hit => hit.id)).size === pages.length);
  const medicine = await retrieveKnowledge(client, searchSchema.parse({ domain: "medicine", medical_department: "心血管内科" }));
  expect("medical_department_sources_isolated_from_nine_directions", medicine.hits.length > 0 && medicine.hits.every(hit => hit.role_id === "medicine_guide" && hit.context?.medical_department === "心血管内科" && hit.context?.department_type === "clinical") && firstPage.hits.every(hit => hit.role_id !== "medicine_guide"));
  const medicineDirection = await retrieveKnowledge(client, searchSchema.parse({ direction_id: "medicine", medical_department: "心血管内科" }));
  const medicineReport = await reportKnowledge(client, ["medicine"]);
  expect("explicit_medicine_direction_and_report_read_official_sources", medicineDirection.hits.length > 0 && medicineDirection.hits.every(hit => hit.role_id === "medicine_guide") && medicineReport.status === "available" && medicineReport.evidence.length > 0 && medicineReport.evidence.every(entry => (entry.value as { role_id: string }).role_id === "medicine_guide"));
  const school = await retrieveKnowledge(client, searchSchema.parse({ institution: "上海交通大学", admission_year: 2027, category: "admissions", limit: 20 }));
  expect("school_year_filters_retain_verified_program_context", school.hits.length >= 9 && school.hits.every(hit => hit.context?.institution === "上海交通大学" && hit.context.admission_year === 2027) && school.hits.some(hit => hit.context?.college && hit.context?.program));
  const historicalQuery = { direction_id: "devices", institution: "深圳大学", admission_year: 2026, category: "admissions", limit: 20 };
  const historical = await retrieveKnowledge(client, searchSchema.parse({ ...historicalQuery, include_historical: true }));
  expect("historical_year_and_hash_program_link_preserved", (await retrieveKnowledge(client, searchSchema.parse(historicalQuery))).hits.length === 0 && historical.hits.length > 0 && historical.hits.every(hit => hit.historical && hit.context?.admission_year === 2026 && hit.source.url.includes("#/2026/4/124/083100")));
  expect("incompatible_domain_direction_is_explicitly_uncovered", (await retrieveKnowledge(client, searchSchema.parse({ direction_id: "devices", domain: "medicine" }))).status === "not_covered");
  for (const kind of ["R1", "R2"] as const) {
    const context = await reportKnowledge(client, kind === "R1" ? ["health_systems", "devices"] : ["llm_agent"]);
    expect(`${kind}_consumes_live_chinese_source_context`, context.status === "available" && context.citations.length > 0 && context.evidence.every(entry => (entry.value as { source_url?: string }).source_url));
    if (kind === "R1") expect("R1_multi_direction_context_contains_each_selected_direction", ["guide_health_systems", "guide_devices"].every(role => context.evidence.some(entry => (entry.value as { role_id: string }).role_id === role)));
    const evidence = knowledgeEvidence(result.hits.slice(0, 1));
    expect(`${kind}_source_evidence_passes_existing_report_contract`, Boolean(validateAiExplanation({ explanations: [{ kind: evidence[0].kind, evidence_refs: [evidence[0].ref], text: "simulation：资料提供职业任务线索；个人报考资格仍须核对。" }], unknowns: ["simulation：未核定个人报考资格"] }, evidence)));
  }
  userClient = fresh();
  const signed = await userClient.auth.signInAnonymously({ options: { data: { simulation: true, knowledge_probe: run } } });
  expect("synthetic_identity_created", !signed.error && signed.data.user?.is_anonymous);
  expect("authenticated_knowledge_insert_denied", Boolean((await userClient.from("kb_records").insert({ ...records[0], id: run })).error));
  expect("authenticated_verified_knowledge_read_allowed", (await retrieveKnowledge(userClient, searchSchema.parse({ domain: "medicine", medical_department: "检验科" }))).hits.length > 0);
  expect("authenticated_snapshot_read_denied", Boolean((await userClient.from("kb_snapshots").select("content_hash")).error));
  expect("authenticated_delete_denied", Boolean((await userClient.from("kb_records").delete().eq("id", records[0].id)).error));
  const context = await reportKnowledge(userClient, ["health_systems"]);
  const stored = await userClient.from("reports").upsert({ id: signed.data.user!.id, kind: "R1", payload: { simulation: true, source: "knowledge_integration_probe", evidence: context.evidence, knowledge_context: context }, updated_at: new Date().toISOString() }, { onConflict: "id,kind" });
  expect("synthetic_private_report_stores_real_citation_snapshot", !stored.error);
  const read = await userClient.from("reports").select("payload").eq("id", signed.data.user!.id).eq("kind", "R1").single();
  expect("saved_citations_restore_without_retrieval_substitution", !read.error && isDeepStrictEqual(read.data.payload.evidence, context.evidence));
  counts = { sources: sources.length, records: records.length, cn_sources: sources.filter(source => source.jurisdiction === "CN").length, cn_records: records.filter(record => sources.find(source => source.id === record.source_id)?.jurisdiction === "CN").length, chinese_by_category: Object.fromEntries(["occupation", "recruitment", "admissions", "industry", "learning"].map(category => [category, records.filter(record => record.category === category && sources.find(source => source.id === record.source_id)?.jurisdiction === "CN").length])) };
} catch { failure = checks.find(check => !check.passed)?.name ?? "Live knowledge verification failed; raw output suppressed"; }
finally {
  if (userClient) { try { if ((await userClient.rpc("delete_own_account")).error) cleanupFailures++; } catch { cleanupFailures++; } }
}
const report = { at: new Date().toISOString(), source: "supabase_live", simulation_identity: true, passed: !failure && cleanupFailures === 0, checks, counts, benchmark, failure, cleanupFailures, limitations: ["No real user data accessed", "No real LLM report generation or digital-human changes in this test", "quote_verified is source substring verification, not completeness or personal eligibility confirmation"] };
writeFileSync("docs/testing/knowledge-live.latest.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
