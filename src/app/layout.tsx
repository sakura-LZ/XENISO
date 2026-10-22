import type { Metadata } from "next";
import Link from "next/link";
import { NavShell } from "@/components/nav-shell";
import "./globals.css";

export const metadata: Metadata = { title: "LIMEN 临界 · 医学生跨学科探索", description: "从医学经历出发，探索跨学科方向与转型准备路径。" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>
    <a href="#main" className="sr-only focus:not-sr-only">跳到主要内容</a>
    <header className="masthead"><div className="shell masthead-inner">
      <Link href="/" className="brand"><span className="brand-symbol" aria-hidden="true">L<span>·</span></span><span>LIMEN <small>临界</small></span></Link>
      <span className="masthead-caption">从医学出发，探索下一种可能</span><Link href="/explore" className="masthead-link">浏览方向 <span aria-hidden="true">↗</span></Link>
    </div></header>
    <div className="app-frame"><NavShell /><div className="app-content">{children}</div></div>
    <footer className="site-footer shell"><p>LIMEN 临界 <span>医学生跨学科探索</span></p><Link href="/account">隐私与资料管理 ↗</Link></footer>
  </body></html>;
}
