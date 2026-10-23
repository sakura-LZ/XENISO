"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconBook,
  IconCalendar,
  IconCompass,
  IconDownload,
  IconPin,
  IconProfile,
  IconPulse,
  IconQuiz,
  IconWarning,
} from "@/components/icons";
import { assessmentSchema, type AssessmentResult } from "@/lib/assessment";
import type { Direction } from "@/lib/directions";
import { download } from "@/lib/download";
import { documentSnapshot, snapshotSource, translatedQuestion, translation, type Questionnaire } from "@/lib/onet/translation";
import { emptyProfile, type Profile } from "@/lib/profile";
import { readProfileOverview } from "@/lib/profile-overview";
import { initialReport, skillEvidence } from "@/lib/reports";

const areaOrder = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"] as const;
type AreaCode = (typeof areaOrder)[number];
const areaMeta: Record<AreaCode, { zh: string; en: string; letter: string; guide: string }> = {
  realistic: { zh: "实作型", en: "Realistic", letter: "R", guide: "动手制作、装配、操作实物" },
  investigative: { zh: "研究型", en: "Investigative", letter: "I", guide: "观察现象、提出问题、做实验" },
  artistic: { zh: "艺术型", en: "Artistic", letter: "A", guide: "写作、作曲、视觉表达" },
  social: { zh: "社会型", en: "Social", letter: "S", guide: "帮助、教学、支持他人" },
  enterprising: { zh: "企业型", en: "Enterprising", letter: "E", guide: "组织、协商、推动事务" },
  conventional: { zh: "常规型", en: "Conventional", letter: "C", guide: "整理记录、按程序处理信息" },
};
function metaOf(code: string) {
  return areaMeta[code as AreaCode] ?? { zh: code, en: code, letter: "·", guide: "活动说明待补充" };
}

/** 任务里出现这些词时，说明要动手产出技术成果，医学训练不直接覆盖。 */
const foundationTask = /(清洗|训练|建模|编程|实现|部署|搭建|开发|编写|配置|复现|优化|标注|处理|分析|设计|评估|测试)/;

type TransferRow = { medical: string; task: string; transferable: boolean };
const fallbackTransfer: TransferRow[] = [
  { medical: "临床推理", task: "数据判读", transferable: true },
  { medical: "病历书写", task: "结构化记录", transferable: true },
  { medical: "文献阅读", task: "论文复现", transferable: false },
  { medical: "医患沟通", task: "需求访谈", transferable: true },
];
function transferRowsFor(direction: Direction): TransferRow[] {
  const rows = direction.medical_transfer.slice(0, 4).map((medical, i) => {
    const task = direction.work_tasks[i % direction.work_tasks.length] ?? direction.work_tasks[0] ?? "对应任务待补充";
    return { medical, task, transferable: !foundationTask.test(task) };
  });
  return rows.length ? rows : fallbackTransfer;
}

type GapRow = { skill: string; course: string | undefined };
function gapRowsFor(direction: Direction, profile: Profile): GapRow[] {
  const evidence = skillEvidence(profile).map(row => row.skill.trim()).filter(Boolean);
  const lower = (value: string) => value.toLocaleLowerCase();
  return direction.skills
    .map(skill => {
      const known = evidence.some(item => lower(item).includes(lower(skill)) || lower(skill).includes(lower(item)));
      const course = direction.courses.find(item => lower(item).includes(lower(skill)) || lower(skill).includes(lower(item)));
      return { skill, known, course };
    })
    .filter(row => !row.known)
    .map(row => ({ skill: row.skill, course: row.course }));
}

function errorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object") {
    const error = (body as { error?: { message?: unknown } }).error;
    if (error && typeof error.message === "string") return error.message;
  }
  return fallback;
}
function friendlyError(error: unknown, fallback: string) {
  if (error instanceof Error && !["TimeoutError", "AbortError", "TypeError", "SyntaxError", "ZodError"].includes(error.name)) return error.message;
  return fallback;
}
function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type OverviewState = "loading" | "ready" | "anonymous" | "error";

