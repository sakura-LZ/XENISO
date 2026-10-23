# 知识库审核 · 第 2 轮（kb-audit-round-2）

- 审核时间：2026-10-23 00:25（本地快照；各线仍在并发写入）
- 审核范围：`data/knowledge/*.manifest.json`（24 份）、`work/knowledge-*/bundle.json`、`work/knowledge-*/handoff.json`
- **职责声明：本轮起我不再向任何调研线直接发消息。所有「建议指令」只提交 Lead，由 Lead 统一派发。**
  - 说明：round-1 与 round-2 前半段我曾直接给 kb-admissions-src / kb-standards-src / kb-medical-src / kb-industry-src / kb-learning-src 发过指令，这些消息在边界指令到达前已发出、无法撤回；自本条起停止。

## 0. 两套数字（对外只认「可复验口径」）

| 口径 | 清单 | 记录 | 事实 | 唯一 URL |
|---|---|---|---|---|
| 历史口径（库内全部） | 24 | 356 | 790 | 174 |
| **可复验口径**（排除 pilot / expansion / supplementary） | **21** | **224** | **509** | **135** |

- 唯一 `source.id`：144（可复验口径）。
- 来源数双报口径：**唯一 URL 135 ／ 唯一 source.id 144 ／ 清单条目 224**。对外写「唯一来源 135」。

## 1. 逐字保真（bundle 偏移精确校验，本轮方法升级）

用 `snapshots[].text_body` + `facts[].start/end` 切片比对 `facts[].quote`（比第 1 轮的空白归一化更严格）：

| 指标 | 结果 |
|---|---|
| bundle 覆盖记录 | 349 |
| 事实总数 | 754 |
| 逐字命中 | **746（98.9%）** |
| 不符 | **8** |
| 无快照（真黑箱） | **0** |

不符全部集中在两个目录，且与上一轮完全一致（未修复）：

| 目录 | 记录 | 字段 |
|---|---|---|
| `knowledge-industry-jd` | `recruitment-mindray-medaffair-guide-devices` | major_restrictions / experience / technical_requirements |
| `knowledge-industry-jd` | `recruitment-ui-clinicalapp-guide-devices` | education / experience / technical_requirements |
| `knowledge-jd-2` | `recruitment-ui-product-mr-guide-devices` | education / experience |

> 归属：这两个目录属 **community-account-match**（按 Lead 权限表），不属 kb-industry-src。

## 2. 文本三态（按记录）

| 状态 | 记录数 | 说明 |
|---|---|---|
| ✅ 独立 `.txt`/`.raw`（`extracted_path`） | 108+ | 可直接跑 `verify-handoff` |
| 🟡 仅 bundle 快照（`text_body` + `raw_base64`） | 其余全部 | 可离线逐字复核 |
| ❌ 真黑箱 | **0** | 第 1 轮「71% 无文本」结论作废 |

## 3. 新入库 4 批质检（Lead 本轮整合）

| 批次 | 记录 | 事实 | 独立 txt | locator | 缺失 artifact | 非 https | 唯一源 | 判定 |
|---|---|---|---|---|---|---|---|---|
| `occ-cn` | 20 | 45 | **100%** | **20/20** | 0 | 0 | 15 | ✅ 优秀 |
| `adm-tier2` | 11 | 28 | 27% | **11/11** | 0 | 0 | 11 | ✅ 合格 |
| `hosp` | 21 | 25 | 19% | 4/21 | 0 | 0 | 9 | 🟡 locator 不足 |
| `jd-2` | 7 | 35 | 0% | **0/7** | 0 | 0 | 6 | 🟡 locator 全缺 + 2 条 literal 不符 |

