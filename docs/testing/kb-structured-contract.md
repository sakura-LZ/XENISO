# 知识库结构化数据契约（网页调用说明）

> 生成者：结构化数据代理（task：专业→学校→工作→职业 结构化入库）。
> 三份 JSON 由 `scripts/knowledge/build-structured-data.ts` 从 `data/knowledge/*.manifest.json` + `role-aliases.json` 生成；**不要手改产物**，改数据源后重跑脚本。
> 写作时快照（2026-10-23，数据仍在追加，以各文件 `generated_at` 为准）：
> - `role-index.json`：3 个 App 职业，142 / 97 / 88 条事实（由 lead 的 `build-role-index.ts` 生成；**可能滞后于正在追加的 manifests**，见 §五.9）。
> - `school-index.json`：60 校 / 235 记录 / 501 条事实（55 校在调研范围内）。
> - `pathway-map.json`：9 个本科专业 × 67 条路径 = 603 条，覆盖 23 所有招生事实的院校，来自 91 条 admissions 记录。
> - `field-coverage.json`：7 个角色 × 96 个字段的矩阵；3 个 App 职业分别有 37 / 27 / 17 个字段有值。

## 一、文件与用途

| 文件 | schema_version | 用途 | 典型页面 |
| --- | --- | --- | --- |
| `data/knowledge/role-index.json` | `role-index-1` | 以 **App 职业** 为主键聚合五类事实（occupation/admissions/recruitment/industry/learning） | 职业详情、匹配结果解释、知识卡片 |
| `data/knowledge/school-index.json` | `school-index-1` | 以 **院校** 为主键聚合，含每条记录的原始链接与事实原文 | 院校库、院校详情、按校筛选 |
| `data/knowledge/pathway-map.json` | `pathway-1` | **本科专业 → 目标学校/项目 → 职业** 的路径表，`eligibility` 由招生原文推导 | 专业路径页、跨考决策、对比 |
| `data/knowledge/field-coverage.json` | `field-coverage-1` | 职业 × category × field 的有值/缺值矩阵（P2 机器版） | 运营后台、数据质量看板 |

配套文档：`docs/testing/kb-field-coverage.md`（人读矩阵）、`docs/testing/knowledge-inventory.md`（来源清单）、`docs/testing/kb-school-list.md`（院校分层/模板）。

## 二、字段语义

### 2.1 role-index.json

```
{
  schema_version, generated_at, manifests_scanned,
  roles: {
    [appRoleId]: {
      canonical_name, knowledge_role_ids, basis,
      counts: { total, by_category: { occupation|admissions|recruitment|industry|learning } },
      sources: [{ id, organization, url, published_at }],
      by_category: { [category]: Fact[] }
    }
  },
  unmapped_knowledge_roles: string[]
}
```

`Fact`：

| 字段 | 含义 |
| --- | --- |
| `record_id` | 记录 id，可回到对应 `.manifest.json` |
| `record_title` | 记录标题（编辑索引，不是原文） |
| `role_id` | 知识库角色 id（可能是 `guide_*` / `medicine_guide`，不等于 App 职业） |
| `category` | 五类之一 |
| `field` | 字段名（snake_case）；个别采集器写入了中文/缺口说明，见 §五 |
| `value` | **原文逐字引用**（manifest 的 `pattern`/`quote`） |
| `source_id` / `source_organization` / `source_url` | 来源与可点击原文链接 |
| `published_at` | 原文发布日期，未知为 `null` |
| `locator` | 原文中的位置（可能 `null`） |

> `value` 不是摘要，是逐字原文；UI 展示时可用它做「原文」tooltip 或引用块。

### 2.2 school-index.json

