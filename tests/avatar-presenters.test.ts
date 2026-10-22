import test from "node:test";
import assert from "node:assert/strict";
import { directions } from "../src/lib/directions";
import { avatarPresenters, isAvatarPresenter, presenterForExperience } from "../src/lib/avatar-presenters";
import { experienceTemplates } from "../src/lib/experience/templates";

test("avatar routing: all four direction groups have one presenter alias", () => {
  assert.deepEqual(new Set(directions.map(item => item.group_id)), new Set(avatarPresenters));
  for (const template of experienceTemplates) {
    const expected = template.id === "medical_ai_pm" ? "biomed_eng" : directions.find(item => item.id === template.direction)!.group_id;
    assert.equal(presenterForExperience(template.direction, template.id), expected);
  }
});
test("avatar routing: four medical disciplines share medical presenter, products use engineering", () => {
  for (const template of experienceTemplates.filter(item => item.direction === "medicine")) assert.equal(presenterForExperience("medicine", template.id), "medicine");
  assert.equal(presenterForExperience("devices", "devices"), "biomed_eng");
  assert.equal(presenterForExperience("health_systems", "medical_ai_pm"), "biomed_eng");
  assert.equal(presenterForExperience("health_systems", "health_systems"), "med_informatics");
});
test("avatar routing: arbitrary application names and injected aliases are not allowed", () => {
  for (const value of [null, "", "__proto__", "https://example.com", "medicine?app=other", "MEDICINE", 1]) assert.equal(isAvatarPresenter(value), false);
  assert.throws(() => presenterForExperience("missing", "devices"));
});
