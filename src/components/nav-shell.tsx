"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const journey = [["/profile", "个人画像"], ["/assessment", "兴趣测评"], ["/report/initial", "初步画像"], ["/experience", "职业体验"], ["/report/plan", "行动规划"]] as const;
const resources = [["/explore", "方向手册"], ["/community", "交流社区"]] as const;
export function NavShell() {
  const pathname = usePathname();
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 760px)");
    const revealCurrentPage = () => {
      const nav = navigation.current;
      const selected = nav?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!mobile.matches || !nav || !selected) return;
      const item = selected.getBoundingClientRect();
      nav.scrollLeft += item.left - nav.getBoundingClientRect().left - (nav.clientWidth - item.width) / 2;
    };
    revealCurrentPage();
    mobile.addEventListener("change", revealCurrentPage);
    return () => mobile.removeEventListener("change", revealCurrentPage);
  }, [pathname]);
  return <nav ref={navigation} aria-label="主要导航" className="app-navigation">
    <div className="nav-section"><p className="nav-label">我的探索</p>{journey.map(([href, title], index) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><span className="nav-number" aria-hidden="true">0{index + 1}</span><span>{title}</span><span className="nav-marker" aria-hidden="true">›</span></Link>)}</div>
    <div className="nav-section"><p className="nav-label">探索资源</p>{resources.map(([href, title]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><span>{title}</span><span className="nav-marker" aria-hidden="true">↗</span></Link>)}</div>
    <Link href="/account" className="nav-account" aria-current={pathname === "/account" ? "page" : undefined}>隐私与资料管理</Link>
  </nav>;
}