```
{
  schema_version, generated_at,
  total: { schools, schools_in_scope, records, facts },
  schools: [{
    institution, tier, in_scope,
    programs: string[],
    counts: { records, facts, sources, by_category, by_app_occupation },
    sources: [{ id, organization, title, url, published_at }],
    records: [{
      record_id, title, category, knowledge_role_id, app_occupation_ids,
      program, admission_year,
      source_id, source_url, source_organization, source_title, published_at,
      facts: [{ field, quote }]
    }]
  }]
}
```

- `tier`：`T1|T2|T3|excluded|unlisted`，来自 `kb-school-list.md`；`in_scope=false` 表示已剔除投入但数据保留。
- `counts.by_category` 是**记录数**（不是事实数）；`counts.facts` 是事实条数。
- `records[].facts[].quote` 与 `source_url` 配对，可直接渲染「证据」列表。

### 2.3 pathway-map.json

```
{
  schema_version, generated_at, note,
  eligibility_rules: string[],
  major_occupation_basis,
  school_tiers_source,
  admission_record_count,
  majors: [{
    id, name, degree_category,
    likely_occupations: [{ occupation_id, canonical_name, basis }],
    path_count,
    eligibility_summary: { direct, conditional, restricted, unknown },
    paths: [{
      target_school, target_program, program_code, admission_year, school_tier,
      eligibility: "direct" | "conditional" | "restricted" | "unknown",
      eligibility_rule,
      eligibility_evidence: [{ record_id, source_url, source_title, quote, field, published_at, applicability }],
      occupation_ids: string[],
      occupation_basis,
      exam_subjects: [{ quote, record_id, source_url }],
      source_record_count, source_manifests
    }]
  }]
}
```

`eligibility` 的口径（必须原样展示给用户，不要简化成「能/不能」）：

| 值 | 含义 |
| --- | --- |
| `direct` | 原文白名单/允许范围**包含**该本科专业，可直接报考（仍受个人身份、医师资格等通用条件约束）。 |
| `conditional` | 可报考，但原文要求加试、补修、专业相近、院系审核等附加条件。 |
| `restricted` | 原文白名单或禁止条款**排除**该专业。 |
| `unknown` | **未取得可判定原文**或条款互相冲突；不等于「可以报」，也不等于「不能报」。UI 必须显示为「原文未给出结论，需查目录/院系」。 |

`occupation_ids` 有两种依据，必须看 `occupation_basis`：

1. 招生记录 `role_id` 经 `role-aliases.json` 机械映射 →「该条招生事实对应的方向职业」。
2. 招生记录角色未被 App 收录（如 `medicine_guide`）时，回退到 `likely_occupations`（本科专业→职业的 LIMEN 编辑映射）→ 仅作出口参考，**不是该条招生事实的结论**。

### 2.4 field-coverage.json

```
{ schema_version, generated_at, note, category_order, field_labels,
  malformed_fields: [{ raw, count }],
  roles: { [roleId]: { role_id, canonical_name, mapped_app_role,
    counts, coverage: { fields_total, fields_with_value, fields_missing },
    matrix: { [category]: { [field]: { present, count } } },
    missing_fields: ["category.field", ...] } } }
```

`missing_fields` 里既有「应有但未采到」，也有「该类别本就不适用」的字段；做缺口统计时请结合 `field_labels` 与类目语义判断。

## 三、网页怎么调用

### 3.1 读取方式（服务端）

数据在仓库根目录 `data/knowledge/`，App 根目录也是仓库根，因此**服务端**可直接读：

```ts
// src/lib/knowledge-structured.ts（示例，需 owner 落地）
import { readFileSync } from "node:fs";
import { join } from "node:path";

const cache = new Map<string, unknown>();

export function loadKnowledge<T>(name: string): T {
  if (!cache.has(name)) {
    const raw = readFileSync(join(process.cwd(), "data", "knowledge", `${name}.json`), "utf8");
    cache.set(name, JSON.parse(raw));
  }
  return cache.get(name) as T;
}
```

