"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readProfileOverview, type ProfileOverview } from "@/lib/profile-overview";
import type { Profile } from "@/lib/profile";
import { ReportReveal } from "./report-visuals";
import { IconAccount, IconBook, IconCompass, IconProfile, IconPulse, IconQuiz } from "@/components/icons";
import { profileProgress } from "./completion";
import "./profile.css";
import { PageHelp } from "@/components/page-help";

import { InkField } from "@/components/ink-field";
type Status = { state: "loading" | "error" | "ready"; data: ProfileOverview | null; message: string };

function compact(parts: Array<string | null | false | undefined>) {
  return parts.filter((part): part is string => Boolean(part)).join(" · ");
}

/** 底册每节只留一行「已经记下了什么」，细节回填写页看。 */
function sectionSummaries(profile: Profile | null) {
  if (!profile) return ["", "", "", ""];
  const english = profile.english;
  const basic = compact([profile.nickname, profile.school, profile.major, profile.grade]);
  const study = compact([
    profile.gpa !== null && profile.gpa_scale !== null ? `GPA ${profile.gpa}/${profile.gpa_scale}` : null,
    profile.rank !== null && profile.cohort_size !== null ? `排名 ${profile.rank}/${profile.cohort_size}` : null,
    profile.courses.length ? `课程 ${profile.courses.length} 门` : null,
    english?.cet6 === "已通过" ? "CET-6 已通过" : english?.cet4 === "已通过" ? "CET-4 已通过" : null,
  ]);
  const research = compact([
    profile.research_projects.some(item => item.title.trim()) ? `课题 ${profile.research_projects.filter(item => item.title.trim()).length} 项` : null,
    profile.papers.some(item => item.title.trim()) ? `成果 ${profile.papers.filter(item => item.title.trim()).length} 项` : null,
    profile.tech_skills.some(item => item.skill.trim()) ? `工具 ${profile.tech_skills.filter(item => item.skill.trim()).length} 项` : null,
    profile.wetlab_skills.some(item => item.skill.trim()) ? `实验 ${profile.wetlab_skills.filter(item => item.skill.trim()).length} 项` : null,
  ]);
  const goal = compact([
    profile.interest_directions.some(item => item.trim()) ? `方向 ${profile.interest_directions.filter(item => item.trim()).length} 个` : null,
    profile.pathway !== "未决定" ? profile.pathway : null,
    profile.transition_year ? `${profile.transition_year} 年` : null,
    profile.weekly_hours !== null ? `每周 ${profile.weekly_hours} 小时` : null,
  ]);
  return [basic, study, research, goal];
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
  const assessment = status.data?.assessment ?? null;
  const progress = profileProgress(profile);
  const summaries = sectionSummaries(profile);
  const readLabel = status.state === "loading" ? "正在读取" : status.state === "error" ? "读取失败" : "已保存";
  const interestLabel = status.state === "loading" ? "读取中" : status.state === "error" ? "读取失败" : assessment ? "已完成" : "未做";
  const rows = progress.sections.map((section, index) => {
    const filled = section.checks.filter(check => check.filled).length;
    return {
      id: section.id,
      no: ["一", "二", "三", "四"][index],
      label: section.label,
      icon: [IconAccount, IconBook, IconPulse, IconCompass][index],
      summary: summaries[index],
      count: `${filled} / ${section.checks.length}`,
      href: `/profile/basics#profile-group-${index}`,
      action: filled ? "改" : "填",
    };
  });

  return <div className="container xp-narrow">
    <ReportReveal motion="M-P01">
      <header className="xp-head">
        <InkField className="page-ink" band />
        <div>
          <h1><IconProfile aria-hidden="true" />个人画像</h1>
        </div>
        <aside className="xp-meter" aria-label="填写进度">
          <div className="xp-meter-row"><span>底册</span><strong>{progress.done} / {progress.total} 项</strong></div>
          <div className="xp-bar" role="img" aria-label={`已填写 ${progress.done} 项，共 ${progress.total} 项`}><i style={{ width: `${progress.done / progress.total * 100}%` }} /></div>
        </aside>
      </header>
    </ReportReveal>

    <PageHelp topic="profile"><p>没有的内容留空，随时回来改。</p></PageHelp>

    {status.state === "error" && <div className="xp-error" role="alert"><p>{status.message}</p><button type="button" onClick={() => { setStatus({ state: "loading", data: null, message: "" }); setRevision(n => n + 1); }}>重新读取</button></div>}

    <ReportReveal motion="M-P02" className="xp-sheet atlas-sheet" delay={80}>
      <span className="atlas-tape tl" aria-hidden="true" />
      <div className="xp-sheet-status">
        <span>能力底册</span>
        <span role="status">{status.state === "error" ? "资料未读取" : readLabel}</span>
      </div>

      <ol className="xp-ledger-table">
        {rows.map((row, index) => {
          const Icon = row.icon;
          return <li key={row.id} className="xp-ledger-line enter" style={{ "--d": index } as React.CSSProperties}>
            <span className="xp-ledger-no" aria-hidden="true">{row.no}</span>
            <div className="xp-ledger-main">
              <b><Icon aria-hidden="true" />{row.label}</b>
              <span className="xp-ledger-sum" data-empty={row.summary ? undefined : "true"}>{row.summary || "还没填"}</span>
            </div>
            <span className="xp-ledger-count">{row.count}</span>
            <Link className="xp-fill" href={row.href} aria-label={`${row.action}${row.label}`}>{row.action}</Link>
          </li>;
        })}
        <li className="xp-ledger-line enter" style={{ "--d": 4 } as React.CSSProperties}>
          <span className="xp-ledger-no" aria-hidden="true">问卷</span>
          <div className="xp-ledger-main">
            <b><IconQuiz aria-hidden="true" />职业兴趣</b>
            <span className="xp-ledger-sum" data-empty={assessment ? undefined : "true"}>{assessment ? new Date(assessment.returned_at).toLocaleDateString("zh-CN") : "30 题"}</span>
          </div>
          <span className="xp-status" data-tone={assessment ? "ok" : undefined}>{interestLabel}</span>
          {assessment
            ? <Link className="xp-fill" href="/report/initial#initial-interest" aria-label="查看兴趣结果">查看</Link>
            : <Link className="xp-fill" href="/assessment" aria-label="开始兴趣问卷">开始</Link>}
        </li>
      </ol>

      {status.state === "ready" && status.data?.ready && <div className="xp-ledger-next">
        <span><IconCompass aria-hidden="true" />底册与兴趣都齐了</span>
        <Link className="button" href="/report/initial">查看初步评价</Link>
      </div>}
    </ReportReveal>
  </div>;
}
