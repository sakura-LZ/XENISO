"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readProfileOverview, type ProfileOverview } from "@/lib/profile-overview";
import { documentSnapshot, snapshotSource, translation } from "@/lib/onet/translation";
import { ReportReveal } from "./report-visuals";

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
  const example = translation.items[1];
  return <><ReportReveal motion="M-P01"><header className="xn-page-heading pr-heading"><h1>个人画像</h1></header></ReportReveal>
    {status.state === "error" && <div className="xn-error" role="alert"><p>{status.message}</p><button type="button" onClick={() => { setStatus({ state: "loading", data: null, message: "" }); setRevision(n => n + 1); }}>重新读取</button></div>}
    <div className="pr-profile-portals" aria-busy={status.state === "loading"}>
      <article className="pr-profile-portal"><ReportReveal motion="M-P01 M-P02" className="pr-basics-preview"><div className="pr-preview-paper">{[["课程", "课程名称", "成绩"], ["科研项目", "项目名称", "承担任务"], ["实践经历", "工具或方法", "实际使用经历"]].map(([title, ...fields], index) => <ReportReveal motion="M-P02" key={title} delay={index * 90}><h3>{title}</h3><div className="pr-empty-fields">{fields.map(field => <div key={field}><span>{field}</span><i aria-hidden="true" /></div>)}</div></ReportReveal>)}</div></ReportReveal>
        <div className="pr-portal-body"><h2>医学经历</h2><p>课程、科研与实践记录。</p><span className={`pr-record-status ${status.data?.basicsComplete ? "is-complete" : ""}`} role="status" data-motion="M-P04">{labels[0]}</span><Link href="/profile/basics" className="button">{status.state === "ready" ? status.data?.basicsComplete ? "修改资料" : status.data?.profile ? "继续填写" : "开始填写" : "填写医学经历"}</Link></div>
      </article>
      <article className="pr-profile-portal"><ReportReveal motion="M-P01 M-P03" delay={80} className="pr-question-preview"><div className="pr-preview-paper"><ReportReveal motion="M-P03"><p className="pr-preview-number">O*NET Mini-IP · {example.index} / 30</p><h3>{example.zh}</h3><p lang="en">{example.original_en}</p></ReportReveal><div className="pr-preview-options">{documentSnapshot.answer_options.map((option, index) => <ReportReveal key={option.value} motion="M-P03" delay={120 + index * 40}><span><i aria-hidden="true" />{option.name}</span></ReportReveal>)}</div><a className="pr-source" href={snapshotSource} target="_blank" rel="noreferrer">官方文档题目 · LIMEN 独立译稿</a></div></ReportReveal>
        <div className="pr-portal-body"><h2>职业兴趣</h2><p>O*NET Mini-IP · 30项职业活动。</p><span className={`pr-record-status ${status.data?.assessment ? "is-complete" : ""}`} role="status" data-motion="M-P04">{labels[1]}</span>{status.state === "ready" && status.data?.assessment ? <div className="pr-actions"><Link href="/report/initial#initial-interest" className="button">查看兴趣结果</Link><Link href="/assessment" className="pr-text-link">重新填写问卷</Link></div> : <Link href="/assessment" className="button">开始问卷</Link>}</div>
      </article>
    </div>
    {status.state === "ready" && status.data?.ready && <section className="pr-profile-next" data-motion="M-P04"><Link className="button" href="/report/initial">查看初步评价</Link></section>}</>;
}