- 只在 Server Component / Route Handler / `generateStaticParams` 中使用；**不要**把 1.0–1.6MB 的 JSON 打进客户端 bundle。
- 建议按需切片后传给客户端组件（例如只传当前职业的 `by_category`，或院校页只传一所学校）。
- 若要暴露为 HTTP：`/api/knowledge/role/[id]`、`/api/knowledge/school/[name]`、`/api/knowledge/pathway/[majorId]`，响应加 `Cache-Control: public, max-age=3600`。

### 3.2 职业页：role-index

```ts
const idx = loadKnowledge<RoleIndex>("role-index");
const role = idx.roles[appRoleId];            // appRoleId 用 App catalog 的 id
const facts = role.by_category.occupation;    // 已是 Fact[]
// 渲染：role.canonical_name + role.counts + 按 category 分组的 facts
// 每条 fact 展示 fact.value（原文）+ <a href={fact.source_url}>来源</a>
```

注意：`role-index` 的 `role_id` 是知识库角色，App catalog 的 `clinical_data_analyst` 等能 join 上，是因为 lead 的 `role-aliases.json` 已做等价映射；不要在页面里再硬编码别名。

### 3.3 院校页：school-index

```ts
const schoolIdx = loadKnowledge<SchoolIndex>("school-index");
const school = schoolIdx.schools.find(s => s.institution === name);
// school.counts.by_category 做「招生/课程/职业出口各几条」
// school.records 列表：每条带 source_url；展开显示 facts[].quote
```

支持按 `tier`、`in_scope` 过滤；`by_app_occupation` 可用于「该校园数据覆盖了哪些职业方向」。

### 3.4 专业路径页：pathway-map（P0 主用例）

```ts
const pathway = loadKnowledge<Pathway>("pathway-map");
const major = pathway.majors.find(m => m.id === "clinical_medicine");
const rows = major.paths
  .filter(p => p.school_tier === "T1")
  .sort((a, b) => rank(a.eligibility) - rank(b.eligibility)); // direct→conditional→restricted→unknown

// 每个 row：
// 学校 + 项目（target_program / program_code）+ 年份
// eligibility 徽章 + eligibility_rule 一句话
// 「原文」展开：eligibility_evidence[].quote + source_url
// 职业出口：occupation_ids 用 role-index.roles[id].canonical_name 换成中文名
// 注意：unknown 行不要隐藏，它是「证据不足」的真实状态
```

推荐排序：`direct` → `conditional` → `unknown` → `restricted`（不要把 restricted 排前面，用户主要看可报项；但也不能隐藏）。
推荐筛选：院校分层、`eligibility`、`occupation_ids`、`admission_year`。

### 3.5 从路径跳到职业

`pathway.paths[].occupation_ids` 与 `role-index.roles` 的 key 完全一致（`medical_ai_pm` / `clinical_data_analyst` / `medical_ml_engineer`），可直接作为详情页路由参数；反之从职业页到路径页，用 `major.likely_occupations[].occupation_id` 反查。

## 四、回溯原文的规则

1. 任一条事实都必须能落到 `source_url`；`quote`/`value` 与 `.manifest.json` 中该记录的 extract 逐字一致。
2. `pathway.eligibility_evidence` 的 `quote` 可能由同一条 extract 的多个分句用「；」连接（原分句逐字未改），用于展示规则依据；要引用完整原文请回到 `record_id` 对应 manifest 的该 extract。
3. 记录级标题/`record_title` 是 LIMEN 编辑索引，不是官方标题；官方标题在 `sources[].title`/`source_title`。
4. `published_at` 为 `null` 表示原文页未标注日期，不代表没有版本；招生年度看 `admission_year`。

## 五、口径、坑与已知缺口

