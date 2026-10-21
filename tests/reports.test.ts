import test from "node:test";
import assert from "node:assert/strict";
import { directions } from "../src/lib/directions";
import { actionPlan, initialReport, skillEvidence } from "../src/lib/reports";
import { emptyProfile, simulationProfile } from "../src/lib/profile";
import { areas } from "../src/lib/onet/contracts";
import { documentSnapshot, translatedQuestion, translation } from "../src/lib/onet/translation";
import type { AssessmentResult } from "../src/lib/assessment";
const mockAssessment: AssessmentResult = { source: "onet_live", instrument: "Mini-IP-30", onet_version: "mock=true database", api_version: "mock=true", returned_at: "2026-10-20T00:00:00Z", answers: [], question_snapshot: [], scores: areas.map((code) => ({ code, title: "mock=true", score: code === "investigative" ? 40 : 10 })), careers: [{ code: "15-2051.00", title: "mock=true Data Scientists", href: "https://example.invalid" }, { code: "99-9999.00", title: "mock=true outside directory", href: "https://example.invalid" }], career_total: 2 };
test("mock=true T1: high interest with no CS courses remains exploratory, no aptitude score", () => {
  const r1 = initialReport(simulationProfile, mockAssessment);
  assert.ok(r1.candidates.length > 0 && r1.candidates.length <= 3);
  assert.equal(r1.outside_directory.length, 1); assert.ok(r1.unknowns.some((s) => s.includes("不代表不适合")));
  assert.ok(r1.candidates.every((c) => c.occupations.some((o) => o.code === "15-2051.00")));
});
test("simulation T2: project evidence does not create interest, empty GPA/papers allowed", () => {
  const r1 = initialReport(simulationProfile, null);
  assert.equal(r1.candidates.length, 0); assert.equal(r1.scores.length, 0);
  assert.ok(r1.evidence.length > 0); assert.equal(initialReport(emptyProfile, null).evidence.length, 0);
});
test("simulation T3/T5: missing plan parameters block timeline, no invented admissions or effort", () => {
  const plan = actionPlan(emptyProfile, "ml_cv", null, new Date("2026-10-20"));
  assert.equal(plan.planning_ready, false); assert.equal(plan.planning, null);
  assert.ok(plan.tasks.every((t) => t.estimated_effort_range === null));
  assert.ok(plan.tasks.some((t) => t.source === "verifiedAdmissions:empty"));
  assert.ok(plan.gaps.every((g) => g.status === "信息不足/待了解"));
  assert.throws(() => actionPlan(emptyProfile, "fake_direction", null));
});
test("simulation: explicit time parameters generate only a conditional budget horizon", () => {
  const plan = actionPlan({ ...simulationProfile, pathway: "统考" }, "ml_cv", null, new Date("2026-10-20"));
  assert.equal(plan.planning_ready, true); assert.equal(plan.planning?.weekly_hours, 4);
  assert.equal(plan.formal_ready, false);
  assert.equal(actionPlan({ ...simulationProfile, pathway: "统考", weekly_hours: 169 }, "ml_cv", null).planning_ready, false);
  assert.equal(actionPlan({ ...simulationProfile, pathway: "统考", transition_year: 2101 }, "ml_cv", null).planning_ready, false);
  for (const t of plan.tasks) for (const dependency of t.dependencies) assert.ok(plan.tasks.some((task) => task.id === dependency));
});
test("official document snapshot: 30 linked indices and independent translation refuses mismatches", () => {
  assert.equal(documentSnapshot.source, "official_document_snapshot"); assert.equal(documentSnapshot.questions.length, 30);
  for (const area of areas) assert.equal(documentSnapshot.questions.filter((q) => q.area === area).length, 5);
  assert.equal(translation.review_status, "pending_human_review"); assert.ok(translatedQuestion(documentSnapshot.questions[0]));
  assert.equal(translatedQuestion({ ...documentSnapshot.questions[0], original_en: "changed" }), undefined);
  assert.equal(directions.length, 9);
});
test("simulation: evidence refs address original arrays even with blank draft entries", () => {
  const p = { ...emptyProfile, tech_skills: [{ skill: "", self_reported_level: "", evidence: "" }, { skill: "Python", self_reported_level: "入门", evidence: "simulation" }] };
  assert.equal(skillEvidence(p)[0].ref, "user_profile.tech_skills[1]");
});

test("simulation P4: the chosen admission pathway changes exported verification tasks", () => {
  const exam = actionPlan({ ...simulationProfile, pathway: "统考" }, "ml_cv", null);
  const recommendation = actionPlan({ ...simulationProfile, pathway: "推免" }, "ml_cv", null);
  const application = actionPlan({ ...simulationProfile, pathway: "申请制" }, "ml_cv", null);
  assert.ok(exam.tasks.some((task) => task.deliverable.includes("考试科目")));
  assert.ok(recommendation.tasks.some((task) => task.deliverable.includes("本校推免资格")));
  assert.ok(application.tasks.some((task) => task.deliverable.includes("语言要求")));
  assert.notDeepEqual(exam.tasks, recommendation.tasks);
  assert.notDeepEqual(recommendation.tasks, application.tasks);
  for (const plan of [exam, recommendation, application]) {
    assert.ok(plan.tasks.every((task) => task.estimated_effort_range === null));
    assert.ok(plan.tasks.every((task) => task.dependencies.every((id) => plan.tasks.some((t) => t.id === id))));
    assert.equal(plan.planning?.official_deadlines_verified, false);
  }
  const undecided = actionPlan(simulationProfile, "ml_cv", null);
  assert.equal(undecided.planning, null);
  assert.ok(!undecided.tasks.some((task) => /统考专属|推免专属|申请制专属/.test(task.title)));
});

test("mock=true P4: R2 preserves official interest provenance and never derives scores from experience", () => {
  const complete = { ...mockAssessment, answers: documentSnapshot.questions.map((q) => ({ index: q.index, answer: 4 })), question_snapshot: documentSnapshot.questions.map((q) => ({ ...q, onet_version: "mock=true database" })) };
  const plan = actionPlan({ ...simulationProfile, pathway: "统考" }, "ml_cv", null, new Date("2026-10-20"), complete);
  assert.equal(plan.interest?.source, "onet_live");
  assert.equal(plan.interest?.returned_at, "2026-10-20T00:00:00Z");
  assert.equal(plan.interest?.onet_version, "mock=true database");
  assert.deepEqual(plan.interest?.scores, complete.scores);
  assert.equal(actionPlan(simulationProfile, "ml_cv", null).interest, null);
  assert.throws(() => actionPlan(simulationProfile, "ml_cv", null, new Date("2026-10-20"), { ...complete, scores: [] }));
});
