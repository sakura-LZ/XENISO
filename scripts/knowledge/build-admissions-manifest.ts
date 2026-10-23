// 生成招生规则 manifest：从已核验的官方原文里按正则截取事实，输出 data/knowledge/admissions.manifest.json
// 只写 manifest，不写数据库；所有 quote 都来自本地已下载原文，collect.ts 会再次校验 offset。
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";

const hash = (value: Buffer) => createHash("sha256").update(value).digest("hex");
const read = (path: string) => readFileSync(path, "utf8");
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Capture = {
  path: string;
  sha256: string;
  captured_at: string;
  content_type: string;
  method: "pypdf_page_text" | "downloaded_html";
  extracted_path?: string;
  extracted_sha256?: string;
};

type Pick = {
  role: string;
  field: string;
  pattern: string;
  patterns?: string[];
  title: string;
  summary: string;
  applicability: string;
  tags: string[];
  relation?: "direct" | "related" | "context";
  context: Record<string, string | number>;
  expected?: string[];
  note: string;
};

type Artifact = {
  id: string;
  url: string;
  published_at: string | null;
  publication_date_note: string;
  title: string;
  textPath: string;
  capture: Capture;
  picks: Pick[];
};

function capture(textPath: string, rawPath: string, contentType: string): Capture {
  const raw = readFileSync(rawPath);
  const capturedAt = statSync(rawPath).mtime.toISOString();
  if (contentType === "application/pdf") {
    return {
      path: rawPath,
      sha256: hash(raw),
      captured_at: capturedAt,
      content_type: "application/pdf",
      method: "pypdf_page_text",
      extracted_path: textPath,
      extracted_sha256: hash(Buffer.from(read(textPath), "utf8")),
    };
  }
  return { path: rawPath, sha256: hash(raw), captured_at: capturedAt, content_type: "text/html", method: "downloaded_html" };
}

// ---- 中山大学 2027 学科专业目录：按「专业代码+名称+人数+考试科目」严格配对行取原文 ----
const catalogText = read("work/knowledge-admissions/sysu-2027-major-catalog.txt");
const rowPattern = /(\d{6})\s*([\u4e00-\u9fa5][\u4e00-\u9fa5A-Za-z（）()·\-]{1,24}?)\s*(\d{1,4})\s*(①101.{10,200}?)(?=\s*(?:复试专业课|复试科目|第\s*\d+\s*页|69\s*不分方向|\d{6}\s*[\u4e00-\u9fa5]))/gu;
const rows = [...catalogText.matchAll(rowPattern)].map((match) => ({
  literal: match[0].replace(/\s+/g, " "),
  code: match[1],
  name: match[2],
  start: match.index ?? 0,
}));

// 每个角色在同一 URL 只取一条（去重键 = url + role + category），故选与该方向最贴近的专业行。
const catalogPicks: { code: string; role: string; nth?: number; tags: string[]; context?: Record<string, string | number> }[] = [
  { code: "085410", role: "guide_ml_cv", tags: ["人工智能", "计算机学科专业基础", "数学（一）"] },
  { code: "085400", role: "guide_signals", nth: 1, tags: ["电子信息", "信号与系统"] },
  { code: "105800", role: "guide_imaging_eng", nth: 1, tags: ["医学技术", "医学影像技术", "医学技术基础"] },
  { code: "105800", role: "guide_devices", nth: 0, tags: ["医学技术", "核物理与技术", "工程物理"] },
  { code: "107401", role: "guide_health_systems", tags: ["社会医学与卫生事业管理", "卫生综合"] },

  { code: "100210", role: "medicine_guide", tags: ["外科学", "生物医学综合"] },

];

const pickByCode = (code: string, used: Set<number>, nth = 0) => {
  const candidates = rows.map((row, position) => ({ row, position })).filter((item) => item.row.code === code && !used.has(item.position));
  const picked = candidates[nth];
  if (!picked) return null;
  used.add(picked.position);
  return picked.row;
};

