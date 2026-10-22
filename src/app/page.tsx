import Link from "next/link";
import { groups } from "@/lib/directions";

const journey = [
  { step: "01", title: "认识自己", detail: "整理医学经历，了解职业兴趣。", href: "/profile", label: "建立个人画像" },
  { step: "02", title: "亲自体验", detail: "带着问题，做一次具体的职业任务。", href: "/experience", label: "尝试职业体验" },
  { step: "03", title: "安排下一步", detail: "结合目标与时间，形成行动规划。", href: "/report/plan", label: "查看行动规划" },
];
export default function Home() {
  return <main id="main" className="shell home-page">
    <section className="home-hero">
      <div className="home-copy"><p className="eyebrow">医学生的跨学科探索起点</p><h1>医学之外，<br />也有你的<span>下一步。</span></h1><p className="home-description">从你的兴趣和已有经历出发，了解不同方向的真实工作，再用一次实践，找到值得继续探索的可能。</p><div className="home-actions"><Link href="/profile" className="button">开始我的探索 <span aria-hidden="true">→</span></Link><Link href="/explore" className="text-action">先看看有哪些方向 ↗</Link></div><p className="home-footnote">个人画像 · 兴趣测评 · 职业体验 · 行动规划</p></div>
      <aside className="home-preview" aria-label="职业体验预览"><div className="preview-topline"><span className="eyebrow">职业体验 / 01</span><span className="simulation-tag">simulation</span></div><div className="preview-role"><span className="role-initial" aria-hidden="true">医 × AI</span><p>从临床问题，走向产品方案</p><h2>医学 AI<br />产品经理</h2></div><div className="preview-brief"><p className="eyebrow">本次任务</p><p>医院希望改善门诊分诊。<br />如果由你负责，第一步会做什么？</p></div><div className="preview-path"><span>理解需求</span><i aria-hidden="true">→</i><span>功能取舍</span><i aria-hidden="true">→</i><span>交付方案</span></div><Link href="/experience" className="preview-link">进入这个场景 <span aria-hidden="true">↗</span></Link></aside>
    </section>
    <section className="journey-section" aria-labelledby="journey-title"><div className="section-heading"><div><p className="eyebrow">一步一步，找到方向</p><h2 id="journey-title">把想法变成一次探索</h2></div><p>从了解自己，到留下一个具体成果。</p></div><ol className="journey-grid">{journey.map(item => <li key={item.step}><span className="journey-number">{item.step}</span><h3>{item.title}</h3><p>{item.detail}</p><Link href={item.href}>{item.label} <span aria-hidden="true">→</span></Link></li>)}</ol></section>
    <section className="handbook-preview" aria-labelledby="directions-title"><div className="section-heading"><div><p className="eyebrow">方向手册</p><h2 id="directions-title">看看医学能与什么相遇</h2></div><Link href="/explore" className="text-action">浏览全部方向 ↗</Link></div><div className="direction-index">{groups.map((group, i) => <div key={group.id} className="direction-index-row"><span className="direction-index-number">0{i + 1}</span><h3>{group.name}</h3><div>{group.specializations.map(direction => <Link key={direction.id} href={`/explore?direction=${direction.id}`}>{direction.name}<span aria-hidden="true">↗</span></Link>)}</div></div>)}</div></section>
  </main>;
}
