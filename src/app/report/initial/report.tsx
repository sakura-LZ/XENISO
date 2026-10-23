"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { type AssessmentResult } from "@/lib/assessment";
import { emptyProfile, profileSchema, type Profile } from "@/lib/profile";
import { initialReport } from "@/lib/reports";
import { occupationUrl } from "@/lib/directions";
import { InterestBars, ReportReveal, SectionNav } from "../../profile/report-visuals";
import { download } from "@/lib/download";
import { AiReport } from "@/components/ai-report";
import { DirectionArt, StorysetAttribution } from "@/components/direction-art";
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
    } catch (error) { setMessage(error instanceof Error && !["TimeoutError", "AbortError", "TypeError", "SyntaxError", "ZodError"].includes(error.name) ? error.message : "资料读取或校验失败，请刷新资料重试。"); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => { void load(true); }, 0); return () => clearTimeout(timer); }, [load]);
  const sections = [{ id: "initial-interest", label: "职业活动兴趣" }, { id: "initial-evidence", label: "医学经历与迁移" }, { id: "initial-directions", label: "值得尝试的方向" }, { id: "initial-unknowns", label: "待补充线索" }, { id: "initial-explanation", label: "解释与下一步" }];
  function exportEvidence() { download("limen-r1-evidence-draft.json", JSON.stringify({ ...report, simulation: mode === "simulation", limitation: "规则证据草案，AI未生成；不代表报考资格" }, null, 2)); }
  return <main id="main" className="shell xn-report-page pr-report-page">
    <ReportReveal motion="M-I01"><header className="pr-heading pr-report-heading"><h1>初步评价</h1><div className="pr-actions"><button className="button secondary" disabled={busy} onClick={() => load(true)}>刷新资料</button><button className="button secondary" disabled={mode === "empty" || busy} onClick={exportEvidence}>导出画像与来源</button></div></header></ReportReveal>
    {message && <p className="inline-feedback" role="status">{message}</p>}
    <div className="pr-report-layout"><SectionNav items={sections} motion="M-I01" /><div className="pr-report-body">
      <section id="initial-interest" className="pr-report-section"><h2>职业活动兴趣</h2>{!assessment ? <div className="pr-empty-state"><p>尚无官方兴趣结果。</p><Link href="/assessment" className="button">开始问卷</Link><Link href="/explore" className="pr-text-link">浏览方向手册</Link></div> : <div className="pr-interest-layout"><InterestBars scores={assessment.scores} motion="M-I02" /><div className="pr-interest-explanation"><h3>O*NET Mini-IP</h3><p>六个维度描述你对不同工作活动的喜好。</p><details data-motion="M-I06"><summary>原始结果与职业来源</summary><p className="pr-source">版本 {assessment.onet_version}<br />返回时间 {assessment.returned_at}</p><ul className="pr-source-list">{assessment.careers.map(c => <li key={c.code}><a href={`https://www.onetonline.org/link/summary/${c.code}`} target="_blank" rel="noreferrer">{c.title} · {c.code}</a></li>)}</ul><p className="pr-source">展示 {assessment.careers.length} 条，共返回 {assessment.career_total} 条。</p></details></div></div>}
      <details className="pr-details" data-motion="M-I06"><summary>理解六类兴趣与工作活动</summary><p className="pr-source">以下是题目活动说明，尚无个人结果时不作为测评结论。</p><dl className="pr-activity-guide">{Object.entries(areaLabels).map(([area, label]) => { const example = translation.items.find(item => item.area === area); return <div key={area}><dt>{label}</dt><dd>{activityGuide[area]}。题目示例：{example?.zh}（原题 {example?.index}：<span lang="en">{example?.original_en}</span>）。</dd></div>; })}</dl><p className="pr-source">活动来源：<a href={snapshotSource} target="_blank" rel="noreferrer">O*NET Mini-IP 2016 附录 A</a>；中文译稿 {translation.version}，待人工复核。</p></details></section>
      <section id="initial-evidence" className="pr-report-section"><h2>医学经历与能力迁移</h2>{mode !== "empty" ? <p className="pr-reading-width">{profile.school || "院校未填写"} · {profile.major || "专业未填写"} · {profile.grade || "年级未填写"}<br />课程 {profile.courses.length} 条、研究项目 {profile.research_projects.length} 条、论文记录 {profile.papers.length} 条。来自本人填写，未独立核验。</p> : <p>尚未读取个人经历。<Link href="/profile/basics">填写医学经历</Link>。</p>}
      {report.evidence.length ? <div className="pr-evidence-relations"><div className="pr-evidence-head" aria-hidden="true"><span>本人经历</span><span>可能相关的任务</span><span>支持证据</span></div>{report.evidence.map((row, index) => <ReportReveal motion="M-I03" delay={Math.min(index,3)*80} key={row.ref}><article className="pr-evidence-relation"><h3>{row.skill}</h3><p>具体任务关联待核验</p><details><summary>{row.status}</summary><p>{row.evidence}</p><Link href="/profile/basics">核对个人画像记录</Link></details></article></ReportReveal>)}</div> : <p className="pr-empty-state">尚无课程、技能或项目记录，暂不推断能力。</p>}</section>
      <section id="initial-directions" className="pr-report-section"><h2>值得尝试的方向</h2><p className="pr-source">以下是 LIMEN 对 O*NET 职业活动的编辑性映射，用于探索，不代表报考资格。</p>{report.candidates.length ? report.candidates.map(({ direction, occupations }, index) => <ReportReveal motion="M-I04" delay={Math.min(index,4)*60} key={direction.id}><article className="pr-direction-row"><DirectionArt direction={direction.id} compact /><div><h3><Link href={`/explore?direction=${direction.id}`}>{direction.name}</Link></h3><p>{direction.work_tasks[0]}</p><details><summary>职业关联与来源</summary><ul>{occupations.map(o => <li key={o.code}><a href={occupationUrl(o.code)} target="_blank" rel="noreferrer">{o.name} · {o.code}</a> · {({ direct: "直接关联", related: "相关关联", adjacent: "邻近关联" } as Record<string,string>)[o.relationship] ?? o.relationship}</li>)}</ul></details></div></article></ReportReveal>) : <p className="pr-empty-state">{assessment ? "这次职业匹配未指向手册内的方向，可以从具体工作任务开始了解。" : "完成官方兴趣问卷后，可查看关联方向。"}</p>}
      {!!report.outside_directory.length && <p className="pr-source">另有 {report.outside_directory.length} 个匹配职业在当前手册之外，可展开“原始结果与职业来源”了解。</p>}{report.candidates.length > 0 && <StorysetAttribution />}</section>
      <section id="initial-unknowns" className="pr-report-section"><h2>需要补充的线索</h2><details className="pr-details" data-motion="M-I05"><summary>已有记录与仍缺少的信息</summary><div className="pr-two-columns"><div><h3>已有记录</h3><p>{report.evidence.length ? `${report.evidence.length} 条课程、技能与项目记录，未独立验证。` : "尚无课程、技能与项目记录。"}</p><p>{assessment ? "已保存 O*NET 官方兴趣结果。" : "尚无官方兴趣结果。"}</p></div><div><h3>仍缺少的信息</h3><ul>{report.unknowns.map(item => <li key={item}>{item}</li>)}</ul></div></div></details></section>
      <section id="initial-explanation" className="pr-report-section" data-motion="M-I06"><h2>解释与下一步</h2><p className="pr-source">上方为规则整理。AI 解读需主动生成，生成后可单独导出解释与证据。</p><AiReport key={JSON.stringify([profile, assessment, mode, busy])} kind="R1" enabled={!busy && mode === "personal" && !!assessment} /><div className="pr-report-next"><Link href="/experience" className="button">选择职业体验 →</Link></div></section>
    </div></div>
  </main>;
}
