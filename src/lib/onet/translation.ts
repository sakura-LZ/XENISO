// LIMEN draft translation, independent from official O*NET responses.
// Source: Development of the O*NET Mini Interest Profiler (2016), Appendix A.
// Live text must match exactly before this translation is attached to an item.
import { areas } from "./contracts";
export const snapshotSource = "https://www.onetcenter.org/dl_files/Mini-IP.pdf";
const text: [string, string][] = [
  ["Build kitchen cabinets", "制作厨房橱柜"],
  ["Develop a new medicine", "研发一种新药"],
  ["Write books or plays", "写书或剧本"],
  ["Help people with personal or emotional problems", "帮助他人处理个人或情绪问题"],
  ["Manage a department within a large company", "管理大型公司中的一个部门"],
  ["Install software across computers on a large network", "为大型网络中的多台计算机安装软件"],
  ["Repair household appliances", "维修家用电器"],
  ["Study ways to reduce water pollution", "研究减少水污染的方法"],
  ["Compose or arrange music", "作曲或编曲"],
  ["Give career guidance to people", "为他人提供职业指导"],
  ["Start your own business", "创办自己的企业"],
  ["Operate a calculator", "操作计算器"],
  ["Assemble electronic parts", "组装电子零件"],
  ["Conduct chemical experiments", "开展化学实验"],
  ["Create special effects for movies", "制作电影特效"],
  ["Perform rehabilitation therapy", "开展康复治疗"],
  ["Negotiate business contracts", "洽谈商业合同"],
  ["Keep shipping and receiving records", "记录发货和收货情况"],
  ["Drive a truck to deliver packages to offices and homes", "驾驶卡车向办公室和住户配送包裹"],
  ["Examine blood samples using a microscope", "使用显微镜检查血液样本"],
  ["Paint sets for plays", "绘制舞台布景"],
  ["Do volunteer work at a non-profit organization", "在非营利组织做志愿工作"],
  ["Market a new line of clothing", "推广一个新的服装系列"],
  ["Inventory supplies using a hand-held computer", "使用手持计算机盘点物资"],
  ["Test the quality of parts before shipment", "在发货前检验零件质量"],
  ["Develop a way to better predict the weather", "研发更准确预测天气的方法"],
  ["Write scripts for movies or television shows", "撰写电影或电视节目剧本"],
  ["Teach a high-school class", "给高中班级授课"],
  ["Sell merchandise at a department store", "在百货商店销售商品"],
  ["Stamp, sort, and distribute mail for an organization", "为机构给邮件盖章、分类和分发"],
];
export const translation = {
  version: "limen-zh-draft-2026-10-20", author: "LIMEN", review_status: "pending_human_review", source_url: snapshotSource,
  items: text.map(([original_en, zh], i) => ({ index: i + 1, area: areas[i % 6], original_en, zh })),
};
export type Question = { index: number; area: string; original_en: string };
export type Questionnaire = { source: "onet_live" | "official_document_snapshot"; instrument: string; api_version: string; onet_version: string; questions: Question[]; answer_options: { value: number; name: string }[] };
export const documentSnapshot: Questionnaire = {
  source: "official_document_snapshot", instrument: "Mini-IP-30", api_version: "not_available", onet_version: "2016 Appendix A (document, not API database version)",
  questions: translation.items.map(({ index, area, original_en }) => ({ index, area, original_en })),
  answer_options: ["非常不喜欢", "不喜欢", "不确定", "喜欢", "非常喜欢"].map((name, i) => ({ value: i + 1, name })),
};
export function translatedQuestion(question: Question) {
  return translation.items.find((item) => item.index === question.index && item.area === question.area && item.original_en === question.original_en)?.zh;
}
