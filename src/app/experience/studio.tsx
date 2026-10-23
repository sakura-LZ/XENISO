"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { AvatarPanel } from "@/components/avatar-panel";
import { presenterForExperience } from "@/lib/avatar-presenters";
import { directions, findDirection } from "@/lib/directions";
import { experienceSchema, workbenchExperienceSchema, reflectionSchema, evaluationCard, experiencePresentation, type Experience, type WorkbenchExperience } from "@/lib/experience";
import { experienceTemplates, getTemplate, stageTitles, medicineDisciplines, medicineNamingSource, type Mode } from "@/lib/experience/templates";
import { choiceSchema } from "@/lib/experience/scenario";
import { type ChoiceState, validChoice, operationResult } from "@/lib/experience/operations";
import { download } from "@/lib/download";
import { TaskWorkbench, OperationPreview } from "./task-workbench";
import { TaskMaterial, TaskModePreview } from "./task-material";
import { DirectionArt, StorysetAttribution } from "@/components/direction-art";
import "../experience-social-redesign.css";

const draftKey = "limen:career-draft:v3";
const emptyReflection = { favorite_operation: "", least_favorite_operation: "", willingness_for_3_hours: 3, followup_question: "" };
const draftSchema = z.object({ template_id: z.string(), mode: z.enum(["project", "interview"]), step: z.number().int().min(0).max(3), choices: choiceSchema, outputs: z.tuple([z.string().max(3000), z.string().max(3000), z.string().max(3000)]), reflection: z.object({ favorite_operation: z.string().max(240), least_favorite_operation: z.string().max(240), willingness_for_3_hours: z.number().int().min(1).max(5), followup_question: z.string().max(1000) }) }).strict().superRefine((draft, ctx) => {
  const template = experienceTemplates.find(item => item.id === draft.template_id);
  if (!template || draft.choices.some((value, i) => value !== null && !validChoice(draft.template_id, i, value)) || draft.outputs.some((value, i) => i < draft.step && (value.trim().length < 10 || draft.choices[i] === null))) ctx.addIssue({ code: "custom", message: "草稿不完整或版本不符。" });
});
export function CareerStudio({ initialDirection }: { initialDirection: string }) {
  const [direction, setDirection] = useState(findDirection(initialDirection)?.id ?? directions[0].id);
  const [templateId, setTemplateId] = useState(getTemplate(findDirection(initialDirection)?.id ?? directions[0].id).id);
  const [mode, setMode] = useState<Mode>("project");
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [choices, setChoices] = useState<ChoiceState>([null, null, null]);
  const [outputs, setOutputs] = useState<[string, string, string]>(["", "", ""]);
  const [reflection, setReflection] = useState(emptyReflection);
  const [saved, setSaved] = useState<Experience | null>(null);
  const [transcript, setTranscript] = useState<WorkbenchExperience["transcript"]>([]);
  const [record, setRecord] = useState(false);
  const [mentorExpanded, setMentorExpanded] = useState(true);
  const [hasSaved, setHasSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [legacyDraft, setLegacyDraft] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const contentRevision = useRef(0);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const [message, setMessage] = useState("");
  const template = getTemplate(direction, templateId);
  const titles = stageTitles(template, mode);
  const templates = experienceTemplates.filter(item => item.direction === direction).sort((a, b) => direction === "medicine" ? medicineDisciplines.findIndex(item => item.template_id === a.id) - medicineDisciplines.findIndex(item => item.template_id === b.id) : 0);
  useEffect(() => { if (started) stageHeading.current?.focus(); }, [started, step]);
  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 1279px)");
    const update = () => setMentorExpanded(!narrow.matches);
    const timer = setTimeout(update, 0);
    narrow.addEventListener("change", update);
    return () => { clearTimeout(timer); narrow.removeEventListener("change", update); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      try { setHasDraft(draftSchema.safeParse(JSON.parse(localStorage.getItem(draftKey) ?? "null")).success); setLegacyDraft(!!localStorage.getItem("limen:career-draft:v2")); } catch { /* Local storage can be unavailable. */ }
      try { const response = await fetch("/api/experience", { signal: controller.signal }); if (!response.ok) return; const data = await response.json(); if (!controller.signal.aborted) setHasSaved(experienceSchema.safeParse(data.experience).success); } catch { /* New visitors may have no saved outcome. */ }
    })();
    return () => controller.abort();
  }, []);
  function invalidate() { contentRevision.current++; setSaved(null); setMessage(""); }
  function edit(value: string) {
    invalidate();
    // Earlier edits invalidate later submissions; preserve their text for review.
    setOutputs(previous => previous.map((text, i) => i === step ? value : text) as typeof outputs);
    setChoices(previous => previous.map((value, i) => i > step ? null : value) as ChoiceState);
  }
  function choose(value: string) { invalidate(); setChoices(previous => previous.map((old, i) => i === step ? value : i > step ? null : old) as ChoiceState); }
  function reset() { if (busyRef.current) return; invalidate(); setStarted(false); setStep(0); setChoices([null, null, null]); setOutputs(["", "", ""]); setReflection(emptyReflection); setTranscript([]); setRecord(false); }
  function pause() { if (busyRef.current) return; try { localStorage.setItem(draftKey, JSON.stringify({ template_id: templateId, mode, step, choices, outputs, reflection })); setHasDraft(true); setMessage("已保存到本机，刷新后可继续。共享设备使用后请清除暂存。"); } catch { setMessage("本机保存失败，请导出当前记录。"); } }
  function restore() {
    if (busyRef.current) return;
    try { const draft = draftSchema.parse(JSON.parse(localStorage.getItem(draftKey) ?? "null")); const found = experienceTemplates.find(item => item.id === draft.template_id)!; invalidate(); setDirection(found.direction); setTemplateId(found.id); setMode(draft.mode); setChoices(draft.choices); setOutputs(draft.outputs); setReflection(draft.reflection); setStep(draft.step); setStarted(true); setTranscript([]); setRecord(false); setMessage("已恢复同一基础案例和本机进度；对话不在本机暂存中。"); } catch { setMessage("暂存内容不符合当前模板，请先导出旧记录。"); }
  }
  async function loadSaved() {
    if (busyRef.current) return; busyRef.current = true; setBusy(true);
    try { const response = await fetch("/api/experience"); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "读取失败。"); const value = experienceSchema.parse(data.experience); invalidate(); setSaved(value); setHasSaved(true);
      if (value.scenario_id === "direction_workbench") { setDirection(value.direction_id); setTemplateId(value.template_id); setMode(value.mode); setChoices(value.choices); setOutputs(value.outputs); setReflection(value.reflection); setStarted(true); setStep(3); setTranscript(value.transcript); setRecord(value.transcript.length > 0); }
      setMessage("已读取私有成果；历史版本保留原职业和阶段说明。");
    } catch (error) { setMessage(error instanceof Error && error.name !== "ZodError" ? error.message : "没有可读取的有效成果。"); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function payload(): WorkbenchExperience { return workbenchExperienceSchema.parse({ version: "3.0", simulation: true, scenario_id: "direction_workbench", template_id: templateId, template_version: "e1-1", source: "curated_template", direction_id: direction, role: template.role, mode, choices, outputs, reflection, completed_at: new Date().toISOString(), transcript: record ? transcript : [] }); }
  async function finish() {
    if (busyRef.current) return; busyRef.current = true; setBusy(true); setSaved(null); const revision = contentRevision.current;
    try { const value = payload(); const login = await fetch("/api/session", { method: "POST" }); if (!login.ok) throw new Error("无法建立私有会话，请稍后重试。"); const response = await fetch("/api/experience", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) }); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "私有保存失败，请先导出成果。"); setHasSaved(true); if (contentRevision.current === revision) { setSaved(value); setMessage("成果已私有保存，可进入行动规划。"); try { localStorage.removeItem(draftKey); setHasDraft(false); } catch { /* Cloud save succeeded. */ } } else { setMessage("已保存提交时的成果；此后收到的新对话尚未保存，请再次保存。"); }
    } catch (error) { setMessage(error instanceof Error && error.name !== "ZodError" ? error.message : "请完成三次操作、具体记录和复盘。"); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function exportNotes(format: "json" | "md") {
    const complete = workbenchExperienceSchema.safeParse({ version: "3.0", simulation: true, scenario_id: "direction_workbench", template_id: templateId, template_version: "e1-1", source: "curated_template", direction_id: direction, role: template.role, mode, choices, outputs, reflection, completed_at: new Date().toISOString(), transcript: record ? transcript : [] });
    const outcome = complete.success ? evaluationCard(complete.data) : { simulation: true, template_id: templateId, source: "curated_template", choices, outputs, reflection, status: "in_progress" };
    const status = complete.success ? saved?.scenario_id === "direction_workbench" ? "已私有保存" : "本机成果，尚未私有保存" : "进行中";
    const markdown = `# ${template.deliverable}\n\nsimulation · LIMEN 编辑性基础模板 · ${status}\n\n职业：${template.role}\n\n${template.brief}\n\n${titles.map((title, i) => `## ${title}\n\n${outputs[i] || "未提交"}`).join("\n\n")}\n\n## 操作与成果\n\n\`\`\`json\n${JSON.stringify(outcome, null, 2)}\n\`\`\`\n\n教学记录，不代表专业能力、报考或执业资格。`;
    download(`limen-${templateId}.${format}`, format === "json" ? JSON.stringify({ ...outcome, save_status: status }, null, 2) : markdown);
    setMessage(`已发起 ${format === "json" ? "JSON" : "Markdown"} 下载。`);
  }
  const savedView = saved ? experiencePresentation(saved) : null;
  const completeResult = step === 3 && choices.every(value => value !== null) ? operationResult(template.id, choices, 2) : null;
  const stages = <ol className="experience-stages" aria-label="体验步骤" data-motion="M-E05">{[...titles, "复盘与成果"].map((title, i) => <li key={`${i}:${title}`} aria-current={step === i ? "step" : undefined}><span aria-hidden="true">{i < step ? "✓" : i + 1}</span><span>{title}</span></li>)}</ol>;
  const mentor = <aside className="experience-mentor" data-motion={mode === "project" ? "M-E08" : "M-E11"}>
    <details className="experience-mentor-disclosure" open={mentorExpanded} onToggle={event => setMentorExpanded(event.currentTarget.open)}><summary>{mode === "project" ? "项目导师与会话" : "面试官与会话"}</summary><div>
      <AvatarPanel key={`${templateId}:${mode}`} presenter={presenterForExperience(direction, templateId)} role={`${template.role}${mode === "project" ? "（项目导师）" : "（面试官）"}`} onTranscript={entry => { if (record) { setTranscript(previous => [...previous.slice(-59), entry]); invalidate(); } }} context={`simulation编辑性教学场景：${template.brief}\n当前步骤：${titles[Math.min(step, 2)]}。${template.stages[Math.min(step, 2)].question}。不提供诊疗建议，不评定用户能力。`} />
      <p className="task-source mt-4">点击连接后，角色和当前任务发给星云。个人画像、操作与回答不会自动发送。</p>
      <label className="experience-transcript-choice"><input type="checkbox" checked={record} onChange={e => { invalidate(); setRecord(e.target.checked); if (!e.target.checked) setTranscript([]); }} /><span>将本次文字对话随成果私有保存</span></label>
    </div></details>
  </aside>;
  return <main id="main" className={`shell xn-experience-page experience-redesign ${started ? `is-${mode}` : "is-catalog"}`}><fieldset disabled={busy} className="contents">
    <header className="experience-page-header" data-motion="M-E01" data-reveal><div><h1>{started ? template.title : "职业体验"}</h1>{started && <p>{template.role} · {mode === "project" ? "模拟项目" : "模拟面试"}</p>}</div>{started && <div className="experience-header-actions"><button className="button secondary" onClick={pause}>暂存进度</button><button className="button secondary" onClick={reset}>返回任务选择</button></div>}</header>
    {message && <p className="inline-feedback experience-status" role="status">{message}</p>}
    {!started ? <div className="experience-catalog">
      <aside className="experience-direction-nav"><h2>探索方向</h2><nav aria-label="体验方向">{directions.map(item => <button key={item.id} type="button" aria-pressed={direction === item.id} onClick={() => { invalidate(); setDirection(item.id); setTemplateId(getTemplate(item.id).id); }}>{item.id === "medicine" ? "临床工作" : item.name}</button>)}</nav><div className="experience-resume">{hasDraft && <button onClick={restore}>继续本机进度</button>}{hasSaved && <button onClick={() => void loadSaved()}>读取已保存成果</button>}{legacyDraft && <button onClick={() => { try { download("limen-legacy-draft-v2.json", localStorage.getItem("limen:career-draft:v2") ?? "{}"); } catch { setMessage("旧暂存读取失败。"); } }}>导出旧版暂存</button>}</div></aside>
      <section className="experience-task-list" key={direction} data-motion="M-E02" aria-label="可选择的体验任务">
        <p className="task-source">simulation · 编辑性教学模板与合成数据</p>
        {direction === "medicine" && <p className="experience-medicine-note">按研究生招生常用学科名称组织，学科与医院科室并非一一对应；具体代码与报考条件按目标院校当年目录核验。<a href={medicineNamingSource.url} target="_blank" rel="noreferrer">学科名称来源</a></p>}
        {templates.map(item => <article className={`experience-task-row ${templateId === item.id ? "is-selected" : ""}`} key={item.id}>
          <button type="button" className="experience-task-select" aria-expanded={templateId === item.id} aria-controls={`task-${item.id}`} onClick={() => { invalidate(); setTemplateId(item.id); }}><span className="experience-task-art"><DirectionArt direction={item.direction} compact /></span><span><span className="experience-task-role">{medicineDisciplines.find(d => d.template_id === item.id)?.name ?? item.role}</span><span className="experience-task-title">{item.title}</span><span className="experience-task-brief">{item.brief}</span></span><span aria-hidden="true" className="experience-task-toggle">{templateId === item.id ? "−" : "+"}</span></button>
          {templateId === item.id && <div id={`task-${item.id}`} className="experience-mode-options" key={item.id}>
            {(["project", "interview"] as const).map(value => <section className="experience-mode-option" key={value}><TaskModePreview template={item} mode={value} /><h3>{value === "project" ? "模拟项目" : "模拟面试"}</h3><p>{value === "project" ? item.id === "clinical_data" ? "检查数据，记录处理方案。" : `${item.stages[0].title}，逐步形成${item.deliverable}。` : item.id === "clinical_data" ? "说明数据处理的依据，并根据新约束修订方案。" : `围绕“${item.stages[0].question}”说明证据，修订方案。`}</p><button type="button" className="button" onClick={() => { invalidate(); setMode(value); setStarted(true); setSaved(null); setMessage(""); }}>{value === "project" ? "开始项目" : "开始面试"}</button></section>)}
            <Link href={`/explore?direction=${direction}`} className="experience-handbook-link">查阅{direction === "medicine" ? "临床工作" : findDirection(direction)?.name}手册 →</Link>
          </div>}
        </article>)}
        <StorysetAttribution />
      </section>
    </div> : step < 3 ? <>
      <p className="task-source experience-simulation">simulation · {template.brief}</p>
      <div className={`experience-workspace experience-workspace-${mode}`}>
        <nav className="experience-stage-nav" aria-label="当前任务阶段">{stages}</nav>
        <section className="experience-main-task" aria-label={mode === "project" ? "项目工作区" : "面试案例与回答"}>
          <h2 ref={stageHeading} tabIndex={-1} className="experience-stage-heading">{titles[step]}</h2>
          <TaskMaterial template={template} choices={choices} />
          {mentor}
          <div className="experience-current-question" key={step} data-motion={mode === "project" ? "M-E07" : "M-E09 M-E10"}>
            {mode === "interview" && <p className="experience-interview-context">{["先选择一种处理方式，并说明你有哪些相关经历或哪些内容尚不了解。", "结合上一阶段的选择解释当前取舍，不必假装已有专业工作经历。", "新约束：团队需要知道方案的未知项。请修订选择，并留下一个具体反问。"][step]}</p>}
            {step > 0 && <details className="experience-previous"><summary>上一阶段的记录</summary><p className="whitespace-pre-wrap">{outputs[step - 1]}</p></details>}
            <TaskWorkbench template={template} choices={choices} step={step} onChange={choose} />
            <label className="form-label experience-answer">{mode === "project" ? "操作理由与待核对事项" : "回答、证据与反问"}<textarea className="field" rows={5} maxLength={3000} value={outputs[step]} onChange={e => edit(e.target.value)} placeholder="根据实际操作结果，说明选择理由、发现的问题与仍需核对的事项。" /></label><p className="task-source">{outputs[step].trim().length} / 3000 字 · 至少10字，记录具体理由</p>
            <div className="form-actions"><button className="button secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>上一步</button><button className="button" disabled={choices[step] === null || outputs[step].trim().length < 10} onClick={() => setStep(step + 1)}>{step === 2 ? "完成操作，开始复盘" : "提交本步，继续 →"}</button></div>
          </div>
        </section>
      </div>
    </> : <section className="experience-outcome" aria-label="成果与复盘">
      <h2 ref={stageHeading} tabIndex={-1}>{template.deliverable}</h2><p className="task-source">simulation · 本次操作记录，不评定专业能力。</p>
      <div className="experience-outcome-summary" data-motion="M-E12"><div>{completeResult && <OperationPreview result={completeResult} />}</div><section><h3>本次选择</h3><dl>{template.stages.map((stage, i) => <div key={stage.title}><dt>{stage.title}</dt><dd>{stage.options.find(option => option.value === choices[i])?.label ?? "未选择"}</dd></div>)}</dl></section></div>
      <ol className="experience-outcome-records">{titles.map((title, i) => <li key={title} style={{ animationDelay: `${i * 80}ms` }}><details open={i === 0}><summary>{i + 1}. {title}</summary><p className="whitespace-pre-wrap">{outputs[i]}</p></details></li>)}</ol>
      <section className="experience-reflection" data-motion="M-E13"><h3>哪部分工作让你想继续？</h3><div>{([['favorite_operation', '最想继续做的部分'], ['least_favorite_operation', '最不喜欢的部分'], ['followup_question', '下一次想验证的问题']] as const).map(([key, label]) => <label key={key} className="form-label">{label}<textarea className="field" rows={2} maxLength={key === "followup_question" ? 1000 : 240} value={reflection[key]} onChange={e => { invalidate(); setReflection(previous => ({ ...previous, [key]: e.target.value })); }} /></label>)}<label className="form-label">你愿意再投入3小时吗？<select className="field" value={reflection.willingness_for_3_hours} onChange={e => { invalidate(); setReflection(previous => ({ ...previous, willingness_for_3_hours: Number(e.target.value) })); }}>{["完全不想", "不太想", "还不确定", "比较愿意", "很愿意"].map((label, i) => <option key={label} value={i + 1}>{label}</option>)}</select></label></div>
        <p className="experience-save-consequence">私有保存会替换当前身份上一次保存的体验成果。需要保留旧成果时，请先导出。</p><div className="form-actions"><button className="button secondary" onClick={() => setStep(2)}>返回修改</button><button className="button" disabled={!reflectionSchema.safeParse(reflection).success} onClick={() => void finish()}>{busy ? "保存中…" : "保存成果与复盘"}</button></div>
      </section>
    </section>}
    {started && <div className="experience-export-tools"><button onClick={pause}>暂停，保存到本机</button><button onClick={() => exportNotes("json")}>导出 JSON</button><button onClick={() => exportNotes("md")}>导出 Markdown</button>{hasDraft && <button onClick={() => { try { localStorage.removeItem(draftKey); setHasDraft(false); setMessage("本机暂存已清除。"); } catch { setMessage("本机暂存清除失败。"); } }}>清除本机暂存</button>}</div>}
    {saved && savedView && <section className="experience-saved" data-motion="M-E14"><p className="task-source">已私有保存</p><h2>{savedView.role} · {savedView.deliverable}</h2>{saved.scenario_id !== "direction_workbench" && "outputs" in saved && <ol className="experience-outcome-records">{saved.outputs.map((output, i) => <li key={i}><h3>{savedView.stage_names[i]}</h3><p className="whitespace-pre-wrap">{output}</p></li>)}</ol>}<div className="form-actions"><button className="button secondary" onClick={() => { download("limen-saved-outcome.json", JSON.stringify(evaluationCard(saved), null, 2)); setMessage("已发起已保存成果下载。"); }}>导出已保存成果</button><Link className="button" href={`/report/plan?direction=${"direction_id" in saved ? saved.direction_id : "ml_cv"}`}>制定行动规划 →</Link></div></section>}
  </fieldset></main>;
}
