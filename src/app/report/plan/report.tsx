"use client";
import Link from "next/link";
import { useState } from "react";
import { emptyProfile, profileSchema, type Profile } from "@/lib/profile";
import { directions, findDirection, occupationUrl } from "@/lib/directions";
import { experienceSchema, evaluationCard, type Experience } from "@/lib/experience";
import { actionPlan, skillEvidence } from "@/lib/reports";
import { EvidenceTable } from "@/components/evidence-table";
import { download } from "@/lib/download";
import { AiReport } from "@/components/ai-report";

export function PlanReport({ initialDirection }: { initialDirection: string }) {
  const [direction, setDirection] = useState(findDirection(initialDirection) ? initialDirection : "");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [simulation, setSimulation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("请选择目标方向，并读取画像与体验反馈。当前仅提供可追溯规则草案，正式 AI R2 尚未生成。");
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [budget, setBudget] = useState({ foundation: 0, practice: 0, review: 0 });
  const plan = direction && findDirection(direction) ? actionPlan(profile, direction, experience) : null;
  const budgetTotal = budget.foundation + budget.practice + budget.review;
  const budgetValid = budgetTotal > 0 && profile.weekly_hours !== null && budgetTotal <= profile.weekly_hours;
  const ready = loaded && !!experience && !!plan?.planning_ready && budgetValid;
  async function load(personal: boolean) {
    setBusy(true); setLoaded(false); setExperience(null);
    try {
      if (personal) {
        const [response, expResponse] = await Promise.all([fetch("/api/profile"), fetch("/api/experience")]); const value = await response.json();
        if (!response.ok) throw new Error(value.error?.message ?? "读取失败。");
        setProfile(profileSchema.parse(value.profile)); setSimulation(false);
        const exp = await expResponse.json();
        if (!expResponse.ok) throw new Error(exp.error?.message ?? "私有体验读取失败。");
        const parsed = experienceSchema.safeParse(exp.experience);
        setExperience(parsed.success ? parsed.data : null); setLoaded(true);
        setMessage(parsed.success ? "已读取当前访客私有画像与合成工作台反馈。计划条件需通过画像页保存后才能生成正式报告。" : "已读取个人画像，尚无当前访客的私有体验记录。请在工作台完成后保存到当前访客。");
        return;
      } else {
        const value = JSON.parse(localStorage.getItem("limen:simulation:profile:v1") ?? "null");
        if (value?.simulation !== true) throw new Error("请先在个人画像保存合成演示草稿。");
        setProfile(profileSchema.parse(value.profile)); setSimulation(true);
      }
      const result = experienceSchema.safeParse(JSON.parse(localStorage.getItem("limen:simulation:experience:v1") ?? "null"));
      setExperience(result.success ? result.data : null); setLoaded(true);
      setMessage(result.success ? "已读取画像与 simulation 体验。请设置计划条件及本人每周预算；官方兴趣与 AI 解释仍缺失。" : "已读取画像，但尚无已完成体验。请完成工作台操作与反馈，不能把未体验当作兴趣依据。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "读取失败。"); }
    finally { setBusy(false); }
  }
  function exportDraft() {
    if (!ready || !plan) return;
    download("limen-r2-action-draft.json", JSON.stringify({ ...plan, simulation, status: "rule_based_draft_not_formal_ai_report", selected_by: "user_explicit_choice", profile_planning: { transition_year: profile.transition_year, weekly_hours: profile.weekly_hours, pathway: profile.pathway }, weekly_allocation_by_user: budget, alternatives: alternatives.map((id) => findDirection(id)), experience_card: experience ? evaluationCard(experience) : null, sources: ["user_profile", "limen_direction_map", "experience_feedback"], limitations: ["O*NET 兴趣结果尚未整合到此草案", "AI 未生成", "招生数据为空，均需核验"] }, null, 2));
    setMessage("规则行动草案已导出，包含证据引用、本人预算与 simulation 体验。未标为正式 AI R2。");
  }
  return <main id="main" className="shell py-10"><p className="eyebrow">REPORT 02 · 从体验到行动</p><h1 className="mt-2 text-3xl font-semibold">综合方向与转型行动草案</h1><p className="mt-4 leading-7 muted">把兴趣、技能证据、课程准备和报考条件分开考虑。继续医学或暂不转型，同样是有效选择。</p>
    <div className="mt-5 flex flex-wrap gap-3"><button className="button" disabled={busy} onClick={() => load(true)}>读取个人画像</button><button className="button secondary" disabled={busy} onClick={() => load(false)}>读取 simulation 画像与体验</button></div><p className="status notice" role="status">{message}</p>
    <section className="mt-8 border-t pt-6"><h2 className="text-xl font-semibold">01 · 本人的探索选择</h2><label className="mt-4 block">当前目标<select className="field !max-w-xl" value={direction} onChange={(e) => { setDirection(e.target.value); setAlternatives([]); }}><option value="">尚未决定，继续探索</option><option value="medicine">继续医学，暂不转型</option>{directions.map((d) => <option value={d.id} key={d.id}>{d.group_name} / {d.name}</option>)}</select></label>
      {!plan ? <div className="mt-5 leading-7"><p>{direction === "medicine" ? "可以继续医学，保留当前训练路径。先选一项感兴趣的跨学科活动作为小规模尝试，再决定是否调整目标。" : "尚未选择目标，不生成专业准备路线。可以先比较工作任务或再体验一次。"}</p><Link href="/explore" className="mt-3 inline-block">比较方向任务 →</Link></div> : <><p className="mt-4">目标：<strong>{plan.direction.name}</strong> · 用户自主选择，非自动适配结论。</p><p className="mt-3 text-sm muted">典型工作：{plan.direction.work_tasks.join("；")}。来源：LIMEN 编辑性目录。</p><div className="mt-3 flex flex-wrap gap-4 text-sm">{plan.direction.onet.map((o) => <a key={o.code} href={occupationUrl(o.code)} target="_blank" rel="noreferrer">{o.name} · {o.relationship}</a>)}</div>
      <fieldset className="mt-6"><legend className="font-medium">主观备选方向（最多两个）</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{directions.filter((d) => d.id !== direction).map((d) => <label key={d.id} className="flex gap-2 text-sm"><input type="checkbox" checked={alternatives.includes(d.id)} disabled={!alternatives.includes(d.id) && alternatives.length >= 2} onChange={() => setAlternatives((a) => a.includes(d.id) ? a.filter((id) => id !== d.id) : [...a, d.id])} />{d.name}</label>)}</div></fieldset>
      {!!alternatives.length && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr><th>方向</th><th>工作活动差异</th><th>准备线索</th></tr></thead><tbody>{[direction, ...alternatives].map((id) => { const d = findDirection(id)!; return <tr className="border-t" key={id}><th className="py-3 pr-3">{d.name}</th><td className="py-3 pr-3">{d.work_tasks.join("；")}</td><td>{d.skills.join("、")}</td></tr>; })}</tbody></table></div>}
      </>}
    </section>
    {plan && <><section className="mt-9 border-t pt-6"><h2 className="text-xl font-semibold">02 · 兴趣证据与体验反馈</h2><div className="mt-4 grid gap-6 md:grid-cols-2"><div><h3 className="font-medium">问卷兴趣 · 尚未整合</h3><p className="mt-2 text-sm leading-7 muted">本草案不会用技能或模拟结果推断 RIASEC。<Link href="/report/initial">查看 R1 官方结果状态</Link>。</p></div><div><h3 className="font-medium">体验兴趣 · 本人明确反馈</h3>{experience ? <dl className="mt-2 space-y-2 text-sm leading-7"><div><dt>最想继续</dt><dd>{experience.reflection.favorite_operation}</dd></div><div><dt>最不喜欢</dt><dd>{experience.reflection.least_favorite_operation}</dd></div><div><dt>愿再投入 3 小时</dt><dd>{experience.reflection.willingness_for_3_hours} / 5（自述意愿）</dd></div><div><dt>来源</dt><dd className="break-all">experience_feedback · {experience.completed_at}</dd></div></dl> : <p className="mt-2 muted">尚无反馈。<Link href="/studio/ecg">完成一次工作体验</Link>。</p>}</div></div><p className="notice mt-5 text-sm">{plan.experience_relevance} 教学指标不是能力评分，点击和耗时不是兴趣评分。</p></section>
    <section className="mt-9 border-t pt-6"><h2 className="text-xl font-semibold">03 · 迁移证据与知识缺口</h2><EvidenceTable rows={skillEvidence(profile)} /><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead><tr><th>目录技能</th><th>当前证据</th><th>解释</th></tr></thead><tbody>{plan.gaps.map((g) => <tr className="border-t align-top" key={g.skill}><th className="py-4 pr-3">{g.skill}</th><td className="py-4 pr-3">{g.status}<p className="mt-1 break-all text-xs muted">{g.evidence_refs.join("；") || "无匹配记录"}</p></td><td className="py-4">{g.note}</td></tr>)}</tbody></table></div></section>
    <section className="mt-9 border-t pt-6"><h2 className="text-xl font-semibold">04 · 课程、练习与科研路径</h2><p className="mt-3 text-sm muted">以下顺序为 LIMEN 编辑性探索建议。具体课程先修要求需另行核验；学习时长未知，不自动估算小时。</p><ol className="mt-5 divide-y">{plan.tasks.map((task) => <li key={task.id} className="py-5"><h3 className="font-semibold">{task.stage} · {task.title}</h3><p className="mt-2 text-sm leading-7">为什么：{task.why}<br />交付物：{task.deliverable}</p><p className="mt-2 text-xs leading-6 muted">依赖：{task.dependencies.join(" → ") || "无"} · 优先级：{task.priority} · 工作量：未知<br />来源：{task.source} · 任务 ID：{task.id}</p></li>)}</ol></section>
    <section className="mt-9 border-t pt-6"><h2 className="text-xl font-semibold">05 · 本人计划条件与每周预算</h2><div className="mt-5 grid gap-5 sm:grid-cols-3"><label>计划转型年份<input className="field" type="number" min={2026} max={2100} value={profile.transition_year ?? ""} onChange={(e) => setProfile((p) => ({ ...p, transition_year: e.target.value ? Number(e.target.value) : null }))} /></label><label>每周可投入小时<input className="field" type="number" min={0} max={168} step="0.5" value={profile.weekly_hours ?? ""} onChange={(e) => setProfile((p) => ({ ...p, weekly_hours: e.target.value ? Number(e.target.value) : null }))} /></label><label>升学路径<select className="field" value={profile.pathway} onChange={(e) => setProfile((p) => ({ ...p, pathway: e.target.value as Profile["pathway"] }))}>{["未决定", "统考", "推免", "申请制"].map((p) => <option key={p}>{p}</option>)}</select></label></div>
      <p className="mt-4 text-sm leading-7">{profile.pathway === "统考" ? "统考：逐项核验目标专业的考试科目、跨专业资格和复试要求；不默认所有方向都考 408。" : profile.pathway === "推免" ? "推免：先核实本科院校推免资格，再核实目标项目当年接收规则、材料和时间。" : profile.pathway === "申请制" ? "申请制：核验目标项目学历、语言、材料与截止时间；导师联系只在项目要求或本人有明确目的时考虑。" : "路径未决定：先比较资格与准备要求，再选择路径。"}</p>
      <fieldset className="mt-5"><legend className="font-medium">自行分配一周的预算（不代表课程所需时长）</legend><div className="mt-3 grid gap-4 sm:grid-cols-3">{([["foundation", "基础学习"], ["practice", "小型练习"], ["review", "复盘与核验"]] as const).map(([id, label]) => <label key={id}>{label} / 小时<input className="field" type="number" step="0.5" min={0} max={168} value={budget[id]} onChange={(e) => setBudget((b) => ({ ...b, [id]: Math.max(0, Math.min(168, Number(e.target.value))) }))} /></label>)}</div></fieldset><p className="mt-4 text-sm" role="status">已分配 {budgetTotal} 小时 / 可用 {profile.weekly_hours ?? "未填写"} 小时。{budgetValid ? "预算有效；一周后用实际耗时修订。" : "请填写正数可用时间，且分配总量不得超过每周可用时间。"}</p>
      {plan.planning && <p className="mt-4 text-sm leading-7">{plan.planning.horizon} 每个阶段以交付物验收后再推进，暂不虚构完成月份。</p>}
    </section><section className="mt-9 border-t pt-6"><h2 className="text-xl font-semibold">06 · 招生核验与风险</h2><p className="mt-4 notice">已核验招生项目：0 条。没有院校可报考结论。请在官方招生页面逐条记录：年份、专业代码、招生方式、科目、跨专业资格、链接和核验日期。</p><ul className="mt-5 list-disc space-y-3 pl-5 text-sm leading-7">{plan.risks.map((risk) => <li key={risk}>{risk}</li>)}</ul></section>
    <div className="mt-8 flex flex-wrap gap-4"><button className="button" disabled={!ready} onClick={exportDraft}>导出规则行动草案</button><Link href="/profile" className="button secondary">补充与保存画像</Link><Link href="/studio/ecg" className="button secondary">返回职业体验</Link></div><p className="mt-3 text-sm muted">导出需：读取画像、完成体验反馈、填写有效计划条件及预算。当前页修改只留在内存；通过画像页保存个人资料。</p></>}
    <p className="mt-9 text-sm muted">本报告是探索辅助，不代表报考资格。以上为规则行动草案；正式 AI 报告的实际状态在下方独立显示。</p>
    <AiReport key={direction} kind="R2" direction={findDirection(direction)?.id} />
  </main>;
}
