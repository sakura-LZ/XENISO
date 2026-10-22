import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../errors";
import { knowledgeRoles, recordSchema, searchSchema, sourceSchema, roleMatchesQuery, categories, type KnowledgeQuery } from "../knowledge";
import { knowledgeEvidence, rankKnowledge } from "../knowledge-search";

export async function retrieveKnowledge(client: SupabaseClient, input: KnowledgeQuery, now = new Date()) {
  const query = searchSchema.parse(input);
  const roles = knowledgeRoles.filter(role => roleMatchesQuery(role, query));
  if (!roles.length) return { status: "not_covered" as const, hits: [], total: 0, has_more: false, facets: { institutions: [], admission_years: [] }, coverage: { records: 0, sources: 0, by_category: {} }, query, retrieved_at: now.toISOString(), missing_categories: ["occupation", "recruitment", "admissions", "industry", "learning"] };
  const request = client.from("kb_records").select("*").in("role_id", roles.map(role => role.id)).order("id").limit(501);
  const recordsResult = await request;
  if (recordsResult.error || !recordsResult.data) throw new AppError("KNOWLEDGE_UNAVAILABLE", 503, "知识库暂时不可用，未使用本地样例替代真实资料。");
  if (recordsResult.data.length > 500) throw new AppError("KNOWLEDGE_CAPACITY", 503, "知识库检索规模已超出本阶段上限，需要升级数据库检索。");
  const records = recordSchema.array().safeParse(recordsResult.data);
  if (!records.success) throw new AppError("KNOWLEDGE_CONTRACT", 502, "知识库资料未通过数据校验。");
  const sourceIds = [...new Set(records.data.map(record => record.source_id))];
  const sourcesResult = sourceIds.length ? await client.from("kb_sources").select("*").in("id", sourceIds) : { data: [], error: null };
  const sources = sourceSchema.array().safeParse(sourcesResult.data);
  if (sourcesResult.error || !sources.success || sources.data.length !== sourceIds.length) throw new AppError("KNOWLEDGE_SOURCES", 502, "知识库来源读取失败。");
  const ranked = rankKnowledge(records.data, sources.data, query, now);
  const hits = ranked.slice(query.offset, query.offset + query.limit);
  const available = rankKnowledge(records.data, sources.data, { ...query, category: undefined, q: "", institution: undefined, admission_year: undefined }, now);
  return {
    status: records.data.length ? "available" as const : "empty" as const, hits, query, retrieved_at: now.toISOString(),
    total: ranked.length, has_more: query.offset + hits.length < ranked.length,
    facets: { institutions: [...new Set(available.flatMap(hit => hit.context?.institution ? [hit.context.institution] : []))].sort(), admission_years: [...new Set(available.flatMap(hit => hit.context?.admission_year ? [hit.context.admission_year] : []))].sort().reverse() },
    coverage: { records: available.length, sources: new Set(available.map(hit => hit.source_id)).size, by_category: Object.fromEntries(["occupation", "recruitment", "admissions", "industry", "learning"].map(category => [category, available.filter(hit => hit.category === category).length])) },
    missing_categories: ["occupation", "recruitment", "admissions", "industry", "learning"].filter(category => !available.some(hit => hit.category === category)),
  };
}

export async function reportKnowledge(client: SupabaseClient, directionIds: string[]) {
  try {
    const roles = knowledgeRoles.filter(role => role.direction_ids.some(id => directionIds.includes(id)) || (directionIds.includes("medicine") && role.direction_ids.length === 0));
    if (!roles.length) return { status: "not_covered" as const, evidence: [], citations: [], missing_categories: [] };
    const results = await Promise.all([...new Set(directionIds)].slice(0, 3).map(direction_id => retrieveKnowledge(client, searchSchema.parse({ direction_id, limit: 20 }))));
    // Fill categories that rank beyond page one, rather than silently dropping them.
    const tails = await Promise.all(results.flatMap(result => categories.filter(category => !result.missing_categories.includes(category) && !result.hits.some(hit => hit.category === category)).map(category => retrieveKnowledge(client, searchSchema.parse({ direction_id: result.query.direction_id, category, limit: 1 })))));
    // One quote per category per selected direction, capped at 15 records.
    const selected = [...new Map([...results, ...tails].flatMap(result => categories.flatMap(category => result.hits.filter(hit => hit.category === category).slice(0, 1))).map(hit => [hit.citation, hit])).values()];
    return { status: results.some(result => result.status === "available") ? "available" as const : "empty" as const, evidence: knowledgeEvidence(selected), citations: selected.map(hit => ({ ref: hit.citation, title: hit.title, url: hit.source.url, organization: hit.source.organization })), missing_categories: ["occupation", "recruitment", "admissions", "industry", "learning"].filter(category => results.every(result => result.missing_categories.includes(category))), retrieved_at: results[0]?.retrieved_at };
  } catch (error) {
    // Existing reports continue to work; the failure is saved explicitly, never represented as a successful search.
    return { status: "unavailable" as const, error_code: error instanceof AppError ? error.code : "KNOWLEDGE_NETWORK", evidence: [], citations: [], missing_categories: [] };
  }
}
