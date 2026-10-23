"use client";
import { useState } from "react";
import { departmentDirectorySource, medicalDepartments } from "@/lib/medical-departments";
import { OfficialDossier } from "./official-dossier";

export function MedicineBrowser({ initialView = "departments", initialCategory = "" }: { initialView?: "departments" | "programs"; initialCategory?: string }) {
  const [view, setView] = useState<"departments" | "programs">(initialView);
  const [department, setDepartment] = useState("");
  const [topic, setTopic] = useState("");
  const departments = view === "departments";
  return <div>
    <div className="xnlib-med-switch" role="group" aria-label="医学路径">
      <button aria-pressed={departments} onClick={() => setView("departments")}>医院科室与岗位</button>
      <button aria-pressed={!departments} onClick={() => setView("programs")}>医学专业与升学</button>
    </div>
    {departments ? <>
      <label className="xnlib-search" style={{ marginTop: 18, maxWidth: 420 }}>
        <span>选择医院科室</span>
        <select className="field" value={department} onChange={event => setDepartment(event.target.value)}>
          <option value="">全部已收录科室资料</option>
          {medicalDepartments.map(group => <optgroup key={group.type} label={group.label}>{group.names.map(name => <option key={name}>{name}</option>)}</optgroup>)}
        </select>
      </label>
      <p className="xnlib-note">科室目录用的是<a href={departmentDirectorySource} target="_blank" rel="noreferrer">北京大学第一医院的官方科室分组</a>，含 39 个临床科室、12 个医技科室，其中 8 个已有介绍摘录，其余待补充。医院分组不等于岗位身份，医生、技师、护理的条件要分别核实。</p>
      <p className="xnlib-count warn">科室的学历、专业、执业资格、规培、招聘和薪资条件都还没查到官方原文，不能拿科室介绍判断能不能入职。</p>
    </> : <label className="xnlib-search" style={{ marginTop: 18, maxWidth: 420 }}>
      <span>选择医学主题</span>
      <select className="field" value={topic} onChange={event => setTopic(event.target.value)}>
        {["", "专业目录", "临床医学", "口腔医学", "医学影像学", "医学检验技术", "康复治疗学", "护理学", "预防医学", "健康服务与管理", "升学要求", "就业统计"].map(value => <option key={value} value={value}>{value || "全部医学资料"}</option>)}
      </select>
    </label>}
    <OfficialDossier key={`${view}-${department}-${topic}`} medicalTopic={departments ? "临床科室" : topic || undefined} medicalDepartment={departments ? department || undefined : undefined} initialCategory={departments ? "" : initialCategory} />
  </div>;
}
