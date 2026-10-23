"use client";
import { useEffect, useRef, useState } from "react";
import "../experience-social-redesign.css";
export default function AccountPage() {
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [section, setSection] = useState("identity");
  const deleteButton = useRef<HTMLButtonElement>(null);
  const confirmation = useRef<HTMLDivElement>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (confirm) confirmation.current?.focus();
    else if (wasConfirming.current) {
      if (deleted) feedback.current?.focus();
      else deleteButton.current?.focus();
    }
    wasConfirming.current = confirm;
  }, [confirm, deleted]);
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".account-body>section"));
    const update = () => {
      const current = nodes.filter(node => node.getBoundingClientRect().top < window.innerHeight * .4).at(-1);
      if (current) setSection(current.id);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  async function remove() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/session", { method: "DELETE" }); const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "删除失败。");
      setMessage("当前访客身份及关联私有记录已删除。本机暂存和已下载文件仍由你保管。"); setDeleted(true); setConfirm(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "删除失败，请重试。"); }
    finally { setBusy(false); }
  }
  return <main id="main" className="shell account-redesign">
    <header className="account-heading" data-motion="M-U01" data-reveal><h1>我的资料</h1></header>
    <div className="account-layout">
      <nav className="account-directory" aria-label="资料与隐私目录">{[["identity", "身份与访问"], ["storage", "资料存储与 AI"], ["delete", "删除资料"]].map(([id, title]) => <a key={id} href={`#${id}`} aria-current={section === id ? "location" : undefined}>{title}</a>)}</nav>
      <div className="account-body">
        <section id="identity"><h2>身份与访问</h2><p>匿名身份保存在此浏览器的受保护会话中。清除浏览器数据或更换设备后，无法找回原身份。</p><p>资料不会因会话过期自动删除。会话凭据保留30天；清除浏览器数据不等于删除云端资料。请在仍能访问当前身份的浏览器管理或删除记录。</p></section>
        <section id="storage" className="account-storage" data-motion="M-U02"><h2>资料存储与 AI 使用</h2>
          <details><summary>个人访客记录</summary><p>只有连接访客并主动保存后，画像、官方测评、私有体验及报告才会写入配置的数据库。成绩文件在浏览器解析，只保存确认后的必要课程字段，不上传原文件。</p></details>
          <details><summary>本机记录与下载</summary><p>暂停的职业体验和下载成果保留在本机。删除云端身份不会删除本机记录或下载文件，副本由本人保管。职业体验页提供清除本机暂存的入口。</p></details>
          <details><summary>AI 服务</summary><p>主动生成个人解读时，兴趣结果、技能与项目证据、体验成果与反思、计划条件会发送至配置的 AI 服务；不发送昵称、院校和可选数字人对话。请避免在自由文本中填写不必要的身份信息。提供方的数据保留政策尚待核验。</p></details>
        </section>
        <section id="delete" data-motion="M-U03"><h2>删除当前访客与资料</h2><p>删除会移除当前身份和其关联的云端私有资料，无法撤销。本机暂存与已下载文件需要自行清理。</p>
          {confirm ? <div ref={confirmation} tabIndex={-1} className="account-deletion-confirm" role="group" aria-labelledby="deletion-title" onKeyDown={event => { if (event.key === "Escape" && !busy) setConfirm(false); }}><h3 id="deletion-title">确认删除当前访客及全部私有记录？</h3><p>请先导出需要保留的资料。确认后无法恢复。</p><div className="form-actions"><button className="button danger" disabled={busy} onClick={() => void remove()}>{busy ? "正在删除…" : "确认删除"}</button><button className="button secondary" disabled={busy} onClick={() => setConfirm(false)}>取消</button></div></div> : !deleted && <button ref={deleteButton} className="button danger" onClick={() => { setMessage(""); setConfirm(true); }}>删除当前访客及资料</button>}
          {message && <p ref={feedback} tabIndex={-1} role="status" className="inline-feedback mt-6">{message}</p>}
        </section>
      </div>
    </div>
  </main>;
}
