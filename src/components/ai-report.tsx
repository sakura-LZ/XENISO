"use client";
import { useState } from "react";
import { aiExplanationSchema, type AiExplanation } from "@/lib/ai";
import { download } from "@/lib/download";

export function AiReport({ kind, direction }: { kind: "R1" | "R2"; direction?: string }) {
  const [result, setResult] = useState<{ explanation: AiExplanation; generated_at: string } | null>(null);
  const [message, setMessage] = useState("尚未生成或读取 AI 解释。仅在服务已配置并启用时可调用。");
  const [busy, setBusy] = useState(false);
  async function request(generate: boolean) {
    setBusy(true); setResult(null);
    try {
      const response = await fetch(generate ? "/api/reports" : `/api/reports?kind=${kind}`, generate ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, ...(direction ? { direction_id: direction } : {}) }) } : undefined);
      const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "AI 解释未生成。");
      if (!data.report) throw new Error("当前访客没有保存的此类 AI 报告。");
      const explanation = aiExplanationSchema.parse(data.report.ai?.explanation);
      setResult({ explanation, generated_at: data.report.ai.generated_at }); setMessage("已读取服务实际生成并保存的 AI 解释。请逐项对照证据，不将解释作为报考资格结论。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "读取失败，未生成报告。"); }
    finally { setBusy(false); }
  }
  return <section className="mt-10 border-t pt-7"><h2 className="text-xl font-semibold">AI 解释 · {kind}</h2><p className="mt-3 text-sm leading-7 muted">生成时仅向配置的服务发送兴趣结果、技能/项目证据及必要体验和计划参数，不发送昵称与院校字段。自由文本可能含本人信息，请在画像中去除不必要的标识。AI 服务默认关闭。</p><div className="mt-4 flex flex-wrap gap-3"><button className="button secondary" disabled={busy} onClick={() => request(false)}>读取已保存的 AI 报告</button><button className="button" disabled={busy || (kind === "R2" && !direction)} onClick={() => request(true)}>{busy ? "处理中…" : "基于当前私有证据生成 AI 解释"}</button></div><p className="status text-sm" role="status">{message}</p>
    {result && <><p className="mt-4 text-xs muted">实际生成时间：{result.generated_at}</p><ul className="mt-4 space-y-5">{result.explanation.explanations.map((item, i) => <li key={i}><p className="leading-7">{item.text}</p><p className="mt-1 break-all text-xs muted">证据：{item.evidence_refs.join("；")}</p></li>)}</ul><ul className="mt-5 list-disc pl-5 text-sm leading-7">{result.explanation.unknowns.map((s) => <li key={s}>{s}</li>)}</ul><button className="button secondary mt-5" onClick={() => download(`limen-${kind}-ai-explanation.json`, JSON.stringify(result, null, 2))}>导出 AI 解释与引用</button></>}
  </section>;
}
