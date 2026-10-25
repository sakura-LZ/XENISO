// 属性测试：约束 v2 引擎的数学性质，而不是某个具体数字。
// 这些性质来自 docs/MATCH_V2_PLAN.md §5.1：单调性、尺度不变、无关字段不变、未知不等于零、非补偿封顶。
import test from "node:test";
import assert from "node:assert/strict";
import { match, MUST_HAVE_CAP, SELF_REPORT_RELIABILITY } from "../src/lib/match/engine";
import { known, unknown, type Evidence, type MatchInput, type Occupation } from "../src/lib/match/contracts";
import { adaptProfile } from "../src/lib/match/adapters";
import { emptyProfile } from "../src/lib/profile";

const now = new Date("2026-10-21T12:00:00Z");
const ev: Evidence = { ref: "property-test-fixture", source_kind: "simulation", verification: "simulation", url: null, published_at: null, retrieved_at: now.toISOString(), locator: "simulation: property fixtures" };
const vec = (scores: number[]) => ({
  instrument: "test-only", version: "1", scale: { min: 0, max: 10 } as { min: number; max: number } | null,
  scores: { realistic: scores[0], investigative: scores[1], artistic: scores[2], social: scores[3], enterprising: scores[4], conventional: scores[5] },
});
const USER = [4, 8, 2, 6, 1, 3];

function occupation(id: string, scores: number[], skills: Occupation["skills"]): Occupation {
  return {
    schema_version: "match-2", id, title: `simulation ${id}`, simulation: true,
    direction_ids: [], onet_codes: [], mapping_basis: "property fixture",
    tasks: known(["property task"], ev), interests: known(vec(scores), ev), skills,
    professional_background: unknown(), hard_requirements: known([], ev), preferences: known(["研究"], ev),
  };
}

// role_a 与用户轮廓完全同形（r=1），role_b 负相关，role_c 中等：三者都数据完整、可排序。
function fixture(): MatchInput {
  const user = adaptProfile(emptyProfile, null, null, now.toISOString());
  user.simulation = true;
  user.interests = known(vec(USER), ev);
  user.skills = [
    { skill_id: "python", level: known(2, ev) },
    { skill_id: "statistics", level: known(3, ev) },
  ];
  user.preferences = known(["研究"], ev);
  user.study_intent = known("统考", ev); user.target_year = 2028;
  user.qualifications.major = known("临床医学", ev);
  return {
    user,
    occupations: [
      occupation("role_a", [3, 7, 1, 5, 0, 2], [
        { skill_id: "python", importance: known(4, ev), required_level: known(3, ev), must_have: true },
        { skill_id: "statistics", importance: known(3, ev), required_level: known(3, ev) },
      ]),
      occupation("role_b", [1, 2, 3, 4, 5, 6], [
        { skill_id: "python", importance: known(2, ev), required_level: known(2, ev) },
        { skill_id: "statistics", importance: known(2, ev), required_level: known(4, ev) },
      ]),
      occupation("role_c", [6, 5, 4, 3, 2, 1], [
        { skill_id: "python", importance: known(3, ev), required_level: known(1, ev) },
        { skill_id: "statistics", importance: known(3, ev), required_level: known(2, ev) },
      ]),
    ],
    admissions: [],
  };
}
const role = (input: MatchInput, id: string) => match(input, now).results.find(r => r.occupation_id === id)!;

test("Property: raising any skill level never lowers readiness or the ordering utility", () => {
  for (const id of ["role_a", "role_b", "role_c"]) {
    for (const skill of ["python", "statistics"] as const) {
      const scores: number[] = [];
      for (const level of [0, 1, 2, 3, 4]) {
        const input = fixture();
        input.user.skills = [...input.user.skills.filter(s => s.skill_id !== skill), { skill_id: skill, level: known(level, ev) }];
        const r = role(input, id);
        assert.equal(r.readiness.status, "complete");
        scores.push(r.readiness.score!);
      }
      for (let i = 1; i < scores.length; i++) {
        assert.ok(scores[i] >= scores[i - 1], `${id}/${skill}: 提高等级后准备度不应下降（${scores[i - 1]} → ${scores[i]}）`);
      }
    }
  }
});

test("Property: excess preparation is not rewarded (min(current/target,1))", () => {
  const atTarget = fixture();
  atTarget.user.skills = [{ skill_id: "python", level: known(3, ev) }, { skill_id: "statistics", level: known(3, ev) }];
  const above = fixture();
  above.user.skills = [{ skill_id: "python", level: known(4, ev) }, { skill_id: "statistics", level: known(3, ev) }];
  assert.equal(role(above, "role_a").readiness.score, role(atTarget, "role_a").readiness.score);
});

test("Property: self-reported levels are attenuated, verified ones are not", () => {
  const selfEv: Evidence = { ...ev, source_kind: "self_report", verification: "self_reported", locator: "no artifact" };
  const reported = fixture();
  reported.user.skills = [{ skill_id: "python", level: { ...known(3, selfEv), reliability: SELF_REPORT_RELIABILITY } }, { skill_id: "statistics", level: known(3, ev) }];
  const verified = fixture();
  verified.user.skills = [{ skill_id: "python", level: known(3, ev) }, { skill_id: "statistics", level: known(3, ev) }];
  const reportedScore = role(reported, "role_a").readiness.score!;
  const verifiedScore = role(verified, "role_a").readiness.score!;
  assert.ok(reportedScore < verifiedScore, `自评应低于同等核验等级：${reportedScore} vs ${verifiedScore}`);
  // 衰减后 3 → 2 + .8×1 = 2.8，低于要求 3 → 关键项不足 → 封顶。
  assert.equal(reportedScore, MUST_HAVE_CAP);
});

