"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type CommunityPost, postSchema } from "@/lib/community";

type PostKind = "help" | "experience";
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

  const load = useCallback(async () => {
    try {
      const session = await fetch("/api/session");
      const current = await session.json();
      const signedIn = !!current.user && !current.user.anonymous;
      setMember(signedIn);
      if (!signedIn) return;
      const response = await fetch("/api/community");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "社区暂时无法加载。");
      setPosts(data.posts ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "社区暂时无法加载。");
    } finally {
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const visiblePosts = useMemo(() => posts.filter(post => filter === "all" || post.kind === filter), [filter, posts]);

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
      const data = await response.json();
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

  async function action(input: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();
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

  return <main id="main" className="shell py-10">
    <header className="mx-auto max-w-5xl">
      <p className="eyebrow">LIMEN 社区</p>
      <h1 className="mt-2 text-3xl font-semibold">把问题带来，也把经验留下</h1>
      <p className="mt-3 leading-7 muted">交流跨学科探索中的真实问题与实践。</p>
    </header>
    {message && <p role="status" className="inline-feedback mx-auto mt-5 max-w-5xl">{message}</p>}

    {checkingSession ? <p className="mx-auto mt-8 max-w-5xl text-sm muted" role="status">正在连接社区…</p> : !member ? <section className="mx-auto mt-8 max-w-2xl rounded-xl border border-slate-200 bg-white p-6 md:p-8">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-xl font-semibold">登录后参与交流</h2>
        <p className="mt-2 text-sm leading-6 muted">帖子以匿名身份展示，邮箱不会公开。</p>
      </div>
      <div className="mt-5 grid gap-5">
        <label className="form-label">登录方式
          <select className="field" value={authMode} onChange={e => { setAuthMode(e.target.value as AuthMode); setSent(false); setToken(""); }}>
            <option value="link">绑定当前访客，保留私有资料</option>
            <option value="login">登录已有账号，切换到该账号资料</option>
          </select>
        </label>
        <label className="form-label">邮箱
          <input className="field" type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setSent(false); }} />
        </label>
        {sent && <label className="form-label">邮箱验证码
          <input className="field" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={token} onChange={e => setToken(e.target.value)} />
        </label>}
        <div className="flex flex-wrap items-center gap-4">
          <button className="button" disabled={busy || !email || (sent && !token)} onClick={() => void auth()}>{busy ? "正在验证…" : sent ? "验证并登录" : "发送验证码"}</button>
          {sent && <button className="text-sm text-blue-700 underline underline-offset-4" disabled={busy} onClick={() => void auth(true)}>重新发送验证码</button>}
        </div>
      </div>
    </section> : <div className="mx-auto mt-8 grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.82fr)] lg:items-start">
      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div><h2 className="text-xl font-semibold">社区交流</h2><p className="mt-1 text-sm muted">查看他人的问题与实践经验</p></div>
          <div className="choice-row" aria-label="筛选帖子">
            {([["all", "全部"], ["help", "求助"], ["experience", "经验"]] as const).map(([value, label]) => <button className="choice" aria-pressed={filter === value} key={value} onClick={() => setFilter(value)}>{label}</button>)}
          </div>
        </div>
        {!visiblePosts.length ? <div className="py-12 text-center"><p className="font-medium">{posts.length ? "这个分类还没有内容" : "社区还没有帖子"}</p><p className="mt-2 text-sm muted">发布你的问题或探索经历，开启交流。</p></div> : <div className="divide-y divide-slate-200">
          {visiblePosts.map(post => <article className="py-6 first:pt-5" key={post.id}>
            <div className="flex flex-wrap items-center gap-2 text-xs muted"><span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{post.kind === "help" ? "求助" : "经验分享"}</span><span>匿名探索者</span><span aria-hidden="true">·</span><time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString("zh-CN")}</time>{post.mine && <span className="text-blue-700">· 我的帖子</span>}</div>
            <h3 className="mt-3 text-lg font-semibold leading-7">{post.title}</h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{post.body}</p>
            <div className="mt-4 flex gap-5 text-sm">
              {post.mine && <button className="text-red-700 underline underline-offset-4" disabled={busy} onClick={() => { if (window.confirm("删除这条帖子？")) void action({ action: "delete", id: post.id }); }}>删除</button>}
              <button className="text-slate-600 underline underline-offset-4" disabled={busy} onClick={() => setReportId(reportId === post.id ? "" : post.id)}>举报</button>
            </div>
            {reportId === post.id && <div className="mt-4 rounded-lg bg-slate-50 p-4"><label className="form-label">举报原因
              <select className="field" value={reason} onChange={e => setReason(e.target.value)}><option value="privacy">包含个人或患者信息</option><option value="abuse">攻击或骚扰</option><option value="spam">广告或垃圾内容</option><option value="other">其他</option></select>
            </label><div className="mt-3 flex flex-wrap gap-3"><button className="button secondary" disabled={busy} onClick={async () => { if (await action({ action: "report", id: post.id, reason })) { setReportId(""); setMessage("举报已记录。"); } }}>提交举报</button><button className="text-sm text-slate-600 underline" onClick={() => setReportId("")}>取消</button></div></div>}
          </article>)}
        </div>}
      </section>

      <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 md:p-7 lg:sticky lg:top-6">
        <div className="border-b border-slate-200 pb-5"><p className="eyebrow">分享与求助</p><h2 className="mt-1 text-xl font-semibold">发起交流</h2></div>
        <div className="mt-5 grid gap-4">
          <label className="form-label">交流类型
            <select className="field" value={kind} onChange={e => setKind(e.target.value as PostKind)}><option value="help">我需要帮助</option><option value="experience">我想分享经验</option></select>
          </label>
          <label className="form-label">标题
            <input className="field" placeholder={kind === "help" ? "例如：如何开始生物信息学项目？" : "例如：我是怎样完成第一个数据分析项目的"} maxLength={100} value={title} onChange={e => setTitle(e.target.value)} />
          </label>
          <label className="form-label">具体内容
            <textarea className="field" rows={6} placeholder={kind === "help" ? "说说你的背景、正在尝试的事，以及希望得到什么帮助。" : "分享你的做法、收获和仍未解决的问题。"} maxLength={4000} value={body} onChange={e => setBody(e.target.value)} />
          </label>
          <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1" type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>我确认此内容对登录用户公开，且不含姓名、联系方式或患者信息。</span></label>
          <button className="button w-full sm:w-auto" disabled={busy || !postSchema.safeParse({ kind, title, body, public_consent: consent }).success} onClick={async () => { if (await action({ action: "publish", post: { kind, title, body, public_consent: consent } })) { setTitle(""); setBody(""); setConsent(false); setMessage("已匿名发布。"); } }}>{busy ? "处理中…" : "匿名发布"}</button>
        </div>
      </section>
    </div>}
  </main>;
}
