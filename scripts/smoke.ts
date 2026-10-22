import assert from "node:assert/strict";

// Run against a local server. The checks adapt to either an unconfigured or configured local environment.
const origin = process.env.LIMEN_TEST_ORIGIN ?? "http://127.0.0.1:3001";
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
  const setupText = await setup.text();
  assert.match(setupText, /缺少配置|已配置/);
  assert.equal(home.headers.get("x-content-type-options"), "nosniff");
});
await check("cross-site sign-in and deletion rejected", async () => {
  for (const method of ["POST", "DELETE"]) {
    const response = await fetch(`${origin}/api/session`, { method, headers: { origin: "https://example.invalid" } });
    assert.equal(response.status, 403);
  }
});
await check("a new browser has no private identity or community access", async () => {
  const session = await fetch(`${origin}/api/session`);
  assert.equal(session.status, 200);
  assert.equal((await session.json()).user, null);
  assert.match(session.headers.get("cache-control")!, /no-store/);
  const community = await fetch(`${origin}/api/community`);
  assert.equal(community.status, 401);
  assert.match(community.headers.get("cache-control")!, /no-store/);
});
await check("unauthenticated private APIs rejected and uncached", async () => {
  for (const path of ["/api/profile", "/api/assessment", "/api/experience", "/api/reports?kind=R1", "/api/reports?kind=R2", "/api/avatar/session"]) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 401);
    assert.match(response.headers.get("cache-control")!, /no-store/);
  }
  const avatar = await fetch(`${origin}/api/avatar/session`, { method: "POST", headers: { origin: "https://example.invalid", "Content-Type": "application/json" }, body: "{}" });
  assert.equal(avatar.status, 403);
  const cloudAvatar = await fetch(`${origin}/api/avatar/session`, { headers: { host: "limen-preview.vercel.app" } });
  assert.equal(cloudAvatar.status, 401);
  const result = await fetch(`${origin}/api/onet/results`, { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: "[]" });
  assert.equal(result.status, 401);
  const session = await fetch(`${origin}/api/session`);
  assert.equal((await session.json()).user, null);
});
await check("all user-facing routes respond and keep their distinct purpose", async () => {
  for (const [path, text] of [["/profile", "认识现在的你"], ["/assessment", "发现你愿意投入的工作"], ["/explore", "方向手册"], ["/experience", "做一次具体工作"], ["/report/initial", "你的探索起点"], ["/report/plan", "让探索落到下一步行动"], ["/community", "把问题带来"], ["/account", "删除"]]) {
    const response = await fetch(`${origin}${path}`); assert.equal(response.status, 200); assert.ok((await response.text()).includes(text));
  }
  const legacy = await fetch(`${origin}/studio/ecg`, { redirect: "manual" });
  assert.equal(legacy.status, 307);
  assert.equal(new URL(legacy.headers.get("location")!, origin).pathname, "/experience");
});
console.log(`Local HTTP smoke: ${passed} checks passed; no live service acceptance claimed.`);
