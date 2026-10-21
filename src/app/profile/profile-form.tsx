"use client";
import Link from "next/link";
import { useState } from "react";
import { emptyProfile, grades, profileMissing, profileSchema, simulationProfile, type Profile } from "@/lib/profile";
import { TranscriptPreview } from "@/components/transcript-preview";

const steps = ["基本学籍", "学业记录", "科研与技能", "偏好与计划"];
const storageKey = "limen:simulation:profile:v1";
type StringKey = { [K in keyof Profile]: Profile[K] extends string ? K : never }[keyof Profile];
type ListKey = "research_fields" | "competitions" | "self_study" | "hobbies" | "work_preferences" | "career_priorities" | "interest_directions" | "target_cities";
type NumberKey = "gpa" | "gpa_scale" | "rank" | "cohort_size" | "transition_year" | "weekly_hours";

export function ProfileForm() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [step, setStep] = useState(0);
  const [simulation, setSimulation] = useState(false);
  const [message, setMessage] = useState("尚未保存。真实资料需连接匿名访客服务后才能保存。");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  function change<K extends keyof Profile>(key: K, value: Profile[K]) { setProfile((p) => ({ ...p, [key]: value })); setDirty(true); }
  function text(key: StringKey, label: string, long = false) {
    return <label className="block" key={key}><span className="font-medium">{label}</span>{long ? <textarea className="field !max-w-none" rows={4} value={profile[key]} onChange={(e) => change(key, e.target.value as Profile[typeof key])} /> : <input className="field !max-w-none" value={profile[key]} onChange={(e) => change(key, e.target.value as Profile[typeof key])} />}</label>;
  }
  function number(key: NumberKey, label: string) {
    return <label className="block" key={key}><span className="font-medium">{label}</span><input className="field !max-w-none" type="number" step={["rank", "cohort_size", "transition_year"].includes(key) ? "1" : "any"} min="0" value={profile[key] ?? ""} onChange={(e) => change(key, e.target.value === "" ? null : Number(e.target.value))} /></label>;
  }
  function list(key: ListKey, label: string) {
    return <label className="block" key={key}><span className="font-medium">{label}</span><span className="block mt-1 text-xs muted">每行一项，可留空</span><textarea className="field !max-w-none" rows={3} value={profile[key].join("\n")} onChange={(e) => change(key, e.target.value.split("\n"))} /></label>;
  }
  async function connect() {
    setBusy(true);
    try {
      const response = await fetch("/api/session", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "连接失败。");
      setSimulation(false); setMessage("匿名访客已连接。草稿只保存到当前访客的私有记录中。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "连接失败。"); }
    finally { setBusy(false); }
  }
  async function save() {
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) { setMessage(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      if (simulation) {
        localStorage.setItem(storageKey, JSON.stringify({ simulation: true, profile: parsed.data, saved_at: new Date().toISOString() }));
        setMessage("simulation：合成草稿已保存在本浏览器，可刷新后恢复。请勿在演示模式输入真实资料。");
      } else {
        const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message ?? "保存失败。");
        setMessage("个人草稿已保存到当前匿名访客的私有资料。清除会话后无法恢复此身份。");
      }
      setDirty(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败。"); }
    finally { setBusy(false); }
  }
  async function restore(personal: boolean) {
    setBusy(true);
    try {
      let input: unknown;
      if (personal) {
        const response = await fetch("/api/profile"); const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message ?? "读取失败。");
        if (!data.profile) throw new Error("当前访客尚无保存的草稿。");
        input = data.profile;
      } else {
        const raw = localStorage.getItem(storageKey);
        if (!raw) throw new Error("本机尚无合成草稿。");
        const stored = JSON.parse(raw);
        if (stored.simulation !== true) throw new Error("草稿来源不匹配。");
        input = stored.profile;
      }
      const parsed = profileSchema.safeParse(input);
      if (!parsed.success) throw new Error("草稿格式不兼容，请重新填写。");
      setProfile(parsed.data); setSimulation(!personal); setDirty(false); setMessage(personal ? "已恢复当前访客的私有草稿。" : "simulation：已恢复合成草稿。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "恢复失败。"); }
    finally { setBusy(false); }
  }
  const missing = profileMissing(profile);
  return <div className="mx-auto max-w-3xl">
    <p className="eyebrow">探索 / 01 个人画像</p><h1 className="mt-3 text-3xl font-semibold">先整理已有的经历</h1>
    <p className="mt-4 leading-7 muted">最低只需基本学籍。成绩、论文、科研和转型动机均可跳过；未填写的内容会保留为未知。</p>
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" className="button secondary" disabled={busy} onClick={connect}>连接匿名访客</button>
      <button type="button" className="button secondary" disabled={busy} onClick={() => { setProfile(structuredClone(simulationProfile)); setSimulation(true); setDirty(true); setStep(0); setMessage("simulation：仅供合成数据演示。不是你的测评结果，请勿填写真实个人资料。"); }}>使用合成示例</button>
      <button type="button" className="text-sm text-blue-700 underline" disabled={busy} onClick={() => restore(false)}>恢复合成草稿</button>
      <button type="button" className="text-sm text-blue-700 underline" disabled={busy} onClick={() => restore(true)}>恢复个人草稿</button>
    </div>
    <p className={`mt-4 rounded p-3 text-sm ${simulation ? "bg-amber-50 text-amber-900" : "bg-blue-50 text-blue-900"}`}>{simulation ? "simulation · 本地合成数据演示模式" : "个人资料模式 · 需匿名登录才能保存；未保存内容仅在当前页面内存中"}</p>
    <nav aria-label="画像填写步骤" className="sticky top-0 z-10 mt-7 grid grid-cols-2 border-y border-slate-200 bg-slate-50 py-2 sm:grid-cols-4">
      {steps.map((title, i) => <button type="button" className={`min-w-0 border-b-2 px-2 py-3 text-sm ${step === i ? "border-blue-600 font-semibold text-blue-800" : "border-transparent muted"}`} key={title} aria-current={step === i ? "step" : undefined} onClick={() => setStep(i)}>{i + 1}. {title}</button>)}
    </nav>
    <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="mt-8 space-y-6" aria-label="个人画像草稿">
      <h2 className="text-xl font-semibold">{steps[step]}</h2>
      {step === 0 && <div className="grid gap-5 sm:grid-cols-2">
        {text("nickname", "昵称 *")}{text("school", "本科院校 *")}{text("major", "本科专业 *")}
        <label className="block"><span className="font-medium">当前年级 *</span><select className="field !max-w-none" value={profile.grade} onChange={(e) => change("grade", e.target.value as Profile["grade"])}><option value="">请选择</option>{grades.map((grade) => <option key={grade}>{grade}</option>)}</select></label>
        {text("degree_track", "学制 / 培养类型（可选）")}
      </div>}
      {step === 1 && <><div className="grid gap-5 sm:grid-cols-2">{number("gpa", "GPA（可选）")}{number("gpa_scale", "GPA 满分")}{number("rank", "年级排名（可选）")}{number("cohort_size", "年级总人数")}</div><TranscriptPreview courses={profile.courses} onChange={(courses) => change("courses", courses)} /></>}
      {step === 2 && <div className="space-y-8">
        {list("research_fields", "科研方向（可选）")}
        <section><h3 className="font-semibold">科研项目与个人责任</h3>{profile.research_projects.map((project, i) => <fieldset key={i} className="mt-4 grid gap-3 rounded border border-slate-200 p-4 sm:grid-cols-2"><legend className="px-2 text-sm">项目 {i + 1}</legend>{Object.entries({ title: "标题", topic: "主题", responsibility: "本人承担的工作", methods: "使用方法", outcomes: "产出 / 证据", duration: "参与时间（自述）" }).map(([key, label]) => <label key={key} className="text-sm">{label}<input className="field !max-w-none" value={project[key as keyof typeof project]} onChange={(e) => change("research_projects", profile.research_projects.map((p, j) => j === i ? { ...p, [key]: e.target.value } : p))} /></label>)}<button type="button" className="text-sm text-red-700 underline" onClick={() => change("research_projects", profile.research_projects.filter((_, j) => j !== i))}>移除此项目</button></fieldset>)}<button type="button" className="mt-3 text-blue-700 underline" onClick={() => change("research_projects", [...profile.research_projects, { title: "", topic: "", responsibility: "", methods: "", outcomes: "", duration: "" }])}>添加科研项目</button></section>
        <section><h3 className="font-semibold">技术技能与证据</h3>{profile.tech_skills.map((skill, i) => <div key={i} className="mt-3 grid gap-3 rounded border border-slate-200 p-4 sm:grid-cols-3">{([['skill', '技能'], ['self_reported_level', '自评熟练度'], ['evidence', '课程 / 项目证据']] as const).map(([key, label]) => <label className="text-sm" key={key}>{label}<input className="field !max-w-none" value={skill[key]} onChange={(e) => change("tech_skills", profile.tech_skills.map((s, j) => j === i ? { ...s, [key]: e.target.value } : s))} /></label>)}<button type="button" className="text-left text-sm text-red-700 underline" onClick={() => change("tech_skills", profile.tech_skills.filter((_, j) => j !== i))}>移除技能</button></div>)}<button type="button" className="mt-3 text-blue-700 underline" onClick={() => change("tech_skills", [...profile.tech_skills, { skill: "", self_reported_level: "", evidence: "" }])}>添加技术技能</button></section>
        <section><h3 className="font-semibold">实验技能（可选）</h3>{profile.wetlab_skills.map((skill, i) => <div key={i} className="mt-3 grid gap-3 sm:grid-cols-3">{([['skill', '实验技能'], ['level', '熟练度'], ['experience_evidence', '具体经历']] as const).map(([key, label]) => <label key={key} className="text-sm">{label}<input className="field" value={skill[key]} onChange={(e) => change("wetlab_skills", profile.wetlab_skills.map((s, j) => j === i ? { ...s, [key]: e.target.value } : s))} /></label>)}</div>)}<button type="button" className="mt-3 text-blue-700 underline" onClick={() => change("wetlab_skills", [...profile.wetlab_skills, { skill: "", level: "", experience_evidence: "" }])}>添加实验技能</button></section>
        <section><h3 className="font-semibold">论文 / 会议成果（可选）</h3>{profile.papers.map((paper, i) => <fieldset key={i} className="mt-4 grid gap-3 border border-slate-200 p-4 sm:grid-cols-2"><legend className="text-sm">成果 {i + 1}</legend>{Object.entries({ title: "标题", type: "类型", venue: "期刊 / 会议", status: "当前状态", author_role: "作者角色", quartile_if_known: "分区（如确知）" }).map(([key, label]) => <label key={key} className="text-sm">{label}<input className="field !max-w-none" value={paper[key as Exclude<keyof typeof paper, "year">]} onChange={(e) => change("papers", profile.papers.map((p, j) => j === i ? { ...p, [key]: e.target.value } : p))} /></label>)}<label className="text-sm">年份<input type="number" className="field" value={paper.year ?? ""} onChange={(e) => change("papers", profile.papers.map((p, j) => j === i ? { ...p, year: e.target.value ? Number(e.target.value) : null } : p))} /></label><button type="button" className="text-red-700 underline text-sm" onClick={() => change("papers", profile.papers.filter((_, j) => j !== i))}>移除此成果</button></fieldset>)}<button type="button" className="mt-3 text-blue-700 underline" onClick={() => change("papers", [...profile.papers, { title: "", type: "", venue: "", status: "", author_role: "", quartile_if_known: "", year: null }])}>添加论文 / 会议成果</button></section>
        {list("competitions", "竞赛成果（可选）")}{list("self_study", "自学课程或独立项目（可选）")}
        <label className="block font-medium">英语水平（可选）<input className="field !max-w-none" value={profile.english?.description ?? ""} onChange={(e) => change("english", e.target.value ? { description: e.target.value } : null)} /></label>
      </div>}
      {step === 3 && <div className="space-y-6">{list("hobbies", "兴趣爱好")}{list("work_preferences", "希望从事的工作内容")}{list("career_priorities", "职业价值观")}{text("motivation", "考虑转专业的原因或顾虑（私密、可选）", true)}{text("self_evaluation", "自我评价（可选）", true)}{list("interest_directions", "目前想了解的方向（可以尚不确定 / 继续医学）")}<div className="grid gap-5 sm:grid-cols-2">{number("transition_year", "计划转专业年份（未决定可留空）")}{number("weekly_hours", "每周可投入小时（未决定可留空）")}<label className="block font-medium">升学路径<select className="field" value={profile.pathway} onChange={(e) => change("pathway", e.target.value as Profile["pathway"])}>{["统考", "推免", "申请制", "未决定"].map((path) => <option key={path}>{path}</option>)}</select></label></div>{list("target_cities", "目标城市（可选）")}{text("constraints", "重要现实约束（可选）", true)}</div>}
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-6">
        {step > 0 && <button type="button" className="button secondary" onClick={() => setStep(step - 1)}>上一步</button>}
        {step < 3 && <button type="button" className="button secondary" onClick={() => setStep(step + 1)}>下一步（可跳过选填项）</button>}
        <button className="button" disabled={busy}>{busy ? "正在保存…" : "保存草稿"}</button>
        <span className="text-sm muted">{dirty ? "有未保存修改" : "无未保存修改"}</span>
      </div>
      <p role="status" className="text-sm leading-6 text-blue-900">{message}</p>
      {step === 3 && <div className="notice text-sm leading-7">{missing.length > 0 ? `正式探索仍需填写：${missing.join("、")}。草稿仍可保存。` : "基本资料已完整。问卷须从官方接口加载；接口失败时不会生成兴趣分数。"}<div className="mt-2 flex flex-wrap gap-4"><Link href="/assessment" className="underline text-blue-800">前往兴趣测评</Link><Link href="/explore" className="underline text-blue-800">先浏览公开方向知识库</Link></div></div>}
    </form>
    <details className="mt-8 border-t border-slate-200 pt-5"><summary className="cursor-pointer text-sm text-red-800">清除演示草稿或删除个人访客</summary><div className="mt-4 flex flex-wrap gap-3"><button className="button secondary" onClick={() => { localStorage.removeItem(storageKey); setProfile(emptyProfile); setSimulation(false); setDirty(false); setMessage("本地合成草稿已清除。个人访客未删除。"); }}>清除本机合成草稿</button><Link className="button danger" href="/account">管理并删除当前访客</Link></div></details>
  </div>;
}
