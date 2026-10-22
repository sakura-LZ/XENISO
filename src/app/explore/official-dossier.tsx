"use client";
import { useEffect, useState } from "react";
import type { KnowledgeHit } from "@/lib/knowledge";

const labels: Record<string, string> = { occupation: "专业与职业", recruitment: "真实招聘", admissions: "院校招生", industry: "行业与就业统计", learning: "课程与实践" };
const fields: Record<string, string> = { occupation_definition: "职业定义", program_definition: "培养与学位", employment_directions: "就业方向", responsibilities: "工作职责", skills: "技能要求", job_title: "岗位与城市", technical_requirements: "任职要求", exam_subjects: "考试与方向", program: "专业", admission_requirements: "报考条件", cross_major_restrictions: "跨专业 / 同等学力", topics: "课程与知识", salary_statistics: "工资原文", employment_statistics: "毕业去向", statistical_definition: "统计定义", major_catalog: "专业目录", departments: "科室目录" };
const missingLabels: Record<string, string> = { personal_eligibility: "个人资格", tuition: "学费", college_retest_rules: "院系复试细则", ordinary_bachelor_program_eligibility: "普通本科具体专业资格", salary: "岗位薪资", deadline: "招聘截止日", published_at: "发布日期", career_path: "职业晋升路径", career_promotion_path: "职业晋升路径", industry_universal_requirements: "行业通用要求", major_graduate_salary: "本专业毕业生薪资", role_average_salary: "本岗位平均薪资", major_employment_rate: "本专业就业率", employment_rate: "就业率", graduate_salary: "毕业生薪资", license_eligibility: "执业资格", current_year_requirements: "当年新要求", cross_major_restrictions: "跨专业限制", major_average_salary: "专业平均薪资", direction_employment_rate: "本方向就业率", medical_specific_standard: "医疗专门职业标准", role_specific_career_path: "本岗位晋升路径", course_enrollment: "课程开放情况", personal_learning_hours: "个人学习时长", engineering_prerequisites: "工程先修要求", clinical_data_role_requirements: "临床数据岗位要求", course_hours: "课程学时", current_course_access: "课程获取方式", school_specific_admissions: "具体院校招生要求", national_department_standard: "全国科室标准", department_training_path: "科室培养路径", recruitment_eligibility: "招聘资格", total_graduates: "毕业生总人数", average_salary: "平均薪资", medical_major_salary: "医学专业薪资", doctor_salary: "医生薪资", department_salary: "科室薪资", major_restrictions: "专业硬限制" };
Object.assign(missingLabels, { application_deadline: "招聘截止日", education: "学历要求", knowledge_graph_requirements: "知识图谱岗位要求", medicine_major_eligibility: "医学专业是否适用" });
type Result = { hits: KnowledgeHit[]; total: number; has_more: boolean; facets: { institutions: string[]; admission_years: number[] }; coverage: { records: number; sources: number; by_category: Record<string, number> }; missing_categories: string[] };

