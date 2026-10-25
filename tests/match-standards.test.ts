import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { matchOccupations } from "../src/lib/match/catalog.official";
import { officialStandards, rubricVersion, resetOfficialStandardsCache, OFFICIAL_STANDARDS_PATH } from "../src/lib/match/standards";
import { occupationSchema, skillStandard, skillLabels, unknown } from "../src/lib/match/contracts";

const crosswalk = JSON.parse(readFileSync(join(process.cwd(), "data", "match", "onet-crosswalk.json"), "utf8"));
const official = JSON.parse(readFileSync(OFFICIAL_STANDARDS_PATH, "utf8"));
const rubric = JSON.parse(readFileSync(join(process.cwd(), "data", "match", "skill-rubric.json"), "utf8"));

test("标准：10 个方向（9 特化 + 医学）的官方标准都通过 match-2 契约校验", () => {
  for (const occupation of official.occupations) {
    const result = occupationSchema.safeParse(occupation);
    assert.equal(result.success, true, `${occupation.id} 契约校验失败：${result.success ? "" : JSON.stringify(result.error.issues.slice(0, 3))}`);
  }
  assert.deepEqual(official.occupations.map((o: { id: string }) => o.id).sort(), ["clinical_data", "devices", "health_systems", "imaging_eng", "llm_agent", "med_nlp_kg", "medicine", "ml_cv", "signals", "software"]);
});

