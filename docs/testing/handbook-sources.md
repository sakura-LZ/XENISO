# 九方向手册来源核验

核验日期：2026-10-21。范围：`src/lib/handbook.ts` 的技术入门参考资料。项目练习、日常工作描述与检查标准是 LIMEN 编辑性实践建议；下列官方资料支持相应技术概念，并不意味着官方认可 LIMEN 的方向映射、职业推荐或招生结论。本轮没有添加招生院校、录取概率或学习时长。

方法：加载 web-access skill，前置检查使用临时 `--browser edge` 通过；公开 URL 通过 Node 原生 fetch 获取 HTML/Markdown，实际检查 HTTP 状态、标题及相关正文。没有操作用户浏览器标签，也未读取凭证。以下结果表示当次页面可访问及内容主题核对，不表示项目运行或临床有效性验证。

| 方向 | 官方来源与实际标题 | HTTP | 核验内容与使用范围 |
| --- | --- | --- | --- |
| 机器学习与计算机视觉 | [scikit-learn](https://scikit-learn.org/stable/common_pitfalls.html) — `12. Common pitfalls and recommended practices — scikit-learn 1.9.1 documentation` | 200 | 数据泄漏、预处理一致性、训练/测试隔离。 |
| 软件工程 | [Next.js](https://nextjs.org/docs/app/guides/testing) — `Testing` | 200 | 正文介绍单元、组件、集成及端到端测试。 |
| LLM / Agent | [Hugging Face Lighteval 官方仓库 README](https://raw.githubusercontent.com/huggingface/lighteval/main/README.md) | 200 | Markdown 无 HTML title；正文自称 Lighteval，介绍逐样本评估、自定义任务和指标。问答题与人工评分表为 LIMEN 设计。 |
| 智能器械 | [FDA](https://www.fda.gov/medical-devices/device-advice-comprehensive-regulatory-assistance/overview-device-regulation) — `Overview of Device Regulation \| FDA` | 200 | 美国监管概览，只提供监管意识背景；不是中国注册指南。 |
| 医学信号 | [PhysioNet](https://physionet.org/content/mitdb/1.0.0/) — `MIT-BIH Arrhythmia Database v1.0.0` | 200 | 数据库说明、版本、公开访问与引用要求；未下载或执行数据实验。 |
| 医学信号 | [MNE](https://mne.tools/stable/auto_tutorials/preprocessing/30_filtering_resampling.html) — `Filtering and resampling data — MNE 1.13.2 documentation` | 200 | 正文滤波、降采样及混叠警告；不将教程等同于 ECG 临床验证。 |
| 医学影像工程 | [SimpleITK](https://simpleitk.readthedocs.io/en/master/registrationOverview.html) — `Registration Overview — SimpleITK 2.4.0 documentation` | 200 | 固定与移动坐标系、变换、度量、优化器、初始化。 |
| 临床数据 | [pandas](https://pandas.pydata.org/docs/user_guide/missing_data.html) — `Working with missing data — pandas 3.0.6 documentation` | 200 | 缺失值类型与检测处理；不支持因果或治疗效果推断。 |
| 医疗信息系统 | [HL7](https://hl7.org/fhir/overview.html) — `Overview - FHIR v5.0.0` | 200 | 资源化电子医疗信息交换概览；明确引用 R5，未执行资源符合性验证。 |
| 医疗 NLP / 知识图谱 | [NLM](https://www.nlm.nih.gov/mesh/meshhome.html) — `Medical Subject Headings - Home Page` | 200 | 正文说明 MeSH 为受控、分层主题词表，用于生物医学信息索引、编目和检索。 |

## 失败及替代来源

- `https://platform.openai.com/docs/guides/evaluation-best-practices` 返回 HTTP 403，标题 `Attention Required! | Cloudflare`。未作为已核验资料收入手册。
- `https://huggingface.co/docs/evaluate/index` 获取失败（`TypeError: fetch failed`）。转而读取官方 Evaluate 仓库 README（200），其提示新的 LLM 评估建议使用 Lighteval；随后实际读取 Lighteval 官方仓库 README（200），采用后者作为手册来源。

## 数据契约

`handbookEntries` 为 `Record<HandbookDirectionId, HandbookEntry>`，九个 key 与方向映射一致：`ml_cv`、`software`、`llm_agent`、`devices`、`signals`、`imaging_eng`、`clinical_data`、`health_systems`、`med_nlp_kg`。

每条包含 `overview: string`、`daily_work: string[]`、`prerequisites: string[]`、`sources: { title, url, purpose }[]`；`starter_project` 包含 `title`、`question`、`inputs`、`steps: string[]`、`deliverable`、`checks: string[]`。练习只指定可公开使用或合成的输入，不声明已运行这些练习。
