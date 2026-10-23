# 知识库与数据库：缺口清单、补充方案、权威渠道

更新时间：2026-10-23
现状基线：`kb_roles` 11 / `kb_sources` 38 / `kb_records` 127（远端，匿名可读）；本轮新增招生规则 21 条（本地 SQL 待导入，未写库）。

---

## 一、内容维度缺口（知识库五个分类）

### 1. `admissions` 招生规则 —— 覆盖 21 条 / 6 校（进行中）

| 缺口 | 具体表现 | 补充渠道 | 验收标准 |
| --- | --- | --- | --- |
| 院校覆盖窄 | 21 条集中在 6 校（中山 9、川大 3、电子科大 1、东南 2、西交 4、上交 2） | 各校研究生院官网 `*.edu.cn` 的 2027 硕士招生专业目录 PDF / 招生章程 | 每校 ≥6 条，覆盖 ≥10 校 |
| **硬性跨考限制稀缺** | 只有 3 条 `relation: direct`（西交临床 1051、西交口腔+规培、上交跨专业加试） | 专业学位招生章程中的「报考条件」条款；医学专硕（1051/1052/1057/中医）几乎都有「仅限 XX 类本科」表述 | ≥15 条 direct 限制 |
| 复试/加试科目缺失 | 现仅目录初试科目，无院系复试科目 | 院系官网「复试录取办法」「复试科目一览」 | 每校 ≥1 条复试口径 |
| 推免路径缺失 | 无推免接收条件（只采了东南推免表 2 条不含科目） | 各校「接收推荐免试研究生工作办法」 | ≥5 条 |
| 年份单一 | 全部 2027 | 补 2026 作为对照（考生实际参考上一年度） | 2026/2027 都有 |

> 已知限制：`collect.ts` 以 `url + role_id + category` 去重，一份目录对同一角色只能 1 条，所以提量靠「增加院校 × 增加不同 URL（目录/章程/推免/非全）」。

### 2. `occupation` 岗位标准 —— 当前最薄弱（直接影响匹配页）

| 缺口 | 具体表现 | 补充渠道 | 验收标准 |
| --- | --- | --- | --- |
| RIASEC 兴趣缺失 | `src/lib/match/catalog.ts` 三个岗位 `interests: unknown()` | O*NET 官方 `onetonline.org`（SOC 15-1211.01 / 15-2051.02 / 15-2051.00 等）的 Interests 分值 | 3 岗位 × 6 维兴趣有官方分值+原文 |
| 技能重要性/等级缺失 | `importance: unknown()`、`required_level: unknown()` | O*NET Skills（Importance / Level 0–100）；中国《国家职业技能标准》工作要求表 | 每岗位 ≥3 技能有官方等级 |
| 中国硬资格缺失 | `professional_background: unknown()`、`hard_requirements: unknown()` | 人社部职业技能鉴定中心 `osta.org.cn`、工信部 `miit.gov.cn`（人工智能/大数据工程技术人员国家职业技能标准）、国家卫健委执业资格与规培要求 | ≥6 条中国官方标准原文 |
| 科室职责缺失 | `departments` 字段几乎空 | 三级医院评审标准、医院官网科室介绍、卫健委学科目录 | ≥8 个科室职责原文 |

> 关键诚实点：**中国没有公开的 RIASEC 常模**。中国侧只能给「职业标准/执业门槛」原文，不能伪造兴趣分值。

### 3. `recruitment` 招聘样本 —— 只有 7 条，且偏企业

| 缺口 | 具体表现 | 补充渠道 | 验收标准 |
| --- | --- | --- | --- |
| 医院侧样本缺失 | 现有样本为迈瑞/联影/泰格/讯飞等企业 | 三甲医院官网「人才招聘/公开招聘」公告（信息科、病案科、临床研究中心） | ≥10 条医院公告 |
| 岗位类型单一 | 缺临床数据/医学信息/器械注册等 | 医院+企业官网并重 | 覆盖 ≥5 类岗位 |
| 失效期管理 | 招聘公告时效短 | `valid_through` + 到期降级 | 全部标注有效期 |

### 4. `industry` 产业口径

| 缺口 | 补充渠道 | 验收标准 |
| --- | --- | --- |
| 卫生人力/薪酬统计口径 | 国家统计局 `stats.gov.cn`、卫健委统计年鉴 `nhc.gov.cn` | ≥4 条统计口径原文 |
| AI 医疗器械监管 | 国家药监局 `nmpa.gov.cn`、器审中心 | ≥3 条 |
| 医保/信息化政策 | 国家医保局 `nhsa.gov.cn`、卫健委规划文件 | ≥4 条 |

### 5. `learning` 学习资源 —— 全库最弱

| 缺口 | 补充渠道 | 验收标准 |
| --- | --- | --- |
| 无课程/资源条目 | 教育部国家智慧教育平台、中国大学 MOOC、高校公开课、卫健委培训项目 | ≥10 条带官方 URL 的资源 |

### 6. 医学方向专项（规培/科室/薪资）

| 缺口 | 补充渠道 | 验收标准 |
| --- | --- | --- |
| 规培年限与报考条件未验证 | 国家卫健委 + 省级卫健委 + 培训基地医院官网 | ≥5 条规培口径原文 |
| 科室设置/人员配置 | 三级医院评审标准、医院官网 | ≥8 条 |
| 薪资「未验证」 | 统计局卫生行业平均工资；医院公告中的明确数字 | **没有官方数字就不写数字**，只记口径 |

