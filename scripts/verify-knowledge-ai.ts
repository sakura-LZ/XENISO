import { loadEnvFile } from "node:process";
import { existsSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { reportKnowledge } from "../src/lib/server/knowledge-store";
import { requestAiExplanation } from "../src/lib/ai";
import { AppError } from "../src/lib/errors";

if (existsSync(".env.local")) loadEnvFile(".env.local");
const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000), redirect: "error" }) } });
const checks: { name: string; passed: boolean }[] = [];
const outputs: unknown[] = [];
let failure: string | null = null, cleanupFailures = 0, identityCreated = false;
function expect(name: string, value: unknown) { checks.push({ name, passed: Boolean(value) }); if (!value) throw new Error(name); }
try {
  expect("real_ai_configuration_enabled", process.env.LIMEN_ENABLE_LLM === "true");
  const signed = await client.auth.signInAnonymously({ options: { data: { simulation: true, probe: "knowledge-ai-integration" } } });
  identityCreated = Boolean(signed.data.user);
  expect("synthetic_identity_created", !signed.error && signed.data.user?.is_anonymous);
  for (const kind of ["R1", "R2"] as const) {
    const context = await reportKnowledge(client, kind === "R1" ? ["health_systems", "devices"] : ["llm_agent", "medicine"]);
    expect(`${kind}_live_knowledge_available`, context.status === "available" && context.evidence.length >= 5 && context.evidence.length <= 15);
    expect(`${kind}_multiple_direction_sources_retained`, context.evidence.some(entry => (entry.value as { role_id: string }).role_id === (kind === "R1" ? "guide_devices" : "medicine_guide")));
    const ai = await requestAiExplanation({ baseUrl: process.env.LLM_BASE_URL!, key: process.env.LLM_API_KEY!, model: process.env.LLM_MODEL! }, context.evidence);
    expect(`${kind}_real_model_cites_knowledge`, ai.source === "llm_live" && ai.explanation.explanations.some(item => item.evidence_refs.some(ref => ref.startsWith("kb:"))));
    const payload = { simulation: true, scope: "knowledge-to-model integration excerpt; not a complete user R1/R2", source: ai.source, evidence: context.evidence, knowledge_context: context, ai };
    const stored = await client.from("reports").upsert({ id: signed.data.user!.id, kind, payload, updated_at: ai.generated_at }, { onConflict: "id,kind" });
    expect(`${kind}_real_model_excerpt_saved_privately`, !stored.error);
    const restored = await client.from("reports").select("payload").eq("id", signed.data.user!.id).eq("kind", kind).single();
    expect(`${kind}_real_model_citations_restored`, !restored.error && isDeepStrictEqual(restored.data.payload, payload));
    outputs.push({ kind, source: ai.source, generated_at: ai.generated_at, explanation: ai.explanation, citations: context.citations });
  }
} catch (error) { failure = error instanceof AppError ? error.code : checks.find(check => !check.passed)?.name ?? "Knowledge AI verification failed; raw errors suppressed"; }
finally { if (identityCreated) { try { if ((await client.rpc("delete_own_account")).error) cleanupFailures++; } catch { cleanupFailures++; } } }
const report = { at: new Date().toISOString(), passed: !failure && cleanupFailures === 0, checks, outputs, failure, cleanupFailures, limitations: ["Only public source evidence sent to real configured LLM", "Synthetic private identity removed after test", "Exercises both report knowledge adapters and real AI citation persistence; not the complete profile/O*NET/experience HTTP flow", "Reference validity is checked automatically; semantic support still needs review"] };
writeFileSync("docs/testing/knowledge-ai.latest.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