补充核查：
- 域名全部合规：`occ-cn` = gov.cn / mohrss.gov.cn / osta.org.cn；`adm-tier2` = 各校 edu.cn；`hosp` = 医院官网 + 人社厅；`jd-2` = 企业官方招聘系统（zhiye.com）+ 医院官网。
- 全库聚合站扫描（chsi/xxxedu/offcn/kaoyan/iqihang/zhipin/liepin/51job/gaoxiaojob/qgsydw/9453job/book118）：**0 命中**。
- `hosp` 21 条记录覆盖 6 家医院 + 1 份省人社工资价位；`published_at` 空值 12 条**全部有 note**。
- `adm-tier2` 覆盖 8 校：中山 1、四川 2、西交 1、哈工大 1、武大 1、东南 2、华科 2、同济 1。

## 4. T1 七校（可复验口径）

| 学校 | 记录 | 事实 | 招生 | 课程 | 变化 |
|---|---|---|---|---|---|
| 上海交通大学 | 8 | 15 | 2 | 4 | |
| 浙江大学 | 7 | 11 | 2 | 2 | |
| 四川大学 | — | 49 | ✓ | ✓ | 唯一「招生+课程」双类达标 |
| 北京大学 | 8 | 11 | 0 | 3 | 招生 0（5 条在 expansion，被冻结） |
| 复旦大学 | 4 | 8 | 1 | 1 | |
| **清华大学** | 2 | 4 | **0** | 2 | ✅ 破零（课程，tsinghua.edu.cn PDF） |
| **南京大学** | 2 | 3 | **0** | 2 | ✅ 破零（课程，eng.nju.edu.cn） |
| **中国科学技术大学** | 3 | 4 | **0** | 3 | ✅ 破零（课程，2025 版培养方案） |

结论：**T1 三校已破零，但仅课程类；三校招生仍为 0。** T1「招生+课程」双类达标 1 校（四川大学）。

## 5. T2 / T3（可复验口径）

有数据（含类别）：
- 招生+课程：四川 49、东南 10、华科 8、哈工大 7、同济 6
- 仅招生：中山 27、西交 8、天大 4、武大 3、吉林 2、首医 5、南医大 13、南方医 5、哈医大 2
- 仅课程：北航 3、山大 4、中南 2

空白：
- T2（6 校）：南开、厦门、华东师大、北京理工、大连理工、华南理工
- T3（3 校）：中国医科大学、重庆医科大学、天津医科大学

> 与第 1 轮相比，T2 空白由 11 校降到 6 校（北航/山大/中南 由课程破零，武大/同济 由招生破零）。

## 6. locator 审计

全库 handoff quotes **201 / 499 有 `context.evidence_locator`（40%）**；按制度两类都在补。

| locator 100% | locator 0% |
|---|---|
| `occ-cn` 20/20、`adm-tier2` 11/11、`cur-tier1` 37/37、`standards` 40/40、`curriculum` 19/19、`curriculum-2026` 13/13、`industry2` 7/7、`learning2` 3/3 | `jd-2` 0/7、`industry-jd` 0/42、`recruitment` 0/24、`medical` 0/48、`medical-2026` 0/22、`salary` 0/13、`salary2` 0/27、`adm-tier1` 0/13、`admissions-others2` 0/21 |

## 7. 数据质量亮点（建议保留口径）

1. `occ-cn`：人社部/工信部/网信办/医保局原文，100% 独立 txt + 100% locator，是目前质量最高的一批。
2. `hosp` 中「广东省人社工资价位」被明确标注为**企业口径、不含公立医院事业单位**，并单列 `statistical_definition`——下游不得把 9.14 万当三甲医师收入。
3. 3 条「零数字口径」（浙大一院/中山一院/齐鲁「按国家规定执行」）处理正确，没有编造数字。
4. 规培 2022 版用「广东省 2025 结业考核通知仍参照 2022 年版」反证其为现行版本，标注「非最新」正确。

## 8. 问题清单

