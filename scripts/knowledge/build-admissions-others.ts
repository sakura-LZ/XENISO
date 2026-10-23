// 其他院校招生目录适配器：三种排版（南医大/浙大/天大）各一个正则，只截连续、可归属的片段。
// 输出 data/knowledge/admissions-others.manifest.json（每个 URL 每个 role 只保留一条，符合去重键）。
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";

const hash = (value: Buffer) => createHash("sha256").update(value).digest("hex");
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type School = {
  id: string;
  textPath: string;
  rawPath: string;
  url: string;
  institution: string;
  region: string;
  year: number;
  organization: string;
  title: string;
  dateNote: string;
  content_type: "application/pdf" | "text/html";
  extract: (text: string) => { literal: string; code: string; name: string }[];
};

const capture = (rawPath: string, textPath: string, contentType: string) => {
  const raw = readFileSync(rawPath);
  const text = readFileSync(textPath, "utf8");
  return {
    path: rawPath,
    sha256: hash(raw),
    captured_at: statSync(rawPath).mtime.toISOString(),
    content_type: contentType,
    method: contentType === "application/pdf" ? ("pypdf_page_text" as const) : ("downloaded_html" as const),
    ...(contentType === "application/pdf" ? { extracted_path: textPath, extracted_sha256: hash(Buffer.from(text, "utf8")) } : {}),
  };
};

// 标题关键词 -> 角色优先级（越靠前越优先；每校每角色只取一条）
const roleRules: { role: string; keywords: string[] }[] = [
  { role: "guide_imaging_eng", keywords: ["医学技术", "影像医学与核医学", "医学影像"] },
  { role: "guide_clinical_data", keywords: ["流行病与卫生统计", "生物统计", "临床检验诊断", "卫生统计"] },
  { role: "guide_health_systems", keywords: ["社会医学与卫生事业管理", "卫生事业管理", "医学信息"] },
  { role: "guide_ml_cv", keywords: ["人工智能", "计算机科学与技术", "计算机技术", "软件工程"] },
  { role: "guide_signals", keywords: ["电子信息", "信号与信息处理", "生物医学工程"] },
  { role: "guide_devices", keywords: ["生物医学工程", "仪器", "机械"] },
  { role: "medicine_guide", keywords: ["临床医学", "内科学", "外科学", "麻醉学", "儿科学", "肿瘤学"] },
  { role: "guide_med_nlp_kg", keywords: ["生物信息学", "生物信息"] },
];

