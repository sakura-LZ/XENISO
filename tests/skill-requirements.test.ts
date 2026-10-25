import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { directions } from "../src/lib/directions";
import { skillRequirementDataset, skillRequirements } from "../src/lib/skill-requirements";
import { aliasMatches } from "../src/lib/skill-match";

const knowledgeDir = resolve(import.meta.dirname, "../data/knowledge");

function collectRecords() {
  const facts = new Map<string, { field: string; value: string }[]>();
  for (const name of readdirSync(knowledgeDir).filter((file) => file.endsWith(".collected.json"))) {
    const bundle = JSON.parse(readFileSync(resolve(knowledgeDir, name), "utf8")) as { records?: { id: string; facts: { field: string; value: string }[] }[] };
    for (const record of bundle.records ?? []) {
      const list = facts.get(record.id) ?? [];
      list.push(...record.facts);
      facts.set(record.id, list);
    }
  }
  return facts;
}

test("skill requirements: every direction in the catalog is covered once, 4–7 skills each", () => {
  assert.deepEqual(skillRequirements.map((direction) => direction.direction_id).sort(), directions.map((direction) => direction.id).sort());
  for (const direction of skillRequirements) {
    assert.ok(direction.skills.length >= 4 && direction.skills.length <= 7, direction.direction_id);
    assert.ok(direction.occupation_label.length > 3, direction.direction_id);
    assert.ok(direction.coverage_note.length > 3, direction.direction_id);
    assert.equal(direction.direction_name, directions.find((item) => item.id === direction.direction_id)?.name);
    const ids = direction.skills.map((skill) => skill.id);
    assert.equal(new Set(ids).size, ids.length, `${direction.direction_id} skill id 重复`);
    for (const skill of direction.skills) {
      assert.ok(skill.aliases.length > 0, `${direction.direction_id}/${skill.id}`);
      assert.ok(skill.evidence.length >= 1 && skill.evidence.length <= 3);
      for (const evidence of skill.evidence) {
        assert.ok(evidence.quote.length >= 8);
        assert.ok(evidence.quote.includes(evidence.needle), `${evidence.record_id} quote 不含 needle`);
        assert.equal(evidence.quote_end - evidence.quote_start, evidence.quote.length);
        assert.ok(evidence.source_url === null || /^https?:\/\//.test(evidence.source_url));
      }
    }
  }
  assert.equal(skillRequirementDataset.source.extraction, "verbatim_quote_verified");
  assert.ok(skillRequirementDataset.limitations.length >= 1);
});

test("skill requirements: every generated quote is a verbatim substring of the knowledge base record", () => {
  const facts = collectRecords();
  for (const direction of skillRequirements) {
    for (const skill of direction.skills) {
      for (const evidence of skill.evidence) {
        const candidates = facts.get(evidence.record_id);
        assert.ok(candidates?.length, `缺少 record ${evidence.record_id}`);
        const fact = candidates.find((item) => item.field === evidence.field && item.value.slice(evidence.quote_start, evidence.quote_end) === evidence.quote);
        assert.ok(fact, `${evidence.record_id}.${evidence.field} 的 quote 偏移无法回查`);
        assert.equal(fact.value.slice(evidence.quote_start, evidence.quote_end), evidence.quote);
      }
    }
  }
});

test("skill requirements: no score, rating or percentage fields leak into the matching dimension", () => {
  for (const direction of skillRequirements) {
    for (const skill of direction.skills) {
      const keys = Object.keys(skill);
      for (const forbidden of ["score", "rating", "percentage", "weight", "rank", "fit"]) assert.ok(!keys.includes(forbidden), `${direction.direction_id}/${skill.id} 含 ${forbidden}`);
    }
  }
});

test("skill matching: short latin aliases must match whole tokens, Chinese aliases match by substring", () => {
  assert.equal(aliasMatches("project management", "ct"), false);
  assert.equal(aliasMatches("做了头颅 CT 检查", "ct"), true);
  assert.equal(aliasMatches("this is history", "his"), false);
  assert.equal(aliasMatches("熟悉 HIS 系统", "his"), true);
  assert.equal(aliasMatches("Python 编程", "python"), true);
  assert.equal(aliasMatches("医学影像学", "影像"), true);
  assert.equal(aliasMatches("R语言分析", "r语言"), true);
  assert.equal(aliasMatches("C++/CUDA优化", "c++"), true);
});