test("标准：每条官方数值都带可核对的 https 官方证据与原始量尺原文", () => {
  type FactLike = { status: string; value: unknown; evidence: { source_kind: string; url: string | null; verification: string; locator: string }[] };
  for (const occupation of official.occupations) {
    const facts: [string, FactLike][] = [["interests", occupation.interests]];
    for (const skill of occupation.skills as { skill_id: string; required_level: FactLike; importance: FactLike }[]) {
      facts.push([`skills.${skill.skill_id}.importance`, skill.importance], [`skills.${skill.skill_id}.required_level`, skill.required_level]);
    }
    for (const [field, fact] of facts) {
      assert.equal(fact.status, "known", `${occupation.id}.${field} 应为 known`);
      assert.ok(fact.evidence.length > 0, `${occupation.id}.${field} 缺证据`);
      for (const evidence of fact.evidence) {
        assert.equal(evidence.source_kind, "official", `${occupation.id}.${field} 的岗位标准不能用自评或编辑证据顶替`);
        assert.equal(evidence.verification, "verified");
        assert.match(String(evidence.url), /^https:\/\/www\.onetcenter\.org\//, `${occupation.id}.${field} 证据 URL 必须指向 O*NET 官方页面`);
        assert.match(evidence.locator, /O\*NET 31\.0/, `${occupation.id}.${field} locator 必须写明数据表与 SOC`);
      }
    }
  }
});

test("标准：兴趣与要求等级落在合法量尺内，投影规则写进了产物", () => {
  for (const occupation of official.occupations) {
    const interest = occupation.interests.value;
    assert.deepEqual(interest.scale, { min: 1, max: 7 });
    for (const [area, score] of Object.entries(interest.scores) as [string, number][]) {
      assert.ok(score >= 1 && score <= 7, `${occupation.id}.${area}=${score} 越出 O*NET OI 的 1.00–7.00`);
    }
    assert.equal(interest.ratings, undefined, "Career Interest Types 没有 N/SE/CI，不许编造 ratings");
    for (const skill of occupation.skills) {
      assert.ok(Number.isInteger(skill.importance.value) && skill.importance.value >= 1 && skill.importance.value <= 5, `${occupation.id}.${skill.skill_id} importance 必须是 1–5 整数`);
      assert.ok(Number.isInteger(skill.required_level.value) && skill.required_level.value >= 0 && skill.required_level.value <= 4, `${occupation.id}.${skill.skill_id} required_level 必须是 0–4 整数`);
      // rating 保留 O*NET 原始 0–7 量尺，必须落在该量尺内。
      if (skill.rating?.lower !== undefined) assert.ok(skill.rating.lower >= 0 && skill.rating.lower <= 7);
      if (skill.rating?.upper !== undefined) assert.ok(skill.rating.upper >= 0 && skill.rating.upper <= 7);
    }
  }
  assert.match(official.note, /投影/);
  assert.match(crosswalk.projection_rules.required_level, /编辑性线性投影/);
  assert.match(crosswalk.projection_rules.importance, /编辑性投影/);
});

test("标准：未映射技能不进岗位 skills[]，也不进准备度分母", () => {
  const unmappedByRole: Record<string, string[]> = {};
  for (const [role, audit] of Object.entries(crosswalk.audits as Record<string, { unmapped: string[] }>)) unmappedByRole[role] = audit.unmapped;
  // 10 个方向都尝试全部 9 个技能：machine_learning 与 data_management 在 O*NET 31.0 无对应元素，必为 unmapped。
  // 个别方向的额外 unmapped（如 med_nlp_kg 的 python）来自该特化候选 SOC 的 IM/LV 被 O*NET Recommend Suppress，
  // 必须如实落在 unmapped 里，不能补 0 或借用别的 SOC。
  for (const role of ["ml_cv", "software", "llm_agent", "devices", "signals", "imaging_eng", "clinical_data", "health_systems", "med_nlp_kg", "medicine"]) {
    assert.ok(unmappedByRole[role].includes("machine_learning"), `${role} 应把 machine_learning 标为 unmapped`);
    assert.ok(unmappedByRole[role].includes("data_management"), `${role} 应把 data_management 标为 unmapped`);
    assert.ok(unmappedByRole[role].length <= 3, `${role} 的 unmapped 不应超出「两个无元素 + 一个被抑制」`);
  }
  for (const occupation of matchOccupations) {
    for (const skill of unmappedByRole[occupation.id] ?? []) {
      assert.equal(occupation.skills.some(s => s.skill_id === skill), false, `${occupation.id} 不应把未映射的 ${skill} 放进 skills[]`);
    }
  }
  // 9 个技能在 crosswalk 里必须全覆盖：要么映射到元素，要么显式 unmapped。
  assert.deepEqual(Object.keys(crosswalk.skills).sort(), Object.keys(skillLabels).sort());
  for (const [skill, mapping] of Object.entries(crosswalk.skills as Record<string, { mapping_strength: string; onet_element: { id: string } | null; rationale: string }>)) {
    assert.ok(mapping.rationale.length > 10, `${skill} 缺少映射理由`);
    if (mapping.mapping_strength === "unmapped") assert.equal(mapping.onet_element, null);
    else assert.match(mapping.onet_element!.id, /^\d+\.[A-Z]\.\d+\.[a-z]+$/, `${skill} 的元素 ID 不是 O*NET 形式`);
  }
});

test("标准：catalog 读到官方文件时用官方数值，读不到时保持 unknown 而不是补零", () => {
  // 当前仓库里官方文件存在，因此 catalog 必须有官方数值。
  for (const occupation of matchOccupations) {
    assert.equal(occupation.interests.status, "known", `${occupation.id} 应读到官方兴趣标准`);
    assert.equal(occupation.standard_version, official.standard_version);
    assert.ok(occupation.skills.length > 0 && occupation.skills.every(s => s.required_level.status === "known"));
  }
  // 文件不存在 → 空表，catalog 语义回落到 unknown（不抛错、不补零）。
  const empty = officialStandards({ path: join(tmpdir(), "limen-does-not-exist-official.json") });
  assert.equal(empty.byOccupation.size, 0);
  assert.equal(empty.standardVersion, null);
});

test("标准：损坏的官方文件显式抛错，不静默降级成「没有标准」", () => {
  const dir = mkdtempSync(join(tmpdir(), "limen-standards-"));
  const bad = join(dir, "bad.json");
  writeFileSync(bad, "{ not json");
  assert.throws(() => officialStandards({ path: bad }), /不是合法 JSON/);
  const wrongShape = join(dir, "shape.json");
  writeFileSync(wrongShape, JSON.stringify({ occupations: [{ schema_version: "match-2", id: "x" }] }));
  assert.throws(() => officialStandards({ path: wrongShape }), /不符合 match-2 契约/);
  const duplicate = join(dir, "dup.json");
  writeFileSync(duplicate, JSON.stringify({ occupations: [official.occupations[0], official.occupations[0]] }));
  assert.throws(() => officialStandards({ path: duplicate }), /重复岗位/);
});

test("标准：技能量尺版本与产物一致（版本漂移守卫）", () => {
  assert.equal(skillStandard.version, "limen-skills-2");
  assert.equal(rubric.version, skillStandard.version);
  assert.equal(rubricVersion(), skillStandard.version);
  assert.equal(rubricVersion({ path: join(tmpdir(), "limen-no-rubric.json") }), null);
  // 9 个技能 × 5 个等级齐全；官方锚点级别必须写出处，其余级别必须标明是编辑性描述。
  assert.deepEqual(Object.keys(rubric.skills).sort(), Object.keys(skillLabels).sort());
  for (const [skill, entry] of Object.entries(rubric.skills as Record<string, { levels: { level: number; observable: string; onet_anchor: unknown }[] }>)) {
    assert.deepEqual(entry.levels.map(l => l.level), [0, 1, 2, 3, 4], `${skill} 等级不连续`);
    for (const level of entry.levels) {
      assert.ok(level.observable.length > 5);
      if (level.onet_anchor === null) assert.match(level.observable, /编辑性描述/, `${skill} 第 ${level.level} 级没有官方锚点时必须标注编辑性`);
    }
  }
});

test("标准：must_have 只按「该岗位已映射技能里重要性最高者」设定，且是编辑性规则", () => {
  assert.match(crosswalk.projection_rules.must_have, /编辑性规则/);
  for (const occupation of official.occupations) {
    const mustHave = occupation.skills.filter((s: { must_have?: boolean }) => s.must_have === true);
    assert.ok(mustHave.length <= 1, `${occupation.id} 不应有多个关键项`);
    if (!mustHave.length) continue;
    const maxImportance = Math.max(...occupation.skills.map((s: { importance: { value: number } }) => s.importance.value));
    assert.equal(mustHave[0].importance.value, maxImportance, `${occupation.id} 的关键项必须是重要性最高者`);
  }
  // 合成演示岗位不得沿用官方标准版本号（否则报告会把演示数据说成官方标准）。
  const catalog = matchOccupations.find(o => o.id === "ml_cv")!;
  assert.equal(catalog.simulation, false);
  assert.equal(unknown<number>().status, "unknown");
});

test("标准：官方标准不会把中国报考资格或雇主偏好写成事实", () => {
  for (const occupation of official.occupations) {
    assert.equal(occupation.hard_requirements.status, "unknown");
    assert.equal(occupation.preferences.status, "unknown");
    assert.equal(occupation.professional_background.status, "unknown");
    assert.match(occupation.mapping_basis, /不是 O\*NET 官方中国考研专业结论/);
  }
});

test("标准：重复加载结果一致（确定性）", () => {
  resetOfficialStandardsCache();
  const first = officialStandards();
  resetOfficialStandardsCache();
  const second = officialStandards();
  assert.equal(JSON.stringify([...first.byOccupation.entries()]), JSON.stringify([...second.byOccupation.entries()]));
  assert.equal(first.standardVersion, second.standardVersion);
});
