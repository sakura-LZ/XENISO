# 知识库审核 · 第 1 轮（kb-audit-round-1）

- 审核时间：2026-10-23 00:05（本地快照；各调研线仍在并发写入，数字为此刻口径）
- 审核人：profile-reports（知识库审核代理）
- 依据：`docs/testing/kb-school-list.md`、`docs/testing/knowledge-inventory.md`、`docs/testing/ego-browser-howto.md`、`docs/testing/knowledge-gap-plan.md`
- 只读审计：未修改 `data/`、`scripts/`、`src/`、`work/knowledge-*/` 任何内容

## 0. 总盘（实测）

| 指标 | 数值 | 备注 |
|---|---|---|
| 清单（manifest） | 19 份 | `data/knowledge/*.manifest.json` |
| 记录 | 278 条 | 类别：admissions 83 / industry 63 / occupation 56 / learning 48 / recruitment 28 |
| 事实（extracts） | 620 条 | |
| 角色命中 | 125 / 84 / 88 | `build-role-index.ts`：medical_ai_pm / clinical_data_analyst / medical_ml_engineer，19 份清单全扫 |
| 有抽取文本（.txt）的记录 | 81 / 278 | **197 条（71%）只有 raw HTML/PDF，无法逐字校验** |
| `published_at` 空值 | 149 / 278 | 空值全部有 `publication_date_note`（0 缺失），合规 |

> `knowledge-inventory.md` 标注「80 源 / 118 记录 / 257 事实」，已严重落后于实测（19 清单 / 278 记录 / 620 事实），需重新生成。

## 1. 各线进度（目录口径）

| 线 | 目录（近期写入） | 状态 | 缺口 |
|---|---|---|---|
| 招生 | `adm-tier1`(26 文件)、`adm-tier2`(26) | 有 raw+txt，**无 handoff** | 未自检、未入库 |
| 招生（历史） | `admissions`(52)、`admissions2`(35)、`admissions-others`(41)、`admissions-92`、`admissions-92b`、`admissions-others2` | 92/92b/others2 已有 handoff 且校验 0 error；其余**无 handoff** | 4 份清单无复验路径 |
| 课程 | `cur-tier1`(15) | 有 raw+txt，**无 handoff** | 未自检、未入库 |
| 课程（历史） | `curriculum`、`curriculum-2026` | handoff 校验 0 error，已入库 | 仅 13 条 facts |
| 职业介绍 | `occ-cn`(26) | 有 raw+txt，**无 handoff** | 未自检、未入库 |
| 职业标准 | `standards`、`onet` | standards 有 handoff（0 error）；**onet 无 handoff** | O*NET 仅 6 个 SOC |
| 企业 JD | `industry-jd`、`jd-2`(25) | **industry-jd handoff 校验失败 8 处**；jd-2 无 handoff | 需整批退回 |
| 医院/薪资 | `hosp`(16)、`salary`、`salary2`、`medical`、`medical-2026` | handoff 校验 0 error，已入库 | 医院招聘样本偏少 |
| 产业/扩展 | `expansion`(673)、`industry`、`industry2`、`pilot`、`supplementary` | **仅 industry2 有 handoff**；expansion 无 handoff、无抽取文本 | 最大黑箱（119 条 / 247 facts） |
| 调研线 | `knowledge-research` | **0 文件** | 无人在做或未落盘 |

## 2. 院校覆盖矩阵（四类数据）

### 2.1 T1 七校（必须拿下）

| 学校 | facts | 招生 | 课程 | 职业出口 | 判定 |
|---|---|---|---|---|---|
| 北京大学 | 25 | 5 | 1 | occupation 10 | 缺 recruitment |
| 上海交通大学 | 37 | 20 | 2 | recruitment 1 | **23 条记录 0 条有抽取文本** |
| 浙江大学 | 5 | 2 | 1 | 0 | 出口缺 |
| 复旦大学 | 2 | 1 | 0 | 0 | 严重不足 |
| 清华大学 | 0 | 0 | 0 | 0 | **完全空白** |
| 南京大学 | 0 | 0 | 0 | 0 | **完全空白** |
| 中国科学技术大学 | 0 | 0 | 0 | 0 | **完全空白** |

> **T1 无任何一校达到「≥3 条 fact 且覆盖 ≥2 类」之上的四类模板；4/7 有数据，3/7 完全空白。**

### 2.2 T2 十九校（有数据 8 校 / 空白 11 校）

有：中山(9,招生)｜四川(40,招生3+课程2+招聘7)｜东南(6,招生3+课程1)｜西安交大(5,招生4)｜天津大学(4,招生4)｜华科(3,课程1)｜吉林(2,招生1)｜哈工大(1,招生1)

空白（0 记录）：**武汉大学、同济大学、北京航空航天大学、南开大学、厦门大学、山东大学、中南大学、华东师范大学、北京理工大学、大连理工大学、华南理工大学**

### 2.3 T3 七校（有数据 4 校 / 空白 3 校）

有：首都医科(5)、南京医科(13)、南方医科(5)、哈尔滨医科(2)；空白：**中国医科大学、重庆医科大学、天津医科大学**

