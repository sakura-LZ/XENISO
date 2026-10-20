import Link from "next/link";

export default function Home() {
  return <main id="main" className="shell py-14 md:py-20">
    <div className="grid gap-12 md:grid-cols-[1.5fr_1fr]">
      <section>
        <p className="eyebrow">从医学出发 · 看见更多可能</p>
        <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">先了解自己，<br />再决定下一步。</h1>
        <p className="mt-6 max-w-xl text-lg leading-8 muted">把兴趣、已有经历和真实工作任务放在一起，逐步了解跨学科方向，以及需要补齐的准备。</p>
        <p className="notice mt-8 leading-7">当前为 P0 技术验证版本。正式测评、报告与职业体验尚未开放，页面不生成模拟评估结论。</p>
        <Link href="/setup" className="button mt-6">查看技术验证状态 <span aria-hidden="true">→</span></Link>
      </section>
      <aside className="border-l border-slate-300 pl-7" aria-label="平台计划体验流程">
        <p className="eyebrow mb-6">规划中的探索路径</p>
        <ol className="space-y-7">
          {[['01', '个人画像与兴趣', '从自填医学经历和职业兴趣开始。'], ['02', '方向知识与任务体验', '了解研究活动，亲手完成一项小任务。'], ['03', '差距分析与行动计划', '结合目标与时间，整理可核验的准备路径。']].map(([step, title, detail]) => <li key={step}>
            <span className="text-xs font-semibold text-blue-700">{step} · 尚未开放</span>
            <h2 className="mt-1 font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 muted">{detail}</p>
          </li>)}
        </ol>
      </aside>
    </div>
  </main>;
}
