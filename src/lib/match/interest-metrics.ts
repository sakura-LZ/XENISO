import { areas } from "../onet/contracts";

/**
 * RIASEC 兴趣的补充度量：六边形码距离 + 环形 EMD（Earth Mover's Distance）。
 *
 * 为什么需要它们：
 * - 单看六维 Pearson 只能比较“轮廓形状是否同向”，对“峰在哪个字母、峰之间隔几步”不敏感。
 * - RIASEC 是六边形相邻结构（R–I–A–S–E–C 首尾相邻），Iachan/O*NET 都用高码距离。
 * - EMD 把六维当成圆周上的概率质量，能反映“峰的位置与分布差异”。
 *
 * 重要边界：
 * - 这两个指标目前只作**诊断与解释**，不替换展示分、不参与排序，避免在未验证的度量上换挡。
 * - 用户侧不需要人群常模：Pearson 对线性量尺不变；高码是秩（scale 无关）；EMD 先做个体内
 *   z 标准化（ipsatization）再加正值归一化，消除“打分松紧/反应风格”，不需要训练样本。
 *   真正的代表性常模（例如医学人群百分位）需要 500+ 份真实测评后另行标定，见 docs/MATCH_V2_PLAN.md。
 */
export type AreaScores = Record<(typeof areas)[number], number>;

const INDEX = new Map(areas.map((area, index) => [area, index]));

/** 六边形上两个 RIASEC 字母的最短步数：相邻=1、隔一=2、相对=3。 */
export function hexDistance(a: number, b: number) {
  const diff = Math.abs(a - b);
  return Math.min(diff, areas.length - diff);
}

export function highPointCodes(scores: AreaScores, k = 3) {
  return [...areas]
    .map((area, index) => ({ area, index, value: Number.isFinite(scores[area]) ? scores[area] : Number.NEGATIVE_INFINITY }))
    .sort((a, b) => b.value - a.value || a.index - b.index)
    .slice(0, k)
    .map((item) => item.area);
}

/** 六边形码相似度：1 − mean(d_hex(top3_user[k], top3_occ[k])) / 3，取值 0–1。 */
export function hexCodeSimilarity(userScores: AreaScores, occupationScores: AreaScores, k = 3) {
  const userTop = highPointCodes(userScores, k);
  const occupationTop = highPointCodes(occupationScores, k);
  const distance = userTop.reduce((sum, area, position) => {
    const a = INDEX.get(area), b = INDEX.get(occupationTop[position]);
    return a === undefined || b === undefined ? sum + 3 : sum + hexDistance(a, b);
  }, 0) / k;
  return { user_top3: userTop, occupation_top3: occupationTop, mean_hex_distance: distance, similarity: 1 - distance / 3 };
}

function mean(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
function sd(values: number[]) {
  const m = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - m) ** 2)));
}

/**
 * 个体内标准化（ipsatization）：先按本人六维的均值/标准差做 z 分，再平移到非负并归一化。
 * 作用是让 EMD 只比较“峰的位置与分布形状”，不奖励整体打分高、也不受打分松紧影响；
 * 不需要任何外部常模或训练数据。剖面完全平坦时返回均匀分布（EMD 恒为 0，由上游判为未知）。
 */
export function shapeDistribution(values: number[]): number[] {
  if (!values.length || values.some((value) => !Number.isFinite(value))) return values.map(() => 1 / Math.max(1, values.length));
  const m = mean(values), s = sd(values);
  const z = values.map((value) => (s > 1e-9 ? (value - m) / s : 0));
  const min = Math.min(...z);
  const shifted = z.map((value) => value - min);
  const total = shifted.reduce((a, b) => a + b, 0);
  return total > 1e-9 ? shifted.map((value) => value / total) : values.map(() => 1 / values.length);
}