### 2.4 结论

- 招生覆盖：分层内 **15 校**（lead 口径 21 校包含电子科大/西电/深大/郑大/暨大等分层外或剔除校）。
- 课程覆盖：**6 校**（上交、东南、北大、华科、四川、浙大）。
- **招生∩课程 = 5 校**（上交、东南、北大、四川、浙大）——不是 6 校。
- 严格按 `kb-school-list.md` 的「每校 ≥3 条 fact 且覆盖 ≥2 类」：达标主要集中在 北大/上交/浙大/四川/东南/中山/南医大。

## 3. 问题清单（按严重度）

| # | 严重度 | 问题 | 证据 | 责任线 |
|---|---|---|---|---|
| P1 | 高 | **industry-jd handoff 校验不通过（8 处 literal 非原文子串）**，且该批已入库 | `verify-handoff.ts` 退出码 1；`[0] mindray-medaffair.quotes[1-4]`、`[4] ui-clinicalapp.quotes[1-4]`；根因是抓了 `/social/jobs` 列表页（JS 渲染）而非岗位详情页 | 企业 JD 线 |
| P2 | 高 | **197/278 记录无抽取文本**，无法逐字核验；其中上交 23 条、expansion 全部 119 条 | 81 有 `extracted_path`，197 仅有 `artifact_capture.path`（.html/.pdf） | 全部线 |
| P3 | 高 | **9 份清单没有对应 handoff**，不可复验：admissions、admissions-others、admissions2、expansion、industry、learning、onet、pilot、supplementary | 14 个 `handoff.json` vs 19 份 manifest | 各线 |
| P4 | 高 | T1 三校（清华/南大/中科大）**零数据**；T2 十一校、T3 三校零数据 | §2 矩阵 | 招生线/课程线 |
| P5 | 中 | 规范新目录 `adm-tier1`/`adm-tier2`/`cur-tier1`/`occ-cn`/`hosp`/`jd-2` 有 raw+txt 但**全部无 handoff**，未走自检 | 目录扫描（文件时间 00:00–00:05） | 对应线 |
| P6 | 中 | 99 条记录缺 `context.institution`（industry 42、occupation 31、learning 14、recruitment 10、**admissions 2**）；admissions 那 2 条标题还是「中国升学：…」pilot 遗留格式 | `pilot.manifest` sjtu-2027-bme-catalog / sjtu-2027-master-charter | 招生线 |
| P7 | 中 | 有文本的 147 条事实中 **55 条（37%）pattern 与文本仍不匹配**（PDF 抽取空格、OCR 断行） | 归一化空白后仍 unmatched：cn-ai-engineer-standard 10、xidian-2025-employment-report 9、njmu-2026-master-charter 5、tju-2026-master-catalog 4 | 各线 |
| P8 | 中 | 来源计数被重复 URL 放大：`yzb.sjtu.edu.cn/post/3784` 跨 3 份清单出现 12 条记录、`post/3772` 10 条、gov.cn 标准 PDF 11 条、O*NET 15-1211.01 在 onet+supplementary 各 1 条 | URL 分组统计 | Lead 决策口径 |
| P9 | 低 | 非机构域名：`raw.githubusercontent.com` 2 条（InternLM、Fudan-DISC README）；`www.ccfdie.org` 1 条（协会转载药监通告） | `pilot.manifest`、`supplementary` | 课程线 / 产业线 |
| P10 | 低 | 企业招聘用聚合型 SaaS 域名 `*.zhiye.com`，可接受（企业官方招聘系统），但**必须是岗位详情页 URL**，列表页不可作为 source.url | industry-jd / expansion | 企业 JD 线 |
| P11 | 低 | 旧年份材料：`zju-bme-2021-plan`（2021 级）、`hust-bme-plan`（2023 级）、`cn-ai-*`（2021 版）、`zhupei-neirong-biaozhun-2022` | 均已在 note 标注「非最新」 | 无需整改（确认合规） |
| P12 | 低 | 违规聚合站（chsi/xxxedu/offcn/kaoyan/iqihang/vipkaoyan/BOSS/猎聘/智联）：**未发现** | 域名全量扫描 | 保持 |

> 诚实性检查：`published_at` 空值 149 条全部写了 note，未把「版本年份」当发布日期，符合 `kb-school-list.md` 第四节第 4 条。未发现把「未做」写成「没有」的表述暴露在清单里，但 §2 的空白校必须在报告里区分「官网没写」与「我们没抓」——当前一律属于**我们没抓**。

## 4. 给各线的下一步指令

### 4.1 招生线（`kb-admissions-src`）

1. **P0**：补 T1 三校 2027 招生章程 + 专业目录——清华、南大、中科大。每校 ≥6 条，优先 `1051/1052/1057`、`1010/1058`、`0831/085409`；每家附 `cross_major_restrictions`（relation=direct）。
2. **P1**：补 T2 空白 11 校中至少 6 校（武大、同济、北航、厦大、山大、中南）。若该年度简章未发布，写「2027 简章未发布，2026 版为准」并入库 2026。
3. **P1**：上交 23 条**全部无抽取文本**——立刻为每份 PDF/HTML 生成 `.txt` 并重跑 `verify-handoff.ts`；否则这批不能算通过。
4. **P2**：`adm-tier1`/`adm-tier2` 已抓 52 个文件但无 `handoff.json`——跑自检、写 handoff、报「院校数/fact 数/类别/失败清单」。
5. **P2**：修 `pilot.manifest` 2 条上交记录：补 `context.institution=上海交通大学`，标题去掉「中国升学：」前缀。

