import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "LIMEN 临界 · 医学生跨学科探索", description: "从医学经历出发，探索跨学科方向与转型准备路径。" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>
    <a href="#main" className="sr-only focus:not-sr-only">跳到主要内容</a>
    <header className="masthead"><div className="shell flex min-h-20 flex-wrap items-center justify-between gap-3 py-4">
      <Link href="/" className="brand">LIMEN <span className="text-base font-normal tracking-normal">临界</span></Link>
      <span className="text-sm muted">医学生跨学科探索与转型决策平台</span>
    </div></header>
    <nav aria-label="主要导航" className="shell flex flex-wrap gap-x-6 gap-y-2 border-b border-slate-200 py-4 text-sm">
      <Link href="/profile">个人画像</Link><Link href="/assessment">兴趣测评</Link><Link href="/report/initial">初步画像</Link><Link href="/explore">方向手册</Link><Link href="/studio/ecg">职业体验</Link><Link href="/report/plan">行动规划</Link>
    </nav>{children}
    <footer className="shell mt-16 py-8 text-sm muted rule">LIMEN 提供探索与准备依据，不预测录取概率，不承诺报考资格。</footer>
  </body></html>;
}
