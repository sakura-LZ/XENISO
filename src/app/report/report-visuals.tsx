"use client";

/*
 * 报告区（R1 / R2）的展示组件。
 * 只做展示：数值仍来自 @/lib 里已有的计算函数，这里不新增也不改写任何业务规则。
 * 入场动效统一交给 atlas.css 的 [data-atlas-reveal]，由 XenisoMotion 触发。
 */

import { useEffect, useState, type CSSProperties } from "react";
import type { AssessmentResult } from "@/lib/assessment";
import { evaluate, experiencePresentation, generateSamples, type Experience } from "@/lib/experience";
import { operationResult } from "@/lib/experience/operations";

const areaOrder = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"] as const;
const areaMeta: Record<string, { zh: string; letter: string }> = {
  realistic: { zh: "实作型", letter: "R" },
  investigative: { zh: "研究型", letter: "I" },
  artistic: { zh: "艺术型", letter: "A" },
  social: { zh: "社会型", letter: "S" },
  enterprising: { zh: "企业型", letter: "E" },
  conventional: { zh: "常规型", letter: "C" },
};
const marks = ["一", "二", "三", "四", "五", "六", "七", "八"];

/** 档案目录：滚动时标出当前所在的那一节；序号用中文，不用裸数字编号。 */
export function ReportIndex({ items, label = "档案目录" }: { items: { id: string; label: string }[]; label?: string }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const signature = items.map((item) => item.id).join("|");
  useEffect(() => {
    const ids = signature.split("|").filter(Boolean);
    if (!ids.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const boundary = Math.min(280, window.innerHeight / 3);
      const found = ids.filter((id) => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= boundary).at(-1);
      setActive(found ?? ids[0]);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll); };
  }, [signature]);
  return <nav className="xr-toc" aria-label={label}>
    <span className="atlas-label">{label}</span>
    <ol>{items.map((item, index) => <li key={item.id}><a href={`#${item.id}`} aria-current={active === item.id ? "location" : undefined}><span className="xr-toc-mark">{marks[index] ?? index + 1}</span>{item.label}</a></li>)}</ol>
  </nav>;
}

function hexPoint(index: number, radius: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / 6;
  return { x: 110 + Math.cos(angle) * radius, y: 110 + Math.sin(angle) * radius };
}
function hexagon(radius: number) {
  return areaOrder.map((_, index) => {
    const point = hexPoint(index, radius);
    return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  }).join(" ");
}

/** 兴趣六维：墨线六边形 + 原始分台账。原始分不是适合度，也不是百分位。 */
export function InterestRadar({ scores }: { scores: AssessmentResult["scores"] }) {
  const maximum = Math.max(1, ...scores.map((score) => score.score));
  const values = areaOrder.map((code) => ({ code, score: scores.find((item) => item.code === code)?.score ?? 0 }));
  const label = values.map((item) => `${areaMeta[item.code]?.zh ?? item.code} ${item.score} 分`).join("，");
  const shape = values.map((item, index) => {
    const point = hexPoint(index, 20 + (item.score / maximum) * 76);
    return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  }).join(" ");
  return <figure className="xr-radar-figure" data-atlas-reveal>
    <div>
      <svg className="atlas-draw xr-radar" viewBox="0 0 220 220" role="img" aria-label={`兴趣六维原始分：${label}。只描述活动偏好，不换算成适合度或百分位。`} style={{ "--len": 460 } as CSSProperties}>
        <g className="xr-ring">
          <polygon points={hexagon(96)} />
          <polygon points={hexagon(64)} />
          <polygon points={hexagon(32)} />
        </g>
        <g className="xr-spoke">
          {areaOrder.map((code, index) => {
            const point = hexPoint(index, 96);
            return <line key={code} x1="110" y1="110" x2={point.x.toFixed(1)} y2={point.y.toFixed(1)} style={{ "--len": 100 } as CSSProperties} />;
          })}
        </g>
        <polygon className="xr-shape" points={shape} style={{ "--len": 520 } as CSSProperties} />
        <g className="xr-dot">{values.map((item, index) => { const point = hexPoint(index, 20 + (item.score / maximum) * 76); return <circle key={item.code} cx={point.x.toFixed(1)} cy={point.y.toFixed(1)} r="2.6" />; })}</g>
        <g className="xr-axis">{areaOrder.map((code, index) => { const point = hexPoint(index, 110); return <text key={code} x={point.x.toFixed(1)} y={point.y.toFixed(1)} textAnchor={point.x > 118 ? "start" : point.x < 102 ? "end" : "middle"} dominantBaseline="middle">{areaMeta[code]?.letter ?? "·"}</text>; })}</g>
      </svg>
      <p className="xr-source">墨线长度按本次最高原始分等比缩放，只用来比较六类活动之间的相对高低。</p>
    </div>
    <ol className="xr-ledger">
      {values.map((item) => <li key={item.code} data-top={item.score === maximum}>
        <span className="xr-ledger-letter">{areaMeta[item.code]?.letter ?? "·"}</span>
        <span>{areaMeta[item.code]?.zh ?? item.code}</span>
        <span className="xr-ledger-track" aria-hidden="true"><span style={{ width: `${item.score / maximum * 100}%` }} /></span>
        <span className="xr-ledger-score">{item.score}</span>
      </li>)}
    </ol>
  </figure>;
}