const schools: School[] = [
  {
    id: "njmu-2026-catalog",
    textPath: "work/knowledge-admissions-others/njmu-2026-catalog-pdf.txt",
    rawPath: "work/knowledge-admissions-others/njmu-2026-catalog-pdf.pdf",
    url: "https://yjs.njmu.edu.cn/",
    institution: "南京医科大学",
    region: "江苏",
    year: 2026,
    organization: "南京医科大学研究生院",
    title: "南京医科大学2026年全日制硕士研究生招生专业目录",
    dateNote: "PDF正文未标注发布日期；按2026招生年度使用，发布日期保持未知。",
    content_type: "application/pdf",
    extract: (text) => {
      const pattern = /(\d{6})（(?:学术|专业)学位）([^\s①（]{2,18})\s*(①101[^①]{0,50}(?:②[^①]{0,50})?(?:③[^①]{0,70})?(?:④[^①]{0,20})?)/gu;
      return [...text.matchAll(pattern)].map((match) => ({ literal: match[0], code: match[1], name: match[2] }));
    },
  },
  {
    id: "zju-2026-catalog",
    textPath: "work/knowledge-admissions-others/zju-catalog.txt",
    rawPath: "work/knowledge-admissions-others/zju-catalog.pdf",
    url: "https://grs.zju.edu.cn/",
    institution: "浙江大学",
    region: "浙江",
    year: 2026,
    organization: "浙江大学研究生院",
    title: "浙江大学2026年硕士研究生招生专业目录",
    dateNote: "PDF正文未标注发布日期；按2026招生年度使用，发布日期保持未知。",
    content_type: "application/pdf",
    extract: (text) => {
      const pattern = /(\d{6})\s*(▲?[^\s①]{2,16})\s*不区分研究方向\s*(①101[^①]{0,40}(?:②[^①]{0,40})?(?:③[^①]{0,70})?(?:④[^①]{0,60})?)/gu;
      return [...text.matchAll(pattern)].map((match) => ({ literal: match[0], code: match[1], name: match[2].replace(/^▲/, "") }));
    },
  },
  {
    id: "tju-2026-catalog",
    textPath: "work/knowledge-admissions-others/tju-2026-catalog.txt",
    rawPath: "work/knowledge-admissions-others/tju-catalog.pdf",
    url: "https://yzb.tju.edu.cn/",
    institution: "天津大学",
    region: "天津",
    year: 2026,
    organization: "天津大学研究生招生网",
    title: "天津大学2026年硕士研究生招生专业目录",
    dateNote: "PDF正文未标注发布日期；按2026招生年度使用，发布日期保持未知。",
    content_type: "application/pdf",
    extract: (text) => {
      const pattern = /(\d{6}[A-Z]?\d?)\s*([^\s(（①]{2,16})\s*0?1不区分研究方向\s*\(1\)全日制\s*(①101[^①]{0,40}(?:②[^①]{0,40})?(?:③[^①]{0,70})?(?:④[^①]{0,60})?)/gu;
      return [...text.matchAll(pattern)].map((match) => ({ literal: match[0], code: match[1], name: match[2] }));
    },
  },
];

const entries: unknown[] = [];
const report: Record<string, { matched: number; used: { role: string; code: string; name: string; len: number }[] }> = {};

for (const school of schools) {
  const text = readFileSync(school.textPath, "utf8");
  const rows = school.extract(text);
  const usedRoles = new Set<string>();
  const used: { role: string; code: string; name: string; len: number }[] = [];

  for (const row of rows) {
    const literal = row.literal.replace(/\s+/g, " ").trim();
    if (literal.length < 10 || literal.length > 1600) continue;
    const rule = roleRules.find((candidate) => candidate.keywords.some((keyword) => row.name.includes(keyword)) && !usedRoles.has(candidate.role));
    if (!rule) continue;
    const normalized = text.replace(/\s+/g, " ");
    if (!normalized.includes(literal)) continue;
    usedRoles.add(rule.role);
    used.push({ role: rule.role, code: row.code, name: row.name, len: literal.length });
    entries.push({
      source: {
        id: school.id,
        url: school.url,
        organization: school.organization,
        title: school.title,
        jurisdiction: "CN",
        source_tier: "primary",
        published_at: null,
        publication_date_note: school.dateNote,
      },
      artifact_capture: capture(school.rawPath, school.textPath, school.content_type),
      record: {
        id: `adm-${school.id}-${rule.role}`.toLowerCase().replace(/_/g, "-"),
        role_id: rule.role,
        category: "admissions",
        title: `${school.institution}${school.year}年硕士招生：${row.name}（${row.code}）初试科目`,
        summary: "以下为官方专业目录原文行；标题与标签为 LIMEN 编辑索引，不构成报考建议。",
        applicability: `仅适用于${school.institution}${school.year}年该专业代码所列初试科目；个人报考资格、复试细则与跨专业限制须核对当年章程与院系公告。`,
        relation: "related",
        tags: [row.name, row.code, school.institution, String(school.year), school.region],
        valid_through: null,
        freshness_days: 60,
        context: { institution: school.institution, program: `${row.code} ${row.name}`, admission_year: school.year, region: school.region },
      },
      extracts: [{ field: "exam_subjects", pattern: escapeRegExp(literal) }],
      expected_fields: ["exam_subjects", "cross_major_restrictions", "admission_requirements"],
    });
  }
  report[school.id] = { matched: rows.length, used };
}

writeFileSync("data/knowledge/admissions-others.manifest.json", JSON.stringify(entries, null, 2) + "\n");
console.log(JSON.stringify({ entries: entries.length, report }, null, 2));
