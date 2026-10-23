"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { emptyProfile, educationStages, gradeOptions, profileMissing, profileSchema, simulationProfile, type Profile } from "@/lib/profile";
import { TranscriptPreview } from "@/components/transcript-preview";
import { IconAccount, IconBack, IconBook, IconCalendar, IconCompass, IconPulse, IconProfile, IconStamp } from "@/components/icons";
import { profileProgress, PROFILE_GATE } from "./completion";
import "./profile.css";

import { InkField } from "@/components/ink-field";
const steps = ["基本信息", "学业与英语", "科研与技能", "偏好与目标"];
const storageKey = "limen:simulation:profile:v1";
type StringKey = { [K in keyof Profile]: Profile[K] extends string ? K : never }[keyof Profile];
type ListKey = "research_fields" | "competitions" | "self_study" | "hobbies" | "work_preferences" | "career_priorities" | "interest_directions" | "target_cities";
type NumberKey = "gpa" | "gpa_scale" | "rank" | "cohort_size" | "transition_year" | "weekly_hours";
const levels = ["刚接触", "在指导下", "独立", "指导他人"];
/** 0–4 方格刻度：0 表示这一项还没填，1–4 对应原来的四档完成程度。 */
const levelOptions = [{ value: "", label: "未填" }, ...levels.map(level => ({ value: level, label: level }))];

