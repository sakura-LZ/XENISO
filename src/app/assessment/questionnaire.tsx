"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { documentSnapshot, snapshotSource, translatedQuestion, type Questionnaire } from "@/lib/onet/translation";
import { ReportReveal } from "../profile/report-visuals";

export function Assessment() {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [changingGroup, setChangingGroup] = useState(false);
  const groupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (questionnaire) groupHeading.current?.focus({ preventScroll: true }); }, [page, questionnaire]);
  useEffect(() => () => { if (groupTimer.current) clearTimeout(groupTimer.current); }, []);
  function changePage(next: number) {
    if (changingGroup) return;
    const change = () => { setPage(next); setChangingGroup(false); requestAnimationFrame(() => groupHeading.current?.scrollIntoView({ block: "start", behavior: "instant" })); };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) change();
    else { setChangingGroup(true); groupTimer.current = setTimeout(change, 120); }
  }
  const answeredCount = Object.keys(answers).length;
  const currentQuestions = questionnaire?.questions.slice(page * 6, page * 6 + 6) ?? [];
  const pageComplete = currentQuestions.length > 0 && currentQuestions.every(question => answers[question.index] !== undefined);
  async function load() {
    setBusy(true); setSaved(false); setMessage("");
    try {
      const response = await fetch("/api/onet/questions", { signal: AbortSignal.timeout(30000) }); const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "官方题目加载失败。");
      setQuestionnaire(data); setAnswers({}); setPage(0); setMessage("");
    } catch (error) { setMessage(error instanceof Error && !["TimeoutError", "AbortError", "TypeError", "SyntaxError"].includes(error.name) ? error.message : "官方题目读取中断，请重新加载问卷。"); }
    finally { setBusy(false); }
  }
  async function submit() {
    if (!questionnaire || questionnaire.source !== "onet_live") { setMessage("文档快照尚未核验与当前 API 的计分等效性，因此不能生成官方结果。"); return; }
    if (Object.keys(answers).length !== 30) { setMessage("请完成全部 30 题再提交。"); return; }
    setBusy(true); setMessage("");
    try {
      const login = await fetch("/api/session", { method: "POST", signal: AbortSignal.timeout(30000) });
      if (!login.ok) throw new Error("暂时无法保存测评，请稍后重试。");
      const response = await fetch("/api/onet/results", { method: "POST", signal: AbortSignal.timeout(90000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: Object.entries(answers).map(([index, answer]) => ({ index: Number(index), answer })), onet_version: questionnaire.onet_version, api_version: questionnaire.api_version }) });
      const data = await response.json(); if (!response.ok || data.saved !== true || data.assessment?.source !== "onet_live") throw new Error(data.error?.message ?? "未收到官方结果保存确认。");
      setSaved(true); setMessage("测评完成，结果已保存。");
    } catch (error) { setMessage(error instanceof Error && !["TimeoutError", "AbortError", "TypeError", "SyntaxError"].includes(error.name) ? error.message : "提交中断，尚未确认结果已保存。答案已保留，可以重试。"); }
    finally { setBusy(false); }
  }
  return <main id="main" className="shell xn-assessment-page pr-assessment py-10"><div className="pr-questionnaire"><ReportReveal motion="M-Q01"><header className="pr-heading"><h1>职业兴趣问卷</h1></header></ReportReveal>
    {!questionnaire && <section className="pr-question-intro" aria-busy={busy} data-motion="M-Q01"><h2>O*NET Mini-IP · 30项职业活动</h2><p>根据你对每项活动的喜好作答。每组6题，可以返回修改；兴趣结果不代表能力。</p><div className="pr-question-steps" aria-hidden="true">{[1,2,3,4,5].map(group => <span key={group}>{String(group).padStart(2,"0")}</span>)}</div><button className="button" disabled={busy} onClick={load}>{busy ? "正在加载官方题目…" : message ? "重新加载问卷" : "开始问卷"}</button><p className="pr-source">题目由 O*NET 服务实时读取，中文使用独立译稿。</p></section>}
    {message && <p role="status" className="inline-feedback mt-5">{message}</p>}
    {questionnaire && <>
      <div className="pr-question-progress" data-motion="M-Q02"><div><span role="status">已回答 {answeredCount} / 30</span><span>第 {page + 1} / 5 组</span></div><progress aria-label="答题进度" max={30} value={answeredCount} /></div>
      <div className="pr-question-group" data-changing={changingGroup} key={page} data-motion="M-Q03"><h2 ref={groupHeading} tabIndex={-1}>第 {page + 1} 组<span>按喜欢程度选择</span></h2>{currentQuestions.map((q) => <fieldset className="pr-question" disabled={busy || saved} key={`${questionnaire.source}:${q.index}`}><legend><span>{String(q.index).padStart(2,"0")}</span>{translatedQuestion(q) ?? q.original_en}</legend><div className="pr-answer-options">{questionnaire.answer_options.map((option) => <label key={option.value} className={answers[q.index] === option.value ? "is-selected" : ""} data-motion="M-Q02"><input type="radio" name={`q${q.index}`} value={option.value} checked={answers[q.index] === option.value} onChange={() => { setAnswers((a) => ({ ...a, [q.index]: option.value })); setSaved(false); setMessage(""); }} />{documentSnapshot.answer_options.find((item) => item.value === option.value)?.name ?? option.name}</label>)}</div><details className="pr-question-source"><summary>原题与译文来源</summary><p lang="en">{q.original_en}</p><p>题号 {q.index} · {q.area} · {questionnaire.onet_version} · API {questionnaire.api_version}</p><p>中文为 LIMEN 独立译稿，待人工复核。<a href={snapshotSource} target="_blank" rel="noreferrer">O*NET Mini-IP 2016 附录 A</a></p></details></fieldset>)}</div>
      <div className="form-actions" data-motion="M-Q04"><button className="button secondary" disabled={page === 0 || busy || changingGroup} onClick={() => changePage(page - 1)}>上一组</button><div className="flex flex-wrap items-center gap-3">{!pageComplete && !saved && <span className="pr-source">完成本组6题后继续</span>}{page < 4 ? <button className="button" disabled={!pageComplete || busy || changingGroup} onClick={() => changePage(page + 1)}>下一组 →</button> : <button className="button" disabled={busy || saved || answeredCount !== 30 || questionnaire.source !== "onet_live"} onClick={submit}>{busy ? "正在提交并保存…" : saved ? "已完成问卷" : "提交问卷"}</button>}</div></div>
      {saved && <div className="pr-question-success" data-motion="M-Q04"><Link href="/profile" className="button">返回个人画像</Link><Link href="/report/initial#initial-interest" className="pr-text-link">查看兴趣结果</Link></div>}
    </>}
    <div className="mt-8 flex flex-wrap gap-5 text-sm"><Link href="/profile">← 返回个人画像</Link></div>
  </div></main>;
}
