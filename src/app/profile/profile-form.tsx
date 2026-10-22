"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { emptyProfile, educationStages, gradeOptions, profileMissing, profileSchema, simulationProfile, type Profile } from "@/lib/profile";
import { TranscriptPreview } from "@/components/transcript-preview";

const steps = ["基本信息", "学业与英语", "科研与技能", "偏好与目标"];
const storageKey = "limen:simulation:profile:v1";
type StringKey = { [K in keyof Profile]: Profile[K] extends string ? K : never }[keyof Profile];
type ListKey = "research_fields" | "competitions" | "self_study" | "hobbies" | "work_preferences" | "career_priorities" | "interest_directions" | "target_cities";
type NumberKey = "gpa" | "gpa_scale" | "rank" | "cohort_size" | "transition_year" | "weekly_hours";
const levels = ["刚接触", "在指导下完成", "可独立完成", "可指导他人"];
export function ProfileForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [step, setStep] = useState(0);
  const [simulation, setSimulation] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [tools, setTools] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setTools(new URLSearchParams(window.location.search).get("tools") === "1");
    void (async () => {
      try {
        const r = await fetch("/api/profile", { signal: controller.signal });
        const data = await r.json();
        if (r.status === 401) return;
        if (!r.ok) throw new Error(data.error?.message ?? "资料暂时无法读取，请稍后重试。");
        if (data.profile) setProfile(profileSchema.parse(data.profile));
      } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "读取失败。"); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, []);
  function change<K extends keyof Profile>(key: K, value: Profile[K]) { setProfile(p => ({ ...p, [key]: value })); setDirty(true); setMessage(""); }
  function text(key: StringKey, label: string, placeholder = "", long = false) {
    return <label className="form-label" key={key}><span>{label}</span>{long ? <textarea className="field" rows={3} placeholder={placeholder} value={profile[key]} onChange={e => change(key, e.target.value as Profile[typeof key])} /> : <input className="field" placeholder={placeholder} value={profile[key]} onChange={e => change(key, e.target.value as Profile[typeof key])} />}</label>;
  }
  function number(key: NumberKey, label: string, placeholder = "") {
    return <label className="form-label" key={key}><span>{label}</span><input className="field" type="number" placeholder={placeholder} step={["rank", "cohort_size", "transition_year"].includes(key) ? "1" : "any"} min="0" value={profile[key] ?? ""} onChange={e => change(key, e.target.value === "" ? null : Number(e.target.value))} /></label>;
  }
  function list(key: ListKey, label: string, placeholder: string) {
    return <label className="form-label" key={key}><span>{label}</span><textarea className="field" rows={2} placeholder={placeholder} value={profile[key].join("\n")} onChange={e => change(key, e.target.value.split("\n"))} /></label>;
  }
  function select(label: string, value: string, options: readonly string[], onChange: (value: string) => void) {
    const compatible = value && !options.includes(value) ? [value, ...options] : options;
    return <label className="form-label"><span>{label}</span><select className="field" value={value} onChange={e => onChange(e.target.value)}><option value="">请选择</option>{compatible.map(o => <option key={o}>{o}</option>)}</select></label>;
  }
  async function save(advance = false) {
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) { setMessage(parsed.error.issues[0].message); return; }
    if (advance && profileMissing(parsed.data).length) { setStep(0); setMessage(`请补充${profileMissing(parsed.data).join("、")}。`); return; }
    setBusy(true); setMessage("");
    try {
      if (simulation) {
        localStorage.setItem(storageKey, JSON.stringify({ simulation: true, profile: parsed.data, saved_at: new Date().toISOString() }));
        setMessage("合成示例已保存到本机。");
      } else {
        const session = await fetch("/api/session", { method: "POST" });
        if (!session.ok) { const data = await session.json(); throw new Error(data.error?.message ?? "连接失败，请重试。"); }
        const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message ?? "保存失败，请重试。");
        setMessage("已保存");
      }
      setDirty(false);
      if (advance) router.push("/assessment");
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败。"); }
    finally { setBusy(false); }
  }
  const stage = profile.education_stage || (profile.grade.startsWith("研") ? "硕士研究生" : profile.grade.startsWith("博") ? "博士研究生" : profile.grade.startsWith("规培") ? "规培" : profile.grade === "已毕业" ? "已毕业" : "本科");
  const yearOptions = gradeOptions[stage] ?? gradeOptions["其他"];
  const degreeOptions = stage === "硕士研究生" ? ["学术硕士", "专业硕士", "其他"] : stage === "博士研究生" ? ["学术博士", "专业博士", "其他"] : stage === "规培" ? ["住院医师规范化培训", "专科医师规范化培训", "其他"] : stage === "本科" ? ["五年制", "八年制", "其他"] : ["其他"];
  const degreeValue = profile.degree_track_other ? "其他" : profile.degree_track;
  const english = profile.english ?? { description: "", cet4: "", cet6: "", other: "" };
  return <div className="profile-layout">
    <aside className="profile-intro"><p className="eyebrow">LIMEN · 个人画像</p><h1>认识现在的你</h1><p className="muted leading-7">从医学经历出发，找到值得亲自尝试的方向。</p><ol className="profile-steps" aria-label="画像填写步骤">{steps.map((title, i) => <li key={title}><button type="button" disabled={busy || loading} aria-current={step === i ? "step" : undefined} onClick={() => setStep(i)}><span>{String(i + 1).padStart(2, "0")}</span><strong>{title}</strong></button></li>)}</ol><p className="text-xs leading-6 muted">资料仅自己可见。暂时没有的项目可以跳过。</p></aside>
    <div className="profile-sheet"><div className="section-topline"><span className="eyebrow">个人画像 / {String(step + 1).padStart(2, "0")}</span><span className="text-xs muted" role="status">{loading ? "正在读取…" : dirty ? "有未保存的修改" : ""}</span></div>
    <form onSubmit={e => { e.preventDefault(); void save(); }} aria-label="个人画像" className="space-y-7"><fieldset disabled={busy || loading} className="space-y-7 min-w-0"><legend className="form-title">{steps[step]}</legend>
      {step === 0 && <><div className="form-grid">{text("nickname", "昵称", "希望我们怎么称呼你")}{text("school", "院校", "例如：就读或毕业院校")}{text("major", "专业", "例如：临床医学、护理学")}{select("培养阶段", stage, educationStages, value => { setProfile(p => ({ ...p, education_stage: value as Profile["education_stage"], grade: value === "已毕业" ? "已毕业" : value === "其他" ? "其他" : "", grade_other: "", degree_track: "", degree_track_other: "" })); setDirty(true); })}{stage !== "已毕业" && <>{select(stage === "规培" ? "规培年级" : "当前年级", profile.grade, yearOptions, value => change("grade", value as Profile["grade"]))}{profile.grade === "其他" && text("grade_other", "补充学习阶段 / 年级", "例如：研六、在职进修")}</>}{stage !== "已毕业" && stage !== "其他" && <>{select("培养类型", degreeValue, degreeOptions, value => { change("degree_track", value); if (value !== "其他") change("degree_track_other", ""); })}{degreeValue === "其他" && text("degree_track_other", "补充培养类型", "例如：八年制临床医学、专博")}</>}</div></>}
      {step === 1 && <><section><h3 className="form-section-title">学业表现</h3><div className="form-grid">{number("gpa", "GPA", "例如：3.4")}{number("gpa_scale", "GPA 满分", "例如：4.0")}{number("rank", "年级排名", "例如：25")}{number("cohort_size", "年级总人数", "例如：180")}</div><p className="form-hint">填写你成绩单采用的计分方式；排名与年级人数可一起填写。</p></section><section><h3 className="form-section-title">英语水平</h3><div className="form-grid">{select("大学英语四级", english.cet4, ["未参加", "备考中", "未通过", "已通过", "不确定"], value => change("english", { ...english, cet4: value }))}{select("大学英语六级", english.cet6, ["未参加", "备考中", "未通过", "已通过", "不确定"], value => change("english", { ...english, cet6: value }))}<label className="form-label"><span>考试成绩</span><input className="field" placeholder="例如：CET-6 520；雅思 6.5" value={english.description} onChange={e => change("english", { ...english, description: e.target.value })} /></label><label className="form-label"><span>语言使用经历</span><input className="field" placeholder="例如：阅读英文论文、英文会议发言" value={english.other} onChange={e => change("english", { ...english, other: e.target.value })} /></label></div></section><TranscriptPreview courses={profile.courses} onChange={courses => change("courses", courses)} /></>}
      {step === 2 && <><section>{list("research_fields", "研究方向", "例如：肿瘤免疫、医学影像、临床预测模型")}</section><section className="form-section"><h3 className="form-section-title">科研项目与成果</h3><p className="form-hint">写清研究问题、你做了什么，以及留下了什么成果。</p>{profile.research_projects.map((project, i) => <fieldset className="repeat-item" key={i}><legend>项目 {i + 1}</legend><div className="form-grid">{Object.entries({ title: ["项目名称", "例如：肺结节辅助诊断研究"], topic: ["研究问题", "希望解决什么问题"], responsibility: ["你承担的工作", "例如：病例整理、实验设计、数据分析"], methods: ["方法与工具", "例如：回归分析、细胞培养、Python"], outcomes: ["阶段成果", "例如：数据集、论文初稿、汇报"], duration: ["参与时间", "例如：2025.09—2026.06"] }).map(([key, [label, placeholder]]) => <label className="form-label" key={key}><span>{label}</span><input className="field" placeholder={placeholder} value={project[key as keyof typeof project]} onChange={e => change("research_projects", profile.research_projects.map((p, j) => j === i ? { ...p, [key]: e.target.value } : p))} /></label>)}</div><button type="button" className="remove-link" onClick={() => change("research_projects", profile.research_projects.filter((_, j) => j !== i))}>移除项目</button></fieldset>)}<button type="button" className="add-row" onClick={() => change("research_projects", [...profile.research_projects, { title: "", topic: "", responsibility: "", methods: "", outcomes: "", duration: "" }])}>＋ 添加科研项目</button>
        {profile.papers.map((paper, i) => <fieldset className="repeat-item" key={i}><legend>成果 {i + 1}</legend><div className="form-grid">{select("成果类型", paper.type, ["期刊论文", "会议壁报", "会议口头报告", "会议摘要", "其他"], value => change("papers", profile.papers.map((p, j) => j === i ? { ...p, type: value } : p)))}{select("当前状态", paper.status, paper.type.startsWith("会议") ? ["准备中", "已投稿", "已接收", "已展示 / 发言"] : ["撰写中", "投稿中", "返修中", "已接收", "已见刊"], value => change("papers", profile.papers.map((p, j) => j === i ? { ...p, status: value } : p)))}{Object.entries({ title: ["题目", "论文或报告题目"], venue: ["期刊 / 会议", "填写期刊或会议名称"], author_role: ["作者身份", "例如：共同一作、第三作者"], quartile_if_known: ["分区", "知道时填写即可"] }).map(([key, [label, placeholder]]) => <label className="form-label" key={key}><span>{label}</span><input className="field" placeholder={placeholder} value={paper[key as Exclude<keyof typeof paper, "year">]} onChange={e => change("papers", profile.papers.map((p, j) => j === i ? { ...p, [key]: e.target.value } : p))} /></label>)}<label className="form-label"><span>年份</span><input className="field" type="number" placeholder="例如：2026" value={paper.year ?? ""} onChange={e => change("papers", profile.papers.map((p, j) => j === i ? { ...p, year: e.target.value ? Number(e.target.value) : null } : p))} /></label></div><button type="button" className="remove-link" onClick={() => change("papers", profile.papers.filter((_, j) => j !== i))}>移除成果</button></fieldset>)}<button type="button" className="add-row" onClick={() => change("papers", [...profile.papers, { title: "", type: "期刊论文", venue: "", status: "撰写中", author_role: "", quartile_if_known: "", year: null }])}>＋ 添加论文或会议成果</button></section>
      <section className="form-section"><h3 className="form-section-title">实验技能</h3><p className="form-hint">例如：Western blot、细胞培养、组织取材、PCR。先选你做过的，再补充独立程度。</p><div className="choice-row">{["Western blot", "细胞培养", "PCR", "组织取材"].map(name => <button type="button" className="choice" key={name} disabled={profile.wetlab_skills.some(s => s.skill === name)} onClick={() => change("wetlab_skills", [...profile.wetlab_skills, { skill: name, level: "", experience_evidence: "" }])}>＋ {name}</button>)}</div>{profile.wetlab_skills.map((skill, i) => <div className="repeat-item" key={i}><div className="form-grid"><label className="form-label"><span>实验名称</span><input className="field" value={skill.skill} placeholder="例如：Western blot" onChange={e => change("wetlab_skills", profile.wetlab_skills.map((s, j) => j === i ? { ...s, skill: e.target.value } : s))} /></label>{select("完成程度", skill.level, levels, value => change("wetlab_skills", profile.wetlab_skills.map((s, j) => j === i ? { ...s, level: value } : s)))}<label className="form-label sm:col-span-2"><span>相关经历</span><input className="field" placeholder="例如：在导师指导下完成两轮蛋白检测" value={skill.experience_evidence} onChange={e => change("wetlab_skills", profile.wetlab_skills.map((s, j) => j === i ? { ...s, experience_evidence: e.target.value } : s))} /></label></div><button type="button" className="remove-link" onClick={() => change("wetlab_skills", profile.wetlab_skills.filter((_, j) => j !== i))}>移除技能</button></div>)}<button type="button" className="add-row" onClick={() => change("wetlab_skills", [...profile.wetlab_skills, { skill: "", level: "", experience_evidence: "" }])}>＋ 其他实验技能</button></section>
      <section className="form-section"><h3 className="form-section-title">数据与工具技能</h3><p className="form-hint">例如：Excel、SPSS、R、Python、文献检索；写一件实际做过的事。</p>{profile.tech_skills.map((skill, i) => <div className="repeat-item" key={i}><div className="form-grid">{([['skill', '工具或方法', '例如：SPSS'], ['evidence', '实际使用经历', '例如：为课题完成描述统计']] as const).map(([key, label, placeholder]) => <label className="form-label" key={key}><span>{label}</span><input className="field" placeholder={placeholder} value={skill[key]} onChange={e => change("tech_skills", profile.tech_skills.map((s, j) => j === i ? { ...s, [key]: e.target.value } : s))} /></label>)}{select("使用程度", skill.self_reported_level, levels, value => change("tech_skills", profile.tech_skills.map((s, j) => j === i ? { ...s, self_reported_level: value } : s)))}</div><button type="button" className="remove-link" onClick={() => change("tech_skills", profile.tech_skills.filter((_, j) => j !== i))}>移除技能</button></div>)}<button type="button" className="add-row" onClick={() => change("tech_skills", [...profile.tech_skills, { skill: "", self_reported_level: "", evidence: "" }])}>＋ 添加工具技能</button></section><div className="form-grid">{list("competitions", "竞赛经历", "例如：大学生创新训练项目、数学建模竞赛")}{list("self_study", "课程与独立练习", "例如：学过Python入门，做过一个数据可视化练习")}</div></>}
      {step === 3 && <><div className="form-grid">{list("hobbies", "日常兴趣", "例如：写作、编程、科普、组织活动")}{list("work_preferences", "喜欢的工作内容", "例如：分析数据、与人交流、动手实验")}</div>{list("career_priorities", "你看重什么", "例如：稳定性、工作自主性、社会价值、收入、生活平衡")}{text("motivation", "为什么想探索其他方向", "例如：更喜欢研究问题，希望了解医学与技术结合的工作。", true)}{text("self_evaluation", "如何评价自己", "例如：善于整理信息，愿意尝试新工具；公开表达还需要练习。", true)}{text("help_needed", "希望得到哪些帮助", "例如：了解真实岗位、找到入门项目、厘清升学路径。", true)}{list("interest_directions", "目前想了解的方向", "例如：医疗AI、生物医学工程；还没想好或继续医学也可以")}
      <details className="form-section"><summary className="cursor-pointer font-medium">已有计划？补充时间与现实条件</summary><div className="form-grid mt-5">{number("transition_year", "目标年份", "例如：2028")}{number("weekly_hours", "每周可投入时间 / 小时", "例如：6")}{select("升学路径", profile.pathway, ["统考", "推免", "申请制", "未决定"], value => change("pathway", value as Profile["pathway"]))}{list("target_cities", "目标城市", "例如：上海、杭州")}</div><div className="mt-5">{text("constraints", "需要兼顾的现实条件", "例如：实习排班、时间安排、经济预算。", true)}</div></details></>}
      </fieldset><div className="form-actions"><div className="flex gap-3">{step > 0 && <button type="button" className="button secondary" disabled={busy || loading} onClick={() => setStep(step - 1)}>上一步</button>}<button type="submit" className="button secondary" disabled={busy || loading}>{busy ? "保存中…" : "保存"}</button></div>{step < 3 ? <button type="button" className="button" disabled={busy || loading} onClick={() => setStep(step + 1)}>下一步 →</button> : <button type="button" className="button" disabled={busy || loading} onClick={() => void save(true)}>保存并开始兴趣测评 →</button>}</div>{message && <p role="status" className="inline-feedback">{message}</p>}
    </form>
    {tools && <details className="mt-8 text-sm"><summary>开发演示工具</summary><p className="mt-3">simulation：仅使用合成资料。真实个人资料通过上方私有保存。</p><button type="button" className="button secondary mt-3" onClick={() => { setProfile(structuredClone(simulationProfile)); setSimulation(true); setDirty(true); }}>载入合成示例</button></details>}
    <p className="mt-6 text-xs muted"><Link href="/account">隐私与资料管理</Link></p></div>
  </div>;
}
