# LIMEN-Match V2 设计与实施计划

> 状态：**P0 已实现并验收**（`limen-match-v2.1` / 契约 `match-2`，见 `docs/testing/match-v2-p0.latest.md`）；**P1 官方标准与技能量尺已完成**（O*NET 31.0，`onet-31.0+limen-2026-10-23` / `limen-skills-2`）；**候选集已扩为「9 个特化 + 医学」共 10 个方向**（`ml_cv` / `software` / `llm_agent` / `devices` / `signals` / `imaging_eng` / `clinical_data` / `health_systems` / `med_nlp_kg` / `medicine`；每方向 7 项技能，兴趣按该特化候选 SOC 的 OI 等权平均，技能取该特化自己的第一个可用 SOC 分量）；**兴趣补充度量已落地**（六边形码 / 环形 EMD / 个体内标准化，只作诊断，不参与排序）；**招生结构化部分完成**（7 条，按组展开到特化）；**离线评测集已完成但结论为"未达标/样本不足"**。验收见 `docs/testing/match-v2-p1.latest.md`。P2-1（中文 JD 派生重要性）仍未做。
> 已知风险：10 方向的 O*NET 兴趣轮廓两两相关均值约 0.8、最大 1.0，`interest_diagnostics` 会判 `discriminative=false`；这不是算法错误，而是候选集共享 SOC 导致「兴趣维度排序信息有限」，顺序主要由准备度与资格决定，界面上必须保留该提示。
> 依据：2026-10 文献调研、海外与国内竞品调研、现有 `src/lib/match` 代码审计。
> 原则：仍然**纯确定性、不调用大模型评分、不写远端数据库**；只把"算得对、算得出、说得清"三件事做实。

---

## 一、V1 诊断：三个正确性问题 + 一个可得性问题

| # | 问题 | 位置 | 性质 |
|---|---|---|---|
| D1 | 兴趣用"各自 min-max 后 100×(1−平均绝对差)" | `engine.ts` interest() | **实证有反证** |
| D2 | 能力准备度是对称、可补偿的加权平均 | `engine.ts` readiness() | **与失配理论冲突** |
| D3 | 排序是"兴趣降序→准备度降序"的字典序，无稳定性与不确定度 | `engine.ts` match() 末段 | 任意性 + 伪精确 |
| D4 | 真实模式三岗位标准全为 `unknown()`，招生恒为 `[]` | `catalog.ts` / `api/match/route.ts` | **产品不可用** |

D1–D3 是"算错"，D4 是"没得算"。**D4 优先级最高**：没有标准，算法再精也只是空转。

---

## 二、文献与竞品给的四条硬约束

### 1. 兴趣相似度应该用"轮廓相关"，不是"归一化距离"

