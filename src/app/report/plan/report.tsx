"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { z } from "zod";
import { readSavedExplanation } from "@/lib/ai";
import { parseR2Planning, r2PlanningSchema } from "@/lib/planning";
import { emptyProfile, profileSchema, type Profile } from "@/lib/profile";
import { directions, findDirection, occupationUrl } from "@/lib/directions";
import { experienceSchema, evaluationCard, experiencePresentation, type Experience } from "@/lib/experience";
import { actionPlan, skillEvidence } from "@/lib/reports";
import { exitRule, reviewCadence, reviewQuestions, stageSources, yearlyVerifyNotes } from "@/lib/planning-stages";
import { BudgetLedger, ExperienceCard, InterestRadar, ReportIndex, budgetLabels } from "../report-visuals";
import { download } from "@/lib/download";
import { AiReport } from "@/components/ai-report";
import { IconAccount, IconBook, IconCalendar, IconCompass, IconCopy, IconDownload, IconExternal, IconFolder, IconPlay, IconPulse, IconQuiz, IconStamp, IconWarning } from "@/components/icons";
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
  /** none = 正常；guest = 三个接口都 401（无会话）；missing = 有会话但还没保存画像。后两种不渲染表单。 */
  const [setup, setSetup] = useState<"none" | "guest" | "missing">("none");
  const plan = direction && findDirection(direction) ? actionPlan(profile, direction, experience, new Date(), assessment, undefined, alternatives) : null;
  const taskLabels = plan ? new Map(plan.tasks.map((task) => [task.id, task.title])) : new Map<string, string>();
  const budgetTotal = budget.foundation + budget.practice + budget.review;
  const budgetValid = budgetTotal > 0 && profile.weekly_hours !== null && budgetTotal <= profile.weekly_hours;
  const ready = loaded && !!experience && !!plan?.planning_ready && budgetValid;
  const load = useCallback(async (personal: boolean) => {
    setBusy(true); setLoaded(false); setExperience(null); setAssessment(null); setProfile(emptyProfile); setSetup("none");
    setMessage(personal ? "正在同步你的画像与体验…" : "正在读取 simulation 记录…");
    try {
      if (personal) {
        const [response, expResponse, assessmentResponse] = await Promise.all([fetch("/api/profile", { signal: AbortSignal.timeout(30000) }), fetch("/api/experience", { signal: AbortSignal.timeout(30000) }), fetch("/api/assessment", { signal: AbortSignal.timeout(30000) })]); const value = await response.json();
        if (response.status === 401) { setSetup("guest"); setMessage("还没有登录会话，读不到画像、兴趣与体验。先完成下面列出的前三步。"); return; } if (!response.ok) throw new Error(value.error?.message ?? "读取失败。");
        if (!value.profile) { setSetup("missing"); setMessage("还没有保存个人画像。先完成第 1 步，再回来排计划。"); return; }
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
    } finally {
      setRestoring(false);
    }
  }
  function exportDraft() {
    if (!ready || !plan) return;
    download("limen-r2-action-draft.json", JSON.stringify({ ...plan, simulation, status: "rule_based_draft_not_formal_ai_report", selected_by: "user_explicit_choice", profile_planning: { transition_year: profile.transition_year, weekly_hours: profile.weekly_hours, pathway: profile.pathway }, weekly_allocation_by_user: budget, alternatives: alternatives.map((id) => findDirection(id)), experience_card: experience ? evaluationCard(experience) : null, sources: ["user_profile", "limen_direction_map", "experience_feedback", ...(plan.interest ? ["onet_mini_ip"] : []), `limen_pathway_checklist:v1:${profile.pathway}`], limitations: [...(!plan.interest ? ["缺少 O*NET 官方兴趣结果，不推断兴趣"] : []), "AI 未生成", "招生数据为空，均需核验", "升学任务为编辑性核验清单，不是官方招生要求"] }, null, 2));
    setMessage("行动计划已导出，包含来源、时间预算与模拟体验记录。");
  }
  const evidence = skillEvidence(profile);
  const resultSections = [{ id: "plan-basis", label: "兴趣与体验依据" }, { id: "plan-gaps", label: "积累与知识缺口" }, { id: "plan-budget", label: "周投入安排" }, { id: "plan-stages", label: "阶段计划" }, { id: "plan-review", label: "复盘与年度核对" }, { id: "plan-admissions", label: "升学与备选" }, { id: "plan-explanation", label: "AI解释与导出" }];
  /** 任务来源在页面上要写成人话，不能直接摊内部标识符。 */
  function taskSourceLabel(source: string) {
    if (source === stageSources.admissions) return "官方招生信息待核验";
    if (source.startsWith("limen_pathway_checklist")) return "LIMEN 升学路径核验清单";
    if (source.startsWith("limen_stage_template")) return "LIMEN 学习节奏模板（通行做法，非院校要求）";
    if (source.startsWith("limen_direction_map")) return "LIMEN 方向手册";
    return "LIMEN 方向手册";
  }
  function changePlanning<K extends "transition_year" | "weekly_hours" | "pathway">(key: K, value: Profile[K]) { setProfile(current => ({ ...current, [key]: value })); setConditionsChanged(true); }
  const currentYear = new Date().getFullYear();
  const invalidYear = profile.transition_year !== null && (!Number.isInteger(profile.transition_year) || profile.transition_year < currentYear || profile.transition_year > 2100);
  const invalidHours = profile.weekly_hours !== null && (profile.weekly_hours <= 0 || profile.weekly_hours > 168);
  return <main id="main" className="shell xr-page">
    <div className="xr-file">
      <span className="xr-holes" aria-hidden="true"><i /><i /><i /></span>

      <header className="atlas-sheet raised xr-cover">
        <span className="atlas-tape mid" aria-hidden="true" />
        <div className="xr-cover-top">
          <div className="xr-cover-main">
            <h1 className="xr-title">行动规划</h1>
            <p className="xr-lede">
              <b>R2 = 行动规划</b>，是整个流程的第 5 步。R1 把兴趣、能力迁移、知识缺口和报考条件整理成四栏结论；
              这一页把它们排到具体的时间上：下周哪几个小时做什么，每到一个阶段该能独立做完什么，哪些报考条件现在还是空的。
              这里不算录取概率，也不给方向排名。
            </p>
          </div>
          <div className="xr-cover-side">
            <span className="atlas-stamp animate" data-atlas-in="1">R2 · 行动规划</span>
            {simulation && <span className="atlas-chip" data-tone="gap">simulation · 合成演示</span>}
            {setup === "none"
              ? <span className="atlas-chip" data-tone={ready ? "ok" : undefined}>{ready ? "条件齐备，可导出" : "条件未齐"}</span>
              : <span className="atlas-chip" data-tone="miss">{setup === "guest" ? "没有登录会话" : "还没有画像"}</span>}
          </div>
        </div>
        <dl className="atlas-kv xr-meta">
          <div><dt>目标方向</dt><dd>{plan ? plan.direction.name : "尚未选择"}</dd></div>
          <div><dt>目标年份</dt><dd>{profile.transition_year ?? "尚未填写"}</dd></div>
          <div><dt>每周投入</dt><dd>{profile.weekly_hours === null ? "尚未填写" : `${profile.weekly_hours} 小时`}</dd></div>
          <div><dt>升学路径</dt><dd>{profile.pathway === "未决定" ? "尚未决定" : profile.pathway}</dd></div>
        </dl>
        <div className="xr-actions">
          <button className="atlas-btn" type="button" disabled={busy || restoring} onClick={() => load(true)}>刷新资料与体验</button>
          <button className="atlas-btn" type="button" disabled={busy || restoring || !loaded} onClick={() => void restoreSavedPlan()}>{restoring ? "正在恢复…" : "恢复已保存计划条件"}</button>
          <Link className="xr-textlink" href="/report/initial">回看 R1</Link>
          <Link className="xr-textlink" href="/experience">重做职业体验</Link>
        </div>
      </header>

      {message && <p className="xr-feedback" role="status">{message}</p>}

      {setup !== "none" && <section id="plan-conditions" className="atlas-sheet xr-sec xr-setup" data-atlas-reveal>
        <div className="xr-sec-head"><h2><IconWarning aria-hidden="true" />这一步还排不了</h2><span className="xr-sec-tag">需要先完成第 1–3 步</span></div>
        <p className="xr-body-text">
          这一页不收集新资料，只读三样已经保存的东西：个人画像、官方兴趣结果、一次完整的职业体验。
          {setup === "guest" ? "当前浏览器没有登录会话（画像、兴趣、体验三个接口都返回 401），所以这里一份也读不到。" : "这个账号下还没有保存个人画像，所以这里没有可排的条件。"}
          与其给一个填了也出不来结果的表单，不如先把入口摆在这里。
        </p>
        <ol className="xr-setup-steps xr-stack">
          <li>
            <span className="xr-setup-step">第 1 步</span>
            <div><h4><IconAccount aria-hidden="true" /><Link href="/profile">保存个人画像</Link></h4><p>课程、技能、研究项目、论文写进去，后面的能力迁移与知识缺口才有东西可比。</p></div>
          </li>
          <li>
            <span className="xr-setup-step">第 2 步</span>
            <div><h4><IconQuiz aria-hidden="true" /><Link href="/assessment">做 O*NET 兴趣问卷</Link></h4><p>30 道活动题，做完才有官方的六类兴趣原始分。</p></div>
          </li>
          <li>
            <span className="xr-setup-step">第 3 步</span>
            <div><h4><IconCompass aria-hidden="true" /><Link href="/experience">完成一次职业体验</Link></h4><p>三阶段模拟任务，做完并保存成果，计划里才有体验依据。</p></div>
          </li>
        </ol>
        <p className="xr-source">三步都保存好之后，回到这一页刷新，条件表单与规则预览会出现在原处。中途也可以先去看 R1 的四栏结论。</p>
        <div className="xr-actions">
          <Link className="atlas-btn atlas-btn-primary" href="/profile"><IconPlay aria-hidden="true" />从第 1 步开始</Link>
          <Link className="atlas-btn" href="/report/initial"><IconBook aria-hidden="true" />先看初步评价</Link>
          <Link className="xr-textlink" href="/explore"><IconExternal aria-hidden="true" />翻方向手册</Link>
        </div>
        <p className="xr-note atlas-hand xr-stack"><IconStamp aria-hidden="true" />先有一份记录，才谈得上排计划。顺序反过来只会得到一张好看的空白表。</p>
      </section>}

      {setup === "none" && <div id="plan-conditions" className="xr-cond-layout xr-stack">
        <section className="atlas-sheet xr-sec" data-atlas-reveal>
          <div className="xr-sec-head"><h2><IconStamp aria-hidden="true" />登记这次规划的条件</h2><span className="xr-sec-tag">R2 的输入</span></div>
          <p className="xr-body-text">先在下面定三件事：去试哪个方向、打算哪一年转、每周真正能拿出来多少小时。三项填齐，下面才会按它们排出阶段计划。</p>
          <div className="xr-cond-grid">
            <div className="xr-field-block">
              <h4>选一个方向去试</h4>
              <label className="xr-label">目标方向<select className="field" value={direction} onChange={event => { setDirection(event.target.value); setAlternatives([]); setConditionsChanged(true); }}><option value="">选择目标方向</option>{directions.map(item => <option key={item.id} value={item.id}>{item.id === "medicine" ? "临床工作" : `${item.group_name} / ${item.name}`}</option>)}</select></label>
              {plan ? <>
                <p className="xr-source xr-stack">这个方向日常在做的事：{plan.direction.work_tasks.join("；")}。</p>
                <fieldset className="xr-fieldset"><legend>备选方向（最多两个）</legend>
                  <div className="xr-choices">{directions.filter(item => item.id !== direction).map(item => <label key={item.id}><input type="checkbox" checked={alternatives.includes(item.id)} disabled={!alternatives.includes(item.id) && alternatives.length >= 2} onChange={() => { setAlternatives(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id]); setConditionsChanged(true); }} />{item.name}</label>)}</div>
                </fieldset>
              </> : <p className="xr-source">先了解具体工作，再选择你的探索目标。<Link href="/explore">比较方向任务</Link>。留在临床工作也是一个正常选项，选它同样能出计划。</p>}
            </div>

            <div className="xr-field-block">
              <h4>时间与升学路径</h4>
              <div className="xr-field-row">
                <label className="xr-label">计划转型年份<input className="field" type="number" min={currentYear} max={2100} value={profile.transition_year ?? ""} aria-invalid={invalidYear} aria-describedby={invalidYear ? "planning-year-error" : undefined} onChange={event => changePlanning("transition_year", event.target.value ? Number(event.target.value) : null)} />{invalidYear && <span className="xr-error" id="planning-year-error">填写 {currentYear} 至 2100 之间的整数年份。</span>}</label>
                <label className="xr-label">每周可投入小时<input className="field" type="number" min={0.5} max={168} step="0.5" value={profile.weekly_hours ?? ""} aria-invalid={invalidHours} aria-describedby={invalidHours ? "planning-hours-error" : undefined} onChange={event => changePlanning("weekly_hours", event.target.value ? Number(event.target.value) : null)} />{invalidHours && <span className="xr-error" id="planning-hours-error">每周投入需大于零，且不超过168小时。</span>}</label>
                <label className="xr-label">升学路径<select className="field" value={profile.pathway} onChange={event => changePlanning("pathway", event.target.value as Profile["pathway"])}>{["未决定", "统考", "推免", "申请制"].map(pathway => <option key={pathway}>{pathway}</option>)}</select></label>
              </div>
              <p className="xr-hint">{profile.pathway === "统考" ? "逐项核验目标专业的考试科目、跨专业资格和复试要求，不默认所有方向都考408。" : profile.pathway === "推免" ? "分别核实本校推免资格与目标项目的当年接收规则、材料和时间。" : profile.pathway === "申请制" ? "核验项目的学历、语言、材料与截止时间；导师联系以项目要求或本人目的为准。" : "先比较资格与准备要求，再确定升学路径。"}</p>
            </div>

            <div className="xr-field-block">
              <h4>每周时间分配</h4>
              <fieldset className="xr-fieldset"><legend>基础、实践与复盘的小时预算</legend>
                <div className="xr-field-row">{budgetLabels.map(([id, label]) => <label className="xr-label" key={id}>{label}<span className="xr-inline-unit"><input className="field" type="number" min={0} max={168} step="0.5" value={budget[id]} onChange={event => { const value = Number(event.target.value); setBudget(current => ({ ...current, [id]: Number.isFinite(value) ? Math.max(0, Math.min(168, value)) : 0 })); setConditionsChanged(true); }} /><span>小时</span></span></label>)}</div>
              </fieldset>
              <p className={budgetTotal > (profile.weekly_hours ?? 0) && profile.weekly_hours !== null ? "xr-error" : "xr-hint"} role="status">已分配 {budgetTotal} 小时 / 可用 {profile.weekly_hours ?? "未填写"} 小时。{!budgetValid && "分配总量需大于零且不超过可用时间。"}</p>
            </div>
          </div>
          {plan && <div className="xr-actions"><a className="xr-textlink" href="#plan-results">看下面的规则预览</a></div>}
        </section>

        <aside className="atlas-sheet xr-aside" data-atlas-reveal>
          <h2><IconAccount aria-hidden="true" />当前条件</h2>
          <div className="xr-aside-target" key={direction}>
            {direction && <DirectionArt direction={direction} compact />}
            <div><b>目标方向</b><strong>{plan?.direction.name ?? "尚未选择"}</strong></div>
          </div>
          <dl className="atlas-kv xr-kv-tight xr-stack">
            <div key={`year-${profile.transition_year}`}><dt>目标年份</dt><dd>{profile.transition_year ?? "尚未填写"}</dd></div>
            <div key={`hours-${profile.weekly_hours}`}><dt>每周投入</dt><dd>{profile.weekly_hours === null ? "尚未填写" : `${profile.weekly_hours} 小时`}</dd></div>
            <div key={profile.pathway}><dt>升学路径</dt><dd>{profile.pathway === "未决定" ? "尚未决定" : profile.pathway}</dd></div>
          </dl>
          <div className="xr-stack"><BudgetLedger budget={budget} hours={profile.weekly_hours} /></div>
          {alternatives.length > 0 && <p className="xr-source">备选：{alternatives.map(id => findDirection(id)?.name).join("、")}</p>}
          {direction && <StorysetAttribution />}
        </aside>
      </div>}

      {plan && <div id="plan-results" className="xr-stack">
        <header className="atlas-sheet xr-sec" data-atlas-reveal>
          <div className="xr-sec-head"><h2><IconFolder aria-hidden="true" />{plan.direction.name} · 规则预览</h2><span className="xr-sec-tag">规则整理 · AI 未生成</span></div>
          <p className="xr-body-text">{profile.transition_year === null ? "年份待填写" : `${profile.transition_year} 年`} · {profile.weekly_hours === null ? "周投入待填写" : `每周 ${profile.weekly_hours} 小时`} · {profile.pathway}。下面是按这三项条件算出来的任务结构，任务顺序由依赖关系决定，不代表进度承诺。</p>
          <div className="xr-actions">
            <a className="atlas-btn" href="#plan-conditions">修改条件</a>
            <button className="atlas-btn atlas-btn-primary" type="button" disabled={!ready} onClick={exportDraft}>导出行动计划</button>
          </div>
          {conditionsChanged && <p className="xr-source" role="status">条件已修改。下方规则预览已按新条件重算；已保存的 AI 规划需重新读取核对或重新生成。</p>}
        </header>

        <div className="xr-layout">
          <ReportIndex items={resultSections} />
          <div className="xr-body">

            <section id="plan-basis" className="atlas-sheet xr-sec" data-atlas-reveal>
              <div className="xr-sec-head"><h2><IconPulse aria-hidden="true" />兴趣与体验依据</h2><span className="xr-sec-tag">兴趣来自问卷 · 体验来自第 3 步</span></div>
              <div className="atlas-cols-2">
                <div>
                  <h3>职业活动兴趣</h3>
                  {plan.interest ? <>
                    <InterestRadar scores={plan.interest.scores} />
                    <p className="xr-source">O*NET Mini-IP · {plan.interest.onet_version}。<Link href="/report/initial#initial-interest">官方结果与职业来源</Link></p>
                  </> : <div className="xr-empty"><p>尚无官方兴趣结果，这一栏不推断兴趣。</p><div className="xr-actions"><Link className="atlas-btn" href="/assessment">开始问卷</Link></div></div>}
                </div>
                <div>
                  <h3>职业体验</h3>
                  {experience ? <>
                    <ExperienceCard experience={experience} />
                    <dl className="atlas-kv xr-kv-tight xr-stack">
                      <div><dt>最想继续</dt><dd>{experience.reflection.favorite_operation}</dd></div>
                      <div><dt>最不喜欢</dt><dd>{experience.reflection.least_favorite_operation}</dd></div>
                      <div><dt>愿再投入 3 小时</dt><dd>{experience.reflection.willingness_for_3_hours} / 5</dd></div>
                    </dl>
                    {"outputs" in experience && <details className="xr-details">
                      <summary>三阶段体验成果</summary>
                      <ol className="xr-src-list">{experience.outputs.map((output, index) => <li key={index}><h4>{experiencePresentation(experience).stage_names[index]}</h4><p className="xr-record-body">{output}</p></li>)}</ol>
                    </details>}
                    <p className="xr-source">模拟职业体验 · {new Date(experience.completed_at).toLocaleDateString("zh-CN")}</p>
                  </> : <div className="xr-empty"><p>尚无已保存的体验成果。规划里的体验依据先空着。</p><div className="xr-actions"><Link className="atlas-btn" href="/experience">完成一次职业体验</Link></div></div>}
                </div>
              </div>
              <p className="xr-source xr-stack">{plan.experience_relevance}</p>
            </section>

            <section id="plan-gaps" className="atlas-sheet xr-sec" data-atlas-reveal>
              <div className="xr-sec-head"><h2><IconBook aria-hidden="true" />已有积累与知识缺口</h2><span className="xr-sec-tag">对照方向手册 · 未核验</span></div>
              <p className="xr-body-text">缺口只说明要补基础、补哪一块，不说明要学多久，也不说明你学不会。记录名称相关不等于已经掌握；没查到记录不等于零能力。</p>
              <ol className="xr-records">
                {plan.gaps.map(gap => <li className="xr-record" key={gap.skill}>
                  <div className="xr-record-head"><h3>{gap.skill}</h3><span className="atlas-chip" data-tone={gap.status.includes("已自述") ? "ok" : "gap"}>{gap.status}</span></div>
                  <p className="xr-record-body">{gap.note}</p>
                  <details>
                    <summary>这条结论的依据</summary>
                    {gap.evidence_refs.length ? gap.evidence_refs.map(ref => <p className="xr-source" key={ref}>{evidence.find(item => item.ref === ref)?.evidence ?? "对应经历待核验"}</p>) : <p className="xr-source">尚未找到对应的个人经历。<Link href="/profile/basics">补充课程与项目记录</Link>。</p>}
                    <p className="xr-source">要求来源：<Link href={`/explore?direction=${direction}`}>{plan.direction.name}方向手册</Link>。</p>
                  </details>
                </li>)}
              </ol>
            </section>

            <section id="plan-budget" className="atlas-sheet xr-sec" data-atlas-reveal>
              <div className="xr-sec-head"><h2><IconCalendar aria-hidden="true" />周投入安排</h2><span className="xr-sec-tag">按可用时间切三份</span></div>
              <BudgetLedger budget={budget} hours={profile.weekly_hours} />
              <p className={budgetValid ? "xr-source" : "xr-error"}>{budgetValid ? `每周可用 ${profile.weekly_hours} 小时，已安排 ${budgetTotal} 小时。用实际练习耗时调整下一周预算。` : "时间分配尚未满足条件，请返回修改每周投入与预算。"}</p>
            </section>

            <section id="plan-stages" className="atlas-sheet xr-sec" data-atlas-reveal>
              <div className="xr-sec-head"><h2><IconCompass aria-hidden="true" />阶段计划</h2><span className="xr-sec-tag">按通行节奏排 · 日期每年核实</span></div>
              {plan.planning ? <>
                <p className="xr-body-text">{plan.planning.horizon}</p>
                <p className="xr-body-text">下面的顺序——核验资格、补先修、基础、强化、真题与报名、冲刺、初试之后——是培训机构和考生群体长期形成的节奏，不是官方规定。跨考的人通常要在补先修和基础两段多花时间，后面几段相应往后挪。</p>
                <div className="xr-position">
                  <p className="xr-position-main">{plan.planning.position.note}</p>
                  <p className="xr-position-sub">距{plan.planning.position.key_moment}：{plan.planning.position.months >= 0 ? `还有 ${plan.planning.position.months} 个月` : `已过去 ${Math.abs(plan.planning.position.months)} 个月`}{plan.planning.position.current_stage ? ` · 当前阶段：${plan.planning.position.current_stage}` : ""}</p>
                </div>

                <ul className="xr-stage-index">{plan.planning.stages.map((stage, index) => <li key={stage.id}><a href={`#plan-stage-${index}`}>{stage.name}</a></li>)}</ul>

                <div className="xr-timeline" data-atlas-reveal>
                  {plan.planning.stages.map((stage, index) => <section id={`plan-stage-${index}`} className="xr-stage" data-state={stage.state} key={stage.id}>
                    <svg className="xr-stage-ink atlas-draw" viewBox="0 0 12 100" preserveAspectRatio="none" aria-hidden="true"><line x1="6" y1="0" x2="6" y2="100" style={{ "--len": 130 } as CSSProperties} /></svg>
                    <span className="xr-stage-node" aria-hidden="true" />
                    <div className="xr-stage-head">
                      <h3>{stage.name}</h3>
                      <span className="xr-stage-window">{stage.window}</span>
                      <span className="atlas-chip" data-tone={stage.basis === "官方" ? "ok" : undefined}>{stage.basis === "官方" ? "官方节点" : "通行惯例"}</span>
                      {stage.state === "current" && <span className="atlas-chip" data-tone="ok">你现在在这里</span>}
                      {stage.state === "past" && <span className="atlas-chip" data-tone="gap">已过</span>}
                    </div>
                    <p className="xr-stage-goal">{stage.goal}</p>
                    <p className="xr-stage-exit"><b>这一段的判据</b>{stage.exit}</p>
                    {stage.verify && <p className="xr-stage-verify">每年要重新核对：{stage.verify}</p>}
                    <ul className="xr-tasks">{stage.task_ids.map(id => plan.tasks.find(task => task.id === id)).filter(task => task !== undefined).map(task => <li className="xr-task" key={task.id}>
                      <div className="xr-task-head"><h4>{task.title}</h4><span className="atlas-chip">{task.priority}</span></div>
                      <p>{task.why}</p>
                      <dl className="atlas-kv xr-kv-tight">
                        <div><dt>成果</dt><dd>{task.deliverable}</dd></div>
                        <div><dt>前置</dt><dd>{task.dependencies.length ? task.dependencies.map(id => taskLabels.get(id) ?? "待核验任务").join("、") : "无"}</dd></div>
                        <div><dt>工作量</dt><dd>未知（来源：{taskSourceLabel(task.source)}）</dd></div>
                      </dl>
                    </li>)}</ul>
                  </section>)}
                </div>

                <div className="xr-actions xr-stack">
                  <a className="atlas-btn" href="#plan-conditions">修改条件</a>
                  <a className="xr-textlink" href="#plan-review">看复盘怎么排</a>
                </div>
              </> : <p className="xr-empty">填写有效目标年份、每周投入并选择升学路径后，这里会出现阶段安排。<a href="#plan-conditions">返回规划条件</a>。</p>}
            </section>

            <section id="plan-review" className="atlas-sheet xr-sec" data-atlas-reveal>
              <div className="xr-sec-head"><h2><IconCopy aria-hidden="true" />复盘与年度核对</h2><span className="xr-sec-tag">计划怎么活下来</span></div>
              <p className="xr-body-text">计划推不下去，通常不是目标选错了，而是估时不准，并且只顾着往里加任务、从不往外删。下面按周、月、阶段末三个频率，各给一组要回答的问题。</p>
              <p className="xr-body-text">{exitRule}</p>
              <div className="xr-cadence">
                {reviewCadence.map(item => <div className="xr-cadence-item" key={item.when}>
                  <span className="xr-cadence-when">{item.when}</span>
                  <span className="xr-cadence-minutes">{item.minutes} 分钟</span>
                  <p>{item.what}</p>
                </div>)}
              </div>
              <h3 className="xr-stack">周复盘只回答这六个问题</h3>
              <ol className="xr-records">
                {reviewQuestions.map((question, index) => <li className="xr-record" key={question}>
                  <div className="xr-record-head"><h3>问题 {index + 1}</h3></div>
                  <p className="xr-record-body">{question}</p>
                </li>)}
              </ol>
              <h3 className="xr-stack">每年必须重新核对的东西</h3>
              <p className="xr-body-text">这些内容每年都会变，写进计划就会过时，所以这里只列要查什么，不写具体日期。</p>
              <ul className="xr-gaps">{yearlyVerifyNotes.map(note => <li key={note}>{note}</li>)}</ul>
              <p className="xr-source">报名、确认、初试、国家线、调剂开放时间，以研招网与教育部当年的公告为准；加试办法由招生单位自主确定，查招生章程。</p>
            </section>

            <section id="plan-admissions" className="atlas-sheet xr-sec" data-atlas-reveal>
              <div className="xr-sec-head"><h2><IconExternal aria-hidden="true" />升学核验与备选</h2><span className="xr-sec-tag">招生条目：没查到</span></div>
              <p className="xr-body-text">还没有已核验的招生条目，所以这一栏只给要查什么，不给结论。阶段计划里「定位与资格核验」那几条也是同一件事——那边是待办，这里是要填的表。每条都拿官方原文核一遍，核过的写上日期。</p>
              <dl className="xr-check">{[["学校与项目", "核实院校、项目名称、专业代码与招生方式。"], ["目标年份", "核实招生年份、报名和考核时间，记录发布日期。"], ["报考条件", "核实跨专业资格、考试科目、语言与复试要求。"], ["官方来源", "保存项目官方 URL、原文与本次核验日期。"]].map(([title, content]) => <div key={title}><dt>{title}</dt><dd>{content}</dd></div>)}</dl>
              <h3 className="xr-stack">已知风险</h3>
              <ul className="xr-gaps">{plan.risks.map(risk => <li key={risk}>{risk}</li>)}</ul>
              {alternatives.length > 0 && <div className="xr-table-scroll"><table className="xr-table"><caption>目标与备选方向的工作差异</caption><thead><tr><th scope="col">方向</th><th scope="col">典型工作</th><th scope="col">准备线索</th></tr></thead><tbody>{[direction, ...alternatives].map(id => { const item = findDirection(id)!; return <tr key={id}><th scope="row"><Link href={`/explore?direction=${id}`}>{item.name}</Link></th><td>{item.work_tasks.join("；")}</td><td>{item.skills.join("、")}</td></tr>; })}</tbody></table></div>}
              <details className="xr-details"><summary>方向映射来源</summary><p className="xr-source">职业关联由 LIMEN 编辑，不是 O*NET 官方中国考研专业结论。</p><ul className="xr-src-list">{plan.direction.onet.map(item => <li key={item.code}><a href={occupationUrl(item.code)} target="_blank" rel="noreferrer">{item.name} · {item.code}</a></li>)}</ul></details>
              <p className="xr-note atlas-hand xr-stack">如果最后决定留在临床，这份计划里通用的一半（统计、复盘、把事说清楚）照样成立。</p>
            </section>

            <section id="plan-explanation" className="atlas-sheet xr-sec" data-atlas-reveal>
              <div className="xr-sec-head"><h2><IconDownload aria-hidden="true" />解释与导出</h2><span className="xr-sec-tag">规则预览与 AI 解读分开</span></div>
              <p className="xr-body-text">规则预览和 AI 解读是两件事：预览不联网就能看；AI 解读要单独生成，需要已保存的画像、官方兴趣、职业体验，以及上面这组有效条件。</p>
              <div className="xr-ai"><AiReport key={JSON.stringify([direction, alternatives, profile.transition_year, profile.weekly_hours, profile.pathway, budget, loaded, simulation])} kind="R2" direction={findDirection(direction)?.id} alternatives={alternatives} enabled={ready && !simulation && !!assessment} planning={{ transition_year: profile.transition_year, weekly_hours: profile.weekly_hours, pathway: profile.pathway, weekly_allocation: budget }} /></div>
              <div className="xr-actions xr-stack">
                <button className="atlas-btn" type="button" disabled={!ready} onClick={exportDraft}>导出行动计划</button>
                <Link className="xr-textlink" href="/profile">补充与保存画像</Link>
                <Link className="xr-textlink" href="/experience">返回职业体验</Link>
              </div>
            </section>

          </div>
        </div>
      </div>}

      <footer className="xr-foot">
        <p>依据：本人画像（自填，未核验）、LIMEN 方向手册的编辑性映射、第 3 步的模拟职业体验、{plan?.interest ? "O*NET Mini-IP 官方兴趣结果" : "（尚无官方兴趣结果）"}。招生条目为空，全部待核验；升学任务是核验清单，不是院校官方要求。</p>
        <p>工作量与所需时长一律写未知：没有经验证的时长数据，就不编一个数字给你。</p>
        <p>{simulation ? "当前是合成演示档案（simulation），不是你的真实记录。" : "本页条件与预算来自你的填写；规划内容为规则整理，AI 解读需单独生成。"}</p>
        <p className="atlas-hand">把下周能坐下来的那几个小时先在日历上锁死，比在心里把未来推演三遍管用。</p>
      </footer>
    </div>
  </main>;
}

