import test from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../src/lib/errors";
import { areas, encodeAnswers } from "../src/lib/onet/contracts";
import { OnetClient } from "../src/lib/onet/client";

// All responses below are deliberately mock=true; not official live evidence.
const about = { api_version: "mock-api", database: { name: "mock-database", url: "https://example.invalid" }, taxonomy: { name: "mock-taxonomy", url: "https://example.invalid" } };
const options = [1, 2, 3, 4, 5].map((value) => ({ value, name: `mock-option-${value}` }));
const questions = Array.from({ length: 30 }, (_, i) => ({ index: i + 1, area: areas[i % 6], text: `mock=true activity ${i + 1}` }));
const answers = questions.map((q) => ({ index: q.index, answer: (q.index % 5) + 1 }));
const mockFetch = (body: (url: URL) => unknown) => (async (input) => Response.json(body(new URL(String(input))))) as typeof fetch;

test("mock=true: answers sort by original index, without mutating input", () => {
  const reversed = [...answers].reverse();
  assert.equal(encodeAnswers(reversed), answers.map((a) => a.answer).join(""));
  assert.equal(reversed[0].index, 30);
});
test("mock=true: incomplete, duplicate, out of range and extra answer fields fail", () => {
  for (const bad of [answers.slice(1), [...answers.slice(1), answers[1]], answers.map((a) => ({ ...a, answer: 6 })), answers.map((a) => ({ ...a, extra: true }))]) {
    assert.throws(() => encodeAnswers(bad), (error) => error instanceof AppError && error.code === "INVALID_ANSWERS");
  }
});
test("mock=true: pagination retains original text, area and version", async () => {
  const client = new OnetClient("unit-test-placeholder", mockFetch((url) => {
    if (url.pathname === "/about/") return about;
    const second = url.searchParams.get("start") === "13";
    return { total: 30, start: second ? 13 : 1, end: second ? 30 : 12, answer_option: options,
      next: second ? undefined : "https://api-v2.onetcenter.org/mnm/interestprofiler/questions_30?start=13&end=30",
      question: second ? questions.slice(12) : questions.slice(0, 12) };
  }));
  const result = await client.questions();
  assert.equal(result.questions.length, 30);
  assert.equal(result.questions[12].original_en, questions[12].text);
  assert.equal(result.questions[12].index, 13);
  assert.equal(result.questions[12].area, questions[12].area);
  assert.equal(result.questions[12].onet_version, "mock-database");
});
test("mock=true: refuses duplicate indices and incorrect dimensions", async () => {
  for (const badQuestions of [[...questions.slice(1), questions[1]], questions.map((q) => ({ ...q, area: "realistic" }))]) {
    const client = new OnetClient("unit-test-placeholder", mockFetch((url) => url.pathname === "/about/" ? about : { total: 30, start: 1, end: 30, answer_option: options, question: badQuestions }));
    await assert.rejects(client.questions(), (error) => error instanceof AppError && error.code === "ONET_CONTRACT");
  }
});
test("mock=true: refuses untrusted pagination hosts before sending credentials", async () => {
  let calls = 0;
  const client = new OnetClient("unit-test-placeholder", mockFetch((url) => {
    calls++;
    return url.pathname === "/about/" ? about : { total: 30, start: 1, end: 12, answer_option: options, question: questions.slice(0, 12), next: "https://example.invalid/steal" };
  }));
  await assert.rejects(client.questions(), (error) => error instanceof AppError && error.code === "ONET_HOST");
  assert.equal(calls, 2);
});
test("mock=true: HTTP, malformed JSON, network and schema errors never return scores", async () => {
  const fetchers: (typeof fetch)[] = [
    async () => new Response("private upstream error", { status: 401 }),
    async () => new Response("not JSON"),
    async () => { throw new Error("private transport detail"); },
    async () => Response.json({ result: [] }),
  ];
  for (const fetcher of fetchers) {
    const client = new OnetClient("unit-test-placeholder", fetcher);
    await assert.rejects(client.results(answers), (error) => error instanceof AppError && !error.message.includes("private"));
  }
});
test("mock=true: submits exactly 30 codes; careers use all six official returned scores", async () => {
  const scores = areas.map((code, i) => ({ code, title: code, score: 10 + i }));
  let sent = "";
  const client = new OnetClient("unit-test-placeholder", mockFetch((url) => {
    if (url.pathname.endsWith("results")) { sent = url.searchParams.get("answers")!; return { result: scores }; }
    for (const score of scores) assert.equal(url.searchParams.get(score.code), String(score.score));
    return { total: 0, career: [] };
  }));
  const result = await client.results(answers);
  assert.equal(sent.length, 30);
  assert.deepEqual(result.scores, scores);
  assert.deepEqual(result.careers, []);
  assert.equal(result.career_total, 0);
});
test("mock=true: duplicate result dimensions fail before requesting careers", async () => {
  const client = new OnetClient("unit-test-placeholder", mockFetch(() => ({ result: Array.from({ length: 6 }, () => ({ code: "realistic", title: "mock", score: 10 })) })));
  await assert.rejects(client.results(answers), (error) => error instanceof AppError && error.code === "ONET_CONTRACT");
});
