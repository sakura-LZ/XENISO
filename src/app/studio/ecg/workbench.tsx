"use client";
import Link from "next/link";
import { useState } from "react";
import { evaluate, evaluationCard, experienceSchema, generateSamples, type Device, type Experience } from "@/lib/experience";
import { download } from "@/lib/download";

const samples = generateSamples();
const percent = (value: number | null) => value === null ? "无分母，暂不可计算" : `${(value * 100).toFixed(1)}%`;
export function Workbench() {
  const [threshold, setThreshold] = useState(.5);
  const [device, setDevice] = useState<Device>("A");
  const [changed, setChanged] = useState(false);
  const [compared, setCompared] = useState(false);
  const [tradeoff, setTradeoff] = useState<Experience["tradeoff"] | "">("");
  const [favorite, setFavorite] = useState("");
  const [least, setLeast] = useState("暂无");
  const [willingness, setWillingness] = useState(0);
  const [question, setQuestion] = useState("");
  const [message, setMessage] = useState("先拖动阈值，再比较设备 A 与 B，最后选择取舍。");
  const [completed, setCompleted] = useState(false);
  const [savingPrivate, setSavingPrivate] = useState(false);
  const metrics = evaluate(samples, threshold, device);
  const baseline = evaluate(samples, .5, device);
  const visible = samples.filter((s) => device === "all" || s.device_group === device);
  function invalidate() { setCompleted(false); }
  function card(): Experience {
    return experienceSchema.parse({ simulation: true, scenario_id: "wearable_ecg_alert_demo", role: "ml_engineer", seed: 20261020, threshold, device, tradeoff, operations: { threshold_changed: changed, devices_compared: compared, tradeoff_chosen: !!tradeoff }, reflection: { favorite_operation: favorite, least_favorite_operation: least, willingness_for_3_hours: willingness, followup_question: question }, completed_at: new Date().toISOString() });
  }
  function save(exportFile: boolean) {
    try {
      const result = card();
      localStorage.setItem("limen:simulation:experience:v1", JSON.stringify(result));
      if (exportFile) download("model_evaluation_card.json", JSON.stringify(evaluationCard(result), null, 2), "application/json");
      setCompleted(true); setMessage(exportFile ? "成果卡已导出，simulation 体验与反馈已保存到本浏览器，可用于行动草案。" : "simulation 体验与反馈已保存，可刷新恢复或进入行动草案。");
    } catch { setMessage("请完成三项操作，并填写最喜欢的环节、不喜欢的环节和继续体验意愿。浏览器须允许本地存储。"); }
  }
  function restore() {
    try {
      const result = experienceSchema.parse(JSON.parse(localStorage.getItem("limen:simulation:experience:v1") ?? "null"));
      setThreshold(result.threshold); setDevice(result.device); setChanged(true); setCompared(true); setTradeoff(result.tradeoff);
      setFavorite(result.reflection.favorite_operation); setLeast(result.reflection.least_favorite_operation); setWillingness(result.reflection.willingness_for_3_hours); setQuestion(result.reflection.followup_question); setCompleted(true); setMessage("已恢复本浏览器的 simulation 教学成果。");
    } catch { setMessage("本浏览器没有有效的已完成成果。"); }
  }
  async function savePrivate() {
    setSavingPrivate(true);
    try {
      let result: Experience;
      try { result = card(); } catch { throw new Error("请先完成三项操作与必要反思。"); }
      const response = await fetch("/api/experience", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "私有体验保存失败。");
      setCompleted(true); setMessage("合成工作台结果与本人反馈已保存到当前访客的私有记录，可供正式 R2 读取。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "私有体验保存失败。"); }
    finally { setSavingPrivate(false); }
  }
  return <main id="main" className="shell py-10">
    <p className="eyebrow">CAREER STUDIO · AI 算法工程师</p><h1 className="mt-2 text-3xl font-semibold">穿戴式心电预警 · 模型评价工作台</h1>
    <p className="notice mt-5">simulation：100 条固定种子合成样本，仅展示模型评价流程；没有患者记录，不用于诊疗。设备 B 被教学生成器设为更难区分。</p>
    <div className="mt-8 grid gap-7 lg:grid-cols-[210px_1fr_240px]">
      <aside><h2 className="font-semibold">项目目标</h2><p className="mt-3 text-sm leading-7">为同一个预警原型选择阈值，观察漏报与误报的取舍，再检查设备变化是否影响结果。</p>
        <ol className="mt-5 space-y-4 text-sm"><li>{changed ? "✓" : "○"} 改变阈值 · 模型评价</li><li>{compared ? "✓" : "○"} 比较设备 · 泛化验证</li><li>{tradeoff ? "✓" : "○"} 选择方案 · 工程取舍</li></ol>
        <p className="mt-5 text-sm muted">这些操作记录用于确认体验完成，不用于计算兴趣或能力。</p><button className="button secondary mt-6" onClick={restore}>恢复已保存成果</button>
      </aside>
      <section className="min-w-0 rounded border border-slate-200 bg-white p-5" aria-label="交互实验">
        <h2 className="text-xl font-semibold">01 · 调整决策边界</h2>
        <label className="mt-5 block font-medium" htmlFor="threshold">预警阈值 <output>{threshold.toFixed(2)}</output></label>
        <input id="threshold" className="mt-4 w-full accent-blue-600" type="range" min="0.1" max="0.9" step="0.01" value={threshold} onChange={(e) => { setThreshold(Number(e.target.value)); setChanged(true); invalidate(); }} />
        <div className="flex justify-between text-xs muted"><span>0.10 · 更多预警</span><span>0.90 · 更少预警</span></div>
        <svg viewBox="0 0 500 150" role="img" aria-label={`当前设备 ${device} 的模型分数分布，蓝点为合成阳性，灰点为合成阴性；竖线为阈值。`} className="mt-6 w-full bg-slate-50">
          <line x1={threshold * 460 + 20} x2={threshold * 460 + 20} y1="5" y2="130" stroke="#315cf5" strokeWidth="2" />
          {visible.map((s, i) => <circle key={s.id} cx={s.score * 460 + 20} cy={20 + (i % 6) * 18} r="4" fill={s.true_label ? "#315cf5" : "#94a3b8"}><title>{s.id + ' · 分数' + s.score + ' · 合成标签' + s.true_label}</title></circle>)}
          <text x="20" y="145" fontSize="11">分数 0</text><text x="440" y="145" fontSize="11">分数 1</text>
        </svg><p className="mt-2 text-xs muted">蓝点：合成阳性；灰点：合成阴性。右侧判为预警（score ≥ threshold）。</p>
        <h2 className="mt-8 text-xl font-semibold">02 · 检查设备变化</h2>
        <label className="mt-4 block">验证数据<select className="field" value={device} onChange={(e) => { setDevice(e.target.value as Device); setCompared(true); invalidate(); }}><option value="A">设备 A · 开发集</option><option value="B">设备 B · 外部验证教学集</option><option value="all">全部设备 · 混合展示</option></select></label>
        <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-2 text-left">同一阈值下的设备比较（非临床研究结果）</caption><thead><tr><th>设备</th><th>灵敏度</th><th>误报</th><th>漏报</th></tr></thead><tbody>{(["A", "B"] as const).map((d) => { const m = evaluate(samples, threshold, d); return <tr className="border-t" key={d}><th className="py-3">{d}</th><td>{percent(m.sensitivity)}</td><td>{m.fp}</td><td>{m.fn}</td></tr>; })}</tbody></table></div>
        <h2 className="mt-8 text-xl font-semibold">03 · 记录取舍方案</h2><fieldset className="mt-4 space-y-3"><legend className="mb-2 text-sm muted">选择你本次更关注的目标，不存在统一正确答案。</legend>{[["sensitivity", "优先减少漏报"], ["false_alerts", "优先减少误报"], ["balance", "保留折中方案，继续验证"]].map(([id, name]) => <label className="flex gap-3" key={id}><input type="radio" name="tradeoff" value={id} checked={tradeoff === id} onChange={() => { setTradeoff(id as Experience["tradeoff"]); invalidate(); }} />{name}</label>)}</fieldset>
      </section>
      <aside className="min-w-0" aria-label="即时计算结果"><h2 className="font-semibold">即时结果 · n = {metrics.n}</h2><dl className="mt-4 grid grid-cols-2 gap-3">{[["TP 真阳性", metrics.tp], ["FP 误报", metrics.fp], ["TN 真阴性", metrics.tn], ["FN 漏报", metrics.fn]].map(([name, value]) => <div className="border-b py-3" key={name}><dt className="text-xs muted">{name}</dt><dd className="mt-1 text-2xl font-semibold">{value}</dd></div>)}</dl>
        <dl className="mt-5 space-y-3 text-sm"><div><dt>灵敏度 TP/(TP+FN)</dt><dd className="font-semibold">{percent(metrics.sensitivity)}</dd></div><div><dt>特异度 TN/(TN+FP)</dt><dd className="font-semibold">{percent(metrics.specificity)}</dd></div><div><dt>精确率 TP/(TP+FP)</dt><dd className="font-semibold">{percent(metrics.precision)}</dd></div></dl>
        <p className="mt-6 text-sm leading-7" aria-live="polite">相对当前设备阈值 0.50：误报变化 {metrics.fp - baseline.fp >= 0 ? "+" : ""}{metrics.fp - baseline.fp}，漏报变化 {metrics.fn - baseline.fn >= 0 ? "+" : ""}{metrics.fn - baseline.fn}。调整阈值不能替代外部验证。</p>
      </aside>
    </div>
    <section className="mt-10 max-w-3xl border-t pt-7"><h2 className="text-xl font-semibold">体验反思与个人成果</h2><p className="mt-3 text-sm muted">仅将你的明确反思作为体验兴趣证据；保存在本浏览器的 simulation 记录中，请勿填写真实个人信息。</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2"><label>最想继续做的环节<input className="field" value={favorite} maxLength={240} onChange={(e) => { setFavorite(e.target.value); invalidate(); }} /></label><label>最不喜欢的环节（可填暂无）<input className="field" value={least} maxLength={240} onChange={(e) => { setLeast(e.target.value); invalidate(); }} /></label>
      <label>愿意再花 3 小时做类似工作吗？<select className="field" value={willingness} onChange={(e) => { setWillingness(Number(e.target.value)); invalidate(); }}><option value="0">请选择</option>{["完全不愿意", "较不愿意", "不确定", "较愿意", "非常愿意"].map((s, i) => <option key={s} value={i + 1}>{i + 1} · {s}</option>)}</select></label><label>还想了解什么（可选）<input className="field" maxLength={1000} value={question} onChange={(e) => { setQuestion(e.target.value); invalidate(); }} /></label></div>
      <div className="mt-6 flex flex-wrap gap-3"><button className="button" onClick={() => save(true)}>保存反思并导出成果卡</button><button className="button secondary" onClick={() => save(false)}>仅保存教学成果</button><button className="button secondary" disabled={savingPrivate} onClick={savePrivate}>{savingPrivate ? "保存中…" : "保存到当前访客私有记录"}</button>{completed && <Link className="button secondary" href="/report/plan?direction=ml_cv">整理行动草案 →</Link>}</div><p className="status" role="status">{message}</p>
    </section>
  </main>;
}
