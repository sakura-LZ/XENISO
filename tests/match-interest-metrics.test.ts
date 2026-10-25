import test from "node:test";
import assert from "node:assert/strict";
import { areas } from "../src/lib/onet/contracts";
import {
  emdSimilarity,
  highPointCodes,
  interestMetrics,
  kendallTau,
  shapeDistribution,
  type AreaScores,
} from "../src/lib/match/interest-metrics";
import { match } from "../src/lib/match/engine";
import { simulationInput } from "../src/lib/match/simulation";

const scores = (values: number[]): AreaScores => Object.fromEntries(areas.map((area, index) => [area, values[index]])) as AreaScores;

test("interest metrics: Pearson shape is invariant to affine response styles; high codes are rank-based", () => {
  const user = scores([6.2, 3.1, 4.4, 2.8, 3.9, 5.1]);
  const occupation = scores([5.4, 2.2, 5.0, 3.6, 4.8, 4.1]);
  const base = interestMetrics(user, occupation);
  const styled = interestMetrics(scores([6.2 * 1.7 + 3, 3.1 * 1.7 + 3, 4.4 * 1.7 + 3, 2.8 * 1.7 + 3, 3.9 * 1.7 + 3, 5.1 * 1.7 + 3]), occupation);
  assert.ok(Math.abs(styled.shape.correlation - base.shape.correlation) < 1e-12);
  assert.deepEqual(styled.hex.user_top3, base.hex.user_top3);
  // EMD 先做个体内 z 标准化，因此对正线性变换同样不变（只关心峰的相对位置）。
  assert.ok(Math.abs(styled.emd.distance - base.emd.distance) < 1e-9);
});

test("interest metrics: identical profiles score 1 / distance 0; opposite peaks diverge", () => {
  const profile = scores([7, 1, 1, 1, 1, 1]);
  assert.equal(highPointCodes(profile)[0], "realistic");
  const same = interestMetrics(profile, profile);
  assert.equal(same.shape.correlation, 1);
  assert.equal(same.hex.similarity, 1);
  assert.equal(same.emd.distance, 0);
  const opposite = interestMetrics(scores([7, 1, 1, 1, 1, 1]), scores([1, 1, 1, 7, 1, 1]));
  // R 与 S 在六边形上相对（3 步）：位置式高码距离会因 top3 平局而部分重合，但 EMD 应完全分开。
  assert.ok(opposite.hex.similarity < 0.6, `hex similarity=${opposite.hex.similarity}`);
  assert.ok(opposite.emd.similarity < 0.1, `emd similarity=${opposite.emd.similarity}`);
});

test("interest metrics: EMD is symmetric and normalized to 0–1", () => {
  const a = scores([6, 1, 2, 5, 4, 3]);
  const b = scores([1, 6, 5, 2, 3, 4]);
  const forward = emdSimilarity(a, b);
  const backward = emdSimilarity(b, a);
  assert.ok(Math.abs(forward.distance - backward.distance) < 1e-9);
  assert.ok(forward.similarity >= 0 && forward.similarity <= 1);
  assert.equal(emdSimilarity(a, a).similarity, 1);
});

test("interest metrics: ipsatized distribution is scale-free and sums to one", () => {
  const raw = [5, 3, 4, 2, 6, 1];
  const left = shapeDistribution(raw);
  const right = shapeDistribution(raw.map(value => value * 4 + 9));
  assert.ok(left.every(value => value >= 0));
  assert.ok(Math.abs(left.reduce((sum, value) => sum + value, 0) - 1) < 1e-9);
  for (let i = 0; i < raw.length; i++) assert.ok(Math.abs(left[i] - right[i]) < 1e-9);
  // 完全平坦时退化为均匀分布，不伪造“形状”。
  assert.deepEqual(shapeDistribution([3, 3, 3, 3, 3, 3]), [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6]);
});

test("interest metrics: Kendall τ detects agreement and reversal", () => {
  assert.equal(kendallTau(["a", "b", "c"], ["a", "b", "c"]), 1);
  assert.equal(kendallTau(["a", "b", "c"], ["c", "b", "a"]), -1);
  assert.equal(kendallTau(["a"], ["a"]), null);
  assert.equal(kendallTau(["a", "b", "c"], ["b", "a", "c"]), 1 / 3);
});

test("interest metrics: reports carry hex/EMD detail and cross-metric agreement without changing the headline score", () => {
  const report = match(simulationInput(), new Date("2026-10-23T00:00:00Z"));
  const first = report.results[0].interest;
  assert.equal(typeof first.detail?.correlation, "number");
  assert.equal(typeof first.detail?.hex_code_similarity, "number");
  assert.equal(typeof first.detail?.emd_similarity, "number");
  assert.equal(typeof first.detail?.high_point_user, "string");
  // 展示分由未舍入的 r 计算、detail 里的 r 保留两位，因此只能按“反推 r”核对到 1e-2 级。
  const implied = first.score! / 100 * 2 - 1;
  assert.ok(Math.abs(implied - (first.detail!.correlation as number)) < 0.011);
  assert.equal(typeof report.interest_metric_agreement.shape_vs_hex, "number");
  assert.equal(typeof report.interest_metric_agreement.shape_vs_emd, "number");
  assert.equal(typeof report.interest_metric_agreement.hex_vs_emd, "number");
  assert.match(report.interest_metric_agreement.note, /收敛效度/);
});