### 4.2 课程线（`kb-learning-src`）

1. **P0**：课程仅 6 校。补 T1 缺的清华、复旦、南大、中科大（各 ≥1 条培养方案/专业介绍，带 topics + training）。
2. **P1**：补 T2 空白校中的武大、同济、北航、山大、中南（优先有生物医学工程/医学技术的学院）。
3. **P1**：`cur-tier1` 15 个文件无 handoff——出 handoff；`learning` 目录 4 个 raw 也无 handoff；`learning.manifest` 仅 1 条 3 facts，需补量。
4. **P2**：每条课程记录必须有 `topics`+`training` 至少两项，并写明培养方案年级；2021/2023 级必须在 note 标「非最新」。
5. **P2**：`raw.githubusercontent.com` 2 条若无法换高校官网，保留但在 note 注明「实验室官方 repo README，非 *.edu.cn」。

### 4.3 职业标准线（`kb-standards-src`）

1. **P0**：`occupation` 56 条中中国标准仅 2 个（人工智能训练师、大数据工程技术人员）。补 ≥6 个：人工智能工程技术人员（已有）、数字化管理师、病案信息技术、医学信息专员、临床研究协调员(CRC)、医疗器械注册专员——须人社部/工信部原文 PDF + 逐字 literal。
2. **P0**：O*NET 仅 6 个 SOC 码，补齐 App 三个岗位对应的 `15-1211.01 / 15-2051.02 / 15-2051.00` 的 interests 六维分值与 skills importance/level，来源必须是 onetonline 官方页或官方 txt。
3. **P1**：`onet` 目录 29 文件无 handoff——出 handoff 并自检。
4. **P1**：`occ-cn` 26 文件无 handoff——出 handoff；`ccfdie.org` 那条换成 `nmpa.gov.cn` 直链。
5. **P2**：`standards.manifest` 33 条事实无抽取文本或不匹配——补 `.txt` 重校验。

### 4.4 医学线（`kb-medical-src`）

1. **P0**：`hosp` 16 文件无 handoff——出 handoff（医院招聘公告 + 薪资口径）。
2. **P1**：医院侧招聘样本目标 ≥10 条，当前 recruitment 28 条里企业占多数；请给出「医院公告」实际条数，不足则补三甲医院官网人才招聘（信息科/病案科/临床研究中心）。
3. **P1**：`salary2` 17 条不匹配——重抽 PDF 文本；补国家统计局「卫生行业平均工资」口径 1 条（`stats-avgwage-2024` 目前 unmatched 5）。
4. **P2**：规培 2022 版已标「非最新」，确认无 2025/2026 新版可替代；若能拿到新版必须替换。

### 4.5 产业线（`kb-industry-src`）

1. **P0**：**industry-jd 整批退回重抓**——`mindray-medaffair`、`ui-clinicalapp` 用的是 `/social/jobs` 列表页，导致 8 处 literal 不成立。改为逐岗位详情页 URL，重出 handoff 并自检 0 error。
2. **P0**：`expansion` 119 条 / 247 facts **无 handoff、无抽取文本**——这是当前最大黑箱。必须：为每个 artifact 生成 `.txt` → 出 handoff → 自检通过。在补齐前，这 247 facts 不应计入覆盖率。
3. **P1**：`jd-2` 25 文件无 handoff——出 handoff。
4. **P2**：`industry` 7 条清单无 handoff；确认 gov.cn / stats.gov.cn / nhsa.gov.cn 每条都有原文日期证据。

### 4.6 Lead（需你决策/执行）

1. **重新生成 `knowledge-inventory.md`**：现文档 80 源/118 记录/257 事实，实测为 19 清单/278 记录/620 事实（我按边界不写该文件）。
2. **定来源计数口径**：同一 URL 跨清单重复（SJTU post/3784 12 条、post/3772 10 条、gov.cn PDF 11 条），「136 源」需明确是「URL 去重数」还是「清单条目数」。
3. **决定是否冻结无 handoff 的 9 份清单**（P3）：建议在补 handoff 前不计入覆盖率报表。
4. **`knowledge-research` 仍 0 文件**：确认是取消该线还是漏派。

## 5. 下一轮（round-2）我将复核

1. 重跑 `build-role-index.ts`，对比三职业命中变化。
2. 对每个新 `handoff.json` 跑 `verify-handoff.ts`，统计 errors/warnings。
3. 重算：有抽取文本记录占比（目标 ≥90%）、T1 覆盖率（目标 7/7）、招生∩课程（目标 ≥10 校）。
4. 复核 industry-jd 重抓后的 literal 通过率（目标 0 error）。
5. 抽查 10% 事实的人工可点回性（source.url 必须是详情页而非列表页）。
