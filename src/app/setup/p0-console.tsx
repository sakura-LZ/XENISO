"use client";

import { useState } from "react";
import { emptyProfile } from "@/lib/profile";

type Action = "session" | "save" | "read" | "questions" | "delete";
export function P0Console() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [nickname, setNickname] = useState("simulation：访客验证");
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function run(action: Action) {
    setBusy(true); setMessage("正在连接，请稍候…");
    const endpoint = action === "questions" ? "/api/onet/questions" : ["save", "read"].includes(action) ? "/api/profile" : "/api/session";
    try {
      const response = await fetch(endpoint, {
        method: action === "save" ? "PUT" : action === "session" ? "POST" : action === "delete" ? "DELETE" : "GET",
        headers: action === "save" ? { "Content-Type": "application/json" } : undefined,
        body: action === "save" ? JSON.stringify({ ...emptyProfile, nickname }) : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "操作失败，请稍后重试。");
      if (action === "session") setMessage(data.user?.anonymous ? "匿名会话已就绪，可保存合成昵称。" : "会话已就绪。");
      if (action === "save") setMessage("昵称已保存。可刷新页面后点击读取，检查同一会话的保存结果。");
      if (action === "read") setMessage(data.profile ? `已读取保存的昵称：${data.profile.nickname}` : "此访客尚无保存资料。");
      if (action === "questions") setMessage(`已从 O*NET 获取 ${data.questions.length} 题，数据库版本 ${data.onet_version}。此操作未进行计分。`);
      if (action === "delete") { setMessage("访客身份及其资料已删除。"); setConfirmDelete(false); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "连接失败，请稍后重试。"); }
    finally { setBusy(false); }
  }
  return <section className="mt-10" aria-labelledby="console-heading">
    <h2 id="console-heading" className="t-block">封闭验证入口</h2>
    <div className="mt-5 flex flex-wrap gap-3">
      <button className="button" disabled={busy} onClick={() => run("session")}>创建或恢复匿名访客</button>
      <button className="button secondary" disabled={busy} onClick={() => run("questions")}>请求官方 30 题</button>
    </div>
    <form className="mt-7" onSubmit={(event) => { event.preventDefault(); void run("save"); }}>
      <label htmlFor="nickname" className="font-medium">合成测试昵称</label>
      <input id="nickname" className="field" value={nickname} onChange={(e) => setNickname(e.target.value)} required minLength={1} maxLength={40} />
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="button secondary" disabled={busy}>保存昵称</button>
        <button type="button" className="button secondary" disabled={busy} onClick={() => run("read")}>读取已保存资料</button>
      </div>
    </form>
    <div className="mt-8 rule pt-6">
      {confirmDelete ? <div><p className="mb-3">确认删除当前访客身份及全部关联资料？此操作无法恢复。</p><div className="flex flex-wrap gap-3"><button className="button danger" disabled={busy} onClick={() => run("delete")}>确认删除</button><button className="button secondary" disabled={busy} onClick={() => setConfirmDelete(false)}>取消</button></div></div> : <button className="button danger" disabled={busy} onClick={() => setConfirmDelete(true)}>删除当前访客及资料</button>}
    </div>
    <p className="status" role="status" aria-live="polite" aria-busy={busy}>{message}</p>
  </section>;
}
