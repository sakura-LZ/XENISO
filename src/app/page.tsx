import Link from "next/link";
import { groups } from "@/lib/directions";

export default function Home() {
  return <main id="main" className="shell py-14 md:py-20">
    <div className="grid gap-12 md:grid-cols-[1.5fr_1fr]">
      <section>
        <p className="eyebrow">从医学出发 · 看见更多可能</p>
        <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">先了解自己，<br />再决定下一步。</h1>
        <p className="mt-6 max-w-xl text-lg leading-8 muted">把兴趣、已有经历和真实工作任务放在一起，逐步了解跨学科方向，以及需要补齐的准备。</p>
        <div className="mt-7 flex flex-wrap gap-3"><Link href="/profile" className="button">我还在探索方向 →</Link><Link href="/explore" className="button secondary">我已有想了解的方向</Link></div>
        <p className="mt-5 text-sm leading-6 muted">公开手册与合成职业工作台可直接使用。个人资料云端保存、官方计分与正式 AI 报告仍待联调。</p>
      </section>
      <aside className="border-l border-slate-300 pl-7" aria-label="探索流程">
        <p className="eyebrow mb-6">一次探索如何进行</p>
        <ol className="space-y-7">
          {[['01', '个人画像与兴趣', '从自填医学经历和职业兴趣开始。'], ['02', '方向知识与任务体验', '了解研究活动，亲手完成一项小任务。'], ['03', '差距分析与行动计划', '结合目标与时间，整理可核验的准备路径。']].map(([step, title, detail]) => <li key={step}>
            <span className="text-xs font-semibold text-blue-700">{step}</span>
            <h2 className="mt-1 font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 muted">{detail}</p>
          </li>)}
        </ol>
      </aside>
    </div>
    <section className="mt-12 border-t pt-8"><div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-2xl font-semibold">先翻一翻方向手册</h2><Link href="/explore" className="text-sm">浏览与对比九个细分方向 →</Link></div><p className="mt-3 text-sm leading-7 muted">职业活动来自所列 O*NET 来源，研究方向与职业之间的关联由 LIMEN 编辑。</p><div className="mt-6 divide-y">{groups.map((group) => <div key={group.id} className="grid gap-4 py-5 md:grid-cols-[224px_1fr]"><h3 className="font-semibold">{group.name}</h3><div className="flex flex-wrap gap-x-7 gap-y-3">{group.specializations.map((direction) => <Link key={direction.id} href={`/explore?direction=${direction.id}`} className="text-sm">{direction.name} ↗</Link>)}</div></div>)}</div></section>
    <details className="mt-8 border-t pt-5 text-sm"><summary className="cursor-pointer">开发验证与数据来源状态</summary><p className="mt-3 leading-7">O*NET 真实接口最近一次验证返回 HTTP 403；问卷文档快照不能代替官方计分。Supabase 尚无可用连接，真实资料隔离验收未完成。<Link href="/setup">查看配置状态</Link>。</p></details>
  </main>;
}
