"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { handbookEntries, type HandbookDirectionId } from "@/lib/handbook";
import { directions, findDirection, groups, occupationUrl, type Direction } from "@/lib/directions";
import { getTemplate } from "@/lib/experience/templates";
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
  const current = findDirection(state.direction);
  const visible = useMemo(() => directions.filter(item => (state.group === "all" || item.group_id === state.group) && (!state.query.trim() || searchText(item).includes(state.query.trim().toLowerCase()))), [state.group, state.query]);
  const directoryState: LibraryState = { ...state, direction: "", view: "directory" };
  const directoryUrl = stateUrl(directoryState);

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
    const hash = window.location.hash;
    if (!/^#chapter-(overview|work|skills|practice|admissions|industry)$/.test(hash)) return;
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "instant", block: "start" }));
    return () => cancelAnimationFrame(frame);
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
    if (state.view === "directory") try { sessionStorage.setItem(`xeniso:library:${oldUrl}`, String(window.scrollY)); } catch { /* 没有本地存储也能继续读。 */ }
    const href = stateUrl(next);
    window.history[replace ? "replaceState" : "pushState"](window.history.state, "", href);
    setState(next); setMessage("");
    if (!preserveScroll) {
      let top = next.view === "directory" ? scrollPositions.current.get(href) ?? 0 : 0;
      if (next.view === "directory" && !top) try { top = Number(sessionStorage.getItem(`xeniso:library:${href}`) ?? 0); } catch { /* 目录位置可选。 */ }
      requestAnimationFrame(() => window.scrollTo({ top, behavior: "instant" }));
    }
  }
  function follow(event: MouseEvent<HTMLAnchorElement>, next: LibraryState) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(next);
  }
  function toggle(id: string) {
    if (!state.compare.includes(id) && state.compare.length === 2) { setMessage("已经选了两个方向，先取消一个再选新的。"); return; }
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

  const chapterNav = <nav aria-label="方向章节"><ol className="xnlib-toc">{chapters.map((entry, i) => <li key={entry.id}><a href={`#chapter-${entry.id}`} aria-current={chapter === entry.id ? "location" : undefined} onClick={event => chapterLink(event, entry.id)}><span>第 {i + 1} 章</span>{entry.title}</a></li>)}</ol></nav>;

  if (state.view === "compare") return <>
    <Link href={directoryUrl} onClick={event => follow(event, directoryState)} className="xnlib-back">返回信息文库</Link>
    <header className="xnlib-compare-head">
      <h1>方向比较</h1>
      <p className="xnlib-compare-note">这张表把两个方向的工作、能力缺口和报考条件排在一起，只为方便你对照。它不排优劣，也不给适合度百分比：两条路都有人走通，差别在门槛和起步任务。</p>
    </header>
    {state.compare.length !== 2
      ? <div className="xnlib-empty" role="status"><p>选两个方向才能并排比较。现在只选了一个，或者还没选。</p><Link className="button secondary" href={directoryUrl} onClick={event => follow(event, directoryState)}>回目录选方向</Link></div>
      : <DirectionComparison selected={state.compare} onChange={(index, id) => { if (state.compare.includes(id)) { setMessage("这两个位置不能是同一个方向。"); return; } const next = [...state.compare]; next[index] = id; navigate({ ...state, compare: next }, false, true); }} />}
    <p role="status" className="xnlib-status">{message}</p>
  </>;

  if (state.view === "reading" && current) {
    const handbook = handbookEntries[current.id as HandbookDirectionId];
    const template = getTemplate(current.id);
    const medicine = current.id === "medicine";
    return <>
      <Link href={directoryUrl} onClick={event => follow(event, directoryState)} className="xnlib-back">返回信息文库</Link>
      <header className="xnlib-file-head" data-atlas-reveal>
        <h1>{current.name}</h1>
        <div className="xnlib-file-meta">
          <span className="atlas-chip">{current.group_name}</span>
          {current.onet.length
            ? current.onet.map(item => <a className="atlas-chip" key={item.code} href={occupationUrl(item.code)} target="_blank" rel="noreferrer">SOC {item.code}</a>)
            : <span className="atlas-chip">不适用 O*NET 职业条目</span>}
          <span className="atlas-chip" data-tone="ok">资料按来源逐条标注</span>
        </div>
        <p className="xnlib-file-lede">{handbook.overview}</p>
        <div className="xnlib-file-actions">
          <Link className="button secondary" href={`/experience?direction=${current.id}`}>看这个方向的练习任务</Link>
          <label className="xnlib-check"><input type="checkbox" checked={state.compare.includes(current.id)} onChange={() => toggle(current.id)} />加入比较</label>
          {state.compare.length === 2 && <Link className="text-action" href={stateUrl({ ...state, direction: "", view: "compare" })} onClick={event => follow(event, { ...state, direction: "", view: "compare" })}>比较已选的两个方向</Link>}
        </div>
        <p role="status" className="xnlib-status">{message}</p>
      </header>
      <div className="xnlib-file-layout">
        <aside className="xnlib-file-aside">
          <div className="atlas-sheet xnlib-cover">
            <p className="xnlib-cover-name">{current.name}</p>
            <dl className="atlas-kv">
              <div><dt>分类</dt><dd>{current.group_name}</dd></div>
              <div><dt>职业条目</dt><dd>{current.onet.length ? current.onet.map(item => item.code).join(" / ") : "不适用"}</dd></div>
              <div><dt>来源</dt><dd>O*NET 与站内资料库，逐条标抓取时间</dd></div>
            </dl>
          </div>
          {chapterNav}
        </aside>
        <article className="xnlib-file-body">
          <section id="chapter-overview" className="xnlib-file-section" data-atlas-reveal>
            <h2>专业特点</h2>
            <p>{handbook.overview}</p>
            <ul className="xnlib-plain-list">{current.work_tasks.map(task => <li key={task}>{task}</li>)}</ul>
            {medicine ? <p className="xnlib-note">医院科室、招生学科和岗位身份要分开核对。科室介绍不能证明个人的报考、执业或入职资格。</p> : <>
              <h3>对应到哪些职业</h3>
              <p className="xnlib-note">职业信息来自 O*NET；这些职业与国内研究方向怎么对应，是 LIMEN 编辑整理的，不是 O*NET 官方对中国考研专业的结论。</p>
              <ul className="xnlib-sources">{current.onet.map(item => <li key={item.code}><a href={occupationUrl(item.code)} target="_blank" rel="noreferrer">{item.name}</a><span className="xnlib-source-code">SOC {item.code} · {relationshipLabel[item.relationship] ?? item.relationship}</span></li>)}</ul>
              <OfficialDossier directionId={current.id} initialCategory="occupation" chapterMode />
            </>}
          </section>
          <section id="chapter-work" className="xnlib-file-section" data-atlas-reveal>
            <h2>职业日常</h2>
            <ol className="xnlib-steps">{handbook.daily_work.map((task, i) => <li key={task}><span>第 {i + 1} 步</span><p>{task}</p></li>)}</ol>
            <div className="xnlib-kv3">
              <div><h3>输入</h3><p>{template.brief}</p></div>
              <div><h3>处理</h3><p>{template.stages.map(stage => stage.title).join("，然后")}</p></div>
              <div><h3>结果</h3><p>{template.deliverable}</p></div>
            </div>
          </section>
          <section id="chapter-skills" className="xnlib-file-section" data-atlas-reveal>
            <h2>能力基础</h2>
            <p>医学训练给你的起点，和这个方向另外要补的东西，是两件事。下面分开列，别把前者当成后者的替代。</p>
            <div className="xnlib-skill-switch" role="group" aria-label="能力对照">
              <button aria-pressed={evidenceSide === "medical"} onClick={() => setEvidenceSide("medical")}>医学经历可能提供的起点</button>
              <button aria-pressed={evidenceSide === "new"} onClick={() => setEvidenceSide("new")}>这个方向要求、你可能没学过的</button>
            </div>
            <div className="xnlib-skill-panel">
              {evidenceSide === "medical"
                ? <ul className="xnlib-plain-list">{current.medical_transfer.map(item => <li key={item}>{item}</li>)}</ul>
                : <ul className="xnlib-gap-list">{current.skills.map(item => <li key={item}><span className="atlas-chip" data-tone="gap">要补基础</span>{item}</li>)}</ul>}
            </div>
            <h3>入门前先补的基础</h3>
            <ul className="xnlib-gap-list">{handbook.prerequisites.map(item => <li key={item}><span className="atlas-chip" data-tone="gap">要补基础</span>{item}</li>)}</ul>
            <p className="xnlib-note">这些是编辑整理的学习线索。具体一门课要补到什么程度，看目标院校当年的考试科目和岗位原文，不从「我是临床医学」直接推断。</p>
          </section>
          <section id="chapter-practice" className="xnlib-file-section" data-atlas-reveal>
            <h2>学习实践</h2>
            <p className="xnlib-note">LIMEN 编辑的入门练习，用虚构材料做，不接触真实病历。<span className="simulation-tag" style={{ marginLeft: 8 }}>simulation</span></p>
            <div className="atlas-sheet xnlib-project">
              <h3>{template.title}</h3>
              <p>{template.brief}</p>
              <ol className="xnlib-steps">{template.stages.map((item, i) => <li key={item.title}><span>第 {i + 1} 步</span><p><strong>{item.title}</strong>：{item.question}</p></li>)}</ol>
              <p className="xnlib-note">做完应该拿到：{template.deliverable}</p>
            </div>
            <h3>可以作为起点的课程</h3>
            <ul className="xnlib-plain-list">{current.courses.map(item => <li key={item}>{item}</li>)}</ul>
            <h3>延伸阅读与实践资料</h3>
            <ul className="xnlib-sources">{handbook.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><p>{source.purpose}</p></li>)}</ul>
            <div className="xnlib-file-actions"><Link className="button secondary" href={`/experience?direction=${current.id}`}>在职业体验里做一遍</Link></div>
            {!medicine && <OfficialDossier directionId={current.id} initialCategory="learning" chapterMode />}
          </section>
          <section id="chapter-admissions" className="xnlib-file-section" data-atlas-reveal>
            <h2>升学准备</h2>
            <p>报考条件要按院校、项目和招生年份逐条核对。临床医学本科能不能报、要不要加试、当年计划多少，都以院校原文为准；没写清的地方，我们标「没查到」。</p>
            {medicine ? <MedicineBrowser initialView="programs" initialCategory="admissions" /> : <OfficialDossier directionId={current.id} initialCategory="admissions" chapterMode />}
          </section>
          <section id="chapter-industry" className="xnlib-file-section" data-atlas-reveal>
            <h2>招聘与行业</h2>
            <p>看招聘原文时先看发布单位、发布日期和统计对象。一个岗位、一所院校或一年的样本，都不代表整个行业。</p>
            {medicine ? <MedicineBrowser initialView="departments" /> : <><OfficialDossier directionId={current.id} initialCategory="recruitment" chapterMode /><OfficialDossier directionId={current.id} initialCategory="industry" chapterMode /></>}
          </section>
        </article>
      </div>
    </>;
  }

  return <>
    <header className="xnlib-head">
      <div>
        <h1>信息文库</h1>
        <p className="xnlib-lede">这里收三样能查的东西：O*NET 的职业条目、公司招聘页上写的岗位要求、院系招生目录里的考试科目。每条资料都带来源和抓取时间；原文没写的，我们写「没查到」，不替它补。</p>
      </div>
      <label className="xnlib-search">
        <span>检索方向或工作内容</span>
        <input className="field" type="search" placeholder="如 影像、SAS、408" value={state.query} onChange={event => navigate({ ...state, query: event.target.value }, true, true)} />
      </label>
    </header>
    <div className="xnlib-cabinet">
      <aside className="xnlib-rail">
        <h3 className="xnlib-rail-title">方向分类</h3>
        <div className="xnlib-rail-list" role="group" aria-label="方向分类">
          <button className="xnlib-rail-btn" aria-pressed={state.group === "all"} onClick={() => navigate({ ...state, group: "all" }, false, true)}>全部方向<span className="xnlib-rail-count">{directions.length}</span></button>
          {groups.map(group => <button key={group.id} className="xnlib-rail-btn" aria-pressed={state.group === group.id} onClick={() => navigate({ ...state, group: group.id }, false, true)}>{group.name}<span className="xnlib-rail-count">{group.specializations.length}</span></button>)}
        </div>
        <p className="xnlib-rail-note">分类是站内编辑的方向分组，不是官方学科目录。</p>
        <ul className="xnlib-legend">
          <li><span className="atlas-chip" data-tone="ok">有出处</span>原文能查到</li>
          <li><span className="atlas-chip" data-tone="miss">没查到</span>原文没写或没公开</li>
          <li><span className="atlas-chip" data-tone="gap">要补基础</span>要求了，你本科没学</li>
        </ul>
      </aside>
      <div className="xnlib-cabinet-drawers">
        <div className="xnlib-drawers-head">
          <p className="xnlib-drawers-count" role="status">共 {visible.length} 个方向</p>
          <p className="xnlib-drawers-count">每行末尾可以勾选，凑够两个就能并排比较</p>
        </div>
        <ul className="xnlib-drawer" key={`${state.query}:${state.group}`}>
          {visible.map(item => {
            const next: LibraryState = { ...state, view: "reading", direction: item.id };
            return <li key={item.id} className="xnlib-drawer-row">
              <Link className="xnlib-drawer-main" href={stateUrl(next)} onClick={event => follow(event, next)}>
                <span className="xnlib-drawer-title">{item.name}</span>
                <span className="xnlib-drawer-sum">{summaries[item.id]}</span>
              </Link>
              <span className="xnlib-drawer-chips">
                {item.onet.length
                  ? <><span className="atlas-chip">SOC {item.onet[0].code}</span><span className="atlas-chip">{relationshipLabel[item.onet[0].relationship] ?? item.onet[0].relationship}</span></>
                  : <span className="atlas-chip">科室与执业路径</span>}
              </span>
              <label className="xnlib-drawer-pick">
                <input type="checkbox" checked={state.compare.includes(item.id)} aria-label={`比较${item.name}`} onChange={() => toggle(item.id)} />
                <span aria-hidden="true">比较</span>
              </label>
            </li>;
          })}
        </ul>
        {!visible.length && <div className="xnlib-empty" role="status">
          <p>按现在的关键词和分类，没查到对应的方向。换个说法试试，比如只写「影像」或「数据」，或者把分类切回全部方向。</p>
          <button className="button secondary" onClick={() => navigate({ ...state, query: "", group: "all" }, true, true)}>清空筛选</button>
        </div>}
        {state.compare.length > 0 && <div className="xnlib-tray">
          <div className="xnlib-tray-picks">{state.compare.map(id => <button key={id} onClick={() => toggle(id)} aria-label={`取消比较${findDirection(id)!.name}`}>{findDirection(id)!.name}<span aria-hidden="true"> ×</span></button>)}</div>
          {state.compare.length === 2
            ? <Link className="button small" href={stateUrl({ ...state, direction: "", view: "compare" })} onClick={event => follow(event, { ...state, direction: "", view: "compare" })}>并排比较这两个方向</Link>
            : <p>再选一个方向就能并排比较。</p>}
        </div>}
        <p className="xnlib-status" role="status">{message}</p>
      </div>
    </div>
  </>;
}

