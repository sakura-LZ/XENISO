"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { AssessmentResult } from "@/lib/assessment";
import { evaluate, experiencePresentation, generateSamples, type Experience } from "@/lib/experience";
import { operationResult } from "@/lib/experience/operations";

/** 入场交给 atlas.css 的 [data-atlas-reveal]；只保留 delay 参数兼容旧调用。 */
export function ReportReveal({ children, className = "", motion, delay = 0 }: { children: ReactNode; className?: string; motion: string; delay?: number }) {
  return <div className={className} data-atlas-reveal data-motion={motion} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>{children}</div>;
}

export function SectionNav({ items, label = "报告章节", motion }: { items: { id: string; label: string }[]; label?: string; motion: string }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const signature = items.map(item => item.id).join("|");
  useEffect(() => {
    const ids = signature.split("|");
    let frame = 0;
    const update = () => {
      frame = 0;
      const boundary = Math.min(280, window.innerHeight / 3);
      const found = ids.filter(id => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= boundary).at(-1);
      setActive(found ?? ids[0]);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update(); window.addEventListener("scroll", scroll, { passive: true }); window.addEventListener("resize", scroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll); };
  }, [signature]);
  return <nav className="pr-section-nav" aria-label={label} data-motion={motion}><ol>{items.map((item, index) => <li key={item.id}><a href={`#${item.id}`} aria-current={active === item.id ? "location" : undefined}><span>{String(index + 1).padStart(2, "0")}</span>{item.label}</a></li>)}</ol></nav>;
}

const labels: Record<string, string> = { realistic: "R · 实作型", investigative: "I · 研究型", artistic: "A · 艺术型", social: "S · 社会型", enterprising: "E · 企业型", conventional: "C · 常规型" };
export function InterestBars({ scores, motion }: { scores: AssessmentResult["scores"]; motion: string }) {
  const ref = useRef<HTMLDListElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !window.IntersectionObserver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      element.querySelectorAll<HTMLElement>(".pr-interest-fill").forEach((bar, index) => bar.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 500, delay: index * 40, easing: "ease-out", fill: "backwards" }));
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(element); return () => observer.disconnect();
  }, [scores]);
  const maximum = Math.max(1, ...scores.map(score => score.score));
  return <div><dl ref={ref} className="pr-interest-bars" data-motion={motion}>{scores.map(score => <div className="pr-interest-row" key={score.code}><dt>{labels[score.code] ?? score.title}</dt><dd><span className="pr-interest-track" aria-hidden="true"><span className="pr-interest-fill" style={{ width: `${score.score / maximum * 100}%` }} /></span><strong>{score.score}</strong></dd></div>)}</dl><p className="pr-source">条形长度按本次最高原始数值呈现；不代表能力或百分位。</p></div>;
}

export const budgetLabels = [["foundation", "基础学习"], ["practice", "小型练习"], ["review", "复盘与核验"]] as const;
export type WeeklyBudget = { foundation: number; practice: number; review: number };
export function BudgetBar({ budget, hours, motion }: { budget: WeeklyBudget; hours: number | null; motion: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !window.IntersectionObserver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      element.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 400, easing: "ease-out" });
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const total = budget.foundation + budget.practice + budget.review;
  const denominator = Math.max(hours ?? 0, total, 1);
  return <div className="pr-budget" data-motion={motion}><div ref={ref} className="pr-budget-track" role="img" aria-label={`每周分配：${budgetLabels.map(([id, label]) => `${label}${budget[id]}小时`).join("，")}；可用${hours ?? "未填写"}小时`}>{budgetLabels.map(([id], index) => <span key={id} className={`pr-budget-part pr-budget-${id}`} style={{ width: `${budget[id] / denominator * 100}%`, "--part": index } as CSSProperties} />)}</div><dl>{budgetLabels.map(([id, label]) => <div key={id}><dt><i className={`pr-budget-${id}`} />{label}</dt><dd>{budget[id]}<span> 小时</span></dd></div>)}</dl></div>;
}

/** Render only the saved user's operation, never a generic sample outcome. */
export function ExperienceOutcome({ experience }: { experience: Experience }) {
  const presentation = experiencePresentation(experience);
  const result = experience.scenario_id === "direction_workbench" ? operationResult(experience.template_id, experience.choices, 2) : null;
  const legacy = experience.scenario_id === "wearable_ecg_alert_demo" ? evaluate(generateSamples(experience.seed), experience.threshold, experience.device) : null;
  const metrics = result?.metrics ?? (legacy ? { 样本数: legacy.n, 真阳性: legacy.tp, 假阳性: legacy.fp, 真阴性: legacy.tn, 假阴性: legacy.fn } : null);
  const range = result?.series?.flatMap(series => series.values) ?? [];
  const minimum = Math.min(0, ...range), maximum = Math.max(1, ...range);
  return <figure className="pr-experience-outcome"><figcaption>{presentation.title} · simulation</figcaption>
    {result?.series && <><svg viewBox="0 0 360 170" role="img" aria-label={`已保存操作的结果曲线：${result.series.map(series => series.label).join("、")}；数值范围 ${minimum.toFixed(2)} 至 ${maximum.toFixed(2)}`}><path d="M8 8V158H352" stroke="#bdcdbd" fill="none" />{result.series.map((series, index) => <polyline key={series.label} points={series.values.map((value, i) => `${8 + i * 344 / Math.max(1, series.values.length - 1)},${158 - (value - minimum) / (maximum - minimum) * 148}`).join(" ")} fill="none" stroke={["#9aa99d", "#477d91", "#315e43"][index % 3]} strokeWidth="2" />)}</svg><ul className="pr-chart-legend">{result.series.map((series, index) => <li key={series.label}><i style={{ background: ["#9aa99d", "#477d91", "#315e43"][index % 3] }} />{series.label}</li>)}</ul></>}
    {result?.pixels && <svg className="pr-outcome-pixels" viewBox="0 0 16 16" role="img" aria-label="由已保存操作计算得到的16×16教学图像">{result.pixels.map((value, index) => <rect key={index} x={index % 16} y={Math.floor(index / 16)} width="1" height="1" fill={`rgb(${value},${value},${value})`} />)}</svg>}
    {metrics ? <dl className="pr-outcome-metrics">{Object.entries(metrics).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "未知"}</dd></div>)}</dl> : "outputs" in experience ? <blockquote>{experience.outputs[0]}</blockquote> : null}
  </figure>;
}
