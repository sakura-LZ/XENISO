"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { type AssessmentResult } from "@/lib/assessment";
import { emptyProfile, profileSchema, type Profile } from "@/lib/profile";
import { competencyGaps, initialReport } from "@/lib/reports";
import { occupationUrl } from "@/lib/directions";
import { InterestRadar, ReportIndex } from "../report-visuals";
import { download } from "@/lib/download";
import { AiReport } from "@/components/ai-report";
import { DirectionArt, StorysetAttribution } from "@/components/direction-art";
import { snapshotSource, translation } from "@/lib/onet/translation";
import { readProfileOverview } from "@/lib/profile-overview";
import { IconBook, IconCompass, IconFolder, IconPulse, IconStamp, IconWarning } from "@/components/icons";

const areaLabels: Record<string, string> = { realistic: "R 实作型", investigative: "I 研究型", artistic: "A 艺术型", social: "S 社会型", enterprising: "E 企业型", conventional: "C 常规型" };
const activityGuide: Record<string, string> = { realistic: "制作、装配与操作实物", investigative: "观察现象、提出问题与实验研究", artistic: "创作文字、音乐与视觉表达", social: "帮助、教学与支持他人", enterprising: "组织、协商与推动事务", conventional: "整理记录、按程序处理信息" };
const relationLabels: Record<string, string> = { direct: "直接关联", related: "相关关联", adjacent: "邻近关联" };
/** R1 固定四栏，顺序固定；解释与下一步是收尾，不算第五栏。 */
const columns = [{ id: "initial-interest", label: "兴趣" }, { id: "initial-evidence", label: "能力迁移" }, { id: "initial-gaps", label: "知识缺口" }, { id: "initial-admissions", label: "报考条件" }];
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
        setProfile(data.profile ?? emptyProfile); setAssessment(data.assessment); setMode(data.profile ? "personal" : "empty"); setMessage(data.assessment ? "" : "完成个人画像与职业兴趣后，查看初步评价。");
      }
    } catch (error) { setMessage(error instanceof Error && !["TimeoutError", "AbortError", "TypeError", "SyntaxError", "ZodError"].includes(error.name) ? error.message : "资料读取或校验失败，请刷新资料重试。"); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => { void load(true); }, 0); return () => clearTimeout(timer); }, [load]);
  function exportEvidence() { download("limen-r1-evidence-draft.json", JSON.stringify({ ...report, simulation: mode === "simulation", limitation: "规则证据草案，AI未生成；不代表报考资格" }, null, 2)); }
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
            <h1 className="xr-title"><IconFolder aria-hidden="true" />初步评价报告</h1>
            <p className="xr-lede">
              <b>R1 = 初步评价报告</b>，是异域探索第 2 步交出来的东西。它固定分四栏，顺序不变：
              <b>兴趣</b>（在哪类活动上给分最高）、<b>能力迁移</b>（画像里已经有什么、能带进新方向）、
              <b>知识缺口</b>（手册要求而你还没记录的）、<b>报考条件</b>（现在只能是空的）。
              它不给分数排名，也不给适合度百分比——那种数字看起来精确，其实不成立。
            </p>
          </div>
          <div className="xr-cover-side">
            <span className="atlas-stamp animate" data-atlas-in="1">R1 · 初步评价</span>
            {mode === "simulation" && <span className="atlas-chip" data-tone="gap">simulation · 合成数据</span>}
            <span className="atlas-chip" data-tone={assessment ? "ok" : undefined}>{assessment ? "已读到官方兴趣结果" : "尚无官方兴趣结果"}</span>
          </div>
        </div>
        <dl className="atlas-kv xr-meta">
          <div><dt>规则版本</dt><dd>{report.version}</dd></div>
          <div><dt>这份档案</dt><dd>{profile.nickname || "昵称未填写"} · {profile.school || "院校未填写"} · {profile.major || "专业未填写"} · {profile.grade || "年级未填写"}</dd></div>
          <div><dt>兴趣结果</dt><dd>{assessment ? `${assessment.instrument} · ${assessment.onet_version} · 返回于 ${new Date(assessment.returned_at).toLocaleString("zh-CN")}` : "没查到：还没做 O*NET 兴趣问卷"}</dd></div>
          <div><dt>文字解读</dt><dd>{report.ai_status === "not_generated" ? "AI 未生成；四栏都是规则整理，不需要联网" : report.ai_status}</dd></div>
        </dl>
        <div className="xr-actions">
          <button className="atlas-btn" type="button" disabled={busy} onClick={() => load(true)}>刷新资料</button>
          <button className="atlas-btn" type="button" disabled={mode === "empty" || busy} onClick={exportEvidence}>导出画像与来源</button>
          <Link className="xr-textlink" href="/assessment">重做兴趣问卷</Link>
          <Link className="xr-textlink" href="/profile">回个人画像</Link>
        </div>
      </header>

      {message && <p className="xr-feedback" role="status">{message}</p>}

      <div className="xr-layout">
        <ReportIndex items={columns} />
        <div className="xr-body">

          <section id="initial-interest" className="atlas-sheet xr-sec" data-atlas-reveal>
            <div className="xr-sec-head"><h2><IconPulse aria-hidden="true" />兴趣</h2><span className="xr-sec-tag">O*NET Mini-IP · 30 题</span></div>
            <p className="xr-note atlas-hand">分数只说明你愿意做哪类活，不说明你能做多好。</p>
            {assessment ? <>
              <p className="xr-body-text">六类兴趣各 5 题，每题 1–5 分，同一类的 5 题相加得到原始分。原始分只用来比较你在这六类活动之间的相对偏好，不折算成适合度，也不和别的考生比。</p>
              <InterestRadar scores={assessment.scores} />
              <details className="xr-details xr-stack">
                <summary>原始结果与职业来源</summary>
                <p className="xr-source">来源 {assessment.source} · 量表 {assessment.instrument} · 数据库版本 {assessment.onet_version} · API {assessment.api_version}<br />返回时间 {new Date(assessment.returned_at).toLocaleString("zh-CN")}</p>
                <ul className="xr-src-list">{assessment.careers.map(c => <li key={c.code}><a href={`https://www.onetonline.org/link/summary/${c.code}`} target="_blank" rel="noreferrer">{c.title} · {c.code}</a></li>)}</ul>
                <p className="xr-source">展示 {assessment.careers.length} 条，共返回 {assessment.career_total} 条。职业信息来自 O*NET Web Services（USDOL/ETA）。</p>
              </details>
            </> : <div className="xr-empty">
              <p>还没有官方兴趣结果，这一栏先空着。兴趣分来自 O*NET 的 30 道活动题，做完才会出现；没有分数时，这里不推断你适合什么。</p>
              <div className="xr-actions"><Link className="atlas-btn atlas-btn-primary" href="/assessment">开始问卷</Link><Link className="xr-textlink" href="/explore">先翻方向手册</Link></div>
            </div>}
            <details className="xr-details">
              <summary>附录：六类兴趣各自在问什么</summary>
              <p className="xr-source">以下是题目活动说明。没有个人结果时，它只是词汇表，不作为测评结论。</p>
              <dl className="atlas-kv xr-kv-tight xr-stack">{Object.entries(areaLabels).map(([area, label]) => { const example = translation.items.find(item => item.area === area); return <div key={area}><dt>{label}</dt><dd>{activityGuide[area]}。题目示例：{example?.zh}（原题 {example?.index}：<span lang="en">{example?.original_en}</span>）。</dd></div>; })}</dl>
              <p className="xr-source">活动来源：<a href={snapshotSource} target="_blank" rel="noreferrer">O*NET Mini-IP 2016 附录 A</a>；中文译稿 {translation.version}，待人工复核。</p>
            </details>
          </section>

          <section id="initial-evidence" className="atlas-sheet xr-sec" data-atlas-reveal>
            <div className="xr-sec-head"><h2><IconCompass aria-hidden="true" />能力迁移</h2><span className="xr-sec-tag">本人填写 · 未独立核验</span></div>
            <p className="xr-body-text">这一栏只回答一件事：你手上已经有什么，其中哪些能带进新方向。它不判断能力高低；记录名称相关也不等于已经掌握。</p>
            {mode !== "empty" ? <p className="xr-source">画像：{profile.school || "院校未填写"} · {profile.major || "专业未填写"} · {profile.grade || "年级未填写"}<br />课程 {profile.courses.length} 条、研究项目 {profile.research_projects.length} 条、论文记录 {profile.papers.length} 条、技术自评 {profile.tech_skills.length} 条。全部来自本人填写，未独立核验。</p> : <p className="xr-source">尚未读取个人经历。<Link href="/profile/basics">填写医学经历</Link>。</p>}

            <h3 className="xr-stack">已经记录在案的</h3>
            {report.evidence.length ? <ol className="xr-records">
              {leadRecords.map(row => <li className="xr-record" key={row.ref}>
                <div className="xr-record-head"><h3>{row.skill}</h3><span className="atlas-chip" data-tone="gap">{row.status}</span></div>
                <p className="xr-record-body">{row.evidence}</p>
                <details><summary>这条记录从哪来</summary><p className="xr-source">记录位置：<code>{row.ref}</code>。改这条记录要去画像里改，报告会跟着重算。</p><Link className="xr-textlink" href="/profile/basics">核对个人画像记录</Link></details>
              </li>)}
              {restRecords.length > 0 && <li className="xr-record">
                <details><summary>展开其余 {restRecords.length} 条记录</summary>
                  <ol className="xr-records">{restRecords.map(row => <li className="xr-record" key={row.ref}>
                    <div className="xr-record-head"><h3>{row.skill}</h3><span className="atlas-chip" data-tone="gap">{row.status}</span></div>
                    <p className="xr-record-body">{row.evidence}</p>
                    <details><summary>这条记录从哪来</summary><p className="xr-source">记录位置：<code>{row.ref}</code>。</p><Link className="xr-textlink" href="/profile/basics">核对个人画像记录</Link></details>
                  </li>)}</ol>
                </details>
              </li>}
            </ol> : <p className="xr-empty">尚无课程、技能或项目记录。空着不代表没有能力，只代表这份档案还没有证据可引。</p>}

            <h3 className="xr-stack">能带进哪些方向</h3>
            <p className="xr-source">下面每个方向后面，是手册里写的「医学经历可能提供的起点」。它说明医学训练在哪一段接得上，不是录用条件。</p>
            {report.candidates.length ? <ol className="xr-directions xr-stack">
              {report.candidates.map(({ direction, occupations }) => <li className="xr-direction atlas-lift" key={direction.id}>
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
            </ol> : <p className="xr-empty">{assessment ? "这次职业匹配没有指向手册内的方向，可以先从具体工作任务开始了解。" : "完成官方兴趣问卷后，这里会出现关联方向。"}</p>}
            {!!report.outside_directory.length && <p className="xr-source xr-stack">另有 {report.outside_directory.length} 个匹配职业在当前手册之外，可在「兴趣」栏的原始结果里查看。</p>}
            {report.candidates.length > 0 && <StorysetAttribution />}
          </section>

          <section id="initial-gaps" className="atlas-sheet xr-sec" data-atlas-reveal>
            <div className="xr-sec-head"><h2><IconBook aria-hidden="true" />知识缺口</h2><span className="xr-sec-tag">手册要求 − 画像记录</span></div>
            <p className="xr-body-text">这一栏只做一件事：把方向手册里写着「能力基础」和「入门前先补的基础」的条目，和你画像里已经记录的内容对一遍，列出手册要、而你没有记录的那部分。它不是能力评分。</p>
            {gapGroups.length ? <>
              {gapCount > 0 ? <div className="xr-gap-groups xr-stack">{gapGroups.map(({ direction, skills, courses }) => <div className="xr-gap-group" key={direction.id}>
                <h3><Link href={`/explore?direction=${direction.id}`}>{direction.name}</Link></h3>
                {skills.length + courses.length > 0 ? <ul className="xr-gap-list">
                  {skills.map(gap => <li key={`skill-${gap.skill}`}><span className="atlas-chip" data-tone="gap">要补基础</span><span className="xr-gap-name">{gap.skill}</span><span className="xr-gap-src">能力基础</span></li>)}
                  {courses.map(course => <li key={`course-${course}`}><span className="atlas-chip" data-tone="gap">要补基础</span><span className="xr-gap-name">{course}</span><span className="xr-gap-src">入门前先补的基础</span></li>)}
                </ul> : <p className="xr-source">这个方向的入门要求里，没有你还没记录的条目。</p>}
              </div>)}</div> : <p className="xr-empty">没查到：这次职业匹配没有指向手册内的方向，暂时没有可对照的入门要求。<Link href="/explore">翻方向手册</Link>。</p>}
            </> : <p className="xr-empty">没查到：还没有关联方向，也就没有可对照的手册要求。做完兴趣问卷后再回来看这一栏。</p>}
            <ul className="xr-gaps xr-stack">
              <li>没有记录不等于没有能力。这里的「要补基础」只说明画像里还没有证据，不说明你学不会。</li>
              <li>缺口的正式计算在 R2 行动规划里：那边会按你选定的方向，把技能条目和自述经历逐条对照，并排出补的顺序。这里只做提示。</li>
              <li>手册没写到、或你查不到对应要求的条目，这里一律写「没查到」，不替它补一个。</li>
            </ul>
          </section>

          <section id="initial-admissions" className="atlas-sheet xr-sec" data-atlas-reveal>
            <div className="xr-sec-head"><h2><IconWarning aria-hidden="true" />报考条件</h2><span className="xr-sec-tag">全部待核验</span></div>
            <p className="xr-body-text">这一栏现在只能是空的：还没拿到任何目标院校当年的招生目录原文。空着比编一条有用。下面是你要自己去核对的项目，核过的写上日期。</p>
            <div className="xr-flag xr-stack"><span className="atlas-chip" data-tone="miss">没查到</span><span className="xr-source">招生资格、考试科目与复试要求均未取得官方原文。</span></div>
            <dl className="xr-check xr-stack">
              <div><dt>学校与项目</dt><dd>核实院校、项目名称、专业代码与招生方式。</dd></div>
              <div><dt>目标年份</dt><dd>核实招生年份、报名与考核时间，记录发布日期。</dd></div>
              <div><dt>报考条件</dt><dd>核实跨专业资格、考试科目、语言与复试要求。</dd></div>
              <div><dt>官方来源</dt><dd>保存项目官方 URL、原文与本次核验日期。</dd></div>
            </dl>
            <p className="xr-source">报告里这一条同样写着：招生资格与具体考试要求未核实。未核实就不当结论用。</p>
            <div className="xr-actions"><Link className="atlas-btn" href="/explore">按方向查报考条目</Link><Link className="xr-textlink" href="/profile">补全画像</Link></div>
          </section>

        </div>
      </div>

      <section id="initial-explanation" className="atlas-sheet xr-sec xr-closing" data-atlas-reveal>
        <div className="xr-sec-head"><h2><IconStamp aria-hidden="true" />解释与下一步</h2><span className="xr-sec-tag">收尾</span></div>
        <p className="xr-body-text">上面四栏是规则整理的结果，不需要联网。想要一段把四栏串起来的文字，可以让 AI 单独写一遍；它只能引用上面这些证据，不会新增院校、考试科目或学习时长。</p>
        <div className="xr-ai"><AiReport key={JSON.stringify([profile, assessment, mode, busy])} kind="R1" enabled={!busy && mode === "personal" && !!assessment} /></div>
        <div className="xr-next xr-stack">
          <p className="xr-body-text">下一步不是继续在报告里加结论，而是去试一次真实的活，看看自己坐不坐得住。</p>
          <div className="xr-actions">
            <Link className="atlas-btn atlas-btn-primary" href="/experience">挑一个方向去体验</Link>
            <Link className="xr-textlink" href="/report/plan">直接排一周的计划</Link>
          </div>
        </div>
        <p className="xr-note atlas-hand xr-stack">继续留在临床也是一条正当的路。这份报告只把你偏好的活动摆出来，不催你换。</p>
      </section>

      <footer className="xr-foot">
        <p>依据：O*NET 兴趣量表（Interest Profiler）的题目结构改写为中文，中文译稿 {translation.version}，待人工复核；计分来自 O*NET Web Services。能力条目来自本人自填记录、按规则整理，报考条件一律待核验。</p>
        <p>{mode === "simulation" ? "当前载入的是合成演示档案（simulation），不是你的真实记录，只用来演示版式。" : "本页分数是官方兴趣计分结果，能力条目是本人自填记录，两者都未独立核验。"}</p>
        <p className="atlas-hand">先挑离你最近的那一件事做，别一次把路全改掉。</p>
      </footer>
    </div>
  </main>;
}
