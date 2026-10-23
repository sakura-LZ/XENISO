"use client";
import type { Template } from "@/lib/experience/templates";
import { operationResult, type ChoiceState, type OperationResult } from "@/lib/experience/operations";

export function OperationPreview({ result }: { result: OperationResult }) {
  const colors = ["#52645B", "#8A642E", "#477D91"];
  return <div className="task-operation-result mt-5 border-y border-slate-200 py-5" aria-label="本步操作结果" aria-live="polite" data-motion="M-E06">
    <h3 className="font-semibold">操作结果 <span className="text-xs font-normal text-slate-500">simulation · 固定教学数据</span></h3>
    {result.series && <figure className="mt-4"><svg viewBox="0 0 600 160" className="w-full" role="img" aria-label="参考、含噪与处理后教学信号"><path d="M0 80H600" stroke="#e2e8f0" />{result.series.map((line, i) => <polyline key={line.label} points={line.values.map((value, index) => `${index * 600 / (line.values.length - 1)},${80 - value * 50}`).join(" ")} stroke={colors[i]} fill="none" strokeWidth="2" />)}</svg><figcaption className="flex flex-wrap gap-4 text-xs">{result.series.map((line, i) => <span key={line.label} style={{ color: colors[i] }}>{line.label}</span>)}</figcaption></figure>}
    {result.pixels && <figure className="mt-4"><svg viewBox="0 0 16 16" className="h-48 w-48 max-w-full" role="img" aria-label="合成几何影像"><title>固定噪声与降噪后的教学像素</title>{result.pixels.map((v, i) => <rect key={i} x={i % 16} y={Math.floor(i / 16)} width="1" height="1" fill={`rgb(${v},${v},${v})`} />)}</svg><figcaption className="mt-2 text-xs muted">合成几何图形，不是患者影像</figcaption></figure>}
    <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">{Object.entries(result.metrics).map(([label, value]) => <div key={label}><dt className="text-xs leading-6 text-slate-500">{label}</dt><dd className="text-base font-semibold tabular-nums text-slate-900">{value ?? "无法计算"}</dd></div>)}</dl>
    <ul className="mt-4 space-y-2 text-xs leading-6 text-slate-600">{result.details.map(detail => <li key={detail}>{detail}</li>)}</ul>
  </div>;
}
export function TaskWorkbench({ template, choices, step, onChange }: { template: Template; choices: ChoiceState; step: number; onChange(value: string): void }) {
  const operation = template.stages[step];
  const result = choices[step] !== null ? operationResult(template.id, choices, step) : null;
  return <section className="task-operation-controls mt-6" aria-label="任务操作台"><fieldset><legend className="font-medium leading-7">{operation.question}</legend><div className="mt-3 grid gap-2">{operation.options.map(option => <label key={option.value} className={`task-operation-option ${choices[step] === option.value ? "is-selected" : ""}`}><input type="radio" name={`operation-${step}`} value={option.value} checked={choices[step] === option.value} onChange={() => onChange(option.value)} />{option.label}</label>)}</div></fieldset>{result ? <OperationPreview result={result} /> : <p className="mt-5 text-sm muted" role="status">选择一个方案，查看数据或交接结构的变化。</p>}</section>;
}
