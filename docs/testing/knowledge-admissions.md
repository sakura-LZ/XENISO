# 招生规则知识库扩充 · 验收记录（第 1–4 批）

生成时间：2026-10-23（本机时区 America/Los_Angeles）
工作目录：`limen_project_files`（主工程；未新建平行工程）
范围：**招生规则**（院校 × 专业 × 年份 × 考试科目 × 跨考/身份限制）
落库方式：按用户决定，**只产出可导入 SQL + 校验报告，未写入远端数据库**

## 1. 当前结论（如实）

| 项目 | 结果 |
| --- | --- |
| 目标规模 30–60 条 | **当前 21 条**，未达标（约 70%） |
| 覆盖院校 | 6 所：中山、四川、电子科技、东南、西安交通、上海交通 |
| 来源 | 7 个官方 URL（PDF 3 份、HTML 4 份） |
| quote 原文校验 | 21/21 通过（`text.slice(start,end) === quote`） |
| 分类自检 | 21/21 判定为 `admissions` |
| 采集失败 | 0 |
| 可导入 SQL | 约 1.67 MB，18 个可续传分片（`on conflict (id) do update`） |
| 远端写入 | **未执行**（按用户决定；本机无 Supabase CLI 链接） |
| lint | 新增脚本 eslint 0 error / 0 warning |

距 30 条还差约 11 条，等同再补 2 所院校（每校 目录 6–9 条 + 章程 2–4 条）。

## 2. 记录清单

### 中山大学（6 + 3 条）

目录 PDF：https://graduate.sysu.edu.cn/zsw/sites/default/files/2026-10/2.%20中山大学2027年硕士研究生招生学科专业目录.pdf

| 记录 id（前缀 `adm-sysu-2027-major-catalog-`） | 专业 | 初试科目原文摘要 |
| --- | --- | --- |
| `guide-ml-cv` | 085410 人工智能 | ①101 ②201 ③301 数学（一） ④408 计算机学科专业基础 |
| `guide-signals` | 085400 电子信息 | ③301 数学（一） ④884 信号与系统 |
| `guide-imaging-eng` | 105800 医学技术 | ③660 医学技术基础（综合）；方向含医学影像技术 |
| `guide-devices` | 105800 医学技术 | ②204 ③302 数学（二） ④866 工程物理 |
| `guide-health-systems` | 107401 社会医学与卫生事业管理 | ③353 卫生综合 |
| `medicine-guide` | 100210 外科学 | ③648 生物医学综合 |

章程（https://graduate.sysu.edu.cn/zsw/node/541）：`adm-sysu-2027-charter-medicine-guide`（报考条件）、`-guide-clinical-data`（同等学力加试两门）、`-medical-ai-pm`（医学类初试三单元 100/100/300）

### 四川大学（3 条）

章程：https://yz.scu.edu.cn/zsxx/Details/a9e04641-aa5f-401f-892e-f069c0f8ecb2

| 记录 id（`adm-scu-2027-charter-`） | 字段 | 要点 |
| --- | --- | --- |
| `medicine-guide` | `admission_requirements` | 报考条件含同等学力四项附加要求（CET 425、核心期刊论文、8 门成绩单、研招办审核） |
| `guide-clinical-data` | `cross_major_restrictions` | 同等学力复试须加试至少两门本科主干课程，不得与初试相同 |
| `medical-ai-pm` | `exam_subjects` | 101/199/201…306/307/408 由教育部考试中心统一命题 |

### 电子科技大学（1 条）

章程：https://yz.uestc.edu.cn/info/1081/5968.htm — `adm-uestc-2027-charter-medicine-guide`（全国统一考试报考条件）

### 东南大学（2 条）

目录 PDF：https://yzb.seu.edu.cn/_upload/article/files/6a/83/e8812ecd4b64a03ae869029eae5b/e43d7759-7d78-4c84-a698-ceb01d3f7566.pdf

| 记录 id（`adm-seu-2027-catalog-pdf-`） | 原文摘录 |
| --- | --- |
| `guide-devices` | `011 生物科学与医学工程学院 083100 生物医学工程 接收 接收` |
| `guide-imaging-eng` | `044 医学院 100207 影像医学与核医学 接收 接收` |

> 该 PDF 不含考试科目，故 `missing_fields` 明确写 `exam_subjects`，不推断。

### 西安交通大学（4 条，本批最有价值）

章程 PDF：https://yz.xjtu.edu.cn/__local/E/87/9A/3FDEF75C038EF21BE144434C44A_C2E45EA5_45827.pdf

