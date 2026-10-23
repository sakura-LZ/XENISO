# 知识库审核 · 第 3 轮（kb-audit-round-3）

- 审核时间：2026-10-23 00:32（本地快照）
- 审核范围：`data/knowledge/*.manifest.json`（26 份）、`work/knowledge-*/{handoff.json, bundle.json, *.txt|.raw}`
- **职责声明：本轮未向任何调研线发送消息。以下「建议指令」仅提交 Lead，由 Lead 统一派发。**

## 0. 口径与总量

| 口径 | 清单 | 记录 | 事实 | 唯一 URL |
|---|---|---|---|---|
| 历史口径（库内全部） | 26 | 382 | 827 | 183 |
| **可复验口径**（排除 pilot / expansion / supplementary） | **23** | **250** | **546** | — |

- 唯一 `source.id`（可复验口径）：155。
- 类别分布（全量）：admissions 117 / occupation 78 / learning 70 / industry 68 / recruitment 49。
- `role-index` 复核：**158 / 115 / 104**（19→26 份清单后与 Lead 报数一致）。

## 1. 关于「8 条 literal 不符」的纠正（Lead 的判断成立，我的表述需修正）

我用三种方法交叉验证同一批数据：

| 方法 | 结果 | 结论 |
|---|---|---|
| A. bundle 快照 + `facts[].start/end` 偏移切片 | 746/754 命中，8 条不符 | 受快照版本影响 |
| B. manifest 记录 → **其自身 artifact 文件** | industry-jd 26/42、jd-2 25/35 命中 | 暴露指针问题 |
| C. manifest 记录 → **该清单目录下全部原件** | **823/827 命中（99.5%）**，仅 4 条缺失 | **证据真实存在，无丢失** |

**结论修正**：
1. 不存在「张冠李戴」或数据丢失。106 个 quote 全部落库（industry-jd 42、jd-2 35、其余 29）。
2. 那 8 条「不符」的真实原因是 **artifact 指针歧义**：同一 URL（北森 SPA 列表页）下多个来源被 merge 聚合为一条记录，`artifact_capture.path` 只能指向其中一个源文件，其余事实在兄弟文件里。
   - industry-jd：42 条中 16 条不在所指向的 artifact 内
   - jd-2：35 条中 10 条不在所指向的 artifact 内
3. 唯一真缺失：**salary2 / `industry-mohrss-survey-2025` 的 4 条事实**（人社部表），与 Lead 判定一致（Lead 记为 2 条，我实测 4 条：`salary_statistics`×2、`coverage_limit`×1、`salary_statistics`×1，分布在 4 条记录）。

→ 建议（供 Lead 派发）：`artifact_capture` 改为**按来源**而不是按合并记录挂载；或在 record 上增加 `evidence_paths: string[]`。这样 26 条跨文件事实就能各自指回正确原件。

## 2. locator 双口径（Lead 要求两个数）

| 指标 | 数值 | 占比 |
|---|---|---|
| locator 达标（handoff `quote.context.evidence_locator`） | **319 / 527** | **61%** |
| 信息齐全（有 `note`/`title` 但无结构化 locator） | 208 / 527 | 39% |
| 两者都无 | **0** | 0% |

记录级（manifest）：`context.evidence_locator` 非空 **149 / 382（39%）**。

相比第 2 轮的 40%（quotes）明显改善，主要由这几批贡献：`industry-jd` 5/5、`onet` 6/6、`industry` 7/7、`adm-tier1` 12/12、`adm-tier2` 11/11、`cur-tier1` 19/19、`occ-cn` 20/20、`standards` 10/10、`curriculum` 8/8。

仍为 0 的：`jd-2` 0/7、`recruitment` 0/7、`medical` 0/15、`medical-2026` 0/9、`salary` 0/6、`salary2` 0/18、`admissions2` 0/13、`admissions-others` 0/5、`pilot` 0/8、`supplementary` 0/5、`admissions-92b` 2/14、`hosp` 4/21。

`valid_through` / `valid_from` 已进白名单，但当前**使用量 0**（字段存在但无人填写）。

## 3. 本轮新入库批次复核

| 批次 | 记录 | 事实 | 独立 txt | locator | 非 https | 缺 artifact | 判定 |
|---|---|---|---|---|---|---|---|
| `adm-tier1` | 12 | 21 | 42% | **12/12** | 0 | 0 | ✅ 通过 |
| `admissions-92b` | 14 | 16 | 21% | **2/14** | 0 | 0 | 🟡 locator 不足 |
| `cur-tier1` | 19 | 37 | 68% | **19/19** | 0 | 0 | ✅ 通过 |
| `hosp` | 21 | 25 | 19% | 4/21 | 0 | 0 | 🟡 locator 不足 |
| `occ-cn` | 20 | 45 | **100%** | **20/20** | 0 | 0 | ✅ 优秀 |
| `adm-tier2` | 11 | 28 | 27% | **11/11** | 0 | 0 | ✅ 通过 |
| `jd-2` | 7 | 35 | 0% | 0/7 | 0 | 0 | 🟡 locator 全缺 |

`adm-tier1` 覆盖 5 校：北大 1、复旦 1、清华 3、中科大 4、南大 3（正是本轮 T1 补量的主力）。
`admissions-92b` 覆盖 6 校：清华 2、中科大 2、东南 3、天大 3、华科 2、北航 2。

## 4. T1 七校：里程碑达成

