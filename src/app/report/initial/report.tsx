"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { type AssessmentResult } from "@/lib/assessment";
import { emptyProfile, profileSchema, type Profile } from "@/lib/profile";
import { competencyGaps, initialReport } from "@/lib/reports";
import { occupationUrl } from "@/lib/directions";
import { InterestRadar } from "../report-visuals";
import { AiReport } from "@/components/ai-report";
import { DirectionArt, StorysetAttribution } from "@/components/direction-art";
import { readProfileOverview } from "@/lib/profile-overview";
import { IconBook, IconCompass, IconFolder, IconPulse, IconStamp, IconWarning } from "@/components/icons";

const relationLabels: Record<string, string> = { direct: "直接关联", related: "相关关联", adjacent: "邻近关联" };
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
          </> : <p className="rp-col-empty">没查到：还没做 O*NET 兴趣问卷。</p>}
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

          <h3 className="rp-col-sub">能带进哪些方向</h3>
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
          </> : null}
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

      <section id="initial-explanation" className="atlas-sheet xr-sec xr-closing" data-atlas-reveal>
        <div className="xr-sec-head"><h2><IconStamp aria-hidden="true" />解释与下一步</h2></div>
        <div className="xr-ai"><AiReport key={JSON.stringify([profile, assessment, mode, busy])} kind="R1" enabled={!busy && mode === "personal" && !!assessment} /></div>
        <div className="xr-actions">
          <Link className="atlas-btn atlas-btn-primary" href="/experience">挑一个方向去体验</Link>
          <Link className="xr-textlink" href="/report/plan">直接排一周的计划</Link>
        </div>
      </section>
    </div>
  </main>;
}
