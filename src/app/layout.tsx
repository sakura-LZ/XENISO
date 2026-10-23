import type { Metadata } from "next";
import { XenisoMotion } from "@/components/xeniso-motion";
import { NavShell } from "@/components/nav-shell";
import { SiteFooter } from "@/components/site-footer";
import "./fonts.css";
import "./globals.css";
import "./chrome.css";
import "./home.css";
import "./profile.css";
import "./report.css";
import "./experience.css";
import "./library.css";
import "./community.css";

export const metadata: Metadata = { title: "XENISO 异域同构 · 医学生跨学科探索", description: "Different Fields. Shared Potential. 从医学经历出发，探索跨学科方向与职业实践。", icons: { icon: "/brand/xeniso-mark.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>
    <a href="#main" className="skip-link">跳到主要内容</a>
    <NavShell />
    <XenisoMotion />
    {children}
    <SiteFooter />
  </body></html>;
}
