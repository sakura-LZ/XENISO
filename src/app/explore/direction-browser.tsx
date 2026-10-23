"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { handbookEntries, type HandbookDirectionId } from "@/lib/handbook";
import { directions, findDirection, groups, occupationUrl, type Direction } from "@/lib/directions";
import { getTemplate } from "@/lib/experience/templates";
import { DirectionArt, StorysetAttribution } from "@/components/direction-art";
import { OfficialDossier } from "./official-dossier";
import { MedicineBrowser } from "./medicine-browser";

const chapters = [
  { id: "overview", title: "专业特点", category: "occupation" },
  { id: "work", title: "职业日常", category: "recruitment" },
  { id: "skills", title: "能力基础", category: "learning" },
  { id: "practice", title: "学习实践", category: "learning" },
  { id: "admissions", title: "升学准备", category: "admissions" },
  { id: "industry", title: "招聘与行业", category: "industry" },
] as const;
type ChapterId = (typeof chapters)[number]["id"];
type LibraryState = { direction: string; view: "directory" | "reading" | "compare"; query: string; group: string; compare: string[] };
export type LibraryParams = { direction?: string | string[]; view?: string | string[]; q?: string | string[]; group?: string | string[]; compare?: string | string[] };
const relationshipLabel: Record<string, string> = { direct: "直接关联", related: "相关关联", adjacent: "邻近关联" };
function parseState(params: LibraryParams): LibraryState {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const direction = findDirection(first(params.direction))?.id ?? "";
  const compare = [...new Set(first(params.compare).split(",").filter(id => findDirection(id)))].slice(0, 2);
  const group = first(params.group);
  return { direction, view: first(params.view) === "compare" ? "compare" : direction ? "reading" : "directory", query: first(params.q).slice(0, 160), group: groups.some(g => g.id === group) ? group : "all", compare };
}
function stateUrl(state: LibraryState) {
  const params = new URLSearchParams();
  if (state.direction && state.view === "reading") params.set("direction", state.direction);
  if (state.view === "compare") params.set("view", "compare");
  if (state.query) params.set("q", state.query);
  if (state.group !== "all") params.set("group", state.group);
  if (state.compare.length) params.set("compare", state.compare.join(","));
  return `/explore${params.size ? `?${params}` : ""}`;
}
function searchText(item: Direction) {
  const h = handbookEntries[item.id as HandbookDirectionId];
  return [item.name, h.overview, ...item.work_tasks, ...h.daily_work].join(" ").toLowerCase();
}
const summaries: Record<string, string> = {
  ml_cv: "划分验证样本，比较模型阈值与错误。", software: "实现医疗流程，验证输入与状态变化。",
  llm_agent: "核对回答依据，设置未知与人工处理路径。", devices: "组合采集与通信方案，验证原型需求。",
  signals: "比较原始与处理波形，检查噪声和误差。", imaging_eng: "检查图像质量，比较处理前后的像素。",
  clinical_data: "整理临床数据，检查变量与数据质量。", health_systems: "梳理医院工作流程，核对字段与交接。",
  med_nlp_kg: "标注医学文本，保留否定与不确定信息。", medicine: "整理信息来源，沟通与核对团队交接。",
};

