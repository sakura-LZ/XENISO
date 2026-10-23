"use client";

import { useState } from "react";
import Link from "next/link";
import { simulationInput } from "@/lib/match/simulation";
import { match, type MatchReport, type Dimension } from "@/lib/match/engine";
import { known, unknown, skillLabels, matchInputSchema, type MatchInput } from "@/lib/match/contracts";
import { download } from "@/lib/download";
import "../experience-social-redesign.css";

const labels = { interest: "职业兴趣接近度", readiness: "能力准备度", transition: "转型可行性线索", admissions: "升学条件适配度" } as const;
function Score({ data }: { data: Dimension }) {
  const correlation = data.detail?.correlation;
  return <><strong>{data.score === null ? "待补充" : `${data.score.toFixed(1)} / 100`}</strong><p>覆盖率 {Math.round(data.coverage * 100)}%{data.status === "partial" ? " · 部分依据" : ""}{typeof correlation === "number" ? ` · 轮廓相关 r=${correlation.toFixed(2)}` : ""}</p></>;
}
function rankLabel(rank: number | null, range: [number, number] | null) {
  if (!rank) return "";
  if (range && range[1] > range[0]) return `${rank}.（${range[0]}–${range[1]}）`;
  return `${rank}. `;
}
export default function MatchWorkbench() {
  const [input, setInput] = useState<MatchInput | null>(null);
  const [report, setReport] = useState<MatchReport | null>(null);
  const [selected, setSelected] = useState("");
  const [mode, setMode] = useState<"simulation" | "personal" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("选择合成演示，或读取当前访客已保存的画像。");
  function startDemo() { const data = simulationInput(); setMode("simulation"); setInput(data); setReport(null); setSelected(""); setMessage("已载入 simulation 合成画像与三个岗位。可调整技能后开始计算。"); }
  async function loadPersonal() {
    setMode("personal"); setBusy(true); setInput(null); setReport(null); setSelected("");
    try {
      const response = await fetch("/api/match", { cache: "no-store" }); const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "读取失败");
      const data = matchInputSchema.parse(body.input); setInput(data);
      setMessage("已读取私有画像。真实职业评分标准待审核；缺失处会保留未知。修改只用于本次本地探索。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "读取未完成"); }
    finally { setBusy(false); }
  }
  function changeSkill(id: keyof typeof skillLabels, value: string) {
    if (!input) return;
    const level = value === "" ? unknown<number>() : known(Number(value), { ref: `match.local.skills.${id}`, source_kind: input.user.simulation ? "simulation" : "self_report", verification: input.user.simulation ? "simulation" : "self_reported", url: null, published_at: null, retrieved_at: new Date().toISOString(), locator: "本次用户主动选择的 LIMEN 0–4 自评；未写入数据库" });
    setInput({ ...input, user: { ...input.user, skills: [...input.user.skills.filter(s => s.skill_id !== id), { skill_id: id, level }] } });
    setReport(null); setMessage("技能已更新，旧结果已撤下；请重新计算。");
  }
  const active = report?.results.find(r => r.occupation_id === selected);
  return <main id="main" className="shell match-redesign">
    <header className="match-heading" data-motion="M-T01" data-reveal><h1>职业与升学匹配</h1><p>分别查看兴趣、准备情况、投入线索与报考条件，找到下一项值得验证的行动。</p></header>
    <nav className="match-prerequisites" aria-label="补充匹配依据"><Link href="/profile">完善个人画像</Link><Link href="/assessment">兴趣测评</Link><Link href="/explore">方向手册</Link><Link href="/experience">职业体验</Link></nav>
    <div className="match-modes" aria-label="选择匹配资料来源" data-motion="M-T01"><button className="button secondary" aria-pressed={mode === "simulation"} disabled={busy} onClick={startDemo}>使用合成演示</button><button className="button secondary" aria-pressed={mode === "personal"} disabled={busy} onClick={() => void loadPersonal()}>{busy ? "正在读取…" : "读取我的画像"}</button></div>
    <p role="status" className="match-notice">{message}</p>
    {input && <section key={mode} className="match-input" data-motion="M-T01">
      <h2>确认技能准备</h2>
      <p>{input.user.simulation ? "simulation：以下画像、岗位数值均为合成演示。" : "个人模式：数据仅在本页面计算，不保存本次修改。"}</p>
      <p>等级：0 未接触 · 1 在指导下完成 · 2 独立完成基础任务 · 3 独立完成复杂任务 · 4 指导与评审。未填写保持未知。自评会按可靠性向中位收缩（没有作品或评分依据时不当作能力认证）。</p>
      <div className="match-skill-fields">{Object.entries(skillLabels).map(([id, label]) => <label key={id} className="form-label">{label}<select aria-label={label} className="field" value={input.user.skills.find(s => s.skill_id === id)?.level.value ?? ""} onChange={e => changeSkill(id as keyof typeof skillLabels, e.target.value)}><option value="">未知</option>{[0, 1, 2, 3, 4].map(v => <option value={v} key={v}>{v}</option>)}</select></label>)}</div>
      <button className="button" onClick={() => { const result = match(input); setReport(result); setSelected(result.results[0]?.occupation_id ?? ""); setMessage("已完成计算。选择岗位查看依据，并导出本次行动清单。"); }}>计算岗位匹配</button>
    </section>}
    {report && <section className="match-results" data-motion="M-T02">
      <h2>比较并选择探索目标</h2><p>{report.ranking_basis}</p>
      <p role="status">排序稳定性：{{ stable: "稳定（权重 ±20% 扰动后名次不变）", variable: "可变（个别名次会随权重互换）", unstable: "不稳定（名次跨度过大，请并列看待）", "n/a": "不足以排序" }[report.sensitivity.stability]}。名次只用于提示探索顺序，不是适合度。</p>
      <div className="match-table-scroll" tabIndex={0} role="region" aria-label="岗位比较表，可横向滚动"><table className="match-table"><thead><tr><th scope="col">岗位</th>{Object.values(labels).map(label => <th scope="col" key={label}>{label}</th>)}<th scope="col">岗位资格</th></tr></thead><tbody>{report.results.map(r => <tr key={r.occupation_id} className={selected === r.occupation_id ? "is-selected" : ""}><td><button aria-pressed={selected === r.occupation_id} onClick={() => setSelected(r.occupation_id)}>{rankLabel(r.rank, r.rank_range)}{r.title}</button></td>{Object.keys(labels).map(k => <td key={k}><Score data={r[k as keyof typeof labels]} /></td>)}<td>{r.eligibility.status === "met" ? "所列条件已满足" : r.eligibility.status === "not_met" ? "存在不满足条件" : "待核实"}</td></tr>)}</tbody></table></div>
      {active && <article className="match-evidence" key={active.occupation_id} data-motion="M-T03"><h3>{active.title} · 依据与下一步</h3>
        {typeof active.readiness.detail?.must_have_gap === "string" && <p role="alert">关键要求未达到：{active.readiness.detail.must_have_gap}。准备度已封顶，不会因为其他技能而抵消。</p>}
        <h4>技能差距</h4>
        <ul>{active.gaps.map(g => <li key={g.skill_id}>{g.label}：当前 {g.current ?? "未知"} / 要求 {g.target ?? "未知"} · 差距 {g.gap ?? "待核实"}{g.must_have ? " · 关键要求" : ""}</li>)}</ul>
        <h4>招生项目核验</h4>
        {active.programs.length === 0 ? <p>尚无已审核的关联招生项目；请补充目标年份的官方目录及跨考规定。</p> : <ul>{active.programs.map(p => <li key={p.id}>{p.university} · {p.major} · {p.year} · {p.pathway}：{({ met: "所列条件满足", not_met: "存在不满足条件", unknown: "待核实", expired: "资料已过期", plan_mismatch: "与当前年份或路径不符" } as Record<string, string>)[p.status]}</li>)}</ul>}
        {Object.entries(labels).map(([key, label]) => { const d = active[key as keyof typeof labels]; return <details key={key}><summary className="cursor-pointer">{label}的计算依据</summary><p className="my-2">{d.basis}</p>{d.missing.map(m => <p key={m} className="text-sm text-slate-600">{m}</p>)}<ul className="mt-2 space-y-1">{d.evidence.map((e, i) => <li key={`${e.ref}:${i}`} className="break-words text-sm">{e.url ? <a className="text-blue-700 underline" href={e.url} target="_blank" rel="noreferrer">{e.ref}</a> : e.ref} · {e.locator} · 发布日期 {e.published_at ?? "未知"}</li>)}</ul></details>; })}
        <ul className="list-disc space-y-2 pl-5">{active.actions.map((a, i) => <li key={i}>{a.action}</li>)}</ul>
        <button className="button" onClick={() => { download(`LIMEN-Match-${report.simulation ? "simulation-" : ""}${active.occupation_id}.json`, JSON.stringify({ ...report, selected_occupation_id: active.occupation_id }, null, 2)); setMessage("已发起下载本次匹配依据与行动清单。"); }}>导出匹配与行动清单</button>
      </article>}
      <p className="match-limitations">{report.limitations.join("；")}。</p>
    </section>}
  </main>;
}
