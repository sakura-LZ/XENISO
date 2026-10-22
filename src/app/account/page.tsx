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
  return <main id="main" className="shell py-12"><div className="max-w-2xl"><p className="eyebrow">访客与隐私</p><h1 className="mt-3 text-3xl font-semibold">管理当前访客</h1><p className="mt-5 leading-7 muted">匿名身份保存在此浏览器的受保护会话中。清除浏览器数据或更换设备后，无法找回原身份。删除会移除当前身份和其关联资料，无法撤销。</p>
    <details className="mt-6 border-y py-5"><summary className="cursor-pointer font-medium">资料存储、保留与 AI 使用</summary><dl className="mt-5 space-y-5 text-sm leading-7">
      <div><dt className="font-semibold">个人访客记录</dt><dd>只有连接访客并主动保存后，画像、官方测评、私有体验及报告才会写入配置的数据库。成绩文件在浏览器解析，只保存确认后的必要课程字段，不上传原文件。</dd></div>
      <div><dt className="font-semibold">保留与删除</dt><dd>资料不会因会话过期自动删除。会话凭据保留30天；清除浏览器数据不等于删除云端资料。需要删除时，请在仍能访问当前身份的浏览器使用下方入口。</dd></div>
      <div><dt className="font-semibold">本机记录与下载</dt><dd>暂停的职业体验和下载成果保留在本机。删除云端身份不会删除本机记录或下载文件，副本由本人保管。</dd></div>
      <div><dt className="font-semibold">AI 服务</dt><dd>主动生成个人解读时，兴趣结果、技能与项目证据、体验成果与反思、计划条件会发送至配置的 AI 服务；不发送昵称、院校和可选数字人对话。请避免在自由文本中填写不必要的身份信息。提供方的数据保留政策尚待核验。</dd></div>
    </dl></details>
    <div className="mt-7">{confirm ? <div><p className="mb-4">确认删除当前访客及其全部私有记录？</p><button className="button danger" disabled={busy} onClick={remove}>确认删除</button><button className="button secondary ml-3" disabled={busy} onClick={() => setConfirm(false)}>取消</button></div> : <button className="button danger" onClick={() => setConfirm(true)}>删除当前访客及资料</button>}</div><p role="status" className="mt-5 text-sm text-blue-900">{message}</p></div></main>;
}