export function DirectionBrowser({ initialParams = {} }: { initialParams?: LibraryParams }) {
  const [state, setState] = useState(() => parseState(initialParams));
  const [chapter, setChapter] = useState<ChapterId>("overview");
  const [message, setMessage] = useState("");
  const [evidenceSide, setEvidenceSide] = useState<"medical" | "new">("medical");
  const scrollPositions = useRef(new Map<string, number>());
  const directoryVisited = useRef(false);
  const readingAside = useRef<HTMLElement>(null);
  const current = findDirection(state.direction);
  const visible = useMemo(() => directions.filter(item => (state.group === "all" || item.group_id === state.group) && (!state.query.trim() || searchText(item).includes(state.query.trim().toLowerCase()))), [state.group, state.query]);
  const directoryState: LibraryState = { ...state, direction: "", view: "directory" };
  const directoryUrl = stateUrl(directoryState);
  useEffect(() => {
    if (!window.IntersectionObserver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("xn-revealed"); observer.unobserve(entry.target); }
    }), { threshold: .25 });
    const targets = ".xn-work-sequence li:not(.xn-revealed), .xn-practice-steps li:not(.xn-revealed), .xn-practice-result:not(.xn-revealed)";
    document.querySelectorAll(`${!directoryVisited.current ? ".xn-directory-row:not(.xn-revealed), " : ""}${targets}`).forEach(element => observer.observe(element));
    if (state.view === "directory") directoryVisited.current = true;
    return () => observer.disconnect();
  }, [state.view, state.direction, state.query, state.group]);
  useEffect(() => {
    function pop() {
      const next = parseState(Object.fromEntries(new URLSearchParams(window.location.search)));
      setState(next);
      const y = scrollPositions.current.get(stateUrl(next));
      if (y !== undefined) requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "instant" }));
    }
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (state.view !== "reading") return;
    const aside = readingAside.current;
    if (!aside) return;
    function measure() {
      if (!aside) return;
      const top = Number.parseFloat(getComputedStyle(aside).top) || 104;
      aside.classList.toggle("is-tall", aside.getBoundingClientRect().height + top + 24 > window.innerHeight);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(aside); measure();
    window.addEventListener("resize", measure);
    const hash = window.location.hash;
    const frame = requestAnimationFrame(() => {
      if (/^#chapter-(overview|work|skills|practice|admissions|industry)$/.test(hash)) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "instant", block: "start" });
    });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("resize", measure); };
  }, [state.view, state.direction]);
  useEffect(() => {
    if (state.view !== "reading") return;
    let frame = 0;
    function updateChapter() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const threshold = Math.max(160, window.innerHeight / 3);
        let next: ChapterId = "overview";
        for (const entry of chapters) {
          const node = document.getElementById(`chapter-${entry.id}`);
          if (node && node.getBoundingClientRect().top <= threshold) next = entry.id;
        }
        setChapter(previous => previous === next ? previous : next);
      });
    }
    updateChapter();
    window.addEventListener("scroll", updateChapter, { passive: true });
    window.addEventListener("resize", updateChapter);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", updateChapter); window.removeEventListener("resize", updateChapter); };
  }, [state.view, state.direction]);
  function navigate(next: LibraryState, replace = false, preserveScroll = false) {
    const oldUrl = stateUrl(state);
    scrollPositions.current.set(oldUrl, window.scrollY);
    if (state.view === "directory") try { sessionStorage.setItem(`xeniso:library:${oldUrl}`, String(window.scrollY)); } catch { /* Reading remains available without storage. */ }
    const href = stateUrl(next);
    window.history[replace ? "replaceState" : "pushState"](window.history.state, "", href);
    setState(next); setMessage("");
    if (!preserveScroll) {
      let top = next.view === "directory" ? scrollPositions.current.get(href) ?? 0 : 0;
      if (next.view === "directory" && !top) try { top = Number(sessionStorage.getItem(`xeniso:library:${href}`) ?? 0); } catch { /* Optional directory position. */ }
      requestAnimationFrame(() => window.scrollTo({ top, behavior: "instant" }));
    }
  }
  function follow(event: MouseEvent<HTMLAnchorElement>, next: LibraryState) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(next);
  }
  function toggle(id: string) {
    if (!state.compare.includes(id) && state.compare.length === 2) { setMessage("已选择两个方向，请先取消其中一个。"); return; }
    navigate({ ...state, compare: state.compare.includes(id) ? state.compare.filter(value => value !== id) : [...state.compare, id] }, true, true);
  }
  function chapterLink(event: MouseEvent<HTMLAnchorElement>, id: ChapterId) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.history.replaceState(window.history.state, "", `${stateUrl(state)}#chapter-${id}`);
    document.getElementById(`chapter-${id}`)?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
    setChapter(id);
  }
  const chapterNav = <nav className="xn-reading-nav" aria-label="方向章节">{chapters.map((entry, i) => <a key={entry.id} href={`#chapter-${entry.id}`} aria-current={chapter === entry.id ? "location" : undefined} onClick={event => chapterLink(event, entry.id)}><span>0{i + 1}</span>{entry.title}</a>)}</nav>;

  if (state.view === "compare") return <>
    <Link href={directoryUrl} onClick={event => follow(event, directoryState)} className="xn-library-back">← 返回信息文库</Link>
    <header className="xn-library-pagehead"><h1>方向比较</h1></header>
    {state.compare.length !== 2 ? <div className="notice" role="status"><p>请选择两个不同方向后比较。</p><Link className="button mt-4" href={directoryUrl} onClick={event => follow(event, directoryState)}>选择方向</Link></div> : <DirectionComparison selected={state.compare} onChange={(index, id) => { if (state.compare.includes(id)) { setMessage("请选择不同的方向。"); return; } const next = [...state.compare]; next[index] = id; navigate({ ...state, compare: next }, false, true); }} />}
    <p role="status" className="xn-library-status">{message}</p><StorysetAttribution />
  </>;
  if (state.view === "reading" && current) {
    const handbook = handbookEntries[current.id as HandbookDirectionId];
    const template = getTemplate(current.id);
    const medicine = current.id === "medicine";
    const taskChapter = chapter === "work" || chapter === "practice" || chapter === "skills";
    return <>
      <Link href={directoryUrl} onClick={event => follow(event, directoryState)} className="xn-library-back">← 返回信息文库</Link>
      <header className="xn-reading-head" data-motion="M-D01"><p className="xn-library-meta">{current.group_name}</p><h1>{current.name}</h1><p>{handbook.overview}</p><div className="xn-reading-actions"><Link className="button" href={`/experience?direction=${current.id}`}>查看相关任务</Link><label className="xn-compare-check"><input type="checkbox" checked={state.compare.includes(current.id)} onChange={() => toggle(current.id)} />比较此方向</label>{state.compare.length === 2 && <Link className="button secondary" href={stateUrl({ ...state, direction: "", view: "compare" })} onClick={event => follow(event, { ...state, direction: "", view: "compare" })}>比较所选方向</Link>}</div><p role="status" className="xn-library-status">{message}</p></header>
      <div className="xn-reading-layout">
        <aside ref={readingAside} className="xn-reading-aside" data-motion="M-D02">
          <div className="xn-reading-art" data-side={evidenceSide} key={`${current.id}:${chapter}`}><DirectionArt direction={current.id} mode={taskChapter ? "task" : "identity"} chapter={chapter} />{chapter === "skills" && <p key={evidenceSide} className="xn-art-label xn-evidence-label">{evidenceSide === "medical" ? current.medical_transfer[0] : current.skills[0]}</p>}</div>
          <div className="xn-reading-desktop-nav">{chapterNav}</div>
          <details className="xn-reading-mobile-nav"><summary>章节目录 · {chapters.find(item => item.id === chapter)?.title}</summary>{chapterNav}</details>
        </aside>
        <article className="xn-reading-body" key={current.id}>
          <section id="chapter-overview" className="xn-reading-section" data-motion="M-D03"><h2>专业特点</h2><p>{handbook.overview}</p><ul>{current.work_tasks.map(task => <li key={task}>{task}</li>)}</ul><div className="xn-reading-mobile-art"><DirectionArt direction={current.id} /></div>{medicine ? <p>医院科室、招生学科和岗位身份需要分别核对；科室介绍不能证明个人报考、执业或入职资格。</p> : <><h3>代表职业与映射来源</h3><p className="xn-library-meta">职业信息来自 O*NET；与国内研究方向的关联由 LIMEN 编辑，并非 O*NET 官方中国考研专业结论。</p><ul className="xn-source-links">{current.onet.map(o => <li key={o.code}><a href={occupationUrl(o.code)} target="_blank" rel="noreferrer">{o.name} ↗</a><span>SOC {o.code} · {relationshipLabel[o.relationship] ?? o.relationship}</span></li>)}</ul><OfficialDossier directionId={current.id} initialCategory="occupation" chapterMode /></>}</section>
          <section id="chapter-work" className="xn-reading-section" data-active={chapter === "work"} data-motion="M-D04"><h2>职业日常</h2><ol className="xn-work-sequence">{handbook.daily_work.map((task, i) => <li key={task}><span>0{i + 1}</span><p>{task}</p></li>)}</ol><div className="xn-task-relation"><div><h3>输入</h3><p>{template.brief}</p></div><div><h3>处理</h3><p>{template.stages.map(stage => stage.title).join(" → ")}</p></div><div><h3>结果</h3><p>{template.deliverable}</p></div></div><div className="xn-reading-mobile-art"><DirectionArt direction={current.id} mode="task" /></div></section>
          <section id="chapter-skills" className="xn-reading-section" data-motion="M-D05"><h2>能力基础</h2><div className="xn-skill-comparison" data-side={evidenceSide}><div><button aria-pressed={evidenceSide === "medical"} onClick={() => setEvidenceSide("medical")}>医学经历可能提供的起点</button><ul>{current.medical_transfer.map(item => <li key={item}>{item}</li>)}</ul></div><div><button aria-pressed={evidenceSide === "new"} onClick={() => setEvidenceSide("new")}>需要补充与验证的要求</button><ul>{current.skills.map(item => <li key={item}>{item}</li>)}</ul></div></div><h3>入门前的基础</h3><ul>{handbook.prerequisites.map(item => <li key={item}>{item}</li>)}</ul><p className="xn-library-meta">以上为编辑性学习线索；具体要求需对照来源资料与个人作品，不由医学专业名称推断能力。</p></section>
          <section id="chapter-practice" className="xn-reading-section" data-motion="M-D06"><h2>学习实践</h2><p className="xn-library-meta">LIMEN 编辑的入门项目 · simulation</p><h3>{template.title}</h3><p>{template.brief}</p><ol className="xn-practice-steps">{template.stages.map(item => <li key={item.title}><strong>{item.title}</strong><p>{item.question}</p></li>)}</ol><div className="xn-practice-result"><DirectionArt direction={current.id} mode="task" /><div><h3>成果</h3><p>{template.deliverable}</p></div></div><h3>可作为起点的课程</h3><ul>{current.courses.map(item => <li key={item}>{item}</li>)}</ul><h3>延伸阅读与实践资料</h3><ul className="xn-source-links">{handbook.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><p>{source.purpose}</p></li>)}</ul><Link className="button secondary" href={`/experience?direction=${current.id}`}>查看相关任务</Link>{!medicine && <OfficialDossier directionId={current.id} initialCategory="learning" chapterMode />}</section>
          <section id="chapter-admissions" className="xn-reading-section" data-motion="M-D07"><h2>升学准备</h2><p>按院校、项目与招生年份核对专业要求。医学本科能否报考、是否加试及当年计划，以院校原文为准；个人资格未知时保持待核验。</p>{medicine ? <MedicineBrowser initialView="programs" initialCategory="admissions" /> : <OfficialDossier directionId={current.id} initialCategory="admissions" chapterMode />}</section>
          <section id="chapter-industry" className="xn-reading-section" data-motion="M-D08"><h2>招聘与行业</h2><p>核对发布单位、日期与统计对象；单个岗位、院校或年度样本不代表整个行业。</p>{medicine ? <MedicineBrowser initialView="departments" /> : <><OfficialDossier directionId={current.id} initialCategory="recruitment" chapterMode /><OfficialDossier directionId={current.id} initialCategory="industry" chapterMode /></>}</section>
        </article>
      </div><StorysetAttribution />
    </>;
  }
  return <>
    <header className="xn-library-pagehead" data-motion="M-K01"><h1>信息文库</h1><label className="xn-directory-search"><span className="sr-only">搜索方向或工作内容</span><input type="search" placeholder="搜索方向或工作内容" value={state.query} onChange={event => navigate({ ...state, query: event.target.value }, true, true)} /></label></header>
    <div className="xn-directory-layout">
      <aside className="xn-directory-filters"><div className="xn-directory-desktop-filters" role="group" aria-label="方向分类"><button aria-pressed={state.group === "all"} onClick={() => navigate({ ...state, group: "all" }, false, true)}>全部方向</button>{groups.map(group => <button key={group.id} aria-pressed={state.group === group.id} onClick={() => navigate({ ...state, group: group.id }, false, true)}>{group.name}</button>)}</div><label className="xn-directory-mobile-filter">方向分类<select value={state.group} onChange={event => navigate({ ...state, group: event.target.value }, false, true)}><option value="all">全部方向</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label></aside>
      <div className="xn-directory-results" key={`${state.query}:${state.group}`} data-motion="M-K02"><p className="sr-only" role="status">找到 {visible.length} 个方向</p>{visible.length ? <ul>{visible.map(item => { const next: LibraryState = { ...state, view: "reading", direction: item.id }; return <li key={item.id} className="xn-directory-row" data-motion="M-K03"><Link className="xn-directory-link" href={stateUrl(next)} onClick={event => follow(event, next)}><DirectionArt direction={item.id} compact /><span><h2>{item.name}</h2><p>{summaries[item.id]}</p></span></Link><label className="xn-directory-compare" title={`比较${item.name}`}><input type="checkbox" checked={state.compare.includes(item.id)} aria-label={`比较${item.name}`} onChange={() => toggle(item.id)} /><span className="sr-only">比较{item.name}</span></label></li>; })}</ul> : <div role="status" className="xn-library-empty"><p>没有匹配的方向。</p><button className="button secondary" onClick={() => navigate({ ...state, query: "", group: "all" }, true, true)}>清空筛选</button></div>}</div>
    </div>
    <div className="xn-compare-slot" data-motion="M-K04">{state.compare.length > 0 && <div className="xn-compare-tray"><div>{state.compare.map(id => <button key={id} onClick={() => toggle(id)} aria-label={`移除${findDirection(id)!.name}`}>{findDirection(id)!.name}<span aria-hidden="true"> ×</span></button>)}</div>{state.compare.length === 2 ? <Link className="button" href={stateUrl({ ...state, direction: "", view: "compare" })} onClick={event => follow(event, { ...state, direction: "", view: "compare" })}>比较所选方向</Link> : <p>再选择一个方向</p>}</div>}<p className="xn-library-status" role="status">{message}</p></div>
    <StorysetAttribution />
  </>;
}

