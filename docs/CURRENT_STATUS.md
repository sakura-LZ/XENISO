## 2026-10-24 · 交流社区新增固定话题库（#话题）与站内搜索增强，已本地验证、迁移未执行、未发布

社区从「求助/经验两类 + 标题正文搜索」扩展为「再加固定话题库」：

- 固定话题 12 个（`maths 数学基础` … `mindset 选择与心态`），**一条帖子选 1–3 个**；话题 id 只给数据库和代码用，界面一律显示 `#中文标签`。清单与新增话题的两处同步要求见 [社区话题](COMMUNITY_TOPICS.md)。
- 发帖表单新增话题选择器（`aria-pressed`，选满 3 个后未选中的禁用，未选 ≥1 不允许发布，错误文案「至少选 1 个话题 / 最多选 3 个话题」）；帖子卡片显示可点击的话题 chip，点击即按该话题筛选；工具栏新增「话题」行（全部话题 + 12 个带计数的 chip）。
- 搜索框：即时过滤标题、正文与话题 label；支持 `#数学基础` / `#maths` / 全角 `＃` 话题语法，关键词之间是 AND；命中词在标题/正文里用 `<mark>` 高亮（只渲染文本片段，不用 innerHTML）；显示「找到 N 条 / 共 N 条」计数与「清除筛选」；Esc 清空、Enter 不提交；空态区分「没搜到」「这个话题还没有帖子」「这一类还没有帖子」「还没有帖子」。
- 读和搜仍然要求邮箱已验证（本轮明确不改这个门槛）；未登录页的两条示例帖也带话题 chip，仍标注「示例 · simulation」。
- 服务端：GET 先调 `community_list_v2`，POST 有话题时先调 `community_publish_v2`；仅在 PostgREST `PGRST202` / 「函数不存在」时回落到旧 RPC，并返回 `topics_supported:false` / `topics_stored:false`，其它错误仍按 503 报。前端在降级时隐藏话题选择器，只留一行「话题暂不可用，帖子仍可正常发布。」。
- 新增 additive 迁移 `supabase/migrations/202610240001_community_topics.sql`（topics 列 + 0–3 与白名单 check + 两个 v2 函数 + 与旧迁移一致的 revoke/grant）。**本机没有数据库写权限，迁移未执行**；需在 Supabase SQL Editor 粘贴执行后才进入 v2 路径。
- 同步更新 `/guide` 社区四步说明（新增话题与搜索两条、读帖子需验证邮箱）。

实际执行与结果：
- `npx tsc --noEmit` 0；定向 `npx eslint`（lib/route/tsx/tests）0；`npx tsx --test tests/community.test.ts` **9/9**；`npm test` **211 项 / 210 通过 / 1 失败**，唯一失败为既有 `tests/knowledge.test.ts` 源规范化断言（本轮未改该文件）。
- 隔离发布树 `work/forum-build-20261024`（junction node_modules，不含 `.next`）`npm run build` **退出 0**，`/community` 在构建清单内。
- 浏览器：未登录态 1440/390 截图（`limen_project_files/work/forum-impl/`）；登录态界面用**预览副本 + 接口替身**（`work/community-preview`，端口 3012，演示帖子明确标注）截取，见 `work/forum-member/`：默认墙、`跨考` 搜索（找到 3 条）、`#编程入门` 筛选（找到 1 条）、发帖选话题 2/3。工具报告均无控制台错误、无横向溢出。

边界与未验证：真实登录态未端到端验证（没有已验证邮箱账号，未伪造）；迁移后的 `*_v2` 成功路径未在真实 Postgres 跑过，当前生效的是旧 RPC 降级路径；未部署。

## 2026-10-24 · 数字人文字链路端到端复测通过（本机 dev，隔离浏览器），音视频/ASR 仍未验收

- `POST /api/session` 201；`GET /api/avatar/session` 对 medicine / biomed_eng / cs_ai / med_informatics 四组均 `configured:true`；本机与正式域名一致。
- 真实建会话：`POST /api/avatar/session?presenter=cs_ai` 200、`error_code:0`，返回 `resource_pack`（SCM20_001 / 1080×1920）、room、`socket_io_url=ttsa-gateway-lite.xingyun3d.com`、`e2e ws_url=wss://e2emp.xingyun3d.com`；HMAC 签名被 nebula-agent 接受，凭据与额度正常。
- 浏览器（ego lite，隔离 TaskSpace，1440×900）：从 `/experience` 选任务 → 点「接通导师」→ 约 57 秒进入「已接通」，`canvas=1`；自动同步任务后收到真实导师回复；文字提问「这个取舍在真实项目里常见吗？」→ 收到第 2 条真实回复；点「断开」→ `data-link=closed`、「已断开。再接通会重新同步当前任务。」；`page_errors=0`。
- 限制：本机 ego lite 无顶层窗口、CDP `Page.captureScreenshot` 在渲染页面超时，**未取到数字人画面截图**（不是产品报错）；麦克风/ASR、音频播放与口型质量本轮未验。证据文件 `work/avatar-check/`（api-result.json、ui-result-01/02.json，已脱敏）。

## 2026-10-24 · Match 扩到「9 特化 + 医学」、兴趣补三度量；R1 职业技能匹配一并提交，已推送 main（Vercel Git 集成构建）

Match 候选集从 4 个组级方向扩到 10 个方向：`ml_cv` / `software` / `llm_agent` / `devices` / `signals` / `imaging_eng` / `clinical_data` / `health_systems` / `med_nlp_kg` / `medicine`。岗位粒度改为单个特化：

- `scripts/match-standards-onet.ts` 改为按特化生成（不再按组等权）：兴趣 = 该特化候选 SOC 的 OI 六维等权平均（编辑性聚合，locator 逐项列出每个 SOC 原始 OI）；技能 = 该特化候选 SOC 中第一个未被 O*NET Recommend Suppress、IM/LV 齐全的分量。生成 `data/match/occupations.official.json`：10 条、每方向 7 项技能、1 个 `must_have`；`onet-crosswalk.json` / `skill-rubric.json` 同步重生成。
- 招生映射 `scripts/match-admissions.ts` 升级 `limen-admission-occupation-map@3.0`：组级招生出口展开到组内特化（cs_ai→ml_cv/software/llm_agent 等），7 条招生记录同步重生成；`catalog.official.ts` 改为官方标准优先，空文件才退回旧 seeds。
- **兴趣三度量（新增）**：`src/lib/match/interest-metrics.ts` 实现 RIASEC 高码、六边形距离、环形 EMD（6×6 精确最小费用流）、个体内 z 标准化（ipsatization，不需要任何人群常模/训练数据）、Kendall τ。`engine.interest()` 的 detail 增加 `hex_code_similarity` / `emd_similarity` / 高码，报告新增 `interest_metric_agreement`（三指标两两 τ）；**展示分与排序仍只用轮廓相关**，补充度量只作诊断，避免在未验证的度量上换挡。`/match` 页面同步展示。
- 合成演示 `simulation.ts` 改为 10 个方向各一条不同的合成兴趣轮廓；测试同步更新。

