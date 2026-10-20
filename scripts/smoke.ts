import assert from "node:assert/strict";

// Run against a local server with the P0 console enabled and credentials absent.
const origin = process.env.LIMEN_TEST_ORIGIN ?? "http://127.0.0.1:3000";
const url = new URL(origin);
assert(["127.0.0.1", "localhost"].includes(url.hostname), "Smoke tests may only target localhost");
let passed = 0;
async function check(name: string, fn: () => Promise<void>) { await fn(); passed++; console.log(`PASS ${name}`); }
await check("home and setup pages", async () => {
  const home = await fetch(origin);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /LIMEN/);
  const setup = await fetch(`${origin}/setup`);
  assert.equal(setup.status, 200);
  assert.match(await setup.text(), /缺少配置/);
  assert.equal(home.headers.get("x-content-type-options"), "nosniff");
});
await check("cross-site sign-in and deletion rejected", async () => {
  for (const method of ["POST", "DELETE"]) {
    const response = await fetch(`${origin}/api/session`, { method, headers: { origin: "https://example.invalid" } });
    assert.equal(response.status, 403);
  }
});
await check("missing credentials produce explicit 503, never a fake user or scores", async () => {
  const login = await fetch(`${origin}/api/session`, { method: "POST", headers: { origin } });
  assert.equal(login.status, 503);
  assert.equal((await login.json()).error.code, "CONFIG_REQUIRED");
  const questions = await fetch(`${origin}/api/onet/questions`);
  assert.equal(questions.status, 503);
  assert.equal((await questions.json()).error.code, "CONFIG_REQUIRED");
});
await check("unauthenticated private APIs rejected and uncached", async () => {
  const profile = await fetch(`${origin}/api/profile`);
  assert.equal(profile.status, 401);
  assert.match(profile.headers.get("cache-control")!, /no-store/);
  const result = await fetch(`${origin}/api/onet/results`, { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: "[]" });
  assert.equal(result.status, 401);
  const session = await fetch(`${origin}/api/session`);
  assert.equal((await session.json()).user, null);
});
console.log(`Local HTTP smoke: ${passed} checks passed; no live service acceptance claimed.`);
