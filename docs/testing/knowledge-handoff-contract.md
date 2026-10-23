# 知识库交接契约（研究线 → 整合线）

本文件约束**所有外部研究线的产出格式**。整合线（Lead）只接受符合本契约的交接文件；不符合的直接退回，不进 manifest、不进 SQL。

## 0. 铁律（违反即作废）

1. **只允许官方/权威一手来源**：
   - 中国院校：`*.edu.cn` 研究生院/研招网页面或 PDF；教育部 `moe.gov.cn`；省级教育考试院。
   - 中国职业标准：`osta.org.cn`（人社部职业技能鉴定中心）、`miit.gov.cn`（工信部）、`nhc.gov.cn`（国家卫健委）、`mohrss.gov.cn`（人社部）。
   - 统计口径：`stats.gov.cn`（国家统计局）、`nhc.gov.cn` 统计年鉴。
   - 美国职业数据：`onetonline.org` 官方页面或其 `*.txt` 数据文件。
   - **禁止**：考研培训机构站（xxxedu、kaoyan、offcn、iqihang 等）、百科、公众号转载、CSDN/知乎、招聘聚合站。
2. **任何事实必须能在本地已下载原文里逐字找到**（exact substring），并用 `scripts/knowledge/verify-handoff.ts` 自检通过。
3. **不许编造**：不给分值、不给录取率、不给"约等于"、不把第三方解读写成官方原文。原文没写就是没有 → 放进 `missing_fields`。
4. **不许推断**：原文说 A 专业限制，不得外推到 B 专业。
5. 抓取失败必须如实写进报告的「失败清单」，不得用其它来源顶替后声称成功。

## 1. 抓取工具（只读，安全）

```bash
# HTML 页面：保存 raw+txt，打印 sha256 与关键词上下文
$env:PROBE_OUT_DIR="work/knowledge-<stream>"
npx tsx scripts/knowledge/probe.ts "<https_url>" "<artifact-id>"

# PDF：保存 pdf，用 pypdf 抽文本，打印 sha256 与关键词上下文
$env:PROBE_OUT_DIR="work/knowledge-<stream>"
npx tsx scripts/knowledge/probe-pdf.ts "<https_url>" "<artifact-id>" "关键词1" "关键词2"

# 在抽取文本里定位「专业代码+名称+人数+考试科目」严格配对行（招生类专用）
npx tsx scripts/knowledge/scan-rows.ts work/knowledge-<stream>/<artifact-id>.txt "临床医学" "医学技术"
```

注意：
- `probe`/`probe-pdf` **拒绝重定向**（redirect: error）。若报 `redirect`，说明该 URL 不是最终地址，换官网直链。
- 只接受 `text/html`、`text/plain`、`application/pdf`。
- PDF 常有词内换行（`专 业代码`）与页码串（`住院 6 / 17 医师`），写正则要带 `\s*` 或 `[\s\S]{0,20}?` 容错。
- TS 字符串里 `"[\s\S]"` 是非法转义（等于 `"sS"`），必须写 `"[\\s\\S]"`。交接文件里只写 **literal 原文串**，正则转义由整合线处理。

## 2. 交接文件格式

路径：`work/knowledge-<stream>/handoff.json`（UTF-8，无 BOM，数组）

```json
[
  {
    "stream": "admissions | standards | medical",
    "category": "admissions | occupation | industry | recruitment | learning",
    "source": {
      "id": "小写-连字符-3到80字符",
      "url": "https 官方直链",
      "organization": "发布机构全名",
      "title": "文件标题（照原文）",
      "jurisdiction": "CN | US | global",
      "source_tier": "primary",
      "published_at": "YYYY-MM-DD 或 null",
      "publication_date_note": "发布日期依据/为何未知"
    },
    "artifact": {
      "raw_path": "work/knowledge-<stream>/<id>.<pdf|raw>",
      "text_path": "work/knowledge-<stream>/<id>.txt",
      "content_type": "application/pdf | text/html",
      "sha256": "raw 文件 sha256（probe 输出的 raw.sha256）"
    },
    "quotes": [
      {
        "role_id": "必须存在于 data/knowledge/roles.json",
        "field": "见第 3 节允许字段",
        "literal": "从 text_path 里逐字复制的连续原文（10–1600 字符）",
        "title": "中文标题（≤250 字，编辑索引，不得伪装成官方结论）",
        "summary": "≤600 字",
        "applicability": "≤700 字，写清适用范围与不适用范围",
        "relation": "direct | related | context",
        "tags": ["≤30 项"],
        "context": { "institution": "...", "program": "...", "admission_year": 2027, "region": "..." },
        "expected_fields": ["本记录预期包含的字段"],
        "missing_fields": ["本记录确认缺失的字段"],
        "note": "这条对应原文哪一段（人工可读）"
      }
    ]
  }
]
```