关键诚实结论（已写入报告 limitation 与 `MATCH_V2_PLAN.md`）：10 个官方方向的 O*NET 兴趣轮廓两两相关 **均值 0.80 / 最大 1.00**（`ml_cv~med_nlp_kg`、`devices~signals` 为 1.00），`interest_diagnostics.discriminative = false`。这说明扩到细粒度后**兴趣维度对排序信息量很低，顺序主要由能力准备度与资格决定**——不是算法错误，而是候选集共享 SOC 的结构性限制；也正好说明为什么 R1 要同时呈现职业技能差距。

实际执行：
- `npx tsx scripts/match-standards-onet.ts` → 10 方向 / 每方向 7 项 / 未映射仅 `machine_learning`、`data_management`（`med_nlp_kg` 另因 O*NET Suppress 缺 `python`），退出 0。
- `npx tsx scripts/match-admissions.ts` → 7 条，`occupation_ids` 已按特化展开。
- `npx tsc --noEmit` → 0；`npm test` → **217 项 / 216 通过 / 1 失败**（唯一失败仍是既有 `tests/knowledge.test.ts` 的 `normalizeSourceUrl`，本轮未改 `src/lib/knowledge.ts`）。
- 隔离构建副本 `work/match10-build-20261024`：`npm run build` 退出 0，`/match`、`/report/initial` 均在构建清单内。
- 浏览器/演示口径：合成演示 10 方向全量出分；兴趣区分度提示、六边形码/EMD、三指标 τ、准备度 `must_have` 封顶与名次区间都可现场展示。**未做**：真实访客端到端（真实 O*NET 测评 + Supabase 画像）、真人标注评测（α=0.24 的旧结论仍然成立），因此不声明“预测准确率”。

## 2026-10-24 · 初步评价新增「职业技能匹配」维度（知识库职业要求 × 画像记录），已本地验证、未发布


R1 从「画像 + 职业兴趣」扩展到「职业要求的技能」：新增第 05 块「职业技能匹配」。岗位侧要求不再取自方向手册的 5 条 `skills`，而是从知识库 `kb_records` 的职业标准/真实招聘原文里整理：

- 新增 `data/knowledge/skill-requirements.spec.json`（编辑归并：只写 `record` / `field` / `needle`）和生成脚本 `scripts/knowledge/build-skill-requirements.ts`（`npm run knowledge:skill-requirements`）。脚本回到 `data/knowledge/*.collected.json`，断言 needle 是原文连续子串后逐字截取 `quote`，并记录 `record_id` / `quote_start` / `quote_end` / 来源 URL；任一 needle 对不上即整次构建失败。
- 生成 `data/knowledge/skill-requirements.json`：10 个方向 / 61 项技能 / 62 条原文引用，全部由脚本从原文回查得到，没有手写 quote。
- 新增 `src/lib/skill-requirements.ts`（zod 结构校验 + 方向索引）与 `src/lib/skill-match.ts`（画像课程/项目/论文/竞赛/技能自评/英语字段 → 三态「有记录 / 仅自述 / 信息不足」）。只做名称/别名文本匹配，**不评分、不排序、不合成适合度**；短英文缩写（sql/his/ct…）按整词匹配，避免 `ct` 命中 `project`。
- `initialReport()` 输出新增 `occupation_skills`（仅兴趣问卷命中的候选方向，最多 3 个），R1 页面在四栏之后新增第 05 块：方向名 + 职业标签 + 逐项状态 + 「原文与记录」折叠（原文 quote、机构链接、record id、命中的画像字段）+ 覆盖率说明 + 「五个板块各自独立」结语。空态为「暂无：先完成职业兴趣问卷，才会出现候选职业。」
- 报告契约 `data/report_contract.json` 补 `occupation_skills_with_knowledge_source` / `skill_evidence_status_against_occupation_requirements`；AI 解释证据新增 `kind: "skill"`，只引用知识库已有 `record_id` 与 `quote`（`/api/reports` R1 证据），禁止模型自行补岗位要求。

实际执行与结果：
- `npx tsx scripts/knowledge/build-skill-requirements.ts` → 10 方向 / 61 项 / 62 条引用，所有 needle 命中，退出 0。
- `npx tsc --noEmit` → 0；targeted `eslint`（本次全部改动文件）→ 0；`npm test` → **206 项 / 205 通过 / 1 失败**，唯一失败仍是既有 `tests/knowledge.test.ts` 的 `normalizeSourceUrl` http 断言（本轮未改 `src/lib/knowledge.ts`）。
- 隔离构建副本 `work/skill-match-build-20261024`（junction node_modules，不动主 `.next`）：`npm run build` 退出 0，`/report/initial` 在构建清单内；复核修复数据后重跑仍退出 0。
- 浏览器实测（演示数据版 3011 / 真实空态 3000）：1440 与 390 下 05 块无横向溢出、无控制台错误、无加载失败图片；空态文案与「信息不足≠不具备」说明在位。
- 独立复核（复核员自写脚本，未复用实现逻辑）：62/62 条 quote 能按 `record_id + quote_start/quote_end` 在 96 个采集文件里逐字回查；无 score/rank/percentage/fit 字段；未发现编造岗位要求。复核提出 3 条 coverage_note 措辞不准确 + 省略号误标，已修复并复验：`ellipsis_start` 41→9、`ellipsis_end` 13→12（只保留真正句中截断），quote/needle/offset/record 未变，独立回查仍 62/62。

边界与未验证：职业技能要求是知识库原文的**编辑性归并**，不是官方统一招聘标准；`signals`、`med_nlp_kg` 只有单组招聘原文，`medicine` 只有培养目标/规培/博士后原文，覆盖薄弱点已在各方向 `coverage_note` 写明。本轮**未**走真实访客（真实 O*NET 测评 + Supabase 画像）的端到端流程，也**未**发布到 Vercel；`npm test` 的既有 1 项失败保持原样。独立复核证据见 `docs/testing/skill-match-20261024.md`（由独立复核员执行，非实现者；已含「修复后复验」小节）。

