# 职业知识库试点验收

日期：2026-10-21（America/Los_Angeles）。运行事件约为2026-10-22 03:40–04:09 UTC。仅本阶段知识库结果；Match 的业务实现和独立验收由并行任务维护。

## 结果

中国资料7来源、8记录、23个原文事实：职业1、招聘1、升学2、行业2、学习2。四来源有日级发布日期，三来源保持null；21个资料字段缺失项显式保留。实际连接Supabase，未使用本地假数据替代接口返回。

执行 `supabase db push --dry-run` 确认仅知识库迁移后已应用 `202610220003_knowledge_base.sql`；四张kb表已启用及强制RLS。`knowledge:prepare-import`校验原文/正文hash与事实offset后生成事务，`supabase db query --linked --file work/knowledge-pilot/import.sql`实际执行两次，均退出0，第二次仍是上述计数。未覆盖或删除其他业务表。

## 实际执行记录

| 命令 / 检查 | 结果 | 证据与边界 |
|---|---|---|
| `npm run knowledge:collect` | 通过；7来源8记录，五类齐全 | [采集审计](knowledge-collection.latest.json)；动态招聘为真实浏览摘录后自动提取，不是自动下载完整动态页 |
| `npm run knowledge:prepare-import` | 通过；7快照8记录 | 本地SQL约839KB，原文留在忽略目录work，无key |
| 两次真实导入 | 通过；计数不变 | 字节一来源两类别不计作两个独立来源 |
| `npm run verify:knowledge` | **21/21** | [真实数据库检查](knowledge-live.latest.json)：公开只读、快照拒读、anon/auth写入/修改/删除拒绝、来源/版本/证据、报告适配、合成报告保存恢复；测试身份删除，cleanupFailures=0 |
| 预设检索评测 | **11/11** | 8正例均检出唯一人工指定目标，precision/recall at k均1；3空结果案例通过。仅小样本词法回归，不能外推泛化或职业匹配准确率 |
| `npm run verify:knowledge:ai` | **10/10** | [真实模型记录](knowledge-ai.latest.json)：R1/R2适配的五类公开证据→真实模型kb引用→合成私有保存/恢复，cleanupFailures=0；不是完整画像/O*NET/体验HTTP流程 |
| `npm run build` | 通过 | Next.js16.4.2 webpack编译、TypeScript及所有路由构建通过，包含 `/api/knowledge`；同时可见并行任务 `/api/match` 和 `/match`，不将其成果计入本试点 |
| `npm run verify:knowledge:http` | **12/12** | [本机生产API](knowledge-http.latest.json)：真实8记录、CN默认、招生科目上下文、未覆盖/无关及8种无效参数 |
| `npm test` | **77/77** | 知识库12项，其余为现有/并行测试；无跳过 |
| `npm run lint` | 通过，零警告 | 全项目ESLint |
| `npm run check:client-secrets` | 通过，50文件 | 值不输出；构建产物未含配置凭据 |
| `npm run test:smoke` | **5/5组** | 本机原有页面、身份隔离、CSRF、无缓存、旧路由重定向；不代表线上完整验收 |

生产预览已恢复至 `http://127.0.0.1:3001`，本阶段未重新部署Vercel。没有修改TSX页面或数字人逻辑。

## 问题修正与证据边界

- 首次数据库保存恢复断言使用JSON字符串相等，因JSONB对象键序变化失败；改为结构深比较后通过，不降低事实或引用校验。
- 采集历史保留早期海外来源尝试，不能将旧批次数量当作当前中国入库量。旧历史中的动态摘录 `http_status:200` 曾来自内存Response而非网站请求；已修复采集器，最新审计对此不输出HTTP状态，以 `browser_visible_excerpt` 和hash说明真实取证方式。
- 构建曾发现知识库测试US地区值推断为string，改为明确 `KnowledgeSource` 类型后修复；并行Match测试的两个技能缺少画像契约必填 `evidence`，仅补空字符串维持未知语义后整库构建通过。
- 真实模型输出已逐条查看：保留小荷岗位职责中“抖音产品工作”差异、医疗背景加分与硬限制区别、同等学力适用人群、国内地区和2027周期；未生成薪资/晋升/录取概率。一次输出符合并不证明模型长期稳定。
- 已保存报告不会自动重写；新生成相关方向报告才携带kb证据。现有证据快照面板以JSON展示来源URL/机构，未新增专用引用UI。探索侧可调用API，本轮没有修改前端绑定。
- 报告每类最多一条，当前时间排序选择招生章程而非目录；需要考试科目须用 `category=admissions&q=408` 调完整目录记录。不能把片段报告当全部招生要求。
- 未取得行业就业/薪资统计、完整职业晋升路径、招生普通本科生具体专业资格、监管附件全文或实际科研在招名额。未知保持未知。
- 词法短语检索没有同义词理解；无全国覆盖、职业匹配效果或用户资格判定保证。数据>500条时须升级数据库索引与分页后再扩量。

详细结构、接口、重跑步骤与下一阶段建议见 [KNOWLEDGE_BASE.md](../KNOWLEDGE_BASE.md)。
