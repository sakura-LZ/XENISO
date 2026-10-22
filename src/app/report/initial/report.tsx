"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { type AssessmentResult } from "@/lib/assessment";
import { emptyProfile, profileSchema, type Profile } from "@/lib/profile";
import { initialReport } from "@/lib/reports";
import { occupationUrl } from "@/lib/directions";
import { EvidenceTable } from "@/components/evidence-table";
import { download } from "@/lib/download";
import { AiReport } from "@/components/ai-report";
import { snapshotSource, translation } from "@/lib/onet/translation";
import { readProfileOverview } from "@/lib/profile-overview";

const areaLabels: Record<string, string> = { realistic: "R 实作型", investigative: "I 研究型", artistic: "A 艺术型", social: "S 社会型", enterprising: "E 企业型", conventional: "C 常规型" };
const activityGuide: Record<string, string> = { realistic: "制作、装配与操作实物", investigative: "观察现象、提出问题与实验研究", artistic: "创作文字、音乐与视觉表达", social: "帮助、教学与支持他人", enterprising: "组织、协商与推动事务", conventional: "整理记录、按程序处理信息" };
export function InitialReport() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [mode, setMode] = useState<"empty" | "simulation" | "personal">("empty");
  const [message, setMessage] = useState("正在读取画像与测评…");
  const [busy, setBusy] = useState(false);
  const report = initialReport(profile, assessment);
  const load = useCallback(async (personal: boolean) => {
    setBusy(true); setAssessment(null); setProfile(emptyProfile); setMode("empty");
    try {
      if (!personal) {
        const value = JSON.parse(localStorage.getItem("limen:simulation:profile:v1") ?? "null");
        if (value?.simulation !== true) throw new Error("请先在个人画像保存合成演示草稿。");
        setProfile(profileSchema.parse(value.profile)); setMode("simulation"); setMessage("已载入演示画像；完成 O*NET 测评后可生成个人结果。");
      } else {
        const data = await readProfileOverview(fetch, AbortSignal.timeout(30000));
        setProfile(data.profile ?? emptyProfile); setAssessment(data.assessment); setMode(data.profile ? "personal" : "empty"); setMessage(data.assessment ? "" : "完成个人画像与职业兴趣后，查看初步评价。");
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : "读取失败。"); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => { void load(true); }, 0); return () => clearTimeout(timer); }, [load]);
  return <main id="main" className="shell xn-report-page py-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="mt-2 text-3xl font-semibold">初步评价</h1><p className="mt-2 text-sm muted">兴趣、能力迁移与探索方向。</p></div><button className="button secondary" disabled={busy} onClick={() => load(true)}>刷新资料</button></div>{message && <p className="inline-feedback mt-4" role="status">{message}</p>}
    <div className="mt-8 grid gap-10 lg:grid-cols-[1.65fr_1fr]"><div className="min-w-0"><section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-xl font-semibold">职业活动兴趣</h2><span className="text-sm muted">O*NET Mini-IP · 六个维度</span></div>{!assessment ? <p className="mt-4 leading-7 muted">完成<Link href="/assessment">兴趣测评</Link>后，这里会显示你的结果。也可以先浏览<Link href="/explore">方向手册</Link>。</p> : <><dl className="mt-5 grid gap-x-8 sm:grid-cols-2">{assessment.scores.map((score) => <div key={score.code} className="flex justify-between border-b border-slate-200 py-3"><dt>{areaLabels[score.code]}</dt><dd className="font-semibold tabular-nums">{score.score}</dd></div>)}</dl><p className="mt-4 text-sm muted">原始兴趣数值，不代表能力或百分位。版本 {assessment.onet_version} · {assessment.returned_at}</p><details className="mt-4"><summary>查看官方职业匹配</summary><ul className="mt-3 space-y-3 text-sm">{assessment.careers.map((c) => <li key={c.code}><a href={`https://www.onetonline.org/link/summary/${c.code}`} target="_blank" rel="noreferrer">{c.title} · {c.code}</a></li>)}</ul><p className="mt-3 text-sm muted">本页展示 {assessment.careers.length} 条，共返回 {assessment.career_total} 条。</p></details></> }</section>
      <details className="mt-6"><summary>理解六类兴趣与工作活动</summary><p className="mt-3 text-sm leading-7 muted">以下为 LIMEN 对题目活动的简要说明，不是个人测评结论。兴趣表示对活动的喜好，不代表已经掌握技能。</p><dl className="mt-4 space-y-4 text-sm">{Object.entries(areaLabels).map(([area, label]) => { const example = translation.items.find((item) => item.area === area); return <div key={area}><dt className="font-medium">{label}</dt><dd className="mt-1 leading-7">{activityGuide[area]}。题目示例：{example?.zh}（原题 {example?.index}：{example?.original_en}）。</dd></div>; })}</dl><p className="mt-3 text-sm muted">活动示例来源：<a href={snapshotSource} target="_blank" rel="noreferrer">O*NET Mini-IP 2016 文档附录 A</a>；中文译稿 {translation.version}，待人工复核。</p></details>
      {mode !== "empty" && <section className="mt-9 border-t pt-7"><h2 className="text-xl font-semibold">学习与科研背景</h2><p className="mt-3 text-sm leading-7">{profile.school || "院校未填写"} · {profile.major || "专业未填写"} · {profile.grade || "年级未填写"}<br />GPA：{profile.gpa === null ? "未知" : `${profile.gpa}/${profile.gpa_scale}`}；排名：{profile.rank === null ? "未知" : `${profile.rank}/${profile.cohort_size}`}。课程 {profile.courses.length} 条、研究项目 {profile.research_projects.length} 条、论文记录 {profile.papers.length} 条。</p><p className="mt-2 text-sm muted">来自你的个人画像，尚未经独立核验。</p></section>}
      <section className="mt-9 border-t pt-7"><h2 className="text-xl font-semibold">能力迁移</h2><p className="mt-3 text-sm muted">{mode === "empty" ? "尚未读取资料" : `${profile.nickname} · ${profile.major} · ${profile.grade}`} · 按具体课程与项目整理。</p><EvidenceTable rows={report.evidence} /></section>
      <details className="mt-8 border-t pt-7"><summary className="text-lg font-semibold">下一步需要补充的线索</summary><ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6">{report.unknowns.map((s) => <li key={s}>{s}</li>)}</ul></details>
    </div><aside className="min-w-0 self-start rounded-2xl border border-blue-100 bg-blue-50/50 p-5 sm:p-6"><h2 className="mt-2 text-xl font-semibold">值得亲自探索</h2><p className="mt-2 text-sm leading-6 muted">按职业活动关联整理，作为比较起点；方向映射由 LIMEN 编辑。</p>{report.candidates.length ? report.candidates.map(({ direction, occupations }) => <article key={direction.id} className="mt-5 border-t border-blue-200 pt-5"><Link href={`/explore?direction=${direction.id}`} className="font-semibold">{direction.name}</Link><ul className="mt-3 text-sm leading-7">{occupations.map((o) => <li key={o.code}><a href={occupationUrl(o.code)} target="_blank" rel="noreferrer">{o.name} · {o.code}</a><br /><span className="muted">{({ direct: "直接关联", related: "相关关联", adjacent: "邻近关联" } as Record<string, string>)[o.relationship] ?? o.relationship}</span></li>)}</ul><p className="mt-3 text-sm">试试看：{direction.work_tasks[0]}</p></article>) : <p className="mt-5 text-sm leading-7">这次匹配未指向手册内的方向。可以先选择一个感兴趣的职业任务，亲自体验。</p>}
      {!!report.outside_directory.length && <p className="mt-4 text-xs leading-6 muted">另有 {report.outside_directory.length} 个匹配职业在当前手册之外，可展开本页“查看官方职业匹配”了解。</p>}
      <Link href="/experience" className="button mt-7">选择职业体验 →</Link><Link href="/explore" className="button secondary mt-3">查阅方向手册</Link>
      {mode !== "empty" && <button className="button secondary mt-3" onClick={() => download("limen-r1-evidence-draft.json", JSON.stringify({ ...report, simulation: mode === "simulation", limitation: "规则证据草案，AI未生成；不代表报考资格" }, null, 2))}>导出画像与来源</button>}
    </aside></div>
    <AiReport key={JSON.stringify([profile, assessment, mode, busy])} kind="R1" enabled={!busy && mode === "personal" && !!assessment} />
  </main>;
}
