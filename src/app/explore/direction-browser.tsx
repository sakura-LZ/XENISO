"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { handbookEntries, type HandbookDirectionId } from "@/lib/handbook";
import { directions, findDirection, groups, occupationUrl, type Direction } from "@/lib/directions";
import { getTemplate } from "@/lib/experience/templates";
import { IconBook, IconCompass, IconFolder, IconPulse, IconProfile, IconQuote, IconStamp } from "@/components/icons";
import { OfficialDossier } from "./official-dossier";
import { InkField } from "@/components/ink-field";
import { MedicineBrowser } from "./medicine-browser";

/** 六块内容：每块回答一个问题，问题写在标题下面，读者先知道"这块要不要看"。 */
const chapters = [
  { id: "overview", title: "专业特点", question: "实际在做什么", category: "occupation" },
  { id: "work", title: "职业日常", question: "一天的工作长什么样", category: "recruitment" },
  { id: "skills", title: "能力基础", question: "你已有的，和还要补的", category: "learning" },
  { id: "practice", title: "学习实践", question: "先做一个什么练习", category: "learning" },
  { id: "admissions", title: "升学准备", question: "能不能报，卡在哪一条", category: "admissions" },
  { id: "industry", title: "招聘与行业", question: "招人时写的是什么要求", category: "industry" },
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

  const chapterNav = <nav className="xnlib-chapter-nav" aria-label="本页六块内容">
    <p className="xnlib-chapter-nav-label">本页六块</p>
    <ol className="xnlib-toc">{chapters.map(entry => <li key={entry.id}>
      <a href={`#chapter-${entry.id}`} aria-current={chapter === entry.id ? "location" : undefined} onClick={event => chapterLink(event, entry.id)}>
        <span className="xnlib-toc-icon" aria-hidden="true">{chapterIcon(entry.id)}</span>
        <span className="xnlib-toc-name">{entry.title}</span>
      </a>
    </li>)}</ol>
  </nav>;

  if (state.view === "compare") return <>
    <Link href={directoryUrl} onClick={event => follow(event, directoryState)} className="xnlib-back">返回信息文库</Link>
    <header className="xnlib-compare-head">
      <h1>方向比较</h1>
      <p className="xnlib-compare-note">这张表只用来并排对照，不排优劣，也不给适合度百分比。两条路都有人走通，差别只在门槛和起步任务。</p>
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
        <p className="xnlib-file-rule"><span className="xnlib-file-rule-icon" aria-hidden="true"><IconQuote /></span><span>引文照录原文，院校、年份和统计对象均已核对。标题与归属是站内索引，非原文自带；没写或查不到的，标「没查到」。</span></p>
        <div className="xnlib-file-actions">
          <Link className="button secondary" href={`/experience?direction=${current.id}`}>看这个方向的练习任务</Link>
          <label className="xnlib-check"><input type="checkbox" checked={state.compare.includes(current.id)} onChange={() => toggle(current.id)} />加入比较</label>
          {state.compare.length === 2 && <Link className="text-action" href={stateUrl({ ...state, direction: "", view: "compare" })} onClick={event => follow(event, { ...state, direction: "", view: "compare" })}>比较已选的两个方向</Link>}
        </div>
        <p role="status" className="xnlib-status">{message}</p>
      </header>
      <div className="xnlib-file-layout">
        <aside className="xnlib-file-aside">
          {chapterNav}
        </aside>
        <article className="xnlib-file-body">
          <div className="xnlib-chapters">
            <section id="chapter-overview" className="xnlib-chapter">
              <ChapterHead entry={chapters[0]} />
              <ul className="xnlib-plain-list">{current.work_tasks.map(task => <li key={task}>{task}</li>)}</ul>
              {medicine ? <p className="xnlib-note">科室、学科和岗位得拆开看。科室介绍证明不了个人报考或入职资格。</p> : <>
                <Fold label="对应到哪些职业" count={current.onet.length}>
                  <p className="xnlib-note">职业取自 O*NET，与国内方向的对应由 LIMEN 整理，不是 O*NET 结论。</p>
                  <ul className="xnlib-sources">{current.onet.map(item => <li key={item.code}><a href={occupationUrl(item.code)} target="_blank" rel="noreferrer">{item.name}</a><span className="xnlib-source-code">SOC {item.code} · {relationshipLabel[item.relationship] ?? item.relationship}</span></li>)}</ul>
                </Fold>
                <Fold label="来源资料与检索">
                  <OfficialDossier directionId={current.id} initialCategory="occupation" chapterMode />
                </Fold>
              </>}
            </section>
            <section id="chapter-work" className="xnlib-chapter">
              <ChapterHead entry={chapters[1]} />
              {/* 三格小标题是卡内的字段名，不是区块标题：用 h4 与字号阶梯对齐
                  （原先是 h3，但在 390 下只有 15px，会和 h2 同尺寸、层级塌陷）。 */}
              <div className="xnlib-kv3">
                <div><h4>输入</h4><p>{template.brief}</p></div>
                <div><h4>处理</h4><p>{template.stages.map(stage => stage.title).join("，然后")}</p></div>
                <div><h4>结果</h4><p>{template.deliverable}</p></div>
              </div>
              <Fold label="一天里的三步" count={handbook.daily_work.length}>
                <ol className="xnlib-steps">{handbook.daily_work.map((task, i) => <li key={task}><span>第 {i + 1} 步</span><p>{task}</p></li>)}</ol>
              </Fold>
            </section>
            <section id="chapter-skills" className="xnlib-chapter">
              <ChapterHead entry={chapters[2]} />
              <div className="xnlib-skill-pair">
                <div>
                  {/* 两列的小标题是卡内字段名，不是章节标题：用 h4 与阶梯对齐
                      （原来是 h3 但 CSS 给到 16px，不在任何字号档上）。 */}
                  <h4>医学经历可能提供的起点</h4>
                  <ul className="xnlib-plain-list">{current.medical_transfer.map(item => <li key={item}>{item}</li>)}</ul>
                </div>
                <div>
                  <h4>这个方向要求、你可能没学过的</h4>
                  <p className="xnlib-chip-row">{current.skills.map(item => <span className="atlas-chip" data-tone="gap" key={item}>{item}</span>)}</p>
                  <p className="xnlib-sub-label">入门前先补的基础</p>
                  <ul className="xnlib-plain-list">{handbook.prerequisites.map(item => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>
              <p className="xnlib-note">补到什么程度，看目标院校当年的考试科目；不从「我是临床医学」直接推断。</p>
            </section>
            <section id="chapter-practice" className="xnlib-chapter">
              <ChapterHead entry={chapters[3]} />
              <div className="atlas-sheet xnlib-project">
                <h3>{template.title}</h3>
                <p>{template.brief}</p>
                <p className="xnlib-note">做完应该拿到：{template.deliverable}<span className="simulation-tag" style={{ marginLeft: 8 }}>simulation</span></p>
              </div>
              <Fold label="练习的三步" count={template.stages.length}>
                <ol className="xnlib-steps">{template.stages.map((item, i) => <li key={item.title}><span>第 {i + 1} 步</span><p><strong>{item.title}</strong>：{item.question}</p></li>)}</ol>
              </Fold>
              <Fold label="可以作为起点的课程" count={current.courses.length}>
                <ul className="xnlib-plain-list">{current.courses.map(item => <li key={item}>{item}</li>)}</ul>
              </Fold>
              <Fold label="延伸阅读与实践资料" count={handbook.sources.length}>
                <ul className="xnlib-sources">{handbook.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><p>{source.purpose}</p></li>)}</ul>
              </Fold>
              {!medicine && <Fold label="来源资料与检索">
                <OfficialDossier directionId={current.id} initialCategory="learning" chapterMode />
              </Fold>}
              <div className="xnlib-file-actions"><Link className="button secondary" href={`/experience?direction=${current.id}`}>在职业体验里做一遍</Link></div>
            </section>
            <section id="chapter-admissions" className="xnlib-chapter">
              <ChapterHead entry={chapters[4]} />
              <p>报考条件按院校、项目和年份逐条核对：能不能报、要不要加试、当年计划多少，都以院校原文为准，没写清的标「没查到」。</p>
              <Fold label={medicine ? "院校与科室资料" : "院校招生原文与检索"}>
                {medicine ? <MedicineBrowser initialView="programs" initialCategory="admissions" /> : <OfficialDossier directionId={current.id} initialCategory="admissions" chapterMode />}
              </Fold>
            </section>
            <section id="chapter-industry" className="xnlib-chapter">
              <ChapterHead entry={chapters[5]} />
              <p>看清发布单位、日期和统计对象。单个岗位或单年样本，都不代表整个行业。</p>
              {medicine ? <Fold label="科室与执业资料"><MedicineBrowser initialView="departments" /></Fold> : <>
                <Fold label="招聘原文与检索"><OfficialDossier directionId={current.id} initialCategory="recruitment" chapterMode /></Fold>
                <Fold label="行业与就业统计"><OfficialDossier directionId={current.id} initialCategory="industry" chapterMode /></Fold>
              </>}
            </section>
          </div>
        </article>
      </div>
    </>;
  }

  return <>
    <header className="xnlib-head">
      <InkField className="page-ink" band />
      <div>
        <h1><IconBook aria-hidden="true" />信息文库</h1>
        <p className="xnlib-lede">只查三样：O*NET 职业、公司招聘要求、院系招生目录考试科目。原文没写的直接标「没查到」。</p>
      </div>
      <label className="xnlib-search">
        <span>检索方向或工作内容</span>
        <input className="field" type="search" placeholder="如 影像、SAS、408" value={state.query} onChange={event => navigate({ ...state, query: event.target.value }, true, true)} />
      </label>
    </header>
    {/* 这页原来是全站唯一没有任何纸片物料、也没有主按钮的页面：进来只有一列平铺
        的 10 行数据表。补一张检索说明卡把"怎么用"讲清楚，并给出这一页的主动作。 */}
    <section className="xnlib-howto atlas-sheet" aria-labelledby="xnlib-howto-title">
      <span className="atlas-tape tl" aria-hidden="true" />
      <h2 id="xnlib-howto-title"><IconStamp aria-hidden="true" />这本文库怎么用</h2>
      <ol className="xnlib-howto-steps">
        <li><b>先按分类收窄。</b>左栏是站内编辑的方向分组，不是官方学科目录。</li>
        <li><b>点一行展开读原文。</b></li>
        <li><b>勾两个方向并排比。</b>行末的勾选框凑够两个，就能拉出对照视图。</li>
      </ol>
      <div className="xnlib-howto-actions">
        <button className="atlas-btn atlas-btn-primary" type="button" onClick={() => navigate({ ...state, group: "all" }, false, true)}>看全部 {directions.length} 个方向</button>
        <Link className="atlas-btn atlas-btn-quiet" href="/assessment">不确定方向？先做兴趣问卷</Link>
      </div>
    </section>
    <div className="xnlib-cabinet">
      <aside className="xnlib-rail">
        {/* 这里保持 <p>：它只是筛选器的小标签（视觉 13px），不是区块标题。
            整页的真二级标题是主区的「方向清单」——那样 h2 只有一种尺寸。 */}
        <p className="xnlib-rail-title"><IconCompass aria-hidden="true" />方向分类</p>
        <div className="xnlib-rail-list" role="group" aria-label="方向分类">
          <button className="xnlib-rail-btn" aria-pressed={state.group === "all"} onClick={() => navigate({ ...state, group: "all" }, false, true)}>全部方向<span className="xnlib-rail-count">{directions.length}</span></button>
          {groups.map(group => <button key={group.id} className="xnlib-rail-btn" aria-pressed={state.group === group.id} onClick={() => navigate({ ...state, group: group.id }, false, true)}>{group.name}<span className="xnlib-rail-count">{group.specializations.length}</span></button>)}
        </div>
        <ul className="xnlib-legend">
          <li><span className="atlas-chip" data-tone="ok">有出处</span>原文能查到</li>
          <li><span className="atlas-chip" data-tone="miss">没查到</span>原文没写或没公开</li>
          <li><span className="atlas-chip" data-tone="gap">要补基础</span>要求了，你本科没学</li>
        </ul>
      </aside>
      <div className="xnlib-cabinet-drawers">
        <div className="xnlib-drawers-head">
          <h2 className="xnlib-drawers-title">方向清单</h2>
          <p className="xnlib-drawers-count" role="status">共 {visible.length} 个方向</p>
        </div>
        <ul className="xnlib-drawer" key={`${state.query}:${state.group}`}>
          {visible.map(item => {
            const next: LibraryState = { ...state, view: "reading", direction: item.id };
            return <li key={item.id} className="xnlib-drawer-row">
              <Link className="xnlib-drawer-main" href={stateUrl(next)} onClick={event => follow(event, next)}>
                <span className="xnlib-drawer-title"><IconFolder aria-hidden="true" />{item.name}</span>
                <span className="xnlib-drawer-sum">{summaries[item.id]}</span>
              </Link>
              <span className="xnlib-drawer-chips">
                {/* 这里原来每行两个胶囊（SOC 编号 + 关联类型），10 行就是 20 个，
                    是全站最像"组件库默认样式"的一块：SOC 是标识符不是标签，而
                    "直接关联"是默认值、8 行里 7 行都一样，重复且不携带信息。
                    改成：SOC 降为等宽纯文本；只有在不是"直接关联"时才出一个胶囊
                    （那才是真正需要一眼看见的例外）。 */}
                {item.onet.length
                  ? <>
                      <span className="xnlib-drawer-soc">SOC {item.onet[0].code}</span>
                      {item.onet[0].relationship !== "direct"
                        && <span className="atlas-chip" data-tone="gap">{relationshipLabel[item.onet[0].relationship] ?? item.onet[0].relationship}</span>}
                    </>
                  : <span className="xnlib-drawer-soc">科室与执业路径</span>}
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

function chapterIcon(id: ChapterId) {
  switch (id) {
    case "overview": return <IconCompass />;
    case "work": return <IconPulse />;
    case "skills": return <IconProfile />;
    case "practice": return <IconBook />;
    case "admissions": return <IconStamp />;
    case "industry": return <IconFolder />;
  }
}

/** 分区头：图标 + 标题 + 一句话"这块回答什么"。不加 eyebrow 编号，免得多一层模板味。 */
function ChapterHead({ entry }: { entry: (typeof chapters)[number] }) {
  return <header className="xnlib-chapter-head">
    <span className="xnlib-chapter-icon" aria-hidden="true">{chapterIcon(entry.id)}</span>
    <div className="xnlib-chapter-text">
      <h2>{entry.title}</h2>
      <p className="xnlib-chapter-q">{entry.question}</p>
    </div>
  </header>;
}

/** 需要时才展开：原生 details，不依赖 JS 也能开合、也能被检索到。 */
function Fold({ label, count, children }: { label: string; count?: number; children: ReactNode }) {
  return <details className="xnlib-fold">
    <summary>
      <span className="xnlib-fold-label">{label}</span>
      {typeof count === "number" && <span className="xnlib-fold-count">{count}</span>}
      <span className="xnlib-fold-chevron" aria-hidden="true" />
    </summary>
    <div className="xnlib-fold-body">{children}</div>
  </details>;
}

function DirectionComparison({ selected, onChange }: { selected: string[]; onChange: (index: number, id: string) => void }) {
  const compared = selected.map(id => findDirection(id)!);
  const rows = [
    { title: "实际工作", render: (item: Direction) => <ul>{item.work_tasks.map(value => <li key={value}>{value}</li>)}</ul> },
    { title: "能力基础", render: (item: Direction) => <><strong className="xnlib-cell-label">医学经历可能提供的起点</strong><ul>{item.medical_transfer.map(value => <li key={value}>{value}</li>)}</ul><strong className="xnlib-cell-label">要求、你可能没学过的</strong><ul>{item.skills.map(value => <li key={value}>{value}</li>)}</ul><span className="atlas-chip xnlib-compare-tag" data-tone="gap">要补基础</span></> },
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
