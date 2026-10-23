"use client";
import { useEffect, useId, useState } from "react";
import type { KnowledgeHit } from "@/lib/knowledge";

const labels: Record<string, string> = { occupation: "专业与职业", recruitment: "真实招聘", admissions: "院校招生", industry: "行业与就业统计", learning: "课程与实践" };
const fields: Record<string, string> = { occupation_definition: "职业定义", program_definition: "培养与学位", employment_directions: "就业方向", responsibilities: "工作职责", skills: "技能要求", job_title: "岗位与城市", technical_requirements: "任职要求", exam_subjects: "考试与方向", program: "专业", admission_requirements: "报考条件", cross_major_restrictions: "跨专业 / 同等学力", topics: "课程与知识", salary_statistics: "工资原文", employment_statistics: "毕业去向", statistical_definition: "统计定义", major_catalog: "专业目录", departments: "科室目录", curriculum: "逐门课程与学时学分", credit_requirement: "学分构成要求", course_prerequisites: "课程先修要求", practice_hours: "实验与实践学时", industry_distribution: "就业行业分布", further_study_rate: "升学率" };
const missingLabels: Record<string, string> = { personal_eligibility: "个人资格", tuition: "学费", college_retest_rules: "院系复试细则", ordinary_bachelor_program_eligibility: "普通本科具体专业资格", salary: "岗位薪资", deadline: "招聘截止日", published_at: "发布日期", career_path: "职业晋升路径", career_promotion_path: "职业晋升路径", industry_universal_requirements: "行业通用要求", major_graduate_salary: "本专业毕业生薪资", role_average_salary: "本岗位平均薪资", major_employment_rate: "本专业就业率", employment_rate: "就业率", graduate_salary: "毕业生薪资", license_eligibility: "执业资格", current_year_requirements: "当年新要求", cross_major_restrictions: "跨专业限制", major_average_salary: "专业平均薪资", direction_employment_rate: "本方向就业率", medical_specific_standard: "医疗专门职业标准", role_specific_career_path: "本岗位晋升路径", course_enrollment: "课程开放情况", personal_learning_hours: "个人学习时长", engineering_prerequisites: "工程先修要求", clinical_data_role_requirements: "临床数据岗位要求", course_hours: "课程学时", current_course_access: "课程获取方式", school_specific_admissions: "具体院校招生要求", national_department_standard: "全国科室标准", department_training_path: "科室培养路径", recruitment_eligibility: "招聘资格", total_graduates: "毕业生总人数", average_salary: "平均薪资", medical_major_salary: "医学专业薪资", doctor_salary: "医生薪资", department_salary: "科室薪资", major_restrictions: "专业硬限制" };
Object.assign(missingLabels, { application_deadline: "招聘截止日", education: "学历要求", knowledge_graph_requirements: "知识图谱岗位要求", medicine_major_eligibility: "医学专业是否适用" });
type Result = { hits: KnowledgeHit[]; total: number; has_more: boolean; facets: { institutions: string[]; admission_years: number[] }; coverage: { records: number; sources: number; by_category: Record<string, number> }; missing_categories: string[] };