const usedRows = new Set<number>();
const catalogEntries = catalogPicks.flatMap((pick) => {
  const row = pickByCode(pick.code, usedRows, pick.nth);
  if (!row) {
    console.warn(`未找到专业行 ${pick.code}`);
    return [];
  }
  return [{
    role: pick.role,
    field: "exam_subjects",
    pattern: escapeRegExp(row.literal),
    title: `中山大学2027年硕士招生：${row.name}（${row.code}）初试科目`,
    summary: "以下为官方专业目录原文行；标题与标签为 LIMEN 编辑索引，不构成报考建议。",
    applicability: "仅适用于中山大学2027年该专业代码所列初试科目；个人报考资格、复试细则与专项计划需另行核对当年章程与院系公告。",
    tags: [row.name, row.code, "中山大学", "2027", ...pick.tags],
    relation: "related" as const,
    context: { institution: "中山大学", program: `${row.code} ${row.name}`, admission_year: 2027, region: "广东", evidence_locator: `专业目录 偏移 ${row.start}`, ...pick.context },
    expected: ["exam_subjects", "cross_major_restrictions", "admission_requirements"],
    note: `${row.code} ${row.name}`,
  }];
});

// ---- 中山大学 2027 招生章程：报考条件 / 加试 / 医学类初试单元 ----
const charterPicks: Pick[] = [
  {
    role: "medicine_guide",
    field: "admission_requirements",
    pattern: "报考条件\\s*（一）报名参加全国硕士研究生招生考试的人员，须符合下列条件：[\\s\\S]{40,900}?（4）已获硕士、博士研究生学历或学位的人员。",
    title: "中山大学2027年硕士研究生报考条件（官方章程原文）",
    summary: "章程原文列出学历与身份条件；本条只摘录条件本身，不判断个人是否符合。",
    applicability: "适用于报名参加全国硕士研究生招生考试者；专项计划、推免与院系附加要求不在本条范围内。",
    tags: ["报考条件", "中山大学", "2027", "招生章程"],
    relation: "related",
    context: { institution: "中山大学", admission_year: 2027, region: "广东" },
    expected: ["admission_requirements", "cross_major_restrictions"],
    note: "报考条件",
  },
  {
    role: "guide_clinical_data",
    field: "cross_major_restrictions",
    pattern: "高校教务部门出具的所报考专业8门以上本科主干课程成绩证明[\\s\\S]{10,200}?加试两门本科专业基础课",
    title: "中山大学2027年章程：同等学力考生须加试两门本科专业基础课",
    summary: "章程对同等学力身份给出加试要求；跨专业要求并未在本段出现，故不推断。",
    applicability: "仅适用于章程所指同等学力考生；普通本科应届/往届毕业生的跨专业限制需见院系细则。",
    tags: ["加试", "同等学力", "中山大学", "2027"],
    relation: "related",
    context: { institution: "中山大学", admission_year: 2027, region: "广东" },
    expected: ["cross_major_restrictions", "admission_requirements"],
    note: "加试规则",
  },
  {
    role: "medical_ai_pm",
    field: "exam_subjects",
    pattern: "教育学、历史学、医学等3个门类学术学位[\\s\\S]{10,400}?满分分别为100分、100分、300分。",
    title: "中山大学2027年章程：医学等门类与相关专业学位初试为三个单元",
    summary: "章程原文说明这类学科初试科目单元与分值结构，用于理解考试科目构成。",
    applicability: "仅描述初试单元设置与分值，不代表具体专业考试科目，具体科目仍以专业目录为准。",
    tags: ["初试科目", "医学类", "中山大学", "2027"],
    relation: "related",
    context: { institution: "中山大学", admission_year: 2027, region: "广东" },
    expected: ["exam_subjects"],
    note: "初试单元",
  },
];

