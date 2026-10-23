# Match V2 · P0 验收记录（2026-10-23）

## 本轮范围

`src/lib/match` 的算法正确性（D1–D3）：兴趣度量、能力准备度结构、排序与不确定性。
未做：岗位/招生数值标准建设（D4，P1–P3）、招生规则引擎（P3）、专家评测集（P4）。

## 实际执行的命令与结果

| 检查 | 命令 | 结果 |
|---|---|---|
| 类型检查 | `npx tsc --noEmit --incremental false -p tsconfig.json` | 退出 0，无输出 |
| 匹配模块 lint | `npx eslint src/lib/match src/app/match src/app/api/match tests/match.test.ts --max-warnings=0` | 退出 0 |
| 匹配单测 | `node --experimental-transform-types --import ./work/ts-run.mjs tests/match.test.ts` | 29 项全部通过（原 21 项） |
| 全量单测 | 同上逐文件运行 `tests/*.test.ts`（13 个文件） | 13/13 文件全部 `fail 0` |
| 运行期取证 | `node … work/verify-match-v2.ts` | 见下"实测输出" |

## 沙箱限制（重要，勿当成通过）

本机 shell 在当前沙箱下**对整个工作区只读**，因此：

- `npm test`（`tsx --test`）**无法运行**：tsx 依赖 esbuild，esbuild 需要子进程管道，沙箱返回 `spawn EPERM`。
  改用 Node 原生类型转换 + 一个解析钩子运行同一批测试文件（`work/ts-run.mjs`），测试代码本身未改动。
- `npm run build`（`next build --webpack`）**未执行**：需要写 `.next`，沙箱拒绝写入。
  → **构建验收仍待普通终端执行一次**，本轮只用 `tsc --noEmit` 证明类型层面一致。
- `scripts/match-contract.ts` **未执行成功**：需写 `data/match/*.schema.json`，被沙箱拒绝。
  → `data/match/{input,occupation,admission,user}.schema.json` 与 `skill-standard.json` **仍是 match-1 生成物**，与运行期 `match-2` 不一致。需在普通终端执行一次 `npx tsx scripts/match-contract.ts` 刷新。运行期只以 `contracts.ts` 的 zod 为准，代码未读取这些 JSON（已 grep 确认 `src/` 无引用）。
- `npm run lint` 全库仍有 **2 个既有警告**（`src/lib/reports.ts` 未使用的 `buildPathwayPlan` 导入与 `legacyTasks` 函数）。该文件在本轮之前即处于工作树修改状态，与 Match 无关，本轮未改动。

## 实测输出

### 1. simulation 三岗位（合成标准，V2 分数）

| 名次 | 岗位 | 兴趣 | r | 准备度 | 转型 | 招生 | 名次区间 |
|---|---|---|---|---|---|---|---|
| 1 | 医学 AI 产品经理 | 97.65 | 0.95 | 77.78 | 87.50 | 未知 | [1,1] |
| 2 | 临床数据分析师 | 74.54 | 0.49 | 66.67 | 87.50 | 未知 | [2,2] |
| 3 | 医学机器学习工程师 | 69.50 | 0.39 | 33.33 | 87.50 | 未知 | [3,3] |

稳定性 `stable`，权重扰动翻转 0 次。对照 V1：95.00 / 78.33 / 76.67 —— V2 把"关键维反向"的岗位拉开（ML 工程 76.67 → 69.50），符合实证预期。

### 2. 个人模式（真实 `catalog` 标准仍待审）

三个岗位：兴趣未知、准备度未知、资格 `unknown`、名次 `null`。
原因已定位到**岗位侧标准缺失**（不是用户量尺）：轮廓相关不需要量尺，缺的是 O*NET OI 与 IM/LV。

### 3. 个人模式 + 官方风格标准（模拟 P1 之后）

| 岗位 | 兴趣 | 准备度 | 覆盖 | 关键缺口 |
|---|---|---|---|---|
| 临床数据分析师 | 82.43 | 59.00 | 0.33 | 统计分析（当前 2 / 要求 3） |
| 医学 AI 产品经理 | 81.01 | 未知 | 0 | 无 |
| 医学机器学习工程师 | 84.57 | 59.00 | 0.33 | Python 编程（当前 2.8 / 要求 3） |

说明：①兴趣在"用户 scale=null + 岗位 OI 1–7"下正常算出，验证尺度不变性；②Python 自评 3 经可靠性衰减为 2.8，低于要求 3 → 触发关键项封顶 59；③覆盖率 0.33 使名次保持 `null`，不参与排序。

## 行为变化清单（相对 V1）

| 项 | V1 | V2 |
|---|---|---|
| 兴趣 | 各自 min-max 后 100×(1−平均绝对差) | 六维中心化后 Pearson 相关 → 100×(r+1)/2；平坦剖面判为未知 |
| 量尺 | 缺失即未知 | 不需要量尺（相关对线性变换不变） |
| 准备度 | 单层加权 min(c/r,1) | 两层：must_have 已知不足 → 封顶 59；其余加权 |
| 自评 | 直接使用 | 向中位 2 按可靠性衰减（自评 0.8，有核验 1.0） |
| 排序 | 兴趣降序→准备度降序 | 几何加权（0.5/0.5）→ 名次区间 + 稳定性 + 支配标注 |
| 报告 | 4 维 + 资格 | 增加 `sensitivity`、`rank_range`、`ordering_utility`、`dominated`、`detail` |
| 版本 | `match-1` / `limen-match-v1.0` | `match-2` / `limen-match-v2.0` |
