# 知识库扩充总验收（招生 / 岗位标准 / 医学 / 产业）

更新时间：2026-10-23
工作目录：`limen_project_files`（主工程）
落库状态：**全部只生成可导入 SQL，未写远端库**（按用户决定；本机无 Supabase CLI 链接）

## 1. 总量

| 清单 | 来源 | 记录 | 事实（facts） | SQL | 分片 | 采集失败 |
| --- | --- | --- | --- | --- | --- | --- |
| `admissions`（6 校招生规则） | 7 | 21 | 21 | 1.67 MB | 18 | 0 |
| `admissions-others`（南医大/浙大） | 2 | 5 | 5 | 2.31 MB | 12 | 0 |
| `standards`（O*NET 网页 + 中国国家职业技能标准） | 10 | 10 | 40 | 7.80 MB | 40 | 0 |
| `onet`（O*NET 官方 DB 30.0，RIASEC + 技能 IM/LV） | 6 | 6 | 12 | 0.14 MB | 14 | 0 |
| `medical`（规培/科室/招聘/薪资口径） | 12 | 15 | 48 | 1.94 MB | 28 | 0 |
| **合计** | **37** | **57** | **126** | **约 13.9 MB** | **112** | **0** |

所有记录的 `facts[].quote` 均通过 `text.slice(start,end) === quote` 校验；`verification = quote_verified`。

## 2. 分类覆盖

| category | 记录数 | 说明 |
| --- | --- | --- |
| `admissions` | 26 | 专业代码 × 年份 × 初试科目 × 跨考/身份限制 |
| `occupation` | 16 | O*NET 职业定义/任务/技能/RIASEC + 科室职责 |
| `recruitment` | 5 | 医院信息中心、病案编码、科研博士后等医院官网公告 |
| `industry` | 4 | 规培法规、执业门槛、统计口径 |
| `learning` | 6 | 住院医师规范化培训相关培训要求 |

## 3. 各线交付要点

### 招生规则（26 条 / 8 校）
- 中山 9、川大 3、电子科大 1、东南 2、西交 4、上交 2、南医大 3、浙大 2（+ 天大 0，格式未适配）
- **真跨考限制 4 条**（`relation: direct`）：西交临床 1051 仅限西医临床本科；西交口腔 + 规培证限制；上交跨专业须审核并加试两门本科主干课
- 诚实排除：中山 100401 流行病与卫生统计学（科目行不连续）、`medical_ai_pm` 无对口专业（原误映射口腔已删除）

### 岗位标准（16 条）
- O*NET 网页源（`Updated 2026`，0–100 口径）：职业定义、Tasks（Importance + Core）、Essential Skills（Importance）、RIASEC 六维
- O*NET 官方 DB 30.0（`Interests.txt` / `Skills.txt`）：RIASEC 原始分值 + 技能 **IM/LV 双尺度**（补上网页缺失的 Level）
- 中国官方标准：《人工智能工程技术人员国家职业技术技能标准（2021年版）》2-02-10-09、《大数据工程技术人员》2-02-10-11、人社厅发〔2021〕10号
- **诚实结论**：中国没有公开的 RIASEC 常模；三岗在中国均非执业许可类，官方无对应准入证；网页与 DB 两条线口径不混用，各自标注版本与尺度

### 医学方向（15 条 / 48 事实）
- 规培：国卫科教发〔2014〕49号（3 年、可顺延、基地须三甲）、教育部等六部门教研〔2014〕2号（5+3 与专硕并轨）、四川省卫健委（硕士≥2 年/博士≥1 年/衔接轮转≥33 个月）、华西 2026 简章（4 年制检验不能报考、退培 3 年限制）、协和 2026 招录
- 科室：无锡转载《医疗机构基本标准（试行）》三级医院 13 临床科室 + 病理科/病案室 + 每床 1.03 卫技配比（**1994 年版，非现行**）
- 招聘：华西信息中心 2 条、病案科编码岗、协和科研博士后（均医院官网原文）
- 薪资：国家统计局 2025-05-16「卫生和社会工作」非私营 143173 元 / 私营 75287 元 + 两条口径定义
- **诚实结论**：「医院具体岗位薪资」中国无官方公开数据；4 条招聘记录 `salary` 全部缺失并写明 `missing_fields`

## 4. 工程层成果

| 产出 | 说明 |
| --- | --- |
| `docs/testing/knowledge-handoff-contract.md` | 研究线交接契约（只许官网、禁止培训机构站、literal 必须逐字可核） |
| `scripts/knowledge/verify-handoff.ts` | 交接自检器（literal 子串、role/field/context 合法性） |
| `scripts/knowledge/merge-handoff.ts` | 整合器：按 `url+role+category` 合并为「一条记录多事实」，与 collect 的空白归一化对齐，校验 `publication_pattern` 证据，同 URL 固定 source id |
| `scripts/knowledge/build-admissions-sample.ts` | `data/admissions.sample.json` 从 **0 → 6 条**（15 条排除原因留档） |
| `scripts/knowledge/build-onet-handoff.ts` | 从 O*NET 官方 DB 文本归档抽取 RIASEC + IM/LV |
| `scripts/knowledge/build-admissions-others.ts` | 三种院校排版适配器（南医大/浙大/天大） |
| schema 最小扩展 | `classify.ts` 增加 `interests` 字段；`collect.ts` 允许 `text/plain` + `downloaded_text`；allowlist 增加 `standards/onet/medical/admissions-others` |

复现：
```bash
npx tsx scripts/knowledge/build-onet-handoff.ts
npx tsx scripts/knowledge/merge-handoff.ts work/knowledge-standards/handoff.json standards
npx tsx scripts/knowledge/collect.ts standards
npx tsx scripts/knowledge/prepare-import.ts standards
```

## 5. 未完成与已知缺口（如实）

1. **`industry` / `learning` 两条研究线中途失败**：原料已落盘（`work/knowledge-industry/`：互联网+医疗健康政策 6.5K；`work/knowledge-learning/`：仅 21 字符不可用），未转成 handoff。产业线的 cmde 附件抓到 0 字符。
2. **天大（tju）目录适配失败**：行格式为「080100力学 01不区分研究方向 (1)全日制 ①101…」，脚本未命中，0 条。
3. **复旦/华科**：复旦附件正文 6886 字符但无 ①101 结构；华科 download.jsp 返回非 PDF，均未产出。
4. **科室标准是 1994 年版**：卫健委主站 412 反爬、多个省级站 TLS/超时/重定向失败，未取得 2022/2025 版评审标准。
5. **结构化工程缺口仍在**：`match_*` 四张表未创建、无 `schema_migrations`、5 张业务表 0 索引、无中文全文索引（建议 `pg_trgm`）。
6. **未写远端库**：需维护者执行 `npx supabase db query --linked --file work/knowledge-<name>/import-parts/00X.sql`。

## 6. 下一步优先级

1. 把 `industry`（政策/统计）与 `learning`（培训/资源）两条线重跑或我直接从已有原料转 handoff
2. 适配天大/复旦排版，或改走「章程类事实」而非目录行
3. 工程层：`schema_migrations` + 索引 + `pg_trgm` 中文检索（先出草案，经确认再执行）
4. 由维护者决定是否导入远端库（当前 SQL 已就绪、幂等 `on conflict (id) do update`）