// 按 artifact id 前缀取发文机构（此前 organization 被误写成单一常量，导致 7 个源全标成中山大学）
const organizationById: Record<string, string> = {
  sysu: "中山大学研究生招生办公室",
  scu: "四川大学研究生院招生办公室",
  uestc: "电子科技大学研究生招生办公室",
  seu: "东南大学研究生院招生办公室",
  xjtu: "西安交通大学研究生招生办公室",
  sjtu: "上海交通大学研究生院招生办公室",
};
const organizationOf = (id: string) => organizationById[id.split("-")[0]] ?? "院校研究生招生官方发布";
const artifacts: Artifact[] = [
  {
    id: "sysu-2027-major-catalog",
    url: "https://graduate.sysu.edu.cn/zsw/sites/default/files/2026-10/2.%20%E4%B8%AD%E5%B1%B1%E5%A4%A7%E5%AD%A62027%E7%A1%95%E5%A3%AB%E7%A0%94%E7%A9%B6%E7%94%9F%E6%8B%9B%E7%94%9F%E5%AD%A6%E7%A7%91%E4%B8%93%E4%B8%9A%E7%9B%AE%E5%BD%95.pdf",
    published_at: null,
    publication_date_note: "页面为2026-10目录下载链接；PDF正文未标注发布日期，按“2027年招生年度”使用，发布日期保持未知。",
    title: "中山大学2027年硕士研究生招生学科专业目录",
    textPath: "work/knowledge-admissions/sysu-2027-major-catalog.txt",
    capture: capture("work/knowledge-admissions/sysu-2027-major-catalog.txt", "work/knowledge-admissions/sysu-2027-major-catalog.pdf", "application/pdf"),
    picks: catalogEntries,
  },
  {
    id: "sysu-2027-charter",
    url: "https://graduate.sysu.edu.cn/zsw/node/541",
    published_at: null,
    publication_date_note: "章程页未标注正文发布日期，链接目录为2026-09/2026-10，故发布日期保持未知。",
    title: "中山大学2027年硕士研究生招生章程",
    textPath: "work/knowledge-admissions/sysu-2027-catalog.txt",
    capture: capture("work/knowledge-admissions/sysu-2027-catalog.txt", "work/knowledge-admissions/sysu-2027-catalog.raw", "text/html"),
    picks: charterPicks,
  },
];