| # | 严重度 | 问题 | 归属线 |
|---|---|---|---|
| R1 | 高 | 8 条 fact 与 bundle 快照不符（industry-jd 6、jd-2 2） | community-account-match |
| R2 | 高 | T1 三校（清华/南大/中科大）招生仍 0 条 | kb-admissions-src |
| R3 | 高 | locator 结构化率 40%；recruitment 类 0/49 | 多线（见 §6） |
| R4 | 中 | 上交 5 条/北大 5 条招生只在 expansion（被冻结）→ 可复验口径下两校招生塌陷 | kb-admissions-src（重抓进 `adm-tier1`） |
| R5 | 中 | `hosp` locator 4/21；`jd-2` locator 0/7 | kb-medical-src / community-account-match |
| R6 | 中 | `salary2` 2 条证据不在 artifact（Lead 判定真缺陷） | kb-industry-src（按 Lead 权限表） |
| R7 | 低 | 全库 9 份 legacy 清单无 handoff（已冻结，不进对外报表） | — |

## 9. 建议指令清单（提交 Lead，请由你统一派发）

| # | 给哪条线 | 什么问题 | 建议怎么做 | 优先级 |
|---|---|---|---|---|
| 1 | kb-admissions-src | 清华/南大/中科大招生 0 条 | 采 2027 章程+专业目录，每校 ≥6 条，覆盖 1051/1052/1057、1010/1058、0831/085409，每条带 `cross_major_restrictions`（relation=direct）+ locator | **P0** |
| 2 | kb-admissions-src | 上交/北大招生只在 expansion（冻结） | 把上交、北大招生重抓进 `adm-tier1`（上交 0831/085409/085400 医学影像方向、北大医学部目录），使可复验口径不再为 0 | P1 |
| 3 | kb-admissions-src | `adm-tier1` locator 0/13；`admissions-92`(1/21)、`-92b`(2/16)、`-others2`(0/21) | 补 `context.evidence_locator`（章节 + 页码 + 专业目录行号） | P1 |
| 4 | community-account-match | industry-jd 6 条 + jd-2 2 条 literal 与快照不符 | 用 `facts[].start/end` 在 `snapshots[].text_body` 上重新切片取 quote，禁止手抄；目标 bundle 校验 0 不符 | **P0** |
| 5 | community-account-match | jd-2 locator 0/7、industry-jd 0/42 | 把 `quote.title`（岗位名）+ `quote.note`（页内位置）合并写入 `context.evidence_locator`，格式 `岗位：<名>（<技能行>；SPA 列表页，无独立 URL，无岗位编号）` | P1 |
| 6 | kb-medical-src | hosp locator 4/21；medical/medical-2026/salary 全 0 | 补 locator（例「附件1 表2 卫生专业技术人员行」「公告 二、招聘岗位 第3条」） | P1 |
| 7 | kb-industry-src | `salary2` 2 条证据不在 artifact | 按你的判定：重抓或删除该 2 条，二选一并回执 | P1 |
| 8 | kb-learning-src | T1 课程已破零，但仅 Thu/NJU/USTC；北大 3、复旦 1 | 继续按模板补 topics+training+年级标注，重点 T2 剩余空白校（南开/厦大/华东师大/北理工/大工/华南理工） | P2 |
| 9 | kb-industry-src | 中国职业标准数量、O*NET 三岗位六维分值 | 按原计划推进（阻塞匹配页） | P1 |
| 10 | Lead | `valid_through` 是否进 handoff `contextKeys` | 建议加，否则「已过期岗位」无法结构化过滤 | 待决策 |
| 11 | Lead | locator 判定口径 | 我的口径：必须进 `context.evidence_locator` 才算达标（title/note 只算信息齐全） | 待决策 |

## 10. 下一轮（round-3）复核目标

1. 8 条 literal 不符清零（当前 98.9% → 100%）。
2. locator 覆盖率 40% → ≥90%。
3. T1 招生：三校至少各 ≥3 条。
4. T2/T3 空白校从 6 + 3 降到 ≤4 + ≤2。
5. 可复验口径事实数从 509 继续上升，且「双类达标校」从 1 校增到 ≥5 校。
