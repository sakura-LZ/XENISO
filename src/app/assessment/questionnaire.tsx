"use client";
import Link from "next/link";
import { useState } from "react";
import { documentSnapshot, snapshotSource, translatedQuestion, translation, type Questionnaire } from "@/lib/onet/translation";
import { answerSchema } from "@/lib/onet/contracts";

export function Assessment() {
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("请先尝试加载官方题目。接口错误会如实显示。");
  const [saved, setSaved] = useState(false);
  async function load() {
    setBusy(true); setSaved(false);
    try {
      const response = await fetch("/api/onet/questions"); const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "官方题目加载失败。");
      setQuestionnaire(data); setAnswers({}); setPage(0); setMessage("已加载 O*NET 真实题目。中文译文为 LIMEN 待人工复核稿；未匹配原文的题目仅显示英文。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "网络请求失败。没有生成题目或分数。"); }
    finally { setBusy(false); }
  }
  function offline() { setQuestionnaire(documentSnapshot); setAnswers({}); setPage(0); setSaved(false); setMessage("已打开 2016 官方文档题目快照。答案仅作本机 simulation 交互演示，不提交计分，不生成官方结果。"); }
  function saveDraft() {
    if (!questionnaire) return;
    if (questionnaire.source !== "official_document_snapshot") { setMessage("真实问卷答案只提交到私有访客服务；为保护隐私，不存入本机演示草稿。"); return; }
    try { localStorage.setItem("limen:simulation:answers:v1", JSON.stringify({ simulation: true, translation_version: translation.version, answers })); setMessage("simulation 文档快照答题草稿已保存，仅用于本机演示。"); } catch { setMessage("本浏览器无法保存草稿。"); }
  }
  function restore() {
    try {
      const value = JSON.parse(localStorage.getItem("limen:simulation:answers:v1") ?? "null");
      if (value?.simulation !== true || value.translation_version !== translation.version) throw new Error();
      const entries = Object.entries(value.answers).map(([index, answer]) => ({ index: Number(index), answer }));
      const schema = answerSchema.element.array().max(30); const parsed = schema.parse(entries);
      if (new Set(parsed.map((a) => a.index)).size !== parsed.length) throw new Error();
      setQuestionnaire(documentSnapshot); setAnswers(Object.fromEntries(parsed.map((a) => [a.index, a.answer]))); setPage(0); setMessage("已恢复 simulation 文档答题草稿，未生成兴趣分数。");
    } catch { setMessage("没有可恢复的有效演示答题草稿。"); }
  }
  async function submit() {
    if (!questionnaire || questionnaire.source !== "onet_live") { setMessage("文档快照尚未核验与当前 API 的计分等效性，因此不能生成官方结果。"); return; }
    if (Object.keys(answers).length !== 30) { setMessage("请完成全部 30 题再提交。"); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/onet/results", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: Object.entries(answers).map(([index, answer]) => ({ index: Number(index), answer })), onet_version: questionnaire.onet_version, api_version: questionnaire.api_version }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "结果未生成。");
      setSaved(true); setMessage("官方六维结果和职业列表已保存到当前访客的私有记录，可进入初步画像。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "提交失败，未生成结果。"); }
    finally { setBusy(false); }
  }
  return <main id="main" className="shell py-10"><div className="max-w-3xl"><p className="eyebrow">MINI INTEREST PROFILER · 30 ITEMS</p><h1 className="mt-2 text-3xl font-semibold">你愿意从事哪些工作活动？</h1><p className="mt-4 leading-7 muted">按喜好回答，暂不考虑自己是否会做、薪资和所需学历。兴趣不是能力测验，也不是报考资格判断。</p>
    <div className="mt-5 flex flex-wrap gap-3"><button className="button" disabled={busy} onClick={load}>{busy ? "请求中…" : "加载官方问卷"}</button><button className="button secondary" onClick={offline}>文档快照交互演示</button><button className="button secondary" onClick={restore}>恢复演示草稿</button></div>
    <p role="status" className="status notice">{message}</p>
    {questionnaire && <><p className="mt-5 text-sm muted">来源：{questionnaire.source} · {questionnaire.onet_version}<br />中文：{translation.version} · 待人工复核；未作为已验证中文版心理测量工具。</p>
      <div className="sticky top-0 z-10 mt-5 border-y bg-slate-50 py-4"><div className="flex justify-between text-sm"><span>已回答 {Object.keys(answers).length} / 30</span><span>第 {page + 1} / 5 组</span></div><progress aria-label="答题进度" className="mt-2 w-full" max={30} value={Object.keys(answers).length} /></div>
      <div className="divide-y">{questionnaire.questions.slice(page * 6, page * 6 + 6).map((q) => <fieldset className="py-7" key={`${questionnaire.source}:${q.index}`}><legend className="float-left w-full font-medium">{q.index}. {translatedQuestion(q) ?? q.original_en}</legend><p className="clear-both pt-2 text-sm muted" lang="en">{q.original_en}</p><div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">{questionnaire.answer_options.map((option) => <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded border p-3 text-sm ${answers[q.index] === option.value ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white"}`}><input type="radio" name={`q${q.index}`} value={option.value} checked={answers[q.index] === option.value} onChange={() => { setAnswers((a) => ({ ...a, [q.index]: option.value })); setSaved(false); }} />{documentSnapshot.answer_options.find((item) => item.value === option.value)?.name ?? option.name}</label>)}</div></fieldset>)}</div>
      <div className="flex flex-wrap gap-3 border-t pt-5"><button className="button secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>上一组</button>{page < 4 ? <button className="button" onClick={() => setPage(page + 1)}>下一组</button> : <button className="button" disabled={busy || questionnaire.source !== "onet_live"} onClick={submit}>提交官方计分并保存</button>}{questionnaire.source === "official_document_snapshot" && <button className="button secondary" onClick={saveDraft}>保存演示答题草稿</button>}</div>
      {saved && <Link href="/report/initial" className="button mt-5">查看初步画像 →</Link>}
      <details className="mt-7 text-sm"><summary>题目与译文来源</summary><p className="mt-3 leading-7"><a href={snapshotSource} target="_blank" rel="noreferrer">O*NET Mini-IP 开发报告，2016，附录 A</a>。文档快照不是 API 返回；30 个题号与英文活动原样保留，中文由 LIMEN 独立翻译。真实问卷逐项校对英文与维度后才附中文。</p></details>
    </>}
    <div className="mt-8 flex flex-wrap gap-5 text-sm"><Link href="/profile">返回个人画像</Link><Link href="/report/initial">查看结果状态</Link><Link href="/studio/ecg">先体验职业工作台</Link></div>
  </div></main>;
}