---

## 二、结构与工程层面缺口（数据库）

| # | 缺口 | 影响 | 方案 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | `admissions.sample.json` 为空（`items: []`） | 应用侧无可用招生样本 | 从已校验 bundle 生成，只收录「官方来源+年份+专业代码+科目」记录 | **本次完成：0 → 6 条**，15 条排除原因留档在 `provenance.excluded` |
| 2 | `match_*` 4 张表未创建 | 匹配页无持久层 | `docs/sql/limen-match-v1.proposed.sql` 需先定 payload 来源（建议由 `admissions.sample.json` + `kb_records` 派生），再转正式迁移 | 待办（未执行） |
| 3 | 无 `schema_migrations` 登记表 | 无法判断远端已应用到哪一版，部署不可重复 | 建 `schema_migrations(version, applied_at, checksum)`，把 8 个现有迁移回填登记 | 待办 |
| 4 | 5 张业务表 0 索引 | 数据量上来后查询退化 | 按真实查询写索引（`assessments.user_id`、`experiences.user_id`、`reports.user_id`、`community_posts.created_at`） | 待办 |
| 5 | 无全文检索索引 | 词法候选上限 500 条，召回受限 | 中文优先 `pg_trgm`（GIN，不需分词插件）；`zhparser` 需自建镜像，暂不采用 | 待办 |
| 6 | community 邮件 OTP/SMTP 未验证 | 注册链路不可用 | 需真实邮件服务凭据；无凭据则如实标注未验证 | 阻塞（缺凭据） |
| 7 | 无 service-role key（设计如此） | 批量导入只能维护者 CLI 执行 | 保持现状；导入由人工 `npx supabase db query --linked --file` | 设计约束 |
| 8 | 无「缺失字段」统计脚本 | 324 处缺失无法复现口径 | 写 `scripts/knowledge/missing-fields-report.ts` 从 bundle 统计 | 待办 |
| 9 | 未建 `kb_records.context` 的查询索引 | 按院校/专业筛选慢 | `202610220004` 已加 GIN，但需补 btree（`context->>'institution'`, `admission_year`） | 待办 |

---

## 三、渠道清单（只允许这些）

**中国院校**
- 各校研究生招生网：`yzb.sjtu.edu.cn`、`yz.scu.edu.cn`、`yz.uestc.edu.cn`、`yzb.seu.edu.cn`、`yz.xjtu.edu.cn`、`graduate.sysu.edu.cn`、`yjsy.bjmu.edu.cn`、`ehall.szu.edu.cn`、`grs.zju.edu.cn`、`gsao.fudan.edu.cn`、`yzb.tju.edu.cn`、`gszs.hust.edu.cn`
- 教育部 `moe.gov.cn`、中国研究生招生信息网 `yz.chsi.com.cn`、省级教育考试院

**中国职业与行业标准**
- 人社部 `mohrss.gov.cn` / 职业技能鉴定中心 `osta.org.cn` / 国家职业分类大典
- 工信部 `miit.gov.cn`（人工智能、大数据工程技术人员国家职业技能标准）
- 国家卫健委 `nhc.gov.cn`（规培、执业资格、统计年鉴）
- 国家药监局 `nmpa.gov.cn`、国家医保局 `nhsa.gov.cn`
- 国家统计局 `stats.gov.cn`

**美国职业数据**
- O*NET `onetonline.org`（官方页面 + 官方 `*.txt` 数据文件；`jurisdiction: US`，不得说成中国要求）

**明确排除**（曾出现在搜索结果里，全部不用）
- 考研培训机构：`xxxedu.net`、`kaoyan*`、`offcn.com`、`iqihang.com`、`vipkaoyan.net`
- 聚合/百科/公众号转载、CSDN、知乎、招聘聚合站

---

## 四、执行方式与分工

| 线 | 范围 | 产出 | 状态 |
| --- | --- | --- | --- |
| `kb-admissions-src`（子智能体） | 其他院校招生规则 ≥12 条 | `work/knowledge-admissions-others/handoff.json` | **进行中** |
| `kb-standards-src`（子智能体） | O*NET 官方分值 + 中国职业标准 ≥10 条 | `work/knowledge-standards/handoff.json` | **进行中** |
| `kb-medical-src`（子智能体） | 规培/科室/医院招聘/薪资口径 ≥10 条 | `work/knowledge-medical/handoff.json` | **进行中** |
| Lead（我） | 契约+校验器（已完成）、`admissions.sample.json`（已完成）、工程层 SQL、整合与验收 | 见下 | 进行中 |

**交接契约**：`docs/testing/knowledge-handoff-contract.md`
**自检命令**：`npx tsx scripts/knowledge/verify-handoff.ts <handoff.json>`（literal 必须是原文 exact substring）
**整合顺序**：handoff 自检通过 → 我写 merge 脚本并入 `admissions.manifest.json` / 新 manifest → `collect` 校验 → `prepare-import` 出 SQL → 报告

---

## 五、接下来 3 步（我这边）

1. 写 `scripts/knowledge/merge-handoff.ts`：把三条线的 handoff 转成 manifest 条目（自动算 escapeRegExp + artifact_capture），跑通端到端。
2. 写索引与 `schema_migrations` 迁移草案（不执行），并给 `missing-fields-report.ts`。
3. 三条线回来后统一 collect → prepare-import → 更新验收报告（含真实失败清单）。
