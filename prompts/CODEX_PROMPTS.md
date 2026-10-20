# 逐阶段给 Codex 的提示词（复制对应阶段即可）

## P0：只做技术验证（第一条消息）
你在开发 LIMEN「临界」。请先读 `LIMEN_Codex_V3/README_FIRST.md`、项目根目录 `AGENTS.md`、`LIMEN_Codex_V3/docs/00_SCOPE_AND_ACCEPTANCE.md` 和 `LIMEN_Codex_V3/docs/01_BUILD_PLAN.md`。现在仅执行 P0。再按需读 `docs/03_ONET_AND_DATA.md`、`.env.example`。
任务：搭建 Next.js/TS/Tailwind 基架，安全接入用户自己填入的轮换后O*NET密钥，实际测试 /about、questions_30、results、careers 的真实响应和 30题格式；初始化 Supabase 匿名身份、RLS验证两个用户无法互访。不要编造API测试结果，不写正式产品页面。末尾只给改变文件、运行命令、实测状态、阻塞点。完成后暂停。

## P1：画像/问卷
P0确认后执行。只读 `data/profile_schema.json`、`docs/02_UI_SPEC.md`、`docs/03_ONET_AND_DATA.md`。做个人资料分步表单：基础必填/其他选填、成绩CSV/XLSX浏览器解析、草稿保存、字段验证；Mini-IP展示来自官方接口或经过明确版本管理的原始条目与经人工审读中文翻译；按题号提交1–5答案。中文翻译缺漏时明示并阻止该条目的正式公开量表发布，不得填充假的官方数据。提供填报/断点/删除测试。完成后暂停。

## P2：知识库 + R1
只读 `data/occupation_direction_map.json`、`data/report_contract.json`、`docs/05_REPORT_ENGINE.md`。实现3一级/9细分方向浏览、职业链接与官方来源；完成R1报告：用 O*NET 六维/职业返回+用户画像的真实字段生成可追溯技能证据、最多3个探索方向和未知项。写5个极端输入的回归测试。完成后暂停。

## P3：职业体验（一个工作台做精）
只读 `docs/04_EXPERIENCE.md`、`data/experience_seed.json`、`docs/02_UI_SPEC.md`。先实现算法工作台：合成数据的阈值滑块、可计算混淆矩阵、跨设备外部验证对比、导出模型评价卡、明确合成标记。3次有意义的操作、手机可用，不要只是题目/漫画/静态图。其它两个角色先只做知识讲解和待开发状态，绝不能宣称已完成。完成后暂停。

## P4：R2 + 转型规划
只读 `docs/05_REPORT_ENGINE.md`、`data/report_contract.json`、`data/occupation_direction_map.json`、`data/admissions.sample.json`。根据目标方向/体验反馈/课程与技能证据/计划年份+每周时间生成可追溯R2，展示课程与技能准备、可选科研项目任务、根据升学方式安排的阶段计划、已核验招生信息或待核验任务。不创造导师/院校数据。完整验证T1–T6。完成后暂停。

## P5：UI统一/联测/部署
只读 `docs/02_UI_SPEC.md`、`docs/00_SCOPE_AND_ACCEPTANCE.md`。统一组件与响应式，不重写业务逻辑；检查匿名身份隔离、API错误、弱网、所有表单状态、中文排版，跑lint/build/关键端到端测试，提供可演示URL、部署环境变量与3–4分钟Demo脚本，列出仍未实现功能。禁止用Mock伪装生产结果。