export function Assessment() {
  const [overviewState, setOverviewState] = useState<OverviewState>("loading");
  const [overviewError, setOverviewError] = useState("");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const movedOnce = useRef(false);

  const loadOverview = useCallback(async () => {
    setOverviewState("loading");
    setOverviewError("");
    try {
      const overview = await readProfileOverview(fetch, AbortSignal.timeout(15000));
      setProfile(overview.profile ?? emptyProfile);
      if (overview.assessment) setResult(overview.assessment);
      setOverviewState(overview.profile ? "ready" : "anonymous");
    } catch (error) {
      setOverviewError(friendlyError(error, "这次没读出来，可能是网络中断或服务暂时不可用。"));
      setOverviewState("error");
    }
  }, []);

  useEffect(() => {
    // 放到宏任务里再触发：loadOverview 开头会同步把状态置为 loading，
    // 直接在 effect 体里调用会形成级联渲染（React 官方不建议）。
    const id = window.setTimeout(() => { void loadOverview(); }, 0);
    return () => window.clearTimeout(id);
  }, [loadOverview]);

  useEffect(() => {
    if (!questionnaire) return;
    headingRef.current?.focus({ preventScroll: true });
    if (!movedOnce.current) {
      movedOnce.current = true;
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    stageRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }, [index, questionnaire]);

  const total = questionnaire?.questions.length ?? 30;
  const question = questionnaire?.questions[Math.min(index, total - 1)];
  const answeredCount = Object.keys(answers).length;
  // 选项文字按 value 建索引，选中后在选项下方回显一句，不用再扫一遍数组。
  const optionLabels = useMemo<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const option of questionnaire?.answer_options ?? []) {
      map[option.value] = documentSnapshot.answer_options.find(item => item.value === option.value)?.name ?? option.name;
    }
    return map;
  }, [questionnaire]);

  const load = useCallback(async () => {
    setBusy(true);
    setMessage("");
    setSaved(false);
    try {
      const response = await fetch("/api/onet/questions", { signal: AbortSignal.timeout(30000) });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(data, "官方题目加载失败。"));
      setQuestionnaire(data as Questionnaire);
      setAnswers({});
      setIndex(0);
      movedOnce.current = false;
    } catch (error) {
      setMessage(friendlyError(error, "官方题目读取中断，请重新加载问卷。"));
    } finally {
      setBusy(false);
    }
  }, []);

  const submit = useCallback(async () => {
    if (!questionnaire) return;
    if (questionnaire.source !== "onet_live") {
      setMessage("这不是实时读取的官方题目，不能生成官方计分结果。请重新加载问卷。");
      return;
    }
    if (Object.keys(answers).length !== total) {
      setMessage(`还有 ${total - Object.keys(answers).length} 题没答，答完才能提交。`);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const login = await fetch("/api/session", { method: "POST", signal: AbortSignal.timeout(30000) });
      if (!login.ok) throw new Error("暂时无法保存这一次测评，请稍后重试。");
      const response = await fetch("/api/onet/results", {
        method: "POST",
        signal: AbortSignal.timeout(90000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([key, value]) => ({ index: Number(key), answer: value })),
          onet_version: questionnaire.onet_version,
          api_version: questionnaire.api_version,
        }),
      });
      const data: unknown = await response.json();
      const savedAssessment = (data as { assessment?: unknown }).assessment;
      const parsed = assessmentSchema.safeParse(savedAssessment);
      if (!response.ok || (data as { saved?: boolean }).saved !== true || !parsed.success) {
        throw new Error(errorMessage(data, "没收到官方结果的保存确认。"));
      }
      setResult(parsed.data);
      setSaved(true);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    } catch (error) {
      setMessage(friendlyError(error, "提交中断，还没确认结果已保存。答案还在这页上，可以重试。"));
    } finally {
      setBusy(false);
    }
  }, [answers, questionnaire, total]);

  const goTo = useCallback((next: number) => {
    setIndex(Math.max(0, Math.min(total - 1, next)));
  }, [total]);

  const restart = useCallback(() => {
    setResult(null);
    setQuestionnaire(null);
    setAnswers({});
    setIndex(0);
    setMessage("");
    setSaved(false);
    movedOnce.current = false;
  }, []);

  return (
    <main id="main" className="shell assessment-page">
      <header className="assessment-head" data-atlas-reveal>
        <div className="assessment-head-main">
          <p className="atlas-label">第 2 步 · 初步评价</p>
          <h1 className="t-title">初步评价</h1>
          <p className="t-lede">
            答 30 道兴趣题，拿到初步评价报告 R1。它只整理你的分数和画像资料，不替你决定专业。
          </p>
        </div>
        <div className="assessment-head-tools">
          <span className="atlas-chip">第 2 步 / 共 4 步</span>
        </div>
      </header>

      {message && <p className="notice" role="status">{message}</p>}

      {result ? (
        <R1Report assessment={result} profile={profile} onRestart={restart} />
      ) : questionnaire && question ? (
        <section className="assessment-stage" aria-labelledby="qn-heading" ref={stageRef}>
          {/* 进度条跟随滚动常驻：任何时候都能看到第几题、还剩多少、能不能回去改。 */}
          <div className="qn-meter" data-sticky="1">
            <div className="qn-meter-top">
              <p className="qn-count">
                <b>{String(index + 1).padStart(2, "0")}</b>
                <span>/ {total}</span>
              </p>
              <p className="qn-left">
                已回答 {answeredCount} · 还剩 {total - answeredCount}
              </p>
              <span className="atlas-chip" data-tone="ok">
                <IconPin aria-hidden="true" />
                点题号可回改
              </span>
            </div>
            {/* 本页主动效：答题进度像铅笔画在打孔纸上，一格一格往前走。 */}
            <div className="qn-strip">
              {Array.from({ length: total }, (_, position) => {
                const done = answers[position + 1] !== undefined;
                const current = position === index;
                return (
                  <button
                    key={position}
                    type="button"
                    className="qn-pin"
                    data-done={done}
                    data-current={current}
                    aria-label={`第 ${position + 1} 题${done ? "，已答，点这里回去改" : ""}`}
                    aria-current={current ? "step" : undefined}
                    disabled={!done || current || busy || saved}
                    onClick={() => goTo(position)}
                  />
                );
              })}
              <span className="qn-pencil" style={{ left: `${((index + 0.5) / total) * 100}%` }} />
            </div>
          </div>

          <div className="qn-sheet swap-in" key={question.index}>
            <span className="atlas-tape mid" aria-hidden="true" />
            <div className="qn-sheet-top">
              <span className="qn-index">{String(question.index).padStart(2, "0")}</span>
              <span className="qn-area">
                <b>
                  {metaOf(question.area).letter} · {metaOf(question.area).zh}
                </b>
                <span>{metaOf(question.area).en}</span>
              </span>
              <span className="assessment-fact">O*NET 题号 {String(question.index).padStart(2, "0")}</span>
            </div>

            <h2 className="qn-text" id="qn-heading" tabIndex={-1} ref={headingRef}>
              {translatedQuestion(question) ?? question.original_en}
            </h2>
            <p className="qn-translation-note">
              {translatedQuestion(question)
                ? `中文是本站独立译稿（${translation.version}，待人工复核），可展开下方原题。`
                : "这道题还没有核对通过的中文译稿，先显示 O*NET 英文原题。"}
            </p>
            <details className="qn-source">
              <summary>原题与版本来源</summary>
              <p lang="en">{question.original_en}</p>
              <p>
                题号 {question.index} · 维度 {metaOf(question.area).letter} {metaOf(question.area).zh}（{metaOf(question.area).en}） · {questionnaire.onet_version} · API {questionnaire.api_version}
              </p>
              <p>
                译稿只在题号、维度与英文原文逐字一致时显示；来源见{" "}
                <a href={snapshotSource} target="_blank" rel="noreferrer">
                  O*NET Mini-IP 2016 附录 A
                </a>
                。
              </p>
            </details>

            <div className="qn-options" role="radiogroup" aria-labelledby="qn-heading">
              {questionnaire.answer_options.map(option => {
                const name = documentSnapshot.answer_options.find(item => item.value === option.value)?.name ?? option.name;
                const selected = answers[question.index] === option.value;
                return (
                  <label className="qn-option" key={option.value} data-selected={selected}>
                    <input
                      type="radio"
                      name={`q${question.index}`}
                      value={option.value}
                      checked={selected}
                      disabled={busy || saved}
                      onChange={() => {
                        setAnswers(current => ({ ...current, [question.index]: option.value }));
                        setSaved(false);
                        setMessage("");
                      }}
                    />
                    <span className="qn-option-code">{option.value}</span>
                    <span>{name}</span>
                  </label>
                );
              })}
            </div>

            <p className="qn-picked" role="status">
              {answers[question.index] !== undefined
                ? `已选「${optionLabels[answers[question.index]] ?? ""}」· 可以继续，也可以换一项`
                : "选一项，再点下一题。"}
            </p>

            <p className="atlas-hand qn-hand">按第一反应选，不用先想它以后有没有用。</p>

            <div className="qn-actions">
              <button className="button secondary" type="button" disabled={index === 0 || busy} onClick={() => goTo(index - 1)}>
                上一题
              </button>
              <button className="button secondary" type="button" disabled={index >= total - 1 || busy} onClick={() => goTo(index + 1)}>
                跳过
              </button>
              <span className="qn-actions-spacer" />
              {index < total - 1 ? (
                <button className="button" type="button" disabled={answers[question.index] === undefined || busy} onClick={() => goTo(index + 1)}>
                  下一题
                </button>
              ) : (
                <button className="button" type="button" disabled={busy || answeredCount !== total} onClick={submit}>
                  {busy ? "正在提交…" : answeredCount === total ? "提交这 30 题" : `还差 ${total - answeredCount} 题`}
                </button>
              )}
            </div>
            <p className="qn-actions-note">
              答案只存在这一页，离开前要提交。也可以先{" "}
              <Link className="link" href="/profile/basics">
                回个人画像补资料
              </Link>
              。
            </p>
          </div>
        </section>
      ) : (
        <section className="assessment-intro-section" data-atlas-reveal>
          <div className="assessment-stage">
            {overviewState === "loading" && (
              <p className="assessment-fact" role="status">
                正在读取你的画像与上次结果…
              </p>
            )}
            {overviewState === "error" && (
              <div className="notice qn-overview-error" role="alert">
                <p>{overviewError || "画像没读出来。这不影响答题，可以直接开始。"}</p>
                <button className="button secondary" type="button" onClick={() => void loadOverview()}>
                  重试读取
                </button>
              </div>
            )}
            {overviewState !== "loading" && (
              <div className="assessment-paper">
                <span className="atlas-tape mid" aria-hidden="true" />
                <div className="atlas-sheet assessment-intro">
                  <p className="atlas-label">问卷 · O*NET Mini-IP 2016</p>
                  <h2 className="t-block">职业兴趣问卷 · 30 项工作活动</h2>
                  <p className="t-body assessment-intro-lead">
                    每题一种工作活动，六类各 5 题；同类活动会出现两次，这是量表设计。
                  </p>
                  <dl className="as-spec">
                    <div>
                      <dt><IconQuiz aria-hidden="true" />题量</dt>
                      <dd>30 题，一次一题</dd>
                    </div>
                    <div>
                      <dt><IconProfile aria-hidden="true" />选项</dt>
                      <dd>五档，记 1–5</dd>
                    </div>
                    <div>
                      <dt><IconCalendar aria-hidden="true" />用时</dt>
                      <dd>多数人 4–6 分钟</dd>
                    </div>
                    <div>
                      <dt><IconPin aria-hidden="true" />回改</dt>
                      <dd>可回上一题，也可点题号跳回</dd>
                    </div>
                  </dl>
                  <p className="as-limit">
                    <IconWarning aria-hidden="true" />
                    <span>
                      只问喜不喜欢，不问会不会；兴趣分不代表能力，也不作录取判断。
                      <br />
                      按第一反应选；答案只在这一页，离开或刷新会丢。
                    </span>
                  </p>
                  <div className="assessment-intro-actions">
                    <button className="button" type="button" disabled={busy} onClick={load}>
                      {busy ? "正在读题…" : "开始问卷"}
                    </button>
                    <Link className="button secondary" href="/profile">
                      先补个人画像
                    </Link>
                  </div>
                  <p className="assessment-source">
                    题目来自{" "}
                    <a href="https://services.onetcenter.org/" target="_blank" rel="noreferrer">
                      O*NET Web Services
                    </a>
                    （USDOL/ETA），译稿见{" "}
                    <a href={snapshotSource} target="_blank" rel="noreferrer">
                      Mini-IP 2016 附录 A
                    </a>
                    ，待人工复核。
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="assessment-fill">
            <div className="assessment-paper">
              <span className="atlas-tape tl" aria-hidden="true" />
              <div className="atlas-sheet">
                <h3 className="assessment-fill-title">答完给你四栏</h3>
                <dl className="as-index">
                  <div>
                    <dt><IconPulse aria-hidden="true" />兴趣六维</dt>
                    <dd>六类各 5 题按类加总，不换算百分位。</dd>
                  </div>
                  <div>
                    <dt><IconCompass aria-hidden="true" />能力迁移</dt>
                    <dd>临床做熟的动作，对应到目标方向的任务。</dd>
                  </div>
                  <div>
                    <dt><IconBook aria-hidden="true" />知识缺口</dt>
                    <dd>方向入门课减去画像里填过的。</dd>
                  </div>
                  <div>
                    <dt><IconWarning aria-hidden="true" />报考条件</dt>
                    <dd>没拿到招生目录原文，一律标「没查到」。</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function InterestRadar({ scores, maximum }: { scores: AssessmentResult["scores"]; maximum: number }) {
  const cx = 160;
  const cy = 142;
  const radius = 90;
  const at = (position: number, ratio: number) => {
    const angle = ((-90 + position * 60) * Math.PI) / 180;
    return [cx + Math.cos(angle) * radius * ratio, cy + Math.sin(angle) * radius * ratio] as const;
  };
  const ring = (ratio: number) => Array.from({ length: 6 }, (_, i) => at(i, ratio).map(value => value.toFixed(1)).join(",")).join(" ");
  const values = scores.map(score => (maximum > 0 ? score.score / maximum : 0));
  const drawn = values.map((ratio, i) => at(i, ratio).map(value => value.toFixed(1)).join(","));
  const label = (position: number) => {
    const [x, y] = at(position, 1.16);
    const cosine = Math.cos(((-90 + position * 60) * Math.PI) / 180);
    const anchor: "start" | "middle" | "end" = cosine > 0.2 ? "start" : cosine < -0.2 ? "end" : "middle";
    return { x, y: y + 5, anchor };
  };
  return (
    <svg
      className="r1-radar"
      viewBox="0 0 320 292"
      role="img"
      aria-label={`兴趣六维原始分：${scores.map(score => `${metaOf(score.code).zh} ${score.score} 分`).join("，")}`}
    >
      <defs>
        <filter id="r1-rough" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="7" result="roughNoise" />
          <feDisplacementMap in="SourceGraphic" in2="roughNoise" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g className="r1-radar-grid" filter="url(#r1-rough)">
        <polygon points={ring(1)} />
        <polygon points={ring(0.66)} />
        <polygon points={ring(0.33)} />
        {Array.from({ length: 6 }, (_, i) => {
          const [x, y] = at(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} />;
        })}
      </g>
      <g className="atlas-draw" filter="url(#r1-rough)">
        <path className="r1-radar-data" d={`M ${drawn.join(" L ")} Z`} />
      </g>
      <g className="r1-radar-dot">
        {values.map((ratio, i) => {
          const [x, y] = at(i, ratio);
          return <circle key={i} cx={x} cy={y} r="3.4" />;
        })}
      </g>
      {scores.map((score, i) => {
        const { x, y, anchor } = label(i);
        return (
          <text key={score.code} className="r1-radar-label" x={x} y={y} textAnchor={anchor}>
            {metaOf(score.code).zh}
          </text>
        );
      })}
    </svg>
  );
}

function R1Report({ assessment, profile, onRestart }: { assessment: AssessmentResult; profile: Profile; onRestart: () => void }) {
  const report = useMemo(() => initialReport(profile, assessment), [profile, assessment]);
  const ordered = areaOrder
    .map(code => assessment.scores.find(score => score.code === code))
    .filter((score): score is AssessmentResult["scores"][number] => Boolean(score));
  const maximum = Math.max(1, ...ordered.map(score => score.score));
  const sorted = [...ordered].sort((a, b) => b.score - a.score);
  const first = sorted[0];
  const second = sorted[1];
  const topDirection = report.candidates[0]?.direction ?? null;
  const transfers = topDirection ? transferRowsFor(topDirection) : fallbackTransfer;
  const gaps = topDirection ? gapRowsFor(topDirection, profile) : [];
  const profileLine = [
    profile.school || "院校未填写",
    profile.major || "专业未填写",
    profile.grade || "年级未填写",
    `课程 ${profile.courses.length} 条`,
    `研究项目 ${profile.research_projects.length} 条`,
  ].join(" · ");

  function exportReport() {
    const payload = {
      report: "R1 初步评价（规则整理，不代表报考资格）",
      exported_at: new Date().toISOString(),
      onet: { source: assessment.source, onet_version: assessment.onet_version, api_version: assessment.api_version, returned_at: assessment.returned_at },
      scores: assessment.scores,
      answers: assessment.answers,
      careers: assessment.careers,
      matching_directions: report.candidates.map(candidate => ({
        id: candidate.direction.id,
        name: candidate.direction.name,
        occupations: candidate.occupations.map(item => ({ code: item.code, name: item.name })),
      })),
      capability_transfer: transfers,
      knowledge_gaps: gaps.map(gap => ({ skill: gap.skill, course: gap.course ?? null })),
      admission: { status: "没查到", note: "未取得目标院校当年招生目录原文，不判断报考资格。" },
      limitation: "兴趣分只表示活动偏好，不代表能力；能力迁移与知识缺口是编辑性整理；报考条件待核实。",
    };
    download(`xeniso-r1-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
  }

  return (
    <section className="r1" aria-labelledby="r1-title">
      <header className="r1-head" data-atlas-reveal>
        <div className="r1-head-main">
          <h2 id="r1-title">初步评价报告 R1</h2>
          <p>
            <b>R1 = 初步评价报告</b>，是第 2 步的产出：兴趣六维来自刚才 30 题的 O*NET 官方计分，
            能力迁移与知识缺口按本次匹配到的方向整理，报考条件则因为还没拿到招生目录原文，一律标「没查到」。
            这份报告不给分数，也不给方向排名。
          </p>
        </div>
        <div className="r1-meta">
          <span className="atlas-stamp">R1 · 初步评价</span>
          <time className="r1-meta-date" dateTime={assessment.returned_at}>
            {formatDate(assessment.returned_at)}
          </time>
          <span className="r1-meta-ver">第 1 版 · 已保存到账户</span>
        </div>
      </header>

      <p className="r1-summary">
        <span className="r1-summary-key">一句话</span>
        {first && second ? (
          <>
            你在「<b>{metaOf(first.code).zh}</b>」和「<b>{metaOf(second.code).zh}</b>」这两类活动上给分最高：
            {metaOf(first.code).guide}、{metaOf(second.code).guide}。这说的是你愿意做哪类活，不是你能做多好，
            也不代表哪个专业更适合你。
          </>
        ) : (
          "这次没有读到完整的六维分数，暂时只能看到原始答案。"
        )}
      </p>

      <div className="r1-doc">
        <div className="r1-cols" data-atlas-reveal data-atlas-stagger>
          <section className="r1-col" aria-labelledby="r1-interest">
            <h3 id="r1-interest"><IconPulse className="r1-col-icon" aria-hidden="true" />兴趣六维</h3>
            <p className="r1-note">
              六类兴趣各 5 题，每题 1–5 分，合计 5–25 分。分数只表示你对这类活动的喜好强度，不换算成百分位，也不代表能力。
            </p>
            <figure className="r1-radar-figure">
              <InterestRadar scores={ordered} maximum={maximum} />
              <figcaption className="r1-note">
                这次最高的是「{first ? metaOf(first.code).zh : "—"}」{first ? first.score : "—"} 分。
              </figcaption>
            </figure>
            <dl className="r1-scores">
              {ordered.map(score => (
                <div key={score.code}>
                  <dt>
                    <i>{metaOf(score.code).letter}</i>
                    {metaOf(score.code).zh}
                  </dt>
                  <dd data-top={score.score === maximum}>{score.score}</dd>
                </div>
              ))}
            </dl>
            <details className="qn-source">
              <summary>原始版本与返回时间</summary>
              <p>
                {assessment.source} · {assessment.onet_version} · API {assessment.api_version}
              </p>
              <p>返回时间 {new Date(assessment.returned_at).toLocaleString("zh-CN")}</p>
              <p>计分与职业信息来自 O*NET Web Services（USDOL/ETA）。</p>
            </details>
          </section>

          <section className="r1-col" aria-labelledby="r1-transfer">
            <h3 id="r1-transfer"><IconCompass className="r1-col-icon" aria-hidden="true" />能力迁移</h3>
            <p className="r1-note">
              左边是临床训练里已经做熟的动作，右边是{topDirection ? `「${topDirection.name}」` : "目标方向"}里对应的任务。
              判断口径：医学侧带来的领域理解和评价习惯可以直接带入；要动手做出技术成果的部分，标为要补基础。
            </p>
            {transfers.map(row => (
              <div className="r1-row" key={`${row.medical}-${row.task}`}>
                <p className="r1-row-title">
                  <span>{row.medical}</span>
                  <span className="r1-arrow">→</span>
                  <span>{row.task}</span>
                </p>
                <div className="r1-row-head">
                  <span className="atlas-chip" data-tone={row.transferable ? "ok" : "gap"}>
                    {row.transferable ? "可以直接用" : "要补基础"}
                  </span>
                </div>
                <p className="r1-row-why">
                  {row.transferable
                    ? `「${row.medical}」在临床训练里反复出现，换到「${row.task}」时动作形状相近，结论仍要用新领域的标准核对。`
                    : `「${row.task}」要上手得先补技术基础，医学训练不直接覆盖这一层。`}
                </p>
              </div>
            ))}
            {!topDirection && <p className="r1-note">这次职业匹配没有指向手册内的方向，先按通用迁移整理。</p>}
          </section>

          <section className="r1-col" aria-labelledby="r1-gap">
            <h3 id="r1-gap"><IconBook className="r1-col-icon" aria-hidden="true" />知识缺口</h3>
            <p className="r1-note">
              这里只列你在画像里没有记录、又确实用得上的技能。没有记录不等于没有能力，它只用来决定从哪里开始补。
            </p>
            {gaps.length ? (
              gaps.slice(0, 6).map(gap => (
                <div className="r1-row" key={gap.skill}>
                  <div className="r1-row-head">
                    <p className="r1-row-title">
                      <span>{gap.skill}</span>
                    </p>
                    <span className="atlas-chip" data-tone={gap.course ? "gap" : "miss"}>
                      {gap.course ? "要补基础" : "没查到要求"}
                    </span>
                  </div>
                  <p className="r1-row-why">
                    {gap.course
                      ? `方向手册给的入门课是「${gap.course}」，先按这门课的概念做一次小练习。`
                      : "方向手册没有列出对应课程，需要向目标项目的招生目录核对先修要求。"}
                  </p>
                </div>
              ))
            ) : (
              <p className="r1-note">这次没发现画像里完全空白的技能；可以对照方向手册的课程清单逐项核对。</p>
            )}
          </section>

          <section className="r1-col" aria-labelledby="r1-admission">
            <h3 id="r1-admission"><IconWarning className="r1-col-icon" aria-hidden="true" />报考条件</h3>
            <p className="r1-note">
              常见初试组合如下。目标院校当年的招生目录原文我们还没拿到，所以每一项都标「没查到」，不判断你能不能报。
            </p>
            <ul className="r1-exam">
              <li>
                <span className="r1-exam-code">101</span>思想政治理论
                <span className="atlas-chip" data-tone="miss">没查到</span>
              </li>
              <li>
                <span className="r1-exam-code">201</span>英语（一）
                <span className="atlas-chip" data-tone="miss">没查到</span>
              </li>
              <li>
                <span className="r1-exam-code">301</span>数学（一）
                <span className="atlas-chip" data-tone="miss">没查到</span>
              </li>
            </ul>
            <p className="r1-note">
              有的院校考 302 数学（二）或者不考数学；跨专业资格、加试与复试要求也各不相同。查法：到{" "}
              <Link className="link" href="/explore">
                信息文库
              </Link>{" "}
              按方向找招生目录条目，以原文为准。
            </p>
          </section>
        </div>
      </div>

      <section className="r1-matches" aria-labelledby="r1-match-title">
        <h3 id="r1-match-title">这次匹配到的方向</h3>
        <p>按 O*NET 返回的职业顺序列出，不是推荐排名。方向映射是本站编辑整理，不是官方招生结论。</p>
        <ul>
          {report.candidates.map(candidate => (
            <li key={candidate.direction.id}>
              <Link className="link" href={`/explore?direction=${candidate.direction.id}`}>
                {candidate.direction.name}
              </Link>
              <span>
                {candidate.direction.work_tasks[0]}；对应职业 {candidate.occupations.map(item => item.code).join("、")}
              </span>
            </li>
          ))}
          {!report.candidates.length && <li>这次返回的职业没有落在手册的方向里，可以从具体工作任务开始了解。</li>}
        </ul>
      </section>

      <div className="r1-next">
        <Link className="button" href="/experience">
          下一步：挑一个方向去体验
        </Link>
        <span className="atlas-hand">先挑离你最近的那个方向去试一次。</span>
      </div>

      <div className="r1-actions">
        <button className="button secondary" type="button" onClick={exportReport}>
          <IconDownload aria-hidden="true" />
          导出这份报告
        </button>
        <Link className="button secondary" href="/report/initial">
          查看完整报告页
        </Link>
        <button className="button quiet" type="button" onClick={onRestart}>
          重新作答
        </button>
      </div>

      <p className="r1-note">本次画像：{profileLine}。来自本人填写，未独立核验。</p>
    </section>
  );
}
