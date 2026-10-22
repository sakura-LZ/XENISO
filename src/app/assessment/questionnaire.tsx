"use client";
import Link from "next/link";
import { useState } from "react";
import { documentSnapshot, snapshotSource, translatedQuestion, type Questionnaire } from "@/lib/onet/translation";

export function Assessment() {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const answeredCount = Object.keys(answers).length;
  const currentQuestions = questionnaire?.questions.slice(page * 6, page * 6 + 6) ?? [];
  const pageComplete = currentQuestions.length > 0 && currentQuestions.every(question => answers[question.index] !== undefined);
  async function load() {
    setBusy(true); setSaved(false); setMessage("");
    try {
      const response = await fetch("/api/onet/questions"); const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "官方题目加载失败。");
      setQuestionnaire(data); setAnswers({}); setPage(0); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "题目加载失败，请重新尝试。"); }
    finally { setBusy(false); }
  }
  async function submit() {
    if (!questionnaire || questionnaire.source !== "onet_live") { setMessage("文档快照尚未核验与当前 API 的计分等效性，因此不能生成官方结果。"); return; }
    if (Object.keys(answers).length !== 30) { setMessage("请完成全部 30 题再提交。"); return; }
    setBusy(true); setMessage("");
    try {
      const login = await fetch("/api/session", { method: "POST" });
      if (!login.ok) throw new Error("暂时无法保存测评，请稍后重试。");
      const response = await fetch("/api/onet/results", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: Object.entries(answers).map(([index, answer]) => ({ index: Number(index), answer })), onet_version: questionnaire.onet_version, api_version: questionnaire.api_version }) });
      const data = await response.json(); if (!response.ok || data.saved !== true || data.assessment?.source !== "onet_live") throw new Error(data.error?.message ?? "未收到官方结果保存确认。");
      setSaved(true); setMessage("测评完成，结果已保存。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "提交失败，未生成结果。"); }
    finally { setBusy(false); }
  }
  return <main id="main" className="shell xn-assessment-page py-10"><div className="mx-auto max-w-3xl"><h1 className="xn-page-heading">职业兴趣问卷</h1>
    {!questionnaire && <section className="mt-8 rounded-xl border bg-white p-7"><h2 className="font-semibold text-lg">O*NET Mini-IP · 30 项</h2><button className="button mt-6" disabled={busy} onClick={load}>{busy ? "正在加载…" : "开始测评 →"}</button></section>}
    {message && <p role="status" className="inline-feedback mt-5">{message}</p>}
    {questionnaire && <>
      <p className="mt-5 text-sm muted">按喜欢程度选择</p>
      <div className="sticky top-0 z-10 mt-5 border-y bg-slate-50 py-4"><div className="flex justify-between text-sm"><span>已回答 {answeredCount} / 30</span><span>第 {page + 1} / 5 组</span></div><progress aria-label="答题进度" className="mt-2 w-full" max={30} value={answeredCount} /></div>
      <div className="divide-y">{currentQuestions.map((q) => <fieldset className="py-7" disabled={busy} key={`${questionnaire.source}:${q.index}`}><legend className="float-left w-full font-medium">{q.index}. {translatedQuestion(q) ?? q.original_en}</legend><p className="clear-both pt-2 text-sm muted" lang="en">{q.original_en}</p><div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">{questionnaire.answer_options.map((option) => <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded border p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-blue-600 ${answers[q.index] === option.value ? "border-blue-600 bg-blue-50 text-blue-900" : "border-slate-200 bg-white hover:border-blue-300"}`}><input type="radio" name={`q${q.index}`} value={option.value} checked={answers[q.index] === option.value} onChange={() => { setAnswers((a) => ({ ...a, [q.index]: option.value })); setSaved(false); setMessage(""); }} />{documentSnapshot.answer_options.find((item) => item.value === option.value)?.name ?? option.name}</label>)}</div></fieldset>)}</div>
      <div className="form-actions"><button className="button secondary" disabled={page === 0 || busy} onClick={() => setPage(page - 1)}>上一组</button><div className="flex flex-wrap items-center gap-3">{!pageComplete && !saved && <span className="text-xs muted">完成本组 6 题后继续</span>}{page < 4 ? <button className="button" disabled={!pageComplete || busy} onClick={() => setPage(page + 1)}>下一组 →</button> : <button className="button" disabled={busy || saved || answeredCount !== 30 || questionnaire.source !== "onet_live"} onClick={submit}>{busy ? "正在生成结果…" : saved ? "已完成测评" : "完成测评 →"}</button>}</div></div>
      {saved && <Link href="/profile" className="button mt-5">返回个人画像，生成报告</Link>}
      <details className="mt-7 text-sm"><summary>题目与译文来源</summary><p className="mt-3 leading-7"><a href={snapshotSource} target="_blank" rel="noreferrer">O*NET Mini-IP 开发报告，2016，附录 A</a>。采用 O*NET Mini-IP，中文为 LIMEN 独立译稿，尚待人工复核。题号、英文原文与维度保持关联。</p></details>
    </>}
    <div className="mt-8 flex flex-wrap gap-5 text-sm"><Link href="/profile">← 返回个人画像</Link></div>
  </div></main>;
}