## 3. 允许的字段名（来自 `src/lib/knowledge.ts`，越界会被 schema 拒绝）

- `admissions`：`institution` `program` `admission_year` `exam_subjects` `cross_major_restrictions` `training_direction` `admission_requirements` `degree_type`
- `occupation`：`responsibilities` `privacy_requirements` `skills` `career_path` `occupation_definition` `program_definition` `employment_directions` `departments`
- `recruitment`：`employer` `city` `education` `major_restrictions` `technical_requirements` `salary` `job_title` `experience` `job_type`
- `industry`：`scope` `coverage_limit` `design_constraints` `governance_scope` `china_legal_requirement` `talent_demand` `policy_requirement` `policy_goals` `employment_statistics` `salary_statistics` `statistical_definition` `major_catalog`
- `learning`：`topics` `materials` `prerequisites` `access_requirement` `training` `regional_limit` `learning_hours` `research_project` `resource_title`

`context` 可选键：`institution` `college` `program` `admission_year`(2000–2100) `region` `medical_topic` `medical_department` `department_type` `statistic_scope` `evidence_locator`

**注意**：费用/学费、录取分数、报录比、录取概率都**不在允许字段内**，不要尝试记录；如原文以 `policy_requirement`/`admission_requirements` 形式出现可记录其原文，但不得改写成数值结论。

## 4. 自检（提交前必须跑）

```bash
npx tsx scripts/knowledge/verify-handoff.ts work/knowledge-<stream>/handoff.json
```

要求 `ok: true`、`errors: []`。它会检查：literal 是否是 text 的 exact substring、长度区间、`role_id` 是否存在、`field` 是否在该 category 允许集合内、`context` 键与 `admission_year` 是否合法。

## 5. 交付物

1. `work/knowledge-<stream>/handoff.json`（自检通过）
2. `work/knowledge-<stream>/REPORT.md`：逐条来源 URL、发布日期、抓取时间、sha256、命中的原文片段位置；**失败清单**（哪些院校/页面打不开、原因）；明确写出「未取得的字段」。
3. 不得修改：`data/knowledge/admissions.manifest.json`、`scripts/knowledge/build-admissions-manifest.ts`、`work/knowledge-admissions/**`、`src/**`、`supabase/**`。

## 6. 已占用去重键（同 URL 同角色同分类只能一条）

`collect.ts` 以 `url + role_id + category` 去重。以下 URL 已用过这些角色，复用时只能挑**未列出**的角色：

| URL | 已用角色 |
| --- | --- |
| `https://yzb.sjtu.edu.cn/post/3772` | ml_cv, software, llm_agent, devices, signals, imaging_eng, clinical_data, health_systems, med_nlp_kg |
| `https://yzb.sjtu.edu.cn/post/3784` | 同上 9 个 + medicine_guide, medical_ai_pm |
| `https://yzbm.uestc.edu.cn/zsml/sszsml/index/2027` | devices, signals, imaging_eng |
| `https://yz.uestc.edu.cn/info/1081/5968.htm` | devices, signals, imaging_eng, medicine_guide |
| `https://ehall.szu.edu.cn/gsapp/sys/zsjzapp/index.do#/2026/4/124/083100` | devices, signals, imaging_eng |
| `https://yjsy.bjmu.edu.cn/docs/2025-10/2695e1e4d00a4cbe8fd90add52c7a5fb.pdf` | clinical_data, devices, signals, imaging_eng |
| `https://yjsy.bjmu.edu.cn/zslq/zsjzjml/a427e38b26c645eab8e6665c870e98ca.htm` | medicine_guide |
| `https://graduate.sysu.edu.cn/zsw/sites/default/files/2026-10/2.%20中山大学2027年硕士研究生招生学科专业目录.pdf` | ml_cv, signals, imaging_eng, devices, health_systems, medicine_guide |
| `https://graduate.sysu.edu.cn/zsw/node/541` | medicine_guide, clinical_data, medical_ai_pm |
| `https://yz.scu.edu.cn/zsxx/Details/a9e04641-aa5f-401f-892e-f069c0f8ecb2` | medicine_guide, clinical_data, medical_ai_pm |
| `https://yzb.seu.edu.cn/_upload/article/files/6a/83/e8812ecd4b64a03ae869029eae5b/e43d7759-7d78-4c84-a698-ceb01d3f7566.pdf` | devices, imaging_eng |
| `https://yz.xjtu.edu.cn/__local/E/87/9A/3FDEF75C038EF21BE144434C44A_C2E45EA5_45827.pdf` | medicine_guide, clinical_data, medical_ai_pm, health_systems |
