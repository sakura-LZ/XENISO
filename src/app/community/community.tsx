"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type CommunityPost, postSchema } from "@/lib/community";
import { AmbientVideo } from "@/components/ambient-video";
import {
  IconBook,
  IconChat,
  IconEmpty,
  IconPin,
  IconSpinner,
  IconStamp,
  IconWarning,
} from "@/components/icons";
import "./community.css";
import "@/app/ambient-video.css";

type PostKind = "help" | "experience";
type Filter = "all" | PostKind | "recruit";
type ReportReason = "privacy" | "abuse" | "spam" | "other";
type AuthMode = "link" | "login";
type Feedback = { tone: "ok" | "error"; text: string } | null;
type FieldErrors = { title?: string; body?: string; consent?: string };

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "help", label: "求助" },
  { value: "experience", label: "经验" },
  { value: "recruit", label: "招募" },
];

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "privacy", label: "含姓名、联系方式或患者信息" },
  { value: "abuse", label: "攻击、骚扰，或贬低别人的选择" },
  { value: "spam", label: "广告、招生中介或课程推销" },
  { value: "other", label: "其他" },
];

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

const KIND_LABEL: Record<PostKind, string> = { help: "求助", experience: "经验" };

/**
 * 访客未验证邮箱时看到的预览纸片。接口层（/api/community 的 GET）要求邮箱已验证，
 * 所以这里用明确标注「示例 · simulation」的合成内容占住墙的位置，不冒充真实用户。
 */
const SAMPLE_POSTS: { kind: PostKind; label: string; title: string; body: string }[] = [
  {
    kind: "help",
    label: "求助",
    title: "临床五年制大四，想补数学一，来得及吗",
    body: "大四上开始补，每周能拿出 12 小时，目标是把三门课的真题做完一轮。想听听已经补过的人：哪一块可以压到最低限度，哪一块不能省。",
  },
  {
    kind: "experience",
    label: "经验",
    title: "做完心电那个体验，我确定不做纯算法了",
    body: "体验任务是把一段心电数据做出可解释的异常片段。我花了两天调模型，第三天才发现真正想弄清的是那段波形在临床上意味着什么，于是把方向往信号处理挪了。",
  },
  {
    kind: "help",
    label: "求助",
    title: "有没有一起做医学影像项目的大三同学",
    body: "我在准备一个肺结节分割的小项目，想找两三个同学一起读论文、轮流做标注，每周固定两小时线上碰一次。标注规范已经找带教老师确认过。",
  },
];

