"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { readSavedExplanation } from "@/lib/ai";
import { parseR2Planning } from "@/lib/planning";
import { download } from "@/lib/download";

function evidenceLabel(ref: string) {
  if (ref.startsWith("onet_mini_ip.scores.")) return "官方兴趣测评结果";
  if (ref.startsWith("user_profile.")) return "个人画像中的填写记录";
  if (ref.startsWith("experience.outputs")) return "职业体验阶段成果";
  if (ref === "experience_context") return "职业体验场景";
  if (ref === "experience_feedback") return "职业体验复盘";
  if (ref === "report_input.planning") return "本次计划条件";
  if (ref.startsWith("direction.")) return "方向手册条目";
  return "已保存的支持证据";
}

export function AiReport({ kind, direction, planning, alternatives = [], enabled = true }: { kind: "R1" | "R2"; direction?: string; planning?: unknown; alternatives?: string[]; enabled?: boolean }) {
  const [result, setResult] = useState<ReturnType<typeof readSavedExplanation> | null>(null);
  const [message, setMessage] = useState("");
  const [refreshR1, setRefreshR1] = useState(false);
  const [busy, setBusy] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);
  async function request(generate: boolean) {
    if (activeRequest.current || !enabled || (kind === "R2" && !direction)) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(new DOMException("请求超时", "TimeoutError")), 75000);
    setBusy(true); setResult(null);
    setRefreshR1(false);
    setMessage(generate ? "正在生成并保存 AI 解释，请稍候…" : "正在读取已保存的 AI 报告…");
    try {
      const currentPlanning = kind === "R2" ? parseR2Planning(planning) : undefined;
      const body = kind === "R2" ? { kind, direction_id: direction, planning: currentPlanning, alternative_ids: alternatives } : { kind };
      const response = await fetch(generate ? "/api/reports" : `/api/reports?kind=${kind}`, { ...(generate ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" as const }), signal: controller.signal });
      const data = await response.json().catch(() => { throw new Error("服务暂时没有返回报告，请稍后重试。"); });
      if (!response.ok) {
        if (kind === "R2" && ["R1_STALE", "EXPERIENCE_REQUIRED"].includes(data.error?.code)) {
          setRefreshR1(true);
          throw new Error(data.error?.code === "R1_STALE" ? "画像或兴趣测评已更新。请先刷新初步画像，再回来生成行动解读。" : "请先生成初步画像，并确认职业体验成果已保存，再回来生成行动解读。");
        }
        throw new Error(data.error?.message ?? "AI 解释未生成。");
      }
      if (generate && data.saved !== true) throw new Error("未收到报告保存确认，请重新读取。");
      if (!data.report) throw new Error("当前访客没有保存的此类 AI 报告。");
      setResult(readSavedExplanation(data.report, kind, direction, currentPlanning, alternatives)); setMessage("报告已就绪。");
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason?.name !== "TimeoutError") return;
      setMessage(controller.signal.aborted ? "等待超时。可先查看已保存报告，或稍后重新生成。" : error instanceof Error ? error.message : "连接中断，请重试或查看已保存报告。");
    }
    finally {
      clearTimeout(timeout);
      activeRequest.current = null;
      if (!controller.signal.aborted || controller.signal.reason?.name === "TimeoutError") setBusy(false);
    }
  }
  const disabled = busy || !enabled || (kind === "R2" && !direction);
  return <section className="xn-ai-report mt-12 rounded-2xl border border-[var(--line)] bg-[var(--ochre-soft)] p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-5"><div><h2 className="t-block">{kind === "R1" ? "初步评价" : "行动规划"}</h2></div></div><div className="mt-5 flex flex-wrap gap-3"><button className="button" disabled={disabled} onClick={() => request(true)}>{busy ? "处理中…" : kind === "R2" ? "生成行动规划" : "生成报告"}</button><button className="button secondary" disabled={disabled} onClick={() => request(false)}>{kind === "R2" ? "查看已保存规划" : "查看已保存报告"}</button>{refreshR1 && <Link className="button secondary" href="/report/initial">前往更新 R1</Link>}</div>{message && <p className="inline-feedback mt-4 t-small" role="status">{message}</p>}<details className="mt-4 t-meta leading-6 muted"><summary className="cursor-pointer">数据使用与报告说明</summary><p className="mt-2">生成时发送兴趣结果、技能与项目证据，以及必要的体验、计划参数；不发送昵称与院校字段。自由文本中请避免填写身份标识。AI 解读供探索参考，报考资格以官方招生要求为准。{kind === "R2" && "计划条件随报告保存，不自动覆盖个人画像。"}</p></details>
    {result && <><p className="mt-4 t-meta muted">实际生成时间：{result.generated_at}</p>{result.planning && <p className="mt-2 t-small leading-7">{result.planning.transition_year}年 · {result.planning.pathway} · 每周{result.planning.weekly_hours}小时</p>}<ul className="mt-4 space-y-5">{result.explanation.explanations.map((item, i) => <li key={i}><p className="leading-7">{item.text}</p><p className="mt-1 t-meta muted">依据：{item.evidence_refs.map(evidenceLabel).join("、")}</p></li>)}</ul><ul className="mt-5 list-disc pl-5 t-small leading-7">{result.explanation.unknowns.map((s) => <li key={s}>{s}</li>)}</ul><details className="mt-5 border-y py-4"><summary className="cursor-pointer font-medium">查看报告生成时的证据快照</summary><p className="mt-3 t-small muted">以下依据属于本份已保存报告，不会被当前编辑中的画像替换。</p><ul className="mt-4 divide-y">{result.evidence.map((entry) => <li key={entry.ref} className="py-4"><code className="break-all t-meta">{entry.ref}</code><pre className="mt-2 whitespace-pre-wrap break-words t-small leading-7">{JSON.stringify(entry.value, null, 2)}</pre></li>)}</ul></details><button className="button secondary mt-5" onClick={() => download(`limen-${kind}-ai-explanation.json`, JSON.stringify(result, null, 2))}>{kind === "R2" ? "导出规划" : "导出 AI 解释、条件与证据"}</button></>}
  </section>;
}
