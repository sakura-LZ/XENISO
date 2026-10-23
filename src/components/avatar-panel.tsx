"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AvatarPresenter } from "@/lib/avatar-presenters";
import { avatarDialogue } from "@/lib/avatar-dialogue";

type Agent = {
  init(options: { onDownloadProgress: (progress: number) => void }): Promise<void>;
  ask(text: string): Promise<void>;
  speak(text: string): void;
  startASR(): Promise<void>;
  stopASR(): Promise<void>;
  interrupt(): void;
  destroy(reason?: string): Promise<void>;
};
export type MentorLinkState = "idle" | "connecting" | "connected" | "closed";
const linkLabels: Record<MentorLinkState, string> = { idle: "未接通", connecting: "接通中", connected: "已接通", closed: "断开" };
type Props = {
  presenter?: AvatarPresenter;
  role?: string;
  context?: string;
  onTranscript?: (entry: { speaker: "user" | "assistant"; text: string }) => void;
  /** 把接通状态交给页面，用来点亮纸面与墨线。 */
  onConnectionChange?: (state: MentorLinkState) => void;
};
declare global { interface Window { XingyunAvatarAgent?: new (options: Record<string, unknown>) => Agent } }
const sdkUrl = "https://media.xingyun3d.com/xingyun3d/general/litesdk/xmovAvatar_e2e@latest.js";
let sdkPromise: Promise<void> | null = null;
function loadSDK() {
  if (window.XingyunAvatarAgent) return Promise.resolve();
  if (!sdkPromise) sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = sdkUrl; script.async = true;
    const timeout = window.setTimeout(() => { script.remove(); sdkPromise = null; reject(new Error("SDK_LOAD")); }, 25000);
    script.onload = () => { clearTimeout(timeout); if (window.XingyunAvatarAgent) resolve(); else { sdkPromise = null; reject(new Error("SDK_LOAD")); } };
    script.onerror = () => { clearTimeout(timeout); script.remove(); sdkPromise = null; reject(new Error("SDK_LOAD")); };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export function AvatarPanel({ presenter = "medicine", ...props }: Props) {
  return <PresenterPanel key={presenter} presenter={presenter} {...props} />;
}
/** 档案照片式的墨线像：不画五官，避免被当成真人照片；接通后由数字人画面替换。 */
function MentorPortrait() {
  return <svg viewBox="0 0 120 140" role="img" aria-label="模拟导师形象的墨线肖像，不是真人照片">
    <title>模拟导师形象</title>
    <g fill="none" stroke="var(--ink-2)" strokeWidth="1.5" strokeLinecap="round" opacity=".72">
      <path d="M38 51c0-14 9-24 22-24s22 10 22 24-9 26-22 26-22-12-22-26Z" />
      <path d="M36 44c4-10 13-16 24-16s20 6 24 16" />
      <path d="M50 77v13M70 77v13" />
      <path d="M14 138c3-24 22-41 46-41s43 17 46 41" />
      <path d="M60 97v41" opacity=".5" />
    </g>
    <g stroke="var(--green-deep)" strokeWidth="1" opacity=".28" strokeLinecap="round">
      <path d="M22 134l14-30M30 138l16-34M38 140l14-30" />
      <path d="M84 133l-12-28M92 136l-14-30" />
    </g>
  </svg>;
}
function PresenterPanel({ presenter = "medicine", role = "职业体验导师", context = "", onTranscript, onConnectionChange }: Props) {
  const gatewayPath = `/api/avatar/session?presenter=${presenter}`;
  const containerId = `avatar-${useId().replace(/:/g, "")}`;
  const agent = useRef<Agent | null>(null);
  const alive = useRef(true);
  const generation = useRef(0);
  const connectionLock = useRef(false);
  const request = useRef<AbortController | null>(null);
  const transcriptCallback = useRef(onTranscript);
  const connectionCallback = useRef(onConnectionChange);
  const reply = useRef("");
  const replyPending = useRef(false);
  const microphoneLock = useRef(false);
  const sentContext = useRef("");
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [conversation, setConversation] = useState<{ speaker: "user" | "assistant"; text: string }[]>([]);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [microphoneBusy, setMicrophoneBusy] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [wasLinked, setWasLinked] = useState(false);
  const connected = state === "running" || state === "ready";

  const linkState: MentorLinkState = connected ? "connected" : busy || state === "connecting" || state === "reconnecting" ? "connecting" : wasLinked ? "closed" : "idle";

  useEffect(() => { transcriptCallback.current = onTranscript; }, [onTranscript]);
  useEffect(() => { connectionCallback.current = onConnectionChange; }, [onConnectionChange]);
  useEffect(() => { connectionCallback.current?.(linkState); }, [linkState]);
  useEffect(() => {
    const runs = generation;
    const activeRequest = request;
    const currentAgent = agent;
    alive.current = true;
    return () => {
      alive.current = false;
      runs.current++;
      activeRequest.current?.abort();
      const current = currentAgent.current;
      currentAgent.current = null;
      void current?.destroy("page_exit").catch(() => {});
    };
  }, []);

  // 任务更新走普通消息，不是 system 指令；等待回复时只保留最新任务。
  useEffect(() => {
    if (!connected || busy || sending || listening || !context.trim()) return;
    const key = JSON.stringify([role, context]);
    const timer = setTimeout(() => {
      const current = agent.current;
      const run = generation.current;
      if (!current || key === sentContext.current || replyPending.current) return;
      const opening = !sentContext.current;
      sentContext.current = key;
      reply.current = "";
      replyPending.current = true;
      setSending(true);
      setMessage("正在把当前任务同步给导师…");
      void current.ask(avatarDialogue(role, context, { kind: opening ? "opening" : "task" })).then(() => {
        if (alive.current && run === generation.current && replyPending.current) setMessage("任务已同步，等导师回应。");
      }).catch(() => {
        if (alive.current && run === generation.current) {
          replyPending.current = false;
          setSending(false);
          setMessage("任务没同步成功，你可以直接提问。");
        }
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [busy, connected, context, listening, role, sending]);

  async function stop() {
    const run = ++generation.current;
    connectionLock.current = true;
    request.current?.abort();
    request.current = null;
    const current = agent.current;
    agent.current = null;
    replyPending.current = false;
    sentContext.current = "";
    setListening(false);
    setMicrophoneBusy(false);
    microphoneLock.current = false;
    setSending(false);
    setBusy(true);
    setState("stopping");
    setMessage("正在断开连接…");
    try {
      await current?.destroy("user");
      if (alive.current && run === generation.current) setMessage("已断开。再接通会重新同步当前任务。");
    } catch {
      if (alive.current && run === generation.current) setMessage("本地会话已断开，远端连接还在释放。");
    } finally {
      connectionLock.current = false;
      if (alive.current && run === generation.current) { setBusy(false); setState("idle"); setCaption(""); setHasSession(false); }
    }
  }

  async function start() {
    if (connectionLock.current || agent.current) return;
    connectionLock.current = true;
    const run = ++generation.current;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setState("connecting");
    setCaption("");
    setConversation([]);
    sentContext.current = "";
    setMessage("正在接通导师，首次接通要加载数字人资源，大约十几秒。");
    let current: Agent | null = null;
    try {
      const login = await fetch("/api/session", { method: "POST", signal: controller.signal });
      if (!login.ok) throw new Error("LOGIN");
      const config = await fetch(gatewayPath, { signal: controller.signal });
      const availability = await config.json();
      if (!config.ok) throw new Error("CONFIG");
      if (availability.active_session) {
        const cleanup = await fetch(gatewayPath, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...availability.active_session, stop_reason: "reconnect" }), signal: controller.signal });
        if (!cleanup.ok) throw new Error("CLEANUP");
      }
      if (!availability.configured) throw new Error("CONFIG");
      await loadSDK();
      if (!alive.current || run !== generation.current) return;
      const container = document.getElementById(containerId);
      if (!container) throw new Error("CONTAINER");
      const Constructor = window.XingyunAvatarAgent!;
      const isCurrent = () => alive.current && run === generation.current;
      const finishReply = () => { replyPending.current = false; setSending(false); };
      current = new Constructor({
        container, appId: "limen-proxy", appSecret: "", gatewayServer: `${window.location.origin}${gatewayPath}`,
        enableLogger: false, enableDebugger: false,
        onMessage: () => {},
        agentCallbacks: {
          onAgentStateChange: (next: string) => {
            if (!isCurrent()) return;
            setState(next);
            if (next === "reconnecting") setMessage("连接断了，正在自动重连…");
            if (next === "failed") { finishReply(); setMessage("连接断了，请断开后重新接通。"); }
          },
          onASRResult: (result: { text: string; isFinal: boolean }) => {
            if (isCurrent() && result.isFinal && result.text) {
              setCaption(result.text);
              setConversation(previous => [...previous.slice(-59), { speaker: "user", text: result.text }]);
              transcriptCallback.current?.({ speaker: "user", text: result.text });
            }
          },
          onASRStateChange: (next: string) => { if (isCurrent()) { setListening(next === "listening"); if (next === "failed") setMessage("麦克风没打开，可以改用文字。"); } },
          onConversationChange: (event: { state: string }) => {
            if (!isCurrent()) return;
            if (event.state === "asking") { reply.current = ""; replyPending.current = true; setSending(true); setMessage("等导师回复…"); }
            if (event.state === "failed") { finishReply(); setMessage("导师没有回复，可以再发一次。"); }
            if (event.state === "interrupted") { finishReply(); setMessage("已打断，可以继续问。"); }
          },
          onLLMResponse: (event: { event: string; text?: string; isFirst?: boolean }) => {
            if (!isCurrent()) return;
            if (event.isFirst) reply.current = "";
            if (event.text) reply.current += event.text;
            if (reply.current) setCaption(reply.current);
            if (event.event === "done") {
              const answer = reply.current;
              if (answer) { setConversation(previous => [...previous.slice(-59), { speaker: "assistant", text: answer }]); transcriptCallback.current?.({ speaker: "assistant", text: answer }); }
              setCaption("");
              reply.current = "";
              finishReply();
              setMessage(answer ? "导师已回复。" : "导师这次只返回了语音，没给文字。");
            }
          },
          onError: (error: { domain?: string }) => {
            if (!isCurrent()) return;
            if (error.domain !== "permission") finishReply();
            setMessage(error.domain === "permission" ? "请允许使用麦克风，或者直接用文字。" : "连接出了点问题，可以断开后重试。");
          },
        },
      });
      agent.current = current;
      setHasSession(true);
      let initTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([current.init({ onDownloadProgress: () => {} }), new Promise<never>((_, reject) => { initTimer = setTimeout(() => reject(new Error("INIT_TIMEOUT")), 60000); })]);
      } finally { clearTimeout(initTimer); }
      if (!isCurrent()) { await current.destroy("cancelled"); return; }
      setState("ready");
      setWasLinked(true);
      setMessage("导师已接通。它会知道你在哪个任务、做到哪一步。");
    } catch (error) {
      if (current) await current.destroy("init_failed").catch(() => {});
      if (alive.current && run === generation.current) {
        agent.current = null;
        replyPending.current = false;
        setHasSession(false);
        setSending(false);
        setMessage(error instanceof Error && error.message === "CONFIG" ? "数字人暂时不可用，你可以先自己做完，再回来看。" : "没接通，稍后再试，或者先自己做完。");
        setState("idle");
      }
    } finally {
      if (run === generation.current) {
        connectionLock.current = false;
        request.current = null;
        if (alive.current) setBusy(false);
      }
    }
  }

  async function send() {
    const value = text.trim();
    const current = agent.current;
    const run = generation.current;
    if (!value || !current || !connected || busy || replyPending.current || listening) return;
    replyPending.current = true;
    reply.current = "";
    setSending(true);
    setMessage("正在发送…");
    try {
      await current.ask(avatarDialogue(role, context, { kind: "question", text: value }));
      if (!alive.current || run !== generation.current) return;
      transcriptCallback.current?.({ speaker: "user", text: value });
      setConversation(previous => [...previous.slice(-59), { speaker: "user", text: value }]);
      setText("");
      if (replyPending.current) setMessage("已发出，等导师回复…");
    } catch {
      if (alive.current && run === generation.current) { replyPending.current = false; setSending(false); setMessage("没发出去，稍后重试。"); }
    }
  }

  async function microphone() {
    const current = agent.current;
    const run = generation.current;
    if (!current || !connected || busy || microphoneLock.current || (replyPending.current && !listening)) return;
    microphoneLock.current = true;
    setMicrophoneBusy(true);
    try { if (listening) await current.stopASR(); else await current.startASR(); }
    catch { if (alive.current && run === generation.current) setMessage("麦克风用不了，检查一下授权，或者改用文字。"); }
    finally { if (alive.current && run === generation.current) { microphoneLock.current = false; setMicrophoneBusy(false); } }
  }

  function interrupt() {
    try {
      agent.current?.interrupt();
      replyPending.current = false;
      reply.current = "";
      setSending(false);
      setMessage("已打断，可以继续问。");
    } catch { setMessage("打断没成功，可以断开后重试。"); }
  }

  const active = connected || busy || state === "reconnecting";
  return <section className="atlas-sheet xd-mentor-panel" aria-label="导师数字人" data-link={linkState} data-motion="M-E08 M-E11">
    <div className="xd-mentor-head">
      <div>
        <h2>{role}</h2>
      </div>
      <span className="xd-link-state" data-state={linkState}>
        <span className="xd-link-dot" aria-hidden="true" />
        {linkLabels[linkState]}
      </span>
    </div>

    <div className="xd-avatar-stage" data-active={active}>
      <div id={containerId} className="xd-avatar-container" />
      {!active && <div className="xd-avatar-idle">
        <figure className="xd-portrait">
          <span className="xd-portrait-photo"><MentorPortrait /></span>
          <figcaption className="xd-portrait-cap">模拟形象 · simulation</figcaption>
        </figure>
        <p className="xd-avatar-ask">能问它：这个任务先看哪条材料、这个方向的日常在忙什么、你这样的取舍在项目里算不算常见。</p>
        <p className="xd-avatar-fact">接通后它只知道你在看哪个方向、做到哪一步；个人画像和你写下的理由不会自动发过去。</p>
      </div>}
      {busy && <div className="xd-avatar-busy">
        <i aria-hidden="true" />
        <span>{state === "stopping" ? "正在断开，释放远端会话" : "正在加载数字人，首次接通会慢一些"}</span>
      </div>}
    </div>

    {message && <p className="xd-mentor-status" role="status">{message}</p>}

    {(conversation.length > 0 || caption) && <div className="xd-conversation" aria-label="当前会话">
      <ol>
        {conversation.map((entry, i) => <li key={i} className="xd-message" data-speaker={entry.speaker}>
          <p>{entry.speaker === "user" ? "我" : "导师"}</p>
          <p>{entry.text}</p>
        </li>)}
      </ol>
      {caption && <p className="xd-caption" aria-live="polite">{caption}</p>}
    </div>}

    {!active && <div className="xd-mentor-actions">
      <button type="button" className="atlas-btn atlas-btn-primary" disabled={hasSession} onClick={() => void start()}>{wasLinked ? "重新接通" : "接通导师"}</button>
      {hasSession && <button type="button" className="atlas-btn" onClick={() => void stop()}>断开</button>}
    </div>}
    {active && <div className="xd-mentor-actions">
      <button type="button" className="atlas-btn" onClick={() => void stop()}>{busy ? "取消接通" : "断开"}</button>
    </div>}

    {connected && !busy && <>
      <div className="xd-inline-field">
        <label className="form-label" htmlFor={`${containerId}-ask`}>问导师一句</label>
        <input
          id={`${containerId}-ask`}
          className="field"
          value={text}
          maxLength={2000}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
          placeholder="比如：这个取舍在真实项目里常见吗？"
        />
      </div>
      <div className="xd-mentor-actions">
        <button type="button" className="atlas-btn" onClick={() => void send()} disabled={!text.trim() || sending || listening}>{sending ? "等回复…" : "发送"}</button>
        <button type="button" className="atlas-btn" disabled={microphoneBusy || (sending && !listening)} onClick={() => void microphone()}>{microphoneBusy ? "处理中…" : listening ? "停止录音" : "用麦克风说"}</button>
        <button type="button" className="atlas-btn" onClick={interrupt}>打断</button>
      </div>
    </>}
  </section>;
}
