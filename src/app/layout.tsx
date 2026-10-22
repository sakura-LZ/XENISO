import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { XenisoMotion } from "@/components/xeniso-motion";
import { NavShell } from "@/components/nav-shell";
import "./globals.css";
import "./xeniso.css";
import "./xeniso-logo.css";

export const metadata: Metadata = { title: "XENISO 异域同构 · 医学生跨学科探索", description: "Different Fields. Shared Potential. 从医学经历出发，探索跨学科方向与职业实践。", icons: { icon: "/brand/xeniso-mark.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>
    <a href="#main" className="sr-only focus:not-sr-only">跳到主要内容</a>
    <NavShell />
    <XenisoMotion />
    <div className="xn-app-content">{children}</div>
    <footer className="xn-footer"><Link href="/" aria-label="XENISO 异域同构首页"><Image src="/brand/xeniso-logo.webp" alt="XENISO 异域同构" width={1210} height={340} className="xn-logo-img" sizes="(max-width: 760px) 190px, 240px" /></Link><p lang="en">Different Fields. Shared Potential.</p><Link href="/account">隐私与资料管理</Link></footer>
  </body></html>;
}
