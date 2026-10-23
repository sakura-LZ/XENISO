"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { readSavedExplanation } from "@/lib/ai";
import { download } from "@/lib/download";
import "./profile.css";

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
  return <section className="xp-report xp-sheet atlas-sheet" aria-labelledby="profile-report-title" aria-busy={busy}>
    <span className="atlas-tape mid" aria-hidden="true" />
    <div className="xp-report-head">
      <h2 id="profile-report-title">个人画像报告</h2>
      <div className="xp-report-meta">
        <span className="atlas-chip">R1 · 初步评价</span>
        {report && ready && <span className="atlas-chip" data-tone="ok">已保存</span>}
      </div>
    </div>
    {!ready && <p className="xp-footnote">{checking ? "正在确认资料是否齐全…" : "完成基本信息与职业兴趣后可生成。"}</p>}
    {busy && <p className="xp-footnote" role="status">{state === "generating" ? "正在生成，最多需要 90 秒…" : "正在读取已保存的报告…"}</p>}
    {message && <p role="alert" className="xp-msg" data-tone="error">{message}</p>}
    <div className="xp-report-actions">{report && ready ? <>
      <button type="button" className="button secondary" aria-expanded={expanded} aria-controls="profile-report-content" onClick={() => setExpanded(!expanded)}>{expanded ? "收起报告" : "查看报告"}</button>
      <button type="button" className="button quiet" onClick={() => download("XENISO-R1-个人画像报告.json", JSON.stringify({ kind: "R1", source: "llm_live", ...report }, null, 2))}>下载报告</button>
      <button type="button" className="button quiet" disabled={busy} onClick={() => void request(true)}>重新生成</button>
    </> : <><button type="button" className="button" disabled={!ready || busy} onClick={() => void request(true)}>{busy ? "处理中" : state === "stale" ? "重新生成报告" : "生成报告"}</button>{ready && <button type="button" className="button quiet" disabled={busy} onClick={() => void request(false)}>重新读取</button>}</>}</div>
    {report && ready && <div id="profile-report-content" hidden={!expanded} className="xp-report-body">
      <p className="xp-report-date">生成于 {new Date(report.generated_at).toLocaleString("zh-CN")}</p>
      {report.explanation.explanations.map((item, index) => <section key={index}>
        <h3>{kindLabels[item.kind]}</h3>
        <p>{item.text}</p>
        <p className="xp-report-date">{item.evidence_refs.map((ref, i) => <span key={ref}><a href={`#evidence-${encodeURIComponent(ref)}`} onClick={() => { const details = document.getElementById("profile-report-evidence"); if (details instanceof HTMLDetailsElement) details.open = true; }}>依据 {i + 1}</a>{i < item.evidence_refs.length - 1 ? " · " : ""}</span>)}</p>
      </section>)}
      {report.explanation.unknowns.length > 0 && <section><h3>待确认事项</h3><ul>{report.explanation.unknowns.map(text => <li key={text}>{text}</li>)}</ul></section>}
      <details id="profile-report-evidence" className="xp-report-evidence"><summary>报告来源与证据</summary>{report.evidence.map(item => <div key={item.ref} id={`evidence-${encodeURIComponent(item.ref)}`}><h3>{kindLabels[item.kind]}</h3><pre>{JSON.stringify(item.value, null, 2)}</pre></div>)}</details>
      <Link className="xp-text-link" href="/report/initial">查看完整初步评价</Link>
    </div>}
    <details className="xp-footnote"><summary>数据使用与报告说明</summary><p>报告使用已保存的画像与 O*NET 官方兴趣结果。点击生成时，相关经历和兴趣证据会发送给报告服务；昵称和院校字段不发送。报告供探索参考，不代表报考资格。</p></details>
  </section>;
}
