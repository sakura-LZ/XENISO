# 36小时实施顺序 / 阶段加载

## 中国知识库扩充（2026-10-21，本轮已验收）

按用户新需求完成九方向与独立医学路径的代表样本、真实Supabase增量context/资料、官方原文查阅/筛选/导出，未改Match/O*NET/数字人。实际127tests、DB32、HTTP22等通过，真实AI本轮超时未通过；全国院校/科室/执业资料仍有缺口，不擅自进入算法或数字人阶段。见 [扩充计划](superpowers/plans/2026-10-21-knowledge-expansion.md)、[实际验收](testing/knowledge-expansion.latest.md)。

## 新增需求：多专业数字人体验（2026-10-21，E1基础模板已实现）

用户已授权E1：原九跨学科方向加继续医学，共10方向、14模板、28条项目/面试路径。医学先内科学、外科学、妇产科学、儿科学，使用规范学科名称，先建模板后扩充。已实现操作、计算反馈、复盘、本机恢复、导出及V3既有接口兼容；[实际测试与局限](testing/multi-experience-E1.latest.md)。数据库由用户并行建设，当前沿用现有接口，不执行迁移。E2动态生成/历史，E3经许可的数字人成果同步仍待下一阶段指示。见[设计规格](MULTI_DIRECTION_EXPERIENCE_DESIGN.md)、[实施清单](superpowers/plans/2026-10-21-multi-direction-experience.md)、[对接约定](EXPERIENCE_E1_CONTRACT.md)。下方P0–P5为既有主线历史顺序，不重新开始。

## 既有主线阶段

**原则：先验证真实数据链，再打磨一条可演示的主线；允许删减边缘功能，不允许假装实现。** 每阶段先读 README+AGENTS+本文件；仅加载列出的阶段文件。

| 阶段 | 时间预算 | 只读取 | 交付 | 验收 |
|---|---:|---|---|---|
| P0 技术验证 | 0–4h | `03_ONET_AND_DATA.md`, `.env.example` | O*NET真实接口结果结构、API测试脚本、Supabase匿名Auth和RLS | Key安全、真实返回、两个身份互相不能访问 |
| P1 画像&测评 | 4–11h | `data/profile_schema.json`, `03_ONET_AND_DATA.md`, `02_UI_SPEC.md` | 多步表单、草稿、成绩CSV/XLSX本地解析、30题问卷 | 填写/保存/刷新/错误校验可用 |
| P2 知识库&R1 | 11–17h | `data/occupation_direction_map.json`, `data/report_contract.json`, `05_REPORT_ENGINE.md` | 3/9方向页、职业来源、初步画像R1 | 结构化证据追溯，零基础不判为不适合 |
| P3 一件高质量体验 | 17–24h | `04_EXPERIENCE.md`, `data/experience_seed.json`, `02_UI_SPEC.md` | 1个实际工作台，合成数据反馈与成果卡 | 3次状态变化+导出成果+反思问卷 |
| P4 R2与规划 | 24–31h | `05_REPORT_ENGINE.md`, `data/report_contract.json`, `data/admissions.sample.json` | 能力差距、课程依赖、可投入时间计划、院校待核验 | 引用证据且不存在虚构招生条目 |
| P5 集成/UI/部署 | 31–36h | `02_UI_SPEC.md`, `00_SCOPE_AND_ACCEPTANCE.md` | 响应式一致性、错误状态、部署、备用演示 | 构建和关键测试通过，可从入口至R2演示 |

## 团队若只剩很少时间的优先级
保留：P0可运行 + P1 + R1 + 1个工作台 + R2 最小报告；删减：后两种高级工作台、实时文献API、自动院校导入、大量动画。

## 各阶段必须汇报的四行内容
1. 已交付功能（附本地路由）；2. 实际跑过的命令和结果；3. 缺陷或仍需用户输入；4. 下阶段目标与预估风险。

## Demo验证流程（3–4分钟）
进入→昵称/年级/研究经历→Mini-IP提交→R1展示兴趣和可迁移技能→知识库职业条目→进入职业工作台完成关键操作→成果卡→选择目标与时间→R2展示课程/技能/招生来源。
