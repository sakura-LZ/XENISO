"use client";
import type { Template } from "@/lib/experience/templates";
import { operationResult, type ChoiceState, type OperationResult } from "@/lib/experience/operations";

const seriesColors = ["var(--green)", "var(--ochre)", "var(--ink-3)"];
const seriesLabels = ["参考曲线", "含噪曲线", "处理后曲线"];

function SeriesChart({ series }: { series: { label: string; values: number[] }[] }) {
  return (
    <figure className="xd-figure">
      <svg viewBox="0 0 600 180" role="img" aria-label={`参考、含噪与处理后教学信号的对比，共 ${series[0].values.length} 个采样点`}>
        <title>固定教学信号</title>
        <path d="M0 96H600" style={{ stroke: "var(--line)" }} strokeWidth="1" />
        {series.map((line, i) => (
          <polyline
            key={line.label}
            points={line.values.map((value, index) => `${index * 600 / (line.values.length - 1)},${96 - value * 62}`).join(" ")}
            fill="none"
            style={{ stroke: seriesColors[i] }}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <figcaption>
        {series.map((line, i) => (
          <span key={line.label} style={{ marginRight: 14, color: seriesColors[i] }}>
            {seriesLabels[i] ?? line.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

export function OperationPreview({ result }: { result: OperationResult }) {
  return (
    <div className="xd-result" aria-live="polite" data-motion="M-E06">
      <div className="xd-result-head">
        <h4>这一步的结果</h4>
        <span className="simulation-tag">simulation · 固定教学数据</span>
      </div>
      {result.series && <SeriesChart series={result.series} />}
      {result.pixels && (
        <figure className="xd-figure xd-pixels">
          <svg viewBox="0 0 16 16" role="img" aria-label="16 乘 16 的合成教学像素，不是患者影像">
            <title>合成几何图形</title>
            {result.pixels.map((value, i) => <rect key={i} x={i % 16} y={Math.floor(i / 16)} width="1" height="1" fill={`rgb(${value},${value},${value})`} />)}
          </svg>
          <figcaption>16 × 16 几何方块，只用来练习显示与降噪的判断，不是患者影像。</figcaption>
        </figure>
      )}
      <dl className="xd-metrics">
        {Object.entries(result.metrics).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value ?? "无法计算"}</dd>
          </div>
        ))}
      </dl>
      <ul className="xd-details">
        {result.details.map(detail => <li key={detail}>{detail}</li>)}
      </ul>
    </div>
  );
}

export function TaskWorkbench({ template, choices, step, onChange }: { template: Template; choices: ChoiceState; step: number; onChange(value: string): void }) {
  const operation = template.stages[step];
  const result = choices[step] !== null ? operationResult(template.id, choices, step) : null;
  return (
    <section className="atlas-sheet xd-tight" aria-label="任务操作台">
      <div className="xd-sheet-head">
        <h3>先做决定</h3>
        <p className="xd-sheet-note">单选项，可以随时改；改过之后，后面几步要重新确认</p>
      </div>
      <fieldset className="xd-options-set">
        <legend className="sr-only">{operation.question}</legend>
        <div className="xd-options">
          {operation.options.map(option => (
            <label key={option.value} className="xd-option">
              <input type="radio" name={`operation-${step}`} value={option.value} checked={choices[step] === option.value} onChange={() => onChange(option.value)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {result
        ? <OperationPreview result={result} />
        : <p className="xd-hint" role="status">选一项之后，这里会出现这一步的数据变化。</p>}
    </section>
  );
}
