# LIMEN-Match V1 Implementation Plan

**Goal:** 接续中断初稿，交付画像→三岗位→独立四维解释→可导出行动清单；真实数据缺失保持未知。

**Architecture:** 复用既有 profiles / assessments / experiences 与 knowledge，只读适配到 `match-1`。纯 TypeScript 确定性计算；独立 `/match`，不更改 R1/R2。来源摘录只输出待审核候选，禁止从文本猜测数值。

**Tech Stack:** Next.js App Router、TypeScript strict、zod、既有 Supabase RLS。

## Constraints

- 不改现有 P0–P5、远端数据库或采集任务，不输出环境值。
- 当前切片是本地 V1；不发布生产迁移，不承诺真实职业数值已审核。
- 项目禁止复杂多 Agent；本会话直接执行，不创建子代理。

## Tasks

- [x] 审查入口、当前阶段、上次中断、既有契约与提取器边界，记录 `docs/LIMEN_MATCH_V1.md`。
- [x] 完善 `src/lib/match/contracts.ts`、`adapters.ts`：明确技能版本、来源和未知语义，拒绝身份混用与自评冒充岗位标准。
- [x] 完善 `engine.ts`：独立四维、否决规则、时间与关联核验；`tests/match.test.ts` 使用独立手算夹具验算 100/80/50 兴趣分、50 准备分和排序。
- [x] 在 `workbench.tsx` 补差距与招生状态展示；修改资料撤下旧结果，支持成果导出。
- [x] 以 `scripts/match-contract.ts` 导出提取器 JSON Schemas；`scripts/match-handoff.ts` 生成只读候选清单。以文档 SQL 说明新增存储，不运行迁移。
- [x] 执行定向及全量测试、lint、隔离 build、HTTP/页面集成验收，记录真实结果和局限。
- [x] 更新当前摘要与提取器交接；阶段结束只报告完成项与未完成项。

## Verification commands

`npx tsx --test tests/match.test.ts`、`npm test`、`npm run lint`、`npm run build`。构建在 `work/match/build-app` 的源码副本运行，复用依赖且排除 `.env.local`，避免共享 `.next`。部署和远端 Auth/RLS 不由本地测试替代。