/** 6×6 最小费用流，求两个分布之间的 Wasserstein 距离；cost 用六边形步数 / 3。 */
function circularWasserstein(p: number[], q: number[]): number {
  const n = p.length;
  const source = 0, sink = 1 + n + n, nodes = sink + 1;
  type Edge = { to: number; cap: number; cost: number; rev: number };
  const graph: Edge[][] = Array.from({ length: nodes }, () => []);
  const add = (from: number, to: number, cap: number, cost: number) => {
    graph[from].push({ to, cap, cost, rev: graph[to].length });
    graph[to].push({ to: from, cap: 0, cost: -cost, rev: graph[from].length - 1 });
  };
  const mass = Math.min(p.reduce((a, b) => a + b, 0), q.reduce((a, b) => a + b, 0));
  for (let i = 0; i < n; i++) {
    if (p[i] > 1e-12) add(source, 1 + i, p[i], 0);
    if (q[i] > 1e-12) add(1 + n + i, sink, q[i], 0);
    for (let j = 0; j < n; j++) {
      if (p[i] > 1e-12 && q[j] > 1e-12) add(1 + i, 1 + n + j, Math.min(p[i], q[j]), hexDistance(i, j));
    }
  }
  let flow = 0, cost = 0;
  while (flow < mass - 1e-12) {
    const dist = Array.from({ length: nodes }, () => Number.POSITIVE_INFINITY);
    const inQueue = Array.from({ length: nodes }, () => false);
    const previous: { node: number; edge: number }[] = Array.from({ length: nodes }, () => ({ node: -1, edge: -1 }));
    dist[source] = 0;
    const queue = [source];
    inQueue[source] = true;
    while (queue.length) {
      const node = queue.shift()!;
      inQueue[node] = false;
      graph[node].forEach((edge, index) => {
        if (edge.cap <= 1e-12) return;
        const next = dist[node] + edge.cost;
        if (next < dist[edge.to] - 1e-12) {
          dist[edge.to] = next;
          previous[edge.to] = { node, edge: index };
          if (!inQueue[edge.to]) { queue.push(edge.to); inQueue[edge.to] = true; }
        }
      });
    }
    if (!Number.isFinite(dist[sink])) break;
    let bottleneck = mass - flow;
    for (let node = sink; node !== source; node = previous[node].node) {
      const { node: from, edge: index } = previous[node];
      bottleneck = Math.min(bottleneck, graph[from][index].cap);
    }
    for (let node = sink; node !== source; node = previous[node].node) {
      const { node: from, edge: index } = previous[node];
      const edge = graph[from][index];
      edge.cap -= bottleneck;
      graph[edge.to][edge.rev].cap += bottleneck;
    }
    flow += bottleneck;
    cost += bottleneck * dist[sink];
  }
  return cost;
}

/** 高斯核/环形 EMD 相似度：1 − W1 / 3（六边形最大步数 3），取值 0–1。 */
export function emdSimilarity(userScores: AreaScores, occupationScores: AreaScores) {
  const user = shapeDistribution(areas.map((area) => userScores[area]));
  const occupation = shapeDistribution(areas.map((area) => occupationScores[area]));
  const distance = circularWasserstein(user, occupation);
  return { distance, similarity: 1 - Math.min(1, distance / 3) };
}

export function pearson(a: number[], b: number[]) {
  const ma = mean(a), mb = mean(b);
  let num = 0, va = 0, vb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - ma, y = b[i] - mb;
    num += x * y; va += x * x; vb += y * y;
  }
  return va > 1e-12 && vb > 1e-12 ? num / Math.sqrt(va * vb) : 0;
}

export type InterestMetrics = {
  shape: { correlation: number; score: number };
  hex: { user_top3: string[]; occupation_top3: string[]; mean_hex_distance: number; similarity: number };
  emd: { distance: number; similarity: number };
  note: string;
};

export function interestMetrics(userScores: AreaScores, occupationScores: AreaScores): InterestMetrics {
  const user = areas.map((area) => userScores[area]);
  const occupation = areas.map((area) => occupationScores[area]);
  const correlation = Math.max(-1, Math.min(1, pearson(user, occupation)));
  const hex = hexCodeSimilarity(userScores, occupationScores);
  const emd = emdSimilarity(userScores, occupationScores);
  return {
    shape: { correlation, score: 100 * (correlation + 1) / 2 },
    hex,
    emd,
    note: "六边形码与 EMD 只作诊断，不改变展示分与排序。三者一致时“轮廓形状”结论更稳；分歧时说明候选轮廓接近或量尺假设敏感，应把兴趣分读成探索提示而不是匹配度。",
  };
}

/** 两个岗位顺序的 Kendall τ（只用于诊断指标一致性，不参与打分）。 */
export function kendallTau(orderA: string[], orderB: string[]): number | null {
  const common = orderA.filter((id) => orderB.includes(id));
  if (common.length < 2) return null;
  const rankB = new Map(orderB.map((id, index) => [id, index]));
  let concordant = 0, discordant = 0;
  for (let i = 0; i < common.length; i++) for (let j = i + 1; j < common.length; j++) {
    const a = rankB.get(common[i])! - rankB.get(common[j])!;
    const b = i - j;
    if (a * b > 0) concordant += 1;
    else if (a * b < 0) discordant += 1;
  }
  return concordant + discordant === 0 ? null : (concordant - discordant) / (concordant + discordant);
}
