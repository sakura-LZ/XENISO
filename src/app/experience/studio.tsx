"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { z } from "zod";
import { AvatarPanel, type MentorLinkState } from "@/components/avatar-panel";
import {
  IconChat,
  IconCompass,
  IconCopy,
  IconDownload,
  IconFolder,
  IconPin,
  IconPulse,
  IconQuiz,
  IconQuote,
  IconStamp,
  IconWarning,
} from "@/components/icons";
import { presenterForExperience } from "@/lib/avatar-presenters";
import { directions, findDirection, groups } from "@/lib/directions";
import { experienceSchema, workbenchExperienceSchema, reflectionSchema, evaluationCard, experiencePresentation, type Experience, type WorkbenchExperience } from "@/lib/experience";
import { experienceTemplates, getTemplate, stageTitles, medicineDisciplines, medicineNamingSource, type Mode } from "@/lib/experience/templates";
import { choiceSchema } from "@/lib/experience/scenario";
import { type ChoiceState, validChoice, operationResult } from "@/lib/experience/operations";
import { download } from "@/lib/download";
import { TaskWorkbench, OperationPreview } from "./task-workbench";
import { TaskMaterial, TaskModePreview } from "./task-material";
import "./experience-desk.css";

import { InkField } from "@/components/ink-field";
const draftKey = "limen:career-draft:v3";
const emptyReflection = { favorite_operation: "", least_favorite_operation: "", willingness_for_3_hours: 3, followup_question: "" };
const draftSchema = z.object({ template_id: z.string(), mode: z.enum(["project", "interview"]), step: z.number().int().min(0).max(3), choices: choiceSchema, outputs: z.tuple([z.string().max(3000), z.string().max(3000), z.string().max(3000)]), reflection: z.object({ favorite_operation: z.string().max(240), least_favorite_operation: z.string().max(240), willingness_for_3_hours: z.number().int().min(1).max(5), followup_question: z.string().max(1000) }) }).strict().superRefine((draft, ctx) => {
  const template = experienceTemplates.find(item => item.id === draft.template_id);
  if (!template || draft.choices.some((value, i) => value !== null && !validChoice(draft.template_id, i, value)) || draft.outputs.some((value, i) => i < draft.step && (value.trim().length < 10 || draft.choices[i] === null))) ctx.addIssue({ code: "custom", message: "草稿不完整或版本不符。" });
});
const mentorLinkLabels: Record<MentorLinkState, string> = { idle: "未接通", connecting: "接通中", connected: "已接通", closed: "断开" };

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
  const [mentorLink, setMentorLink] = useState<MentorLinkState>("idle");
  const [message, setMessage] = useState("");
  const [stepNote, setStepNote] = useState("");
  const busyRef = useRef(false);
  const contentRevision = useRef(0);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const template = getTemplate(direction, templateId);
  const titles = stageTitles(template, mode);
  const templates = experienceTemplates.filter(item => item.direction === direction).sort((a, b) => direction === "medicine" ? medicineDisciplines.findIndex(item => item.template_id === a.id) - medicineDisciplines.findIndex(item => item.template_id === b.id) : 0);
  const handsOff = useCallback((next: MentorLinkState) => setMentorLink(next), []);

  useEffect(() => { if (started) stageHeading.current?.focus(); }, [started, step]);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      await Promise.resolve();
      if (controller.signal.aborted) return;
      try { setHasDraft(draftSchema.safeParse(JSON.parse(localStorage.getItem(draftKey) ?? "null")).success); setLegacyDraft(!!localStorage.getItem("limen:career-draft:v2")); } catch { /* 本机存储可能被禁用。 */ }
      // 先确认这台浏览器已经有私有会话，再去读成果；访客不建匿名身份，也不会打出 401。
      try {
        const session = await fetch("/api/session", { signal: controller.signal });
        if (!session.ok) return;
        const identity = await session.json();
        if (!identity.user) return;
        const response = await fetch("/api/experience", { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (!controller.signal.aborted) setHasSaved(experienceSchema.safeParse(data.experience).success);
      } catch { /* 第一次来的用户还没有保存过成果。 */ }
    })();
    return () => controller.abort();
  }, []);

  function invalidate() { contentRevision.current++; setSaved(null); setMessage(""); }
  function edit(value: string) {
    invalidate();
    // 改前面的内容会让后面的提交失效，但保留文字，方便回看。
    setOutputs(previous => previous.map((text, i) => i === step ? value : text) as typeof outputs);
    setChoices(previous => previous.map((value, i) => i > step ? null : value) as ChoiceState);
  }
  function choose(value: string) { invalidate(); setChoices(previous => previous.map((old, i) => i === step ? value : i > step ? null : old) as ChoiceState); }
  function reset() { if (busyRef.current) return; invalidate(); setStarted(false); setStep(0); setChoices([null, null, null]); setOutputs(["", "", ""]); setReflection(emptyReflection); setTranscript([]); setRecord(false); setStepNote(""); }
  // 提交一步时先亮一句"这步已提交"，再翻到下一页；回退时清掉，免得留下过期提示。
  function goStep(next: number) {
    setStepNote(next > step ? `第 ${step + 1} 步已提交 · 可以继续，也能回改` : "");
    setStep(next);
  }
  function pause() { if (busyRef.current) return; try { localStorage.setItem(draftKey, JSON.stringify({ template_id: templateId, mode, step, choices, outputs, reflection })); setHasDraft(true); setMessage("已存到这台机器，刷新后可以接着做。共用电脑用完记得清掉暂存。"); } catch { setMessage("本机存不下，先导出当前记录。"); } }
  function restore() {
    if (busyRef.current) return;
    try { const draft = draftSchema.parse(JSON.parse(localStorage.getItem(draftKey) ?? "null")); const found = experienceTemplates.find(item => item.id === draft.template_id)!; invalidate(); setDirection(found.direction); setTemplateId(found.id); setMode(draft.mode); setChoices(draft.choices); setOutputs(draft.outputs); setReflection(draft.reflection); setStep(draft.step); setStarted(true); setTranscript([]); setRecord(false); setMessage("已恢复同一个任务和本机进度；和导师的对话不在暂存里。"); } catch { setMessage("暂存内容对不上当前模板，先把旧记录导出去。"); }
  }
  async function loadSaved() {
    if (busyRef.current) return; busyRef.current = true; setBusy(true);
    try { const response = await fetch("/api/experience"); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "读取失败。"); const value = experienceSchema.parse(data.experience); invalidate(); setSaved(value); setHasSaved(true);
      if (value.scenario_id === "direction_workbench") { setDirection(value.direction_id); setTemplateId(value.template_id); setMode(value.mode); setChoices(value.choices); setOutputs(value.outputs); setReflection(value.reflection); setStarted(true); setStep(3); setTranscript(value.transcript); setRecord(value.transcript.length > 0); }
      setMessage("已读回私有成果；旧版本保留当时的职业和阶段名称。");
    } catch (error) { setMessage(error instanceof Error && error.name !== "ZodError" ? error.message : "没有可以读取的有效成果。"); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function payload(): WorkbenchExperience { return workbenchExperienceSchema.parse({ version: "3.0", simulation: true, scenario_id: "direction_workbench", template_id: templateId, template_version: "e1-1", source: "curated_template", direction_id: direction, role: template.role, mode, choices, outputs, reflection, completed_at: new Date().toISOString(), transcript: record ? transcript : [] }); }
  async function finish() {
    if (busyRef.current) return; busyRef.current = true; setBusy(true); setSaved(null); const revision = contentRevision.current;
    try { const value = payload(); const login = await fetch("/api/session", { method: "POST" }); if (!login.ok) throw new Error("无法建立私有会话，请稍后重试。"); const response = await fetch("/api/experience", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) }); const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "私有保存失败，请先导出成果。"); setHasSaved(true); if (contentRevision.current === revision) { setSaved(value); setMessage("成果已私有保存，可以进入行动规划。"); try { localStorage.removeItem(draftKey); setHasDraft(false); } catch { /* 云端已经存好。 */ } } else { setMessage("已保存提交时的成果；之后新收到的话还没保存，请再存一次。"); }
    } catch (error) { setMessage(error instanceof Error && error.name !== "ZodError" ? error.message : "请完成三次操作、具体记录和复盘。"); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function exportNotes(format: "json" | "md") {
    const complete = workbenchExperienceSchema.safeParse({ version: "3.0", simulation: true, scenario_id: "direction_workbench", template_id: templateId, template_version: "e1-1", source: "curated_template", direction_id: direction, role: template.role, mode, choices, outputs, reflection, completed_at: new Date().toISOString(), transcript: record ? transcript : [] });
    const outcome = complete.success ? evaluationCard(complete.data) : { simulation: true, template_id: templateId, source: "curated_template", choices, outputs, reflection, status: "in_progress" };
    const status = complete.success ? saved?.scenario_id === "direction_workbench" ? "已私有保存" : "本机成果，尚未私有保存" : "进行中";
    const markdown = `# ${template.deliverable}\n\nsimulation · LIMEN 编辑性教学模板 · ${status}\n\n职业：${template.role}\n\n${template.brief}\n\n${titles.map((title, i) => `## ${title}\n\n${outputs[i] || "未提交"}`).join("\n\n")}\n\n## 操作与成果\n\n\`\`\`json\n${JSON.stringify(outcome, null, 2)}\n\`\`\`\n\n教学记录，不代表专业能力、报考或执业资格。`;
    download(`limen-${templateId}.${format}`, format === "json" ? JSON.stringify({ ...outcome, save_status: status }, null, 2) : markdown);
    setMessage(`已发起 ${format === "json" ? "JSON" : "Markdown"} 下载。`);
  }
  const savedView = saved ? experiencePresentation(saved) : null;
  const completeResult = step === 3 && choices.every(value => value !== null) ? operationResult(template.id, choices, 2) : null;
  const lit = mentorLink === "connected";

  const stages = <ol className="xd-stage" aria-label="体验步骤" data-motion="M-E05">
    {[...titles, "复盘与成果"].map((title, i) => <li key={`${i}:${title}`}>
      <button type="button" className="xd-stage-btn" data-state={i < step ? "done" : i === step ? "current" : "todo"} aria-current={i === step ? "step" : undefined} disabled={i > step} onClick={() => goStep(i)}>
        <span className="xd-stage-no">第 {i + 1} 步</span>
        <span className="xd-stage-label">
          {i < step && <span className="xd-stage-tick" aria-hidden="true">✓</span>}
          {title}
          {i < step && <span className="xd-stage-mark">已提交</span>}
        </span>
      </button>
    </li>)}
  </ol>;

  // 导师面板只挂一次：目录态就在，进入任务后沿用同一个连接，不重复初始化。
  const mentor = <aside className="xd-mentor">
    <AvatarPanel
      presenter={presenterForExperience(direction, templateId)}
      role={`${template.role}${started ? mode === "project" ? "（项目导师）" : "（面试官）" : "（带教老师）"}`}
      onConnectionChange={handsOff}
      onTranscript={entry => { if (record) { setTranscript(previous => [...previous.slice(-59), entry]); invalidate(); } }}
      context={started
        ? `simulation编辑性教学场景：${template.brief}\n当前步骤：${titles[Math.min(step, 2)]}。${template.stages[Math.min(step, 2)].question}。不提供诊疗建议，不评定用户能力。`
        : `simulation编辑性教学场景：用户还在挑任务，方向是${direction === "medicine" ? "继续医学" : findDirection(direction)?.name}，可选任务有${templates.map(item => item.title).join("、")}。不提供诊疗建议，不评定用户能力。`}
    />
    <div className="atlas-sheet xd-mentor-note">
      <p>{started
        ? "接通后导师只知道你在看哪个方向、做到哪一步；你写的理由不会自动发过去，想让它看就贴进对话。"
        : "没开始也能先问。接通后导师只知道你在看哪个方向，选了任务就换成本步的问题。"}</p>
      <ul>
        <li>首次接通要加载数字人资源，通常十几秒。</li>
        <li>可以打字，也可以按住话筒说话；回复能随时打断。</li>
        <li>对话默认不保存，勾选下面这项才随成果存档。</li>
      </ul>
      <label className="xd-consent">
        <input type="checkbox" checked={record} onChange={e => { invalidate(); setRecord(e.target.checked); if (!e.target.checked) setTranscript([]); }} />
        <span>把这次对话随成果一起私有保存</span>
      </label>
    </div>
  </aside>;

  const ink = <div className="xd-ink" aria-hidden="true" data-atlas-in={lit ? "1" : undefined}>
    <svg className="atlas-draw" viewBox="0 0 158 46" style={{ "--len": 214 } as CSSProperties}>
      <path d="M152 32C132 8 116 40 94 22S58 6 30 24" fill="none" style={{ stroke: "var(--green)" }} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="152" cy="32" r="2.6" style={{ fill: "var(--ochre)" }} />
      <circle cx="6" cy="26" r="2.6" style={{ fill: "var(--green)" }} />
    </svg>
  </div>;

  return <main id="main" className="xd-page"><div className="container"><fieldset disabled={busy} className="contents">
    <header className="xd-head" data-motion="M-E01">
      <InkField className="page-ink" band />
      <div>
        <p className="atlas-label">第 3 步 · 职业体验</p>
        <h1>{started ? template.title : "职业体验"}</h1>
        <p className="xd-lede">{started
          ? `${template.role} · ${mode === "project" ? "按项目做" : "按面试做"}。${template.brief}`
          : "挑个方向，在合成材料上做三次决定，做完留一张体验卡。"}</p>
      </div>
      <div className="xd-head-meta">
        <span className="atlas-chip">第 3 步 / 共 4 步</span>
        <span className="atlas-chip">约 25 分钟</span>
        <span className="atlas-chip" data-tone={lit ? "ok" : undefined}>导师 · {mentorLinkLabels[mentorLink]}</span>
        <span className="simulation-tag">simulation · 合成材料</span>
      </div>
    </header>

    {message && <p className="xd-flash" role="status">{message}</p>}

    <div className="xd-desk" data-lit={lit ? "1" : "0"}>
      <div className="xd-lamp" aria-hidden="true" />
      {ink}
      {!started ? <>
      <aside className="xd-rail">
        <p className="xd-rail-label">
          <IconCompass aria-hidden="true" />
          先从哪一类看
        </p>
        <ul className="xd-dir" data-atlas-reveal data-atlas-stagger>
          {groups.map(group => <li key={group.id}>
            <p className="xd-dir-group">{group.name}</p>
            {directions.filter(item => item.group_id === group.id).map(item => <button key={item.id} type="button" className="xd-dir-btn" aria-pressed={direction === item.id} onClick={() => { invalidate(); setDirection(item.id); setTemplateId(getTemplate(item.id).id); if (mentorLink !== "idle") setMessage("换了方向，导师也换成这个方向的那位，需要重新接通一次。"); }}>{item.id === "medicine" ? "继续医学（留在临床）" : item.name}</button>)}
          </li>)}
        </ul>
      </aside>

      <section className="xd-main" aria-label="可选择的体验任务" data-motion="M-E02">
        <div className="xd-main-head" data-atlas-reveal>
          <h2>可做的任务</h2>
          <p className="xd-question">不打分，不用编经历。</p>
        </div>
        {/* data-atlas-stagger 让任务卡逐张摆上来。带 key={direction}，换方向时整个
            容器重挂，所以"换一个方向"这个动作本身会重播一次入场——这正是
            /experience 最该有反馈的地方（原来是 0 个 reveal 宿主、整页 1 个动画元素）。 */}
        <div className="xd-tasks" key={direction} data-atlas-reveal data-atlas-stagger>
          {direction === "medicine" && <p className="xd-sheet-note">学科名称看招生目录，不等同医院科室；报考条件按目标院校当年目录核验。{medicineNamingSource.url && <a href={medicineNamingSource.url} target="_blank" rel="noreferrer" style={{ marginLeft: 6 }}>学科名称来源</a>}</p>}
          {templates.map(item => <article className="atlas-sheet xd-task" key={item.id} data-selected={templateId === item.id}>
            <button type="button" className="xd-task-btn" aria-expanded={templateId === item.id} aria-controls={`task-${item.id}`} onClick={() => { invalidate(); setTemplateId(item.id); }}>
              <span>
                <span className="xd-task-role">{medicineDisciplines.find(d => d.template_id === item.id)?.name ?? item.role}</span>
                <span className="xd-task-title">{item.title}</span>
                <span className="xd-task-brief">{item.brief}</span>
              </span>
              <span className="xd-task-mark" aria-hidden="true">{templateId === item.id ? "−" : "+"}</span>
            </button>
            {templateId === item.id && <div id={`task-${item.id}`} className="xd-task-body swap-in">
              {/* 补一级 h3：否则 h2「可做的任务」直接跳到卡内 h4，标题层级断档。 */}
              <h3 className="xd-modes-head">选一种做法开始</h3>
              <div className="xd-modes" data-atlas-reveal data-atlas-stagger>
                {(["project", "interview"] as const).map(value => <section className="xd-mode" key={value}>
                  <h4>
                    {value === "project" ? <IconFolder aria-hidden="true" /> : <IconChat aria-hidden="true" />}
                    {value === "project" ? "按项目做" : "按面试做"}
                  </h4>
                  <TaskModePreview template={item} mode={value} />
                  <p>{value === "project" ? "看材料、做三次决定、每步写理由，最后拿到成果卡。" : "先选证据再解释取舍，第三步会来一条新约束。"}</p>
                  <button type="button" className="atlas-btn atlas-btn-primary" onClick={() => { invalidate(); setMode(value); setStarted(true); setSaved(null); setStep(0); setMessage(""); }}>{value === "project" ? "用项目方式开始" : "用面试方式开始"}</button>
                </section>)}
              </div>
              <p className="xd-handbook"><Link href={`/explore?direction=${direction}`}>先看{direction === "medicine" ? "继续医学" : findDirection(direction)?.name}的手册</Link></p>
            </div>}
          </article>)}
        </div>

        {/* 「这一步会留下什么」与「开始之前」原先说的是同一件事，合并成一段。 */}
        <section className="atlas-sheet xd-tight xd-leaves" aria-label="做完会留下什么">
          <div className="xd-leaves-head">
            <h3>做完会留下什么</h3>
            <p className="xd-sheet-note">能不能考上不预测，方向也不给排名。</p>
          </div>
          <div className="xd-leaves-grid" data-atlas-reveal data-atlas-stagger>
            <div className="xd-leaf">
              <p className="xd-leaf-no"><IconCopy aria-hidden="true" />记录</p>
              <p className="xd-leaf-line">三步的选择与理由，每步至少 10 个字。</p>
            </div>
            <div className="xd-leaf">
              <p className="xd-leaf-no"><IconQuiz aria-hidden="true" />复盘</p>
              <p className="xd-leaf-line">四个问题：想继续做、不想再碰、下次验证、再投三小时。</p>
            </div>
            <div className="xd-leaf">
              <p className="xd-leaf-no"><IconStamp aria-hidden="true" />成果</p>
              <p className="xd-leaf-line">一张可导出 JSON 或 Markdown 的成果卡。</p>
            </div>
          </div>
          <p className="xd-before-note">
            <IconWarning aria-hidden="true" />
            材料是合成的，不能当临床依据或岗位绩效。留在临床也是正经选项。
          </p>
          {(hasDraft || hasSaved || legacyDraft) && <div className="xd-resume">
            {hasDraft && <button type="button" className="atlas-btn" onClick={restore}>接着做本机暂存</button>}
            {hasSaved && <button type="button" className="atlas-btn" onClick={() => void loadSaved()}>读回已保存成果</button>}
            {legacyDraft && <button type="button" className="atlas-btn" onClick={() => { try { download("limen-legacy-draft-v2.json", localStorage.getItem("limen:career-draft:v2") ?? "{}"); } catch { setMessage("旧暂存读不出来。"); } }}>导出旧版暂存</button>}
          </div>}
        </section>
      </section>
      </> : step < 3 ? <>
      <aside className="xd-rail">
        <p className="xd-rail-label">做到第 {step + 1} 步</p>
        {stages}
        {stepNote && <p className="xd-step-done" role="status" key={stepNote}>
          <IconStamp aria-hidden="true" />
          {stepNote}
        </p>}
        <div className="xd-rail-foot">
          <span className="atlas-chip">{mode === "project" ? "项目模式" : "面试模式"}</span>
          <button type="button" className="atlas-btn" onClick={pause}>暂存到本机</button>
          <button type="button" className="atlas-btn" onClick={reset}>换一个任务</button>
        </div>
      </aside>

      <section className="xd-main" aria-label={mode === "project" ? "项目工作区" : "面试案例与回答"}>
        <div className="xd-main-head">
          <h2 ref={stageHeading} tabIndex={-1}>{titles[step]}</h2>
          <p className="xd-question">{template.stages[step].question}</p>
          {mode === "interview" && <p className="xd-hint">{["先选一种处理方式，并说明你有哪些相关经历，或者哪些内容还没接触过。", "结合上一步的选择解释这次取舍，不用假装已经有专业工作经历。", "新约束：团队要知道方案的未知项。请改一版选择，并留一个具体反问。"][step]}</p>}
        </div>
        <div key={`material-${step}`} className="swap-in">
          <TaskMaterial template={template} choices={choices} />
        </div>
        <TaskWorkbench template={template} choices={choices} step={step} onChange={choose} />
        <section className="atlas-sheet xd-tight">
          {step > 0 && <details className="xd-records" style={{ marginBottom: 14 }}>
            <summary>上一步写下的记录</summary>
            <p>{outputs[step - 1]}</p>
          </details>}
          <div className="xd-reason-head">
            <h3><IconQuote aria-hidden="true" />{mode === "project" ? "你为什么这样选" : "回答、依据和反问"}</h3>
            <p className="xd-sheet-note">至少 10 个字才能进下一步</p>
          </div>
          <label className="sr-only" htmlFor="xd-reason">{mode === "project" ? "操作理由" : "回答与反问"}</label>
          <textarea id="xd-reason" className="xd-reason-field" rows={5} maxLength={3000} value={outputs[step]} onChange={e => edit(e.target.value)} placeholder={mode === "project" ? "写清你依据哪一条材料、放弃了什么。比如：我先把 A 组单独筛了一遍，误报都落在夜间低幅段，所以我宁可多报一点。" : "说明你的依据，也留一个具体的问题给面试官。"} />
          <div className="xd-reason-foot">
            <p>{outputs[step].trim().length} / 3000 字 · 写具体一点，后面复盘要用到这句</p>
            <div className="xd-actions">
              <button type="button" className="atlas-btn" disabled={step === 0} onClick={() => goStep(step - 1)}>上一步</button>
              <button type="button" className="atlas-btn atlas-btn-primary" disabled={choices[step] === null || outputs[step].trim().length < 10} onClick={() => goStep(step + 1)}>{step === 2 ? "完成操作，进入复盘" : "提交本步，继续"}</button>
            </div>
          </div>
        </section>
      </section>
      </> : <>
      <aside className="xd-rail">
        <p className="xd-rail-label">第 4 步 / 共 4 步</p>
        {stages}
        {stepNote && <p className="xd-step-done" role="status" key={stepNote}>
          <IconStamp aria-hidden="true" />
          {stepNote}
        </p>}
        <div className="xd-rail-foot">
          <span className="atlas-chip">可以导出</span>
          <button type="button" className="atlas-btn" onClick={() => exportNotes("json")}><IconDownload aria-hidden="true" />导出 JSON</button>
          <button type="button" className="atlas-btn" onClick={() => exportNotes("md")}><IconDownload aria-hidden="true" />导出 Markdown</button>
        </div>
      </aside>

      <section className="xd-main xd-outcome" aria-label="成果与复盘">
        <div className="xd-main-head">
          <h2 ref={stageHeading} tabIndex={-1}>{template.deliverable}</h2>
          <p className="xd-question">下面三步的选择和结果。看一遍，回答四个复盘问题，再保存或导出。</p>
        </div>

        <section className="atlas-sheet xd-tight" data-motion="M-E12">
          <div className="xd-sheet-head">
            <h3><IconPin aria-hidden="true" />本次选择</h3>
            <p className="xd-sheet-note">simulation · 只记录选择，不评能力</p>
          </div>
          <div className="atlas-kv">
            {template.stages.map((stageItem, i) => <div key={stageItem.title}>
              <dt>{stageItem.title}</dt>
              <dd>{stageItem.options.find(option => option.value === choices[i])?.label ?? "未选择"}</dd>
            </div>)}
          </div>
          {completeResult && <OperationPreview result={completeResult} />}
        </section>

        <section className="atlas-sheet xd-tight">
          <div className="xd-sheet-head"><h3><IconCopy aria-hidden="true" />三步记录</h3><p className="xd-sheet-note">保存前还能回去改</p></div>
          <ol className="xd-records">
            {titles.map((title, i) => <li key={title}>
              <details open={i === 0}>
                <summary>{i + 1}. {title}</summary>
                <p>{outputs[i]}</p>
              </details>
            </li>)}
          </ol>
        </section>

        <section className="atlas-sheet xd-tight" data-motion="M-E13">
          <div className="xd-sheet-head"><h3><IconPulse aria-hidden="true" />回头看这次体验</h3><p className="xd-sheet-note">这四项会一起存进成果，第 4 步要用</p></div>
          <div className="xd-reflection">
            {([["favorite_operation", "哪部分你最想继续做"], ["least_favorite_operation", "哪部分你最不想再碰"], ["followup_question", "下一次想验证什么"]] as const).map(([key, label]) => <label key={key} className="form-label">{label}
              <textarea className="field" rows={2} maxLength={key === "followup_question" ? 1000 : 240} value={reflection[key]} onChange={e => { invalidate(); setReflection(previous => ({ ...previous, [key]: e.target.value })); }} />
            </label>)}
            <label className="form-label">再让你投入 3 小时，你愿意吗
              <select className="field" value={reflection.willingness_for_3_hours} onChange={e => { invalidate(); setReflection(previous => ({ ...previous, willingness_for_3_hours: Number(e.target.value) })); }}>{["完全不想", "不太想", "还不确定", "比较愿意", "很愿意"].map((label, i) => <option key={label} value={i + 1}>{label}</option>)}</select>
            </label>
          </div>
          <p className="xd-hint">私有保存会替换你上一次保存的体验成果。旧的要留，就先导出。</p>
          <div className="xd-actions" style={{ marginTop: 14 }}>
            <button type="button" className="atlas-btn" onClick={() => goStep(2)}>返回修改</button>
            <button type="button" className="atlas-btn atlas-btn-primary" disabled={!reflectionSchema.safeParse(reflection).success} onClick={() => void finish()}>{busy ? "保存中…" : "保存成果与复盘"}</button>
          </div>
        </section>

        <article className="xd-card" aria-label="可以带走的成果卡">
          <h3>{template.deliverable}</h3>
          <p className="xd-card-role">{template.role} · {direction === "medicine" ? "继续医学" : findDirection(direction)?.name}</p>
          <dl className="atlas-kv">
            <div><dt>方向</dt><dd>{direction === "medicine" ? "继续医学（留在临床）" : findDirection(direction)?.name}</dd></div>
            <div><dt>任务</dt><dd>{template.title}</dd></div>
            <div><dt>方式</dt><dd>{mode === "project" ? "项目" : "面试"}</dd></div>
            {template.stages.map((stageItem, i) => <div key={stageItem.title}><dt>第 {i + 1} 步</dt><dd>{stageItem.options.find(option => option.value === choices[i])?.label ?? "未选择"}</dd></div>)}
            <div><dt>日期</dt><dd>{saved?.completed_at ? saved.completed_at.slice(0, 10) : "尚未保存"}</dd></div>
          </dl>
          <p className="xd-card-foot">教学记录，不代表专业能力、报考条件或执业资格。数据为合成，不能当临床依据。</p>
          <div className="xd-card-seal"><span className="atlas-stamp ochre">simulation</span><span>合成数据 · 教学记录</span></div>
        </article>

        <div className="xd-export">
          <button type="button" className="atlas-btn" onClick={() => exportNotes("json")}>导出 JSON</button>
          <button type="button" className="atlas-btn" onClick={() => exportNotes("md")}>导出 Markdown</button>
          {hasDraft && <button type="button" className="atlas-btn" onClick={() => { try { localStorage.removeItem(draftKey); setHasDraft(false); setMessage("本机暂存已清掉。"); } catch { setMessage("本机暂存清不掉。"); } }}>清掉本机暂存</button>}
          <Link className="atlas-btn atlas-btn-primary" href={`/report/plan?direction=${direction}`}>带着成果去做行动规划</Link>
        </div>
      </section>
      </>}

      {mentor}
    </div>

    {saved && savedView && <section className="atlas-sheet xd-saved" data-motion="M-E14">
      <p className="xd-sheet-note">已私有保存</p>
      <h3>{savedView.role} · {savedView.deliverable}</h3>
      {saved.scenario_id !== "direction_workbench" && "outputs" in saved && <ol>
        {saved.outputs.map((output, i) => <li key={i}><h3>{savedView.stage_names[i]}</h3><p>{output}</p></li>)}
      </ol>}
      <div className="xd-actions" style={{ marginTop: 16 }}>
        <button type="button" className="atlas-btn" onClick={() => { download("limen-saved-outcome.json", JSON.stringify(evaluationCard(saved), null, 2)); setMessage("已发起已保存成果下载。"); }}>导出已保存成果</button>
        <Link className="atlas-btn atlas-btn-primary" href={`/report/plan?direction=${"direction_id" in saved ? saved.direction_id : "ml_cv"}`}>制定行动规划</Link>
      </div>
    </section>}
  </fieldset></div></main>;
}
