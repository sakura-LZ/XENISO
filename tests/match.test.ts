import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { match } from "../src/lib/match/engine";
import { known, unknown, matchInputSchema, type Evidence, type MatchInput, type Admission } from "../src/lib/match/contracts";
import { adaptProfile, resolveSkill } from "../src/lib/match/adapters";
import { extractionHandoff } from "../src/lib/match/knowledge-adapter";
import { emptyProfile } from "../src/lib/profile";
import { simulationInput } from "../src/lib/match/simulation";
import { matchOccupations } from "../src/lib/match/catalog.official";

const now = new Date("2026-10-21T12:00:00Z");
const ev: Evidence = { ref: "independent-test-fixture", source_kind: "simulation", verification: "simulation", url: null, published_at: null, retrieved_at: now.toISOString(), locator: "simulation: independent arithmetic expectations" };
const selfEv: Evidence = { ...ev, source_kind: "self_report", verification: "self_reported", locator: "self assessment without artifacts" };
const vector = (n: number) => ({ instrument: "test-only", version: "1", scores: { realistic: n, investigative: n, artistic: n, social: n, enterprising: n, conventional: n }, scale: { min: 0, max: 10 } });
const vec = (scores: number[], scale: { min: number; max: number } | null = { min: 0, max: 10 }) => ({
  instrument: "test-only", version: "1",
  scores: { realistic: scores[0], investigative: scores[1], artistic: scores[2], social: scores[3], enterprising: scores[4], conventional: scores[5] },
  scale,
});
// 非平坦的独立夹具：role_0 与用户轮廓完全相同（相关系数 1），role_1 为逆序中等相关，role_2 为负相关。
const USER = [4, 8, 2, 6, 1, 3];
const ROLE_VECTORS = [[3, 7, 1, 5, 0, 2], [6, 5, 4, 3, 2, 1], [1, 2, 3, 4, 5, 6]];
function fixture(): MatchInput {
  const user = adaptProfile(emptyProfile, null, null, now.toISOString());
  user.simulation = true;
  user.interests = known(vec(USER), ev);
  user.skills = [{ skill_id: "python", level: known(2, ev) }];
  user.preferences = known(["研究"], ev);
  user.study_intent = known("统考", ev); user.target_year = 2028;
  user.qualifications.major = known("临床医学", ev);
  return { user, occupations: [0, 1, 2].map(i => ({
    schema_version: "match-2", id: `role_${i}`, title: `simulation 岗位 ${i}`, simulation: true,
    direction_ids: [], onet_codes: [], mapping_basis: "independent fixture",
    tasks: known(["test task"], ev), interests: known(vec(ROLE_VECTORS[i]), ev),
    skills: [{ skill_id: "python", importance: known(2, ev), required_level: known(4, ev) }],
    professional_background: unknown(), hard_requirements: known([], ev), preferences: known(["研究"], ev),
  })), admissions: [] };
}
function program(): Admission {
  return { schema_version: "match-2", id: "test-program", simulation: true, university: "simulation 院校", major_code: "test", major_name: "simulation 专业", year: 2028, pathway: "统考", occupation_ids: ["role_0"], mapping_evidence: [ev], valid_through: "2028-12-31", exam_subjects: known(["simulation 科目"], ev), research_directions: unknown(), cross_major: known("simulation 按所列规则核验", ev), hard_requirements: known([{ id: "major", field: "major", allowed: ["临床医学"], evidence: [ev] }], ev) };
}
const first = (input: MatchInput) => match(input, now).results.find(r => r.occupation_id === "role_0")!;

