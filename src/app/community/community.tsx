"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type CommunityPost, postSchema } from "@/lib/community";
import "../experience-social-redesign.css";

type PostKind = "help" | "experience";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readResponse(response: Response): Promise<any> {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    const data: unknown = JSON.parse(text);
    return data && typeof data === "object" ? data : {};
  } catch {
    if (!response.ok) throw new Error("服务暂时不可用，请稍后重试。");
    throw new Error("服务返回了无法识别的内容，请稍后重试。");
  }
}
type AuthMode = "link" | "login";

export function Community() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [member, setMember] = useState(false);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [kind, setKind] = useState<PostKind>("help");
  const [filter, setFilter] = useState<"all" | PostKind>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [consent, setConsent] = useState(false);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("link");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportId, setReportId] = useState("");
  const [reason, setReason] = useState("privacy");
  const [query, setQuery] = useState("");
  const [loadError, setLoadError] = useState("");
  const reportField = useRef<HTMLSelectElement>(null);
  useEffect(() => { if (reportId) reportField.current?.focus(); }, [reportId]);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const session = await fetch("/api/session");
      const current = await readResponse(session);
      if (!session.ok) throw new Error(current.error?.message ?? "暂时无法读取登录状态。");
      const signedIn = !!current.user && !current.user.anonymous;
      setMember(signedIn);
      if (!signedIn) return;
      const response = await fetch("/api/community");
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error?.message ?? "社区暂时无法加载。");
      setPosts(data.posts ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "社区暂时无法加载。");
    } finally {
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const visiblePosts = useMemo(() => posts.filter(post => (filter === "all" || post.kind === filter) && `${post.title} ${post.body}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [filter, posts, query]);

  async function auth(resend = false) {
    setBusy(true);
    setMessage("");
    try {
      const session = await fetch("/api/session", { method: "POST" });
      if (!session.ok) throw new Error("无法建立会话。");
      const response = await fetch("/api/community/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mode: authMode, ...(sent && !resend ? { token } : {}) }),
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error?.message ?? "邮箱验证未完成。");
      if (data.verified) {
        setMessage("邮箱验证完成。");
        await load();
      } else {
        setSent(true);
        setMessage("验证码已发送，请查收邮箱。");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "邮箱验证未完成。");
    } finally {
      setBusy(false);
    }
  }

  function closeReport() { const id = reportId; setReportId(""); document.getElementById(`report-${id}`)?.focus(); }

  async function action(input: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error?.message ?? "操作未完成，请重试。");
      await load();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作未完成，请重试。");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return <main id="main" className={`shell xn-community-page community-redesign ${member ? "is-member" : "is-visitor"}`}>
    <header className="community-page-heading" data-motion="M-S01" data-reveal><h1>交流社区</h1>{member && <label className="community-search"><span>查找话题</span><input className="field" type="search" value={query} maxLength={160} placeholder="搜索问题、方向或实践经验" onChange={event => setQuery(event.target.value)} /></label>}</header>
    {message && <p role="status" className="inline-feedback community-feedback">{message}</p>}
    {loadError && <div className="inline-feedback community-feedback" role="alert"><p>{loadError}</p><button className="button secondary" onClick={() => void load()}>重试加载</button></div>}
    {checkingSession ? <p className="community-loading" role="status">正在读取登录状态…</p> : !member ? !loadError && <div className="community-auth-layout">
      <section className="community-introduction"><h2>登录后参与交流</h2><p>分享跨学科探索中的实践经验，讨论正在遇到的问题。</p><p>帖子匿名展示，邮箱不公开。</p></section>
      <form className="community-auth-form" onSubmit={event => { event.preventDefault(); void auth(); }}>
        <label className="form-label">登录方式<select className="field" value={authMode} disabled={busy} onChange={e => { setAuthMode(e.target.value as AuthMode); setSent(false); setToken(""); }}><option value="link">绑定当前访客，保留私有资料</option><option value="login">登录已有账号，切换到该账号资料</option></select></label>
        <label className="form-label">邮箱<input className="field" type="email" autoComplete="email" required disabled={busy} value={email} onChange={e => { setEmail(e.target.value); setSent(false); }} /></label>
        {sent && <label className="form-label community-verification" data-motion="M-S01">邮箱验证码<input className="field" inputMode="numeric" autoComplete="one-time-code" required disabled={busy} maxLength={10} value={token} onChange={e => setToken(e.target.value)} /></label>}
        <div className="community-auth-actions"><button type="submit" className="button" disabled={busy || !email || (sent && !token)}>{busy ? "正在验证…" : sent ? "验证并登录" : "发送验证码"}</button>{sent && <button type="button" className="community-text-action" disabled={busy} onClick={() => void auth(true)}>重新发送验证码</button>}</div>
      </form>
    </div> : <div className="community-member-layout">
      <nav className="community-categories" aria-label="筛选帖子">{([["all", "全部"], ["help", "求助"], ["experience", "经验"]] as const).map(([value, label]) => <button type="button" aria-pressed={filter === value} key={value} onClick={() => setFilter(value)}>{label}</button>)}</nav>
      <section className="community-discussions" aria-label="讨论列表" key={`${filter}:${query}`} data-motion="M-S02">
        {!loadError && !visiblePosts.length ? <div className="community-empty"><h2>{posts.length ? "没有符合条件的帖子" : "社区还没有帖子"}</h2>{posts.length > 0 && <button className="community-text-action" onClick={() => { setQuery(""); setFilter("all"); }}>清除筛选</button>}</div> : <div>
          {visiblePosts.map((post, index) => <article className="community-post" key={post.id} style={{ animationDelay: `${Math.min(index, 4) * 60}ms` }} data-motion="M-S02 M-S03">
            <div className="community-post-meta"><span>{post.kind === "help" ? "求助" : "经验"}</span><span>匿名探索者</span><time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString("zh-CN")}</time>{post.mine && <span>我的帖子</span>}</div>
            <h2>{post.title}</h2><p className="community-post-body">{post.body}</p>
            <div className="community-post-actions">{post.mine && <button className="community-text-action is-danger" disabled={busy} onClick={() => { if (window.confirm("删除这条帖子？")) void action({ action: "delete", id: post.id }).then(ok => { if (ok) setMessage("帖子已删除。"); }); }}>删除</button>}<button id={`report-${post.id}`} className="community-text-action" disabled={busy} aria-expanded={reportId === post.id} onClick={() => reportId === post.id ? closeReport() : setReportId(post.id)}>举报</button></div>
            {reportId === post.id && <div className="community-report" data-motion="M-S04"><label className="form-label">举报原因<select ref={reportField} className="field" value={reason} onChange={e => setReason(e.target.value)}><option value="privacy">包含个人或患者信息</option><option value="abuse">攻击或骚扰</option><option value="spam">广告或垃圾内容</option><option value="other">其他</option></select></label><div className="community-post-actions"><button className="button secondary" disabled={busy} onClick={async () => { if (await action({ action: "report", id: post.id, reason })) { closeReport(); setMessage("举报已记录。"); } }}>提交举报</button><button className="community-text-action" onClick={closeReport}>取消</button></div></div>}
          </article>)}
        </div>}
      </section>
      <section className="community-publish" data-motion="M-S03"><h2>发起交流</h2><div>
        <label className="form-label">交流类型<select className="field" value={kind} onChange={e => setKind(e.target.value as PostKind)}><option value="help">我需要帮助</option><option value="experience">我想分享经验</option></select></label>
        <label className="form-label">标题<input className="field" placeholder={kind === "help" ? "你希望解决什么问题？" : "你想分享哪段实践？"} maxLength={100} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label className="form-label">具体内容<textarea className="field" rows={6} placeholder={kind === "help" ? "说明背景、正在尝试的事，以及希望得到的帮助。" : "分享做法、收获和仍未解决的问题。"} maxLength={4000} value={body} onChange={e => setBody(e.target.value)} /></label>
        <label className="community-publish-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>我确认此内容对登录用户公开，且不含姓名、联系方式或患者信息。</span></label>
        <button className="button" disabled={busy || !postSchema.safeParse({ kind, title, body, public_consent: consent }).success} onClick={async () => { if (await action({ action: "publish", post: { kind, title, body, public_consent: consent } })) { setTitle(""); setBody(""); setConsent(false); setMessage("已匿名发布。"); } }}>{busy ? "处理中…" : "匿名发布"}</button>
      </div></section>
    </div>}
  </main>;
}