function DirectionComparison({ selected, onChange }: { selected: string[]; onChange: (index: number, id: string) => void }) {
  const compared = selected.map(id => findDirection(id)!);
  const rows = [
    { title: "实际工作", render: (item: Direction) => <ul>{item.work_tasks.map(value => <li key={value}>{value}</li>)}</ul> },
    { title: "能力基础", render: (item: Direction) => <><h3>医学迁移线索</h3><ul>{item.medical_transfer.map(value => <li key={value}>{value}</li>)}</ul><h3>新要求</h3><ul>{item.skills.map(value => <li key={value}>{value}</li>)}</ul></> },
    { title: "学习实践", render: (item: Direction) => <><p>{getTemplate(item.id).title}</p><p>{getTemplate(item.id).deliverable}</p><Link href={`/experience?direction=${item.id}`}>查看相关任务 →</Link></> },
    { title: "升学条件", render: (item: Direction) => <><p>个人报考资格尚未核定。院校、年份、专业限制与加试要求需逐项核对。</p><a href={`/explore?direction=${item.id}#chapter-admissions`}>核对该方向招生来源 →</a></> },
    { title: "来源", render: (item: Direction) => <><p className="xn-library-meta">方向映射与入门项目为 LIMEN 编辑性整理。</p><ul className="xn-source-links">{handbookEntries[item.id as HandbookDirectionId].sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a><details><summary>资料用途</summary><p>{source.purpose}</p></details></li>)}</ul></> },
  ];
  return <div className="xn-comparison" data-motion="M-V02"><div className="xn-comparison-header" data-motion="M-V01"><div aria-hidden="true" />{compared.map((item, i) => <div key={i} className="xn-comparison-direction"><DirectionArt direction={item.id} compact /><label><span className="sr-only">第{i + 1}个比较方向</span><select value={item.id} onChange={event => onChange(i, event.target.value)}>{directions.map(option => <option key={option.id} value={option.id} disabled={option.id === selected[1 - i]}>{option.name}</option>)}</select></label></div>)}</div>{rows.map(row => <section key={row.title} className="xn-comparison-row"><h2>{row.title}</h2>{compared.map(item => <div key={item.id} className="xn-comparison-cell" data-motion="M-V03"><p className="xn-comparison-mobile-name">{item.name}</p>{row.render(item)}</div>)}</section>)}</div>;
}