export function ProfileForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  function restoreFocusAfterRemove(button: HTMLElement) {
    const row = button.closest<HTMLElement>(".repeat-item");
    const parent = row?.parentElement;
    if (!row || !parent) return;
    const rows = Array.from(parent.querySelectorAll<HTMLElement>(".repeat-item"));
    const index = rows.indexOf(row);
    requestAnimationFrame(() => {
      const remaining = parent.querySelectorAll<HTMLElement>(".repeat-item");
      const neighbor = remaining[Math.min(index, remaining.length - 1)];
      (neighbor?.querySelector<HTMLElement>("input, select, textarea, button") ?? parent.querySelector<HTMLElement>(".add-row"))?.focus();
    });
  }
  function goToStep(next: number) {
    setStep(next);
    document.getElementById(`profile-group-${next}`)?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0; const visible = [0, 1, 2, 3].filter(index => (document.getElementById(`profile-group-${index}`)?.getBoundingClientRect().top ?? Infinity) <= Math.min(280, window.innerHeight / 3)); setStep(visible.at(-1) ?? 0); };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", scroll, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", scroll); };
  }, []);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [step, setStep] = useState(0);
  const [simulation, setSimulation] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readFailed, setReadFailed] = useState(false);
  const [readRevision, setReadRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [tools, setTools] = useState(false);
  useEffect(() => {
    formRef.current?.querySelectorAll("textarea").forEach(field => { field.style.height = "auto"; field.style.height = `${field.scrollHeight}px`; });
  }, [profile]);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException("请求超时", "TimeoutError")), 30000);
    setTools(new URLSearchParams(window.location.search).get("tools") === "1");
    void (async () => {
      try {
        const r = await fetch("/api/profile", { cache: "no-store", signal: controller.signal });
        const data = await r.json();
        controller.signal.throwIfAborted();
        const applyQuestion = (value: Profile) => {
          try {
            const question = sessionStorage.getItem("xeniso:exploration-question");
            if (question) { sessionStorage.removeItem("xeniso:exploration-question"); setDirty(true); return { ...value, help_needed: [value.help_needed, question].filter(Boolean).join("\n").slice(0, 4000) }; }
          } catch { /* 会话存储不可用时忽略这一段 */ }
          return value;
        };
        if (r.status === 401) { setProfile(applyQuestion(emptyProfile)); return; }
        if (!r.ok) throw new Error(data.error?.message ?? "资料暂时无法读取。");
        if (!data || !("profile" in data)) throw new Error("资料返回不完整。");
        setProfile(applyQuestion(data.profile ? profileSchema.parse(data.profile) : emptyProfile));
      } catch (error) {
        if (!controller.signal.aborted || controller.signal.reason?.name === "TimeoutError") {
          setReadFailed(true);
          setMessage(controller.signal.aborted ? "资料读取超时。" : error instanceof Error && error.name !== "ZodError" ? error.message : "资料未通过校验。");
        }
      } finally { clearTimeout(timeout); if (!controller.signal.aborted || controller.signal.reason?.name === "TimeoutError") setLoading(false); }
    })();
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [readRevision]);

  const progress = profileProgress(profile);
  const [stampPulse, setStampPulse] = useState(0);
  const previousDone = useRef(progress.done);
  useEffect(() => {
    if (progress.done > previousDone.current) setStampPulse(pulse => pulse + 1);
    previousDone.current = progress.done;
  }, [progress.done]);

  function change<K extends keyof Profile>(key: K, value: Profile[K]) { setProfile(p => ({ ...p, [key]: value })); setDirty(true); setMessage(""); }
  function text(key: StringKey, label: string, placeholder = "", long = false, full = false) {
    return <label className={`form-label${full ? " xp-full" : ""}`} key={key}><span>{label}</span>{long ? <textarea className="field" rows={3} placeholder={placeholder} value={profile[key]} onChange={e => change(key, e.target.value as Profile[typeof key])} /> : <input className="field" placeholder={placeholder} value={profile[key]} onChange={e => change(key, e.target.value as Profile[typeof key])} />}</label>;
  }
  function number(key: NumberKey, label: string, placeholder = "") {
    return <label className="form-label" key={key}><span>{label}</span><input className="field" type="number" placeholder={placeholder} step={["rank", "cohort_size", "transition_year"].includes(key) ? "1" : "any"} min="0" value={profile[key] ?? ""} onChange={e => change(key, e.target.value === "" ? null : Number(e.target.value))} /></label>;
  }
  function list(key: ListKey, label: string, placeholder: string) {
    return <label className="form-label xp-full" key={key}><span>{label}</span><textarea className="field" rows={2} placeholder={placeholder} value={profile[key].join("\n")} onChange={e => change(key, e.target.value.split("\n"))} /></label>;
  }
  function select(label: string, value: string, options: readonly string[], onChange: (value: string) => void, full = false) {
    const compatible = value && !options.includes(value) ? [value, ...options] : options;
    return <label className={`form-label${full ? " xp-full" : ""}`}><span>{label}</span><select className="field" value={value} onChange={e => onChange(e.target.value)}><option value="">请选择</option>{compatible.map(o => <option key={o}>{o}</option>)}</select></label>;
  }
  /** 0–4 方格刻度：纸上的勾选格，一格一档。 */
  function levelScale(name: string, legend: string, value: string, onChange: (value: string) => void) {
    return <fieldset className="xp-scale" key={name}>
      <legend>{legend}</legend>
      <div className="xp-scale-row">
        {levelOptions.map((option, index) => <label className="xp-tick" key={option.value || "none"}>
          <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
          <span className="xp-tick-box"><span className="xp-tick-num">{index}</span><span className="xp-tick-name">{option.label}</span></span>
        </label>)}
      </div>
    </fieldset>;
  }
  async function save(advance = false) {
    if (readFailed || loading || busy) return;
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) { setMessage(parsed.error.issues[0].message); return; }
    if (advance) {
      const gate = profileProgress(parsed.data);
      if (!gate.complete) {
        setMessage(`还差 ${gate.remaining} 项：${gate.missing.slice(0, 4).join("、")}。`);
        return;
      }
    }
    if (advance && profileMissing(parsed.data).length) { goToStep(0); setMessage(`请补充${profileMissing(parsed.data).join("、")}。`); return; }
    setBusy(true); setMessage("");
    try {
      if (simulation) {
        localStorage.setItem(storageKey, JSON.stringify({ simulation: true, profile: parsed.data, saved_at: new Date().toISOString() }));
        setMessage("合成示例已保存。");
      } else {
        const session = await fetch("/api/session", { method: "POST" });
        if (!session.ok) { const data = await session.json(); throw new Error(data.error?.message ?? "连接失败，请重试。"); }
        const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
        const data = await response.json();
        if (!response.ok || data.saved !== true) throw new Error(data.error?.message ?? "未收到保存确认。");
        setMessage(advance ? "已保存，正在进入第 2 步。" : "已保存");
      }
      setDirty(false);
      if (advance && !simulation) router.push("/assessment");
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败。"); }
    finally { setBusy(false); }
  }
  const stage = profile.education_stage || (profile.grade.startsWith("研") ? "硕士研究生" : profile.grade.startsWith("博") ? "博士研究生" : profile.grade.startsWith("规培") ? "规培" : profile.grade === "已毕业" ? "已毕业" : "本科");
  const yearOptions = gradeOptions[stage] ?? gradeOptions["其他"];
  const degreeOptions = stage === "硕士研究生" ? ["学术硕士", "专业硕士", "其他"] : stage === "博士研究生" ? ["学术博士", "专业博士", "其他"] : stage === "规培" ? ["住院医师规范化培训", "专科医师规范化培训", "其他"] : stage === "本科" ? ["五年制", "八年制", "其他"] : ["其他"];
  const degreeValue = profile.degree_track_other ? "其他" : profile.degree_track;
  const english = profile.english ?? { description: "", cet4: "", cet6: "", other: "" };
  const remaining = progress.remaining;
  return <div className="container xp-narrow">
    <Link href="/profile" className="xp-crumb"><IconBack aria-hidden="true" />返回总览</Link>

    <header className="xp-head">
      <InkField className="page-ink" />
      <div className="enter">
        <h1><IconProfile aria-hidden="true" />填写个人画像</h1>
        <p className="xp-lede">
          四节共 20 项，只记录你已经有的东西，填进<b>能力底册</b>。
          没有的部分留空即可，空着不会扣分，也不会被当成零分能力。
        </p>
      </div>
      <aside className="xp-meter enter xp-meter-d1" aria-label="填写进度">
        <div className="xp-meter-row"><span>当前页</span><strong>第 1 步 / 共 4 步</strong></div>
        <div className="xp-meter-row"><span>完成度</span><strong>{progress.done} / {progress.total} 项</strong></div>
        <div className="xp-bar" role="img" aria-label={`已填写 ${progress.done} 项，共 ${progress.total} 项`}><i style={{ width: `${progress.done / progress.total * 100}%` }} /></div>
        <p className="xp-meter-foot">{remaining > 0 ? `还差 ${remaining} 项（填到 18 项即可）。` : `已够 ${PROFILE_GATE} 项。`}</p>
      </aside>
    </header>

    <div className="xp-layout">
      <aside className="xp-tabs" aria-label="画像四节导航">
        {steps.map((title, i) => {
          const section = progress.sections[i];
          const filled = section.checks.filter(check => check.filled).length;
          return <button key={title} type="button" className="xp-tab" aria-current={step === i ? "step" : undefined} disabled={busy || loading || readFailed} onClick={() => goToStep(i)}>
            <span className="xp-tab-no">{section.ordinal}</span>
            <span>{title}</span>
            <span className="xp-tab-count">{filled}/{section.checks.length}</span>
          </button>;
        })}
        <div className="xp-aside">
          <span className="xp-aside-big">{progress.done} / {progress.total}</span>
          每填完一项，左边的章会重新盖一次。
          <span key={stampPulse} className={`atlas-stamp ochre${stampPulse ? " xp-stamp-drop" : ""}`} aria-hidden="true">已填 {progress.done} 项</span>
        </div>
        <label className="xp-mobile-group form-label">当前分组
          <select className="field" value={step} onChange={event => goToStep(Number(event.target.value))}>{steps.map((title, index) => <option key={title} value={index}>{title}</option>)}</select>
        </label>
      </aside>

      <section className="xp-sheet atlas-sheet">
        <span className="atlas-tape tr" aria-hidden="true" />
        <div className="xp-sheet-status">
          <span>异域探索 · 第 1 步 · 第 1 / 4 页</span>
          <span role="status" className={dirty ? "xp-dirty" : undefined}>{loading ? "正在读取…" : dirty ? "有未保存的修改" : "已同步"}</span>
        </div>

        {readFailed && <div className="xp-error" role="alert"><p>资料尚未读取。</p><button type="button" onClick={() => { setReadFailed(false); setLoading(true); setMessage(""); setReadRevision(n => n + 1); }}>重新读取</button></div>}

        <form ref={formRef} onClickCapture={event => { if (event.target instanceof Element) { const button = event.target.closest<HTMLElement>(".remove-link"); if (button) restoreFocusAfterRemove(button); } }} onSubmit={e => { e.preventDefault(); void save(); }} aria-label="个人画像" className="xp-form">
          <fieldset disabled={busy || loading || readFailed} className="xp-sections">
            <legend className="sr-only">医学经历与探索目标</legend>

            <section id="profile-group-0" className="xp-sec" data-reveal>
              <div className="xp-sec-head"><span className="xp-mark">第一节</span><h2><IconAccount aria-hidden="true" />基本信息</h2><span className="xp-rule" /><span className="xp-count">{progress.sections[0].checks.filter(check => check.filled).length} / 5 项</span></div>
              <p className="xp-sec-note">{progress.sections[0].note}</p>
              <div className="xp-grid">
                {text("nickname", "昵称", "怎么称呼你")}
                {text("school", "院校", "就读或毕业院校")}
                {text("major", "专业", "临床医学、护理学")}
                {select("培养阶段", stage, educationStages, value => { setProfile(p => ({ ...p, education_stage: value as Profile["education_stage"], grade: value === "已毕业" ? "已毕业" : value === "其他" ? "其他" : "", grade_other: "", degree_track: "", degree_track_other: "" })); setDirty(true); })}
                {stage !== "已毕业" && <>{select(stage === "规培" ? "规培年级" : "当前年级", profile.grade, yearOptions, value => change("grade", value as Profile["grade"]))}{profile.grade === "其他" && text("grade_other", "补充学习阶段 / 年级", "例如：研六、在职进修")}</>}
                {stage !== "已毕业" && stage !== "其他" && <>{select("培养类型", degreeValue, degreeOptions, value => { change("degree_track", value); if (value !== "其他") change("degree_track_other", ""); })}{degreeValue === "其他" && text("degree_track_other", "补充培养类型", "八年制临床医学、专博")}</>}
              </div>
            </section>

            <section id="profile-group-1" className="xp-sec" data-reveal>
              <div className="xp-sec-head"><span className="xp-mark">第二节</span><h2><IconBook aria-hidden="true" />学业与英语</h2><span className="xp-rule" /><span className="xp-count">{progress.sections[1].checks.filter(check => check.filled).length} / 5 项</span></div>
              <p className="xp-sec-note">{progress.sections[1].note}</p>

              <div className="xp-subsec">
                <h3>学业表现</h3>
                <div className="xp-grid">
                  {number("gpa", "GPA", "")}
                  {number("gpa_scale", "GPA 满分", "")}
                  {number("rank", "年级排名", "")}
                  {number("cohort_size", "年级总人数", "")}
                </div>
              </div>

              <div className="xp-subsec">
                <h3>英语水平</h3>
                <div className="xp-grid">
                  {select("大学英语四级", english.cet4, ["未参加", "备考中", "未通过", "已通过", "不确定"], value => change("english", { ...english, cet4: value }))}
                  {select("大学英语六级", english.cet6, ["未参加", "备考中", "未通过", "已通过", "不确定"], value => change("english", { ...english, cet6: value }))}
                  <label className="form-label xp-full"><span>考试成绩</span><input className="field" placeholder="例如：CET-6 520；雅思 6.5" value={english.description} onChange={e => change("english", { ...english, description: e.target.value })} /></label>
                  <label className="form-label xp-full"><span>语言使用经历</span><input className="field" placeholder="读过 12 篇英文论文" value={english.other} onChange={e => change("english", { ...english, other: e.target.value })} /></label>
                </div>
              </div>

              <div className="xp-subsec">
                <TranscriptPreview courses={profile.courses} onChange={courses => change("courses", courses)} />
              </div>
            </section>

            <section id="profile-group-2" className="xp-sec" data-reveal>
              <div className="xp-sec-head"><span className="xp-mark">第三节</span><h2><IconPulse aria-hidden="true" />科研与技能</h2><span className="xp-rule" /><span className="xp-count">{progress.sections[2].checks.filter(check => check.filled).length} / 5 项</span></div>
              <p className="xp-sec-note">{progress.sections[2].note}</p>

              <div className="xp-subsec">
                <h3>研究方向</h3>
                <div className="xp-grid">{list("research_fields", "接触过的研究方向", "肿瘤免疫、医学影像")}</div>
              </div>

              <div className="xp-subsec">
                <h3>科研项目与成果</h3>
                <p className="xp-hint">只填你真正上手做过的；旁观和打杂不算。第 2 步按“承担的工作”判断迁移。</p>
                {profile.research_projects.map((project, i) => <fieldset className="repeat-item xp-repeat" key={i}>
                  <legend>项目 {i + 1}</legend>
                  <div className="xp-grid">
                    {([["title", "项目名称", "肺结节辅助诊断研究"], ["topic", "研究问题", "希望解决什么问题"], ["responsibility", "你承担的工作", "病例整理、实验设计"], ["methods", "方法与工具", "回归分析、细胞培养、Python"], ["outcomes", "阶段成果", "数据集、论文初稿"], ["duration", "参与时间", "例如：2025.09—2026.06"]] as const).map(([key, label, placeholder]) => <label className={`form-label${["topic", "responsibility", "outcomes"].includes(key) ? " xp-full" : ""}`} key={key}><span>{label}</span>{["topic", "responsibility", "outcomes"].includes(key) ? <textarea className="field" rows={2} placeholder={placeholder} value={project[key as keyof typeof project]} onChange={e => change("research_projects", profile.research_projects.map((p, j) => j === i ? { ...p, [key]: e.target.value } : p))} /> : <input className="field" placeholder={placeholder} value={project[key as keyof typeof project]} onChange={e => change("research_projects", profile.research_projects.map((p, j) => j === i ? { ...p, [key]: e.target.value } : p))} />}</label>)}
                  </div>
                  <div className="xp-repeat-actions"><button type="button" className="remove-link xp-remove" onClick={() => change("research_projects", profile.research_projects.filter((_, j) => j !== i))}>移除项目</button></div>
                </fieldset>)}
                <button type="button" className="add-row xp-add" onClick={() => change("research_projects", [...profile.research_projects, { title: "", topic: "", responsibility: "", methods: "", outcomes: "", duration: "" }])}>＋ 添加科研项目</button>

                {profile.papers.map((paper, i) => <fieldset className="repeat-item xp-repeat" key={i}>
                  <legend>成果 {i + 1}</legend>
                  <div className="xp-grid">
                    {select("成果类型", paper.type, ["期刊论文", "会议壁报", "会议口头报告", "会议摘要", "其他"], value => change("papers", profile.papers.map((p, j) => j === i ? { ...p, type: value } : p)))}
                    {select("当前状态", paper.status, paper.type.startsWith("会议") ? ["准备中", "已投稿", "已接收", "已展示 / 发言"] : ["撰写中", "投稿中", "返修中", "已接收", "已见刊"], value => change("papers", profile.papers.map((p, j) => j === i ? { ...p, status: value } : p)))}
                    {([["title", "题目", "论文或报告题目"], ["venue", "期刊 / 会议", "期刊或会议名称"], ["author_role", "作者身份", "共同一作、第三作者"], ["quartile_if_known", "分区", "知道时填写即可"]] as const).map(([key, label, placeholder]) => <label className="form-label" key={key}><span>{label}</span><input className="field" placeholder={placeholder} value={paper[key as Exclude<keyof typeof paper, "year">]} onChange={e => change("papers", profile.papers.map((p, j) => j === i ? { ...p, [key]: e.target.value } : p))} /></label>)}
                    <label className="form-label"><span>年份</span><input className="field" type="number" placeholder="" value={paper.year ?? ""} onChange={e => change("papers", profile.papers.map((p, j) => j === i ? { ...p, year: e.target.value ? Number(e.target.value) : null } : p))} /></label>
                  </div>
                  <div className="xp-repeat-actions"><button type="button" className="remove-link xp-remove" onClick={() => change("papers", profile.papers.filter((_, j) => j !== i))}>移除成果</button></div>
                </fieldset>)}
                <button type="button" className="add-row xp-add" onClick={() => change("papers", [...profile.papers, { title: "", type: "期刊论文", venue: "", status: "撰写中", author_role: "", quartile_if_known: "", year: null }])}>＋ 添加论文或会议成果</button>
              </div>

              <div className="xp-subsec">
                <h3>实验技能</h3>
                <div className="choice-row">{["Western blot", "细胞培养", "PCR", "组织取材"].map(name => <button type="button" className="choice xp-choice" key={name} disabled={profile.wetlab_skills.some(s => s.skill === name)} onClick={() => change("wetlab_skills", [...profile.wetlab_skills, { skill: name, level: "", experience_evidence: "" }])}>＋ {name}</button>)}</div>
                {profile.wetlab_skills.map((skill, i) => <div className="repeat-item xp-repeat" key={i}>
                  <div className="xp-grid">
                    <label className="form-label"><span>实验名称</span><input className="field" value={skill.skill} placeholder="例如：Western blot" onChange={e => change("wetlab_skills", profile.wetlab_skills.map((s, j) => j === i ? { ...s, skill: e.target.value } : s))} /></label>
                    <label className="form-label"><span>相关经历</span><input className="field" placeholder="独立完成两轮蛋白检测" value={skill.experience_evidence} onChange={e => change("wetlab_skills", profile.wetlab_skills.map((s, j) => j === i ? { ...s, experience_evidence: e.target.value } : s))} /></label>
                  </div>
                  {levelScale(`wetlab-${i}`, "完成程度", skill.level, value => change("wetlab_skills", profile.wetlab_skills.map((s, j) => j === i ? { ...s, level: value } : s)))}
                  <div className="xp-repeat-actions"><button type="button" className="remove-link xp-remove" onClick={() => change("wetlab_skills", profile.wetlab_skills.filter((_, j) => j !== i))}>移除技能</button></div>
                </div>)}
                <button type="button" className="add-row xp-add" onClick={() => change("wetlab_skills", [...profile.wetlab_skills, { skill: "", level: "", experience_evidence: "" }])}>＋ 其他实验技能</button>
              </div>

              <div className="xp-subsec">
                <h3>数据与工具技能</h3>
                {profile.tech_skills.map((skill, i) => <div className="repeat-item xp-repeat" key={i}>
                  <div className="xp-grid">
                    {([["skill", "工具或方法", "例如：SPSS"], ["evidence", "实际使用经历", "为课题完成描述统计"]] as const).map(([key, label, placeholder]) => <label className="form-label" key={key}><span>{label}</span><input className="field" placeholder={placeholder} value={skill[key]} onChange={e => change("tech_skills", profile.tech_skills.map((s, j) => j === i ? { ...s, [key]: e.target.value } : s))} /></label>)}
                  </div>
                  {levelScale(`tech-${i}`, "使用程度", skill.self_reported_level, value => change("tech_skills", profile.tech_skills.map((s, j) => j === i ? { ...s, self_reported_level: value } : s)))}
                  <div className="xp-repeat-actions"><button type="button" className="remove-link xp-remove" onClick={() => change("tech_skills", profile.tech_skills.filter((_, j) => j !== i))}>移除技能</button></div>
                </div>)}
                <button type="button" className="add-row xp-add" onClick={() => change("tech_skills", [...profile.tech_skills, { skill: "", self_reported_level: "", evidence: "" }])}>＋ 添加工具技能</button>
              </div>

              <div className="xp-subsec">
                <h3>竞赛与自学</h3>
                <div className="xp-grid">
                  {list("competitions", "竞赛经历", "大创项目、数学建模")}
                  {list("self_study", "课程与独立练习", "自学 Python，做过可视化练习")}
                </div>
              </div>
            </section>

            <section id="profile-group-3" className="xp-sec" data-reveal>
              <div className="xp-sec-head"><span className="xp-mark">第四节</span><h2><IconCompass aria-hidden="true" />偏好与目标</h2><span className="xp-rule" /><span className="xp-count">{progress.sections[3].checks.filter(check => check.filled).length} / 5 项</span></div>
              <p className="xp-sec-note">{progress.sections[3].note}</p>
              <div className="xp-grid">
                {list("hobbies", "日常兴趣", "写作、编程、科普")}
                {list("work_preferences", "喜欢的工作内容", "分析数据、与人交流")}
                {list("career_priorities", "你看重什么", "稳定性、社会价值")}
                {list("interest_directions", "目前想了解的方向", "医疗 AI、生物医学工程")}
                {text("motivation", "为什么想换方向", "例如：更喜欢研究问题", true, true)}
                {text("self_evaluation", "如何评价自己", "善于整理信息，愿意试新工具", true, true)}
                {text("help_needed", "希望得到哪些帮助", "了解真实岗位、入门项目", true, true)}
              </div>

              <details className="xp-subsec xp-conditions">
                <summary><IconCalendar aria-hidden="true" />时间与现实条件</summary>
                <div className="xp-grid">
                  <label className="form-label"><span>目标年份</span><input className="field" type="number" placeholder="" step="1" min="2026" value={profile.transition_year ?? ""} onChange={e => change("transition_year", e.target.value === "" ? null : Number(e.target.value))} /></label>
                  {number("weekly_hours", "每周可投入（小时）", "")}
                  {select("升学路径", profile.pathway, ["统考", "推免", "申请制", "未决定"], value => change("pathway", value as Profile["pathway"]))}
                  {list("target_cities", "目标城市", "例如：上海、杭州")}
                  {text("constraints", "需要兼顾的条件", "实习排班、经济预算", true, true)}
                </div>
              </details>
            </section>
          </fieldset>

          <div className="xp-actions">
            <p className="xp-actions-note">
              保存只写进你自己的档案。20 项里填到 18 项，第 2 步的按钮就解除禁用；剩下那 2 项可以带着没想清楚的地方往下走，之后回来补。
            </p>
            <div className="xp-action-row">
              <button type="submit" className="button secondary" disabled={busy || loading || readFailed}><IconStamp aria-hidden="true" />{busy ? "保存中…" : "保存草稿"}</button>
              <button type="button" className="button" disabled={busy || loading || readFailed || remaining > 0} aria-disabled={remaining > 0} onClick={() => void save(true)}>
                {remaining > 0 ? `继续到第 2 步 · 还差 ${remaining} 项` : "继续到第 2 步"}
              </button>
            </div>
          </div>
          {message && <p role="status" className="xp-msg" data-tone={/失败|请补充|无法|超时|还差/.test(message) ? "error" : "ok"}>{message}</p>}
        </form>

        {tools && <details className="xp-footnote"><summary>开发演示工具</summary><p>simulation：仅使用合成资料。真实个人资料通过上方私有保存。</p><button type="button" className="button secondary" onClick={() => { setProfile(structuredClone(simulationProfile)); setSimulation(true); setDirty(true); }}>载入合成示例</button></details>}

        <p className="xp-hand">拿不准的项目留空，别硬凑成 4。</p>
        <p className="xp-footnote"><Link href="/account" className="xp-text-link">隐私与资料管理</Link></p>
      </section>
    </div>
  </div>;
}
