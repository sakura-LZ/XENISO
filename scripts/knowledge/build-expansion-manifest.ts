// Reviewed source selection. Extraction patterns select original text, never synthesize facts.
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { htmlText } from "./html";

const hash = (value: Buffer) => createHash("sha256").update(value).digest("hex");
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const root = "work/knowledge-expansion/";
const roleFile = JSON.parse(readFileSync("data/knowledge/roles.json", "utf8"));
const mapping = JSON.parse(readFileSync("data/occupation_direction_map.json", "utf8"));
const dirs: { id: string; name: string }[] = mapping.directions.flatMap((group: { specializations: { id: string; name: string }[] }) => group.specializations);
const roleId = (id: string) => `guide_${id}`;
roleFile.roles = [roleFile.roles[0], ...dirs.map(dir => ({ id: roleId(dir.id), name: dir.name, aliases: [], direction_ids: [dir.id], mapping_basis: "LIMEN 编辑性资料索引；不属于官方职业分类或报考结论。", scope: "中国官方来源的方向资料；related/context不等于该职业的统一要求。" })), { id: "medicine_guide", name: "医学专业与科室", aliases: ["继续医学"], direction_ids: [], mapping_basis: "医学知识手册独立分类，不参与九方向匹配评分。", scope: "医学专业、培养、科室和就业原文；不替代执业资格审核。" }];
writeFileSync("data/knowledge/roles.json", JSON.stringify(roleFile, null, 2) + "\n");
type Source = { id: string; url: string; organization: string; title: string; jurisdiction: string; source_tier: string; published_at: string | null; publication_date_note: string };
type Capture = { path: string; captured_at: string; sha256: string; method: string; content_type?: string; extracted_path?: string; extracted_sha256?: string };
type Ref = { source: Source; text: string; artifact_capture?: Capture; browser_capture?: Capture; publication_pattern?: string };
const refs = new Map<string, Ref>();
function source(id: string, url: string, organization: string, title: string, file: string, date: string | null = null, note = "正文未列日级发布日期；版本/统计年份不作为发布日期。") {
  const path = file.startsWith("data/") || file.startsWith("work/") ? file : root + file;
  const raw = readFileSync(path), pdf = path.endsWith(".pdf"), browser = path.startsWith("data/knowledge/captures/");
  const extractedPath = pdf ? path.replace(/\.pdf$/, ".txt") : undefined;
  const text = pdf ? readFileSync(extractedPath!, "utf8").replace(/\s+/g, " ").trim() : browser ? raw.toString("utf8").replace(/\s+/g, " ").trim() : htmlText(raw.toString("utf8"));
  const capture = { path, captured_at: statSync(path).mtime.toISOString(), sha256: hash(raw), method: browser ? "browser_visible_excerpt" : pdf ? "pypdf_page_text" : "downloaded_html", ...(browser ? {} : { content_type: pdf ? "application/pdf" : "text/html" }), ...(pdf ? { extracted_path: extractedPath, extracted_sha256: hash(readFileSync(extractedPath!)) } : {}) };
  const ref = { source: { id, url, organization, title, jurisdiction: "CN", source_tier: "primary", published_at: date, publication_date_note: note }, text, ...(browser ? { browser_capture: capture } : { artifact_capture: capture }), ...(date ? { publication_pattern: escape(date) } : {}) };
  refs.set(id, ref); return id;
}
const ai = source("cn-ai-engineer-standard", "https://www.gov.cn/zhengce/zhengceku/2021-10/09/5641623/files/d9a82994c8bc4db2beb4a31b9d16e687.pdf", "人力资源社会保障部、工业和信息化部 / 中国政府网", "人工智能工程技术人员国家职业技术技能标准（2021年版）", "ai-standard.pdf");
const salary = source("nbs-2025-annual-wages", "https://www.stats.gov.cn/sj/zxfb/202605/t20260515_1963707.html", "国家统计局", "2025年城镇单位就业人员年平均工资情况", "nbs-2025.html", "2026-05-15", "官网发布时间2026-05-15；统计期2025年，表2非私营、表5私营分别保留，不是专业毕业生薪资。");
refs.get(salary)!.publication_pattern = "2026/05/15 16:00";
const sjtu = source("sjtu-2027-bme-catalog", "https://yzb.sjtu.edu.cn/post/3772", "上海交通大学研究生招生办公室", "上海交通大学2027年硕士研究生招生专业目录（校本部）", "work/knowledge-raw/sjtu-catalog-2027.html", "2026-09-21", "正文发布时间2026-09-21，2027招生年度；按指定学院表格行提取。");
const charter = source("sjtu-2027-master-charter", "https://yzb.sjtu.edu.cn/post/3784", "上海交通大学研究生招生办公室", "上海交通大学2027年硕士研究生招生章程", "work/knowledge-raw/sjtu-charter-2027.html", "2026-10-08", "正文发布时间2026-10-08；同等学力规则不推广到普通本科生。");
const uestc = source("uestc-2027-bme-detail", "https://yzbm.uestc.edu.cn/zsml/sszsml/index/2027", "电子科技大学研究生招生办公室", "2027年生命科学与技术学院083100生物医学工程目录", "data/knowledge/captures/uestc-2027-bme.txt", null, "官方动态目录选择014学院和083100专业后，浏览器可见片段。未列发布日期；2027为招生年度。");
const uestcCharter = source("uestc-2027-charter", "https://yz.uestc.edu.cn/info/1081/5968.htm", "电子科技大学研究生招生办公室", "电子科技大学2027年硕士研究生招生章程", "uestc-charter.html", "2026-10-08", "正文发布时间2026-10-08，适用2027招生年度。");
const pku = source("pku-2026-medical-catalog", "https://yjsy.bjmu.edu.cn/docs/2025-10/2695e1e4d00a4cbe8fd90add52c7a5fb.pdf", "北京大学研究生院医学部分院", "2026年北京大学医学部硕士研究生招生专业目录", "pku-catalog.pdf");
const pkuCharter = source("pku-2026-medical-charter", "https://yjsy.bjmu.edu.cn/zslq/zsjzjml/a427e38b26c645eab8e6665c870e98ca.htm", "北京大学研究生院医学部分院", "北京大学医学部2026年硕士研究生招生简章", "pku-charter.html", "2025-10-09", "网页发布时间2025-10-09，落款2025年9月；2026招生周期已过，仅历史参考。");
const szu = source("szu-2026-bme-detail", "https://ehall.szu.edu.cn/gsapp/sys/zsjzapp/index.do#/2026/4/124/083100", "深圳大学研究生招生 / 医学部", "深圳大学2026年083100生物医学工程专业目录", "data/knowledge/captures/szu-2026-bme.txt", null, "学院官网链接到此动态招生系统；保留hash路由和可见原文；2026周期已过，仅历史参考。");
const medCatalog = source("moe-medical-majors-2025", "https://www.moe.gov.cn/srcsite/A08/moe_1034/s4930/202504/W020250422312780837078.pdf", "教育部", "普通高等学校本科专业目录（2025年）医学门类", "medical-majors.pdf");
const departments = source("pkufh-clinical-departments", "https://www.pkufh.com/Html/Departments/Main/Index_302.html", "北京大学第一医院", "临床科室：所辖科室目录", "data/knowledge/captures/pku-clinical-departments.txt");
const employment = source("xidian-2025-employment-report", "https://job.xidian.edu.cn/attachment/xidian/ueditor/file/20260128/3325_%E8%A5%BF%E5%AE%89%E7%94%B5%E5%AD%90%E7%A7%91%E6%8A%80%E5%A4%A7%E5%AD%A62025%E5%B1%8A%E5%B0%B1%E4%B8%9A%E8%B4%A8%E9%87%8F%E5%B9%B4%E5%BA%A6%E6%8A%A5%E5%91%8A.pdf", "西安电子科技大学就业信息网", "2025届毕业生就业质量年度报告", "xidian-employment.pdf", null, "报告2025届、统计截至2025年12月；文件URL日期不视为发布日期。");
const bbmu = source("bbmu-2025-biomedical-employment", "https://swkxx.bbmu.edu.cn/info/1091/9264.htm", "蚌埠医科大学生命科学学院", "25届生物医学科学毕业生就业质量报告", "bbmu-employment.html", "2026-06-12", "网页2026-06-12，正文落款2025-07-17；未给总毕业人数和总体就业率分母。");
const preventive = source("gdmu-preventive-medicine", "https://ggwsxy.gdmu.edu.cn/info/1036/2252.htm", "广东医科大学公共卫生学院", "预防医学专业介绍", "gdmu-preventive.html", "2026-05-08", "正文发布时间2026-05-08，学校专业培养说明不作为实际就业率。");
const medPrograms = [
  ["clinical", "临床医学", "221500"], ["nursing", "护理学", "221501"], ["medicine", "口腔医学", "221502"], ["imaging", "医学影像学", "221503"], ["laboratory", "医学检验技术", "221504"], ["rehabilitation", "康复治疗学", "221505"], ["health-management", "健康服务与管理", "221506"],
].map(([key, name, code]) => ({ key, name, id: source(`shzu-${key}-program`, `https://yixy.shzu.edu.cn/2025/0630/c11880a${code}/page.htm`, "石河子大学医学院", `${name}专业简介`, `shizu-${key}.html`, "2025-06-30", "官网正文发布日期2025-06-30；该校培养目标和就业方向，不代表实际就业结果或执业资格。") }));
// One official listing URL, three actual jobs; independent source count remains one.
const jobCapture = "data/knowledge/captures/mindray-jobs.txt";
writeFileSync(jobCapture, ["j18975", "j18977", "j18980"].map(id => readFileSync(`data/knowledge/captures/mindray-${id}.txt`, "utf8")).join("\n"));
const mindray = source("mindray-campus-three-jobs", "https://career.mindray.com/campus/jobs", "深圳迈瑞生物医疗电子股份有限公司", "迈瑞官方校园招聘：J18975/J18977/J18980", jobCapture, null, "浏览器实际展开三职位职责和任职资格；无发布日期/薪资/截止日。列表可能更新，使用职位编号和摘录定位。");

