import { isHistorical, knowledgeRoles, searchSchema, roleMatchesQuery, type KnowledgeHit, type KnowledgeRecord, type KnowledgeSource } from "./knowledge";
import type { Evidence } from "./ai";

// Deterministic lexical retrieval. Scores measure query overlap, never personal suitability.
export function rankKnowledge(records: KnowledgeRecord[], sources: KnowledgeSource[], input: unknown, now = new Date()): KnowledgeHit[] {
  const query = searchSchema.parse(input);
  const roleIds = knowledgeRoles.filter(role => roleMatchesQuery(role, query)).map(role => role.id);
  const tokens = [...new Set(query.q.toLowerCase().match(/[a-z0-9_+#.-]+|[\u3400-\u9fff]{1,}/g) ?? [])];
  return records.flatMap(record => {
    if (!roleIds.includes(record.role_id) || (query.category && record.category !== query.category)) return [];
    if (query.institution && record.context?.institution !== query.institution) return [];
    if (query.admission_year && record.context?.admission_year !== query.admission_year) return [];
    if (query.medical_topic && record.context?.medical_topic !== query.medical_topic) return [];
    if (query.medical_department && record.context?.medical_department !== query.medical_department) return [];
    const historical = isHistorical(record, now);
    if (historical && !query.include_historical) return [];
    const source = sources.find(source => source.id === record.source_id);
    if (!source) return [];
    if (query.jurisdiction !== "all" && source.jurisdiction !== query.jurisdiction) return [];
    const heading = `${record.title} ${record.tags.join(" ")} ${Object.values(record.context ?? {}).join(" ")}`.toLowerCase();
    const content = `${record.summary} ${record.facts.map(fact => fact.quote).join(" ")}`.toLowerCase();
    const score = tokens.reduce((sum, token) => sum + (heading.includes(token) ? 3 : content.includes(token) ? 1 : 0), 0);
    if (tokens.length && !score) return [];
    return [{ ...record, source, citation: `kb:${record.id}:${record.content_hash.slice(0, 12)}`, score, historical }];
  }).sort((a, b) => b.score - a.score || b.collected_at.localeCompare(a.collected_at) || a.id.localeCompare(b.id));
}
export function searchKnowledge(records: KnowledgeRecord[], sources: KnowledgeSource[], input: unknown, now = new Date()): KnowledgeHit[] {
  const query = searchSchema.parse(input);
  return rankKnowledge(records, sources, query, now).slice(query.offset, query.offset + query.limit);
}

export function knowledgeEvidence(hits: KnowledgeHit[]): Evidence[] {
  return hits.map(hit => ({
    ref: hit.citation, kind: hit.category === "admissions" ? "planning" : "direction",
    value: {
      title: hit.title, category: hit.category, role_id: hit.role_id, relation: hit.relation,
      applicability: hit.applicability, facts: hit.facts.slice(0, 6).map(fact => ({ field: fact.field, quote: fact.quote })),
      missing_fields: hit.missing_fields, source_url: hit.source.url, organization: hit.source.organization,
      published_at: hit.source.published_at, collected_at: hit.collected_at, verification: hit.verification,
      historical: hit.historical, mapping_basis: "LIMEN 编辑性职业关联，不能推导报考资格或个人能力",
      context: hit.context,
    },
  }));
}
