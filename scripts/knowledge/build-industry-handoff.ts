// 产业口径 handoff 构建：从已抓取的官方原文中按锚点切片（保证 literal 必为原文连续子串）。
// literal 统一按采集器规则折叠空白（\s+ -> 单个空格），避免 no_evidence_matched。
import { readFileSync, writeFileSync, statSync } from "node:fs";

type Spec = {
  key: string;
  source: {
    id: string;
    url: string;
    organization: string;
    title: string;
    published_at: string | null;
    publication_date_note: string;
  };
  rawPath: string;
  textPath: string;
  quotes: { role_id: string; field: string; start: string; end: string; title: string; summary: string; applicability: string; tags: string[]; missing?: string[] }[];
};

const specs: Spec[] = [
  {
    key: "gov-internet-healthcare-2018",
    source: {
      id: "gov-internet-healthcare-2018",
      url: "https://www.gov.cn/zhengce/content/2018-04/28/content_5286645.htm",
      organization: "国务院办公厅",
      title: "国务院办公厅关于促进“互联网+医疗健康”发展的意见（国办发〔2018〕26号）",
      published_at: "2018-04-28",
      publication_date_note: "原文头部标注“发布日期：2018年04月28日”。",
    },
    rawPath: "work/knowledge-industry/gov-internet-healthcare-2018.raw",
    textPath: "work/knowledge-industry/gov-internet-healthcare-2018.txt",
    quotes: [
      {
        role_id: "guide_imaging_eng",
        field: "policy_goals",
        start: "鼓励医疗联合体内上级医疗机构借助人工智能等技术手段",
        end: "互认共享。",
        title: "国办发〔2018〕26号：鼓励用人工智能面向基层提供远程影像诊断",
        summary: "政策原文明确鼓励医联体上级医院借助人工智能等技术提供远程会诊、远程心电诊断、远程影像诊断服务，并推动检查检验结果互认共享。",
        applicability: "描述国家政策层面对医学影像/心电 AI 的需求方向；不构成任何岗位、薪酬或录用结论。",
        tags: ["互联网+医疗健康", "人工智能", "远程影像诊断", "分级诊疗"],
        missing: ["employment_statistics", "salary_statistics"],
      },
      {
        role_id: "guide_health_systems",
        field: "design_constraints",
        start: "允许依托医疗机构发展互联网医院",
        end: "允许在线开展部分常见病、慢性病复诊。",
        title: "国办发〔2018〕26号：互联网医院可作为第二名称、可在线复诊",
        summary: "政策原文允许医疗机构依托实体医院发展互联网医院，使用“互联网医院”作为第二名称，并允许在线开展部分常见病、慢性病复诊；医师掌握病历资料后可在线开具相应处方。",
        applicability: "描述互联网医院与在线复诊的制度边界；医疗信息系统设计与产品合规须以此为前提，不涉及具体技术选型结论。",
        tags: ["互联网医院", "在线复诊", "医疗信息化", "制度边界"],
        missing: ["employment_statistics"],
      },
      {
        role_id: "guide_signals",
        field: "policy_goals",
        start: "鼓励利用可穿戴设备获取生命体征数据",
        end: "为孕产妇提供健康监测与管理。",
        title: "国办发〔2018〕26号：鼓励用可穿戴设备采集生命体征数据",
        summary: "政策原文鼓励利用可穿戴设备获取生命体征数据，为孕产妇提供健康监测与管理。",
        applicability: "描述生理信号采集类技术在公共卫生服务中的政策应用方向；不构成产品审批或岗位结论。",
        tags: ["可穿戴设备", "生命体征", "健康监测"],
        missing: ["employment_statistics", "salary_statistics"],
      },
      {
        role_id: "guide_clinical_data",
        field: "policy_goals",
        start: "探索运用人群流动、气候变化等大数据技术分析手段",
        end: "提高重大疾病防控和突发公共卫生事件应对能力。",
        title: "国办发〔2018〕26号：鼓励用大数据预测疾病流行趋势",
        summary: "政策原文鼓励探索运用人群流动、气候变化等大数据技术分析手段预测疾病流行趋势，加强传染病智能监测，提高重大疾病防控与突发公共卫生事件应对能力。",
        applicability: "描述公共卫生数据分析和智能监测的政策方向；不构成任何分析方法的有效性结论。",
        tags: ["大数据", "疾病预测", "传染病监测", "公共卫生"],
        missing: ["employment_statistics"],
      },
    ],
  },
  {
    key: "nhsa-drg-dip-2021",
    source: {
      id: "nhsa-drg-dip-2021",
      url: "https://www.nhsa.gov.cn/art/2021/11/26/art_37_7406.html",
      organization: "国家医疗保障局",
      title: "国家医疗保障局关于印发DRG/DIP支付方式改革三年行动计划的通知（医保发〔2021〕48号）",
      published_at: "2021-11-26",
      publication_date_note: "原文头部标注“发布日期：2021-11-26”；正文落款为2021年11月19日。",
    },
    rawPath: "work/knowledge-industry2/nhsa-drg-dip-2021.raw",
    textPath: "work/knowledge-industry2/nhsa-drg-dip-2021.txt",
    quotes: [
      {
        role_id: "guide_clinical_data",
        field: "policy_requirement",
        start: "到2024年底，全国所有统筹地区全部开展DRG/DIP付费方式改革工作",
        end: "基本实现病种、医保基金全覆盖。",
        title: "医保发〔2021〕48号：DRG/DIP 改革时间表与覆盖目标",
        summary: "政策原文给出明确时间表：到2024年底全国所有统筹地区全部开展DRG/DIP付费；到2025年底覆盖所有符合条件的开展住院服务的医疗机构，基本实现病种、医保基金全覆盖。",
        applicability: "描述医保支付方式改革的国家时间表；这是医院病案、编码、临床数据类岗位需求的制度背景，但不构成岗位数量或薪资结论。",
        tags: ["DRG", "DIP", "医保支付", "病案编码", "临床数据"],
        missing: ["employment_statistics", "salary_statistics"],
      },
      {
        role_id: "guide_health_systems",
        field: "policy_requirement",
        start: "统筹地区启动DRG/DIP付费改革工作后",
        end: "鼓励超过70%的基金总额预算覆盖率。",
        title: "医保发〔2021〕48号：统筹区住院医保基金 DRG/DIP 支出占比须达70%",
        summary: "政策原文要求统筹地区启动改革后三年内，DRG/DIP付费医保基金支出占统筹区内住院医保基金支出达到70%，每年进度分别不低于30%、50%、70%；2024年启动地区须两年内完成，并鼓励超过70%。",
        applicability: "描述医院端医保结算与数据治理的硬性考核口径；不涉及任何技术方案或产品结论。",
        tags: ["DRG", "DIP", "基金支出占比", "医院考核"],
        missing: ["employment_statistics"],
      },
    ],
  },
  {
    key: "nmpa-ai-software-en",
    source: {
      id: "nmpa-ai-software-en",
      url: "https://english.nmpa.gov.cn/2021-07/08/c_660267.htm",
      organization: "国家药品监督管理局（NMPA）",
      title: "NMPA Announcement on Guidance for the Classification Defining of AI-Based Medical Software Products",
      published_at: "2021-07-08",
      publication_date_note: "页面标注“Updated: 2021-07-08”。",
    },
    rawPath: "work/knowledge-industry2/nmpa-ai-software-en-https.raw",
    textPath: "work/knowledge-industry2/nmpa-ai-software-en-https.txt",
    quotes: [
      {
        role_id: "guide_devices",
        field: "design_constraints",
        start: "In order to strengthen the supervision and administration of AI-based medical software products",
        end: "which was issued on July 1.",
        title: "NMPA：人工智能医用软件产品分类界定指导原则已于2021年7月1日发布",
        summary: "NMPA 官方英文公告确认已制定《人工智能医用软件产品分类界定指导原则》并于 2021 年 7 月 1 日发布，目的是加强对人工智能医用软件产品的监督管理。",
        applicability: "仅确认该指导原则的存在与发布日期。指导原则正文位于中文站（www.nmpa.gov.cn）且该站对本次抓取返回 HTTP 412，故本记录不含分类判定的具体条款。",
        tags: ["NMPA", "人工智能医用软件", "分类界定", "医疗器械监管"],
        missing: ["regulatory_basis", "design_constraints"],
      },
    ],
  },];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const collapse = (value: string) => value.replace(/\s+/g, " ").trim();