## 2026-10-24 · 画像台账行、初评空态、体验两模块、规划页收口，已发布

个人画像：能力底册的行尾动作列由固定 46px 改为自适应并加 `box-sizing`，行内「开始/填/改」不再被窄列挤压，职业兴趣那一行保持横向排列。

初评页：兴趣栏与知识缺口栏的空态统一为居中的「尚无记录」（兴趣栏保留开始问卷按钮）。

职业体验页：任务卡去掉概述长句；「模拟项目」「模拟面试」两个模块下各加一句说明——模拟项目「看材料、做三次判断并写下理由，最后得到一份可导出的成果。」，模拟面试「依次回答三个问题，说明你的取舍和依据，最后留下面试记录。」

行动规划页：封面操作行（刷新、恢复、回看 R1、重做职业体验）替换为一个「查看当前行动规划」链接；删除「正在同步你的画像与体验…」提示；未解锁区标题由「这一步还排不了」改为「尚未解锁」，并删掉「先看初步评价」「翻方向手册」两个入口。

发布：`npm run lint` 退出 0（另修掉并行会话在 community 里新引入的一条 `set-state-in-effect` 报错），隔离发布树 `npm run build` 退出 0，云端 build 通过。部署 `dpl_Gi1Fd9sVcEcjph5U1D9Xv5b37Wq3` 为 Production/Ready，别名 `xeniso-platform.vercel.app`、`limen-azure.vercel.app`、`xeniso-sakura-lzs-projects.vercel.app`。线上复核：初评页两处「尚无记录」；规划页有「查看当前行动规划」、无回看 R1/重做职业体验/正在同步提示/两个入口；体验页无概述长句、两句模块说明在位；画像页新网格规则已进线上 CSS；`/`、`/profile`、`/report/initial`、`/report/plan`、`/experience`、`/community` 均 200。

## 2026-10-24 · 初评四栏排版、体验页收口、首页流程文案，已发布

初评页：四个栏卡的字体统一为两种——小标题（h2/h3/dt/栏内小标题）用衬线体，正文用无衬线体并统一 15.5px；栏内的等宽第三体（序号、dt、雷达轴标签）全部改掉。底部「解释与下一步」整块（含 AI 报告、生成/查看按钮、数据说明与两个行动入口）替换为一个「查看报告」链接，指向四栏内容。

职业体验页：删除导师面板两句说明（能问什么、接通后知道什么）、「做完会留下什么」整块（记录/复盘/成果与「材料口径与边界」）、页头「第 3 步 · 职业体验」小字与「simulation · 合成材料」标签；任务里的做法选择收成两个模块「模拟项目 / 模拟面试」，删掉预览与说明文字；左栏标题「先从哪一类看」改为「分类」，分类名（AI / 计算机等）从 13px 等宽提升为 17px 无衬线加粗，大于下方方向按钮。

首页：删除「点击步骤展开详情」，四步说明按 oil-tone 规则重写（拆句、补动作顺序、保留 30 题与四栏等事实）。

验证与发布：每轮 `npm run lint` 退出 0，隔离发布树 `npm run build` 退出 0，云端 build 通过。上线部署依次为 `dpl_63tD…`（上一轮）、`dpl_3UubFa2gzEwDwxDVAQWx7DbbDN4v`（本轮最终），Production/Ready，别名 `xeniso-platform.vercel.app`、`limen-azure.vercel.app`、`xeniso-sakura-lzs-projects.vercel.app`。线上复核：首页无「点击步骤展开详情」且四步新文案在位；体验页无第 3 步小字、无 simulation 标签、无导师两句说明与「做完会留下什么」，出现「分类」「模拟项目」「模拟面试」；初评页无「解释与下一步」与两个行动入口，出现「查看报告」；`/`、`/experience`、`/report/initial`、`/report/plan`、`/community`、`/explore` 均 200。四栏字体规则与左栏字号规则已在线上 CSS 包中确认。

## 2026-10-24 · 首页/画像/初评按用户清单继续删字，已发布

按用户逐条清单删除首页首屏提示语与下跳链接、书册提示/翻页按钮/图版出处、首页整块文库介绍（标题、导语、入口与方向目录）、页脚来源与插画署名；画像页删除「还差 N 项」进度提示；初评页删除状态小字「尚无官方兴趣结果」、封面三个操作按钮、「本页怎么用」帮助块、「完成画像后查看…」提示，能力迁移空态改为「已经记录 暂无 / 迁移方向 暂无」，知识缺口空态句删除，报考条件四行值统一写「无」。

用户清单里另有若干条在当前源码已不存在（报告页的「规则版本/这份档案/兴趣结果/文字解读」表、「初步评价报告」副标题、「重做兴趣问卷」、画像页「未填写」「从昵称、院校、年级开始」「官方题目来源」、页脚依据段落），属另一会话先前重写时已删，本轮核对确认不再出现；「保留一个报告展开就行」表述不明确，未改动折叠结构。

发布：以 `da4189a` 为基线 + 当前前端文件组成隔离发布树，树内 `npm run build` 退出 0，云端 build 通过。部署 `dpl_63tDSLZYM1YpC2UcBE9mfovH2Kb9` 为 Production/Ready（别名 `xeniso-platform.vercel.app`、`limen-azure.vercel.app`）。线上复核：首页上述文字与页脚署名全部消失，画像页无「还差」、无「从昵称…」、无「官方题目来源」，初评页无状态小字/三个按钮/本页怎么用/完成提示，出现「已经记录 暂无」「迁移方向 暂无」，报考条件四行均为「无」；`/`、`/profile`、`/report/initial`、`/guide`、`/explore` 均 200；lint 0。

并行提示：本轮改动建立在另一会话 03:28 前后重写的画像页（台账式）与初评页（四栏卡片）之上，未回退其结构；该会话 03:26 之后的其他改动一并进入本次发布。

## 2026-10-24 · 12 处冗余小字删除并发布到正式站