test("Match: interest is profile correlation (shape) and three-role ordering", () => {
  const report = match(fixture(), now);
  // 相关系数 1 / 0.450957 / −0.450957 → 100 / 72.55 / 27.45；V1 的归一化距离会把 elevation 也算成差异。
  assert.deepEqual(report.results.map(r => r.interest.score), [100, 72.55, 27.45]);
  assert.deepEqual(report.results.map(r => r.interest.detail?.correlation), [1, 0.45, -0.45]);
  assert.deepEqual(report.results.map(r => r.rank), [1, 2, 3]);
  assert.equal(report.results[0].readiness.score, 50);
  assert.equal(report.results[0].transition.score, 100);
  assert.equal(report.results[0].transition.coverage, 0.5);
  assert.equal(report.results[0].admissions.score, null);
});
test("Match: interest similarity is shape-only, so scale and offset do not matter", () => {
  const input = fixture();
  assert.equal(first(input).interest.score, 100);
  input.user.interests = known(vec(USER, null), ev);            // 量尺未声明：相关不需要量尺
  assert.equal(first(input).interest.score, 100);
  input.user.interests = known(vec(USER.map(v => v * 20 - 40), { min: -40, max: 160 }), ev); // 线性变换
  assert.equal(first(input).interest.score, 100);
});
test("Match: flat interest profile is unknown instead of a high score", () => {
  const input = fixture();
  input.user.interests = known(vector(5), ev);
  const r = first(input);
  assert.equal(r.interest.score, null);
  assert.equal(r.interest.status, "unknown");
  assert.equal(r.rank, null);
  assert.ok(r.interest.missing[0].includes("平坦"));
});
test("Match: weighted readiness caps surplus and preserves valid zero", () => {
  const input = fixture();
  input.user.skills.push({ skill_id: "statistics", level: known(0, ev) });
  input.occupations[0].skills.push({ skill_id: "statistics", importance: known(1, ev), required_level: known(2, ev) });
  assert.equal(first(input).readiness.score, 33.33); // (2*0.5+1*0)/3*100
  input.user.skills[0].level = known(4, ev);
  input.occupations[0].skills[0].required_level = known(1, ev);
  assert.equal(first(input).readiness.score, 66.67);
});
test("Match: known must-have gap caps readiness instead of being averaged away", () => {
  const input = fixture();
  input.occupations[0].skills = [
    { skill_id: "python", importance: known(5, ev), required_level: known(4, ev), must_have: true },
    { skill_id: "statistics", importance: known(1, ev), required_level: known(1, ev) },
  ];
  input.user.skills = [{ skill_id: "python", level: known(3, ev) }, { skill_id: "statistics", level: known(4, ev) }];
  const r = first(input);
  // 未封顶的加权值 = (5*0.75 + 1*1)/6*100 = 79.17，但关键项不足 → 封顶 59
  assert.equal(r.readiness.score, 59);
  assert.ok(String(r.readiness.detail?.must_have_gap).includes("Python"));
});
test("Match: must-have with unknown level caps nothing but blocks completeness", () => {
  const input = fixture();
  input.occupations[0].skills = [{ skill_id: "python", importance: known(2, ev), required_level: known(4, ev), must_have: true }];
  input.user.skills = [];
  const r = first(input);
  assert.equal(r.readiness.score, null);
  assert.equal(r.readiness.detail?.must_have_unknown, 1);
});
test("Match: self-reported levels are attenuated, verified levels are not", () => {
  const input = fixture();
  input.occupations[0].skills = [{ skill_id: "python", importance: known(2, ev), required_level: known(4, ev) }];
  input.user.skills = [{ skill_id: "python", level: known(4, ev) }];
  assert.equal(first(input).readiness.score, 100);
  input.user.skills = [{ skill_id: "python", level: known(4, selfEv) }];
  // 4 → 2 + 0.8 × 2 = 3.6 → 3.6/4 = 90
  assert.equal(first(input).readiness.score, 90);
  input.user.skills = [{ skill_id: "python", level: known(0, selfEv) }];
  // 0 → 2 + 0.8 × (−2) = 0.4 → 0.4/4 = 10，自评“未接触”不会被抬成 0 分
  assert.equal(first(input).readiness.score, 10);
});
test("Match: readiness is monotone in every observed skill level", () => {
  const scores: number[] = [];
  for (let level = 0; level <= 4; level++) {
    const input = fixture();
    input.user.skills = [{ skill_id: "python", level: known(level, ev) }];
    scores.push(first(input).readiness.score!);
  }
  for (let i = 1; i < scores.length; i++) assert.ok(scores[i] >= scores[i - 1], `level ${i} must not score lower`);
  assert.equal(scores[0], 0); assert.equal(scores[4], 100);
});
test("Match: unknown level excluded from denominator with partial coverage and no rank", () => {
  const input = fixture();
  input.occupations[0].skills.push({ skill_id: "statistics", importance: known(1, ev), required_level: known(2, ev) });
  const r = first(input);
  assert.equal(r.readiness.score, 50); assert.equal(r.readiness.coverage, 0.5);
  assert.equal(r.rank, null); assert.equal(r.gaps[1].gap, null);
  input.user.skills[0].level = unknown();
  assert.equal(first(input).readiness.score, null);
});
test("Match: explicit zero target is satisfied without division by zero", () => {
  const input = fixture(); input.occupations[0].skills[0].required_level = known(0, ev);
  assert.equal(first(input).readiness.score, 100);
});
test("Match: unverified numerical standard does not compute", () => {
  const input = fixture();
  input.occupations[0].skills[0].required_level.evidence = [{ ...ev, source_kind: "editorial", verification: "unverified" }];
  assert.equal(first(input).readiness.score, null);
});
test("Match: hard exclusion defeats high scores and never ranks", () => {
  const input = fixture();
  input.occupations[0].hard_requirements = known([{ id: "degree", field: "major", allowed: ["计算机"], evidence: [ev] }], ev);
  const r = first(input);
  assert.equal(r.interest.score, 100); assert.equal(r.eligibility.status, "not_met"); assert.equal(r.rank, null);
  assert.equal(match(input, now).results.at(-1)!.occupation_id, "role_0");
});
test("Match: unknown qualifications remain unknown", () => {
  const input = fixture();
  input.occupations[0].hard_requirements = known([{ id: "degree", field: "degree", allowed: ["学士"], evidence: [ev] }], ev);
  assert.equal(first(input).eligibility.status, "unknown");
});
test("Match: admission eligibility, missing fields, plan and expiry are distinct", () => {
  const input = fixture(); input.admissions = [program()];
  assert.equal(first(input).admissions.score, 100);
  input.admissions[0].cross_major = unknown(); assert.equal(first(input).admissions.score, null);
  input.admissions[0] = program(); input.user.target_year = 2029;
  assert.equal(first(input).programs[0].status, "plan_mismatch");
  input.user.target_year = 2028; input.admissions[0].valid_through = "2026-10-20";
  assert.equal(first(input).programs[0].status, "expired"); assert.equal(first(input).admissions.score, null);
});
test("Match: known admission denial survives incomplete exam subjects", () => {
  const input = fixture(); input.admissions = [program()];
  input.admissions[0].hard_requirements.value![0].allowed = ["计算机"];
  input.admissions[0].exam_subjects = unknown();
  assert.equal(first(input).programs[0].status, "not_met"); assert.equal(first(input).admissions.score, 0);
});
test("Match: unreviewed occupation to program mapping cannot score", () => {
  const input = fixture(); input.admissions = [program()];
  input.admissions[0].mapping_evidence = [{ ...ev, source_kind: "editorial", verification: "unverified" }];
  assert.equal(first(input).admissions.score, null);
});
test("Match: experiences are role-specific, latest by instant, future ignored", () => {
  const input = fixture();
  input.user.experiences = [
    { id: "old", occupation_id: "role_0", scenario_id: "test", mode: "interview", simulation: true, completed_at: "2026-10-21T01:00:00Z", artifacts: ["test"], willingness: known(1, ev), evaluations: [] },
    { id: "new", occupation_id: "role_0", scenario_id: "test", mode: "project", simulation: true, completed_at: "2026-10-20T23:00:00-04:00", artifacts: ["test"], willingness: known(3, ev), evaluations: [{ skill_id: "python", level: known(4, ev), rubric_version: "unapproved", evaluator: "llm" }] },
    { id: "future", occupation_id: "role_0", scenario_id: "test", mode: "project", simulation: true, completed_at: "2030-01-01T00:00:00Z", artifacts: [], willingness: known(5, ev), evaluations: [] },
  ];
  const result = match(input, now).results;
  assert.equal(result[0].transition.score, 75); assert.equal(result[0].readiness.score, 50);
  assert.equal(result[1].transition.coverage, 0.5);
});
test("Match: deterministic ties use IDs; inputs remain unchanged", () => {
  const input = fixture(); input.occupations.forEach(o => { o.interests = known(vector(5), ev); });
  input.occupations.reverse(); const before = structuredClone(input);
  assert.deepEqual(match(input, now).results.map(r => r.occupation_id), ["role_0", "role_1", "role_2"]);
  assert.deepEqual(input, before);
});
test("Match: ordering is geometric, ranks are complete-only, dominance and rank ranges are reported", () => {
  const report = match(fixture(), now);
  assert.deepEqual(report.results.map(r => r.interest.score), [100, 72.55, 27.45]);
  // role_0 在两个维度都不低 → 支配其余两个（仅作标注，不淘汰）
  assert.deepEqual(report.results.map(r => r.dominated), [false, true, true]);
  assert.deepEqual(report.results.map(r => r.rank_range), [[1, 1], [2, 2], [3, 3]]);
  assert.equal(report.sensitivity.stability, "stable");
  assert.equal(report.sensitivity.ordering_flips, 0);
  assert.deepEqual(report.sensitivity.interest_weight_grid, [0.4, 0.45, 0.5, 0.55, 0.6]);
  assert.equal(report.algorithm_version, "limen-match-v2.1");
  assert.equal(report.schema_version, "match-2");
  for (const r of report.results) assert.equal(typeof r.ordering_utility, "number");
  // 证据档位与置信度只描述依据完整性/不确定性来源，不是适合度；必须在报告里可追溯。
  assert.deepEqual(report.results.map(r => r.evidence_tier), ["A", "A", "A"]);
  for (const r of report.results) {
    assert.ok(r.confidence);
    assert.ok(["high", "medium", "low"].includes(r.confidence.level));
    // 置信度覆盖率 = 四维覆盖率均值，必须可复算，不是另起一套口径。
    const mean = (r.interest.coverage + r.readiness.coverage + r.transition.coverage + r.admissions.coverage) / 4;
    assert.equal(r.confidence.coverage, Math.round(mean * 100) / 100);
    assert.ok(r.confidence.notes.length > 0);
  }
  assert.equal(report.sensitivity.top_k_jaccard, 1);
  assert.deepEqual(report.sensitivity.flipped_occupation_ids, []);
  assert.ok(report.data_manifest.versions.some(v => v.id === "algorithm" && v.version === "limen-match-v2.1"));
  assert.ok(report.data_manifest.versions.some(v => v.id === "skill_standard"));
  assert.ok(Array.isArray(report.data_manifest.sources));
});
test("Match: weight perturbation exposes unstable ordering instead of pretending one order is final", () => {
  const input = fixture();
  // role_0：兴趣 100（r=1）、准备度 0（要求 4，自评 0）；role_1：兴趣 0（完全反向 r=−1）、准备度 100（要求 0 视为满足）。
  input.user.skills = [{ skill_id: "python", level: known(0, ev) }];
  input.occupations[0].interests = known(vec(USER.map(v => v - 1)), ev);
  input.occupations[0].skills = [{ skill_id: "python", importance: known(2, ev), required_level: known(4, ev) }];
  input.occupations[1].interests = known(vec(USER.map(v => 10 - v)), ev); // 反向线性变换：r=−1
  input.occupations[1].skills = [{ skill_id: "python", importance: known(2, ev), required_level: known(0, ev) }];
  input.occupations[2].interests = known(vec([3, 1, 6, 2, 8, 4]), ev);
  input.occupations[2].skills = [{ skill_id: "python", importance: known(2, ev), required_level: known(4, ev) }];
  const report = match(input, now);
  const interest = report.results.map(r => r.interest.score);
  assert.equal(interest[0], 100); assert.equal(interest[1], 0);
  assert.equal(report.results[0].readiness.score, 0); assert.equal(report.results[1].readiness.score, 100);
  assert.ok(report.sensitivity.ordering_flips > 0, "反向维度应导致权重扰动下的顺序翻转");
  assert.equal(report.sensitivity.stability, "variable");
  assert.deepEqual(report.results[0].rank_range, [1, 2]);
  assert.deepEqual(report.results[1].rank_range, [1, 2]);
});
test("Match: contract rejects duplicates, dangling relations, invalid scales and unknown != zero", () => {
  const mutations: ((v: MatchInput) => void)[] = [
    v => { v.occupations.push(v.occupations[0]); },
    v => { v.user.skills.push(v.user.skills[0]); },
    v => { v.admissions = [{ ...program(), occupation_ids: ["missing"] }]; },
    v => { v.user.interests.value!.scale = { min: 1, max: 1 }; },
    v => { v.user.skills[0].level = { value: 0, status: "unknown", evidence: [] }; },
    v => { v.user.skills[0].level.value = 5; },
  ];
  for (const mutate of mutations) { const v = fixture(); mutate(v); assert.equal(matchInputSchema.safeParse(v).success, false); }
});
test("Match: reliability must stay within 0–1 when present", () => {
  const input = fixture();
  input.user.skills[0].level.reliability = 0.9;
  assert.equal(matchInputSchema.safeParse(input).success, true);
  input.user.skills[0].level.reliability = 1.4;
  assert.equal(matchInputSchema.safeParse(input).success, false);
});
test("Match: personal and synthetic standards cannot mix", () => {
  const input = fixture(); input.user.simulation = false;
  assert.equal(matchInputSchema.safeParse(input).success, false);
  input.occupations.forEach(o => { o.simulation = false; });
  assert.equal(matchInputSchema.safeParse(input).success, false);
});
test("Match: self reports cannot establish job standards", () => {
  const input = fixture(); input.occupations[0].skills[0].importance.evidence = [{ ...ev, source_kind: "self_report", verification: "self_reported" }];
  assert.equal(matchInputSchema.safeParse(input).success, false);
});
test("Match: legacy free-text skill levels and medical degree remain unknown", () => {
  const profile = { ...emptyProfile, major: "临床医学", tech_skills: [{ skill: "Python", self_reported_level: "精通", evidence: "" }, { skill: "toString", self_reported_level: "熟悉", evidence: "" }] };
  const user = adaptProfile(profile, null, null, now.toISOString());
  assert.equal(user.skills[0].level.value, null); assert.equal(user.qualifications.degree.value, null);
  assert.deepEqual(user.unmapped_skills, ["toString：熟悉"]); assert.equal(resolveSkill("__proto__"), null);
});
test("Match: production extraction handoff preserves evidence and never supplies numeric standards", () => {
  const raw = JSON.parse(readFileSync("data/knowledge/pilot.collected.json", "utf8"));
  const before = JSON.stringify(raw); const result = extractionHandoff(raw, now);
  assert.ok(result.candidates.length > 0); assert.equal(result.status, "review_required");
  for (const c of result.candidates) {
    assert.ok(c.facts.every(f => f.evidence.url && f.evidence.locator.includes("sha256:")));
    assert.ok(c.skill_candidates.every(s => s.importance.value === null && s.required_level.value === null));
  }
  assert.equal(JSON.stringify(raw), before);
});
test("Match: orphan source is rejected; expired excerpts become unverified", () => {
  const raw = JSON.parse(readFileSync("data/knowledge/pilot.collected.json", "utf8"));
  assert.throws(() => extractionHandoff({ ...raw, sources: [] }, now));
  const result = extractionHandoff(raw, new Date("2100-01-01T00:00:00Z"));
  assert.ok(result.candidates.every(c => c.historical && c.facts.every(f => f.evidence.verification === "unverified")));
});
test("Match: shipped demo completes all 10 directions with explicit simulation export", () => {
  const report = match(simulationInput(), now);
  assert.equal(report.simulation, true); assert.equal(report.results.length, 10);
  assert.ok(report.results.every(r => r.rank && r.gaps.length && r.actions.length && r.admissions.score === null));
  assert.equal(JSON.parse(JSON.stringify(report)).skill_standard_version, "limen-skills-2");
  // 演示覆盖 9 个跨学科特化 + 医学：岗位粒度是特化，不是组级方向
  assert.deepEqual([...report.results.map(r => r.occupation_id)].sort(), ["clinical_data", "devices", "health_systems", "imaging_eng", "llm_agent", "med_nlp_kg", "medicine", "ml_cv", "signals", "software"]);
  // 兴趣分必须彼此不同：否则演示会给人「多个方向兴趣完全一样」的错误印象
  const scores = report.results.map(r => r.interest.score!);
  assert.equal(new Set(scores).size, scores.length, `演示兴趣分不应重复，实际 ${scores.join("/")}`);
});
test("Match: personal empty profile never receives demonstration scores or admission decisions", () => {
  const user = adaptProfile(emptyProfile, null, null, now.toISOString());
  const report = match({ user, occupations: matchOccupations, admissions: [] }, now);
  assert.equal(report.simulation, false);
  for (const r of report.results) {
    assert.equal(r.interest.score, null); assert.equal(r.readiness.score, null);
    assert.equal(r.transition.score, null); assert.equal(r.admissions.score, null);
    assert.equal(r.eligibility.status, "unknown"); assert.equal(r.rank, null); assert.equal(r.rank_range, null);
  }
  assert.equal(report.sensitivity.stability, "n/a");
});
// 兴趣区分度诊断：候选岗位兴趣轮廓高度相似时，兴趣维度对顺序几乎没有信息量，必须显式说出来。
test("Match: interest diagnostics reports candidate-set discrimination instead of hiding it", () => {
  const report = match(fixture(), now);
  const d = report.interest_diagnostics;
  assert.equal(d.candidate_pairs.length, 3, "三个岗位应有 3 对相关");
  assert.ok(d.max_correlation !== null && d.mean_correlation !== null);
  assert.ok(d.candidate_pairs.every(pair => pair.correlation >= -1 && pair.correlation <= 1));
  // 结论必须与阈值一致，不允许自相矛盾地既说“区分度够”又不达标
  const expected = !(d.max_correlation >= d.thresholds.near_duplicate || d.mean_correlation >= d.thresholds.low_discrimination_mean);
  assert.equal(d.discriminative, expected);
  if (d.discriminative === false) assert.ok(report.limitations.some(line => line.includes("兴趣维度区分度有限")));
  else assert.ok(!report.limitations.some(line => line.includes("兴趣维度区分度有限")));
});

