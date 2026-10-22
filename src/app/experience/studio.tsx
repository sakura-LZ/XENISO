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
import { type ChoiceState, validChoice } from "@/lib/experience/operations";
import { download } from "@/lib/download";
import { TaskWorkbench } from "./task-workbench";

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
  const [hasSaved, setHasSaved] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [legacyDraft, setLegacyDraft] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const contentRevision = useRef(0);
  const [message, setMessage] = useState("");
  const template = getTemplate(direction, templateId);
  const titles = stageTitles(template, mode);
  const templates = experienceTemplates.filter(item => item.direction === direction).sort((a, b) => direction === "medicine" ? medicineDisciplines.findIndex(item => item.template_id === a.id) - medicineDisciplines.findIndex(item => item.template_id === b.id) : 0);
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
  }
  const savedView = saved ? experiencePresentation(saved) : null;
  return <main id="main" className="shell py-10"><fieldset disabled={busy} className="contents"><p className="eyebrow">职业体验 · 基础模板</p><h1 className="mt-2 text-3xl font-semibold">做一次具体工作，再认识一个方向</h1><p className="mt-3 leading-7 muted">跨学科探索，也可以继续医学。先操作、看变化，再留下自己的解释。</p>
    {!started ? <section className="experience-entry mt-8"><div><p className="eyebrow">{findDirection(direction)?.name}</p><h2 className="mt-3 text-2xl font-semibold">{template.title}</h2><p className="mt-4 leading-7">{template.brief}</p><p className="mt-4 text-sm muted">导师身份：{template.role}{mode === "interview" ? " · 面试官" : " · 项目导师"}</p><p className="mt-3 text-xs leading-6 muted">simulation · LIMEN 编辑性教学模板。可直接体验，无需连接数字人。</p><Link href={`/explore?direction=${direction}`} className="mt-5 inline-block">查阅方向手册 →</Link></div><div><label className="form-label">探索方向<select className="field" value={direction} onChange={e => { const id = e.target.value; invalidate(); setDirection(id); setTemplateId(getTemplate(id).id); }}>{directions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="form-label mt-5">{direction === "medicine" ? "临床医学学科" : "职业场景"}<select className="field" value={templateId} onChange={e => { invalidate(); setTemplateId(e.target.value); }}>{templates.map(item => <option key={item.id} value={item.id}>{medicineDisciplines.find(d => d.template_id === item.id)?.name ?? item.role}</option>)}</select></label>{direction === "medicine" && <p className="mt-2 text-xs leading-6 muted">按研究生招生常用学科名称组织。学科与医院具体科室并非一一对应；学硕、专硕及具体代码按目标院校当年目录核验。<a href={medicineNamingSource.url} target="_blank" rel="noreferrer">名称参考</a></p>}<fieldset className="mt-6"><legend className="font-medium">体验方式</legend><div className="mode-options mt-3">{([['project', '模拟项目', '作出操作 → 检查结果 → 交付成果'], ['interview', '模拟面试', '证据选择 → 案例决策 → 修订与反问']] as const).map(([id, label, brief]) => <label key={id} className="mode-option"><input type="radio" name="experience-mode" checked={mode === id} onChange={() => { invalidate(); setMode(id); }} /><span><strong>{label}</strong><small>{brief}</small></span></label>)}</div></fieldset><button className="button mt-6" onClick={() => { setStarted(true); setSaved(null); setMessage(""); }}>开始体验 →</button><div className="mt-4 flex flex-wrap gap-4 text-sm">{hasDraft && <button onClick={restore}>继续本机进度</button>}{hasSaved && <button onClick={() => void loadSaved()}>读取已保存成果</button>}</div>{legacyDraft && <button className="mt-4 text-xs" onClick={() => { try { download("limen-legacy-draft-v2.json", localStorage.getItem("limen:career-draft:v2") ?? "{}"); } catch { setMessage("旧暂存读取失败。"); } }}>导出旧版产品经理暂存</button>}</div></section> : <>
      <div className="mt-7 flex flex-wrap justify-between gap-3 border-y py-4"><div><strong>{medicineDisciplines.find(item => item.template_id === templateId)?.name ?? template.role} · {mode === "project" ? "模拟项目" : "模拟面试"}</strong><p className="mt-1 text-xs muted">simulation · {template.deliverable} · 基础模板</p></div><button className="button secondary" onClick={reset}>重新选择</button></div>
      <div className="career-layout mt-7"><aside><AvatarPanel key={`${templateId}:${mode}`} presenter={presenterForExperience(direction, templateId)} role={`${template.role}${mode === "project" ? "（项目导师）" : "（面试官）"}`} onTranscript={entry => { if (record) { setTranscript(previous => [...previous.slice(-59), entry]); invalidate(); } }} context={`simulation编辑性教学场景：${template.brief}\n当前步骤：${titles[Math.min(step, 2)]}。${template.stages[Math.min(step, 2)].question}。不提供诊疗建议，不评定用户能力。`} /><p className="mt-3 text-xs leading-6 muted">点击连接后，角色和当前任务发给星云。个人画像、操作与回答不会自动发送。</p><label className="mt-3 flex items-start gap-2 text-xs leading-6"><input type="checkbox" checked={record} onChange={e => { invalidate(); setRecord(e.target.checked); if (!e.target.checked) setTranscript([]); }} />将本次文字对话随成果私有保存</label></aside><section className="form-sheet"><ol className="task-steps" aria-label="体验步骤">{[...titles, "复盘与成果"].map((title, i) => <li key={`${i}:${title}`} aria-current={step === i ? "step" : undefined}><span>{i + 1}</span>{title}</li>)}</ol>
      {step < 3 ? <><p className="eyebrow mt-8">任务 {step + 1} / 3</p><h2 className="mt-2 text-2xl font-semibold">{titles[step]}</h2><p className="mt-4 text-sm leading-7 muted">{template.brief}</p>{mode === "interview" && <p className="notice mt-4 text-sm leading-7">{["先选择一种处理方式，并说明你有哪些相关经历或哪些内容尚不了解。", "结合上一阶段的选择解释当前取舍，不必假装已有专业工作经历。", "新约束：团队需要知道方案的未知项。请修订选择，并留下一个具体反问。"][step]}</p>}{step > 0 && <details className="mt-4"><summary>上一阶段的记录</summary><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{outputs[step - 1]}</p></details>}<TaskWorkbench template={template} choices={choices} step={step} onChange={choose} /><label className="form-label mt-6">{mode === "project" ? "操作理由与待核对事项" : "回答、证据与反问"}<textarea className="field" rows={5} maxLength={3000} value={outputs[step]} onChange={e => edit(e.target.value)} placeholder="根据实际操作结果，说明选择理由、发现的问题与仍需核对的事项。" /></label><p className="mt-2 text-xs muted">{outputs[step].trim().length} / 3000 字 · 至少10字，记录具体理由</p><div className="form-actions"><button className="button secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>上一步</button><button className="button" disabled={choices[step] === null || outputs[step].trim().length < 10} onClick={() => setStep(step + 1)}>{step === 2 ? "完成操作，开始复盘" : "提交本步，继续 →"}</button></div></> : <><h2 className="mt-7 text-2xl font-semibold">哪部分工作让你想继续？</h2><div className="mt-5 space-y-5">{([['favorite_operation', '最想继续做的部分'], ['least_favorite_operation', '最不喜欢的部分'], ['followup_question', '下一次想验证的问题']] as const).map(([key, label]) => <label key={key} className="form-label">{label}<textarea className="field" rows={2} maxLength={key === "followup_question" ? 1000 : 240} value={reflection[key]} onChange={e => { invalidate(); setReflection(previous => ({ ...previous, [key]: e.target.value })); }} /></label>)}<label className="form-label">你愿意再投入3小时吗？<select className="field" value={reflection.willingness_for_3_hours} onChange={e => { invalidate(); setReflection(previous => ({ ...previous, willingness_for_3_hours: Number(e.target.value) })); }}>{["完全不想", "不太想", "还不确定", "比较愿意", "很愿意"].map((label, i) => <option key={label} value={i + 1}>{label}</option>)}</select></label></div><p className="mt-4 text-xs leading-6 muted">私有保存使用已有体验接口，会替换当前访客上一次选用的体验成果；可先导出旧成果。多次体验历史将在后续数据库对接时接入。</p><div className="form-actions"><button className="button secondary" onClick={() => setStep(2)}>返回修改</button><button className="button" disabled={!reflectionSchema.safeParse(reflection).success} onClick={() => void finish()}>{busy ? "保存中…" : "保存成果与复盘"}</button></div></>}
      <div className="mt-5 flex flex-wrap gap-4 text-sm"><button onClick={pause}>暂停，保存到本机</button><button onClick={() => exportNotes("json")}>导出 JSON</button><button onClick={() => exportNotes("md")}>导出 Markdown</button>{hasDraft && <button onClick={() => { try { localStorage.removeItem(draftKey); setHasDraft(false); setMessage("本机暂存已清除。"); } catch { setMessage("本机暂存清除失败。"); } }}>清除本机暂存</button>}</div></section></div></>}
      {saved && savedView && <section className="mt-10 border-t pt-7"><p className="eyebrow">已保存成果</p><h2 className="mt-2 text-2xl font-semibold">{savedView.role} · {savedView.deliverable}</h2><p className="mt-3 text-sm muted">simulation · 仅反映本次活动与自述，不评定专业能力。</p>{"outputs" in saved && <ol className="mt-5 grid gap-6 md:grid-cols-3">{saved.outputs.map((output, i) => <li key={i}><h3 className="font-semibold">{savedView.stage_names[i]}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{output}</p></li>)}</ol>}<div className="mt-6 flex flex-wrap gap-3"><button className="button secondary" onClick={() => download("limen-saved-outcome.json", JSON.stringify(evaluationCard(saved), null, 2))}>导出已保存成果</button><Link className="button" href={`/report/plan?direction=${"direction_id" in saved ? saved.direction_id : "ml_cv"}`}>制定行动规划 →</Link></div></section>}
      {message && <p className="inline-feedback mt-6" role="status">{message}</p>}
    </fieldset></main>;
}
