"use client";
import { useState } from "react";
import { readSavedExplanation } from "@/lib/ai";
import { parseR2Planning } from "@/lib/planning";
import { download } from "@/lib/download";

export function AiReport({ kind, direction, planning, alternatives = [], enabled = true }: { kind: "R1" | "R2"; direction?: string; planning?: unknown; alternatives?: string[]; enabled?: boolean }) {
  const [result, setResult] = useState<ReturnType<typeof readSavedExplanation> | null>(null);
  const [message, setMessage] = useState("尚未生成或读取 AI 解释。仅在服务已配置并启用时可调用。");
  const [busy, setBusy] = useState(false);
  async function request(generate: boolean) {
    if (!enabled || (kind === "R2" && !direction)) return;
    setBusy(true); setResult(null);
    try {
      const currentPlanning = kind === "R2" ? parseR2Planning(planning) : undefined;
      const body = kind === "R2" ? { kind, direction_id: direction, planning: currentPlanning, alternative_ids: alternatives } : { kind };
      const response = await fetch(generate ? "/api/reports" : `/api/reports?kind=${kind}`, generate ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined);
      const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "AI 解释未生成。");
      if (!data.report) throw new Error("当前访客没有保存的此类 AI 报告。");
      setResult(readSavedExplanation(data.report, kind, direction, currentPlanning, alternatives)); setMessage("已读取服务实际生成并保存的 AI 解释。请逐项对照证据，不将解释作为报考资格结论。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "读取失败，未生成报告。"); }
    finally { setBusy(false); }
  }
  const disabled = busy || !enabled || (kind === "R2" && !direction);
  return <section className="mt-10 border-t pt-7"><h2 className="text-xl font-semibold">AI 解释 · {kind}</h2><p className="mt-3 text-sm leading-7 muted">生成时仅向配置的服务发送兴趣结果、技能/项目证据及必要体验和计划参数，不发送昵称与院校字段。自由文本可能含本人信息，请在画像中去除不必要的标识。AI 服务默认关闭。</p>{kind === "R2" && <p className="mt-3 text-sm leading-7 muted">正式解释需读取个人画像、官方测评和私有体验，并填写有效条件与预算。合成草案不调用AI。本页参数随新报告保存，不自动覆盖画像。</p>}<div className="mt-4 flex flex-wrap gap-3"><button className="button secondary" disabled={disabled} onClick={() => request(false)}>读取已保存的 AI 报告</button><button className="button" disabled={disabled} onClick={() => request(true)}>{busy ? "处理中…" : "基于当前私有证据生成 AI 解释"}</button></div><p className="status text-sm" role="status">{message}</p>
    {result && <><p className="mt-4 text-xs muted">实际生成时间：{result.generated_at}</p>{result.planning && <p className="mt-2 text-sm leading-7">报告条件：{result.planning.transition_year}年 · {result.planning.pathway} · 每周{result.planning.weekly_hours}小时；基础/练习/复盘预算：{result.planning.weekly_allocation.foundation}/{result.planning.weekly_allocation.practice}/{result.planning.weekly_allocation.review}小时。</p>}<ul className="mt-4 space-y-5">{result.explanation.explanations.map((item, i) => <li key={i}><p className="leading-7">{item.text}</p><p className="mt-1 break-all text-xs muted">证据：{item.evidence_refs.join("；")}</p></li>)}</ul><ul className="mt-5 list-disc pl-5 text-sm leading-7">{result.explanation.unknowns.map((s) => <li key={s}>{s}</li>)}</ul><details className="mt-5 border-y py-4"><summary className="cursor-pointer font-medium">查看报告生成时的证据快照</summary><p className="mt-3 text-sm muted">以下依据属于本份已保存报告，不会被当前编辑中的画像替换。</p><ul className="mt-4 divide-y">{result.evidence.map((entry) => <li key={entry.ref} className="py-4"><code className="break-all text-xs">{entry.ref}</code><pre className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{JSON.stringify(entry.value, null, 2)}</pre></li>)}</ul></details><button className="button secondary mt-5" onClick={() => download(`limen-${kind}-ai-explanation.json`, JSON.stringify(result, null, 2))}>导出 AI 解释、条件与证据</button></>}
  </section>;
}
