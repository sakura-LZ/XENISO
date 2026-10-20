import test from "node:test";
import assert from "node:assert/strict";
import { emptyProfile, profileMissing, profileSchema, simulationProfile } from "../src/lib/profile";
import { coursesFromRows, parseCsv } from "../src/lib/transcript";

test("simulation: optional GPA, papers and skills are valid empty drafts", () => {
  assert.equal(profileSchema.safeParse(emptyProfile).success, true);
  assert.equal(profileMissing(emptyProfile).length, 4);
  assert.equal(profileMissing(simulationProfile).length, 0);
});
test("simulation: numeric constraints preserve unknown vs zero", () => {
  assert.equal(profileSchema.safeParse({ ...emptyProfile, gpa: 0, gpa_scale: 4 }).success, true);
  for (const extra of [{ gpa: 4.2, gpa_scale: 4 }, { gpa: 2, gpa_scale: null }, { rank: 11, cohort_size: 10 }, { weekly_hours: 169 }]) assert.equal(profileSchema.safeParse({ ...emptyProfile, ...extra }).success, false);
});
test("simulation: CSV imports only allowlisted structured course fields", () => {
  const courses = coursesFromRows(parseCsv('\uFEFF课程名,学分,成绩,满分,学期,学号\r\n"统计,入门",2,90,100,春,simulation-id\r\n"研究""方法",1,0,100,秋,simulation-id'));
  assert.equal(courses[0].course_name, "统计,入门");
  assert.equal(courses[1].course_name, '研究"方法');
  assert.equal(courses[1].score, 0);
  assert.deepEqual(Object.keys(courses[0]).sort(), ["course_name", "credit", "score", "score_scale", "semester"]);
});
test("simulation: malformed CSV and invalid score scales are rejected", () => {
  assert.throws(() => parseCsv('课程名\n"unclosed'));
  assert.throws(() => coursesFromRows([["课程名", "成绩", "满分"], ["simulation", 101, 100]]));
  assert.throws(() => coursesFromRows([["姓名"], ["simulation"]]));
});
