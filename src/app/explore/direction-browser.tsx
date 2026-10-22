"use client";
import Link from "next/link";
import { useState } from "react";
import { handbookEntries, type HandbookDirectionId } from "@/lib/handbook";
import { directions, findDirection, groups, occupationUrl } from "@/lib/directions";
import { OfficialDossier } from "./official-dossier";
import { MedicineBrowser } from "./medicine-browser";
const interdisciplinaryGroups = groups.filter(group => group.id !== "medicine");

export function DirectionBrowser({ initialDirection }: { initialDirection?: string }) {
  const [selected, setSelected] = useState(initialDirection !== "medicine" ? findDirection(initialDirection ?? "")?.id ?? directions[0].id : directions[0].id);
  const [compare, setCompare] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [medicine, setMedicine] = useState(initialDirection === "medicine");
  const current = findDirection(selected)!;
  const handbook = handbookEntries[current.id as HandbookDirectionId];
  const compared = compare.map((id) => findDirection(id)!);
  function toggle(id: string) {
    if (compare.includes(id)) setCompare(compare.filter((value) => value !== id));
    else if (compare.length === 2) setMessage("一次可对比两个方向，请先移除其中一个。");
    else { setCompare([...compare, id]); setMessage(""); }
  }
  return <>
    <p className="eyebrow">DIRECTION HANDBOOK · 方向手册</p><h1 className="mt-3 text-3xl font-semibold">从真实任务理解一个方向</h1>
    <p className="mt-4 max-w-3xl leading-7 muted">查阅中国官方专业、职业、招生和就业资料，认识九个跨学科方向，也可以继续了解医学专业与临床科室。</p>
    <div className="mt-5 flex flex-wrap gap-3" aria-label="知识手册范围"><button className={`button ${medicine ? "secondary" : ""}`} aria-pressed={!medicine} onClick={() => setMedicine(false)}>九个跨学科方向</button><button className={`button ${medicine ? "" : "secondary"}`} aria-pressed={medicine} onClick={() => setMedicine(true)}>医学与医院职业</button></div>
    {medicine ? <MedicineBrowser /> : <>
    <div className="mt-9 grid gap-9 md:grid-cols-[224px_1fr]">
      <nav aria-label="跨学科方向目录" className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 md:sticky md:top-24 md:self-start">{interdisciplinaryGroups.map((group) => <section key={group.id}><h2 className="text-sm font-semibold muted">{group.name}</h2><ul className="mt-2 space-y-1">{group.specializations.map((item) => <li key={item.id}><button className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${selected === item.id ? "bg-blue-50 font-semibold text-blue-900" : "hover:bg-slate-100"}`} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>{item.name}</button></li>)}</ul></section>)}</nav>
      <article aria-live="polite" className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm muted">{current.group_name}</p><h2 className="mt-2 text-3xl font-semibold">{current.name}</h2></div><button className="button secondary" onClick={() => toggle(current.id)}>{compare.includes(current.id) ? "移出对比" : "加入对比"}（{compare.length}/2）</button></div>
        <OfficialDossier key={current.id} directionId={current.id} />
        <p className="mt-8 text-xs muted">以下为 LIMEN 编辑的方向解读和模拟入门项目；官方事实请展开上方来源核对。</p>
        <p className="mt-6 text-base leading-8 muted">{handbook.overview}</p><nav aria-label="本方向阅读导航" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-y border-slate-200 py-3 text-sm"><a href="#daily-work">日常工作</a><a href="#starter-project">动手试试</a><a href="#preparation">入门准备</a><a href="#reading">延伸阅读</a></nav>
        <section id="daily-work" className="mt-8 scroll-mt-24"><h3 className="text-lg font-semibold">一天的工作如何展开</h3><ol className="mt-4 space-y-4">{handbook.daily_work.map((task, i) => <li key={task} className="flex gap-4 text-sm leading-7"><span className="text-blue-600 font-semibold">0{i + 1}</span><span>{task}</span></li>)}</ol></section>
        <section id="starter-project" className="mt-8 scroll-mt-24 rounded-2xl border border-blue-100 bg-blue-50/50 p-5 sm:p-7"><p className="eyebrow">TRY IT YOURSELF</p><h3 className="text-lg font-semibold mt-2">{handbook.starter_project.title}</h3><p className="mt-3 text-sm leading-7">{handbook.starter_project.question}</p><p className="mt-3 text-sm leading-7 muted">准备材料：{handbook.starter_project.inputs}</p><ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7">{handbook.starter_project.steps.map(step => <li key={step}>{step}</li>)}</ol><h4 className="mt-5 font-medium text-sm">留下一个可检查的成果</h4><p className="mt-2 text-sm leading-7">{handbook.starter_project.deliverable}</p><ul className="mt-3 list-disc pl-5 text-sm leading-7">{handbook.starter_project.checks.map(check => <li key={check}>{check}</li>)}</ul></section>
        <section id="preparation" className="mt-8 scroll-mt-24"><h3 className="font-semibold">开始前，先了解这些</h3><ul className="mt-3 list-disc pl-5 text-sm leading-7">{handbook.prerequisites.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section className="mt-8"><h3 className="text-lg font-semibold">会解决什么问题</h3><p className="mt-2 text-sm muted">从以下研究与应用问题切入。</p><ul className="mt-4 list-disc space-y-3 pl-5 leading-7">{current.work_tasks.map((task) => <li key={task}>{task}</li>)}</ul></section>
        <div className="mt-8 grid gap-7 sm:grid-cols-2"><section><h3 className="font-semibold">需要逐步了解的技能</h3><ul className="mt-3 space-y-2">{current.skills.map((skill) => <li key={skill} className="border-b border-slate-200 pb-2 text-sm">{skill}</li>)}</ul></section><section><h3 className="font-semibold">可作为起点的课程</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">{current.courses.map((course) => <li key={course}>{course}</li>)}</ol><p className="mt-3 text-xs muted">入门参考课程；具体先修要求请查阅课程说明。</p></section></div>
        <section className="mt-8 border-t border-slate-200 pt-6"><h3 className="font-semibold">医学背景可能提供的起点</h3><p className="mt-3 leading-7">{current.medical_transfer.join("；")}。</p><p className="mt-2 text-sm muted">回看相关课程和项目，找到能够支持这些积累的具体成果。</p></section>
        <section id="reading" className="mt-8 scroll-mt-24 border-t border-slate-200 pt-6"><h3 className="font-semibold">延伸阅读与实践资料</h3><ul className="mt-4 space-y-4">{handbook.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="text-sm font-medium">{source.title} ↗</a><p className="mt-1 text-sm leading-6 muted">{source.purpose}</p></li>)}</ul></section><section className="mt-8 border-t border-slate-200 pt-6"><h3 className="font-semibold">代表职业与映射来源</h3><p className="mt-2 text-xs leading-6 muted">职业信息来自 O*NET；与国内研究方向的关联由 LIMEN 编辑。</p><ul className="mt-3 space-y-3">{current.onet.map((occupation) => <li key={occupation.code} className="flex flex-wrap justify-between gap-2 text-sm"><a href={occupationUrl(occupation.code)} target="_blank" rel="noreferrer" className="underline">{occupation.name} ↗</a><span className="muted">SOC {occupation.code} · {({ direct: "直接关联", related: "相关关联", adjacent: "邻近关联" } as Record<string, string>)[occupation.relationship]}</span></li>)}</ul></section>
        <section className="notice mt-8 text-sm leading-7"><h3 className="font-semibold">报考前核对</h3><p>上方“院校招生”提供带年份的官方目录与章程。医学本科能否报考具体项目、院系加试和当年计划仍须逐项核对；往年资料仅作参考。</p></section>
        <div className="mt-7 flex flex-wrap gap-3"><Link href={`/experience?direction=${current.id}`} className="button">进入职业体验</Link><Link href={`/report/plan?direction=${current.id}`} className="button secondary">将此方向作为规划目标</Link></div>
      </article>
    </div>
    <section className="mt-12 border-t border-slate-200 pt-7" aria-labelledby="comparison"><h2 id="comparison" className="text-xl font-semibold">方向对比</h2><p role="status" className="mt-3 text-sm muted">{message || (compare.length < 2 ? `已选择 ${compare.length}/2 个方向。请选择两个不同方向，查看任务与课程差异。` : "比较任务、技能和课程，找出你更想尝试的活动。")}</p>
      {compared.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{compared.map((item) => <button key={item.id} onClick={() => toggle(item.id)} className="rounded border border-slate-300 px-3 py-2 text-sm">{item.name} · 移除</button>)}</div>}
      {compared.length === 2 && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[600px] border-collapse text-left text-sm"><thead><tr><th className="p-3">比较维度</th>{compared.map((item) => <th key={item.id} className="p-3">{item.name}</th>)}</tr></thead><tbody>{([['典型任务', 'work_tasks'], ['技能', 'skills'], ['课程', 'courses'], ['医学迁移线索', 'medical_transfer']] as const).map(([label, key]) => <tr key={key} className="border-t border-slate-200"><th className="p-3 align-top font-medium">{label}</th>{compared.map((item) => <td className="p-3 align-top leading-7" key={item.id}>{item[key].join("；")}</td>)}</tr>)}</tbody></table></div>}
    </section>
    </>}
  </>;
}
