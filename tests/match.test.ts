import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { match } from "../src/lib/match/engine";
import { known, unknown, matchInputSchema, type Evidence, type MatchInput, type Admission } from "../src/lib/match/contracts";
import { adaptProfile, resolveSkill } from "../src/lib/match/adapters";
import { extractionHandoff } from "../src/lib/match/knowledge-adapter";
import { emptyProfile } from "../src/lib/profile";
import { simulationInput } from "../src/lib/match/simulation";
import { matchOccupations } from "../src/lib/match/catalog";

const now = new Date("2026-10-21T12:00:00Z");
const ev: Evidence = { ref: "independent-test-fixture", source_kind: "simulation", verification: "simulation", url: null, published_at: null, retrieved_at: now.toISOString(), locator: "simulation: independent arithmetic expectations" };
const vector = (n: number) => ({ instrument: "test-only", version: "1", scores: { realistic: n, investigative: n, artistic: n, social: n, enterprising: n, conventional: n }, scale: { min: 0, max: 10 } });
function fixture(): MatchInput {
  const user = adaptProfile(emptyProfile, null, null, now.toISOString());
  user.simulation = true;
  user.interests = known(vector(5), ev);
  user.skills = [{ skill_id: "python", level: known(2, ev) }];
  user.preferences = known(["研究"], ev);
  user.study_intent = known("统考", ev); user.target_year = 2028;
  user.qualifications.major = known("临床医学", ev);
  return { user, occupations: [0, 1, 2].map(i => ({
    schema_version: "match-1", id: `role_${i}`, title: `simulation 岗位 ${i}`, simulation: true,
    direction_ids: [], onet_codes: [], mapping_basis: "independent fixture",
    tasks: known(["test task"], ev), interests: known(vector([5, 7, 10][i]), ev),
    skills: [{ skill_id: "python", importance: known(2, ev), required_level: known(4, ev) }],
    professional_background: unknown(), hard_requirements: known([], ev), preferences: known(["研究"], ev),
  })), admissions: [] };
}
function program(): Admission {
  return { schema_version: "match-1", id: "test-program", simulation: true, university: "simulation 院校", major_code: "test", major_name: "simulation 专业", year: 2028, pathway: "统考", occupation_ids: ["role_0"], mapping_evidence: [ev], valid_through: "2028-12-31", exam_subjects: known(["simulation 科目"], ev), research_directions: unknown(), cross_major: known("simulation 按所列规则核验", ev), hard_requirements: known([{ id: "major", field: "major", allowed: ["临床医学"], evidence: [ev] }], ev) };
}
const first = (input: MatchInput) => match(input, now).results.find(r => r.occupation_id === "role_0")!;

test("Match: independent hand calculation and three-role ordering", () => {
  const report = match(fixture(), now);
  assert.deepEqual(report.results.map(r => r.interest.score), [100, 80, 50]);
  assert.deepEqual(report.results.map(r => r.rank), [1, 2, 3]);
  assert.equal(report.results[0].readiness.score, 50);
  assert.equal(report.results[0].transition.score, 100);
  assert.equal(report.results[0].transition.coverage, 0.5);
  assert.equal(report.results[0].admissions.score, null);
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
test("Match: scale absence blocks scoring; independent declared scales normalize", () => {
  const input = fixture(); input.user.interests.value!.scale = null;
  assert.equal(first(input).interest.score, null);
  input.user.interests = known({ ...vector(10), scale: { min: 0, max: 20 } }, ev);
  assert.equal(first(input).interest.score, 100);
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
test("Match: shipped demo completes all three roles with explicit simulation export", () => {
  const report = match(simulationInput(), now);
  assert.equal(report.simulation, true); assert.equal(report.results.length, 3);
  assert.ok(report.results.every(r => r.rank && r.gaps.length && r.actions.length && r.admissions.score === null));
  assert.equal(JSON.parse(JSON.stringify(report)).skill_standard_version, "limen-skills-1");
});
test("Match: personal empty profile never receives demonstration scores or admission decisions", () => {
  const user = adaptProfile(emptyProfile, null, null, now.toISOString());
  const report = match({ user, occupations: matchOccupations, admissions: [] }, now);
  assert.equal(report.simulation, false);
  for (const r of report.results) {
    assert.equal(r.interest.score, null); assert.equal(r.readiness.score, null);
    assert.equal(r.transition.score, null); assert.equal(r.admissions.score, null);
    assert.equal(r.eligibility.status, "unknown"); assert.equal(r.rank, null);
  }
});
