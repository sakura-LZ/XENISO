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
type Props = { presenter?: AvatarPresenter; role?: string; context?: string; onTranscript?: (entry: { speaker: "user" | "assistant"; text: string }) => void };
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
function PresenterPanel({ presenter = "medicine", role = "职业体验导师", context = "", onTranscript }: Props) {
  const gatewayPath = `/api/avatar/session?presenter=${presenter}`;
  const containerId = `avatar-${useId().replace(/:/g, "")}`;
  const agent = useRef<Agent | null>(null);
  const alive = useRef(true);
  const generation = useRef(0);
  const connectionLock = useRef(false);
  const request = useRef<AbortController | null>(null);
  const transcriptCallback = useRef(onTranscript);
  const reply = useRef("");
  const replyPending = useRef(false);
  const microphoneLock = useRef(false);
  const sentContext = useRef("");
  const [state, setState] = useState("idle");
  const [message, setMessage] = useState("");
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [microphoneBusy, setMicrophoneBusy] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const connected = state === "running" || state === "ready";

  useEffect(() => { transcriptCallback.current = onTranscript; }, [onTranscript]);
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

  // Task updates are ordinary SDK messages, not system-role setters.
  // A pending reply holds the latest task; intermediate task changes are skipped.
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
      setMessage("正在同步当前任务…");
      void current.ask(avatarDialogue(role, context, { kind: opening ? "opening" : "task" })).then(() => {
        if (alive.current && run === generation.current && replyPending.current) setMessage("任务已同步，等待导师回复…");
      }).catch(() => {
        if (alive.current && run === generation.current) {
          replyPending.current = false;
          setSending(false);
          setMessage("任务同步未完成，你可以直接向导师提问。");
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
    setMessage("正在结束会话…");
    try {
      await current?.destroy("user");
      if (alive.current && run === generation.current) setMessage("会话已结束。");
    } catch {
      if (alive.current && run === generation.current) setMessage("本地会话已结束，远端连接正在释放。");
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
    sentContext.current = "";
    setMessage("正在连接职业导师…");
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
            if (next === "reconnecting") setMessage("连接中断，正在重新连接…");
            if (next === "failed") { finishReply(); setMessage("连接中断，请结束会话后重新连接。"); }
          },
          onASRResult: (result: { text: string; isFinal: boolean }) => {
            if (isCurrent() && result.isFinal && result.text) {
              setCaption(result.text);
              transcriptCallback.current?.({ speaker: "user", text: result.text });
            }
          },
          onASRStateChange: (next: string) => { if (isCurrent()) { setListening(next === "listening"); if (next === "failed") setMessage("麦克风未开启，可改用文字。"); } },
          onConversationChange: (event: { state: string }) => {
            if (!isCurrent()) return;
            if (event.state === "asking") { reply.current = ""; replyPending.current = true; setSending(true); setMessage("等待导师回复…"); }
            if (event.state === "failed") { finishReply(); setMessage("导师暂未回复，请重试。"); }
            if (event.state === "interrupted") { finishReply(); setMessage("已打断，可以继续提问。"); }
          },
          onLLMResponse: (event: { event: string; text?: string; isFirst?: boolean }) => {
            if (!isCurrent()) return;
            if (event.isFirst) reply.current = "";
            if (event.text) reply.current += event.text;
            if (reply.current) setCaption(reply.current);
            if (event.event === "done") {
              const answer = reply.current;
              if (answer) transcriptCallback.current?.({ speaker: "assistant", text: answer });
              reply.current = "";
              finishReply();
              setMessage(answer ? "导师已回复。" : "导师未返回文字，可重新提问。");
            }
          },
          onError: (error: { domain?: string }) => {
            if (!isCurrent()) return;
            if (error.domain !== "permission") finishReply();
            setMessage(error.domain === "permission" ? "请允许麦克风访问，或使用文字交流。" : "连接暂时遇到问题，可结束后重新连接。");
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
      setMessage("导师已连接，可以开始交流。");
    } catch (error) {
      if (current) await current.destroy("init_failed").catch(() => {});
      if (alive.current && run === generation.current) {
        agent.current = null;
        replyPending.current = false;
        setHasSession(false);
        setSending(false);
        setMessage(error instanceof Error && error.message === "CONFIG" ? "数字人暂未开放，请稍后再试。" : "连接未完成，请稍后重试。");
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
      setText("");
      if (replyPending.current) setMessage("消息已发送，等待导师回复…");
    } catch {
      if (alive.current && run === generation.current) { replyPending.current = false; setSending(false); setMessage("发送失败，请稍后重试。"); }
    }
  }

  async function microphone() {
    const current = agent.current;
    const run = generation.current;
    if (!current || !connected || busy || microphoneLock.current || (replyPending.current && !listening)) return;
    microphoneLock.current = true;
    setMicrophoneBusy(true);
    try { if (listening) await current.stopASR(); else await current.startASR(); }
    catch { if (alive.current && run === generation.current) setMessage("无法使用麦克风，请检查授权或改用文字。"); }
    finally { if (alive.current && run === generation.current) { microphoneLock.current = false; setMicrophoneBusy(false); } }
  }

  function interrupt() {
    try {
      agent.current?.interrupt();
      replyPending.current = false;
      reply.current = "";
      setSending(false);
      setMessage("已打断，可以继续提问。");
    } catch { setMessage("打断未完成，请结束会话后重试。"); }
  }

  const active = connected || busy || state === "reconnecting";
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5" aria-label="数字人职业导师">
    <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">职业对话</p><h2 className="mt-1 text-lg font-semibold text-slate-900">{role}</h2></div><span className={`mt-1 inline-flex items-center gap-1.5 text-xs ${connected ? "text-emerald-700" : busy ? "text-blue-700" : "text-slate-500"}`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-600" : busy ? "bg-blue-600" : "bg-slate-400"}`} />{connected ? "已连接" : busy ? state === "stopping" ? "结束中" : "连接中" : state === "reconnecting" ? "重连中" : "未连接"}</span></div>
    <div className={`relative overflow-hidden rounded-lg ${active ? "h-72 bg-slate-50" : "border-y border-slate-100 py-6"}`}>
      <div id={containerId} className={active ? "h-full w-full" : "h-0"} />
      {!active && <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 11a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-2v-6h4M4 12h4v6H6a2 2 0 0 1-2-2v-4Zm12 8h-4" /><circle cx="11" cy="20" r="1" /></svg></div><div><p className="font-medium text-slate-800">和导师聊聊当前任务</p><p className="mt-2 text-sm leading-6 text-slate-500">用文字或语音梳理想法，练习面试与项目表达。</p><p className="mt-1 text-xs leading-6 text-slate-500">连接后同步当前任务，个人画像不会自动发送。</p></div></div>}
      {busy && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50"><span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 motion-reduce:animate-none" aria-hidden="true" /><span className="text-sm text-slate-600">{state === "stopping" ? "正在释放会话" : "准备连接职业导师"}</span></div>}
    </div>
    {message && <p className="text-sm leading-6 text-slate-600" role="status">{message}</p>}
    {caption && <div className="max-h-44 overflow-auto rounded-lg border-l-2 border-blue-200 bg-slate-50 p-3"><p className="mb-1 text-xs text-slate-500">对话字幕</p><p className="whitespace-pre-wrap text-sm leading-6 text-slate-800" aria-live="polite">{caption}</p></div>}
    {!active && <div className="flex flex-wrap gap-3"><button type="button" className="button" disabled={hasSession} onClick={() => void start()}>连接导师</button>{hasSession && <button type="button" className="button secondary" onClick={() => void stop()}>结束会话</button>}</div>}
    {connected && !busy && <>
      <div className="flex gap-2"><input aria-label="向导师发送消息" className="field min-w-0 flex-1" value={text} maxLength={2000} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }} placeholder="想问导师什么？" /><button type="button" onClick={() => void send()} disabled={!text.trim() || sending || listening} className="button shrink-0">{sending ? "等待回复…" : "发送"}</button></div>
      <div className="flex flex-wrap gap-2"><button type="button" className="button secondary" disabled={microphoneBusy || (sending && !listening)} onClick={() => void microphone()}>{microphoneBusy ? "处理中…" : listening ? "停止录音" : "使用麦克风"}</button><button type="button" className="button secondary" onClick={interrupt}>打断回复</button><button type="button" className="button secondary" onClick={() => void stop()}>结束会话</button></div>
    </>}
    {active && (!connected || busy) && state !== "stopping" && <button type="button" className="button secondary" onClick={() => void stop()}>{busy ? "取消连接" : "结束会话"}</button>}
  </section>;
}
