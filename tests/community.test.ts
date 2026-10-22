import test from "node:test";
import assert from "node:assert/strict";
import { communityActionSchema, communityAuthSchema, postSchema } from "../src/lib/community";

test("community: publishing requires explicit consent and bounded public content", () => {
  const post = { kind: "help", title: "尋找科研方向建議", body: "希望了解如何開始一個跨學科研究項目。", public_consent: true };
  assert.equal(postSchema.safeParse(post).success, true);
  assert.equal(communityActionSchema.safeParse({ action: "publish", post }).success, true);
  assert.equal(postSchema.safeParse({ ...post, public_consent: false }).success, false);
  assert.equal(postSchema.safeParse({ ...post, account_id: "private" }).success, false);
  assert.equal(postSchema.safeParse({ ...post, body: "短" }).success, false);
});

test("community: delete and report accept only UUID ids and known reasons", () => {
  assert.equal(communityActionSchema.safeParse({ action: "delete", id: "00000000-0000-4000-8000-000000000001" }).success, true);
  assert.equal(communityActionSchema.safeParse({ action: "report", id: "00000000-0000-4000-8000-000000000001", reason: "privacy" }).success, true);
  assert.equal(communityActionSchema.safeParse({ action: "report", id: "not-an-id", reason: "other" }).success, false);
});
test("community: email verification accepts bounded OTPs, rejects injected account identifiers", () => {
  const input = { mode: "link", email: "simulation@example.invalid", token: "123456" };
  assert.equal(communityAuthSchema.safeParse(input).success, true);
  assert.equal(communityAuthSchema.safeParse({ ...input, token: "abc123" }).success, false);
  assert.equal(communityAuthSchema.safeParse({ ...input, account_id: "other-user" }).success, false);
});
