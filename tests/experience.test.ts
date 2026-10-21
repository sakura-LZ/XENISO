import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, evaluationCard, experienceSchema, generateSamples, type Experience } from "../src/lib/experience";
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
  assert.equal(card.simulation, true); assert.deepEqual(card.metrics, evaluate(generateSamples(), .6, "B"));
  assert.equal(experienceSchema.safeParse({ ...completedSimulation, operations: { ...completedSimulation.operations, devices_compared: false } }).success, false);
  assert.equal(experienceSchema.safeParse({ ...completedSimulation, reflection: { ...completedSimulation.reflection, favorite_operation: "" } }).success, false);
});
