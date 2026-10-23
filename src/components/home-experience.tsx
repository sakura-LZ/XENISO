"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { operationResult, sampleRows } from "@/lib/experience/operations";
import { directions } from "@/lib/directions";

const steps = [
  { title: "整理医学经历", description: "填写课程、科研与实践经历，留下可用于判断的具体记录。" },
  { title: "了解兴趣与方向", description: "完成职业兴趣问卷，结合经历查看值得尝试的方向。" },
  { title: "尝试具体工作", description: "选择模拟项目或面试，记录操作、理由与体验后的想法。" },
  { title: "形成行动计划", description: "结合体验与目标，整理学习准备、实践任务和待核验的升学条件。" },
];
const dimensions = ["现实型 R", "研究型 I", "艺术型 A", "社会型 S", "企业型 E", "常规型 C"];
const clinicalResult = operationResult("clinical_data", ["1", "1", "0"], 2);

function RecordsPreview({ interests = false }: { interests?: boolean }) {
  return <div className="ce-records-preview"><div className="ce-record-fields" data-layer="records"><p className="ce-preview-caption">医学经历</p>{["课程", "科研项目", "实践经历"].map((label, i) => <div className="ce-record-field" key={label} style={{ "--layer-order": i } as React.CSSProperties}><span>{label}</span><span aria-hidden="true" className="ce-field-line" /></div>)}</div>{interests && <div className="ce-interest-fragment" data-layer="interest"><p className="ce-preview-caption">职业活动兴趣</p><div className="ce-six-dimensions">{dimensions.map((label, i) => <div key={label}><span>{label}</span><i style={{ "--bar-size": `${[44, 76, 35, 66, 40, 55][i]}%` } as React.CSSProperties} /></div>)}</div></div>}</div>;
}
function DataPreview({ full = false }: { full?: boolean }) {
  return <div className="ce-data-preview"><div className="ce-preview-table" data-layer="data"><table><caption>临床随访记录</caption><thead><tr><th scope="col">记录</th><th scope="col">组别</th><th scope="col">数值</th></tr></thead><tbody>{sampleRows.slice(0, full ? 8 : 4).map((row, i) => <tr key={i} className={row.id === "02" || row.value === null ? "ce-data-issue" : undefined}><td>{row.id}</td><td>{row.group}</td><td>{row.value ?? "缺失"}</td></tr>)}</tbody></table></div><div className="ce-quality-result" data-layer="result"><span>去重并保留完整记录</span><strong>{clinicalResult.metrics.记录数}<small> 条</small></strong><span>可用于描述统计</span></div></div>;
}
function PlanPreview() {
  return <div className="ce-plan-preview"><div className="ce-budget" data-layer="budget"><p className="ce-preview-caption">每周投入 <strong>4 小时</strong></p><div className="ce-budget-bar" aria-label="基础2小时，实践1小时，复盘1小时"><i style={{ flex: 2 }} /><i style={{ flex: 1 }} /><i style={{ flex: 1 }} /></div><div className="ce-budget-labels"><span>基础 2h</span><span>实践 1h</span><span>复盘 1h</span></div></div><ol className="ce-plan-stages" data-layer="stages"><li><span>01</span><div><strong>基础准备</strong><p>概念笔记与可复现练习</p></div></li><li><span>02</span><div><strong>实践与复盘</strong><p>小型复现成果与方法局限</p></div></li></ol></div>;
}
function StepDiagram({ step }: { step: number }) {
  return <div className={`ce-step-diagram ce-diagram-${step}`} data-motion={`M-H0${step + 6}`}>{step < 2 ? <RecordsPreview interests={step === 1} /> : step === 2 ? <DataPreview full /> : <PlanPreview />}{step === 1 && <div className="ce-related-direction" data-layer="direction"><span>值得尝试的工作活动</span><strong>核对资料 · 分析记录 · 协作沟通</strong></div>}{step === 2 && <div className="ce-diagram-context">记录处理选择与理由 → 数据质量与分析计划卡</div>}{step === 3 && <div className="ce-diagram-context">体验成果 → 准备任务与待核验条件</div>}</div>;
}
function Process() {
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const media = window.matchMedia("(min-width: 1100px) and (min-height: 820px) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    const update = () => { frame = 0; if (!media.matches) return; const r = el.getBoundingClientRect(); const distance = Math.max(1, el.offsetHeight - window.innerHeight); setActive(Math.min(3, Math.max(0, Math.floor((-r.top + 110) / distance * 4)))); };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", scroll, { passive: true }); window.addEventListener("resize", scroll); media.addEventListener("change", scroll); update();
    return () => { window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll); media.removeEventListener("change", scroll); cancelAnimationFrame(frame); };
  }, []);
  const locate = (index: number) => { const el = section.current; if (!el) return; const distance = Math.max(1, el.offsetHeight - window.innerHeight); window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top + distance * (index + .15) / 4 - 108, behavior: "smooth" }); };
  return <section ref={section} className="ce-process" aria-labelledby="process-title" data-motion="M-H05" data-active-step={active}><div className="ce-process-sticky ce-container"><div className="ce-process-copy"><h2 id="process-title">探索如何进行</h2><ol>{steps.map((step, index) => <li key={step.title} className={index === active ? "is-current" : ""}><button type="button" aria-current={index === active ? "step" : undefined} onClick={() => locate(index)}><span>0{index + 1}</span>{step.title}</button><p>{step.description}</p></li>)}</ol><p className="ce-example-label">示例 · simulation</p></div><div className="ce-process-stage">{steps.map((step, index) => <div className={`ce-process-frame ${index === active ? "is-current" : ""}`} key={step.title} inert={index !== active}><StepDiagram step={index} /></div>)}</div></div><div className="ce-process-linear ce-container"><h2>探索如何进行</h2><p className="ce-example-label">示例 · simulation</p>{steps.map((step, index) => <article key={step.title}><div><span className="ce-step-number">0{index + 1}</span><h3>{step.title}</h3><p>{step.description}</p></div><StepDiagram step={index} /></article>)}</div></section>;
}
function DirectionMarquee() {
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(true);
  useEffect(() => { if (!ref.current) return; const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting)); observer.observe(ref.current); const visibility = () => setFocused(!document.hidden); document.addEventListener("visibilitychange", visibility); return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); }; }, []);
  const names = ["临床工作", ...directions.filter(d => d.id !== "medicine").map(d => d.name)];
  return <section ref={ref} className="ce-marquee" aria-label="探索方向" data-motion="M-H10" data-paused={paused || !visible || !focused}><div className="ce-marquee-mask">{[names.slice(0, 5), names.slice(5)].map((row, i) => <div key={i} className="ce-marquee-line"><div>{[0, 1].map(copy => <span key={copy} aria-hidden={copy === 1}>{row.map(name => <span key={name}>{name}</span>)}</span>)}</div></div>)}</div><button type="button" className="ce-marquee-pause" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "播放文字带" : "暂停文字带"}</button></section>;
}
export function HomeExperience() {
  const router = useRouter(); const [question, setQuestion] = useState("");
  return <main id="main" className="ce-home"><section className="ce-hero" aria-labelledby="hero-title" data-motion="M-H01"><Image src="/brand/limen-bridge-stylized-v6.webp" alt="青绿山谷之间连接的岩桥" fill priority sizes="100vw" className="ce-hero-image" /><div className="ce-hero-copy"><h1 id="hero-title">XENISO <span>异域同构</span></h1><p className="ce-platform-title">医学生跨学科探索与行动规划平台</p><p className="ce-hero-description">从医学经历与职业兴趣出发，了解具体工作，<br className="ce-desktop-break" />体验模拟任务，形成有依据的下一步计划。</p><form className="ce-composer" data-motion="M-G02" onSubmit={event => { event.preventDefault(); try { if (question.trim()) sessionStorage.setItem("xeniso:exploration-question", question.trim()); else sessionStorage.removeItem("xeniso:exploration-question"); } catch {} router.push("/profile"); }}><label className="sr-only" htmlFor="exploration-question">你正在考虑的方向或问题</label><textarea id="exploration-question" value={question} onChange={event => { setQuestion(event.target.value); event.target.style.height = "auto"; event.target.style.height = `${event.target.scrollHeight}px`; }} maxLength={1000} placeholder="你正在考虑什么方向，或遇到了什么问题？" rows={2} /><div><button type="submit" className="button">开始探索 <span aria-hidden="true">→</span></button></div></form></div></section><section className="ce-capabilities" aria-labelledby="capabilities-title"><div className="ce-container"><h2 id="capabilities-title">从了解自己，到尝试一个方向</h2><p className="ce-example-label">示例 · simulation</p><div className="ce-capability-grid"><article><div className="ce-capability-visual" data-reveal data-motion="M-H02 M-H03"><RecordsPreview interests /></div><h3>认识自己</h3><p>整理医学经历，了解自己对不同工作活动的兴趣。</p></article><article><div className="ce-capability-visual" data-reveal data-motion="M-H02 M-H03"><DataPreview /></div><h3>体验工作</h3><p>检查数据、调整方案，在具体任务中判断自己是否愿意继续。</p></article><article><div className="ce-capability-visual" data-reveal data-motion="M-H02 M-H04"><PlanPreview /></div><h3>准备下一步</h3><p>结合目标方向、已有经历和每周投入，安排后续准备。</p></article></div></div></section><Process /><DirectionMarquee /></main>;
}