export const budgetLabels = [["foundation", "基础学习"], ["practice", "小型练习"], ["review", "复盘与核验"]] as const;
export type WeeklyBudget = { foundation: number; practice: number; review: number };

/** 时间账本：每周可用时间被切成三份，条形长度按可用时间折算。 */
export function BudgetLedger({ budget, hours }: { budget: WeeklyBudget; hours: number | null }) {
  const total = budget.foundation + budget.practice + budget.review;
  const denominator = Math.max(hours ?? 0, total, 1);
  return <div>
    <div className="xr-budget-track" role="img" aria-label={`每周时间分配：${budgetLabels.map(([id, label]) => `${label} ${budget[id]} 小时`).join("，")}；每周可用 ${hours ?? "未填写"} 小时`}>
      {budgetLabels.map(([id]) => <span key={id} className={`xr-budget-${id}`} style={{ width: `${budget[id] / denominator * 100}%` }} />)}
    </div>
    <ul className="xr-budget-legend">{budgetLabels.map(([id, label]) => <li key={id}><i className={`xr-budget-${id}`} aria-hidden="true" />{label}<b>{budget[id]} 小时</b></li>)}</ul>
    <p className="xr-budget-total" data-over={hours !== null && total > hours}>已分配 {total} 小时 / 每周可用 {hours === null ? "未填写" : `${hours} 小时`}</p>
  </div>;
}

/** 已保存的体验成果：只渲染本人操作算出来的结果，并始终标 simulation。 */
export function ExperienceCard({ experience }: { experience: Experience }) {
  const presentation = experiencePresentation(experience);
  const result = experience.scenario_id === "direction_workbench" ? operationResult(experience.template_id, experience.choices, 2) : null;
  const legacy = experience.scenario_id === "wearable_ecg_alert_demo" ? evaluate(generateSamples(experience.seed), experience.threshold, experience.device) : null;
  const metrics = result?.metrics ?? (legacy ? { 样本数: legacy.n, 真阳性: legacy.tp, 假阳性: legacy.fp, 真阴性: legacy.tn, 假阴性: legacy.fn } : null);
  const range = result?.series?.flatMap((series) => series.values) ?? [];
  const minimum = Math.min(0, ...range);
  const maximum = Math.max(1, ...range);
  const colors = ["var(--green)", "var(--ochre)", "var(--ink-3)"];
  return <figure className="xr-experience">
    <figcaption>{presentation.title} · simulation</figcaption>
    {result?.series && <>
      <svg viewBox="0 0 360 170" role="img" aria-label={`已保存操作的结果曲线：${result.series.map((series) => series.label).join("、")}；数值范围 ${minimum.toFixed(2)} 至 ${maximum.toFixed(2)}`}>
        <path d="M8 8V158H352" fill="none" style={{ stroke: "var(--line)" }} />
        {result.series.map((series, index) => <polyline key={series.label} points={series.values.map((value, i) => `${8 + i * 344 / Math.max(1, series.values.length - 1)},${158 - (value - minimum) / (maximum - minimum) * 148}`).join(" ")} fill="none" style={{ stroke: colors[index % colors.length] }} strokeWidth="2" />)}
      </svg>
      <ul className="xr-chart-legend">{result.series.map((series, index) => <li key={series.label}><i style={{ background: colors[index % colors.length] }} aria-hidden="true" />{series.label}</li>)}</ul>
    </>}
    {result?.pixels && <div className="xr-pixels">
      <svg viewBox="0 0 16 16" role="img" aria-label="由已保存操作计算得到的 16×16 教学图像">{result.pixels.map((value, index) => <rect key={index} x={index % 16} y={Math.floor(index / 16)} width="1" height="1" fill={`rgb(${value},${value},${value})`} />)}</svg>
      <p>这张 16×16 的图是按你保存的操作算出来的教学像素，不是真实影像。</p>
    </div>}
    {metrics ? <dl className="xr-metrics">{Object.entries(metrics).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "未知"}</dd></div>)}</dl> : "outputs" in experience ? <blockquote className="xr-record-body">{experience.outputs[0]}</blockquote> : null}
  </figure>;
}
