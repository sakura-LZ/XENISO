"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readProfileOverview, type ProfileOverview } from "@/lib/profile-overview";
import { documentSnapshot, snapshotSource, translation } from "@/lib/onet/translation";
import { ReportReveal } from "./report-visuals";
import { IconCalendar, IconCompass, IconExternal, IconFolder, IconProfile, IconQuiz } from "@/components/icons";
import { profileProgress } from "./completion";
import "./profile.css";

import { InkField } from "@/components/ink-field";
type Status = { state: "loading" | "error" | "ready"; data: ProfileOverview | null; message: string };

/** 把画像里已有的记录折成三行能读的文字；没有记录时留一条空横线。 */
function entryRows(profile: ProfileOverview["profile"] | null) {
  const courses = profile?.courses ?? [];
  const projects = profile?.research_projects.filter(project => project.title.trim()) ?? [];
  const skills = profile?.tech_skills.filter(skill => skill.skill.trim()) ?? [];
  return [
    { label: "课程", value: courses.length ? `${courses.length} 门成绩记录` : "" },
    { label: "科研项目", value: projects.length ? projects.map(project => project.title.trim()).slice(0, 2).join("、") : "" },
    { label: "工具与方法", value: skills.length ? skills.map(skill => skill.skill.trim()).slice(0, 2).join("、") : "" },
  ];
}