| 学校 | 事实 | 覆盖类别 | 判定（≥3 条 fact 且 ≥2 类） |
|---|---|---|---|
| 北京大学 | 14 | admissions, learning, recruitment, occupation | ✅ **4 类** |
| 清华大学 | 10 | admissions, learning | ✅ |
| 复旦大学 | 11 | admissions, learning, recruitment | ✅ |
| 上海交通大学 | 15 | admissions, learning, recruitment | ✅ |
| 浙江大学 | 11 | admissions, learning, recruitment | ✅ |
| 南京大学 | 9 | admissions, learning | ✅ |
| 中国科学技术大学 | 12 | admissions, learning | ✅ |

**T1 达标率 7/7（100%）**，第 2 轮时仅 1 校。清华/南大/中科大从「招生 0」变为「招生 4/6/5 条」。

## 5. T2 / T3（可复验口径）

- T2 有数据 13 / 19 校；**空白 6 校**：南开大学、厦门大学、华东师范大学、北京理工大学、大连理工大学、华南理工大学。
- T3 有数据 4 / 7 校；**空白 3 校**：中国医科大学、重庆医科大学、天津医科大学。

## 6. 合规复查

- 聚合站（chsi/xxxedu/offcn/kaoyan/iqihang/zhipin/liepin/51job/gaoxiaojob/qgsydw/9453job/book118）：**0 命中**。
- `published_at` 空值全部有 `publication_date_note`（0 缺失）。
- 协议：全库 `source.url` 均 https，0 例外（医学线已把中山一院/北大人民换成 https）。
- 旧年份材料（2021 级/2023 级培养方案、2021 版标准、2022 版规培）均已标注「非最新」。
- 数据质量亮点保留：广东工资价位「企业口径、不含公立医院事业单位」已单列 `statistical_definition`。

## 7. 问题清单

| # | 严重度 | 问题 | 归属 |
|---|---|---|---|
| S1 | 高 | `salary2` / `industry-mohrss-survey-2025` 4 条事实在全部原件中都找不到 | kb-industry-src |
| S2 | 中 | 合并记录的 `artifact_capture` 只指向单一源文件，26 条事实指不回原件（industry-jd 16、jd-2 10） | Lead（merge 层） |
| S3 | 中 | locator 达标率 61%，仍有 12 份清单为 0 或极低（jd-2、recruitment、medical、medical-2026、salary、salary2、admissions2、admissions-others、admissions-92b、hosp、pilot、supplementary） | 各线 |
| S4 | 中 | `valid_through` / `valid_from` 已入白名单但使用量 0，招聘类「已过期」无法过滤 | community-account-match / kb-medical-src |
| S5 | 低 | 独立 `.txt` 覆盖偏低（827 事实里多数仍依赖 bundle 快照）；不影响正确性，但工具链不便 | 各线 |
| S6 | 低 | T2 空白 6 校、T3 空白 3 校 | kb-admissions-src / kb-learning-src |
| S7 | 低 | 9 份 legacy 清单无 handoff（已冻结，不计入对外报表） | — |

## 8. 建议指令清单（提交 Lead，请统一派发）

| # | 给哪条线 | 什么问题 | 建议怎么做 | 优先级 |
|---|---|---|---|---|
| 1 | kb-industry-src | S1：salary2 人社部表 4 条事实无原件 | 重抓该 PDF 并确认表 1-1/1-3/1-4 与调查方法段在正文中，或删除这 4 条并在 REPORT 记「未取得」 | **P0** |
| 2 | Lead（merge 层） | S2：合并记录 artifact 指针歧义 | `artifact_capture` 改为按来源挂载，或 record 增 `evidence_paths[]`；否则「逐字可复现」只能做到目录级 | **P0** |
| 3 | community-account-match | S3/S4：jd-2 locator 0/7、recruitment 0/7；valid_through 未用 | 补 locator（岗位名+页内位置+SPA 说明）；招聘公告填 `valid_through`（无明确截止则写「未公布」并在 note 说明） | P1 |
| 4 | kb-medical-src | S3：medical 0/15、medical-2026 0/9、salary 0/6、hosp 4/21 | 补 locator（附件/表号/条款号） | P1 |
| 5 | kb-industry-src | S3：salary2 0/18；onet/standards/industry 已达标 | 补 salary2 的 locator | P1 |
| 6 | kb-admissions-src | S3：admissions2 0/13、admissions-others 0/5、admissions-92b 2/14 | 补 locator | P1 |
| 7 | kb-admissions-src | S6：T2 空白 6 校、T3 空白 3 校 | 按分层优先级补：T3（中国医大/重医/天医）优先于 T2 尾部校 | P1 |
| 8 | kb-learning-src | S6：T2 空白校课程 | 补南开/厦大/华东师大/北理工/大工/华南理工的课程或培养方案 | P2 |
| 9 | community-account-match | S5：独立 txt 缺失 | 对 JD 类补充 `.txt`（当前 0），便于工具链校验 | P2 |

## 9. round-4 复核目标

1. S1 的 4 条事实：确认补齐或明确删除（目录级命中率 → 100%）。
2. S2 的指针方案是否落地（目标：26 条跨文件事实可各自复现）。
3. locator 达标率 61% → ≥80%。
4. `valid_through` 使用量 0 → 招聘类全部填写。
5. T2 空白 6 → ≤4，T3 空白 3 → ≤2。