export function OfficialDossier({ directionId, medicalTopic, medicalDepartment, initialCategory = "", chapterMode = false }: { directionId?: string; medicalTopic?: string; medicalDepartment?: string; initialCategory?: string; chapterMode?: boolean }) {
  const titleId = useId();
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
    const text = result.hits.map(hit => `## ${hit.title}\n\n${hit.facts.map(fact => `> ${fact.quote}`).join("\n\n")}\n\n适用范围：${hit.applicability}\n${hit.context?.statistic_scope ?? ""}\n来源：${hit.source.organization} ${hit.source.url}\n发布日期：${hit.source.published_at ?? "来源未标注"}；采集日期：${hit.collected_at}\n没查到：${hit.missing_fields.map(field => missingLabels[field] ?? "其他待核实信息").join("、")}`).join("\n\n");
    const url = URL.createObjectURL(new Blob([`# LIMEN 来源资料摘录（当前结果页）\n\n${text}`], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "LIMEN-来源资料摘录.md"; link.click(); URL.revokeObjectURL(url);
  }
  return <section className="xnlib-dossier" aria-labelledby={titleId}>
    <div className="xnlib-dossier-head">
      <h3 id={titleId}>{chapterMode ? labels[initialCategory] : "来源资料"}</h3>
      <button className="button secondary small" onClick={exportResult} disabled={!result?.hits.length}>导出这页资料</button>
    </div>
    <p className="xnlib-dossier-lead">引文照抄来源原文，院校、年份和统计对象分别核对。标题和方向归属是站内编辑索引，不是来源原文；抓取不到或原文没写的，标「没查到」。</p>
    {!chapterMode && <div className="xnlib-facet-row" aria-label="资料分类">{[["", "全部资料"], ...Object.entries(labels)].map(([value, label]) => <button key={value} className="xnlib-facet" aria-pressed={category === value} onClick={() => change(() => setCategory(value))}>{label}{value && result?.coverage ? <b>{result.coverage.by_category[value] ?? 0}</b> : null}</button>)}</div>}
    <form className="xnlib-form" onSubmit={event => { event.preventDefault(); change(() => setQuery(draft)); }}>
      <label>检索原文<input className="field" value={draft} maxLength={160} placeholder="如 408、硕士、Python" onChange={event => setDraft(event.target.value)} /></label>
      <label>院校 / 机构<select className="field" value={school} onChange={event => change(() => setSchool(event.target.value))}><option value="">全部</option>{result?.facets?.institutions.map(item => <option key={item}>{item}</option>)}{school && !result?.facets?.institutions.includes(school) && <option>{school}</option>}</select></label>
      <label>招生年份<select className="field" value={year} onChange={event => change(() => setYear(event.target.value))}><option value="">全部</option>{result?.facets?.admission_years.map(item => <option key={item}>{item}</option>)}{year && !result?.facets?.admission_years.includes(Number(year)) && <option>{year}</option>}</select></label>
      <div className="xnlib-form-actions">
        <button className="button small" type="submit">检索</button>
        <button type="button" className="button secondary small" onClick={() => change(() => { setDraft(""); setQuery(""); setSchool(""); setYear(""); setCategory(chapterMode ? initialCategory : ""); setHistorical(false); })}>清除筛选</button>
      </div>
    </form>
    <label className="xnlib-check xnlib-after-form"><input type="checkbox" checked={historical} onChange={event => change(() => setHistorical(event.target.checked))} />把往年 / 待复查的资料也列出来（只作参考）</label>
    <p className={`xnlib-count${status === "error" ? " error" : ""}`} role="status">{status === "loading" ? "正在读来源资料…" : status === "error" ? "来源资料这次没读出来。可能是网络或资料库暂时不可用，可以重试。" : `命中 ${result?.total ?? 0} 条；这个主题一共收录 ${result?.coverage?.records ?? 0} 条资料、来自 ${result?.coverage?.sources ?? 0} 个独立来源。`}</p>
    {status === "error" && <div className="xnlib-file-actions"><button className="button secondary small" onClick={() => { setStatus("loading"); setRetry(retry + 1); }}>重新读取</button></div>}
    {status === "ready" && !!result?.missing_categories.length && <p className="xnlib-count warn">还没查到的分类：{result.missing_categories.map(value => labels[value]).join("、")}。这些位置空着，没有用生成内容补齐。</p>}
    {status === "ready" && !result?.hits.length && <div className="xnlib-empty"><p>按当前条件没查到已核实的原文。没查到不等于不存在这个专业或岗位，可以放宽年份、换一所院校，或先看其他分类。</p></div>}
    {category === "admissions" && !!result?.hits.length && <div className="xnlib-admissions">
      <table>
        <caption className="sr-only">当前招生来源里的院校、项目、年份与专业要求</caption>
        <thead><tr><th scope="col">学校与项目</th><th scope="col">招生年份</th><th scope="col">专业与报考要求</th><th scope="col">来源</th></tr></thead>
        <tbody>{result.hits.map(hit => <tr key={hit.citation}>
          <td data-label="学校与项目">{hit.context?.institution ?? hit.source.organization}<p>{hit.context?.program ?? "具体项目待核验"}</p></td>
          <td data-label="招生年份">{hit.context?.admission_year ?? "没查到"}</td>
          <td data-label="专业与报考要求">{hit.facts.find(fact => fact.field === "cross_major_restrictions" || fact.field === "admission_requirements")?.quote ?? "这条资料没写个人报考资格，标「没查到」"}</td>
          <td data-label="来源"><a href={hit.source.url} target="_blank" rel="noreferrer">{hit.title}</a></td>
        </tr>)}</tbody>
      </table>
    </div>}
    <div key={`${query}:${school}:${year}:${category}:${offset}`}>{result?.hits.map(hit => <article key={hit.citation} className="xnlib-record">
      <h4><a href={hit.source.url} target="_blank" rel="noreferrer">{hit.title}</a></h4>
      <p className="xnlib-record-meta">{[hit.context?.institution, hit.context?.college, hit.context?.program, hit.context?.admission_year ? `${hit.context.admission_year} 年招生` : ""].filter(Boolean).join(" · ") || hit.source.organization} · 发布日期 {hit.source.published_at ?? "来源未标注"} · 采集日期 {hit.collected_at.slice(0, 10)}</p>
      <div className="xnlib-record-chips">
        <span className="atlas-chip" data-tone="ok">有出处</span>
        {hit.historical && <span className="atlas-chip" data-tone="gap">往年 / 待复查</span>}
        {hit.missing_fields.length > 0 && <span className="atlas-chip" data-tone="miss">没查到 {hit.missing_fields.length} 项</span>}
      </div>
      <details>
        <summary>展开原文摘录、适用范围与核对时间</summary>
        <div>
          {hit.context?.statistic_scope && <p className="xnlib-scope">统计口径：{hit.context.statistic_scope}</p>}
          {hit.facts.map((fact, index) => <blockquote className="xnlib-quote" key={`${fact.field}-${index}`}><b>{fields[fact.field] ?? "来源引文"}</b>{fact.quote}</blockquote>)}
          <p className="xnlib-record-meta">适用范围：{hit.applicability}</p>
          {hit.missing_fields.length > 0 && <p className="xnlib-missing">没查到：{hit.missing_fields.map(field => missingLabels[field] ?? "其他待核实信息").join("、")}。这些字段来源没写，我们不做推测。</p>}
          <div className="xnlib-record-foot">
            <a href={hit.source.url} target="_blank" rel="noreferrer">{hit.source.organization} · 打开原始资料</a>
            <span>采集日期 {hit.collected_at.slice(0, 10)}</span>
            <span>核对日期 {hit.verified_at.slice(0, 10)}（原文片段逐字匹配）</span>
          </div>
          <p className="xnlib-disclosure">{hit.source.publication_date_note} {hit.context?.evidence_locator}</p>
        </div>
      </details>
    </article>)}</div>
    {result && result.total > 12 && <div className="xnlib-pager">
      <button className="button secondary small" disabled={offset === 0} onClick={() => { setOffset(Math.max(0, offset - 12)); setStatus("loading"); setResult(null); }}>上一页</button>
      <span>第 {Math.floor(offset / 12) + 1} 页</span>
      <button className="button secondary small" disabled={!result.has_more} onClick={() => { setOffset(offset + 12); setStatus("loading"); setResult(null); }}>下一页</button>
    </div>}
  </section>;
}