const handoff: unknown[] = [];
const report: { source: string; quotes: number; failures: string[] }[] = [];

for (const spec of specs) {
  const normalized = collapse(readFileSync(spec.textPath, "utf8"));
  const quotes: unknown[] = [];
  const failures: string[] = [];

  for (const quote of spec.quotes) {
    const from = normalized.indexOf(quote.start);
    if (from < 0) {
      failures.push(`锚点起点未命中：${quote.start.slice(0, 24)}`);
      continue;
    }
    const to = normalized.indexOf(quote.end, from);
    if (to < 0) {
      failures.push(`锚点终点未命中：${quote.end.slice(0, 24)}`);
      continue;
    }
    const literal = normalized.slice(from, to + quote.end.length);
    if (literal.length < 10 || literal.length > 1600) {
      failures.push(`literal 长度越界 ${literal.length}：${quote.start.slice(0, 20)}`);
      continue;
    }
    quotes.push({
      role_id: quote.role_id,
      field: quote.field,
      literal,
      title: quote.title,
      summary: quote.summary,
      applicability: quote.applicability,
      relation: "related",
      tags: quote.tags,
      context: { evidence_locator: "国办发〔2018〕26号 正文条款" },
      expected_fields: [quote.field, ...(quote.missing ?? [])],
      missing_fields: quote.missing ?? [],
    });
  }

  handoff.push({
    category: "industry",
    source: { ...spec.source, jurisdiction: "CN", source_tier: "primary" },
    artifact: {
      raw_path: spec.rawPath,
      text_path: spec.textPath,
      content_type: "text/html",
    },
    quotes,
  });
  report.push({ source: spec.source.id, quotes: quotes.length, failures });
  void statSync(spec.rawPath);
}

writeFileSync("work/knowledge-industry2/handoff.json", JSON.stringify(handoff, null, 2) + "\n");
void escapeRegExp;
console.log(JSON.stringify(report, null, 2));