1. **`unknown` 不是「可报」**：603 条路径中约一半是 unknown，原因是知识库只有 91 条 admissions 记录、且多数全校章程只写同等学力加试。UI 必须显示「原文未给出结论」。
2. **role-index 不含院校/项目上下文**：`Fact` 没有 `institution`/`program`。要按校展示请用 `school-index`；要按「专业→学校」请用 `pathway-map`。若要让 role-index 也带上下文，需要改 lead 的 `build-role-index.ts`（不在本代理边界内），本文档建议的替代是 `record_id` → manifest 反查。
3. **`field` 名污染**：部分采集记录把缺口说明写进了 `field`（如 `access_requirement（未列具体专业代码与外语要求）`）。`field-coverage.json` 已把可归一的字段归一（`access_requirement`），无法归一的（中文标签）列入 `malformed_fields`（166 条原始值）；role-index 里仍保留原值，UI 展示时应只对 snake_case 字段做图标/文案映射。
4. **职业映射是编辑性的**：`role-aliases.json`、`likely_occupations` 都不是官方职业分类；页面必须标注「LIMEN 编辑性对应」。
5. **院校覆盖不均**：`school-index` 有 54 校，但只有 23 校有 admissions 事实可进 `pathway-map`；其余学校只有课程/职业事实。路径页不要暗示「所有学校都能查」。
6. **路径粒度**：一条 admissions 记录可能同时覆盖多个专业代码，脚本会按代码拆成多条路径；`program_code` 可能为 `null`（全校章程，`target_program = "全校招生章程（未限定专业）"`）。
7. **数据在持续追加**：三个文件都是快照，`generated_at` 是版本；页面不要缓存跨天不刷新，建议部署时构建期读、或加短 TTL。
8. **重复记录**：脚本已按 `record_id + source_id` 去重（跨清单重复收录）；role-index 由 lead 脚本生成，去重口径以它为准。
9. **role-index 可能滞后**：它由 lead 的 `build-role-index.ts` 生成，而采集线还在追加 manifest。`field-coverage.json` 已改为直接从 manifests 按 aliases 聚合（写本文时 App 职业事实为 158 / 109 / 99，而 role-index 快照为 142 / 97 / 88）。页面若依赖 role-index，请在部署/验收前重跑 `npx tsx scripts/knowledge/build-role-index.ts`，或改用 `field-coverage`/`school-index` 的当前口径。

## 六、重新生成与自检

```powershell
cd "D:\医学生跨考平台\limen_project_files"

# 只重生 P0 路径表
npx tsx scripts/knowledge/build-structured-data.ts pathway

# 全部（pathway + school-index + field-coverage.json + kb-field-coverage.md）
npx tsx scripts/knowledge/build-structured-data.ts all
```

自检（脚本无内置断言，建议每次跑完执行）：

```powershell
node -e "
const j=require('./data/knowledge/pathway-map.json');
let bad=0,total=0;
for(const m of j.majors) for(const p of m.paths){ total++;
  if(p.eligibility!=='unknown'){
    if(!p.eligibility_evidence.length) bad++;
    for(const e of p.eligibility_evidence) if(!e.quote||!e.source_url) bad++;
  }
}
console.log({total,bad}); if(bad) process.exit(1);
"
```

- 期望：`bad=0`；`eligibility` 四值分布合理（direct 不应占多数）；每条非 unknown 都有证据。
- 若 `bad>0`：说明新的 admissions 记录缺少 `pattern` 或 `source.url`，回到采集线修复，不要在产物里补写。

## 七、给页面 owner 的最小接入清单

- [ ] 加一个 server-only loader（§3.1），不要客户端 import。
- [ ] 职业页用 `role-index`，院校页用 `school-index`，专业路径页用 `pathway-map`。
- [ ] `unknown` 文案统一为「原文未给出结论，需查招生目录/院系」，不显示为「可报/不可报」。
- [ ] 每条事实渲染 `source_url` 外链；路径页证据可折叠。
- [ ] 标注「LIMEN 编辑性映射」与数据快照时间 `generated_at`。
- [ ] 不要把 1MB+ JSON 塞进 RSC props 全量下发；按页面切片。
