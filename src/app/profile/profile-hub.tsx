"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readProfileOverview, type ProfileOverview } from "@/lib/profile-overview";
import { ProfileReport } from "./profile-report";

type Status = { state: "loading" | "error" | "ready"; data: ProfileOverview | null; message: string };
export function ProfileHub() {
  const [status, setStatus] = useState<Status>({ state: "loading", data: null, message: "" });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException("请求超时", "TimeoutError")), 30000);
    void readProfileOverview(fetch, controller.signal).then(data => {
      if (!controller.signal.aborted) setStatus({ state: "ready", data, message: "" });
    }).catch(error => {
      if (!controller.signal.aborted || controller.signal.reason?.name === "TimeoutError") setStatus({ state: "error", data: null, message: controller.signal.aborted ? "资料读取超时，请重新读取。" : error instanceof Error && error.name !== "ZodError" ? error.message : "保存的资料未通过校验，请重新读取。" });
    }).finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [revision]);
  const labels = status.state === "loading" ? ["正在读取", "正在读取"] : status.state === "error" ? ["状态未确认", "状态未确认"] : [status.data?.basicsComplete ? "已完成" : status.data?.profile ? "待完善" : "未填写", status.data?.assessment ? "已完成" : "未填写"];
  return <><header className="xn-page-heading"><h1>个人画像</h1></header>
    {status.state === "error" && <div className="xn-error" role="alert"><p>{status.message}</p><button type="button" onClick={() => { setStatus({ state: "loading", data: null, message: "" }); setRevision(n => n + 1); }}>重新读取</button></div>}
    <div className="xn-profile-portals">
      {[{ title: "个人基本情况", description: "", src: "/previews/assets/xeniso-direct-basics.webp", alt: "学生正在整理个人资料文件夹", href: "/profile/basics", action: status.state === "ready" ? (status.data?.basicsComplete ? "修改" : status.data?.profile ? "继续填写" : "开始填写") : "开始填写" }, { title: "职业兴趣问卷", description: "O*NET Mini-IP · 30 项职业活动。", src: "/previews/assets/xeniso-direct-interests.webp", alt: "学生正在参与职业兴趣活动", href: "/assessment", action: status.state === "ready" && status.data?.assessment ? "修改" : "开始填写" }].map((portal, index) => <article className="xn-profile-portal" key={portal.href}>
        <div className="xn-portal-top"><span className={`xn-completion ${labels[index] === "已完成" ? "is-complete" : ""}`} role="status">{labels[index]}</span></div>
        <Image className="xn-portal-image" src={portal.src} alt={portal.alt} width={1200} height={800} sizes="(max-width: 700px) 100vw, 520px" priority />
        <div className="xn-portal-body"><h2>{portal.title}</h2>{portal.description && <p>{portal.description}</p>}<Link href={portal.href} className="xn-start-button" aria-label={`${portal.title}：${portal.action}`}>{portal.action}</Link></div>
      </article>)}
    </div><ProfileReport key={revision} ready={status.state === "ready" && status.data?.ready === true} checking={status.state !== "ready"} /></>;
}
