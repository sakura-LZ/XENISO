"use client";
import { useState } from "react";
import { departmentDirectorySource, medicalDepartments } from "@/lib/medical-departments";
import { OfficialDossier } from "./official-dossier";

export function MedicineBrowser() {
  const [view, setView] = useState<"departments" | "programs">("departments");
  const [department, setDepartment] = useState("");
  const [topic, setTopic] = useState("");
  const departments = view === "departments";
  return <div className="mt-7">
    <h2 className="text-2xl font-semibold">医学与医院职业</h2>
    <p className="mt-3 max-w-3xl text-sm leading-7 muted">继续医学也是独立的职业选择。先看医院科室的实际工作，再分别核对专业培养、升学、执业资格、规培和具体岗位招聘。</p>
    <div className="mt-5 flex flex-wrap gap-3" aria-label="医学路径"><button className={`button ${departments ? "" : "secondary"}`} aria-pressed={departments} onClick={() => setView("departments")}>医院科室与岗位</button><button className={`button ${departments ? "secondary" : ""}`} aria-pressed={!departments} onClick={() => setView("programs")}>医学专业与升学</button></div>
    {departments ? <>
      <label className="mt-5 block max-w-md text-sm">选择医院科室<select className="mt-2 w-full rounded border border-slate-300 p-3" value={department} onChange={event => setDepartment(event.target.value)}><option value="">全部已收录科室资料</option>{medicalDepartments.map(group => <optgroup key={group.type} label={group.label}>{group.names.map(name => <option key={name}>{name}</option>)}</optgroup>)}</select></label>
      <p className="mt-3 max-w-3xl text-sm leading-7 muted">目录采用<a href={departmentDirectorySource} target="_blank" rel="noreferrer" className="underline">北京大学第一医院官方科室分组 ↗</a>，包含39个临床科室和12个医技科室入口，当前8个科室已有介绍摘录。目录内其余科室的详细资料仍待补充；医院分组不代表岗位身份，科室内医生、技师、护理等岗位条件需要分别核实。</p>
      <p className="mt-3 text-sm leading-7 text-amber-800">具体科室的学历、专业、执业资格、规培、招聘和薪资条件尚未完成核验，不能据科室介绍判断能否入职。</p>
    </> : <label className="mt-5 block max-w-md text-sm">选择医学主题<select className="mt-2 w-full rounded border border-slate-300 p-3" value={topic} onChange={event => setTopic(event.target.value)}>{["", "专业目录", "临床医学", "口腔医学", "医学影像学", "医学检验技术", "康复治疗学", "护理学", "预防医学", "健康服务与管理", "升学要求", "就业统计"].map(value => <option key={value} value={value}>{value || "全部医学资料"}</option>)}</select></label>}
    <OfficialDossier key={`${view}-${department}-${topic}`} medicalTopic={departments ? "临床科室" : topic || undefined} medicalDepartment={departments ? department || undefined : undefined} />
  </div>;
}
