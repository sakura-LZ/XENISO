import type { Metadata } from "next";
import Link from "next/link";
import { NavShell } from "@/components/nav-shell";
import "./globals.css";

export const metadata: Metadata = { title: "LIMEN 临界 · 医学生跨学科探索", description: "从医学经历出发，探索跨学科方向与转型准备路径。" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>
    <a href="#main" className="sr-only focus:not-sr-only">跳到主要内容</a>
    <header className="masthead"><div className="shell flex min-h-20 flex-wrap items-center justify-between gap-3 py-4">
      <Link href="/" className="brand">LIMEN <span className="text-base font-normal tracking-normal">临界</span></Link>
      <span className="text-sm muted">医学生跨学科探索与转型决策平台</span>
    </div></header>
    <div className="app-frame"><NavShell /><div className="app-content">{children}</div></div>
    <footer className="shell mt-16 py-8 text-sm muted rule"><p>LIMEN 提供探索与准备依据，不预测录取概率，不承诺报考资格。</p><Link href="/account" className="mt-3 inline-block">访客隐私与删除</Link></footer>
  </body></html>;
}
