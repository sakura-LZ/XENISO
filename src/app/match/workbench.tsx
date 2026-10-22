"use client";

import { useState } from "react";
import Link from "next/link";
import { simulationInput } from "@/lib/match/simulation";
import { match, type MatchReport, type Dimension } from "@/lib/match/engine";
import { known, unknown, skillLabels, matchInputSchema, type MatchInput } from "@/lib/match/contracts";
import { download } from "@/lib/download";

const labels = { interest: "职业兴趣接近度", readiness: "能力准备度", transition: "转型可行性线索", admissions: "升学条件适配度" } as const;
function Score({ data }: { data: Dimension }) {
  return <><strong>{data.score === null ? "待补充" : `${data.score.toFixed(1)} / 100`}</strong><p className="text-sm text-slate-600">覆盖率 {Math.round(data.coverage * 100)}%{data.status === "partial" ? " · 部分依据" : ""}</p></>;
}
export default function MatchWorkbench() {
  const [input, setInput] = useState<MatchInput | null>(null);
  const [report, setReport] = useState<MatchReport | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("选择合成演示，或读取当前访客已保存的画像。");
  function startDemo() { const data = simulationInput(); setInput(data); setReport(null); setSelected(""); setMessage("已载入 simulation 合成画像与三个岗位。可调整技能后开始计算。"); }
  async function loadPersonal() {
    setBusy(true); setInput(null); setReport(null); setSelected("");
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
  return <main id="main" className="mx-auto max-w-6xl space-y-6 px-4 py-10">
    <header><p className="text-sm text-blue-700">LIMEN-Match V1</p><h1 className="text-3xl font-semibold">从画像到职业与升学选择</h1><p className="mt-3 text-slate-600">分别查看兴趣、准备情况、投入线索与报考条件，找到下一项值得验证的行动。</p></header>
    <nav className="flex flex-wrap gap-4 text-blue-700"><Link href="/profile">完善个人画像</Link><Link href="/assessment">兴趣测评</Link><Link href="/explore">方向手册</Link><Link href="/experience">职业体验</Link></nav>
    <div className="flex flex-wrap gap-3"><button className="btn" disabled={busy} onClick={startDemo}>使用合成演示</button><button className="btn" disabled={busy} onClick={loadPersonal}>{busy ? "正在读取…" : "读取我的画像"}</button></div>
    <p role="status" className="border-l-4 border-blue-600 bg-slate-50 p-4">{message}</p>
    {input && <section className="space-y-4 border-t border-slate-200 pt-5">
      <h2 className="text-xl font-semibold">1. 确认技能准备</h2>
      <p>{input.user.simulation ? "simulation：以下画像、岗位数值均为合成演示。" : "个人模式：数据仅在本页面计算，不保存本次修改。"}</p>
      <p className="text-sm text-slate-600">等级：0 未接触 · 1 在指导下完成 · 2 独立完成基础任务 · 3 独立完成复杂任务 · 4 指导与评审。未填写保持未知。</p>
      <div className="grid gap-3 sm:grid-cols-3">{Object.entries(skillLabels).map(([id, label]) => <label key={id} className="flex flex-col gap-1">{label}<select aria-label={label} className="rounded border border-slate-300 p-2" value={input.user.skills.find(s => s.skill_id === id)?.level.value ?? ""} onChange={e => changeSkill(id as keyof typeof skillLabels, e.target.value)}><option value="">未知</option>{[0, 1, 2, 3, 4].map(v => <option value={v} key={v}>{v}</option>)}</select></label>)}</div>
      <button className="btn" onClick={() => { const result = match(input); setReport(result); setSelected(result.results[0].occupation_id); setMessage("已完成计算。选择岗位查看依据，并导出本次行动清单。"); }}>2. 计算三个岗位</button>
    </section>}
    {report && <section className="space-y-5 border-t border-slate-200 pt-5">
      <h2 className="text-xl font-semibold">3. 比较并选择探索目标</h2><p className="text-sm text-slate-600">{report.ranking_basis}</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[740px] text-left"><thead><tr><th className="p-3">岗位</th>{Object.values(labels).map(label => <th key={label} className="p-3">{label}</th>)}<th className="p-3">岗位资格</th></tr></thead><tbody>{report.results.map(r => <tr key={r.occupation_id} className="border-t border-slate-200"><td className="p-3"><button className="text-blue-700 underline" aria-pressed={selected === r.occupation_id} onClick={() => setSelected(r.occupation_id)}>{r.rank ? `${r.rank}. ` : ""}{r.title}</button></td>{Object.keys(labels).map(k => <td className="p-3" key={k}><Score data={r[k as keyof typeof labels]} /></td>)}<td className="p-3">{r.eligibility.status === "met" ? "所列条件已满足" : r.eligibility.status === "not_met" ? "存在不满足条件" : "待核实"}</td></tr>)}</tbody></table></div>
      {active && <article className="space-y-4 bg-slate-50 p-5"><h3 className="text-lg font-semibold">{active.title} · 依据与下一步</h3>
        <h4 className="font-semibold">技能差距</h4>
        <ul className="space-y-1">{active.gaps.map(g => <li key={g.skill_id}>{g.label}：当前 {g.current ?? "未知"} / 要求 {g.target ?? "未知"} · 差距 {g.gap ?? "待核实"}</li>)}</ul>
        <h4 className="font-semibold">招生项目核验</h4>
        {active.programs.length === 0 ? <p>尚无已审核的关联招生项目；请补充目标年份的官方目录及跨考规定。</p> : <ul>{active.programs.map(p => <li key={p.id}>{p.university} · {p.major} · {p.year} · {p.pathway}：{({ met: "所列条件满足", not_met: "存在不满足条件", unknown: "待核实", expired: "资料已过期", plan_mismatch: "与当前年份或路径不符" } as Record<string, string>)[p.status]}</li>)}</ul>}
        {Object.entries(labels).map(([key, label]) => { const d = active[key as keyof typeof labels]; return <details key={key}><summary className="cursor-pointer">{label}的计算依据</summary><p className="my-2">{d.basis}</p>{d.missing.map(m => <p key={m} className="text-sm text-slate-600">{m}</p>)}<ul className="mt-2 space-y-1">{d.evidence.map((e, i) => <li key={`${e.ref}:${i}`} className="break-words text-sm">{e.url ? <a className="text-blue-700 underline" href={e.url} target="_blank" rel="noreferrer">{e.ref}</a> : e.ref} · {e.locator} · 发布日期 {e.published_at ?? "未知"}</li>)}</ul></details>; })}
        <ul className="list-disc space-y-2 pl-5">{active.actions.map((a, i) => <li key={i}>{a.action}</li>)}</ul>
        <button className="btn" onClick={() => { download(`LIMEN-Match-${report.simulation ? "simulation-" : ""}${active.occupation_id}.json`, JSON.stringify({ ...report, selected_occupation_id: active.occupation_id }, null, 2)); setMessage("已发起下载本次匹配依据与行动清单。"); }}>4. 导出匹配与行动清单</button>
      </article>}
      <p className="text-sm text-slate-600">{report.limitations.join("；")}。</p>
    </section>}
  </main>;
}