按用户确认，删除上一轮"链接与小字检查"列出的 12 处候选小字：首屏四卡底部对照标签、流程「为什么排这里」、书册背面比喻、画像页档案编号/草稿印章/「已在册 N 项」/底部记录用途/「大约 8 分钟」、初评与规划的 R1‑R2 封面印章、文库侧栏「本页六块」、指南页眉小字、页脚英文口号；对应失效样式一并删除。技术要点见 [链接与小字检查](testing/link-copy-audit-20261024.md#删除与正式发布2026-10-24-0322)。

发布以 `da4189a` 为基线加本轮前端文件组成隔离发布树（不含 Match/数据未提交改动、不含 `.env.local`），树内 `npm run build` 退出 0（含 `/guide` 预渲染）。云端 build 通过，部署 `dpl_4pwqRTm3JHsAZjxXTg18UzUyv1pP` 为 Production/Ready，别名 `xeniso-platform.vercel.app`、`limen-azure.vercel.app`、`xeniso-sakura-lzs-projects.vercel.app`。线上 11 个路由 200，首页提问小字与主按钮、删词带/假帖子/底部说明、方向深链接均复核通过。

注意：本次部署后另一会话仍在改 `site-footer`、`page-theatre`、`theatre.css` 等，其新改动未包含在 `dpl_4pwq` 中；页脚口号曾被对方重写带回，已在源码再次删除。

## 2026-10-24 · 说明文字外移到使用指南，异域探索四步页减字

`/guide`（静态预渲染）改成教程式：首屏是四步路径图（`#start`），每个模块一节，各有界面小样（真实字段与状态拼成、标「示例」、`role="img"` + `aria-label`）、三条操作要点和一个进入按钮；后面是口径与边界 `#boundaries`、数据与来源 `#data`、隐私与保存 `#privacy`、名词表 `#glossary`（含六类兴趣）、常见问题 `#questions`。入口为页眉「?」、移动端导航「使用指南」与全站页脚，原先指向 `/guide` 的页脚死链已可用。

异域探索四步页按「只留对象名称、状态、主动作和一句操作约束」减字，解释统一指向指南锚点：个人画像删页头导语、兴趣行去掉评测器名；填写页删与分节说明重复的提示；兴趣问卷删量表设计说明与 R1 结尾劝告，新增「本页怎么用」；R1 删「附录：六类兴趣各自在问什么」（移入 `#glossary`）、口径说明、报考核验四处（移入 `#initial`）、页脚依据与结语；职业体验删页头导语、导师说明、两种做法说明与成果页导语；行动规划删页头 lede、设置三步解释、复盘与升学核验长导语；报告数据使用说明压成一句 + `#privacy` 链接。不计展开内容，可见文字：R1 −74%（2,270→600）、个人画像 −57%、填写页 −34%、行动规划 −32%、兴趣问卷 −28%、职业体验 −27%、首页 −28%。规范写入 [XENISO 设计系统 §9](XENISO_DESIGN_SYSTEM.md)。

验证：`tsc --noEmit` 0、生产 build 0（`/guide` 预渲染）、单测 197/198。唯一失败为 `tests/knowledge.test.ts` 的 `normalizeSourceUrl` 期望 `http://` 被拒绝；本轮未改 `src/lib/knowledge.ts`，属既有失败。截图证据在 `work/audit-shots/`：指南 1440 与 390 宽度无横向溢出、无控制台错误、无加载失败图片；四步页截图为未登录访客态（仅预期 401）。已推送 `main`（提交 `3f62662`，40 个 UI 文件）触发 Vercel GitHub 集成部署，部署 `4nrJEqQXxHspKwHp7UAi5N2A95AQ` 为 success，生产 https://xeniso-platform.vercel.app 上 /guide 与 12 个主要路由均 200，新版指南（四步路径图 + 模块小样）已生效。本次只发 UI 层，另一会话的 Match 引擎、知识库数据与测试改动仍未提交。未改数据库。

注意：工作区同时存在另一会话的改动（guide 版式、page-theatre/theatre.css、micro.css、site-footer 等），本条目只描述上述减字与指南范围；交付前以合并后的 build 结果为准。

## 2026-10-24 · 首页底部说明删除，已同步 Vercel

按用户要求删除原“话说在前面”底部三栏说明区，保留公共页脚来源署名。正常保存数据使用 Supabase，体验本机暂存与 simulation 示例使用浏览器存储，本轮不改变存储方式。

本地 lint、隔离 build、首页生成内容四项检查与 445 文件密钥扫描通过；正式云端 build、九项公开 HTTP 检查通过。正式域名 https://xeniso-platform.vercel.app 已指向 `dpl_8QgGAXApdCti36hahdrs8s4aCJuk`，Production/Ready。仅基于上一版发布副本删除该区块，未携带其他未提交改动、未改数据库或环境配置、未推送 GitHub。详见 [发布验收](testing/footer-cleanup-20261024.md)。

## 2026-10-24 · 首页目的、链接与交互提示修复，已同步 Vercel

首页改为问题引出平台目的，突出开始探索；删除静态假帖子/回复数、循环词带和固定耗时承诺。首屏四步仅作说明，目录十方向/四分类可直达；折叠详情增加展开/收起与 inert；返回改为明确上一级入口，修正问卷进度；收敛首页叠加动效、修复目录裁切和手机导航换行。

`lint`、工作区及发布副本隔离 `build`、Vercel 云端 build、445 文件密钥值扫描通过。全量测试 **197/198**，唯一失败为未修改的知识库 HTTP 高校源旧断言；不冒称全量通过。真实浏览器目录/分类/返回/翻页/折叠/键盘/菜单通过，1440/1024/820/390 无溢出或目录裁切，820/390 截图已查看。19 本机站内链接及正式站9项公开检查通过。

用户授权后已发布并 promote 至 https://xeniso-platform.vercel.app ，`dpl_2PR91GPiBNzwNRqavB6paB6vgibz`，Production/Ready。发布为 `da4189a` 已提交基线＋本轮13前端文件；未将其他未提交 Match/数据改动带入，不改环境配置或数据库，未推送 GitHub。详见 [本轮验收与局限](testing/home-clarity-20261024.md)。

## 2026-10-23 · Match 候选集改为「四大方向」（cs_ai / biomed_eng / med_informatics / medicine）

按用户要求把岗位粒度从「挑 3 个特化」改成「方向整体」，并把临床方向显式补进数据：`data/occupation_direction_map.json` 升到 1.1（三个方向各加方向级 `onet[]` + `onet_rationale`），`data/medicine_direction.json` 补 `onet[]`（`29-1215.00` 全科 direct / `29-1216.00` 内科 related）。临床映射补在 medicine 自己的文件里而不是方向映射里——后者已被 `src/lib/directions.ts` 合并，再加同名方向会出现两个 `medicine` 组。生成器改为：兴趣取方向级 direct SOC，技能按该方向各特化 direct SOC **等权加权**（`IM=Σw·IM_i`，合成 SE 用权重平方和），且每个方向统一尝试全部 9 个技能——旧版手挑 3 项导致「未映射 1 个只剩 2 项」的人为缺口已消除，现为**每方向 7 项**。产物 4 个方向（`cs_ai`/`biomed_eng`/`med_informatics`/`medicine`）全部通过 `match-2` 契约；7 条招生重映射（R1→`cs_ai`，R2→`biomed_eng`+`med_informatics`，映射版本升 2.0）。兴趣区分度由均值 0.780（判低）变为 **0.670 / 最大 0.870（判可区分）**，但属**边缘通过**（距 0.7 阈值仅 0.03），且方向级 SOC 选点会直接改变结论，已写入验收文档的脆弱点。真实个人模式四个方向全部出分并有名次（医学信息学 94.57/100、继续医学 96.46/59、生物医学工程 83.73/59、AI 计算机 78.44/59），注意兴趣最高的继续医学只排第 2——因关键项「临床问题理解」有缺口被封顶，属设计意图。`npm test` 198/198、`lint` 0、`build` 0。详见 [P1 验收 §10](testing/match-v2-p1.latest.md)。



## 2026-10-23 · Match 兴趣区分度诊断（回答「要不要为岗位另出题目」）

Match 报告新增 `interest_diagnostics`：对候选岗位兴趣轮廓两两求 Pearson，给出最大/均值、近重复对（r≥0.9）、`discriminative` 三值结论、用户画像是否平坦，以及阈值；判为低区分度时 `limitations` 自动追加说明、界面同步显示。实测：当时 3 个岗位 max r=0.80 / mean 0.78 / 近重复 0 → `false`；把 9 个特化全放入（探针）max r=**1.00**、近重复 **9 对**、兴趣分出现 `83.73`×3、`78.44`×2、`94.57`×2 —— 因为 `17-2031.00`（devices/signals/imaging_eng）、`15-2051.00`（ml_cv/med_nlp_kg）、`15-1211.01`（health_systems）各自共用同一 O*NET 画像，9 个特化实际只有 6 张不同兴趣画像。结论：区分度不足的根因是候选集共享画像，不是问卷分辨率，故只加诊断、不改权重、不编数据；自编岗位题会破坏与 OI 的可比性，需先做链接研究。新增 4 项测试。取证：`work/verify-interest-diagnostics.ts`，详见 [P1 验收 §9](testing/match-v2-p1.latest.md)。

## 2026-10-23 · LIMEN-Match V2 P1：官方数值标准、结构化招生、离线评测

接续 P0（`limen-match-v2.1` 引擎与契约），补齐「岗位侧没有真实数值 → 无法出分」的根本缺口：从 **O*NET 31.0 官方数据库文本表**（整包 13MB 在本机网络会超时，改用 ZIP 中央目录 + HTTP Range 部分解压）取 RIASEC OI 原值（1.00–7.00）、技能 IM/LV 及 N/SE/CI/suppress，生成岗位标准（`onet-31.0+limen-2026-10-23`）、9 技能 crosswalk（7 映射 + 2 显式 unmapped）与 `limen-skills-2` 量尺（LV2/4/6 锚点为官方原文）。**真实个人模式现已能出分**，附证据档位、置信度、缺口与招生条目；无测评时仍全部未知、不补零。招生侧从 320 条语料严格取证收 **7 条**（5 校，原文明确写路径者仅 22 条），未编造条目。评测集 336 对 × 双轮 672 行，**α=0.2422 未达标**、τ 仅 112 判定对 → 明确写「排序未被验证」，标注者身份写作编辑而非专家。详见 [P1 验收](testing/match-v2-p1.latest.md)、[评测报告](testing/match-eval.latest.md)、[招生覆盖](testing/match-admissions-coverage.md)。

## 2026-10-22 · CareerExplorer 对标规格第二次修订，待实施

根据用户对第一版MD的逐段反馈重写 [逐页改版规格](XENISO_CAREEREXPLORER_REDESIGN.md)：保留首页输入框和单一开始操作，能力/流程介绍不再跳过主线；首次画像与回访状态分开；画像、问卷、初评、项目/面试/成果、规划条件/结果、文库/阅读/比较、社区/账户等分别确定构图。新增81项具体动效记录、13条用户要求及逐页验收映射，核实Storyset Pana六个条目和许可、unDraw许可；三张录屏参考图保留。已检查文档编号与本地链接；尚未下载最终素材、制作高保真稿、修改应用或实施动效，未运行应用测试和重新部署。此规格替代第一版冲突内容与此前“首页七段功能汇总”，正式部署状态仍见下文。

## 2026-10-22 · 新版 Next.js 正式部署完成

GitHub `main` 应用提交 `49910b7` 已推送；Vercel `sakura-lzs-projects/xeniso` 部署 `dpl_9VpCUquLMayc2to4JERQjkyhybPm` 已成功 promote，https://xeniso-platform.vercel.app 已指向新版，READY。Production 四组数字人配置已同步，未改数据库结构。独立 HTML 原型仍不是正式入口。

续接本轮 lint、136/136 单测、隔离 build、本机5/5 smoke、客户端扫描54文件通过，保留多lockfile警告。正式域名26项无cookie/无Vercel绕过公开请求通过，包含真实知识库与O*NET题目。发布前真实API链业务检查全部通过，最后一个合成访客删除请求网络中断；已核实空测试账号并精确补清理，数据库复查测试窗口遗留0。原失败JSON保留，不冒称该轮全量通过。线上巡检及证据见 [发布记录](testing/xeniso-release-20261022.md)。音视频/ASR、口型、社区OTP与真实发帖未验收。

## 2026-10-22 · Opus 字号、规划生成与用户视频

同一 `public/previews/xeniso-opus-new.html` 已由 claude-opus-5-5 直接修改：正文桌面18px/手机17px，临床工作名称，本站规则生成行动规划并独立导出，条件改变后重新生成，可见页面/滚动/选择动效。社区使用用户8秒视频，实测循环播放、暂停、减少动态封面可用；空接口错误中文化。lint/隔离build/45模拟检查/36导出/三尺寸15页/额外动态检查通过，保留多lockfile警告。未部署；静态社区接口未开放，规划标记simulation。见[本轮验收](testing/xeniso-opus-motion.latest.md)。

## 2026-10-22 · 用户纠正：Opus直接改源码

当前同一入口`public/previews/xeniso-opus-new.html`已由claude-opus-5-5直接输出66项源码修改及CSS；执行者精确写入，六编辑源与响应重放一致。低价值小字从markup删除；4首页图+4新内页图各用一次。lint/隔离build/44模拟检查/三尺寸15页通过，未部署。上一轮“评审后Codex实施”被用户否定，本轮优先。见[直接实施与验收](testing/xeniso-opus-direct.latest.md)。

## 2026-10-22 · Opus 独立新设计

新增 `public/previews/xeniso-opus-new.html`，从原始预览分出，保留原HTML及之前XENISO稿。用户API三角色Opus评审、新生成4张场景图、居中桥景首页、横滑入口、精简内页及社区粒子。lint、最终隔离build、44模拟检查/35导出、15浏览器尺寸页面通过；保留构建警告及前两次并行源不完整失败。原生子智能体通道失败，实际评审为同API并行角色。未部署/改数据库/本任务未改TSX。见 [设计与指导](XENISO_OPUS_NEW.md)、[验收](testing/xeniso-opus-new.latest.md)。

## 2026-10-22 · XENISO 独立 HTML（最新设计交付）

用户改为由 Codex 直接修改并另存新文件，不调用 Claude。新入口 `public/previews/xeniso-pathways.html`，品牌 XENISO 异域同构，标语 Different Fields. Shared Potential.。首屏居中、桥景轻微上移、四张新生成图横向滑动、内页文案精简、文库资料说明折叠、社区改原生粒子。原 limen HTML 哈希未变，正式 TSX/数据库/部署未改。5 张图片实际生成成功（含视频参考图），48 项 DOM/模拟接口与滑动检查、35 次模拟导出、lint、隔离 build 通过；多 lockfile 警告保留。浏览器策略拒绝 file://，网页视觉验收未完成。见 [设计](XENISO_PREVIEW_DESIGN.md)、[验收](testing/xeniso-preview.latest.md)、[视频参考图与提示词](design-references/xeniso-community-video.md)。

## 2026-10-22 · 功能Preview已发布（最新部署状态）

用户要求外观继续设计时先上传其他部分，已发布 https://limen-br99jfa0q-sakura-lzs-projects.vercel.app ，部署`dpl_Cd6tcPJ3JXCrLXkrgK2PE4nph4ZA`为READY。知识库API/报告适配、多方向E1、四组数字人及Match首切片已进入测试版，沿用既有TSX界面，未包含或整合绿色HTML。正式域名仍指向原`dpl_FX6JWvRxbKyAEEd2RzxTLGd4ksYH`，Production变量未改。下方历史“仅本机未部署”现更新为“已部署Preview，尚未推广Production”。

本轮lint、130单测、云端build、30项线上检查通过，含真实知识库筛选、四组人物配置、V3医学体验私有保存/恢复、真实身份Match返回待审标准及合成账号删除。Preview保留Vercel登录保护，与正式版共用既有Supabase；未重迁移/入库，未重测LLM/O*NET真实生成、供应商音视频或OTP。见[验收](testing/backend-preview.latest.md)与[UI后续接入](BACKEND_PREVIEW_HANDOFF.md)。

## 2026-10-22 · 独立绿色 HTML 预览重构（本轮更新）

最新版 public/previews/limen-pathways.html。主导航：首页/异域探索/信息文库/交流社区；异域探索内为画像→初评→体验→规划。首页使用新生成的动画电影风格岩桥静态图v6（写实v5弃用）、DeepSeek式白色输入框、四个配图流程入口；画像双入口配图缩至168px/145px。删除重复探索标签、页脚暂停、底部手册入口。社区使用视频背景、站内登录/发布/删除/举报同源适配，不再放示例帖子或跳转正式社区。

44/44 DOM与SDK/API模拟检查通过，35次模拟导出；npm run lint、同盘隔离npm run build通过，保留Next多lockfile警告。本轮未进行浏览器视觉验收、真实数字人或社区邮箱/发布验收；HTML报告为本地结构记录。未覆盖正式TSX主题、未部署、未改数据库。见 [设计](PATHWAYS_PREVIEW_DESIGN.md)、[测试](testing/pathways-green-preview.latest.md)、[图片与视频提示词](design-references/media-generation-brief.md)。可编辑源与构建器在 work/pathways-redesign/，一次性revise脚本不得重跑。

# LIMEN 当前状态（2026-10-21 · V4 主线已实测）

## 按方向分配星云人物（2026-10-22，本机已接入，未部署）

用户最新分配已落实为四组：新医生应用→医学带教（内科学/外科学/妇产科学/儿科学）；原医学男性应用→医学信息学；女性人物→医工器械/信号/影像及医学AI产品经理；计算机男性人物→AI/计算机三细分。前端只传白名单别名，服务端选择应用，共用SDK。新增MEDICINE配置用于新医学会话；原APP配置保留清理历史医学v1/v2会话，无新增迁移。

已持久化用户身份要求：各人物按当前场景介绍自己，不主动自称豆包或供应商品牌。统一提示用于开场、任务切换、每次文字提问；明确询问是否真人时如实说明AI模拟，不虚构真实资质。仍是普通ask提示，不把它当System Prompt强约束；本轮最终实测见[身份验收](testing/avatar-identities.latest.md)。

最新130/130顺序单测、43项代理mock、lint、当前src/scripts/tests的strict tsc、隔离生产build、51文件客户端扫描与5组HTTP smoke通过。医生和信息学真实开场/身份追问通过，分别自称内科带教医师、临床数据分析师，无豆包自称；最后真实接口`active_session: null`。根tsc曾扫到并行work旧副本失败、首轮build类型错误已修复，详见[本轮证据](testing/avatar-identities.latest.md)。上一轮器械/计算机验收（含计算机首轮异常）保留在[人物分组验收](testing/avatar-presenters.latest.md)，不当成本轮身份重验。

最新预览 http://127.0.0.1:3196/experience ，构建副本`work/avatar-identities/build-app`；原3001/3193/3195未动。四组配置仅存根`.env.local`，未部署云端。语音/ASR/口型及长期稳定性未验收；仍是模板和普通ask上下文，E2动态场景、E3成果同步、全局入口与视频未实现。

## 中国知识库扩充：九方向＋独立医学（最新，2026-10-21）

用户授权扩展已完成本轮代表样本：真实Supabase共38个中国官方来源、127条资料、270条事实实例（118个独立来源版本引文区间）；职业38、招聘10、招生34、行业23、学习22。九方向各有五类资料，医学单列，含51个院方科室目录入口、8个详细简介及8种专业培养/就业描述。招生涵盖交大/电子科大2027、北大/深圳大学2026历史项目，学校/学院/专业/年份与原文链接分开保留；不是全国完整招生库。字段、RLS、采集/分批导入、分页检索及报告引用见 [知识库说明](KNOWLEDGE_BASE.md)，逐方向数量与缺口见 [本轮验收](testing/knowledge-expansion.latest.md)。

增量context迁移及资料实际导入完成。`/explore`可切换九方向与医学、筛选学校/年份/科室、展开官方引文并导出。未改Match评分/O*NET/数字人。127/127单测、lint、TypeScript、隔离生产build、51文件密钥扫描、32项真实DB/RLS、21检索回归、22项HTTP及原5组smoke通过；浏览器九方向/医学/筛选/分页/下载、三宽度检查通过。曾发生413、内存分配失败、ECONNRESET及导航误提取，已保留诊断与修复。本轮真实模型探针AI_NETWORK超时未通过，不能沿用旧试点AI成功证明扩充完整闭环。

资料仍有324个显式缺失字段实例，招聘仅7个不同岗位样本；医学真实招聘、执业/规培及科室薪资未核实。统计局行业年平均工资和毕业去向落实率不改称专业/医生/应届工资或就业率。词法检索候选集合上限500条，扩量前需数据库索引与独立评测。新应用未部署，预览 http://127.0.0.1:3192/explore ，原3001/3187保持。下方旧试点/其他阶段记录保留历史范围。

## 多专业体验 E1（2026-10-21，基础模板已实现，未部署）

用户已授权 E1 实施并补充继续医学。当前共10个探索方向、14个基础模板、项目/面试28条路径；医学首批为内科学、外科学、妇产科学、儿科学，名称对照研招公开目录，不将学科、医院科室和学硕/专硕代码混用。每条路径有三阶段操作、实际计算或结构反馈、复盘、本机暂停恢复与导出入口；R2按实际角色和阶段展示。新场景不是实时生成；项目与面试复用同一套基础计算，面试增加证据、决策和修订提示，仍待后续丰富。

沿用现有 `/api/experience` 与 `experiences.payload`，V3模板ID/版本/选择经schema校验，结果在服务端重算；单行保存会覆盖上次所选成果，保留旧ECG/V2读取和V2草稿导出。用户并行建设数据库，本轮没有远端迁移。个人画像、操作与回答不自动发给星云；只保留主动连接时的角色/当前模板任务。E2动态生成/私有历史、E3经许可的成果同步仍未实施，按用户下一阶段指示推进。

113/113单测、lint、TypeScript、隔离生产build、51文件客户端密钥扫描和5组HTTP smoke通过；医学三阶段/刷新恢复/前步失效、算法/信号/流程结果、两页三尺寸、JSON/Markdown实际下载已验证。实际测试和局限见 [E1验收](testing/multi-experience-E1.latest.md)，后续数据库对接见 [E1契约](EXPERIENCE_E1_CONTRACT.md)。本轮未部署，未重新调用LLM/星云或验证V3真实云保存，不能沿用旧版本外部服务验收证明新功能全部通过。

## LIMEN-Match V1 首个切片（2026-10-21）

接续中断初稿，新增独立 `/match` 与只读 `/api/match`，统一职业/招生/画像 `match-1` 契约、`limen-skills-1` 标签和等级，提供四维确定性解释、资格否决、缺失覆盖率、技能差距和成果导出。三岗位合成演示已通过实际页面操作和下载；个人模式不回退合成分数。知识库8条候选可只读交接，数值标准保持待审。数据库结构以未执行SQL草案交付，未变更远端表/采集流程/P0–P5。

最终全项目78/78单测（Match21项）、lint、隔离生产build、原5组HTTP smoke及Match无身份/只读接口检查通过。构建隔离副本src/data哈希与工作区一致；保留Next多lockfile root推断警告。未验证真实个人Match GET成功、正式三岗数值标准、结构化招生规则、SQL/RLS或生产部署。详见 [契约与算法](LIMEN_MATCH_V1.md)、[测试证据与局限](testing/LIMEN-Match.latest.md)。下一阶段需审核真实评分数据与招生规则，再接入正式存储。

## 中国职业知识库第一阶段（2026-10-21）

医学AI产品经理试点已完成受控官方来源→证据提取/分类/去重→真实Supabase→检索API→R1/R2引用适配闭环。已入库7个中国来源、8条资料、23条原文事实（职业1、招聘1、升学2、行业2、学习2），默认CN，薪资/晋升/具体个人资格等缺失未补造。新增四张kb表强制RLS，公开只读核验资料，原文快照不可读；重复导入计数不变。资料结构和Match只读适配边界见 [KNOWLEDGE_BASE.md](KNOWLEDGE_BASE.md)。

本阶段知识库真实数据库检查21/21、检索回归11/11、真实模型引用保存10/10、生产HTTP12/12；全项目77/77单测、lint、生产build、50文件密钥扫描及原有5组smoke通过。本机3001预览已恢复，未改产品TSX/UI或数字人，未重新部署云端。真实模型验证为公开知识证据的R1/R2适配集成片段，未重跑完整画像/O*NET/体验主线。单岗位、单院校且词法小样本不能证明匹配准确率；扩展仍需下一阶段指示。详见 [本阶段验收](testing/knowledge-pilot.latest.md)。下文旧“招生资料尚无核验”改为“本试点已有带年份参考，个人资格仍未核定”，其他历史验收保持原范围。

## Vercel 交付补充（2026-10-21）

已按用户授权正式部署至 https://limen-azure.vercel.app ，Vercel 状态 READY，项目为 `sakura-lzs-projects/limen`。用户完成设备授权及邮箱验证，并明确授权八项提供方配置写入 Production/Preview；共十项服务端变量已配置，未上传 `.env.local`。Fluid Compute 已开启，无付费升级。数字人移除本机限制，使用 Supabase 持久会话归属与服务端 capability；两份会话/删除迁移已应用。Edge 正式域名实测首页、职业体验、匿名身份下数字人连接、任务自动回复、打断、文字往返和结束通过；结束后接口返回 `active_session: null`。本轮 lint 和45项单测通过，云端构建成功。记录见 `testing/VERCEL-cloud.latest.md`；既有数据库19项、代理mock19项和本机smoke5组仍是独立证据。终端直连正式域名超时，线上HTTP全量smoke未通过；麦克风/ASR/音频口型未验收。下文旧“仅本机数字人”状态由本节更新。

本文件是项目当前状态的唯一摘要。并行编辑范围与每部分交付见 [CLAUDE_COORDINATION.md](../CLAUDE_COORDINATION.md)，产品方案见 [V4_PRODUCT_DESIGN.md](V4_PRODUCT_DESIGN.md)。历史进度保留在 [PROGRESS.md](PROGRESS.md)。

## 当前结论

V4 的核心用户主线已由隔离合成访客完成浏览器实测，最近一轮全量构建、测试与响应式巡检通过。图片和接口证据分别记录在 `testing/V4-flow.latest.md`、`testing/avatar-live.latest.md`、`testing/community-live.latest.json`。这些记录证明合成验收链可运行，不代表真实用户语音体验、社区邮件或招生事实已经验收。

用户已决定移除旧心电工作台 UI。`/studio/ecg` 仅重定向 `/experience`；旧体验数据结构保留读取兼容。新版体验为医学 AI 产品经理场景，提供模拟项目与模拟面试两个模式、三阶段成果及复盘。

## 当前产品工作流

个人画像 → O*NET Mini-IP 官方 30 题 → 初步画像 R1 → 职业体验 → 目标方向、计划条件与周预算 → 行动规划 R2。

方向手册作为独立公开资源，支持九方向、入门项目、官方资料与比较；社区为登录后匿名发布的求助/经验区。允许继续医学或继续探索。招生项目仍待官方核验。

## 本轮已完成的代码改进

- 画像按培养阶段选择年级，补充其他填写、英语、科研方向/项目/成果、实验技能示例与所需帮助；成绩单保持本机解析。表单保留旧数据兼容、私有保存与读取。
- 页面减少重复草案、默认关闭和防御性说明，突出主操作、结果与下一步；隐私、未知、simulation 与招生待核验提示保留在对应位置。七个关键路由已完成桌面、平板和手机浏览器检查。
- 新体验具备三阶段产出、反思、本地暂停恢复、导出与私有保存；R2 可展开查看项目或面试成果。报告 AI 的体验证据现在包含场景、反思和三阶段 `outputs`，不发送可选数字人对话。
- 数字人 SDK 与同源服务端代理已接入，凭据只从服务端环境读取；连接由用户显式发起，支持生命周期清理。模拟检查与真实会话验收分开。
- 报告保存画像、测评及 R2 体验的输入指纹；读取拒绝过期/旧格式报告，生成 R2 也检查 R1 新鲜度。已实测修改画像会使 R1/R2 过期、修改体验只使 R2 过期；恢复原数据后报告恢复可读。计划条件改变会清除旧解读。UI 提供前往更新 R1 的入口，保留方向、预算与备选核对。
- 社区新增登录验证、匿名发帖、本人删除和举报代码及迁移；修复服务端 Auth SDK 缺少本地 session 的代码路径。社区迁移及合成身份权限实测 22/22；真实 OTP 邮件送达与真实成员注册仍未验证。
- 本轮继续清理过时迁移/旧 ECG 演示说明；R1 空方向提示去重，R2 职业关联级别改为中文。已保存 R1、R2 与体验成果在三尺寸实测，无内部字段/英文枚举泄漏；体验复盘编辑会撤下旧保存反馈和后续操作，已验证可重新读取原保存成果。

## 实际检查与证据边界

| 范围 | 已有实际记录 | 尚未验证 |
|---|---|---|
| 最新源码质量 | `npm run lint`、`npm test`（45/45）、`npx tsc --noEmit`、`npm run build`、`npm run check:client-secrets`（47 文件）均通过；`npm run test:smoke` 5组通过 | AI 长期可用性和超时率 |
| V4 核心主线 | 隔离合成访客完成画像保存/刷新、官方 O*NET 30 题计分、R1 真实 AI、三阶段新体验、R2 真实 AI/证据/下载；见 [`V4-flow.latest.md`](testing/V4-flow.latest.md) | 真实访客语音交互和非合成个人体验 |
| 报告新鲜度 | 保存并读取 R1/R2；修改画像令二者过期；修改体验只令 R2 过期；恢复输入后可读；计划条件变化会清除旧解读 | 由用户自行更换真实画像后的可用性观察 |
| 响应式 UI | 7 个关键路由在 1440×1000、820×1100、390×844 检查；本轮另核验已保存 R1/R2/体验九种组合无横向溢出及内部标识泄漏；截图位于被忽略的 `work/v4-responsive/` | 真实设备字体与辅助技术覆盖 |
| 数字人 | [`avatar-live.latest.md`](testing/avatar-live.latest.md)：真实文字会话、回复、主动提问、等待中断后续发、结束会话通过 | 麦克风/ASR、音频播放和口型 |
| 社区 | [`community-live.latest.json`](testing/community-live.latest.json)：真实迁移后合成账号权限 22/22 通过，包含匿名展示、跨用户隔离、删除与举报边界 | OTP 邮件送达、真实成员注册流程 |
| 内容事实 | O*NET 官方端点和合成答案计分有记录；方向手册保留原始来源及编辑性映射标记 | 中文译稿人工复核、招生项目官方核验 |

O*NET 合成探针、合成访客主线、数字人文字链路和社区权限是不同证据，不能互相替代。项目现已公开部署，不能将本机完整主线验收当作线上完整主线验收。

## 接续工作

1. 对 R1/R2 的生成解释做逐条证据核查，继续观察外部 AI 超时和“未知/空白”语义，不把单次成功当作稳定性保证。
2. 完成 Mini-IP 中文译稿的独立人工校对与来源说明；保留题号、维度、版本及原始选项映射。
3. 仅录入可追溯的招生官方信息；当前招生项目保持待核验，不补造资格或概率。
4. 补做麦克风/ASR、音频播放与口型验证；社区 OTP 邮件需在独立合成注册流程验证。

这些是未完成内容，不阻止当前合成访客的主线演示运行。公开部署已经完成，线上验证范围见顶部补充。

不得将未经核验的招生信息、模拟体验或关键词反馈解释为能力评分或报考资格。