test("Property: a known must_have gap caps readiness and cannot be averaged away", () => {
  const input = fixture();
  // 其余技能超配会让原始加权分接近 81；关键项差一级时必须被封顶到 59，而不是被平均掉。
  input.user.skills = [{ skill_id: "python", level: known(2, ev) }, { skill_id: "statistics", level: known(4, ev) }];
  const capped = role(input, "role_a");
  assert.equal(capped.readiness.score, MUST_HAVE_CAP);
  assert.match(String(capped.readiness.detail?.must_have_gap), /Python|python/);
  // 封顶是上界：原始加权分低于 59 时保留原始分，而不是抬到 59。
  input.user.skills = [{ skill_id: "python", level: known(0, ev) }, { skill_id: "statistics", level: known(4, ev) }];
  assert.ok(role(input, "role_a").readiness.score! < MUST_HAVE_CAP);
  // 补齐关键项后允许超过封顶。
  input.user.skills = [{ skill_id: "python", level: known(4, ev) }, { skill_id: "statistics", level: known(4, ev) }];
  assert.ok(role(input, "role_a").readiness.score! > MUST_HAVE_CAP);
});

test("Property: interest similarity is invariant to scale and offset of either side", () => {
  const reference = role(fixture(), "role_a").interest;
  assert.equal(reference.score, 100);
  // 线性变换会越出原量尺，因此换算后量尺声明为 null：相关本来就不需要量尺，这也是契约允许的。
  for (const [k, b] of [[10, 0], [0.3, 0], [1, 25], [2.5, -7]] as const) {
    for (const side of ["user", "occupation"] as const) {
      const input = fixture();
      const transform = (values: number[]) => values.map(v => v * k + b);
      if (side === "user") input.user.interests = known({ ...vec(transform(USER)), scale: null }, ev);
      else input.occupations[0].interests = known({ ...vec(transform([3, 7, 1, 5, 0, 2])), scale: null }, ev);
      const changed = role(input, "role_a").interest;
      assert.equal(changed.score, reference.score, `${side} k=${k} b=${b} 不应改变轮廓相似度`);
      assert.equal(changed.detail?.correlation, reference.detail?.correlation);
    }
  }
});

test("Property: flat profiles are unknown rather than a meaningless 50", () => {
  const input = fixture();
  input.occupations[0].interests = known(vec([5, 5, 5, 5, 5, 5]), ev);
  const flat = role(input, "role_a").interest;
  assert.equal(flat.score, null);
  assert.equal(flat.status, "unknown");
  assert.ok(flat.missing.length > 0);
});

test("Property: unknown values never enter the denominator and never count as zero", () => {
  const reference = role(fixture(), "role_a");
  const input = fixture();
  // 新增一个未观测技能：分数不变、覆盖率下降，且明确记为缺失。
  input.occupations[0].skills = [...input.occupations[0].skills, { skill_id: "machine_learning", importance: known(1, ev), required_level: known(4, ev) }];
  const extended = role(input, "role_a");
  assert.equal(extended.readiness.score, reference.readiness.score);
  assert.ok(extended.readiness.coverage < reference.readiness.coverage);
  assert.ok(extended.readiness.missing.length > 0);
  // 岗位要求未知时该技能也不进分母。
  const unknownTarget = fixture();
  unknownTarget.occupations[0].skills = [...unknownTarget.occupations[0].skills, { skill_id: "machine_learning", importance: known(1, ev), required_level: unknown() }];
  assert.equal(role(unknownTarget, "role_a").readiness.score, reference.readiness.score);
});

test("Property: renaming unrelated fields never changes scores or ordering", () => {
  const before = match(fixture(), now);
  const input = fixture();
  input.occupations.forEach((o, i) => { o.title = `改名后的岗位 ${i}`; o.tasks = known([`改名后的任务 ${i}`], ev); o.mapping_basis = "renamed"; });
  const after = match(input, now);
  assert.deepEqual(after.results.map(r => r.occupation_id), before.results.map(r => r.occupation_id));
  assert.deepEqual(after.results.map(r => r.rank), before.results.map(r => r.rank));
  assert.deepEqual(after.results.map(r => r.interest.score), before.results.map(r => r.interest.score));
  assert.deepEqual(after.results.map(r => r.readiness.score), before.results.map(r => r.readiness.score));
});

test("Property: matching is deterministic and never mutates its input", () => {
  const input = fixture();
  const snapshot = structuredClone(input);
  const first = match(input, now);
  const second = match(input, now);
  assert.deepEqual(input, snapshot);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test("Property: evidence tier tracks completeness, not score magnitude", () => {
  const complete = match(fixture(), now);
  assert.deepEqual(complete.results.map(r => r.evidence_tier), ["A", "A", "A"]);
  const partial = fixture();
  partial.user.skills = [{ skill_id: "python", level: known(2, ev) }];
  // 少一个用户技能 → 准备度仍有分数但覆盖不全 → 至少是 C，不因分数高就升到 A。
  const partialResults = match(partial, now).results;
  assert.ok(partialResults.every(r => r.evidence_tier === "C" || r.evidence_tier === "D"));
  const missing = fixture();
  missing.occupations.forEach(o => { o.interests = unknown(); });
  assert.deepEqual(match(missing, now).results.map(r => r.evidence_tier), ["D", "D", "D"]);
});
