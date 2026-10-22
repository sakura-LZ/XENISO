import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, evaluationCard, experienceEvidence, experienceSchema, generateSamples, type Experience } from "../src/lib/experience";
const careerExperience: Experience = { version: "2.0", simulation: true, scenario_id: "hospital_ai_triage", role: "medical_ai_product_manager", direction_id: "ml_cv", mode: "project", outputs: ["需求分析：患者和医生需要明确分诊风险", "优先级风险安全，保留人工复核", "PRD用户功能指标验证方案"], reflection: { favorite_operation: "梳理用户需求", least_favorite_operation: "simulation：暂无", willingness_for_3_hours: 3, followup_question: "如何做验证？" }, completed_at: "2026-10-20T00:00:00.000Z", transcript: [] };
export const completedSimulation: Experience = { simulation: true, scenario_id: "wearable_ecg_alert_demo", role: "ml_engineer", seed: 20261020, threshold: .6, device: "B", tradeoff: "balance", operations: { threshold_changed: true, devices_compared: true, tradeoff_chosen: true }, reflection: { favorite_operation: "simulation：比较设备", least_favorite_operation: "暂无", willingness_for_3_hours: 3, followup_question: "" }, completed_at: "2026-10-20T00:00:00.000Z" };
test("simulation: fixed generator produces 100 repeatable samples across two devices", () => {
  const samples = generateSamples();
  assert.equal(samples.length, 100); assert.deepEqual(samples, generateSamples());
  assert.equal(samples.filter((s) => s.device_group === "A").length, 50);
  assert.ok(samples.every((s) => s.score >= 0 && s.score <= 1));
});
test("simulation: confusion matrix uses >= threshold and exact denominators", () => {
  const m = evaluate([{ id: "1", score: .5, true_label: 1, device_group: "A" }, { id: "2", score: .8, true_label: 0, device_group: "A" }, { id: "3", score: .2, true_label: 0, device_group: "A" }, { id: "4", score: .1, true_label: 1, device_group: "A" }], .5, "A");
  assert.deepEqual(m, { n: 4, tp: 1, fp: 1, tn: 1, fn: 1, sensitivity: .5, specificity: .5, precision: .5, false_alerts: 1 });
  assert.equal(evaluate([], .5, "all").precision, null);
});
test("simulation: threshold and device selection change computed results", () => {
  const samples = generateSamples();
  const low = evaluate(samples, .2, "A"), high = evaluate(samples, .8, "A");
  assert.ok(low.tp > high.tp); assert.ok(low.fp > high.fp); assert.ok(low.fn < high.fn);
  assert.notDeepEqual(evaluate(samples, .5, "A"), evaluate(samples, .5, "B"));
  assert.throws(() => evaluate(samples, NaN, "A"));
});
test("simulation: exports recomputed metrics, requires all operations and reflection", () => {
  const card = evaluationCard(completedSimulation);
  assert.equal(card.simulation, true); assert.ok("metrics" in card); assert.deepEqual(card.metrics, evaluate(generateSamples(), .6, "B"));
  assert.equal(experienceSchema.safeParse({ ...completedSimulation, operations: { ...completedSimulation.operations, devices_compared: false } }).success, false);
  assert.equal(experienceSchema.safeParse({ ...completedSimulation, reflection: { ...completedSimulation.reflection, favorite_operation: "" } }).success, false);
});
test("simulation: career experience requires three structured outputs and preserves historical ECG data", () => {
  assert.equal(experienceSchema.safeParse(careerExperience).success, true);
  const card = evaluationCard(careerExperience);
  assert.ok("feedback" in card); assert.equal("metrics" in card, false);
  if ("feedback" in card) assert.equal(card.feedback.length, 3);
  assert.equal(experienceSchema.safeParse({ ...careerExperience, outputs: ["too short", careerExperience.outputs[1], careerExperience.outputs[2]] }).success, false);
  assert.equal(experienceSchema.safeParse(completedSimulation).success, true);
});
test("simulation: R2 evidence includes all three outputs with stable refs, excludes avatar transcript", () => {
  const evidence = experienceEvidence({ ...careerExperience, transcript: [{ speaker: "user", text: "simulation private conversation" }] });
  assert.deepEqual(evidence.filter(e => e.ref.startsWith("experience.outputs")).map(e => e.value), careerExperience.outputs);
  assert.equal(evidence[2].ref, "experience.outputs[0]");
  assert.equal(JSON.stringify(evidence).includes("private conversation"), false);
  assert.equal(experienceEvidence(completedSimulation).length, 2);
});