const batch2: Artifact[] = [
  {
    id: "scu-2027-charter",
    url: "https://yz.scu.edu.cn/zsxx/Details/a9e04641-aa5f-401f-892e-f069c0f8ecb2",
    published_at: null,
    publication_date_note: "章程页未在正文标注发布日期；按2027招生年度使用，发布日期保持未知。",
    title: "四川大学2027年硕士研究生招生章程",
    textPath: "work/knowledge-admissions/scu-2027-charter.txt",
    capture: capture("work/knowledge-admissions/scu-2027-charter.txt", "work/knowledge-admissions/scu-2027-charter.raw", "text/html"),
    picks: [
      {
        role: "medicine_guide",
        field: "admission_requirements",
        pattern: "二、报考条件\\s*（一）报名参加全国硕士研究生招生考试的人员，须符合下列条件：[\\s\\S]{40,900}?（4）已获硕士、博士研究生学历或学位的人员。",
        title: "四川大学2027年硕士研究生报考条件（官方章程原文）",
        summary: "章程原文列出学历与身份条件；本条只摘录条件本身，不判断个人是否符合。",
        applicability: "适用于报名参加全国硕士研究生招生考试者；专项计划与院系附加要求不在本条范围内。",
        tags: ["报考条件", "四川大学", "2027", "招生章程"],
        relation: "related",
        context: { institution: "四川大学", admission_year: 2027, region: "四川" },
        expected: ["admission_requirements", "cross_major_restrictions"],
        note: "报考条件",
      },
      {
        role: "guide_clinical_data",
        field: "cross_major_restrictions",
        pattern: "以同等学力身份报考并参加复试的考生，在复试中须加试至少两门与报考专业相关的本科主干课程。加试方式为笔试，加试科目不得与初试科目相同，加试不合格者不予录取。",
        title: "四川大学2027年章程：同等学力考生复试须加试至少两门本科主干课程",
        summary: "章程对同等学力身份给出加试要求；普通本科毕业生的跨专业限制需见院系细则。",
        applicability: "仅适用于以同等学力身份报考并参加复试的考生；不等于对所有跨专业考生的限制。",
        tags: ["加试", "同等学力", "四川大学", "2027"],
        relation: "related",
        context: { institution: "四川大学", admission_year: 2027, region: "四川" },
        expected: ["cross_major_restrictions"],
        note: "加试规则",
      },
      {
        role: "medical_ai_pm",
        field: "exam_subjects",
        pattern: "考试科目中的101-思想政治理论[\\s\\S]{40,600}?均由教育部考试中心统一命题。",
        title: "四川大学2027年章程：全国统考科目清单与命题单位",
        summary: "章程说明哪些科目由教育部考试中心统一命题；具体专业考哪些科目仍以专业目录为准。",
        applicability: "仅说明统考科目的命题来源，不代表任一具体专业的科目组合。",
        tags: ["初试科目", "统一命题", "四川大学", "2027"],
        relation: "related",
        context: { institution: "四川大学", admission_year: 2027, region: "四川" },
        expected: ["exam_subjects"],
        note: "统考科目清单",
      },
    ],
  },
  {
    id: "uestc-2027-charter",
    url: "https://yz.uestc.edu.cn/info/1081/5968.htm",
    published_at: null,
    publication_date_note: "页面发布时间2026-10-08（页面呈现）；正文未标注目录日期，发布日期保持未知。",
    title: "电子科技大学2027年硕士研究生招生章程",
    textPath: "work/knowledge-expansion/uestc-2027-charter.txt",
    capture: capture("work/knowledge-expansion/uestc-2027-charter.txt", "work/knowledge-expansion/uestc-2027-charter.raw", "text/html"),
    picks: [
      {
        role: "medicine_guide",
        field: "admission_requirements",
        pattern: "报考条件\\s*（一）全国统一考试[\\s\\S]{40,600}?（1）国家承认学历的应届本科毕业生",
        title: "电子科技大学2027年硕士研究生报考条件（官方章程原文）",
        summary: "章程原文列出全国统一考试的学历与身份条件；本条只摘录条件本身。",
        applicability: "适用于参加全国统一考试的考生；专项计划与院系附加要求不在本条范围内。",
        tags: ["报考条件", "电子科技大学", "2027", "招生章程"],
        relation: "related",
        context: { institution: "电子科技大学", admission_year: 2027, region: "四川" },
        expected: ["admission_requirements"],
        note: "报考条件",
      },
    ],
  },
  {
    id: "seu-2027-catalog-pdf",
    url: "https://yzb.seu.edu.cn/_upload/article/files/6a/83/e8812ecd4b64a03ae869029eae5b/e43d7759-7d78-4c84-a698-ceb01d3f7566.pdf",
    published_at: null,
    publication_date_note: "PDF正文未标注发布日期；按2027招生年度使用，发布日期保持未知。",
    title: "东南大学2027年硕士研究生招生专业目录（含接收标注）",
    textPath: "work/knowledge-admissions/seu-2027-catalog-pdf.txt",
    capture: capture("work/knowledge-admissions/seu-2027-catalog-pdf.txt", "work/knowledge-admissions/seu-2027-catalog-pdf.pdf", "application/pdf"),
    picks: [
      {
        role: "guide_devices",
        field: "admission_requirements",
        pattern: escapeRegExp("011 生物科学与医学工程学院 083100 生物医学工程 接收 接收"),
        title: "东南大学2027年目录：生物医学工程（083100）与接收标注",
        summary: "原文摘录该专业代码所在行与“接收”标注；考试科目未在本文出现，故不推断。",
        applicability: "仅说明该目录中存在该专业代码及其“接收”标注；不代表录取标准或个人资格。",
        tags: ["生物医学工程", "东南大学", "2027", "专业目录"],
        relation: "related",
        context: { institution: "东南大学", program: "083100 生物医学工程", admission_year: 2027, region: "江苏" },
        expected: ["admission_requirements", "exam_subjects"],
        note: "083100 行",
      },
      {
        role: "guide_imaging_eng",
        field: "admission_requirements",
        pattern: escapeRegExp("044 医学院 100207 影像医学与核医学 接收 接收"),
        title: "东南大学2027年目录：影像医学与核医学（100207）与接收标注",
        summary: "原文摘录该专业代码所在行与“接收”标注；考试科目未在本文出现，故不推断。",
        applicability: "仅说明该目录中存在该专业代码及其“接收”标注；不代表录取标准或个人资格。",
        tags: ["影像医学与核医学", "东南大学", "2027", "专业目录"],
        relation: "related",
        context: { institution: "东南大学", program: "100207 影像医学与核医学", admission_year: 2027, region: "江苏" },
        expected: ["admission_requirements", "exam_subjects"],
        note: "100207 行",
      },
    ],
  },
];
artifacts.push(...batch2);

