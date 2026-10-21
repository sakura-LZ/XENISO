"use client";
import { useState } from "react";
export default function AccountPage() {
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      const response = await fetch("/api/session", { method: "DELETE" }); const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "删除失败。");
      setMessage("当前访客身份及关联私有记录已删除。其他访客的记录不受影响。"); setConfirm(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "删除失败，请重试。"); }
    finally { setBusy(false); }
  }
  return <main id="main" className="shell py-12"><div className="max-w-2xl"><p className="eyebrow">访客与隐私</p><h1 className="mt-3 text-3xl font-semibold">管理当前访客</h1><p className="mt-5 leading-7 muted">匿名身份保存在此浏览器的受保护会话中。清除浏览器数据或更换设备后，无法找回原身份。删除会移除当前身份和其关联资料，无法撤销。</p><div className="mt-7">{confirm ? <div><p className="mb-4">确认删除当前访客及其全部私有记录？</p><button className="button danger" disabled={busy} onClick={remove}>确认删除</button><button className="button secondary ml-3" disabled={busy} onClick={() => setConfirm(false)}>取消</button></div> : <button className="button danger" onClick={() => setConfirm(true)}>删除当前访客及资料</button>}</div><p role="status" className="mt-5 text-sm text-blue-900">{message}</p></div></main>;
}