export function Community() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [member, setMember] = useState(false);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);

  // 访客：用邮箱换一个匿名身份
  const [authMode, setAuthMode] = useState<AuthMode>("link");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<Feedback>(null);

  // 发帖
  const [kind, setKind] = useState<PostKind>("help");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [consent, setConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [publishing, setPublishing] = useState(false);

  // 举报 / 删除
  const [reportId, setReportId] = useState("");
  const [reason, setReason] = useState<ReportReason>("privacy");
  const [deleteId, setDeleteId] = useState("");

  // 新纸条落下 + 展开长文
  const [freshId, setFreshId] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState<number | null>(null);

  const reportField = useRef<HTMLSelectElement>(null);
  const titleField = useRef<HTMLInputElement>(null);
  const previousIds = useRef<Set<string>>(new Set());
  const pendingFresh = useRef(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const session = await fetch("/api/session");
      const current = await readResponse(session);
      if (!session.ok) throw new Error(current.error?.message ?? "暂时无法读取登录状态。");
      const signedIn = !!current.user && !current.user.anonymous;
      setMember(signedIn);
      if (!signedIn) {
        previousIds.current = new Set();
        setPosts([]);
        return;
      }
      const response = await fetch("/api/community");
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error?.message ?? "留言墙暂时打不开。");
      const next: CommunityPost[] = Array.isArray(data.posts) ? data.posts : [];
      if (pendingFresh.current) {
        const pinned = next.find(post => !previousIds.current.has(post.id));
        if (pinned) setFreshId(pinned.id);
        pendingFresh.current = false;
      }
      previousIds.current = new Set(next.map(post => post.id));
      setPosts(next);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "留言墙暂时打不开。");
    } finally {
      setCheckingSession(false);
    }
  }, []);

  // 两个 setState 都放到定时器里，避免在 effect 主体同步触发级联渲染。
  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!freshId) return;
    const timer = setTimeout(() => setFreshId(""), 1800);
    return () => clearTimeout(timer);
  }, [freshId]);
  useEffect(() => { if (reportId) reportField.current?.focus(); }, [reportId]);
  useEffect(() => {
    if (!reportId) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const id = reportId;
      setReportId("");
      document.getElementById(`community-report-trigger-${id}`)?.focus();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [reportId]);

  const counts = useMemo(() => ({
    all: posts.length,
    help: posts.filter(post => post.kind === "help").length,
    experience: posts.filter(post => post.kind === "experience").length,
    recruit: 0,
  }), [posts]);

  const visiblePosts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return posts
      .filter(post => filter === "all" ? true : filter === "recruit" ? false : post.kind === filter)
      .filter(post => !needle || `${post.title} ${post.body}`.toLocaleLowerCase().includes(needle));
  }, [filter, posts, query]);

  function timeLabel(iso: string) {
    const fallback = typeof iso === "string" ? iso.slice(0, 10) : "";
    if (now === null) return fallback;
    const stamp = new Date(iso).getTime();
    if (!Number.isFinite(stamp)) return fallback;
    const minutes = Math.max(0, Math.floor((now - stamp) / 60000));
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    return fallback;
  }

  async function verifyEmail(resend = false) {
    setAuthBusy(true);
    setAuthFeedback(null);
    try {
      const session = await fetch("/api/session", { method: "POST" });
      if (!session.ok) throw new Error("无法建立会话，请刷新页面再试。");
      const response = await fetch("/api/community/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mode: authMode, ...(sent && !resend ? { token } : {}) }),
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error?.message ?? "邮箱验证没走完，请再试一次。");
      if (data.verified) {
        setToken("");
        setAuthFeedback({ tone: "ok", text: "邮箱验证完成，现在可以读写帖子了。" });
        await load();
      } else {
        setSent(true);
        setAuthFeedback({ tone: "ok", text: "验证码已发出，去邮箱查收。" });
      }
    } catch (error) {
      setAuthFeedback({ tone: "error", text: error instanceof Error ? error.message : "邮箱验证没走完，请再试一次。" });
    } finally {
      setAuthBusy(false);
    }
  }

  async function submitAction(input: unknown): Promise<boolean> {
    setFeedback(null);
    try {
      const response = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error?.message ?? "操作没完成，请重试。");
      return true;
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "操作没完成，请重试。" });
      return false;
    }
  }

  function validatePost(): boolean {
    const cleanTitle = title.trim();
    const cleanBody = body.trim();
    const next: FieldErrors = {};
    if (cleanTitle.length < 4) next.title = "标题至少 4 个字，写清卡在哪一步。";
    else if (cleanTitle.length > 100) next.title = "标题最多 100 个字，细节放进下面。";
    if (cleanBody.length < 10) next.body = "内容至少 10 个字，补上背景和试过的办法。";
    if (!consent) next.consent = "先勾选这一条。";
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return false;
    return postSchema.safeParse({ kind, title: cleanTitle, body: cleanBody, public_consent: consent }).success;
  }

  async function publish() {
    if (publishing || !validatePost()) return;
    setPublishing(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", post: { kind, title: title.trim(), body: body.trim(), public_consent: consent } }),
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error?.message ?? "发布没成功，先别关页面，等一会儿再点一次。");
      pendingFresh.current = true;
      setTitle("");
      setBody("");
      setConsent(false);
      setFieldErrors({});
      // 回到「全部 + 清空搜索」，否则新纸条会被当前筛选挡在外面，看不到它落下。
      setFilter("all");
      setQuery("");
      setFeedback({ tone: "ok", text: "已经发出，只显示「匿名探索者」。" });
      await load();
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "发布没成功，请重试。" });
    } finally {
      setPublishing(false);
    }
  }

  async function submitReport(id: string) {
    setBusy(true);
    const done = await submitAction({ action: "report", id, reason });
    setBusy(false);
    if (done) {
      setReportId("");
      setFeedback({ tone: "ok", text: "举报已记录，等人工复核。" });
      document.getElementById(`community-report-trigger-${id}`)?.focus();
    }
  }

  async function removePost(id: string) {
    setBusy(true);
    const done = await submitAction({ action: "delete", id });
    setBusy(false);
    setDeleteId("");
    if (done) {
      setFeedback({ tone: "ok", text: "已删除。" });
      await load();
    } else {
      document.getElementById(`community-delete-trigger-${id}`)?.focus();
    }
  }

  function closeReport(id: string) {
    setReportId("");
    document.getElementById(`community-report-trigger-${id}`)?.focus();
  }

  const emptyCopy = useMemo(() => {
    const searched = query.trim();
    if (filter === "recruit") return {
      title: "招募栏还空着",
      text: "招募信息要核实来源才放进来。院校和方向的公开资料可以看信息文库。",
    };
    if (searched) return {
      title: `没有搜到「${searched}」`,
      text: "标题和内容里都没有这几个字，换个说法试试。",
    };
    if (!posts.length) return {
      title: "还没有帖子",
      text: "可以发第一条：写清背景、试过什么、想让人回答哪一点。",
    };
    return {
      title: "这一类还没有帖子",
      text: "换个类型看看，或者发一条。",
    };
  }, [filter, posts.length, query]);

  return <main id="main" className="shell community-page">
    <header className="community-head">
      <AmbientVideo src="/brand/community-background.mp4" ariaLabel="环境底纹" />
      <div>
        <h1 className="community-title"><IconPin className="community-title-icon" aria-hidden="true" />交流社区</h1>
        <p className="community-lede">只收求助与经验两类，全部匿名展示。</p>
      </div>
      <p className="community-head-meta">
        {member
          ? <>{counts.all} 条帖子<br />求助 {counts.help} · 经验 {counts.experience}</>
          : <>验证邮箱后可读写</>}
      </p>
    </header>

    <p className="community-limits">
      <IconWarning aria-hidden="true" />
      <span>回复暂未开放 · 别人的帖子只能举报 · 只有自己发的能删</span>
    </p>

    {feedback && <p className="community-notice" data-tone={feedback.tone} key={feedback.text} role="status" aria-live="polite">
      {feedback.tone === "ok" ? <IconStamp aria-hidden="true" /> : <IconWarning aria-hidden="true" />}
      <span>{feedback.text}</span>
    </p>}
    {loadError && <div className="community-notice" data-tone="error" role="alert">
      <IconWarning aria-hidden="true" />
      <span>{loadError}</span>
      <button type="button" className="community-link" onClick={() => void load()}>重试</button>
    </div>}

    <div className="community-grid">
      <div className="community-wall">
        {checkingSession ? <p className="community-wall-loading" role="status"><IconSpinner className="community-spin" aria-hidden="true" /><span>正在读取帖子…</span></p> : !member ? <>
          <section className="community-compose atlas-sheet" aria-labelledby="gate-title">
          <span className="atlas-pin" aria-hidden="true" />
          <h2 id="gate-title">先验证邮箱，再看帖子</h2>
          <p className="community-note">读写都要先验证邮箱：有人发广告时，我们要能找到发帖人。邮箱不公开，别人只看到「匿名探索者」。</p>
          <form onSubmit={event => { event.preventDefault(); void verifyEmail(); }}>
            <label className="form-label" htmlFor="community-auth-mode">这个邮箱怎么用</label>
            <select
              id="community-auth-mode"
              className="field"
              value={authMode}
              disabled={authBusy}
              onChange={event => { setAuthMode(event.target.value as AuthMode); setSent(false); setToken(""); }}
            >
              <option value="link">绑定当前访客，保留已存资料</option>
              <option value="login">登录已有账号</option>
            </select>
            <div className="community-field">
              <label className="form-label" htmlFor="community-email">邮箱</label>
              <input
                id="community-email"
                className="field"
                type="email"
                autoComplete="email"
                required
                disabled={authBusy}
                value={email}
                onChange={event => { setEmail(event.target.value); setSent(false); }}
              />
            </div>
            {sent && <div className="community-field">
              <label className="form-label" htmlFor="community-token">邮箱验证码</label>
              <input
                id="community-token"
                className="field"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                required
                disabled={authBusy}
                value={token}
                onChange={event => setToken(event.target.value)}
              />
            </div>}
            <div className="community-form-actions">
              <button type="submit" className="button" disabled={authBusy || !email || (sent && !token)}>
                {authBusy ? "正在验证…" : sent ? "验证并进入社区" : "发送验证码"}
              </button>
              {sent && <button type="button" className="button quiet" disabled={authBusy} onClick={() => void verifyEmail(true)}>重新发送验证码</button>}
            </div>
          </form>
          <div className="community-publish-entry">
            <button type="button" className="button" disabled aria-describedby="community-publish-hint">发一条新帖</button>
            <span className="community-publish-hint" id="community-publish-hint">验证邮箱后可用</span>
          </div>
          {authFeedback && <p className="community-notice" data-tone={authFeedback.tone} key={authFeedback.text} role="status" style={{ marginTop: 18, marginBottom: 0 }}>
            {authFeedback.tone === "ok" ? <IconStamp aria-hidden="true" /> : <IconWarning aria-hidden="true" />}
            <span>{authFeedback.text}</span>
          </p>}
          </section>

          <section className="community-preview" aria-labelledby="preview-title">
            <div className="community-preview-head">
              <h2 id="preview-title">两类帖子 · 示例</h2>
            </div>
            <p className="community-note">合成内容，不能举报或删除。</p>
            <ul className="community-preview-list">
              {SAMPLE_POSTS.map(sample => <li key={sample.title}>
                <article className="community-slip atlas-sheet" data-kind={sample.kind}>
                  <span className="atlas-pin" aria-hidden="true" />
                  <div className="community-slip-meta">
                    <span className="community-kind" data-kind={sample.kind}>{sample.kind === "help" ? <IconChat aria-hidden="true" /> : <IconBook aria-hidden="true" />}{sample.label}</span>
                    <span className="community-sample-flag">示例</span>
                    <span className="sim-tag">simulation</span>
                  </div>
                  <h3 className="community-slip-title">{sample.title}</h3>
                  <p className="community-slip-body">{sample.body}</p>
                </article>
              </li>)}
            </ul>
          </section>
        </> : <>
          <section className="community-compose atlas-sheet" aria-labelledby="compose-title">
            <span className="atlas-tape tr" aria-hidden="true" />
            <h2 id="compose-title">发一条新帖</h2>
            <p className="community-note">写清卡在哪一步，或做完之后什么变了。发出后只显示「匿名探索者」。</p>
            <form onSubmit={event => { event.preventDefault(); void publish(); }} noValidate>
              <fieldset className="community-kinds">
                <legend className="form-label">类型</legend>
                <div className="community-kind-row">
                  <button type="button" className="community-kind-btn" aria-pressed={kind === "help"} onClick={() => setKind("help")}>
                    <IconChat aria-hidden="true" />求助
                  </button>
                  <button type="button" className="community-kind-btn" aria-pressed={kind === "experience"} onClick={() => setKind("experience")}>
                    <IconBook aria-hidden="true" />经验
                  </button>
                </div>
              </fieldset>
              <div className="community-field">
                <label className="form-label" htmlFor="community-post-title">
                  标题<span className="community-counter">{title.trim().length}/100</span>
                </label>
                <input
                  id="community-post-title"
                  ref={titleField}
                  className="field"
                  maxLength={100}
                  value={title}
                  aria-invalid={!!fieldErrors.title}
                  aria-describedby={fieldErrors.title ? "community-title-error" : undefined}
                  placeholder={kind === "help" ? "比如：临床五年制大四，想补数学一，来得及吗" : "比如：三个月补完概率统计，我的时间表是这样"}
                  onChange={event => setTitle(event.target.value)}
                />
                {fieldErrors.title && <p className="community-error" id="community-title-error">{fieldErrors.title}</p>}
              </div>
              <div className="community-field">
                <label className="form-label" htmlFor="community-post-body">
                  具体内容<span className="community-counter">{body.trim().length}/4000</span>
                </label>
                <textarea
                  id="community-post-body"
                  className="field"
                  rows={5}
                  maxLength={4000}
                  value={body}
                  aria-invalid={!!fieldErrors.body}
                  aria-describedby={fieldErrors.body ? "community-body-error" : undefined}
                  placeholder={kind === "help"
                    ? "背景是什么、试过什么、想让人回答哪一点。"
                    : "做了什么、花了多久、哪一步最难、还剩什么。"}
                  onChange={event => setBody(event.target.value)}
                />
                {fieldErrors.body && <p className="community-error" id="community-body-error">{fieldErrors.body}</p>}
              </div>
              <label className="community-consent">
                <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />
                <span>我确认内容里没有姓名、联系方式或患者信息。</span>
              </label>
              {fieldErrors.consent && <p className="community-error">{fieldErrors.consent}</p>}
              <div className="community-form-actions" style={{ marginTop: 8 }}>
                <button type="submit" className="button" disabled={publishing}>{publishing ? "正在发出…" : "匿名发出"}</button>
                <p className="community-form-note">发出去就公开了，写错可以删掉重发。</p>
              </div>
            </form>
          </section>

          <div className="community-toolbar">
            <div className="community-filters" role="group" aria-label="按类型筛选帖子">
              {FILTERS.map(({ value, label }) => <button
                key={value}
                type="button"
                className="community-filter"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}<span className="count">{counts[value]}</span>
              </button>)}
            </div>
            <label className="community-query" htmlFor="community-query">
              <span className="sr-only">搜索帖子标题和内容</span>
              <input
                id="community-query"
                className="field"
                type="search"
                value={query}
                maxLength={160}
                placeholder="搜标题或内容"
                onChange={event => setQuery(event.target.value)}
              />
            </label>
          </div>

          {visiblePosts.length === 0 ? <section className="community-wall-empty atlas-sheet flat" aria-live="polite">
            <IconEmpty className="community-empty-icon" aria-hidden="true" />
            <h2>{emptyCopy.title}</h2>
            <p>{emptyCopy.text}</p>
            {(posts.length > 0 || query.trim() || filter !== "all") && <button
              type="button"
              className="community-link"
              onClick={() => { setQuery(""); setFilter("all"); titleField.current?.focus(); }}
            >看全部帖子</button>}
          </section> : <ol className="community-wall-list" data-atlas-reveal>
            {visiblePosts.map(post => {
              const isLong = post.body.length > 150;
              const isOpen = !!expanded[post.id];
              return <li key={post.id}>
                <article
                  className={`community-slip atlas-sheet atlas-lift${post.id === freshId ? " is-fresh" : ""}`}
                  data-kind={post.kind}
                  aria-labelledby={`community-post-${post.id}-title`}
                >
                  <span className="atlas-pin" aria-hidden="true" />
                  <div className="community-slip-meta">
                    <span className="community-kind" data-kind={post.kind}>
                      {post.kind === "help" ? <IconChat aria-hidden="true" /> : <IconBook aria-hidden="true" />}
                      {KIND_LABEL[post.kind]}
                    </span>
                    <span>匿名探索者</span>
                    <time dateTime={post.created_at}>{timeLabel(post.created_at)}</time>
                    {post.mine && <span className="community-mine">我的帖子</span>}
                  </div>
                  <h2 className="community-slip-title" id={`community-post-${post.id}-title`}>{post.title}</h2>
                  <p className="community-slip-body" data-clamped={isLong && !isOpen}>{post.body}</p>
                  <div className="community-slip-actions">
                    {isLong && <button type="button" className="community-link" aria-expanded={isOpen} onClick={() => setExpanded(current => ({ ...current, [post.id]: !current[post.id] }))}>
                      {isOpen ? "收起这段" : "展开全文"}
                    </button>}
                    {post.mine && <button
                      type="button"
                      id={`community-delete-trigger-${post.id}`}
                      className="community-link"
                      data-tone="danger"
                      aria-expanded={deleteId === post.id}
                      disabled={busy}
                      onClick={() => { setDeleteId(deleteId === post.id ? "" : post.id); setReportId(""); }}
                    >删除这条</button>}
                    <button
                      type="button"
                      id={`community-report-trigger-${post.id}`}
                      className="community-link"
                      aria-expanded={reportId === post.id}
                      disabled={busy}
                      onClick={() => { setReportId(reportId === post.id ? "" : post.id); setDeleteId(""); }}
                    >举报</button>
                  </div>

                  {deleteId === post.id && <div className="community-confirm" role="group" aria-labelledby={`community-delete-${post.id}-title`}>
                    <h3 id={`community-delete-${post.id}-title`}>删除这条帖子？</h3>
                    <p>删除后不能恢复。</p>
                    <div className="community-form-actions">
                      <button type="button" className="button danger small" disabled={busy} onClick={() => void removePost(post.id)}>{busy ? "正在删除…" : "确认删除"}</button>
                      <button type="button" className="button quiet" disabled={busy} onClick={() => setDeleteId("")}>留着</button>
                    </div>
                  </div>}

                  {reportId === post.id && <div className="community-report-drawer" role="group" aria-labelledby={`community-report-${post.id}-title`}>
                    <h3 id={`community-report-${post.id}-title`}>举报这条帖子</h3>
                    <label className="form-label" htmlFor={`community-reason-${post.id}`}>哪里有问题</label>
                    <select
                      ref={reportField}
                      id={`community-reason-${post.id}`}
                      className="field"
                      value={reason}
                      onChange={event => setReason(event.target.value as ReportReason)}
                    >
                      {REPORT_REASONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <div className="community-form-actions" style={{ marginTop: 14 }}>
                      <button type="button" className="button secondary small" disabled={busy} onClick={() => void submitReport(post.id)}>提交举报</button>
                      <button type="button" className="button quiet" disabled={busy} onClick={() => closeReport(post.id)}>取消</button>
                    </div>
                    <p className="community-note" style={{ marginTop: 12, marginBottom: 0 }}>人工复核，不自动删帖，不通知被举报的人。</p>
                  </div>}
                </article>
              </li>;
            })}
          </ol>}
        </>}
      </div>

      <aside className="community-rail" aria-label="社区规则与说明">
        <section className="community-rail-card atlas-sheet">
          <span className="atlas-tape tl" aria-hidden="true" />
          <h2>两类帖子</h2>
          <dl className="community-rail-list">
            <div><dt><IconChat aria-hidden="true" />求助</dt><dd>还没弄清楚的问题：背景、试过什么、想让人回答哪一点。</dd></div>
            <div><dt><IconBook aria-hidden="true" />经验</dt><dd>做完一段体验的复盘：做了什么、多久、哪一步最难。</dd></div>
          </dl>
          <p>广告、招生中介、课程推销不进来。</p>
        </section>

        <section className="community-rail-card atlas-sheet">
          <h2>三条规则</h2>
          <ol className="community-rules">
            <li><b>只写确认过的事。</b>引用招生简章、导师回复要给出处；没查到就写「没查到」。</li>
            <li><b>不替别人下判断。</b>说自己怎么判断、依据是什么，不说「你适合」，也不给排名和录取概率。</li>
            <li><b>对内容提不同意见</b>，比反驳发帖人有用。</li>
          </ol>
        </section>

        <section className="community-rail-card atlas-sheet">
          <h2>匿名与删除</h2>
          <p>帖子只显示「匿名探索者」，邮箱不公开。验证邮箱是为了在有人发广告时能找到发帖的人。</p>
          <Link className="community-link" href="/account">到「我的资料」看删除记录</Link>
        </section>
      </aside>
    </div>
  </main>;
}