const entries: unknown[] = [];
type Spec = { id: string; ref: string; role: string; category: string; title: string; fields: [string, string][]; context?: Record<string, string | number>; missing?: string[]; applicability?: string; historical?: boolean; relation?: string };
function segment(id: string, start: string, end: string, after = "") {
  const text = refs.get(id)!.text, i = text.indexOf(start, after ? text.indexOf(after) : 0), j = text.indexOf(end, i + start.length);
  if (i < 0 || j < 0 || j - i > 1600) throw new Error(`Review extraction bounds ${id} ${start}`);
  return text.slice(i, j).trim();
}
function match(id: string, pattern: RegExp) { const value = refs.get(id)!.text.match(pattern)?.[0]; if (!value) throw new Error(`Review extraction ${id}: ${pattern}`); return value; }
function add(spec: Spec) {
  const ref = refs.get(spec.ref)!;
  for (const [, quote] of spec.fields) if (!ref.text.includes(quote) || quote.length < 10 || quote.length > 1600) throw new Error(`Unverified quote ${spec.id}`);
  const { text: _text, ...provenance } = ref; void _text;
  entries.push({ ...provenance, record: { id: spec.id, role_id: spec.role, category: spec.category, title: spec.title, summary: "事实见下列官方原文；标题、分类与适用范围为 LIMEN 编辑索引。", applicability: spec.applicability ?? "中国官方来源样本；资料与方向的关联由LIMEN编辑，不构成个人报考资格、岗位胜任或就业保证。", relation: spec.relation ?? "related", tags: [spec.title, ...(Object.values(spec.context ?? {}).map(String).filter(value => value.length <= 80))], valid_through: spec.historical ? "2026-09-01" : null, freshness_days: spec.category === "admissions" || spec.category === "recruitment" ? 30 : 180, context: spec.context ?? {} }, extracts: spec.fields.map(([field, quote]) => ({ field, pattern: escape(quote) })), expected_fields: [...new Set([...spec.fields.map(([field]) => field), ...(spec.missing ?? [])])] });
}
const sjtuRows: Record<string, [string, string, string]> = {
  ml_cv: ["531人工智能学院", "085400电子信息 01人工智能", "085400电子信息 02具身智能"],
  llm_agent: ["033计算机学院", "081200计算机科学与技术 01计算机科学与技术方向", "081200计算机科学与技术 02软件工程方向"],
  software: ["033计算机学院", "085400电子信息 02软件工程", "085400电子信息 03网络空间安全"],
  devices: ["082生物医学工程学院", "085400电子信息 03生物医学工程 （医疗仪器）", "085400电子信息 04生物医学工程"],
  signals: ["082生物医学工程学院", "085400电子信息 02生物医学工程 （神经工程）", "085400电子信息 03生物医学工程"],
  imaging_eng: ["082生物医学工程学院", "085400电子信息 01生物医学工程 （医学影像）", "085400电子信息 02生物医学工程"],
  clinical_data: ["071数学科学学院", "025200应用统计 01不区分研究方向", "072物理与天文学院"],
  health_systems: ["033计算机学院", "085400电子信息 01计算机与大数据技术", "085400电子信息 02软件工程"],
  med_nlp_kg: ["531人工智能学院", "140500智能科学与技术 01不区分方向", "534能源前沿学院"],
};
for (const dir of dirs) {
  const role = roleId(dir.id), row = sjtuRows[dir.id];
  add({ id: `${dir.id.replaceAll("_", "-")}-sjtu-2027-admissions`, ref: sjtu, role, category: "admissions", title: `${dir.name}：上海交大2027相关培养项目与初试`, fields: [["exam_subjects", segment(sjtu, row[1], row[2], row[0])]], context: { institution: "上海交通大学", college: row[0], program: row[1], admission_year: 2027, region: "上海" }, missing: ["personal_eligibility", "tuition", "college_retest_rules"], applicability: "仅指定学院和目录行；计算机学院的“理工科相关专业”须由院系核实医学本科是否适用，空白限制不能解释为允许。对应职业不要求统一必读学位。" });
  add({ id: `${dir.id.replaceAll("_", "-")}-sjtu-2027-charter`, ref: charter, role, category: "admissions", title: `${dir.name}：交大2027校级资格规则`, fields: [["admission_requirements", match(charter, /按同等学力身份.{10,350}?报考前须经上海交通大学研招办审核通过/)], ["cross_major_restrictions", match(charter, /跨学科专业复试的考生.{10,250}?确定。/)]], context: { institution: "上海交通大学", admission_year: 2027, region: "上海" }, missing: ["personal_eligibility", "ordinary_bachelor_program_eligibility"] });
  add({ id: `${dir.id.replaceAll("_", "-")}-national-wages-2025`, ref: salary, role, category: "industry", title: `${dir.name}：2025行业年平均工资口径`, fields: [["salary_statistics", match(salary, /信息传输、软件和信息技术服务业 248752 238966 4.1/)], ["salary_statistics", match(salary, /信息传输、软件和信息技术服务业 128166 123193 4.0/)], ["salary_statistics", match(salary, /卫生和社会工作 146266 143173 2.2/)], ["salary_statistics", match(salary, /卫生和社会工作 75631 75287 0.5/)], ["statistical_definition", match(salary, /城镇单位指.{10,200}?自由职业者等。/)], ["statistical_definition", match(salary, /工资总额是税前工资.{10,300}?各种资本性收益等。/)]], context: { statistic_scope: "2025年全国城镇单位就业人员税前年平均工资（元/年），表2非私营：信息技术248752、卫生146266；表5私营：信息技术128166、卫生75631。全行业全资历样本，非本方向或应届生薪资。" }, missing: ["major_graduate_salary", "role_average_salary", "major_employment_rate"], relation: "context" });
}
for (const id of ["ml_cv", "llm_agent", "med_nlp_kg", "software", "health_systems"]) {
 add({ id: `${id.replaceAll("_", "-")}-ai-standard`, ref: ai, role: roleId(id), category: "occupation", title: `${dirs.find(dir => dir.id === id)!.name}：国家AI职业标准参考`, fields: [["occupation_definition", segment(ai, "从事与人工智能相关算法", "1.4")], ["skills", segment(ai, "2.2.1", "2.2.3")]], context: { evidence_locator: "PDF物理页5职业定义、页8基础知识；2021年版" }, missing: ["role_specific_career_path", "medical_specific_standard"], applicability: "2021年国家人工智能工程技术标准；与软件、医疗信息系统为相关技能参考，不能当作专门职业标准；该版本不包含今天Agent岗位的全部要求。等级不得换算为个人能力分数。" });
 add({ id: `${id.replaceAll("_", "-")}-ai-learning`, ref: ai, role: roleId(id), category: "learning", title: `${dirs.find(dir => dir.id === id)!.name}：官方基础知识清单`, fields: [["topics", segment(ai, "2.2.1", "2.2.3")]], context: { evidence_locator: "PDF基础知识2.2.1–2.2.2" }, missing: ["course_enrollment", "personal_learning_hours"] });
}
for (const id of ["devices", "signals", "imaging_eng", "clinical_data"]) {
 const program = id === "clinical_data" ? preventive : medPrograms.find(p => p.key === "imaging")!.id;
 add({ id: `${id.replaceAll("_", "-")}-medical-foundation-learning`, ref: program, role: roleId(id), category: "learning", title: `${dirs.find(dir => dir.id === id)!.name}：院校医学基础课程参考`, fields: [["topics", id === "clinical_data" ? segment(program, "主要课程：", "培养目标") : segment(program, "核心课程", "版权所有")]], missing: ["engineering_prerequisites", "personal_learning_hours"], applicability: "官方医学培养课程仅作医学基础参考，不替代工程/统计专业培养方案，未推断应修课程与学时。" });
}
for (const id of ["devices", "signals", "imaging_eng"]) {
 add({ id: `${id.replaceAll("_", "-")}-uestc-2027-admissions`, ref: uestc, role: roleId(id), category: "admissions", title: "电子科大2027生命学院生物医学工程：初试与复试", fields: [["program", "083100 （学术学位） 生物医学工程"], ["exam_subjects", segment(uestc, "初试科目：", "01 （全日制）")]], context: { institution: "电子科技大学", college: "014生命科学与技术学院", program: "083100生物医学工程", admission_year: 2027, region: "四川成都" }, missing: ["cross_major_restrictions", "personal_eligibility"] });
 add({ id: `${id.replaceAll("_", "-")}-uestc-2027-charter`, ref: uestcCharter, role: roleId(id), category: "admissions", title: "电子科大2027：同等学力与招生章程", fields: [["admission_requirements", segment(uestcCharter, "（3）获得国家承认的高职", "（4）已获硕士")], ["admission_requirements", match(uestcCharter, /（6）以同等学力参加复试.{10,200}?笔试。/)]], context: { institution: "电子科技大学", admission_year: 2027, region: "四川成都" }, missing: ["ordinary_bachelor_program_eligibility", "personal_eligibility"], applicability: "校级同等学力身份和加试规则；不能推广为普通医学本科生报考生物医学工程的专门条件。" });
 add({ id: `${id.replaceAll("_", "-")}-szu-2026-admissions`, ref: szu, role: roleId(id), category: "admissions", title: "深圳大学2026生物医学工程：历史目录与报考要求", fields: [["exam_subjects", segment(szu, "初试科目", "培养目标:")], ["admission_requirements", segment(szu, "欢迎具有工程学", "以同等学力")], ["cross_major_restrictions", match(szu, /以同等学力身份.{10,400}?科目。/)]], context: { institution: "深圳大学", college: "124医学部 / 生物医学工程学院", program: "083100生物医学工程", admission_year: 2026, region: "广东深圳" }, historical: true, missing: ["current_year_requirements", "personal_eligibility"] });
}
const jobSegments = { signal: segment(mindray, "RD01", "RD03"), imaging: segment(mindray, "RD03", "RD06"), software: refs.get(mindray)!.text.slice(refs.get(mindray)!.text.indexOf("RD06")) };
for (const [id, key] of [["devices", "signal"], ["signals", "signal"], ["imaging_eng", "imaging"], ["ml_cv", "imaging"], ["software", "software"], ["health_systems", "software"]] as const) {
 const body = jobSegments[key], qualification = body.slice(body.indexOf("任职资格") + 4).trim(), duties = body.slice(body.indexOf("工作职责") + 4, body.indexOf("任职资格")).trim();
 add({ id: `${id.replaceAll("_", "-")}-mindray-recruitment`, ref: mindray, role: roleId(id), category: "recruitment", title: `${dirs.find(dir => dir.id === id)!.name}：迈瑞真实校招岗位`, fields: [["job_title", body.slice(0, body.indexOf("工作职责")).trim()], ["technical_requirements", qualification]], context: { region: key === "software" ? "深圳/武汉/北京/西安/杭州" : "深圳/武汉" }, missing: ["salary", "deadline", "published_at"], relation: id === "devices" ? "related" : "direct" });
 add({ id: `${id.replaceAll("_", "-")}-mindray-occupation`, ref: mindray, role: roleId(id), category: "occupation", title: `${dirs.find(dir => dir.id === id)!.name}：企业职责与技能原文`, fields: [["responsibilities", duties], ["skills", qualification]], missing: ["career_promotion_path", "industry_universal_requirements"], relation: "related" });
}
add({ id: "clinical-data-preventive-occupation", ref: preventive, role: roleId("clinical_data"), category: "occupation", title: "临床数据科学：预防医学工作任务与医学统计课程背景", fields: [["program_definition", segment(preventive, "培养目标 培养", "就业方向")], ["employment_directions", segment(preventive, "就业方向", "深造院校")]], missing: ["clinical_data_role_requirements", "career_path"], applicability: "广东医科大学预防医学官方培养说明，作为人群健康数据应用背景，不能当作临床数据科学统一岗位职责。" });
for (const id of ["clinical_data", "devices", "signals", "imaging_eng"]) {
 add({ id: `${id.replaceAll("_", "-")}-pku-2026-admissions`, ref: pku, role: roleId(id), category: "admissions", title: "北医2026医学技术：健康数据/医学影像/工程方向（历史）", fields: [["program", match(pku, /105800 医学技术 01.{10,250}?全日制/)], ["program", match(pku, /105800 医学技术 02.{10,250}?全日制/)], ["exam_subjects", match(pku, /105800 医学技术 03.{10,260}?全日制/)]], context: { institution: "北京大学", college: "985医学技术研究院", program: "105800医学技术", admission_year: 2026, region: "北京", evidence_locator: "PDF物理页11–12；影像01、健康数据02、工程03方向分别看对应行" }, historical: true, missing: ["cross_major_restrictions", "current_year_requirements", "personal_eligibility"] });
}
for (const id of ["ml_cv", "software", "llm_agent", "devices", "signals", "imaging_eng", "clinical_data", "health_systems", "med_nlp_kg"]) {
 add({ id: `${id.replaceAll("_", "-")}-xidian-employment-context`, ref: employment, role: roleId(id), category: "industry", title: "西电2025届：全校毕业去向落实率（含升学）", fields: [["employment_statistics", match(employment, /截至 2025 年 12 月.{10,220}?98.18%。/)], ["statistical_definition", match(employment, /毕业去向落实率=.{10,260}?自主创业。/)]], context: { institution: "西安电子科技大学", region: "陕西西安", statistic_scope: "2025届全校毕业生，截止2025年12月；总体97.22%、本科96.39%、研究生98.18%，含升学/灵活就业/创业，不是本方向或专业就业率。", evidence_locator: "PDF物理页19（印刷页14）" }, missing: ["direction_employment_rate", "major_average_salary"], relation: "context" });
}
for (const p of medPrograms) {
 const context = { institution: "石河子大学", college: "医学院", program: p.name, medical_topic: p.name, region: "新疆石河子" };
 add({ id: `${p.id}-occupation`, ref: p.id, role: "medicine_guide", category: "occupation", title: `${p.name}：培养目标、学位与就业方向`, fields: [["program_definition", segment(p.id, "学制", "就业方向")], ["employment_directions", segment(p.id, "就业方向", "核心课程")]], context, missing: ["employment_rate", "graduate_salary", "license_eligibility"], relation: "direct", applicability: "石河子大学该专业培养与就业方向介绍；不代表已实现就业、其他学校课程或执业医师/护士考试资格。健康服务与管理属管理类相关专业，不并入医学门类。" });
 add({ id: `${p.id}-learning`, ref: p.id, role: "medicine_guide", category: "learning", title: `${p.name}：官方核心课程`, fields: [["topics", segment(p.id, "核心课程", "版权所有")]], context, missing: ["course_hours", "current_course_access"], relation: "direct" });
}
add({ id: "medicine-preventive-occupation", ref: preventive, role: "medicine_guide", category: "occupation", title: "预防医学：五年制、培养任务与就业方向", fields: [["program_definition", segment(preventive, "招生类别", "专业特色")], ["employment_directions", segment(preventive, "就业方向", "深造院校")], ["skills", segment(preventive, "培养目标 培养", "就业方向")]], context: { institution: "广东医科大学", college: "公共卫生学院", program: "预防医学", medical_topic: "预防医学", region: "广东" }, missing: ["employment_rate", "graduate_salary", "license_eligibility"] });
add({ id: "medicine-national-major-catalog", ref: medCatalog, role: "medicine_guide", category: "industry", title: "教育部2025本科医学门类：专业代码与学位类型", fields: [["major_catalog", segment(medCatalog, "1001 基础医学类", "PAGE 24")], ["major_catalog", segment(medCatalog, "1002 临床医学类", "1005 中医学类")], ["major_catalog", segment(medCatalog, "1005 中医学类", "PAGE 25")], ["major_catalog", segment(medCatalog, "1007 药学类", "PAGE 26")], ["major_catalog", segment(medCatalog, "101017TK", "学科门类：管理学")]], context: { medical_topic: "专业目录", evidence_locator: "PDF物理页23–26（印刷页67–70），T/K按原文保留" }, missing: ["school_specific_admissions", "employment_rate", "graduate_salary"], applicability: "教育部2025版本科专业目录。专业代码和学位类型不等于执业资格；培养单位是否开设某专业需另查。" });
add({ id: "medicine-clinical-departments", ref: departments, role: "medicine_guide", category: "occupation", title: "北大第一医院：40个临床科室实例", fields: [["departments", refs.get(departments)!.text]], context: { medical_topic: "临床科室", institution: "北京大学第一医院", region: "北京" }, missing: ["national_department_standard", "department_training_path", "recruitment_eligibility"], applicability: "单家医院所辖临床科室实例，非全国统一完整分类；医院科室、研究生专业和执业范围不能互相等同。" });
add({ id: "medicine-pku-2026-eligibility", ref: pkuCharter, role: "medicine_guide", category: "admissions", title: "北医2026临床/口腔/护理/非全MPH资格限制（历史）", fields: [["admission_requirements", segment(pkuCharter, "2.报考攻读临床医学", "（二）报名")]], context: { institution: "北京大学", college: "医学部", program: "1051临床/1052口腔/护理/非全MPH", admission_year: 2026, region: "北京", medical_topic: "升学要求" }, historical: true, missing: ["current_year_requirements", "personal_eligibility"] });
add({ id: "medicine-bbmu-observed-employment", ref: bbmu, role: "medicine_guide", category: "industry", title: "蚌医2025生物医学科学：实际升学与就业去向", fields: [["employment_statistics", match(bbmu, /.{0,50}12人直接就业.{10,350}?。/)]], context: { institution: "蚌埠医科大学", college: "生命科学学院", program: "生物医学科学", medical_topic: "就业统计", statistic_scope: "该校2025届生物医学科学专业；正文未给总毕业人数/就业率分母，不根据升学和就业人数自行推算就业率。" }, missing: ["total_graduates", "employment_rate", "average_salary"], relation: "direct" });
add({ id: "medicine-nbs-salary-context", ref: salary, role: "medicine_guide", category: "industry", title: "国家统计局2025卫生行业工资：非私营与私营分开", fields: [["salary_statistics", match(salary, /卫生和社会工作 146266 143173 2.2/)], ["salary_statistics", match(salary, /卫生和社会工作 75631 75287 0.5/)], ["statistical_definition", match(salary, /城镇单位指.{10,200}?自由职业者等。/)]], context: { medical_topic: "就业统计", statistic_scope: "2025年卫生和社会工作行业税前年平均工资（元/年）：非私营146266，私营75631。非医生、非临床医学专业、非应届生工资。" }, missing: ["medical_major_salary", "doctor_salary", "department_salary"], relation: "context" });
for (const id of ["devices", "signals", "imaging_eng", "clinical_data"]) {
 add({ id: `${id.replaceAll("_", "-")}-szu-bme-training`, ref: szu, role: roleId(id), category: "occupation", title: "深圳大学生物医学工程：官方培养与就业方向", fields: [["program_definition", segment(szu, "培养目标:", "课程设置:")], ["employment_directions", segment(szu, "就业方向:", "报考要求")]], context: { institution: "深圳大学", college: "医学部 / 生物医学工程学院", program: "生物医学工程", evidence_locator: "2026目录培养说明" }, missing: ["role_specific_career_path", "employment_rate"], applicability: "院校官方生物医学工程培养说明；相关方向的应用背景，不作为具体职业统一职责或实际就业结果。" });
 add({ id: `${id.replaceAll("_", "-")}-szu-bme-learning`, ref: szu, role: roleId(id), category: "learning", title: "深圳大学生物医学工程：医学图像、数据与传感课程", fields: [["topics", segment(szu, "课程设置:", "就业方向:")]], context: { institution: "深圳大学", program: "生物医学工程", evidence_locator: "2026目录课程设置" }, missing: ["course_hours", "current_course_access"] });
}
const profiles: { name: string; type: string; url: string; quote: string }[] = JSON.parse(readFileSync("data/knowledge/captures/hospital-profiles.json", "utf8"));
for (const profile of profiles) {
 const code = profile.url.match(/Detail_(\d+)/)![1], path = `data/knowledge/captures/pkufh-department-${code}.txt`;
 if (!existsSync(path) || readFileSync(path, "utf8") !== profile.quote) writeFileSync(path, profile.quote);
 const ref = source(`pkufh-department-${code}`, profile.url, "北京大学第一医院", `${profile.name}官方科室介绍`, path, null, "浏览器读取科室完整介绍中的可见段落，未列日级发布日期；历史自述和科室状态只代表原网页，非全国标准。");
 const spec = { id: `medicine-pkufh-department-${code}`, ref, role: "medicine_guide", category: "occupation", title: `${profile.name}：医院官方科室介绍`, fields: [["responsibilities", profile.quote]] as [string, string][], context: { institution: "北京大学第一医院", medical_topic: "临床科室", medical_department: profile.name, department_type: profile.type, region: "北京" }, missing: ["recruitment_eligibility", "license_eligibility", "department_training_path", "department_salary"], applicability: "该院科室工作与发展自述；医院对科室的分类保留原文。科室内医生、技师、护理等岗位需分别核对招聘与执业条件；不推断个人准入、全国排名或当前业务量。" };
 add(spec);
 if (code === "48") add({ ...spec, id: "clinical-data-pkufh-work", role: roleId("clinical_data"), title: "临床数据科学：医院数据中心的实际工作范围", relation: "related" });
}
const pharma: { source_organization: string; records: { id: string; title: string; url: string; publication_date: string; direction_ids: string[]; city: string; scope: string; missing_fields: string[]; capture: { path: string; captured_at: string; raw_sha256: string }; evidence: { field: string; quote: string }[] }[] } = JSON.parse(readFileSync("data/knowledge/captures/tigermed-jobs.json", "utf8"));
for (const job of pharma.records) {
 const ref = source(job.id, job.url, pharma.source_organization, job.title, job.capture.path, job.publication_date, "企业官方招聘入口链接到北森招聘站；发布日期见职位正文。社会招聘，职位当前是否开放需复查。");
 if (refs.get(ref)!.browser_capture!.sha256 !== job.capture.raw_sha256) throw new Error(`Recruitment capture changed ${job.id}`);
 refs.get(ref)!.browser_capture!.captured_at = job.capture.captured_at;
 const fields: [string, string][] = job.evidence.filter(item => ["job_identity", "requirements", "experience"].includes(item.field)).map(item => [item.field === "job_identity" ? "job_title" : item.field === "requirements" ? "technical_requirements" : "experience", item.quote]);
 const duties: [string, string][] = job.evidence.filter(item => ["responsibilities", "quality_requirements"].includes(item.field)).map(item => ["responsibilities", item.quote]);
 for (const direction of job.direction_ids) {
  const context = { region: job.city };
  add({ id: `${job.id}-recruitment`, ref, role: roleId(direction), category: "recruitment", title: `${job.title}：医药企业真实岗位`, fields, context, missing: job.missing_fields, relation: direction === "med_nlp_kg" ? "related" : "direct", applicability: job.scope });
  add({ id: `${job.id}-occupation`, ref, role: roleId(direction), category: "occupation", title: `${job.title}：职责与技能原文`, fields: [...duties, ...job.evidence.filter(item => item.field === "requirements").map(item => ["skills", item.quote] as [string, string])], context, missing: ["career_path", "industry_universal_requirements", ...(direction === "med_nlp_kg" ? ["knowledge_graph_requirements"] : [])], relation: "related", applicability: job.scope });
 }
}
writeFileSync("data/knowledge/expansion.manifest.json", JSON.stringify(entries, null, 2) + "\n");
console.log(JSON.stringify({ reviewed_sources: refs.size, records: entries.length, roles: roleFile.roles.length }));
