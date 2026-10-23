import type { KnowledgeRecord } from "../../src/lib/knowledge";
import { fieldRules } from "./field-rules";

// 少数字段（如 education）同时属于多个类目，只有一条事实时会打平。
// 打平时以条目自己申报的类目为准；申报类目不在并列首位才判为需复核。
export function classifyFacts(facts: Pick<KnowledgeRecord["facts"][number], "field">[], declared?: string) {
  const ranked = Object.entries(fieldRules).map(([category, fields]) => ({ category, score: facts.filter(fact => fields.includes(fact.field)).length })).sort((a, b) => b.score - a.score);
  if (ranked[0].score === 0) return null;
  if (ranked[0].score > ranked[1].score) return ranked[0].category;
  const tied = ranked.filter(entry => entry.score === ranked[0].score).map(entry => entry.category);
  return declared && tied.includes(declared) ? declared : null;
}