test("Match: near-duplicate occupational interest profiles are called out, not ranked as if distinct", () => {
  const input = fixture();
  // 让三个岗位共用同一张兴趣轮廓：此时兴趣无法区分它们，顺序只能来自准备度与资格。
  const shared = known(vec(ROLE_VECTORS[0]), ev);
  for (const occupation of input.occupations) occupation.interests = shared;
  const report = match(input, now);
  const d = report.interest_diagnostics;
  assert.equal(d.max_correlation, 1);
  assert.equal(d.discriminative, false);
  assert.equal(d.near_duplicate_pairs.length, 3);
  assert.match(d.note, /接近重复/);
  assert.ok(report.limitations.some(line => line.includes("兴趣维度区分度有限")));
});

test("Match: diagnostics stay unknown when fewer than two occupations have usable interest profiles", () => {
  const input = fixture();
  input.occupations[1].interests = unknown();
  input.occupations[2].interests = unknown();
  const report = match(input, now);
  assert.equal(report.interest_diagnostics.max_correlation, null);
  assert.equal(report.interest_diagnostics.discriminative, null);
  assert.match(report.interest_diagnostics.note, /不足以比较/);
  assert.ok(!report.limitations.some(line => line.includes("兴趣维度区分度有限")));
});

test("Match: a flat user profile is flagged so a shape score is not over-read", () => {
  const input = fixture();
  input.user.interests = known(vec([5, 5, 5, 5, 5, 5]), ev);
  const report = match(input, now);
  assert.equal(report.interest_diagnostics.flat_user_profile, true);
  assert.equal(match(fixture(), now).interest_diagnostics.flat_user_profile, false);
});