export function OfficialDossier({ directionId, medicalTopic, medicalDepartment, initialCategory = "" }: { directionId?: string; medicalTopic?: string; medicalDepartment?: string; initialCategory?: string }) {
  const [category, setCategory] = useState(initialCategory);
  const [school, setSchool] = useState("");
  const [year, setYear] = useState("");
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [historical, setHistorical] = useState(false);
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "12", offset: String(offset), q: query, include_historical: String(historical), domain: directionId ? "interdisciplinary" : "medicine" });
    if (directionId) params.set("direction_id", directionId);
    if (medicalTopic) params.set("medical_topic", medicalTopic);
    if (medicalDepartment) params.set("medical_department", medicalDepartment);
    if (category) params.set("category", category);
    if (school) params.set("institution", school);
    if (year) params.set("admission_year", year);
    fetch(`/api/knowledge?${params}`, { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("read_failed");
      return response.json() as Promise<Result>;
    }).then(data => { if (!controller.signal.aborted) { setResult(data); setStatus("ready"); } }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [directionId, medicalTopic, medicalDepartment, category, school, year, query, historical, offset, retry]);
  function change(action: () => void) { action(); setOffset(0); setStatus("loading"); setResult(null); setRetry(value => value + 1); }
  function exportResult() {
    if (!result) return;
    const text = result.hits.map(hit => `## ${hit.title}\n\n${hit.facts.map(fact => `> ${fact.quote}`).join("\n\n")}\n\n适用范围：${hit.applicability}\n${hit.context?.statistic_scope ?? ""}\n来源：${hit.source.organization} ${hit.source.url}\n发布：${hit.source.published_at ?? "未公开"}；采集：${hit.collected_at}\n缺失：${hit.missing_fields.map(field => missingLabels[field] ?? "其他待核实信息").join("、")}`).join("\n\n");
    const url = URL.createObjectURL(new Blob([`# LIMEN 来源资料摘录（当前结果页）\n\n${text}`], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "LIMEN-来源资料摘录.md"; link.click(); URL.revokeObjectURL(url);
  }
  return <section className="mt-7 border-y border-slate-200 py-6" aria-labelledby="official-dossier">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="official-dossier" className="text-xl font-semibold">来源资料</h3><button className="button secondary text-sm" onClick={exportResult} disabled={!result?.hits.length}>导出当前资料页</button></div>
    <details className="mt-3 text-xs muted"><summary>资料来源与适用范围</summary><p className="mt-2 leading-7">引文摘自所列来源原文；院校、年份、统计对象分别核对。标题与方向关联为编辑索引，非来源原文。</p></details>
    <div className="mt-4 flex flex-wrap gap-2" aria-label="资料分类">{[["", "全部资料"], ...Object.entries(labels)].map(([value, label]) => <button key={value} aria-pressed={category === value} className={`rounded-md border px-3 py-2 text-sm ${category === value ? "border-blue-600 bg-blue-50 text-blue-900" : "border-slate-200"}`} onClick={() => change(() => setCategory(value))}>{label}{value && result?.coverage ? ` ${result.coverage.by_category[value] ?? 0}` : ""}</button>)}</div>
    <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); change(() => setQuery(draft)); }}>
      <label className="text-sm">检索原文<input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={draft} maxLength={160} placeholder="如 408、硕士、Python" onChange={event => setDraft(event.target.value)} /></label>
      <label className="text-sm">院校 / 机构<select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={school} onChange={event => change(() => setSchool(event.target.value))}><option value="">全部</option>{result?.facets?.institutions.map(item => <option key={item}>{item}</option>)}{school && !result?.facets?.institutions.includes(school) && <option>{school}</option>}</select></label>
      <label className="text-sm">招生年份<select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" value={year} onChange={event => change(() => setYear(event.target.value))}><option value="">全部</option>{result?.facets?.admission_years.map(item => <option key={item}>{item}</option>)}{year && !result?.facets?.admission_years.includes(Number(year)) && <option>{year}</option>}</select></label>
      <div className="flex items-end gap-3"><button className="button" type="submit">检索</button><button type="button" className="button secondary" onClick={() => change(() => { setDraft(""); setQuery(""); setSchool(""); setYear(""); setCategory(""); })}>清除筛选</button></div>
    </form>
    <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={historical} onChange={event => change(() => setHistorical(event.target.checked))} />包含往年 / 待复查资料（仅作参考）</label>
    <div role="status" className="mt-4 text-sm muted">{status === "loading" ? "正在读取来源资料…" : status === "error" ? "资料暂时读取失败，请重试。" : `命中 ${result?.total ?? 0} 条；本主题共 ${result?.coverage?.records ?? 0} 条资料、${result?.coverage?.sources ?? 0} 个独立来源。`}</div>
    {status === "error" && <button className="button secondary mt-3" onClick={() => { setStatus("loading"); setRetry(retry + 1); }}>重新读取</button>}
    {status === "ready" && result?.missing_categories.length ? <p className="mt-3 text-sm leading-7 text-amber-800">尚缺：{result.missing_categories.map(value => labels[value]).join("、")}。未用生成内容补齐。</p> : null}
    {status === "ready" && !result?.hits.length && <p className="mt-4 rounded border border-slate-200 p-4 text-sm leading-7">当前条件无核验资料；未命中不代表不存在该专业或岗位。</p>}
    <div className="mt-5 divide-y divide-slate-200">{result?.hits.map(hit => <details key={hit.citation} className="py-4" open={category !== "" || query !== ""}>
      <summary className="cursor-pointer leading-7"><span className="mr-2 text-xs muted">{labels[hit.category]}</span><span className="font-medium">{hit.title}</span>{hit.historical && <span className="ml-2 text-xs text-amber-800">往年 / 待复查</span>}<p className="mt-1 text-xs muted">{[hit.context?.institution, hit.context?.college, hit.context?.program, hit.context?.admission_year ? `${hit.context.admission_year}年招生` : ""].filter(Boolean).join(" · ") || hit.source.organization}</p></summary>
      <div className="mt-4 space-y-4 text-sm leading-7">
        {hit.context?.statistic_scope && <p className="rounded border border-amber-200 bg-amber-50 p-3">统计口径：{hit.context.statistic_scope}</p>}
        {hit.facts.map((fact, index) => <div key={`${fact.field}-${index}`}><p className="font-medium">{fields[fact.field] ?? "来源引文"}</p><blockquote className="mt-1 whitespace-pre-wrap border-l-2 border-blue-200 pl-4 text-slate-700">{fact.quote}</blockquote></div>)}
        <p className="muted">适用范围：{hit.applicability}</p>
        {hit.missing_fields.length > 0 && <p className="text-amber-800">未取得：{hit.missing_fields.map(field => missingLabels[field] ?? "其他待核实信息").join("、")}</p>}
        <div className="border-t border-slate-100 pt-3"><a className="font-medium underline break-words" href={hit.source.url} target="_blank" rel="noreferrer">{hit.source.organization} · 查看原始资料 ↗</a><p className="mt-1 text-xs muted">发布：{hit.source.published_at ?? "未公开"} · 采集：{hit.collected_at.slice(0, 10)} · 核实：{hit.verified_at.slice(0, 10)}（原文片段匹配）</p><p className="text-xs muted">{hit.source.publication_date_note} {hit.context?.evidence_locator}</p></div>
      </div>
    </details>)}</div>
    {result && result.total > 12 && <div className="mt-5 flex items-center gap-4"><button className="button secondary" disabled={offset === 0} onClick={() => { setOffset(Math.max(0, offset - 12)); setStatus("loading"); setResult(null); }}>上一页</button><span className="text-sm">第 {Math.floor(offset / 12) + 1} 页</span><button className="button secondary" disabled={!result.has_more} onClick={() => { setOffset(offset + 12); setStatus("loading"); setResult(null); }}>下一页</button></div>}
  </section>;
}
