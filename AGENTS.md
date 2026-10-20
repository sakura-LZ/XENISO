# LIMEN Agent Instructions（项目根目录唯一 AGENTS.md）
- 以 `LIMEN_Codex_V3/README_FIRST.md` 为唯一入口；后续按 `docs/01_BUILD_PLAN.md` 当前阶段清单打开文件。若上述目录直接作为 repo 根，则去掉路径前缀。
- **阶段式开发**。每阶段交付可运行代码、实际测试记录与局限；没有用户下一阶段指示不擅自扩大范围。
- 代码：Next.js App Router / TypeScript strict / Tailwind / Supabase Postgres+RLS；推荐 zod 校验、可访问表单。优先少量明确依赖。
- 安全：Key 只能从 server-side env 读取；任何日志、UI、源码、提交历史都不含 Key；任何真实个人档案需要行级权限，访客匿名 Auth 必须有删除路径。不得把 key 截图或真实数据写入测试文件。
- O*NET：题目、题号、RIASEC、版本、answer code 原样关联；中文翻译需独立配置和来源注明；把 API 真实响应与本地假数据严格区分。API 失败必须报告，绝不声称测试成功。
- 方向映射 `data/occupation_direction_map.json` 为 LIMEN 编辑性一对多映射，不是 O*NET 官方中国考研专业结论。
- 报告：兴趣、能力迁移、知识缺口、报考条件分开展示；所有关键解释与已有证据链接；未知就是未知；不可捏造课程学习时长与录取概率。
- 体验：至少 3 个有意义的状态改变，合成数据标记 simulation；完成后有可导出小成果，不做只有一问一答的问卷模拟器。
- UI：信息密度适中、白蓝灰学术工具感，必须有交互和状态反馈，禁止整页 PPT 卡片、装饰性光效、无效渐变、大量 AI 空洞文案。
- 用 `npm run lint`、`npm run build` 和当前阶段集成验收检查；不要隐藏警告、跳过测试或报告未执行命令为通过。
- token 节省：不重复输出整段 PRD、不重新扫描未变的原始说明、不在用户可见对话内粘贴大段代码。结尾仅变更摘要和测试证据。

