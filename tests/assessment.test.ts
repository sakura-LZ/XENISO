import test from "node:test";
import assert from "node:assert/strict";
import { assessmentSchema } from "../src/lib/assessment";
import { areas } from "../src/lib/onet/contracts";

// Contract fixtures only: no official response, personal data or real scoring.
const fixture = () => ({
  source: "onet_live", instrument: "Mini-IP-30", onet_version: "mock=true database", api_version: "mock=true API",
  returned_at: "2026-10-21T00:00:00Z",
  answers: Array.from({ length: 30 }, (_, i) => ({ index: i + 1, answer: 3 })),
  question_snapshot: Array.from({ length: 30 }, (_, i) => ({ index: i + 1, original_en: `mock=true activity ${i + 1}`, area: areas[i % 6], onet_version: "mock=true database" })),
  scores: areas.map((code) => ({ code, title: "mock=true", score: 10 })),
  careers: [], career_total: 0,
});

test("mock=true assessment: question text, six dimensions and per-item version remain linked", () => {
  const valid = fixture();
  valid.question_snapshot[0].original_en = "  mock=true original spacing  ";
  assert.equal(assessmentSchema.safeParse(valid).success, true);
  assert.equal(assessmentSchema.parse(valid).question_snapshot[0].original_en, valid.question_snapshot[0].original_en);
  for (const field of ["area", "original_en", "onet_version"] as const) {
    const changed = fixture();
    Object.assign(changed.question_snapshot[0], { [field]: field === "area" ? "unrecognized" : field === "onet_version" ? "mock=true other database" : "   " });
    assert.equal(assessmentSchema.safeParse(changed).success, false, `must reject mismatched ${field}`);
  }
  const unbalanced = fixture();
  unbalanced.question_snapshot[0].area = "investigative";
  assert.equal(assessmentSchema.safeParse(unbalanced).success, false);
});

test("mock=true assessment: duplicate associations and inconsistent career counts cannot enter reports", () => {
  const duplicated = fixture();
  duplicated.question_snapshot[0].index = 2;
  assert.equal(assessmentSchema.safeParse(duplicated).success, false);
  const missingPage = fixture();
  missingPage.career_total = 1;
  assert.equal(assessmentSchema.safeParse(missingPage).success, false);
  const impossibleCount = { ...fixture(), careers: [{ code: "15-2051.00", title: "mock=true", href: "https://example.invalid" }] };
  assert.equal(assessmentSchema.safeParse(impossibleCount).success, false);
});