const batch3: Artifact[] = [
  {
    id: "xjtu-2027-charter",
    url: "https://yz.xjtu.edu.cn/__local/E/87/9A/3FDEF75C038EF21BE144434C44A_C2E45EA5_45827.pdf",
    published_at: null,
    publication_date_note: "章程PDF未标注发布日期；正文报名时间为2026-10-15至24，对应2027招生年度，发布日期保持未知。",
    title: "西安交通大学2027年硕士研究生招生章程",
    textPath: "work/knowledge-admissions/xjtu-2027-charter.txt",
    capture: capture("work/knowledge-admissions/xjtu-2027-charter.txt", "work/knowledge-admissions/xjtu-2027-charter.pdf", "application/pdf"),
    picks: [
      {
        role: "medicine_guide",
        field: "cross_major_restrictions",
        pattern: "（十）报考攻读临床医学专业学位（专业代码 1051）硕士[\\s\\S]{20,400}?应届或往届本科毕业生；",
        title: "西安交通大学2027年章程：临床医学专业学位（1051）仅限西医临床医学类本科",
        summary: "章程原文对临床医学专业学位给出本科专业限制，这是明确的跨考限制而非建议。",
        applicability: "适用于报考1051临床医学专业学位者；学术学位与其他专业学位不受本条约束。",
        tags: ["跨考限制", "临床医学", "专业学位", "西安交通大学", "2027"],
        relation: "direct",
        context: { institution: "西安交通大学", program: "1051 临床医学（专业学位）", admission_year: 2027, region: "陕西" },
        expected: ["cross_major_restrictions"],
        note: "临床医学跨考限制",
      },
      {
        role: "guide_clinical_data",
        field: "cross_major_restrictions",
        pattern: "报考攻读口腔医学专业学位（专\\s*业代码 1052）硕士研究生，仅限全日制本科口腔医学专业毕业\\s*并获得学士学位，且须符合国家执业医师资格考试及住院医师规\\s*范化培训报考条件的应届或往届本科毕业生。",
        patterns: [
          "报考攻读口腔医学专业学位（专\\s*业代码 1052）硕士研究生，仅限全日制本科口腔医学专业毕业\\s*并获得学士学位，且须符合国家执业医师资格考试及住院医师规\\s*范化培训报考条件的应届或往届本科毕业生。",
          "对于已经获得住院[\\s\\S]{0,20}?医师规范化培训合格证书人员原则上不得报考临床医学∕口腔\\s*医学专业学位硕士研究生。",
        ],
        title: "西安交通大学2027年章程：口腔医学专业学位限制与规培证人员的报考限制",
        summary: "章程原文说明口腔医学专业学位的本科专业要求，以及已取得规培合格证书人员原则上不得报考临床医学/口腔医学专业学位。",
        applicability: "仅适用于口腔医学专业学位(1052)与已获规培合格证书者；其他专业不适用。",
        tags: ["跨考限制", "口腔医学", "住院医师规范化培训", "西安交通大学", "2027"],
        relation: "direct",
        context: { institution: "西安交通大学", program: "口腔医学（专业学位）", admission_year: 2027, region: "陕西", medical_topic: "规培与学位衔接口径" },
        expected: ["cross_major_restrictions"],
        note: "口腔+规培限制",
      },
      {
        role: "medical_ai_pm",
        field: "admission_requirements",
        pattern: "第十条 报考条件[\\s\\S]{20,600}?3．同等学力的人员须符合下列条件：",
        title: "西安交通大学2027年章程：报考条件中的学业水平要求",
        summary: "章程原文列出报考条件的前三项学业水平要求；本条只摘录条件本身。",
        applicability: "适用于本章程所列考生；专项计划与学院附加条件见其他条款。",
        tags: ["报考条件", "西安交通大学", "2027", "招生章程"],
        relation: "related",
        context: { institution: "西安交通大学", admission_year: 2027, region: "陕西" },
        expected: ["admission_requirements"],
        note: "报考条件",
      },
      {
        role: "guide_health_systems",
        field: "cross_major_restrictions",
        pattern: "教育应届本科毕业生及复\\s*试时尚未取得本科毕业证书的自考和网络教育考生初试成绩达[\\s\\S]{10,200}?加试不合格者不予录\\s*取。",
        title: "西安交通大学2027年章程：自考/网络教育考生须加试两门本科专业基础课",
        summary: "章程原文给出加试对象与加试科目确定方式，并说明不合格不予录取。",
        applicability: "仅适用于成人教育应届本科毕业生及复试时未取得本科毕业证的自考、网络教育考生。",
        tags: ["加试", "自考", "网络教育", "西安交通大学", "2027"],
        relation: "related",
        context: { institution: "西安交通大学", admission_year: 2027, region: "陕西" },
        expected: ["cross_major_restrictions"],
        note: "加试规则",
      },
    ],
  },
];
artifacts.push(...batch3);

