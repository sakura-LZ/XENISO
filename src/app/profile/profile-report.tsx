"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { readSavedExplanation } from "@/lib/ai";
import { download } from "@/lib/download";

type Saved = ReturnType<typeof readSavedExplanation>;
const kindLabels = { interest: "职业兴趣", transfer: "能力迁移", gap: "知识准备", experience: "职业体验", direction: "探索方向", planning: "行动规划" };
export function ProfileReport({ ready, checking }: { ready: boolean; checking: boolean }) {
  const [report, setReport] = useState<Saved | null>(null);
  const [state, setState] = useState<"idle" | "reading" | "generating" | "ready" | "error" | "stale">("reading");
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController(); active.current = controller;
    const timeout = setTimeout(() => controller.abort(new DOMException("请求超时", "TimeoutError")), 30000);
    void (async () => {
      try {
        const response = await fetch("/api/reports?kind=R1", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (response.status === 409 && data.error?.code === "REPORT_STALE") { setState("stale"); setMessage("资料已更新，请重新生成报告。"); return; }
        if (!response.ok) throw new Error(data.error?.message ?? "报告读取失败，请重试。");
        if (data.report) { setReport(readSavedExplanation(data.report, "R1")); setState("ready"); } else setState("idle");
      } catch (error) {
        if (!controller.signal.aborted || controller.signal.reason?.name === "TimeoutError") {
          setState("error"); setMessage(controller.signal.aborted ? "报告读取超时，请重新读取。" : error instanceof Error ? error.message : "报告读取失败。");
        }
      } finally { clearTimeout(timeout); if (active.current === controller) active.current = null; }
    })();
    return () => { controller.abort(); active.current?.abort(); };
  }, [ready]);
  async function request(generate: boolean) {
    if (!ready || active.current) return;
    const controller = new AbortController(); active.current = controller;
    const timeout = setTimeout(() => controller.abort(new DOMException("请求超时", "TimeoutError")), 90000);
    setState(generate ? "generating" : "reading"); setReport(null); setMessage("");
    try {
      const response = await fetch(generate ? "/api/reports" : "/api/reports?kind=R1", { signal: controller.signal, cache: "no-store", ...(generate ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "R1" }) } : {}) });
      const data = await response.json();
      if (response.status === 409 && data.error?.code === "REPORT_STALE") { setState("stale"); setMessage("资料已更新，请重新生成报告。"); return; }
      if (!response.ok) throw new Error(data.error?.message ?? (generate ? "报告未生成，请重试。" : "报告读取失败，请重试。"));
      if (!data.report || (generate && data.saved !== true)) throw new Error(generate ? "未收到报告保存确认，请重新读取。" : "尚无已保存的报告。");
      const validated = readSavedExplanation(data.report, "R1");
      if (!controller.signal.aborted) { setReport(validated); setState("ready"); setExpanded(true); }
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason?.name !== "TimeoutError") return;
      setState("error"); setMessage(controller.signal.aborted ? (generate ? "生成等待超时，可重新读取服务器报告。" : "报告读取超时，请重试。") : error instanceof Error ? error.message : "连接中断，报告未生成。");
    } finally { clearTimeout(timeout); if (active.current === controller) active.current = null; }
  }
  const busy = ready && (state === "generating" || state === "reading");
  return <section className="xn-profile-report" aria-labelledby="profile-report-title" aria-busy={busy}>
    <div className="xn-report-heading"><div><span className="xn-report-number">R1</span><h2 id="profile-report-title">个人画像报告</h2></div>{report && ready && <span className="xn-completion is-complete">已保存</span>}</div>
    {!ready && <p className="xn-report-hint">{checking ? "确认资料中" : "完成基本情况与职业兴趣后可生成。"}</p>}
    {busy && <p className="xn-report-progress" role="status">{state === "generating" ? "生成中" : "读取中"}</p>}
    {message && <p role="alert" className="xn-report-message">{message}</p>}
    <div className="xn-report-actions">{report && ready ? <>
      <button type="button" className="xn-start-button" aria-expanded={expanded} aria-controls="profile-report-content" onClick={() => setExpanded(!expanded)}>{expanded ? "收起报告" : "查看报告"}</button>
      <button type="button" className="xn-text-button" onClick={() => download("XENISO-R1-个人画像报告.json", JSON.stringify({ kind: "R1", source: "llm_live", ...report }, null, 2))}>下载报告</button>
      <button type="button" className="xn-text-button" disabled={busy} onClick={() => void request(true)}>重新生成</button>
    </> : <><button type="button" className="xn-start-button" disabled={!ready || busy} onClick={() => void request(true)}>{busy ? "处理中" : state === "stale" ? "重新生成报告" : "生成报告"}</button>{ready && <button type="button" className="xn-text-button" disabled={busy} onClick={() => void request(false)}>重新读取</button>}</>}</div>
    {report && ready && <div id="profile-report-content" hidden={!expanded} className="xn-report-content"><p className="xn-report-date">生成于 {new Date(report.generated_at).toLocaleString("zh-CN")}</p>{report.explanation.explanations.map((item, index) => <section key={index}><h3>{kindLabels[item.kind]}</h3><p>{item.text}</p><div className="xn-evidence-links">{item.evidence_refs.map((ref, i) => <a href={`#evidence-${encodeURIComponent(ref)}`} key={ref} onClick={() => { const details = document.getElementById("profile-report-evidence"); if (details instanceof HTMLDetailsElement) details.open = true; }}>依据 {i + 1}</a>)}</div></section>)}{report.explanation.unknowns.length > 0 && <section><h3>待确认事项</h3><ul>{report.explanation.unknowns.map(text => <li key={text}>{text}</li>)}</ul></section>}<details id="profile-report-evidence" className="xn-report-evidence"><summary>报告来源与证据</summary>{report.evidence.map(item => <div id={`evidence-${encodeURIComponent(item.ref)}`} key={item.ref}><h4>{kindLabels[item.kind]}</h4><pre>{JSON.stringify(item.value, null, 2)}</pre></div>)}</details><Link className="xn-text-button" href="/report/initial">查看完整初步评价</Link></div>}
    <details className="xn-report-privacy"><summary>数据使用与报告说明</summary><p>报告使用已保存的画像与 O*NET 官方兴趣结果。点击生成时，相关经历和兴趣证据会发送给报告服务；昵称和院校字段不发送。报告供探索参考，不代表报考资格。</p></details>
  </section>;
}
