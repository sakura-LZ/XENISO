"use client";
import Link from "next/link";
import { useState } from "react";
import { assessmentSchema, type AssessmentResult } from "@/lib/assessment";
import { emptyProfile, profileSchema, type Profile } from "@/lib/profile";
import { initialReport } from "@/lib/reports";
import { occupationUrl } from "@/lib/directions";
import { EvidenceTable } from "@/components/evidence-table";
import { download } from "@/lib/download";
import { AiReport } from "@/components/ai-report";

const areaLabels: Record<string, string> = { realistic: "R 实作型", investigative: "I 研究型", artistic: "A 艺术型", social: "S 社会型", enterprising: "E 企业型", conventional: "C 常规型" };
export function InitialReport() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [mode, setMode] = useState<"empty" | "simulation" | "personal">("empty");
  const [message, setMessage] = useState("尚未读取资料与官方测评。没有结果时不会生成兴趣方向结论。");
  const [busy, setBusy] = useState(false);
  const report = initialReport(profile, assessment);
  async function load(personal: boolean) {
    setBusy(true); setAssessment(null); setMode("empty");
    try {
      if (!personal) {
        const value = JSON.parse(localStorage.getItem("limen:simulation:profile:v1") ?? "null");
        if (value?.simulation !== true) throw new Error("请先在个人画像保存合成演示草稿。");
        setProfile(profileSchema.parse(value.profile)); setMode("simulation"); setMessage("simulation：只整理合成资料中的自述证据。缺少官方兴趣结果，未生成正式 R1，也没有调用 AI。");
      } else {
        const [p, a] = await Promise.all([fetch("/api/profile"), fetch("/api/assessment")]);
        const [pd, ad] = await Promise.all([p.json(), a.json()]);
        if (!p.ok) throw new Error(pd.error?.message ?? "个人资料读取失败。");
        if (!a.ok) throw new Error(ad.error?.message ?? "测评读取失败。");
        setProfile(profileSchema.parse(pd.profile)); setAssessment(ad.assessment ? assessmentSchema.parse(ad.assessment) : null); setMode("personal"); setMessage(ad.assessment ? "已读取当前访客的官方测评。以下解释由规则生成，AI 解释尚未生成。" : "当前访客没有已保存的官方测评，暂不生成正式 R1。");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "读取失败。"); }
    finally { setBusy(false); }
  }
  return <main id="main" className="shell py-10"><p className="eyebrow">REPORT 01 · 体验之前</p><h1 className="mt-2 text-3xl font-semibold">兴趣与可迁移能力初步画像</h1><div className="mt-5 flex flex-wrap gap-3"><button className="button" disabled={busy} onClick={() => load(true)}>读取个人测评与画像</button><button className="button secondary" disabled={busy} onClick={() => load(false)}>查看 simulation 证据草案</button></div><p className="notice status" role="status">{message}</p>
    <div className="mt-8 grid gap-10 lg:grid-cols-[1.7fr_1fr]"><div className="min-w-0"><section><h2 className="text-xl font-semibold">职业活动兴趣 · 官方六维</h2>{!assessment ? <p className="mt-4 leading-7 muted">尚无 O*NET 官方成绩。<Link href="/assessment">返回测评</Link>，或先浏览方向手册。不会根据院校、GPA、点击次数估算兴趣。</p> : <><dl className="mt-5 grid gap-3 sm:grid-cols-2">{assessment.scores.map((score) => <div key={score.code} className="flex justify-between border-b py-3"><dt>{areaLabels[score.code]}</dt><dd className="font-semibold">{score.score}</dd></div>)}</dl><p className="mt-4 text-sm muted">原始数值，不是百分位或能力得分。来源：O*NET Mini-IP · {assessment.onet_version} · 返回 {assessment.returned_at}</p><details className="mt-5"><summary>官方职业匹配（当前返回页）</summary><ul className="mt-3 space-y-3 text-sm">{assessment.careers.map((c) => <li key={c.code}><a href={`https://www.onetonline.org/link/summary/${c.code}`} target="_blank" rel="noreferrer">{c.title} · {c.code}</a></li>)}</ul><p className="mt-3 text-sm muted">接口总计 {assessment.career_total} 条，本页 {assessment.careers.length} 条；未声称已获取全部分页。</p></details></> }</section>
      <section className="mt-9 border-t pt-7"><h2 className="text-xl font-semibold">可迁移能力 · 证据清单</h2><p className="mt-3 text-sm muted">{mode === "empty" ? "尚未读取资料" : `${profile.nickname} · ${profile.major} · ${profile.grade}`}。院校背景本身不构成技能证据。</p><EvidenceTable rows={report.evidence} /></section>
      <section className="mt-8 border-t pt-7"><h2 className="text-xl font-semibold">仍然未知</h2><ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6">{report.unknowns.map((s) => <li key={s}>{s}</li>)}</ul></section>
    </div><aside className="min-w-0"><h2 className="text-xl font-semibold">值得探索的方向</h2><p className="mt-3 text-sm leading-7 muted">依据当前官方职业页与 LIMEN 编辑性映射关联，最多列三个；不表示唯一最佳专业。</p>{report.candidates.length ? report.candidates.map(({ direction, occupations }) => <article key={direction.id} className="mt-5 border-t pt-5"><Link href={`/explore?direction=${direction.id}`} className="font-semibold">{direction.name}</Link><ul className="mt-3 text-sm leading-7">{occupations.map((o) => <li key={o.code}><a href={occupationUrl(o.code)} target="_blank" rel="noreferrer">{o.name} · {o.code}</a><br />关联：{o.relationship} · LIMEN 编辑</li>)}</ul><p className="mt-3 text-sm">下一步：体验“{direction.work_tasks[0]}”。</p></article>) : <p className="mt-5 notice">没有可展示的兴趣关联。可以自主选择要了解的方向。</p>}
      {!!report.outside_directory.length && <p className="notice mt-5">目录之外的兴趣职业 {report.outside_directory.length} 条，未强制归入九个方向。</p>}
      <Link href="/explore" className="button secondary mt-7">浏览三大方向与九个细分</Link><Link href="/studio/ecg" className="button mt-3">体验 AI 模型评价 →</Link>
      {mode !== "empty" && <button className="button secondary mt-3" onClick={() => download("limen-r1-evidence-draft.json", JSON.stringify({ ...report, simulation: mode === "simulation", limitation: "规则证据草案，AI未生成；不代表报考资格" }, null, 2))}>导出证据草案</button>}
    </aside></div><p className="mt-10 text-sm muted">本报告是探索辅助，不代表报考资格。以上为规则证据整理；实际 AI 解释的生成状态在下方独立显示。</p>
    <AiReport kind="R1" />
  </main>;
}
