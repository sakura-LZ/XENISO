"use client";
import { useState } from "react";
import { departmentDirectorySource, medicalDepartments } from "@/lib/medical-departments";
import { OfficialDossier } from "./official-dossier";

export function MedicineBrowser({ initialView = "departments", initialCategory = "" }: { initialView?: "departments" | "programs"; initialCategory?: string }) {
  const [view, setView] = useState<"departments" | "programs">(initialView);
  const [department, setDepartment] = useState("");
  const [topic, setTopic] = useState("");
  const departments = view === "departments";
  return <div className="xn-medicine-browser mt-7">
    <div className="mt-5 flex flex-wrap gap-3" aria-label="医学路径"><button className={`button ${departments ? "" : "secondary"}`} aria-pressed={departments} onClick={() => setView("departments")}>医院科室与岗位</button><button className={`button ${departments ? "secondary" : ""}`} aria-pressed={!departments} onClick={() => setView("programs")}>医学专业与升学</button></div>
    {departments ? <>
      <label className="mt-5 block max-w-md text-sm">选择医院科室<select className="mt-2 w-full rounded border border-slate-300 p-3" value={department} onChange={event => setDepartment(event.target.value)}><option value="">全部已收录科室资料</option>{medicalDepartments.map(group => <optgroup key={group.type} label={group.label}>{group.names.map(name => <option key={name}>{name}</option>)}</optgroup>)}</select></label>
      <p className="mt-3 max-w-3xl text-sm leading-7 muted">目录采用<a href={departmentDirectorySource} target="_blank" rel="noreferrer" className="underline">北京大学第一医院官方科室分组 ↗</a>，含39个临床科室、12个医技科室，其中8个已有介绍摘录，其余待补充。医院分组不代表岗位身份，医生、技师、护理等条件需分别核实。</p>
      <p className="mt-3 text-sm leading-7 text-amber-800">科室的学历、专业、执业资格、规培、招聘和薪资条件尚未核验，不能据介绍判断能否入职。</p>
    </> : <label className="mt-5 block max-w-md text-sm">选择医学主题<select className="mt-2 w-full rounded border border-slate-300 p-3" value={topic} onChange={event => setTopic(event.target.value)}>{["", "专业目录", "临床医学", "口腔医学", "医学影像学", "医学检验技术", "康复治疗学", "护理学", "预防医学", "健康服务与管理", "升学要求", "就业统计"].map(value => <option key={value} value={value}>{value || "全部医学资料"}</option>)}</select></label>}
    <OfficialDossier key={`${view}-${department}-${topic}`} medicalTopic={departments ? "临床科室" : topic || undefined} medicalDepartment={departments ? department || undefined : undefined} initialCategory={departments ? "" : initialCategory} />
  </div>;
}
