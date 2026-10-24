"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "./account.css";

import { InkField } from "@/components/ink-field";
import { IconAccount, IconCalendar, IconChat, IconDownload, IconEmpty, IconFolder, IconProfile, IconPulse } from "@/components/icons";
const SECTIONS = [
  ["identity", "身份与访问"],
  ["storage", "资料存储与 AI"],
  ["delete", "删除资料"],
] as const;

export default function AccountPage() {
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [section, setSection] = useState<string>("identity");
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
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".account-sheets>section"));
    const update = () => {
      const current = nodes.filter(node => node.getBoundingClientRect().top < window.innerHeight * .4).at(-1);
      if (current) setSection(current.id);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  async function remove() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/session", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "删除失败。");
      setMessage("当前访客身份和关联的云端私有记录已删除。本机暂存和已经下载的文件仍在你手上，需要自己清。");
      setDeleted(true);
      setConfirm(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  return <main id="main" className="shell account-page">
    <header className="account-head">
      <InkField className="page-ink" band />
      {/* 这页原来 animation 元素数为 0（实测），页眉是硬切进去的。用已有的 xn-enter
          错峰接上：h1 先到、说明文字 80ms 后到，不新增 keyframe。 */}
      <h1 className="enter"><IconProfile className="account-ico" aria-hidden="true" />我的资料</h1>
      <p className="enter" style={{ "--d": 1 } as React.CSSProperties}>这一页说明三件事：现在的匿名身份是什么、资料存在哪儿、想删的时候怎么删干净。匿名不是隐藏，而是这份身份只跟这台浏览器绑定。</p>
    </header>

    <div className="with-toc">
      <nav className="toc" aria-label="资料与隐私目录">
        <ol>
          {SECTIONS.map(([id, title]) => <li key={id}>
            <Link href={`#${id}`} aria-current={section === id ? "location" : undefined}>{title}</Link>
          </li>)}
        </ol>
      </nav>

      <div className="account-sheets">
        <section id="identity" className="atlas-sheet account-section" data-atlas-reveal>
          <h2><IconAccount className="account-ico" aria-hidden="true" />身份与访问</h2>
          <p>你现在的身份是一条没有公开邮箱的访客记录，存在这台浏览器的受保护会话里。换设备或清掉浏览器数据之后，找不回原来那条身份——这也是它保持匿名的原因。</p>
          <dl className="account-kv">
            <div><dt><IconChat className="account-ico" aria-hidden="true" />社区发言</dt><dd>只显示「匿名探索者」，帖子正文里不会带出邮箱。</dd></div>
            <div><dt><IconFolder className="account-ico" aria-hidden="true" />私有资料</dt><dd>画像、测评结果、体验成果和报告只跟当前访客绑定，需要你主动保存才会写入数据库。</dd></div>
            <div><dt><IconCalendar className="account-ico" aria-hidden="true" />会话凭据</dt><dd>保留 30 天。过期不会自动删掉资料，只是你暂时进不来。</dd></div>
          </dl>
          <p>会话过期不等于资料被删，清除浏览器数据也不等于资料被删。要真的清掉，走下面「删除资料」。</p>
        </section>

        <section id="storage" className="atlas-sheet account-section" data-atlas-reveal>
          <h2><IconFolder className="account-ico" aria-hidden="true" />资料存储与 AI 使用</h2>
          <p>你写下的东西分三种存放位置：云端私有记录、本机暂存、会发给 AI 服务的部分。删之前先看清楚哪一份在哪儿。</p>
          <details>
            <summary><IconAccount className="account-ico" aria-hidden="true" />个人访客记录</summary>
            <p>只有连接访客并主动保存后，画像、官方测评、私有体验及报告才会写入配置的数据库。成绩文件在浏览器里解析，只保存你确认过的必要课程字段，不上传原文件。</p>
          </details>
          <details>
            <summary><IconDownload className="account-ico" aria-hidden="true" />本机记录与下载</summary>
            <p>暂停中的职业体验和已经导出的成果留在这台设备上。删除云端身份时，本机记录和下载文件不会被一起清掉，副本由你自己保管。职业体验页有单独清除本机暂存的入口。</p>
          </details>
          <details>
            <summary><IconPulse className="account-ico" aria-hidden="true" />AI 服务</summary>
            <p>你主动生成个人解读时，兴趣结果、技能与项目证据、体验成果与反思、计划条件会发到配置的 AI 服务；昵称、院校和可选数字人对话不发送。自由文本里别填不必要的身份信息。服务提供方的数据保留政策还在核验，没查清之前按「会保留一段时间」来理解。</p>
          </details>
        </section>

        <section id="delete" className="atlas-sheet account-section account-danger" data-atlas-reveal>
          <h2><IconEmpty className="account-ico" aria-hidden="true" />删除资料</h2>
          <p>删除会移除当前访客身份和它关联的云端私有记录，没法撤销。删除前先导出需要留下的报告；本机暂存和下载文件不在这条删除路径里，要自己清。</p>
          <p>社区里发过的帖子要单独处理：删身份之前，先回交流社区把自己贴的纸条逐条删掉。身份删掉之后，你就不再有删除它们的入口。</p>
          <p><Link href="/community"><IconChat className="account-ico" aria-hidden="true" />去交流社区处理自己发过的帖子</Link></p>
          {confirm ? <div
            ref={confirmation}
            tabIndex={-1}
            className="account-confirm"
            role="group"
            aria-labelledby="account-deletion-title"
            onKeyDown={event => { if (event.key === "Escape" && !busy) setConfirm(false); }}
          >
            <h3 id="account-deletion-title">确认删除当前访客及全部私有记录？</h3>
            <p>先导出需要保留的报告，再回交流社区把自己发过的帖子删掉。确认之后无法恢复。</p>
            <div className="account-actions">
              <button className="button danger" disabled={busy} onClick={() => void remove()}><IconEmpty className="account-ico" aria-hidden="true" />{busy ? "正在删除…" : "确认删除"}</button>
              <button className="button secondary" disabled={busy} onClick={() => setConfirm(false)}>取消</button>
            </div>
          </div> : !deleted && <button ref={deleteButton} className="button danger" onClick={() => { setMessage(""); setConfirm(true); }}><IconEmpty className="account-ico" aria-hidden="true" />删除当前访客及资料</button>}
          {message && <p ref={feedback} tabIndex={-1} role="status" aria-live="polite" className="account-foot-note">{message}</p>}
        </section>
      </div>
    </div>
  </main>;
}
