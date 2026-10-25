"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { type AssessmentResult } from "@/lib/assessment";
import { emptyProfile, profileSchema, type Profile } from "@/lib/profile";
import { competencyGaps, initialReport } from "@/lib/reports";
import { occupationUrl } from "@/lib/directions";
import { skillKindLabels } from "@/lib/skill-requirements";
import { InterestRadar } from "../report-visuals";
import { DirectionArt, StorysetAttribution } from "@/components/direction-art";
import { readProfileOverview } from "@/lib/profile-overview";
import { IconBook, IconCompass, IconFolder, IconPulse, IconWarning } from "@/components/icons";

const relationLabels: Record<string, string> = { direct: "直接关联", related: "相关关联", adjacent: "邻近关联" };
// 必备项中还没有课程/项目记录的技能：只做“信息缺口”提示，不推断能力，也不评分。
function mustGapNames(skillMatch: { skills: { name: string; requirement: string; status: string }[] }) {
  return skillMatch.skills.filter((skill) => skill.requirement === "must" && skill.status !== "recorded").map((skill) => skill.name);
}
export function InitialReport() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [mode, setMode] = useState<"empty" | "simulation" | "personal">("empty");
  const [message, setMessage] = useState("正在读取画像与测评…");
  const [, setBusy] = useState(false);
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
        setProfile(data.profile ?? emptyProfile); setAssessment(data.assessment); setMode(data.profile ? "personal" : "empty"); setMessage("");
      }
    } catch (error) { setMessage(error instanceof Error && !["TimeoutError", "AbortError", "TypeError", "SyntaxError", "ZodError"].includes(error.name) ? error.message : "资料读取或校验失败，请刷新资料重试。"); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => { void load(true); }, 0); return () => clearTimeout(timer); }, [load]);
  const leadRecords = report.evidence.slice(0, 8);
  const restRecords = report.evidence.slice(8);
  // 知识缺口只做「手册要求 − 画像记录」的比对；匹配规则与 lib 的 competencyGaps 相同，不另造评分。
  const evidenceNames = report.evidence.map(row => row.skill.toLocaleLowerCase());
  const isRecorded = (name: string) => {
    const key = name.toLocaleLowerCase();
    return evidenceNames.some(existing => existing.includes(key) || key.includes(existing));
  };
  const gapGroups = report.candidates.map(({ direction }) => ({
    direction,
    skills: competencyGaps(profile, direction).filter(gap => !gap.status.includes("已自述")),
    courses: direction.courses.filter(course => !isRecorded(course)),
  }));
  const gapCount = gapGroups.reduce((sum, group) => sum + group.skills.length + group.courses.length, 0);
  return <main id="main" className="shell xr-page">
    <div className="xr-file">
      <span className="xr-holes" aria-hidden="true"><i /><i /><i /></span>

      <header className="atlas-sheet raised xr-cover">
        <span className="atlas-tape mid" aria-hidden="true" />
        <div className="xr-cover-top">
          <div className="xr-cover-main">
            <h1 className="xr-title"><IconFolder aria-hidden="true" />初步评价</h1>
          </div>
          <div className="xr-cover-side">
            {mode === "simulation" && <span className="atlas-chip" data-tone="gap">simulation · 合成数据</span>}
            <span className="atlas-chip" data-tone="gap">AI 未生成</span>
          </div>
        </div>
      </header>

      {message && <p className="xr-feedback" role="status">{message}</p>}

      <div className="rp-cols">

        <article id="initial-interest" className="atlas-sheet rp-col" data-atlas-reveal>
          <header className="rp-col-head">
            <span className="rp-col-num">01</span>
            <h2><IconPulse aria-hidden="true" />兴趣</h2>
            <span className="atlas-chip" data-tone={assessment ? "ok" : "gap"}>{assessment ? "已计分" : "暂无结果"}</span>
          </header>
          {assessment ? <>
            <InterestRadar scores={assessment.scores} />
            <details className="xr-details">
              <summary>原始结果与职业来源</summary>
              <p className="xr-source">来源 {assessment.source} · 量表 {assessment.instrument} · 数据库版本 {assessment.onet_version} · API {assessment.api_version}<br />返回时间 {new Date(assessment.returned_at).toLocaleString("zh-CN")}</p>
              <ul className="xr-src-list">{assessment.careers.map(c => <li key={c.code}><a href={`https://www.onetonline.org/link/summary/${c.code}`} target="_blank" rel="noreferrer">{c.title} · {c.code}</a></li>)}</ul>
              <p className="xr-source">展示 {assessment.careers.length} 条，共返回 {assessment.career_total} 条。职业信息来自 O*NET Web Services（USDOL/ETA）。</p>
            </details>
          </> : <dl className="xr-check"><div><dt>问卷结果</dt><dd>尚无记录</dd></div></dl>}
          <div className="rp-col-foot">
            <Link className="atlas-btn atlas-btn-primary" href="/assessment">{assessment ? "重做问卷" : "开始问卷"}</Link>
          </div>
        </article>

        <article id="initial-evidence" className="atlas-sheet rp-col" data-atlas-reveal>
          <header className="rp-col-head">
            <span className="rp-col-num">02</span>
            <h2><IconCompass aria-hidden="true" />能力迁移</h2>
            <span className="atlas-chip" data-tone="gap">{mode === "empty" ? "未读取" : "未核验"}</span>
          </header>
          {mode === "empty" ? <dl className="xr-check"><div><dt>已经记录</dt><dd>暂无</dd></div></dl> : report.evidence.length ? <ol className="xr-records">
            {leadRecords.map(row => <li className="xr-record" key={row.ref}>
              <div className="xr-record-head"><h3>{row.skill}</h3><span className="atlas-chip" data-tone="gap">{row.status}</span></div>
              <p className="xr-record-body">{row.evidence}</p>
              <details><summary>来源</summary><p className="xr-source">记录位置：<code>{row.ref}</code></p></details>
            </li>)}
            {restRecords.length > 0 && <li className="xr-record">
              <details><summary>展开其余 {restRecords.length} 条记录</summary>
                <ol className="xr-records">{restRecords.map(row => <li className="xr-record" key={row.ref}>
                  <div className="xr-record-head"><h3>{row.skill}</h3><span className="atlas-chip" data-tone="gap">{row.status}</span></div>
                  <p className="xr-record-body">{row.evidence}</p>
                  <details><summary>来源</summary><p className="xr-source">记录位置：<code>{row.ref}</code></p></details>
                </li>)}</ol>
              </details>
            </li>}
          </ol> : <dl className="xr-check"><div><dt>已经记录</dt><dd>暂无</dd></div></dl>}

          {report.candidates.length ? <ol className="xr-directions">
            {report.candidates.map(({ direction, occupations }) => <li className="xr-direction" key={direction.id}>
              <DirectionArt direction={direction.id} compact />
              <div>
                <h3><Link href={`/explore?direction=${direction.id}`}>{direction.name}</Link></h3>
                <p>{direction.work_tasks[0]}</p>
                <ul className="xr-chips">{direction.medical_transfer.map(item => <li key={item}><span className="atlas-chip" data-tone="ok">{item}</span></li>)}</ul>
                <details className="xr-details">
                  <summary>职业关联与来源（{occupations.length} 条）</summary>
                  <ul className="xr-src-list">{occupations.map(o => <li key={o.code}><a href={occupationUrl(o.code)} target="_blank" rel="noreferrer">{o.name} · {o.code}</a> · {relationLabels[o.relationship] ?? o.relationship}</li>)}</ul>
                  <p className="xr-source">职业关联由 LIMEN 编辑，不是 O*NET 官方的中国考研专业结论。</p>
                </details>
              </div>
            </li>)}
          </ol> : <dl className="xr-check"><div><dt>迁移方向</dt><dd>暂无</dd></div></dl>}
          {!!report.outside_directory.length && <p className="xr-source">另有 {report.outside_directory.length} 个匹配职业在手册之外，见「兴趣」栏原始结果。</p>}
          {report.candidates.length > 0 && <StorysetAttribution />}
          <div className="rp-col-foot">
            <Link className="atlas-btn" href="/profile/basics">填写医学经历</Link>
          </div>
        </article>

        <article id="initial-gaps" className="atlas-sheet rp-col" data-atlas-reveal>
          <header className="rp-col-head">
            <span className="rp-col-num">03</span>
            <h2><IconBook aria-hidden="true" />知识缺口</h2>
            <span className="atlas-chip" data-tone={gapCount > 0 ? "gap" : undefined}>{gapGroups.length ? (gapCount > 0 ? `${gapCount} 项待补` : "无待补") : "无对照"}</span>
          </header>
          {gapGroups.length ? <>
            {gapCount > 0 ? <div className="xr-gap-groups">{gapGroups.map(({ direction, skills, courses }) => <div className="xr-gap-group" key={direction.id}>
              <h3><Link href={`/explore?direction=${direction.id}`}>{direction.name}</Link></h3>
              {skills.length + courses.length > 0 ? <ul className="xr-gap-list">
                {skills.map(gap => <li key={`skill-${gap.skill}`}><span className="atlas-chip" data-tone="gap">要补基础</span><span className="xr-gap-name">{gap.skill}</span><span className="xr-gap-src">能力基础</span></li>)}
                {courses.map(course => <li key={`course-${course}`}><span className="atlas-chip" data-tone="gap">要补基础</span><span className="xr-gap-name">{course}</span><span className="xr-gap-src">入门基础</span></li>)}
              </ul> : <p className="xr-source">这个方向的要求里没有你还没记录的条目。</p>}
            </div>)}</div> : <p className="rp-col-empty">没查到：手册要求都有对应记录。</p>}
          </> : <dl className="xr-check"><div><dt>待补条目</dt><dd>尚无记录</dd></div></dl>}
          <div className="rp-col-foot">
            <Link className="atlas-btn" href="/explore">翻方向手册</Link>
          </div>
        </article>

        <article id="initial-admissions" className="atlas-sheet rp-col" data-atlas-reveal>
          <header className="rp-col-head">
            <span className="rp-col-num">04</span>
            <h2><IconWarning aria-hidden="true" />报考条件</h2>
            <span className="atlas-chip" data-tone="gap">全部待核验</span>
          </header>
          <dl className="xr-check">
            <div><dt>学校与项目</dt><dd>无</dd></div>
            <div><dt>目标年份</dt><dd>无</dd></div>
            <div><dt>报考条件</dt><dd>无</dd></div>
            <div><dt>官方来源</dt><dd>无</dd></div>
          </dl>
          <div className="rp-col-foot">
            <Link className="atlas-btn" href="/explore">按方向查报考条目</Link>
          </div>
        </article>

      </div>

      <section id="initial-skill-match" className="atlas-sheet xr-sec rp-skillmatch" data-atlas-reveal>
        <header className="xr-sec-head">
          <span className="rp-col-num">05</span>
          <h2><IconCompass aria-hidden="true" />职业技能匹配</h2>
          <span className="atlas-chip" data-tone="gap">知识库原文 · 未核验</span>
        </header>
        {report.occupation_skills.length ? <>
          <p className="rp-skillmatch-lede">按兴趣问卷命中的候选职业，列出知识库里这些职业原文要求的技能，再逐项对照你的画像记录。只标证据状态，不评分、不排序。</p>
          {report.occupation_skills.map(match => <div className="rp-skillmatch-group" key={match.direction_id}>
            <div className="rp-skillmatch-grouphead">
              <h3><Link href={`/explore?direction=${match.direction_id}`}>{match.direction_name}</Link></h3>
              <p className="rp-skillmatch-occupation">{match.occupation_label}</p>
            </div>
            <ul className="rp-skillmatch-list">
              {match.skills.map(skill => <li className="rp-skillmatch-row" key={skill.id} data-status={skill.status}>
                <span className="atlas-chip" data-tone={skill.status === "recorded" ? "ok" : skill.status === "unknown" ? "gap" : undefined}>{skill.status_label}</span>
                <span className="rp-skillmatch-name">{skill.name}</span>
                <span className="rp-skillmatch-meta">{skill.requirement === "must" ? "必备" : "加分"} · {skillKindLabels[skill.kind]}</span>
                <details className="rp-skillmatch-kb">
                  <summary>原文与记录</summary>
                  {skill.kb.map(evidence => <p className="xr-source" key={`${evidence.record_id}-${evidence.quote_start}`}>
                    {evidence.ellipsis_start ? "…" : ""}{evidence.quote}{evidence.ellipsis_end ? "…" : ""}
                    {evidence.source_url ? <>（<a href={evidence.source_url} target="_blank" rel="noreferrer">{evidence.organization ?? "来源"}</a>）</> : null}
                    <br /><code>{evidence.record_id}</code>
                  </p>)}
                  {skill.evidence.length
                    ? <p className="xr-source">画像记录：{skill.evidence.map(row => <code key={row.ref}>{row.ref}</code>)}</p>
                    : <p className="xr-source">画像记录：没有找到对应条目。</p>}
                </details>
              </li>)}
            </ul>
            <p className="rp-skillmatch-sum">{match.summary.total} 项要求：{match.summary.recorded} 项有记录 / {match.summary.self_reported} 项仅自述 / {match.summary.unknown} 项信息不足</p>
            {mustGapNames(match).length
              ? <p className="rp-skillmatch-sum">必备项尚无课程/项目记录：{mustGapNames(match).join("、")}（未记录 ≠ 不具备）</p>
              : <p className="rp-skillmatch-sum">必备项都已有课程/项目记录（未独立核验）。</p>}
            <p className="xr-source">{match.coverage_note}</p>
          </div>)}
          <p className="xr-source">「有记录」只代表画像里有课程、项目、论文或竞赛条目，未独立核验；名称匹配不代表已掌握，「信息不足」也不等于不具备。技能名称与分类是 LIMEN 编辑信息，原文引用可回查。</p>
        </> : <dl className="xr-check"><div><dt>候选职业技能</dt><dd>暂无：先完成职业兴趣问卷，才会出现候选职业。</dd></div></dl>}
      </section>

      <section id="initial-explanation" className="atlas-sheet xr-sec xr-closing" data-atlas-reveal>
        <p className="xr-closing-note">五个板块各自独立：没有记录的地方先记作未知，不合成一个总分。</p>
        <Link className="xr-closing-action" href="#initial-interest">查看报告<span aria-hidden="true">↑</span></Link>
      </section>
    </div>
  </main>;
}
