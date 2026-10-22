"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
const paths = [
  { title: "个人画像", href: "/profile", image: "xeniso-opus-profile.webp" },
  { title: "初步评价", href: "/report/initial", image: "xeniso-opus-evaluation.webp" },
  { title: "职业体验", href: "/experience", image: "xeniso-opus-experience.webp" },
  { title: "行动规划", href: "/report/plan", image: "xeniso-opus-planning.webp" },
];
const samples = ["我有八年临床医学积累，想看看能与哪些新方向相连？", "做了五年财务分析，想转向产品或数据方向，该从哪里开始？"];
const motion = (): ScrollBehavior => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
export function HomeExperience() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [sampleIndex, setSampleIndex] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const offsetOf = (el: HTMLDivElement, i: number) => { const first = el.children[0] as HTMLElement | undefined; const card = el.children[i] as HTMLElement | undefined; return card && first ? card.offsetLeft - first.offsetLeft : 0; };
  const go = (i: number) => { const el = rail.current; if (!el) return; const n = Math.max(0, Math.min(paths.length - 1, i)); el.scrollTo({ left: offsetOf(el, n), behavior: motion() }); setActive(n); };
  const nearest = (el: HTMLDivElement) => { let best = 0, dist = Infinity; for (let i = 0; i < paths.length; i++) { const d = Math.abs(offsetOf(el, i) - el.scrollLeft); if (d < dist) { dist = d; best = i; } } if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) best = paths.length - 1; return best; };
  const onScroll = () => { const el = rail.current; if (!el) return; setActive(nearest(el)); };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => { const map: Record<string, number> = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: paths.length - 1 }; if (e.key in map) { e.preventDefault(); go(map[e.key]); } };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => { if (e.pointerType !== "mouse" || e.button !== 0 || !rail.current) return; drag.current = { x: e.clientX, left: rail.current.scrollLeft, moved: false }; };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => { const d = drag.current; if (!d || !rail.current) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 5 && !d.moved) { d.moved = true; rail.current.setPointerCapture(e.pointerId); } if (d.moved) rail.current.scrollLeft = d.left - dx; };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => { const d = drag.current; const el = rail.current; drag.current = null; if (el && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId); if (d?.moved && el) { suppressClick.current = true; setTimeout(() => { suppressClick.current = false; }, 0); go(nearest(el)); } };
  const onPointerLeave = () => { if (drag.current && !drag.current.moved) drag.current = null; };
  return <main id="main" className="xn-home">
    <section className="xn-hero" aria-labelledby="hero-title">
      <Image src="/brand/limen-bridge-stylized-v6.webp" alt="两片青绿山谷之间连接的岩桥" fill priority sizes="100vw" className="xn-hero-background" />
      <div className="xn-hero-content"><h1 id="hero-title">下一站，是你。</h1><p className="xn-slogan" lang="en">Different Fields. Shared Potential.</p>
        <form className="xn-composer" onSubmit={event => { event.preventDefault(); if (question.trim()) { try { sessionStorage.setItem('xeniso:exploration-question',question.trim()); } catch {} } router.push("/profile"); }}>
          <label className="sr-only" htmlFor="exploration-question">你想探索的问题</label><textarea id="exploration-question" value={question} onChange={event => setQuestion(event.target.value)} maxLength={1000} placeholder="医学积累，能与哪些新方向相连？" rows={3} />
          <div><button type="button" onClick={() => { setQuestion(samples[sampleIndex]); setSampleIndex((sampleIndex + 1) % samples.length); }}>换个示例</button><button className="xn-start-button" type="submit" aria-label="开始探索" title="开始探索"><svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button></div>
        </form>
      </div>
    </section>
    <section className="xn-home-section" aria-labelledby="home-paths"><header><h2 id="home-paths">你的探索路径</h2><div className="xn-scroll-controls"><span aria-live="polite">{String(active + 1).padStart(2, "0")} / {String(paths.length).padStart(2, "0")}</span><button type="button" aria-label="向前浏览探索路径" disabled={active === 0} onClick={() => go(active - 1)}>←</button><button type="button" aria-label="向后浏览探索路径" disabled={active === paths.length - 1} onClick={() => go(active + 1)}>→</button></div></header>
      <div className="xn-path-rail" ref={rail} tabIndex={0} role="region" aria-roledescription="carousel" aria-label="横向浏览四步探索路径" onScroll={onScroll} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={onPointerLeave} onClickCapture={e => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); } }}>{paths.map((path,index) => <Link className="xn-path-card" href={path.href} key={path.href} draggable={false} aria-label={`${String(index+1).padStart(2,"0")} ${path.title}`}><Image src={`/previews/assets/${path.image}`} alt="" width={1200} height={800} draggable={false} sizes="(max-width:700px) 86vw, 640px" /><div><span>{String(index+1).padStart(2,"0")}</span><h3>{path.title}</h3></div></Link>)}</div>
    </section>
  </main>;
}