function DirectionComparison({ selected, onChange }: { selected: string[]; onChange: (index: number, id: string) => void }) {
  const compared = selected.map(id => findDirection(id)!);
  const rows = [
    { title: "实际工作", render: (item: Direction) => <ul>{item.work_tasks.map(value => <li key={value}>{value}</li>)}</ul> },
    { title: "能力基础", render: (item: Direction) => <><h3>医学经历可能提供的起点</h3><ul>{item.medical_transfer.map(value => <li key={value}>{value}</li>)}</ul><h3>要求、你可能没学过的</h3><ul>{item.skills.map(value => <li key={value}>{value}</li>)}</ul><span className="atlas-chip xnlib-compare-tag" data-tone="gap">要补基础</span></> },
    { title: "入门任务", render: (item: Direction) => <><p>{getTemplate(item.id).title}</p><p>做完拿到：{getTemplate(item.id).deliverable}</p><Link className="text-action" href={`/experience?direction=${item.id}`}>在职业体验里做一遍</Link></> },
    { title: "报考门槛", render: (item: Direction) => <><p>个人报考资格还没核定。院校、年份、专业限制和加试要求要逐项核对原文。</p><Link className="text-action" href={`/explore?direction=${item.id}#chapter-admissions`}>核对该方向的招生来源</Link><br /><span className="atlas-chip xnlib-compare-tag" data-tone="miss">没查到</span></> },
    { title: "来源", render: (item: Direction) => <><p>方向映射与入门任务为 LIMEN 编辑整理。</p><ul>{handbookEntries[item.id as HandbookDirectionId].sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul></> },
  ];
  return <div className="xnlib-compare-wrap">
    <table className="xnlib-compare">
      <caption className="sr-only">两个方向的并排对照，不排优劣，也不给适合度百分比</caption>
      <thead>
        <tr>
          <th scope="col">对照项</th>
          {compared.map((item, i) => <th scope="col" key={i}>
            <p className="xnlib-compare-name">{item.name}</p>
            <label className="xnlib-compare-pick"><span className="sr-only">第 {i + 1} 个比较方向</span>
              <select className="field" value={item.id} onChange={event => onChange(i, event.target.value)}>
                {directions.map(option => <option key={option.id} value={option.id} disabled={option.id === selected[1 - i]}>{option.name}</option>)}
              </select>
            </label>
          </th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => <tr key={row.title}>
          <th scope="row">{row.title}</th>
          {compared.map((item, i) => <td key={`${row.title}-${item.id}`}>
            <span className="xnlib-compare-cell-name">{i === 0 ? "左边" : "右边"} · {item.name}</span>
            {row.render(item)}
          </td>)}
        </tr>)}
      </tbody>
    </table>
  </div>;
}