| 记录 id（`adm-xjtu-2027-charter-`） | 字段 | 原文要点 |
| --- | --- | --- |
| `medicine-guide` | `cross_major_restrictions` | **1051 临床医学专业学位仅限全日制本科西医临床医学类毕业并获学士学位**（真跨考限制，`relation: direct`） |
| `guide-clinical-data` | `cross_major_restrictions` | 口腔医学专业学位限口腔医学本科；**已获住院医师规范化培训合格证书者原则上不得报考临床/口腔专业学位**（2 条事实） |
| `medical-ai-pm` | `admission_requirements` | 第十条报考条件的学业水平三项 |
| `guide-health-systems` | `cross_major_restrictions` | 自考/网络教育考生须加试两门本科专业基础课，不合格不录取 |

### 上海交通大学（2 条，复用既有原文，零网络成本）

章程：https://yzb.sjtu.edu.cn/post/3784（该 URL 既有库已用 9 个角色，`medicine_guide` / `medical_ai_pm` 此前空闲）

| 记录 id（`adm-sjtu-2027-master-charter-`） | 字段 | 原文要点 |
| --- | --- | --- |
| `medicine-guide` | `cross_major_restrictions` | **跨专业报考须经研招办审核通过，初试合格后除复试外还须加试两门与报考专业相关的本科专业基础主干课程**（真跨考限制，`relation: direct`） |
| `medical-ai-pm` | `admission_requirements` | 第十条报名参加全国统考人员的条件与学业水平要求 |

## 3. 缺失字段（诚实标注）

- 目录类记录普遍缺 `cross_major_restrictions`、`admission_requirements`（目录只列科目与人数）。
- 章程类记录缺 `cross_major_restrictions`（报考条件条）或 `admission_requirements`（加试条）。
- 东南 2 条缺 `exam_subjects`（PDF 不含科目）。
- 中山 9 条、（川大/电子科大/西交/上交）章程条目的其余缺失项见下；**真跨考限制目前只有 3 条**（西交 2、上交 1），这是最稀缺的字段。
- 全部 `valid_through = null`（官方未给失效日期），`freshness_days = 60`，到期由 `isHistorical()` 降级。

## 4. 复现

```bash
npx tsx scripts/knowledge/build-admissions-manifest.ts   # 从本地原文生成 manifest（不触网）
npx tsx scripts/knowledge/collect.ts admissions          # 校验 quote/offset/hash -> bundle
npx tsx scripts/knowledge/prepare-import.ts admissions   # 生成事务 SQL + 16 分片
# 产物
data/knowledge/admissions.manifest.json
work/knowledge-admissions/{bundle.json,import.sql,import-parts/*.sql}
work/knowledge-admissions/*.{raw,pdf,txt}                # 原文与抽取文本（证据）
```

## 5. 约束与踩坑

1. **去重键限制密度**：`collect.ts` 以 `url + role_id + category` 去重，一份目录对同一角色只能出 1 条；提量只能靠「增加院校/增加不同 URL」。
2. **严格配对优先**：只收录原文中「专业代码 + 名称 + 人数 + 考试科目」连续出现的行。中山 `100401 流行病与卫生统计学` 科目串与专业行不连续，**已排除**。
3. **拒绝编辑性错配**：中山目录无 `medical_ai_pm` 对口专业，误映射口腔医学的一条**已删除**，宁可留缺口。
4. **JS 渲染页面不可用**：华科 2027 简章（正文 635 字符）、东南目录查询页（4 字符）、华科 `download.jsp` 附件（返回非 PDF）均放弃。
5. **PDF 抽取的两个坑**：
   - 列序错乱 → 一律用严格配对采样，不按视觉顺序假设；
   - 词内换行（「专 业代码」）与页码串（「住院 6 / 17 医师规范化培训」）→ 正则必须带 `\s*` / `[\s\S]{0,20}?` 容错；
   - TS 字符串里 `"[\s\S]"` 是非法转义（等价于 `"sS"`），必须写 `"[\\s\\S]"`。
6. **一条记录可含多条事实**：builder 已支持 `patterns: string[]`，同一字段多段原文合并进同一 record（西安交大口腔条即 2 条事实）。
7. **脚本最小改动**：`collect.ts` / `prepare-import.ts` / `import-parts.ts` 允许清单各加 `"admissions"`。

## 6. 下一轮（距 30 条差约 9 条）

优先找「有静态 PDF 目录」的院校，每校稳拿 6–9 条：

1. 浙江大学（`grs.zju.edu.cn`，需先找到目录 PDF 直链）
2. 复旦大学（`gsao.fudan.edu.cn`；`/15015/list1.htm` 列表页正文仅 1473 字符，需再进一层找 PDF）
3. 北京大学医学部 / 深圳大学（既有库已用部分角色，剩余角色可补，零网络成本）
4. 华中科技大学（简章页与 `download.jsp` 附件均为脚本/鉴权，需另找 PDF 直链）

另两类可并行，需确认是否同样「只出 SQL 不写库」：
- Match 三岗位的官方可核实标准（RIASEC / 技能等级 / 硬资格）
- 医学方向：规培要求细则、科室设置、真实招聘与薪资口径
