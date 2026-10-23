// 从 O*NET 官方文本数据库（db_30_0_text）逐字摘出 RIASEC 兴趣与技能行，生成：
//   1) work/knowledge-standards/onet-db-excerpt-<soc>.txt  —— 原样保留列结构的逐字摘录（含表头）
//   2) work/knowledge-standards/handoff-onet.json          —— 交接文件（literal 均为摘录文件的逐字子串）
// 行序保持官方文件顺序，不做排名、不做换算。
import { readFileSync, writeFileSync, statSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const root = "work/knowledge-standards/onet-db/db_30_0_text";
const outDir = "work/knowledge-standards";
mkdirSync(outDir, { recursive: true });

const targets = [
  { soc: "15-1211.01", role: "guide_health_systems", name: "Health Informatics Specialists", direction: "医疗信息系统" },
  { soc: "15-1211.00", role: "guide_health_systems", name: "Computer Systems Analysts", direction: "医疗信息系统" },
  { soc: "15-2051.02", role: "guide_clinical_data", name: "Clinical Data Managers", direction: "临床数据科学" },
  { soc: "15-2041.01", role: "guide_clinical_data", name: "Biostatisticians", direction: "临床数据科学" },
  { soc: "15-2051.00", role: "guide_ml_cv", name: "Data Scientists", direction: "机器学习与计算机视觉", skillsSoc: "15-2051.01" },
  { soc: "15-1221.00", role: "guide_ml_cv", name: "Computer and Information Research Scientists", direction: "机器学习与计算机视觉" },
];

const readTable = (file: string) => {
  const text = readFileSync(`${root}/${file}`, "utf8");
  const lines = text.split(/\r?\n/);
  return { header: lines[0], lines: lines.slice(1).filter(Boolean) };
};

const interests = readTable("Interests.txt");
const skills = readTable("Skills.txt");

const capture = (path: string) => ({
  sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
  captured_at: statSync(path).mtime.toISOString(),
});

const handoff: unknown[] = [];
const summary: { soc: string; interests: number; skills: number }[] = [];

for (const target of targets) {
  const interestLines = interests.lines.filter((line) => line.startsWith(`${target.soc}\t`));
  const skillsSoc = (target as { skillsSoc?: string }).skillsSoc ?? target.soc;
  const skillLines = skills.lines.filter((line) => line.startsWith(`${skillsSoc}\t`));
  const excerptPath = `${outDir}/onet-db-excerpt-${target.soc.replace(/\./g, "-")}.txt`;

  // 逐字摘录：官方表头 + 该 SOC 码的行（保持原始 tab 列结构）
  const excerpt = [interests.header, ...interestLines, skills.header, ...skillLines].join("\n");
  writeFileSync(excerptPath, excerpt);
  summary.push({ soc: target.soc, interests: interestLines.length, skills: skillLines.length });

  const interestBlock = interestLines.join("\n");
  if (interestBlock.length < 10 || interestBlock.length > 1600) {
    console.warn(`兴趣块长度异常 ${target.soc}: ${interestBlock.length}`);
  }
  // 技能行很多，按行边界截到 1600 字符以内（保持官方顺序，不排序）
  let skillBlock = "";
  for (const line of skillLines) {
    if ((skillBlock + line).length > 1500) break;
    skillBlock = skillBlock ? `${skillBlock}\n${line}` : line;
  }

  const meta = capture(excerptPath);
  const source = {
    id: `onet-db-${target.soc.replace(/\./g, "-")}`,
    url: "https://www.onetonline.org/link/summary/" + target.soc,
    organization: "U.S. Department of Labor, Employment and Training Administration (O*NET Resource Center)",
    title: `O*NET 30.0 Database · ${target.name}（${target.soc}）`,
    jurisdiction: "US",
    source_tier: "primary",
    published_at: null,
    publication_date_note: "O*NET Database Release 30.0（官方 Text 归档 db_30_0_text.zip，归档 sha256 b7388aadeb3edef2a59fd292ac4e9b72d3e9266c65a136b7b8cc42b23003ce5a）；本记录引自 Interests.txt / Skills.txt 原文行。",
  };
  const artifact = { raw_path: excerptPath, text_path: excerptPath, content_type: "text/plain" };

  handoff.push({
    category: "occupation",
    source,
    artifact,
    quotes: [
      {
        role_id: target.role,
        field: "interests",
        literal: interestBlock,
        title: `O*NET 30.0：${target.name} 的 RIASEC 兴趣分值（官方数据库原文行）`,
        summary: `官方 Interests.txt 中 ${target.soc} 的兴趣维度数据值（每行含 Scale ID、Scale Name、Data Value）。数值为 O*NET 兴趣量表原始分值，非 LIMEN 换算。`,
        applicability: `仅描述美国 O*NET 职业分类中 ${target.soc} 的兴趣画像；不代表中国岗位要求，也不构成个人兴趣测评结论。`,
        relation: "related",
        tags: ["O*NET", "RIASEC", target.soc, target.name, "兴趣画像"],
        context: { evidence_locator: `Interests.txt ${target.soc} 行（${interestLines.length} 行）` },
        expected_fields: ["interests"],
        missing_fields: ["responsibilities", "career_path"],
        note: "RIASEC 六维原始分值",
      },
      {
        role_id: target.role,
        field: "skills",
        literal: skillBlock,
        title: `O*NET 30.0：${target.name} 的技能重要性/等级（官方数据库原文行）`,
        summary: `官方 Skills.txt 中 ${target.soc} 的前若干技能行（保持官方文件顺序，非按分值排序）。每行含 Element Name、Scale ID（IM=Importance / LV=Level）与 Data Value。`,
        applicability: `仅描述美国 O*NET 职业分类中 ${target.soc} 的技能量表；行序为官方文件顺序，不是重要性排名。不代表中国岗位要求。`,
        relation: "related",
        tags: ["O*NET", "Skills", target.soc, target.name, "技能等级"],
        context: { evidence_locator: `Skills.txt ${skillsSoc} 行（共 ${skillLines.length} 行，取前 ${skillBlock.split("\n").length} 行）` },
        expected_fields: ["skills"],
        missing_fields: ["responsibilities"],
        note: "IM/ LV 原始数据值",
      },
    ],
  });
  void meta;
}

writeFileSync(`${outDir}/handoff-onet.json`, JSON.stringify(handoff, null, 2) + "\n");
console.log(JSON.stringify({ sources: handoff.length, summary }, null, 2));