export function ProfileHub() {
  const [status, setStatus] = useState<Status>({ state: "loading", data: null, message: "" });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException("请求超时", "TimeoutError")), 30000);
    void readProfileOverview(fetch, controller.signal).then(data => {
      if (!controller.signal.aborted) setStatus({ state: "ready", data, message: "" });
    }).catch(error => {
      if (!controller.signal.aborted || controller.signal.reason?.name === "TimeoutError") setStatus({ state: "error", data: null, message: controller.signal.aborted ? "资料读取超时。" : error instanceof Error && error.name !== "ZodError" ? error.message : "保存的资料未通过校验。" });
    }).finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [revision]);

  const profile = status.data?.profile ?? null;
  const progress = profileProgress(profile);
  const example = translation.items[1];
  const rows = entryRows(profile);
  const basicsLabel = status.state === "loading" ? "正在读取" : status.state === "error" ? "读取失败" : profile ? (status.data?.basicsComplete ? "已完成" : "待完善") : "未填写";
  const basicsTone = status.state === "error" ? "warn" : status.data?.basicsComplete ? "ok" : profile ? "warn" : undefined;
  const interestLabel = status.state === "loading" ? "正在读取" : status.state === "error" ? "读取失败" : status.data?.assessment ? "已完成" : "未填写";

  return <div className="container xp-narrow">
    <ReportReveal motion="M-P01">
      <header className="xp-head">
      <InkField className="page-ink" band />
        <div>
          <h1><IconProfile aria-hidden="true" />个人画像</h1>
          <p className="xp-lede">
            异域探索的第 1 步。只记录你在临床医学里做过的事：上过哪些课、进过哪些科室、写过什么、用过什么工具。
            填完后整理成一份<b>能力底册</b>，第 2 步的初步评价从这份清单读起。
          </p>
        </div>
        <aside className="xp-meter" aria-label="填写进度">
          <div className="xp-meter-row"><span>当前页</span><strong>第 1 步 / 共 4 步</strong></div>
          <div className="xp-meter-row"><span>完成度</span><strong>{progress.done} / {progress.total} 项</strong></div>
          <div className="xp-bar" role="img" aria-label={`已填写 ${progress.done} 项，共 ${progress.total} 项`}><i style={{ width: `${progress.done / progress.total * 100}%` }} /></div>
          <p className="xp-meter-foot">{progress.complete ? `已够 ${progress.gate} 项。` : `还差 ${progress.remaining} 项（填到 18 项即可）。`}</p>
        </aside>
      </header>
    </ReportReveal>

    {status.state === "error" && <div className="xp-error" role="alert"><p>{status.message}</p><button type="button" onClick={() => { setStatus({ state: "loading", data: null, message: "" }); setRevision(n => n + 1); }}>重新读取</button></div>}

    <ReportReveal motion="M-P02" className="xp-sheet atlas-sheet" delay={80}>
      <span className="atlas-tape tl" aria-hidden="true" />
      <div className="xp-sheet-status">
        <span>档案编号 · 个人画像第 1 卷</span>
        <span role="status">{status.state === "loading" ? "正在读取…" : status.state === "error" ? "资料未读取" : `最近读取 ${new Date().toLocaleDateString("zh-CN")}`}</span>
      </div>

      <section className="xp-entry">
        <div>
          <h2><IconFolder aria-hidden="true" />医学经历</h2>
          <p className="xp-entry-sub">课程、见习、科研与工具。行尾「填」补空行，「改」改已有记录。</p>
          <div className="xp-ruled-sample" data-atlas-reveal data-atlas-stagger>
            <dl className="xp-rows">
              {rows.map(row => <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value || <span className="xp-empty-hint">还没填</span>}</dd>
                <Link href="/profile/basics" className="xp-fill" aria-label={row.value ? `修改${row.label}记录` : `去填写${row.label}`}>{row.value ? "改" : "填"}</Link>
              </div>)}
            </dl>
          </div>
        </div>
        <div className="xp-entry-side">
          <span className="xp-status" data-tone={basicsTone}>{basicsLabel}</span>
          <p className="xp-entry-sub">{profile ? `已在册 ${progress.done} 项。` : "从昵称、院校、年级开始，其余分几次补。"}</p>
          <div className="xp-entry-actions">
            <Link href="/profile/basics" className="button">{profile ? (status.data?.basicsComplete ? "修改经历" : "继续填写") : "开始填写"}</Link>
            {status.data?.basicsComplete && <Link href="/report/initial" className="xp-text-link">查看初步评价</Link>}
          </div>
        </div>
      </section>

      <section className="xp-entry">
        <div>
          <h2><IconQuiz aria-hidden="true" />职业兴趣</h2>
          <p className="xp-entry-sub">
            30 道题，来自 O*NET Mini-IP（美国劳工部职业信息库的职业活动兴趣量表，官方题目配 LIMEN 独立译稿）。
            问的是你喜不喜欢某类工作活动，不测能力，也不给适合度百分比。
          </p>
          <div className="xp-ruled-sample">
            <p className="atlas-label">样题 · {example.index} / 30</p>
            <p className="xp-entry-sub">{example.zh}</p>
            <dl className="xp-rows">
              {documentSnapshot.answer_options.map(option => <div key={option.value}><dt>{option.value}</dt><dd>{option.name}</dd></div>)}
            </dl>
            <a className="xp-text-link" href={snapshotSource} target="_blank" rel="noreferrer">官方题目来源 · O*NET 文档<IconExternal aria-hidden="true" /></a>
          </div>
        </div>
        <div className="xp-entry-side">
          <span className="xp-status" data-tone={status.data?.assessment ? "ok" : undefined}>{interestLabel}</span>
          <p className="xp-entry-sub">{status.data?.assessment ? `已得到 ${new Date(status.data.assessment.returned_at).toLocaleDateString("zh-CN")} 的兴趣结果。` : "大约 8 分钟。"}</p>
          <div className="xp-entry-actions">
            {status.data?.assessment
              ? <><Link href="/report/initial#initial-interest" className="button">查看兴趣结果</Link><Link href="/assessment" className="xp-text-link">重新填写问卷</Link></>
              : <Link href="/assessment" className="button">开始问卷</Link>}
          </div>
        </div>
      </section>

      <section className="xp-entry">
        <div>
          <h2><IconCalendar aria-hidden="true" />四节进度</h2>
          <div className="xp-ledger">
            {progress.sections.map(section => {
              const filled = section.checks.filter(check => check.filled).length;
              return <div className="xp-ledger-row" key={section.id}>
                <span className="xp-ledger-no">{section.ordinal}</span>
                <b>{section.label}</b>
                <span className="xp-ledger-count">{filled} / {section.checks.length}</span>
              </div>;
            })}
          </div>
        </div>
        <div className="xp-entry-side">
          <div className="xp-entry-actions"><Link href="/profile/basics" className="button secondary">去填写页</Link></div>
        </div>
      </section>

      <span className="atlas-stamp ochre animate" data-atlas-in="1" aria-hidden="true">草稿 · 第 1 步</span>
    </ReportReveal>

    {status.state === "ready" && status.data?.ready && <ReportReveal motion="M-P04" className="xp-report" delay={120}>
      <div className="xp-report-head">
        <h2><IconCompass aria-hidden="true" />下一步：初步评价</h2>
        <span className="atlas-chip" data-tone="ok">资料齐备</span>
      </div>
      <p className="xp-entry-sub">初步评价会读底册和兴趣分布，标出能迁移的能力和要补的基础。</p>
      <div className="xp-report-actions"><Link href="/report/initial" className="button">查看初步评价</Link></div>
    </ReportReveal>}

    <p className="xp-footnote" data-atlas-reveal>
      记录只用于生成能力底册，不用于排名，也不出现在社区。随时可以回来改。
    </p>
  </div>;
}