- Xu & Li (2020) 在 n=303 上比较四种 RIASEC 一致性算法（欧氏距离、角度一致性、profile deviance、相关），对满意度/生活满意度/离职意向/感知 P-J fit 四项结果，**correlation 完全占优**。JCA 28(4):571–588，[DOI](https://doi.org/10.1177/1069072720909825)。
- Tay, Su & Rounds (2011) 用 26 个兴趣量表、N=1,008,253 证明 RIASEC 对立维**正相关**（r=.17~.53），六维不正交——等权欧氏距离的坐标假设不成立。JCP 58(3):424–440，[DOI](https://doi.org/10.1037/a0023488)。
- Edwards (1993) 指出 profile similarity 指数混杂"水平"与"形状"，且隐含等权；相关天然消除 elevation。Personnel Psychology 46:641，[DOI](https://doi.org/10.1111/j.1744-6570.1993.tb00889.x)。
- 官方 O*NET **从不给百分比**：职业侧发布 OI（1.00–7.00 分析师评分）与 IH（高分码），链接方法是相关/排序，官方措辞明确它衡量"画像形状"而非"水平高低"。见 [Interests 数据字典](https://www.onetcenter.org/dictionary/29.0/excel/interests.html)、[Career Returns within the O*NET Interest Profiler Tools](https://www.onetcenter.org/reports/IP_Career_Returns.html)。
- 效标上限：Hanna & Rounds (2020) 元分析（近百年研究）兴趣量表预测职业选择命中率 **50.8%**。Psych Bulletin 146(9):765，[DOI](https://doi.org/10.1037/bul0000269)。→ 任何"匹配度高=适合"的叙事都超出证据。

### 2. 能力差距应当"非对称、非补偿"

- Wiegand, Drasgow & Rounds (2021) 两个大样本 + 多项式回归/响应面：失配效应**非对称**，取决于"环境过剩"还是"不足"，且 misfit 比 fit 更能解释结果。JVB 125:103524，[DOI](https://doi.org/10.1016/j.jvb.2020.103524)。
- Edwards (1991) demands–abilities 框架：只罚"不足"，不罚"过剩"。
- 方法学共识：不要用差值分数，用多项式回归；但工程上可先落地"非对称 + 关键项不参与平均"。

### 3. 不该合成单一"适合度"

- OECD/JRC (2008) Handbook：合成指数必须做敏感性分析；维度不可替代时警惕加性聚合；几何平均适用于"不可完全替代"。[DOI](https://doi.org/10.1787/9789264043466-en)。
- 海外成熟产品**没有一家**对 C 端"跨职业"给单一百分比：O*NET 只排序、Eightfold 用 0–5 星、LinkedIn 用"x of y skills"、Pathful 只给规划；唯一大方给百分比的是**针对单一 JD** 的 Jobscan，且公开了优先级与"哪些不计入"。

### 4. 缺失必须显式化，不能填 0

- Rubin (1976) MCAR/MAR/MNAR；Newman (2014) 五条实操准则（报告缺失率、检验机制、FIML/MI、敏感性分析）。缺失当 0 等价于假设"最差水平"，引入系统偏差。
- 小样本边界：Button 等 (2013) 说明小样本效应量虚高；专家成对比较 <200 对时，排序一致性只能定性解读。

### 竞品可直接抄的 5 条

1. O*NET：**只排序不给分**，并明说"形状非水平"。
2. Eightfold：**0–5 星**（0.5 递增）替代伪精确百分比；审计连"排除样本数"都披露。
3. LinkedIn：**"已具备 6 / 要求 10 项"** 的 gap 卡，比"63%"可行动。
4. CareerExplorer：分数拆成 5 个可读因子（兴趣/环境/薪资/需求/**培训缺口与时间成本**）。
5. Jobscan：公开**优先级顺序**与**缺失项规则**（JD 没要求就不扣分）。

### 竞品踩过的坑（必须避开）

1. **让 LLM 直接产出事实**：国内实测中豆包把 509 分算成 32935 名（实际 43674–44239）、推荐选科不符专业；川大已撤销专业仍被推荐。→ 位次/资格/专业是否存在**只能查表**，LLM 只许做解释。
2. **卖确定性**：江苏市场监管负面清单禁用"内部信息/志愿填报成功率/保录取/不滑档"；98 元 VIP 因"数据失真"被投诉；3980 元 96 志愿全滑档进法院。→ 只给区间与档位，不给单点概率。
3. **信息残缺诱导付费**：免费看 3 个、会员 99–2988 元，退款难 → 口碑反噬。→ 核心判断永久免费，付费只买增量。

---

## 三、V2 算法规格

### 3.0 契约扩展（`contracts.ts` → `match-2`）

```ts
// Fact 增加可靠性，Used by 衰减与置信度
type Fact<T> = {
  value: T | null;
  status: "known" | "unknown" | "unverified" | "not_applicable";
  evidence: Evidence[];
  reliability?: number;        // 0–1，缺省 0.8（自评）/1.0（核验过）
};

// 官方评分带不确定度
type Rating = { value: number; se?: number; n?: number; lower?: number; upper?: number; suppressed?: boolean };

// 职业兴趣改为官方双标度
interests: {
  oi: Record<Area, Rating>;      // 1.00–7.00
  ih: Area[];                    // 高分码最多 3 个
  scale: { min: 1, max: 7 };     // 官方已核实
  scale_evidence: Evidence;
}

// 技能标准增加"必须项"与证据来源
skills: { skill_id; importance: Fact<Rating>; required_level: Fact<Rating>; must_have: boolean }[]
```

版本：`schema_version: "match-2"`、`algorithm_version: "limen-match-v2.0"`、`skill_standard_version: "limen-skills-2"`。

### 3.1 维度 A：兴趣轮廓相似度（替换 D1）

```ts
// 1) 只在各自仪器内标准化（用户 30 题 → 6 维原始分；职业 → OI）
// 2) profile 相关：等价于先各自中心化再求相关，天然消除"水平"
const r = pearson(center(user.raw6), center(occupation.oi6));   // r ∈ [-1, 1]
const shape = (r + 1) / 2;                                       // 0–1
// 3) 官方高分码一致性（可解释、可用于展示）
const iachan = iachanM(user.top3, occupation.ih);                 // 0–28 → /28
// 4) 置信区间：Fisher z 变换 + 用户侧测量误差
```

- 展示文案固定："**兴趣轮廓相似度（形状，非水平、非适合度）**"。
- `coverage = 1` 仅当六维齐全且职业 OI 齐全；否则未知（保持 V1 的未知语义）。
- 若用户侧可靠性 ρ_u（Mini-IP 5 题/维，Spearman–Brown 推算 α≈.73–.80），对 r 做**衰减校正**并放宽 CI，而非直接报点估计。
- 备选对照实现保留欧氏距离，仅用于回归测试证明改动方向。

**Demo 数值对照（simulation 数据，v1 → v2 shape）**

| 岗位 | V1（归一化距离） | V2（轮廓相关 shape） | 说明 |
|---|---|---|---|
| 医学 AI PM | 95.00 | 97.6 | 轮廓几乎同构 |
| 临床数据分析 | 78.33 | 74.6 | 形状差异被放大 |
| 医学 ML 工程 | 76.67 | 69.5 | 关键维（S/E）反向，v1 惩罚不足 |

### 3.2 维度 B：能力准备度（替换 D2）

两层非补偿结构：

```
Layer 1（必须项，非补偿）：
  for each must_have skill: status ∈ {met, below, unknown}
  任一 below → cap = 59，并单独输出"关键缺口"

Layer 2（加权充足度，可算项）：
  S = 100 · Σ w_i·min(c_i / r_i, 1) / Σ w_i      （仅 observed 项进分母）
  其中 c_i 先做测量误差衰减：c_adj = 2 + ρ_i·(c_i − 2)，ρ=0.8 自评 / 1.0 有作品或确定性评价

最终：score = min(S, cap)；coverage = Σ_observed w / Σ_all w
差距：gap_i = max(0, r_i − c_i)（非对称，过剩不罚，只报"可迁移优势"）
```

- `r_i = 0` 且 `c_i` 已知 → 该项视为满足（保留 V1 处理）。
- 合理性检查：单独提高任一技能，分数**不得下降**（单调性属性测试）；删除一个未观测技能，分数变化只能来自 coverage，不能来自 S。

### 3.3 维度 C：转型可行性线索（增强）

在 V1 两项（偏好重合、最近同岗位投入意愿）之外，新增**可核算的补齐成本**：

```
required_hours = Σ_i gap_i · hours_per_level(skill_i)     // 参数必须有出处，缺省 unknown
available_hours = weekly_hours · horizon_weeks            // horizon 由 target_year 推算
load = required_hours / available_hours
burden = 1 − min(1, load)                                  // 0–1，越高越轻松
```

- `hours_per_level` **没有可信来源时保持 unknown**，不编造；此时 C 维度退化为 V1 两项，并显式标注"时间成本未知"。
- 该维度**永不参与职业排序**（保持 V1 结论），只作决策辅助。

### 3.4 维度 D：升学条件适配度（改为规则引擎 + 三值逻辑）

```
program.status:
  1) plan_mismatch  ← target_year/study_intent 与项目不符
  2) expired        ← valid_through < today
  3) unknown        ← mapping_evidence 未核实 / 任一子句 unknown
  4) not_met        ← 任一硬条件明确不满足（否决先成立）
  5) met            ← 全部子句为 true 且科目/跨考字段齐全
```

- 每条规则输出：`clause_id / field / allowed / actual / status / source_clause_url / effective_from`。
- **未知输出"待确认材料清单"**（例："请确认是否已取得住培合格证"），不静默否决。
- **聚合方式改变**：不再用"满足项目比例"当分数（项目不等权、不可比）。改为结构化输出：`可报 N 项 / 待确认 M 项 / 明确不符 K 项` + 每项证据。若必须给数值，仅给 `可判定项目的覆盖率`，不叫适配度。
- 规则以 **DMN 决策表**形态存储（OMG DMN 1.5），便于人工审阅与 diff；软条件用表达式，硬条件用决策表。

### 3.5 排序与不确定性（替换 D3）

```
Step 0  硬资格 not_met → 移出推荐区（保留展示 + 原因）
Step 1  保留 interest.status=complete 且 readiness.status=complete
Step 2  Pareto 支配筛选（interest, readiness）：被支配者不推荐
Step 3  Pareto 前沿内用几何平均标量化排序（仅内部用于排列表）
        U = Π x_i^{w_i},  x_i = 0.05 + 0.95·s_i,  Σw = 1,   缺省 w = (0.5, 0.5)
Step 4  敏感性：w ±20%、归一化切换、coverage 阈值 0.5/0.7/0.8
        输出 rank_range（最好/最差名次）与 stability ∈ {stable, unstable}
Step 5  对外只展示：名次区间 + 星级/四档 + 分维度分 + 覆盖率
```

- **对外永不输出"综合适合度 %"**；内部标量仅用于生成顺序。
- 任一维度 partial → 进"信息不足"区，不与完整排序混排（保留 V1 原则）。
- 同分用 `occupation_id` 稳定打破（保留）。

### 3.6 报告结构（新增字段）

```ts
confidence: { level: "high"|"medium"|"low"; coverage: number; notes: string[] }
rank_range: [number, number] | null
stability: "stable" | "unstable"
sensitivity: { weight_delta_pct: number; top10_jaccard: number; flips: string[] }
data_manifest: { occupation_standards_version; skill_standard_version; rule_set_version; fetched_at }[]
```

---

## 四、数据建设（解决 D4，阶梯式）

### P1-1 O*NET 官方标准导入（最高性价比，1–2 天）

> **实施状态（2026-10-23）**：已完成，见 `docs/testing/match-v2-p1.latest.md`。
> 实际做法与本节计划的差异（均为实测后的修正，不是缩水）：
> 1. 数据源改为**官方数据库文本表**而非 Web Services：`db_31_0_text.zip`（13,183,034 字节）在本机网络整包下载会超时，改用 ZIP 中央目录 + HTTP Range 只取 `Essential Skills.txt`、`Transferable Skills.txt`、`Career Interest Types.txt`、`Level Scale Anchors.txt`。理由：API 的 `/details/skills` 只给 importance，没有 LV；而 LV 与 N/SE/CI/suppress 只在数据库表里。
> 2. O*NET 31.0 **没有**旧版 `Skills.txt`/`Interests.txt`，RIASEC OI 在 `Career Interest Types.txt`（`1.B.1.a–f`）。
> 3. `required_level` 用**点估计** `round(LV/7×4)`，不是 Lower CI Bound；CI 放 `rating` 里随报告展示。理由：用下限会把每个岗位的要求系统性压低，等于把"不确定"伪装成"要求低"。
> 4. crosswalk 只覆盖 7/9（`machine_learning`、`data_management` 显式 unmapped），因此两岗位各只有 2 项已评分技能。

- 脚本 `scripts/match-standards-onet.ts`（复用 `OnetClient` / `ONET_API_KEY`，服务端运行，不落客户端）。
- 抓取内容：
  - `interests`：OI（1.00–7.00）+ IH 高分码，按 `data/occupation_direction_map.json` 映射的 SOC 代码；
  - `skills`：IM（1–5）、LV（0–7），含 **N / Standard Error / Lower CI / Upper CI / Recommend Suppress / Not Relevant**；
  - 需要 `data/match/onet-crosswalk.json`：把九个 `limen-skills-1` 标签映射到 O*NET 技能 Element（PM、沟通、统计…），无法映射的显式留空。
- 落盘 `data/match/occupations.official.json`，每条带 `Evidence{source_kind:"official", url, retrieved_at, verification:"verified"}` + CC BY 署名。
- **保守取值**：`required_level` 用 **Lower CI Bound** 而不是点估计，避免"高估要求"（或至少双值并存，敏感性分析对比）。
- 这一步做完，**真实个人模式的兴趣与准备度就不再是 null**（用户侧 Mini-IP 已接 O*NET 官方接口，职业侧有了官方分）。

### P1-2 技能等级锚点（BARS，2–3 天）

> **实施状态（2026-10-23）**：已完成 `data/match/skill-rubric.json`（版本 `limen-skills-2`，9 技能 × 5 级）。0–4 级中，标注 `official-anchor` 的例句是 O*NET `Level Scale Anchors` 的 LV2/LV4/LV6 英文原文（保留原文以便核对，未逐字翻译）；第 0 级与第 4 级 O*NET 无锚点，明确标为编辑性描述。

### P2-1 中文 JD 派生重要性（3–5 天）

- 复用既有语料：`data/knowledge/jd-*.collected.json`、`industry-jd`、`hosp-*`、`recruitment`。
- 公式（可复核、可解释）：

```
explicitness ∈ {必须=1.0, 优先=0.6, 提及=0.3}
recency_w  = exp(−Δmonths / 24)
importance_raw(skill) = Σ_jobs w_explicitness · recency_w / Σ_all_skills ……归一化到 1–5
```

- 输出**候选**（`work/match/importance-candidates.json`），标 `review_required`，**绝不自动入库**（沿用 `match-handoff.ts` 的审核模型）。
- 与 O*NET 并存的冲突处理：中国 JD 优先用于"中国岗位"，O*NET 用于"国际基线"，两套并列展示差异，不混算。

### P2-2 招生规则结构化（1–2 周，最大工程量）

- 从 `data/knowledge/adm-*.collected.json`、`medical-2026` 抽取：年份、路径、专业代码、考试科目、跨考限制、硬条件（学位/专业/毕业年份/推免/住培状态）。
- 每条规则保留 `source_clause`（招生简章条款 URL + 抓取时间 + 原文摘录），**禁止推断未写明的条件**。
- 招生规则以"三值 + DNF 路径"存储，支持"若毕业年份 ≥ 2027-09 则满足"式反事实解释。

---

## 五、评测方案（没有真实结果标签也能自证）

### 5.1 可测的指标

| 目标 | 方法 | 门槛 |
|---|---|---|
| 内部一致性 | 专家成对比较 + Krippendorff α | α ≥ .80 才算可信；.67–.80 只作探索 |
| 排序一致性 | Kendall τ（引擎 vs 专家聚合） | ≥ 200 对，报告 CI 不报 p |
| 稳定性 | 权重 ±20% / 归一切换 / 阈值扰动的 Top-10 Jaccard、翻转率 | 翻转率 ≤ 15% 标 stable |
| 单调性 | 属性测试：提高任一技能分不降分；增加无关键不降分 | 100% 通过 |
| 尺度不变 | 所有兴趣原始分乘常数，r 不变 | 100% 通过 |
| 无关字段不变 | 改专业名称中的非关键字段，名次不变 | 100% 通过 |
| 真值恢复 | 合成用户（已知 RIASEC 真值 + 噪声）→ 引擎排序 | Spearman ≥ 0.8 |
| 规则正确性 | 硬规则边界用例表 + 属性测试 | 100% 通过 |

> 明确不做：宣称"准确率""预测效度""亚组公平性"——样本与结果标签都不支持。

### 5.2 新增测试文件

- `tests/match-properties.test.ts`：单调性、尺度不变、无关字段不变、契约拒绝。
- `tests/match-v2.test.ts`：手算 v2 数值（含上表 demo）、非对称差距、必须项封顶、三值规则、排序稳定性。
- `tests/match-golden.test.ts`：冻结 10 个画像的完整报告快照，防回归。
- `scripts/match-eval.ts`：跑专家集与敏感性，产出 `docs/testing/match-eval.latest.md`。

---

## 六、分阶段路线（每阶段都可独立验收）

### P0 算法正确性（1–2 天，不需要新数据）
1. `contracts.ts` → `match-2`：`Fact.reliability`、`Rating`、`interests.oi/ih`、`must_have`。
2. `engine.ts`：兴趣改轮廓相关 + Fisher CI；准备度改两层非补偿；差距改非对称；衰减校正。
3. `engine.ts` 排序：Pareto + 几何标量化 + `rank_range`/`stability`。
4. 新增属性测试与手算测试；`npm test`、`lint`、`build` 全绿。
5. 文档：`docs/LIMEN_MATCH_V1.md` 增补 V2 差异表，旧报告版本号对齐。

**验收**：`match-properties` 全过；demo 三岗分数与 v1 对照表一致；真实模式仍为未知（预期）。

### P1 官方标准接入（3–5 天）
1. `scripts/match-standards-onet.ts` + `data/match/onet-crosswalk.json`。
2. `catalog.ts` 改为读 `occupations.official.json`（读不到时保持 `unknown`，不造假）。
3. `data/match/skill-rubric.json`（首版只覆盖九个技能）。
4. `workbench.tsx`：OI/IM 来源徽章、缺失显示"待审核"、星级替代裸分数。

**验收**：个人模式真实出兴趣分与准备度分（带覆盖率与置信度）；无来源的字段仍显示未知。

### P2 数据扩充（1–2 周）
1. JD 派生重要性候选 + 审核流（脚本 + `work/` 产物）。
2. 技能标准升级 `limen-skills-2`（锚点 + must_have + ESCO/O*NET 交叉映射）。
3. 升级报告版本号，旧报告撤下重算。

### P3 招生规则引擎（1–2 周）
1. `src/lib/match/rules.ts`：三值求值 + DNF 路径 + 反事实。
2. `data/match/admissions.structured.json` 首版（先做 5–10 所学校）。
3. 程序状态改结构化输出，去掉"项目比例"当分数。

### P4 评测与信任（持续）
1. 专家成对标注 ≥200 对接入 `data/match/eval/pairs.json`。
2. `scripts/match-eval.ts` + 发布 `docs/testing/match-eval.latest.md`（含 α、τ、稳定性、翻转案例）。
3. 页面固定声明 + 数据年份徽章 + "必须人工核实的 N 项"清单。

---

## 七、明确不做（护栏）

1. **不做**综合适合度百分比对外展示。
2. **不做**录取概率（考研无位次基础量，无法校准）。
3. **不让** LLM 产出任何数字型事实（位次/资格/专业是否存在/分数线）。
4. **不做**"内部数据""保录取""精准测算"类文案（江苏省负面清单明确禁用）。
5. **不用**缺失值补 0，不用点估计假装确定。
6. **不在**未标数据年份与来源的情况下展示任何录取数据。

---

## 八、参考来源

- Xu & Li (2020) JCA 28(4):571 · [DOI](https://doi.org/10.1177/1069072720909825)
- Tay, Su & Rounds (2011) JCP 58(3):424 · [DOI](https://doi.org/10.1037/a0023488)
- Edwards (1993) PP 46:641 · [DOI](https://doi.org/10.1111/j.1744-6570.1993.tb00889.x)
- Wiegand, Drasgow & Rounds (2021) JVB 125:103524 · [DOI](https://doi.org/10.1016/j.jvb.2020.103524)
- Hanna & Rounds (2020) Psych Bull 146(9):765 · [DOI](https://doi.org/10.1037/bul0000269)
- Hoff et al. (2020) JVB 123:103503 · [DOI](https://doi.org/10.1016/j.jvb.2020.103503)
- Kristof-Brown et al. (2005) PP 58:281 · [DOI](https://doi.org/10.1111/j.1744-6570.2005.00672.x)
- OECD/JRC (2008) Composite Indicators Handbook · [DOI](https://doi.org/10.1787/9789264043466-en)
- Rubin (1976) Biometrika 63(3):581 · Newman (2014) ORM 17(4):372
- Hayes & Krippendorff (2007) · [DOI](https://doi.org/10.1080/19312450709336664)
- Zhang & Balog (2020) KDD · [DOI](https://doi.org/10.1145/3394486.3403202)
- O*NET [Interests 字典](https://www.onetcenter.org/dictionary/29.0/excel/interests.html) · [Skills 字典](https://www.onetcenter.org/dictionary/29.0/excel/skills.html) · [IP Manual](https://www.onetcenter.org/reports/IP_Manual.html) · [Mini-IP Linking](https://www.onetcenter.org/reports/Mini-IP_Linking.html)
- 教育部《2026 年全国硕士研究生招生工作管理规定》· [原文](http://www.moe.gov.cn/srcsite/A15/moe_778/s3261/202509/t20250918_1413836.html)
- OMG DMN 1.5 · [规范](https://www.omg.org/spec/DMN/1.5)
