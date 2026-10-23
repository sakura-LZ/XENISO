import { z } from "zod";
import { isHistorical, recordSchema, sourceSchema } from "../knowledge";
import { unknown, type Evidence } from "./contracts";
import { resolveSkill } from "./adapters";

const collectionSchema = z.object({ sources: z.array(sourceSchema), records: z.array(recordSchema) });
// A quote-verified source is an extraction candidate, never a numeric rubric approval.
export function extractionHandoff(raw: unknown, now = new Date()) {
  const bundle = collectionSchema.parse(raw);
  if (new Set(bundle.sources.map(s => s.id)).size !== bundle.sources.length || new Set(bundle.records.map(r => r.id)).size !== bundle.records.length) throw new Error("Duplicate knowledge identity");
  return {
    schema_version: "match-2", status: "review_required", generated_at: now.toISOString(),
    candidates: bundle.records.map(record => {
      const source = bundle.sources.find(s => s.id === record.source_id);
      if (!source) throw new Error(`Missing source: ${record.source_id}`);
      const historical = isHistorical(record, now);
      const facts = record.facts.map(fact => ({ field: fact.field, raw_value: fact.value,
        evidence: { ref: `kb:${record.id}:${fact.field}`, source_kind: "official", url: source.url, published_at: source.published_at, retrieved_at: record.collected_at,
          verification: historical ? "unverified" : "verified", locator: `sha256:${record.content_hash} [${fact.start},${fact.end}) ${fact.quote}` } satisfies Evidence,
      }));
      return { record_id: record.id, occupation_id: record.role_id, category: record.category, jurisdiction: source.jurisdiction,
        relation: record.relation, applicability: record.applicability, historical, published_at: source.published_at, publication_date_note: source.publication_date_note,
        verified_at: record.verified_at, valid_through: record.valid_through, facts,
        skill_candidates: [...new Set(record.tags.flatMap(tag => { const id = resolveSkill(tag); return id ? [id] : []; }))].map(skill_id => ({ skill_id, importance: unknown<number>(), required_level: unknown<number>() })),
        missing_fields: [...record.missing_fields, "numeric_rubric_review", ...(record.category === "admissions" ? ["structured_year_pathway_and_hard_rules_review"] : [])],
      };
    }),
  };
}