const batch4: Artifact[] = [
  {
    id: "sjtu-2027-master-charter",
    url: "https://yzb.sjtu.edu.cn/post/3784",
    published_at: null,
    publication_date_note: "章程页面未在正文标注发布日期；按2027招生年度使用，发布日期保持未知。",
    title: "上海交通大学2027年硕士研究生招生章程",
    textPath: "work/knowledge-raw/sjtu-charter-2027.txt",
    capture: capture("work/knowledge-raw/sjtu-charter-2027.txt", "work/knowledge-raw/sjtu-charter-2027.html", "text/html"),
    picks: [
      {
        role: "medicine_guide",
        field: "cross_major_restrictions",
        pattern: "跨专业报考。报考前须经上海交通大学研招办审核通过，初试成绩合格后，除复试外还须加试两门与报考专业相关的本科专业基础主干课程，具体加试科目将在复试前通知。",
        title: "上海交通大学2027年章程：跨专业报考须审核并加试两门本科专业基础主干课程",
        summary: "章程原文直接规定跨专业报考的前置审核与加试要求，是明确的跨考限制而非建议。",
        applicability: "仅适用于章程所指跨专业报考情形；具体专业是否接收跨考以院系公告为准。",
        tags: ["跨考限制", "加试", "上海交通大学", "2027"],
        relation: "direct",
        context: { institution: "上海交通大学", admission_year: 2027, region: "上海" },
        expected: ["cross_major_restrictions"],
        note: "跨专业加试",
      },
      {
        role: "medical_ai_pm",
        field: "admission_requirements",
        pattern: "报考条件 第十条 报名参加全国硕士研究生招生考试的人员，须符合下列条件：[\\s\\S]{20,700}?已获硕士、博士研究生学历或学位的人员。",
        title: "上海交通大学2027年章程：报考条件中的学业水平要求",
        summary: "章程原文列出报考条件与学业水平要求；本条只摘录条件本身，不判断个人是否符合。",
        applicability: "适用于报名参加全国硕士研究生招生考试者；专项计划与院系附加条件见其他条款。",
        tags: ["报考条件", "上海交通大学", "2027", "招生章程"],
        relation: "related",
        context: { institution: "上海交通大学", admission_year: 2027, region: "上海" },
        expected: ["admission_requirements"],
        note: "报考条件",
      },
    ],
  },
];
artifacts.push(...batch4);

const entries = [];
for (const artifact of artifacts) {
  const text = read(artifact.textPath);
  for (const pick of artifact.picks) {
    const patterns = pick.patterns ?? [pick.pattern];
    const literals: string[] = [];
    let missed = false;
    for (const pattern of patterns) {
      const match = new RegExp(pattern, "iu").exec(text);
      if (!match) {
        console.warn(`跳过（原文未命中）：${artifact.id} / ${pick.role} / ${pick.note}`);
        missed = true;
        break;
      }
      const literal = match[0].replace(/\s+/g, " ");
      if (literal.length < 10 || literal.length > 1600) {
        console.warn(`跳过（长度越界 ${literal.length}）：${artifact.id} / ${pick.role}`);
        missed = true;
        break;
      }
      literals.push(literal);
    }
    if (missed) continue;
    const recordId = `adm-${artifact.id}-${pick.role}`.toLowerCase().replace(/_/g, "-");
    entries.push({
      source: {
        id: artifact.id,
        url: artifact.url,
        organization: organizationOf(artifact.id),
        title: artifact.title,
        jurisdiction: "CN",
        source_tier: "primary",
        published_at: artifact.published_at,
        publication_date_note: artifact.publication_date_note,
      },
      artifact_capture: artifact.capture,
      record: {
        id: recordId,
        role_id: pick.role,
        category: "admissions",
        title: pick.title,
        summary: pick.summary,
        applicability: pick.applicability,
        relation: pick.relation ?? "related",
        tags: pick.tags.slice(0, 30),
        valid_through: null,
        freshness_days: 60,
        context: pick.context,
      },
      extracts: literals.map((literal) => ({ field: pick.field, pattern: escapeRegExp(literal) })),
      expected_fields: pick.expected ?? ["exam_subjects"],
    });
  }
}

writeFileSync("data/knowledge/admissions.manifest.json", JSON.stringify(entries, null, 2) + "\n");
console.log(JSON.stringify({ entries: entries.length, by_source: artifacts.map((artifact) => ({ id: artifact.id, picks: artifact.picks.length })) }, null, 2));
