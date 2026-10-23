// 学习类 handoff：从人社部《人工智能训练师国家职业技能标准（2021年版）》官方 PDF 抽取培训要求与学时。
// 只引用原文事实；literal 按采集器规则折叠空白。
import { readFileSync, writeFileSync } from "node:fs";

const textPath = "work/knowledge-learning2/mohrss-ai-trainer-standard.txt";
const rawPath = "work/knowledge-learning2/mohrss-ai-trainer-standard.pdf";
const normalized = readFileSync(textPath, "utf8").replace(/\s+/g, " ").trim();

const slice = (start: string, end: string) => {
  const from = normalized.indexOf(start);
  if (from < 0) throw new Error(`锚点起点未命中：${start}`);
  const to = normalized.indexOf(end, from);
  if (to < 0) throw new Error(`锚点终点未命中：${end}`);
  return normalized.slice(from, to + end.length);
};

const source = {
  id: "mohrss-ai-trainer-standard",
  url: "https://www.mohrss.gov.cn/wap/zc/zqyj/202106/W020210617509883457681.pdf",
  organization: "中华人民共和国人力资源和社会保障部",
  title: "人工智能训练师国家职业技能标准（2021年版）",
  jurisdiction: "CN",
  source_tier: "primary",
  published_at: null,
  publication_date_note: "PDF 正文未标注发布日期；按人力资源社会保障部 2021 年 6 月征求意见稿页面挂出，发布日期保持未知。",
};

const quotes = [
  {
    role_id: "guide_ml_cv",
    field: "learning_hours",
    literal: slice("1.8 培训参考学时", "二级/技师"),
    title: "人工智能训练师（2021年版）：各等级培训参考学时",
    summary: "官方标准原文给出培训参考学时：五级/初级工 60 标准学时、四级/中级工 50 标准学时、三级/高级工 40 标准学时（二级/技师及以降接排）。这是官方对培训时长的口径，不是学历教育学分。",
    applicability: "适用于该国家职业技能标准的培训与鉴定场景；不构成高校课程学时、个人学习计划或就业能力的结论。",
    tags: ["人工智能训练师", "国家职业技能标准", "培训学时", "职业等级"],
    context: { evidence_locator: "第1章 职业概况 · 1.8 培训参考学时" },
    expected_fields: ["learning_hours", "training", "prerequisites"],
  },
  {
    role_id: "guide_ml_cv",
    field: "training",
    literal: slice("2.2 基础知识", "相关法律、法规知识"),
    title: "人工智能训练师（2021年版）：基础知识要求（通用知识）",
    summary: "官方标准原文规定该职业基础知识中的通用知识要求为计算机操作知识与常用办公软件使用知识。标准同时列出职业守则与相关法律法规知识要求。",
    applicability: "描述该国家职业技能标准对入门基础知识的最低要求；属职业技能鉴定口径，不等同于高校培养方案或岗位招聘门槛。",
    tags: ["人工智能训练师", "基础知识", "职业标准", "通用知识"],
    context: { evidence_locator: "第2章 基本要求 · 2.2 基础知识" },
    expected_fields: ["topics", "prerequisites", "training"],
  },
  {
    role_id: "guide_ml_cv",
    field: "topics",
    literal: slice("1.3 职业定义", "1.5 职业环境条件"),
    title: "人工智能训练师（2021年版）：职业定义与技能等级设置",
    summary: "官方标准原文定义该职业为使用智能训练软件、在人工智能产品实际使用过程中进行数据库管理、算法参数设置、人机交互设计、性能测试跟踪及其他辅助作业的人员；共设五个等级（五级/初级工至一级/高级技师）。",
    applicability: "描述中国官方对该职业的工作内涵与等级划分；不代表具体岗位职责或薪资水平。",
    tags: ["人工智能训练师", "职业定义", "职业技能等级"],
    context: { evidence_locator: "第1章 职业概况 · 1.3 职业定义、1.4 职业技能等级" },
    expected_fields: ["topics", "occupation_definition"],
  },
];

for (const quote of quotes) {
  if (quote.literal.length < 10 || quote.literal.length > 1600) throw new Error(`literal 长度越界 ${quote.literal.length}`);
}

writeFileSync(
  "work/knowledge-learning2/handoff.json",
  JSON.stringify([
    {
      category: "learning",
      source,
      artifact: { raw_path: rawPath, text_path: textPath, content_type: "application/pdf" },
      quotes: quotes.map((quote) => ({ ...quote, relation: "related", missing_fields: [] })),
    },
  ], null, 2) + "\n",
);
console.log(JSON.stringify({ source: source.id, quotes: quotes.length, lengths: quotes.map((quote) => quote.literal.length) }, null, 2));
