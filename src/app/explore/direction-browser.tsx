"use client";
import Link from "next/link";
import { useState } from "react";
import { directions, findDirection, groups, occupationUrl } from "@/lib/directions";

export function DirectionBrowser({ initialDirection }: { initialDirection?: string }) {
  const [selected, setSelected] = useState(findDirection(initialDirection ?? "")?.id ?? directions[0].id);
  const [compare, setCompare] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const current = findDirection(selected)!;
  const compared = compare.map((id) => findDirection(id)!);
  function toggle(id: string) {
    if (compare.includes(id)) setCompare(compare.filter((value) => value !== id));
    else if (compare.length === 2) setMessage("一次可对比两个方向，请先移除其中一个。");
    else { setCompare([...compare, id]); setMessage(""); }
  }
  return <>
    <p className="eyebrow">公开研究手册 / 3 大方向 · 9 个细分方向</p><h1 className="mt-3 text-3xl font-semibold">从真实任务理解一个方向</h1>
    <p className="mt-4 max-w-3xl leading-7 muted">先看日常工作，再看技能与课程。职业与国内研究方向的关联由 LIMEN 编辑，不是 O*NET 官方考研专业推荐。</p>
    <div className="mt-9 grid gap-9 md:grid-cols-[224px_1fr]">
      <nav aria-label="跨学科方向目录" className="space-y-6 md:border-r md:border-slate-200 md:pr-4">{groups.map((group) => <section key={group.id}><h2 className="text-sm font-semibold muted">{group.name}</h2><ul className="mt-2 space-y-1">{group.specializations.map((item) => <li key={item.id}><button className={`w-full rounded px-3 py-2 text-left text-sm ${selected === item.id ? "bg-blue-50 font-semibold text-blue-900" : "hover:bg-slate-100"}`} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>{item.name}</button></li>)}</ul></section>)}</nav>
      <article aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm muted">{current.group_name}</p><h2 className="mt-2 text-2xl font-semibold">{current.name}</h2></div><button className="button secondary" onClick={() => toggle(current.id)}>{compare.includes(current.id) ? "移出对比" : "加入对比"}（{compare.length}/2）</button></div>
        <section className="mt-8"><h3 className="text-lg font-semibold">会解决什么问题</h3><p className="mt-2 text-sm muted">以下为 LIMEN 对相关研究活动的编辑归纳。</p><ul className="mt-4 list-disc space-y-3 pl-5 leading-7">{current.work_tasks.map((task) => <li key={task}>{task}</li>)}</ul></section>
        <div className="mt-8 grid gap-7 sm:grid-cols-2"><section><h3 className="font-semibold">需要逐步了解的技能</h3><ul className="mt-3 space-y-2">{current.skills.map((skill) => <li key={skill} className="border-b border-slate-200 pb-2 text-sm">{skill}</li>)}</ul></section><section><h3 className="font-semibold">可作为起点的课程</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">{current.courses.map((course) => <li key={course}>{course}</li>)}</ol><p className="mt-3 text-xs muted">建议了解的课程，不代表任一学校的统一报考要求。</p></section></div>
        <section className="mt-8 border-t border-slate-200 pt-6"><h3 className="font-semibold">医学背景可能提供的起点</h3><p className="mt-3 leading-7">{current.medical_transfer.join("；")}。</p><p className="mt-2 text-sm muted">需要结合你实际的课程和项目证据确认，不能仅凭医学生身份认定已掌握。</p></section>
        <section className="mt-8 border-t border-slate-200 pt-6"><h3 className="font-semibold">代表职业与原始来源</h3><ul className="mt-3 space-y-3">{current.onet.map((occupation) => <li key={occupation.code} className="flex flex-wrap justify-between gap-2 text-sm"><a href={occupationUrl(occupation.code)} target="_blank" rel="noreferrer" className="underline">{occupation.name} ↗</a><span className="muted">SOC {occupation.code} · {({ direct: "直接关联", related: "相关关联", adjacent: "邻近关联" } as Record<string, string>)[occupation.relationship]}</span></li>)}</ul></section>
        <section className="notice mt-8 text-sm leading-7"><h3 className="font-semibold">升学项目：待核验</h3><p>目录目前没有已核验的具体招生项目。请以目标年份院校正式招生简章为准；这里不推断跨专业资格。</p></section>
        <div className="mt-7 flex flex-wrap gap-3"><Link href="/studio/ecg" className="button">体验心电预警工作台</Link><Link href={`/report/plan?direction=${current.id}`} className="button secondary">将此方向作为规划目标</Link></div>
      </article>
    </div>
    <section className="mt-12 border-t border-slate-200 pt-7" aria-labelledby="comparison"><h2 id="comparison" className="text-xl font-semibold">方向对比</h2><p role="status" className="mt-3 text-sm muted">{message || (compare.length < 2 ? `已选择 ${compare.length}/2 个方向。请选择两个不同方向，查看任务与课程差异。` : "已显示两个方向的差异，关联仍属于 LIMEN 编辑判断。")}</p>
      {compared.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{compared.map((item) => <button key={item.id} onClick={() => toggle(item.id)} className="rounded border border-slate-300 px-3 py-2 text-sm">{item.name} · 移除</button>)}</div>}
      {compared.length === 2 && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[600px] border-collapse text-left text-sm"><thead><tr><th className="p-3">比较维度</th>{compared.map((item) => <th key={item.id} className="p-3">{item.name}</th>)}</tr></thead><tbody>{([['典型任务', 'work_tasks'], ['技能', 'skills'], ['课程', 'courses'], ['医学迁移线索', 'medical_transfer']] as const).map(([label, key]) => <tr key={key} className="border-t border-slate-200"><th className="p-3 align-top font-medium">{label}</th>{compared.map((item) => <td className="p-3 align-top leading-7" key={item.id}>{item[key].join("；")}</td>)}</tr>)}</tbody></table></div>}
    </section>
  </>;
}
