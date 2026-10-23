"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { readSavedExplanation } from "@/lib/ai";
import { parseR2Planning, r2PlanningSchema } from "@/lib/planning";
import { emptyProfile, profileSchema, type Profile } from "@/lib/profile";
import { directions, findDirection, occupationUrl } from "@/lib/directions";
import { experienceSchema, evaluationCard, experiencePresentation, type Experience } from "@/lib/experience";
import { actionPlan, skillEvidence } from "@/lib/reports";
import { BudgetBar, budgetLabels, ExperienceOutcome, InterestBars, ReportReveal, SectionNav } from "../../profile/report-visuals";
import { download } from "@/lib/download";
import { AiReport } from "@/components/ai-report";
import { DirectionArt, StorysetAttribution } from "@/components/direction-art";
import { assessmentSchema, type AssessmentResult } from "@/lib/assessment";

export function PlanReport({ initialDirection }: { initialDirection: string }) {
  const [direction, setDirection] = useState(findDirection(initialDirection) ? initialDirection : "");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [simulation, setSimulation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState("正在读取画像与体验…");
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [budget, setBudget] = useState({ foundation: 0, practice: 0, review: 0 });
  const [conditionsChanged, setConditionsChanged] = useState(false);
  const plan = direction && findDirection(direction) ? actionPlan(profile, direction, experience, new Date(), assessment, undefined, alternatives) : null;
  const taskLabels = plan ? new Map(plan.tasks.map((task) => [task.id, task.title])) : new Map<string, string>();
  const budgetTotal = budget.foundation + budget.practice + budget.review;
  const budgetValid = budgetTotal > 0 && profile.weekly_hours !== null && budgetTotal <= profile.weekly_hours;
  const ready = loaded && !!experience && !!plan?.planning_ready && budgetValid;
  const load = useCallback(async (personal: boolean) => {
    setBusy(true); setLoaded(false); setExperience(null); setAssessment(null); setProfile(emptyProfile);
    setMessage(personal ? "正在同步你的画像与体验…" : "正在读取 simulation 记录…");
    try {
      if (personal) {
        const [response, expResponse, assessmentResponse] = await Promise.all([fetch("/api/profile", { signal: AbortSignal.timeout(30000) }), fetch("/api/experience", { signal: AbortSignal.timeout(30000) }), fetch("/api/assessment", { signal: AbortSignal.timeout(30000) })]); const value = await response.json();
        if (response.status === 401) { setMessage("完成个人画像与职业体验后，可生成行动规划。"); return; } if (!response.ok) throw new Error(value.error?.message ?? "读取失败。");
        const exp = await expResponse.json();
        if (!expResponse.ok) throw new Error(exp.error?.message ?? "私有体验读取失败。");
        const interest = await assessmentResponse.json();
        if (!assessmentResponse.ok) throw new Error(interest.error?.message ?? "官方兴趣读取失败，未生成个人行动报告。");
        const official = interest.assessment === null ? null : assessmentSchema.parse(interest.assessment);
        const personalProfile = profileSchema.parse(value.profile ?? emptyProfile);
        if (!("experience" in exp)) throw new Error("体验返回不完整，请重新读取。");
        const parsed = exp.experience === null ? null : experienceSchema.parse(exp.experience);
        setProfile(personalProfile); setSimulation(false); setAssessment(official);
        setExperience(parsed); setLoaded(true);
        setMessage(parsed ? "" : "请先完成一次职业体验，并保存成果。");
        return;
      } else {
        const value = JSON.parse(localStorage.getItem("limen:simulation:profile:v1") ?? "null");
        if (value?.simulation !== true) throw new Error("请先在个人画像保存合成演示草稿。");
        setProfile(profileSchema.parse(value.profile ?? emptyProfile)); setSimulation(true);
      }
      const result = experienceSchema.safeParse(JSON.parse(localStorage.getItem("limen:simulation:experience:v1") ?? "null"));
      setExperience(result.success ? result.data : null); setLoaded(true);
      setMessage(result.success ? "已载入演示记录。" : "先完成一次职业体验，再回来安排计划。");
    } catch (error) { setMessage(error instanceof z.ZodError ? "保存的资料未通过校验，请重新读取。" : error instanceof Error && !["TimeoutError", "AbortError", "TypeError", "SyntaxError"].includes(error.name) ? error.message : "资料读取中断，请重新读取。"); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => { void load(true); }, 0); return () => clearTimeout(timer); }, [load]);
  async function restoreSavedPlan() {
    if (busy || restoring || !loaded) return;
    setRestoring(true);
    setMessage("正在读取已保存的计划条件…");
    try {
      const response = await fetch("/api/reports?kind=R2", { cache: "no-store", signal: AbortSignal.timeout(20000) });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error?.message ?? "计划读取失败，请重试。");
      if (!value.report) throw new Error("还没有已保存的行动解读，请先选择目标并安排时间。");
      const rules = z.object({ direction: z.object({ id: z.string() }), planning_input: r2PlanningSchema, alternative_directions: z.array(z.object({ id: z.string() })).max(2).default([]) }).parse(value.report.rules);
      const planning = parseR2Planning(rules.planning_input);
      const alternativeIds = rules.alternative_directions.map((item) => item.id);
      readSavedExplanation(value.report, "R2", rules.direction.id, planning, alternativeIds);
      setDirection(rules.direction.id); setAlternatives(alternativeIds);
      setBudget(planning.weekly_allocation);
      setProfile((current) => ({ ...current, transition_year: planning.transition_year, weekly_hours: planning.weekly_hours, pathway: planning.pathway }));
      setConditionsChanged(false);
      setMessage("已恢复上次报告的目标与时间安排，可在下方查看已保存报告。");
    } catch (error) {
      setMessage(error instanceof z.ZodError ? "已保存条件格式无效，请重新安排并生成报告。" : error instanceof Error && !["TimeoutError", "AbortError", "TypeError", "SyntaxError"].includes(error.name) ? error.message : "计划读取中断，请重试。");
    } finally { setRestoring(false); }
  }
  function exportDraft() {
    if (!ready || !plan) return;
    download("limen-r2-action-draft.json", JSON.stringify({ ...plan, simulation, status: "rule_based_draft_not_formal_ai_report", selected_by: "user_explicit_choice", profile_planning: { transition_year: profile.transition_year, weekly_hours: profile.weekly_hours, pathway: profile.pathway }, weekly_allocation_by_user: budget, alternatives: alternatives.map((id) => findDirection(id)), experience_card: experience ? evaluationCard(experience) : null, sources: ["user_profile", "limen_direction_map", "experience_feedback", ...(plan.interest ? ["onet_mini_ip"] : []), `limen_pathway_checklist:v1:${profile.pathway}`], limitations: [...(!plan.interest ? ["缺少 O*NET 官方兴趣结果，不推断兴趣"] : []), "AI 未生成", "招生数据为空，均需核验", "升学任务为编辑性核验清单，不是官方招生要求"] }, null, 2));
    setMessage("行动计划已导出，包含来源、时间预算与模拟体验记录。");
  }
  const evidence = skillEvidence(profile);
  const resultSections = [{ id: "plan-basis", label: "兴趣与体验依据" }, { id: "plan-gaps", label: "积累与知识缺口" }, { id: "plan-budget", label: "周投入安排" }, { id: "plan-stages", label: "阶段计划" }, { id: "plan-admissions", label: "升学与备选" }, { id: "plan-explanation", label: "AI解释与导出" }];
  function changePlanning<K extends "transition_year" | "weekly_hours" | "pathway">(key: K, value: Profile[K]) { setProfile(current => ({ ...current, [key]: value })); setConditionsChanged(true); }
  const currentYear = new Date().getFullYear();
  const invalidYear = profile.transition_year !== null && (!Number.isInteger(profile.transition_year) || profile.transition_year < currentYear || profile.transition_year > 2100);
  const invalidHours = profile.weekly_hours !== null && (profile.weekly_hours <= 0 || profile.weekly_hours > 168);
  return <main id="main" className="shell xn-report-page xn-plan-page pr-report-page">
    <ReportReveal motion="M-A01"><header className="pr-heading pr-report-heading"><h1>行动规划</h1><div className="pr-actions"><button className="button secondary" disabled={busy || restoring} onClick={() => load(true)}>刷新资料与体验</button><button className="button secondary" disabled={busy || restoring || !loaded} onClick={() => void restoreSavedPlan()}>{restoring ? "正在恢复…" : "恢复已保存计划条件"}</button></div></header></ReportReveal>
    {message && <p className="inline-feedback" role="status">{message}</p>}
    <div id="plan-conditions" className="pr-plan-conditions" data-motion="M-A01"><div className="pr-plan-form">
      <section className="pr-condition-group"><h2>选择探索目标</h2><label className="form-label">目标方向<select className="field" value={direction} onChange={event => { setDirection(event.target.value); setAlternatives([]); setConditionsChanged(true); }}><option value="">选择目标方向</option>{directions.map(item => <option key={item.id} value={item.id}>{item.id === "medicine" ? "临床工作" : `${item.group_name} / ${item.name}`}</option>)}</select></label>
      {plan ? <><p>{plan.direction.work_tasks.join("；")}。</p><fieldset className="pr-alternatives"><legend>备选方向（最多两个）</legend><div>{directions.filter(item => item.id !== direction).map(item => <label key={item.id}><input type="checkbox" checked={alternatives.includes(item.id)} disabled={!alternatives.includes(item.id) && alternatives.length >= 2} onChange={() => { setAlternatives(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id]); setConditionsChanged(true); }} />{item.name}</label>)}</div></fieldset></> : <p>先了解具体工作，再选择你的探索目标。<Link href="/explore">比较方向任务</Link>。</p>}</section>
      <section className="pr-condition-group"><h2>时间与升学路径</h2><div className="pr-planning-fields"><label className="form-label">计划转型年份<input className="field" type="number" min={currentYear} max={2100} value={profile.transition_year ?? ""} aria-invalid={invalidYear} aria-describedby={invalidYear ? "planning-year-error" : undefined} onChange={event => changePlanning("transition_year", event.target.value ? Number(event.target.value) : null)} />{invalidYear && <span className="pr-field-error" id="planning-year-error">填写 {currentYear} 至 2100 之间的整数年份。</span>}</label><label className="form-label">每周可投入小时<input className="field" type="number" min={0.5} max={168} step="0.5" value={profile.weekly_hours ?? ""} aria-invalid={invalidHours} aria-describedby={invalidHours ? "planning-hours-error" : undefined} onChange={event => changePlanning("weekly_hours", event.target.value ? Number(event.target.value) : null)} />{invalidHours && <span className="pr-field-error" id="planning-hours-error">每周投入需大于零，且不超过168小时。</span>}</label><label className="form-label pr-full-field">升学路径<select className="field" value={profile.pathway} onChange={event => changePlanning("pathway", event.target.value as Profile["pathway"])}>{["未决定", "统考", "推免", "申请制"].map(pathway => <option key={pathway}>{pathway}</option>)}</select></label></div><p className="pr-source">{profile.pathway === "统考" ? "逐项核验目标专业的考试科目、跨专业资格和复试要求，不默认所有方向都考408。" : profile.pathway === "推免" ? "分别核实本校推免资格与目标项目的当年接收规则、材料和时间。" : profile.pathway === "申请制" ? "核验项目的学历、语言、材料与截止时间；导师联系以项目要求或本人目的为准。" : "先比较资格与准备要求，再确定升学路径。"}</p></section>
      <section className="pr-condition-group"><h2>每周时间分配</h2><fieldset><legend className="sr-only">基础、实践与复盘的小时预算</legend><div className="pr-budget-inputs">{budgetLabels.map(([id, label]) => <label className="form-label" key={id}>{label}<span className="pr-input-unit"><input className="field" type="number" min={0} max={168} step="0.5" value={budget[id]} onChange={event => { const value = Number(event.target.value); setBudget(current => ({ ...current, [id]: Number.isFinite(value) ? Math.max(0, Math.min(168, value)) : 0 })); setConditionsChanged(true); }} /><span>小时</span></span></label>)}</div></fieldset><p className={budgetTotal > (profile.weekly_hours ?? 0) && profile.weekly_hours !== null ? "pr-field-error" : "pr-source"} role="status">已分配 {budgetTotal} 小时 / 可用 {profile.weekly_hours ?? "未填写"} 小时。{!budgetValid && "分配总量需大于零且不超过可用时间。"}</p></section>
      {plan && <a className="button secondary" href="#plan-results">查看规则预览 ↓</a>}
    </div><aside className="pr-condition-summary" data-motion="M-A02"><h2>当前条件</h2><div className="pr-summary-target" key={direction}>{direction && <DirectionArt direction={direction} compact />}<span>目标方向</span><h3>{plan?.direction.name ?? "尚未选择"}</h3></div><dl><div key={`year-${profile.transition_year}`}><dt>目标年份</dt><dd>{profile.transition_year ?? "尚未填写"}</dd></div><div key={`hours-${profile.weekly_hours}`}><dt>每周投入</dt><dd>{profile.weekly_hours === null ? "尚未填写" : `${profile.weekly_hours} 小时`}</dd></div><div key={profile.pathway}><dt>升学路径</dt><dd>{profile.pathway === "未决定" ? "尚未决定" : profile.pathway}</dd></div></dl><BudgetBar budget={budget} hours={profile.weekly_hours} motion="M-A03" />{alternatives.length > 0 && <p className="pr-source">备选：{alternatives.map(id => findDirection(id)?.name).join("、")}</p>}{direction && <StorysetAttribution />}</aside></div>
    {plan && <div id="plan-results" className="pr-plan-results" data-motion="M-A04"><header className="pr-plan-result-heading" data-motion="M-R01"><span className="pr-source">规则预览</span><h2>{plan.direction.name}</h2><p>{profile.transition_year === null ? "年份待填写" : `${profile.transition_year}年`} · {profile.weekly_hours === null ? "周投入待填写" : `每周${profile.weekly_hours}小时`} · {profile.pathway}</p><div className="pr-actions"><a href="#plan-conditions" className="button secondary">修改条件</a><button className="button secondary" disabled={!ready} onClick={exportDraft}>导出行动计划</button></div>{conditionsChanged && <p className="pr-source" role="status">条件已修改。下方规则预览已更新；已保存的 AI 规划需重新读取核对或重新生成。</p>}</header>
    <div className="pr-report-layout"><SectionNav items={resultSections} motion="M-R01" /><div className="pr-report-body">
      <section id="plan-basis" className="pr-report-section"><h2>兴趣与体验依据</h2><div className="pr-two-columns"><div><h3>职业活动兴趣</h3>{plan.interest ? <><InterestBars scores={plan.interest.scores} motion="M-R02" /><p className="pr-source">O*NET Mini-IP · {plan.interest.onet_version}<br /><Link href="/report/initial#initial-interest">官方结果与职业来源</Link></p></> : <div className="pr-empty-state"><p>尚无官方兴趣结果。</p><Link href="/assessment">开始问卷</Link></div>}</div><ReportReveal motion="M-R02" delay={100}><h3>职业体验</h3>{experience ? <><ExperienceOutcome experience={experience} /><dl className="pr-reflection"><div><dt>最想继续</dt><dd>{experience.reflection.favorite_operation}</dd></div><div><dt>最不喜欢</dt><dd>{experience.reflection.least_favorite_operation}</dd></div><div><dt>愿再投入3小时</dt><dd>{experience.reflection.willingness_for_3_hours} / 5</dd></div></dl>{"outputs" in experience && <details className="pr-details"><summary>三阶段体验成果</summary><ol className="pr-source-list">{experience.outputs.map((output, index) => <li key={index}><h4>{experiencePresentation(experience).stage_names[index]}</h4><p className="whitespace-pre-wrap">{output}</p></li>)}</ol></details>}<p className="pr-source">模拟职业体验 · {new Date(experience.completed_at).toLocaleDateString("zh-CN")}</p></> : <div className="pr-empty-state"><p>尚无已保存的体验成果。</p><Link href="/experience">完成一次职业体验</Link></div>}</ReportReveal></div><p className="pr-source">{plan.experience_relevance}</p></section>
      <section id="plan-gaps" className="pr-report-section"><h2>已有积累与知识缺口</h2><p className="pr-source">根据方向手册中的技能与本人记录对照。记录名称相关不等于已掌握，未知不计零分。</p><div className="pr-gap-rows">{plan.gaps.map((gap, index) => <ReportReveal motion="M-R03" delay={Math.min(index,3)*80} key={gap.skill}><article><div><h3>{gap.skill}</h3><p>{gap.note}</p></div><details><summary>{gap.status}</summary>{gap.evidence_refs.length ? gap.evidence_refs.map(ref => <p key={ref}>{evidence.find(item => item.ref === ref)?.evidence ?? "对应经历待核验"}</p>) : <p>尚未找到对应的个人经历。<Link href="/profile/basics">补充课程与项目记录</Link>。</p>}<p className="pr-source">要求来源：<Link href={`/explore?direction=${direction}`}>{plan.direction.name}方向手册</Link>。</p></details></article></ReportReveal>)}</div></section>
      <section id="plan-budget" className="pr-report-section"><h2>周投入安排</h2><BudgetBar budget={budget} hours={profile.weekly_hours} motion="M-R04" /><p className={budgetValid ? "pr-source" : "pr-field-error"}>{budgetValid ? `每周可用${profile.weekly_hours}小时，已安排${budgetTotal}小时。用实际练习耗时调整下一周预算。` : "时间分配尚未满足条件，请返回修改每周投入与预算。"}</p></section>
      <section id="plan-stages" className="pr-report-section"><h2>阶段计划</h2>{plan.planning ? <><p className="pr-reading-width">{plan.planning.horizon}</p><div className="pr-stage-layout"><SectionNav label="规划阶段" motion="M-R05" items={plan.planning.milestones.map((milestone,index) => ({ id: `plan-stage-${index}`, label: milestone.stage }))} /><div>{plan.planning.milestones.map((milestone,index) => <section id={`plan-stage-${index}`} className="pr-stage" key={milestone.stage}><ReportReveal motion="M-R05" delay={Math.min(index,3)*80}><span className="pr-stage-number">{String(index+1).padStart(2,"0")}</span><h3>{milestone.stage}</h3><p>{milestone.exit_condition}</p><ol>{milestone.task_ids.map(id => plan.tasks.find(task => task.id === id)).filter(task => task !== undefined).map(task => <li key={task.id}><h4>{task.title}</h4><p>{task.why}</p><dl><div><dt>成果</dt><dd>{task.deliverable}</dd></div><div><dt>前置任务</dt><dd>{task.dependencies.length ? task.dependencies.map(id => taskLabels.get(id) ?? "待核验任务").join("、") : "无"}</dd></div></dl><p className="pr-source">工作量：未知 · {task.source.startsWith("limen_pathway_checklist") ? "LIMEN 路径核验清单" : task.source === "verifiedAdmissions:empty" ? "官方招生信息待核验" : "LIMEN 方向手册"}</p></li>)}</ol></ReportReveal></section>)}</div></div></> : <p className="pr-empty-state">填写有效目标年份、每周投入并选择升学路径后，可查看阶段安排。<a href="#plan-conditions">返回规划条件</a>。</p>}</section>
      <section id="plan-admissions" className="pr-report-section" data-motion="M-R06"><h2>升学核验与备选</h2><p className="pr-reading-width">当前没有已核验的招生项目。以下为 LIMEN 编辑性核验清单，不代表院校官方要求。</p><dl className="pr-admissions-checklist">{[["学校与项目", "核实院校、项目名称、专业代码与招生方式。"], ["目标年份", "核实招生年份、报名和考核时间，记录发布日期。"], ["报考条件", "核实跨专业资格、考试科目、语言与复试要求。"], ["官方来源", "保存项目官方 URL、原文与本次核验日期。"]].map(([title, content]) => <div key={title}><dt>{title}</dt><dd>{content}</dd></div>)}</dl><ul className="pr-source-list">{plan.risks.map(risk => <li key={risk}>{risk}</li>)}</ul>{alternatives.length > 0 && <div className="pr-table-scroll"><table><caption>目标与备选方向的工作差异</caption><thead><tr><th>方向</th><th>典型工作</th><th>准备线索</th></tr></thead><tbody>{[direction,...alternatives].map(id => { const item = findDirection(id)!; return <tr key={id}><th><Link href={`/explore?direction=${id}`}>{item.name}</Link></th><td>{item.work_tasks.join("；")}</td><td>{item.skills.join("、")}</td></tr>; })}</tbody></table></div>}<details className="pr-details"><summary>方向映射来源</summary><p>职业关联由 LIMEN 编辑，不是 O*NET 官方中国考研专业结论。</p><ul>{plan.direction.onet.map(item => <li key={item.code}><a href={occupationUrl(item.code)} target="_blank" rel="noreferrer">{item.name} · {item.code}</a></li>)}</ul></details></section>
      <section id="plan-explanation" className="pr-report-section" data-motion="M-R07"><h2>AI解释与导出</h2><p className="pr-source">规则预览与 AI 解读分别生成。AI 需要已保存的画像、官方兴趣、职业体验，以及有效规划条件。</p><AiReport key={JSON.stringify([direction, alternatives, profile.transition_year, profile.weekly_hours, profile.pathway, budget, loaded, simulation])} kind="R2" direction={findDirection(direction)?.id} alternatives={alternatives} enabled={ready && !simulation && !!assessment} planning={{ transition_year: profile.transition_year, weekly_hours: profile.weekly_hours, pathway: profile.pathway, weekly_allocation: budget }} /><div className="pr-actions pr-report-next"><button className="button" disabled={!ready} onClick={exportDraft}>导出行动计划</button><Link href="/profile" className="pr-text-link">补充与保存画像</Link><Link href="/experience" className="pr-text-link">返回职业体验</Link></div></section>
    </div></div></div>}
  </main>;
}
