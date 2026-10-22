import test from "node:test";
import assert from "node:assert/strict";
import { directions } from "../src/lib/directions";
import { handbookEntries, type HandbookDirectionId } from "../src/lib/handbook";
import { experienceTemplates, getTemplate, stageTitles, medicineDisciplines } from "../src/lib/experience/templates";
import { operationResult, type ChoiceState } from "../src/lib/experience/operations";
import { experienceSchema, evaluationCard, experienceEvidence, experiencePresentation, type WorkbenchExperience } from "../src/lib/experience";
import { actionPlan, initialReport } from "../src/lib/reports";
import { simulationProfile } from "../src/lib/profile";

function outcome(templateId: string, mode: "project" | "interview" = "project"): WorkbenchExperience {
  const template = experienceTemplates.find(item => item.id === templateId)!;
  return { version: "3.0", simulation: true, scenario_id: "direction_workbench", template_id: templateId, template_version: "e1-1", source: "curated_template", direction_id: template.direction, role: template.role, mode, choices: ["0", "0", "0"], outputs: ["simulation：第一步已经核对来源和操作结果。", "simulation：第二步记录实际结果与取舍。", "simulation：第三步需要进一步核查未知事项。"], reflection: { favorite_operation: "simulation：比较取舍", least_favorite_operation: "暂无", willingness_for_3_hours: 3, followup_question: "simulation：怎样跟进核对？" }, completed_at: "2026-10-22T00:00:00Z", transcript: [] };
}

test("simulation: ten directions have handbook and distinct usable templates, medicine uses four academic names", () => {
  assert.equal(directions.length, 10);
  for (const direction of directions) {
    assert.ok(handbookEntries[direction.id as HandbookDirectionId]);
    assert.equal(getTemplate(direction.id).direction, direction.id);
  }
  assert.deepEqual(medicineDisciplines.map(item => item.name), ["内科学", "外科学", "妇产科学", "儿科学"]);
  for (const discipline of medicineDisciplines) assert.equal(getTemplate("medicine", discipline.template_id).direction, "medicine");
  assert.throws(() => getTemplate("signals", "medicine_internal"));
  assert.equal(directions.find(item => item.id === "medicine")!.onet.length, 0);
  assert.equal(initialReport(simulationProfile, null).candidates.length, 0);
});
for (const template of experienceTemplates) for (const mode of ["project", "interview"] as const) {
  test(`simulation integration: ${template.id}/${mode} has three real operations, validated outcome, export and R2`, () => {
    const choices: ChoiceState = [null, null, null];
    for (let stage = 0; stage < 3; stage++) {
      assert.throws(() => operationResult(template.id, choices, stage));
      choices[stage] = "0";
      const before = operationResult(template.id, choices, stage);
      choices[stage] = "1";
      const after = operationResult(template.id, choices, stage);
      assert.notDeepEqual(before.metrics, after.metrics, `operation ${stage} must change computed data/structure`);
    }
    const value = { ...outcome(template.id, mode), choices };
    assert.equal(experienceSchema.safeParse(value).success, true);
    const card = evaluationCard(value);
    assert.equal(card.simulation, true); assert.ok("results" in card); assert.equal(card.results.length, 3);
    assert.deepEqual(experiencePresentation(value).stage_names, stageTitles(template, mode));
    const restored = experienceSchema.parse(JSON.parse(JSON.stringify(value)));
    assert.deepEqual(evaluationCard(restored), card);
    assert.ok(actionPlan(simulationProfile, template.direction, value).experience_relevance.includes(template.role));
    assert.equal(experienceEvidence(value).filter(item => item.ref === "experience.operations").length, 1);
  });
}
test("simulation: V3 rejects forged roles, directions, metrics, source, incomplete/invalid choices and unknown templates", () => {
  const value = outcome("signals");
  for (const changed of [{ role: "fake" }, { direction_id: "medicine" }, { metrics: { score: 100 } }, { source: "llm_live" }, { template_version: "future" }, { template_id: "fake" }, { choices: ["0", null, "0"] }, { choices: ["0", "9", "0"] }, { choices: ["0", "0", "0", "0"] }]) assert.equal(experienceSchema.safeParse({ ...value, ...changed }).success, false);
  for (const stage of [-1, 3, NaN, .5]) assert.throws(() => operationResult("signals", ["0", "0", "0"], stage));
});
test("simulation: exact data cleaning fixture excludes missing and duplicate records", () => {
  assert.deepEqual(operationResult("clinical_data", ["0", "0", "0"], 2).metrics, { 记录数: 8, 非缺失数: 6, 缺失数: 2, 均值: 6.333 });
  assert.deepEqual(operationResult("clinical_data", ["1", "1", "1"], 2).metrics, { 记录数: 2, 非缺失数: 2, 缺失数: 0, 均值: 3 });
});
test("simulation: request/notification fixtures reconcile totals and prevent duplicate actions", () => {
  assert.deepEqual(operationResult("software", ["1", "1", "1"], 2).metrics, { 请求数: 6, 应用操作: 3, 拒绝: 1, 返回已有结果: 2, 已取消预约: 1 });
  assert.deepEqual(operationResult("health_systems", ["1", "1", "1"], 2).metrics, { 入队事件: 3, 退回核对: 2, 已交接: 2, 待确认: 1 });
  assert.deepEqual(operationResult("devices", ["1", "1", "2"], 2).metrics, { 教学预算: 6, 已用点数: 8, 剩余点数: -2, 覆盖用例: 3, 待补用例: 0 });
});
test("simulation: future selections do not change an earlier stage snapshot", () => {
  for (const template of experienceTemplates) assert.deepEqual(operationResult(template.id, ["0", "1", "1"], 0), operationResult(template.id, ["0", null, null], 0));
});
test("simulation: signals and image are deterministic, bounded and contain actual calculated results", () => {
  const signal = operationResult("signals", ["2", "0", "0"], 2);
  assert.equal(signal.metrics.处理前均方误差, signal.metrics.处理后均方误差);
  assert.equal(signal.series![0].values.length, 64);
  const image = operationResult("imaging_eng", ["1", "1", "2"], 2);
  assert.equal(image.pixels!.length, 256); assert.ok(image.pixels!.every(value => value >= 0 && value <= 255));
  assert.equal(image.metrics.比较像素, 192);
  assert.deepEqual(image, operationResult("imaging_eng", ["1", "1", "2"], 2));
});
test("simulation: evidence includes operations and source, excludes optional conversation", () => {
  const value = { ...outcome("medicine_obgyn"), transcript: [{ speaker: "user" as const, text: "simulation private discussion" }] };
  const evidence = JSON.stringify(experienceEvidence(value));
  assert.equal(evidence.includes("private discussion"), false);
  assert.equal(evidence.includes("curated_template"), true);
});
