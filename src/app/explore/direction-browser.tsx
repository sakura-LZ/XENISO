"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { handbookEntries, type HandbookDirectionId } from "@/lib/handbook";
import { directions, findDirection, groups, occupationUrl } from "@/lib/directions";
import { OfficialDossier } from "./official-dossier";
import { MedicineBrowser } from "./medicine-browser";

const interdisciplinaryGroups = groups.filter((group) => group.id !== "medicine");

const chapters = [
  { id: "overview", title: "专业特点", category: "occupation" },
  { id: "work", title: "职业日常", category: "recruitment" },
  { id: "skills", title: "能力基础", category: "learning" },
  { id: "practice", title: "学习实践", category: "learning" },
  { id: "admissions", title: "升学准备", category: "admissions" },
  { id: "industry", title: "招聘与行业", category: "industry" },
] as const;
type ChapterId = (typeof chapters)[number]["id"];

const relationshipLabel: Record<string, string> = { direct: "直接关联", related: "相关关联", adjacent: "邻近关联" };

function searchText(id: string, name: string): string {
  const h = handbookEntries[id as HandbookDirectionId];
  return [name, h?.overview ?? "", ...(h?.daily_work ?? []), h?.starter_project?.title ?? ""].join(" ").toLowerCase();
}

export function DirectionBrowser({ initialDirection }: { initialDirection?: string }) {
  const [selected, setSelected] = useState(initialDirection !== "medicine" ? findDirection(initialDirection ?? "")?.id ?? directions[0].id : directions[0].id);
  const [medicine, setMedicine] = useState(initialDirection === "medicine");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [chapter, setChapter] = useState<ChapterId | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const current = findDirection(selected)!;
  const handbook = handbookEntries[current.id as HandbookDirectionId];
  const compared = compare.map((id) => findDirection(id)!);
  const activeChapter = chapter ? chapters.find((c) => c.id === chapter) ?? null : null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return interdisciplinaryGroups
      .filter((g) => groupFilter === "all" || g.id === groupFilter)
      .flatMap((g) => g.specializations)
      .filter((item) => !q || searchText(item.id, item.name).includes(q));
  }, [groupFilter, query]);

  function toggle(id: string) {
    if (compare.includes(id)) setCompare(compare.filter((value) => value !== id));
    else if (compare.length === 2) setMessage("一次可对比两个方向，请先移除其中一个。");
    else { setCompare([...compare, id]); setMessage(""); }
  }
  function pickDirection(id: string) { setMedicine(false); setSelected(id); setChapter(null); }
  function pickMedicine() { if (!medicine) setChapter(null); setMedicine(true); }
  function leaveMedicine() { if (medicine) setChapter(null); setMedicine(false); }
  const chapterNav = <nav className="xn-library-chapters" aria-label="章节">{chapters.map((c, i) => <button key={c.id} className="xn-library-chapter" aria-pressed={chapter === c.id} aria-expanded={chapter === c.id} onClick={() => setChapter(c.id)}><span className="xn-library-chapter-num">0{i + 1}</span><span className="xn-library-chapter-title">{c.title}</span></button>)}</nav>;
  function resetFilters() { setQuery(""); setGroupFilter("all"); }

  return <>
    <header className="xn-page-heading"><h1>信息文库</h1><p className="xn-page-subtitle">职业、升学与实践的原始资料。</p></header>
    <div className="xn-library-strip">
      <div className="xn-library-filterbar xn-library-filterbar-groups">
        <div className="xn-library-filter-groups" role="group" aria-label="方向分组">
          <button className="xn-text-button" aria-pressed={!medicine && groupFilter === "all"} onClick={() => { leaveMedicine(); setGroupFilter("all"); }}>全部</button>
          {interdisciplinaryGroups.map((g) => <button key={g.id} className="xn-text-button" aria-pressed={!medicine && groupFilter === g.id} onClick={() => { leaveMedicine(); setGroupFilter(g.id); }}>{g.name}</button>)}
          <button className="xn-text-button" aria-pressed={medicine} onClick={pickMedicine}>临床工作</button>
        </div>
        <div className="xn-library-search">
          <label className="sr-only" htmlFor="xn-library-search">搜索方向或手册内容</label>
          <input id="xn-library-search" type="search" value={query} placeholder="搜索方向或手册内容" onChange={(e) => { setQuery(e.target.value); leaveMedicine(); }} />
        </div>
      </div>
      {!medicine && <div className="xn-library-filterbar" role="group" aria-label="跨学科方向">
        {visible.length > 0 ? visible.map((item) => <button key={item.id} className="xn-text-button" aria-pressed={selected === item.id} onClick={() => pickDirection(item.id)}>{item.name}</button>)
          : <p role="status" className="text-sm muted">没有匹配的方向。<button className="xn-text-button" onClick={resetFilters}>清空搜索并显示全部</button></p>}
        <button className="xn-text-button" aria-pressed={false} onClick={pickMedicine}>临床工作</button>
      </div>}
    </div>

    {medicine ? <article aria-live="polite" className="min-w-0 mt-8">
        <div className="xn-library-head"><div className="xn-library-title"><div className="xn-library-title-row"><h2>临床工作</h2></div></div></div>
        {chapterNav}
        {activeChapter && <section className="xn-library-read" aria-label={activeChapter.title}>
          <h3 className="xn-library-read-title">{activeChapter.title}</h3>
          <MedicineBrowser />
        </section>}
      </article> : <>
      <article aria-live="polite" className="min-w-0 mt-8">
        <div className="xn-library-head"><div className="xn-library-title"><p className="text-sm muted">{current.group_name}</p><div className="xn-library-title-row"><h2>{current.name}</h2><button className="xn-library-compare" onClick={() => toggle(current.id)}>{compare.includes(current.id) ? "移出对比" : "加入对比"}（{compare.length}/2）</button></div></div><p className="xn-library-overview">{handbook.overview}</p></div>
        {chapterNav}
        {activeChapter && <section className="xn-library-read" aria-label={activeChapter.title}>
          <h3 className="xn-library-read-title">{activeChapter.title}</h3>
          {chapter === "overview" && <>
            <ul className="mt-4 list-disc space-y-3 pl-5 leading-7">{current.work_tasks.map((task) => <li key={task}>{task}</li>)}</ul>
            <h4 className="mt-6 font-semibold">医学背景可能提供的起点</h4><p className="mt-2 leading-7">{current.medical_transfer.join("；")}。</p>
            <h4 className="mt-6 font-semibold">代表职业与映射来源</h4><p className="mt-2 text-xs leading-6 muted">职业信息来自 O*NET；与国内研究方向的关联由 LIMEN 编辑。</p>
            <ul className="mt-3 space-y-3">{current.onet.map((o) => <li key={o.code} className="flex flex-wrap justify-between gap-2 text-sm"><a href={occupationUrl(o.code)} target="_blank" rel="noreferrer" className="underline">{o.name} ↗</a><span className="muted">SOC {o.code} · {relationshipLabel[o.relationship] ?? o.relationship}</span></li>)}</ul>
          </>}
          {chapter === "work" && <ol className="mt-4 space-y-4">{handbook.daily_work.map((task, i) => <li key={task} className="flex gap-4 text-sm leading-7"><span className="font-semibold">0{i + 1}</span><span>{task}</span></li>)}</ol>}
          {chapter === "skills" && <>
            <ul className="mt-3 space-y-2">{current.skills.map((s) => <li key={s} className="text-sm">{s}</li>)}</ul>
            <h4 className="mt-6 font-semibold">开始前，先了解这些</h4><ul className="mt-3 list-disc pl-5 text-sm leading-7">{handbook.prerequisites.map((p) => <li key={p}>{p}</li>)}</ul>
          </>}
          {chapter === "practice" && <>
            <p className="mt-3 text-xs muted">以下为 LIMEN 编辑的模拟入门项目，非官方资料。</p>
            <h4 className="mt-3 font-semibold">{handbook.starter_project.title}</h4><p className="mt-2 text-sm leading-7">{handbook.starter_project.question}</p><p className="mt-2 text-sm leading-7 muted">准备材料：{handbook.starter_project.inputs}</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7">{handbook.starter_project.steps.map((s) => <li key={s}>{s}</li>)}</ol>
            <p className="mt-3 text-sm leading-7">成果：{handbook.starter_project.deliverable}</p><ul className="mt-2 list-disc pl-5 text-sm leading-7">{handbook.starter_project.checks.map((c) => <li key={c}>{c}</li>)}</ul>
            <h4 className="mt-6 font-semibold">可作为起点的课程</h4><ol className="mt-2 list-decimal space-y-2 pl-5 text-sm">{current.courses.map((c) => <li key={c}>{c}</li>)}</ol>
            <h4 className="mt-6 font-semibold">延伸阅读与实践资料</h4><ul className="mt-3 space-y-3">{handbook.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="text-sm font-medium">{s.title} ↗</a><p className="mt-1 text-sm leading-6 muted">{s.purpose}</p></li>)}</ul>
          </>}
          {chapter === "admissions" && <p className="notice mt-4 text-sm leading-7">下方提供带年份的官方目录与章程。医学本科能否报考具体项目（报考资格未知时以院校原文为准）、院系加试和当年计划仍须逐项核对；往年资料仅作参考。</p>}
          {chapter === "industry" && <p className="mt-3 text-sm muted">以下为真实招聘原文与行业统计来源，请展开核对。</p>}
          <OfficialDossier key={`${current.id}:${activeChapter.category}`} directionId={current.id} initialCategory={activeChapter.category} />
        </section>}
        <div className="mt-7 flex flex-wrap gap-3"><Link href={`/experience?direction=${current.id}`} className="button">进入职业体验</Link><Link href={`/report/plan?direction=${current.id}`} className="button secondary">将此方向作为规划目标</Link></div>
      </article>
      <details className="mt-12 border-t border-slate-200 pt-7"><summary className="text-xl font-semibold">方向对比（{compare.length}/2）</summary>
        <p role="status" className="mt-3 text-sm muted">{message || (compare.length < 2 ? `已选择 ${compare.length}/2 个方向。请选择两个不同方向，查看任务与课程差异。` : "比较任务、技能和课程，找出你更想尝试的活动。")}</p>
        {compared.length > 0 && <div className="mt-4 flex flex-wrap gap-3">{compared.map((item) => <button key={item.id} onClick={() => toggle(item.id)} className="xn-text-button">{item.name} · 移除</button>)}</div>}
        {compared.length === 2 && <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[600px] border-collapse text-left text-sm"><thead><tr><th className="p-3">比较维度</th>{compared.map((item) => <th key={item.id} className="p-3">{item.name}</th>)}</tr></thead><tbody>{([["典型任务", "work_tasks"], ["技能", "skills"], ["课程", "courses"], ["医学迁移线索", "medical_transfer"]] as const).map(([label, key]) => <tr key={key} className="border-t border-slate-200"><th className="p-3 align-top font-medium">{label}</th>{compared.map((item) => <td className="p-3 align-top leading-7" key={item.id}>{item[key].join("；")}</td>)}</tr>)}</tbody></table></div>}
      </details>
    </>}
  </>;
}
