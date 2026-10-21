"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [["/profile", "个人画像"], ["/assessment", "兴趣测评"], ["/report/initial", "初步画像"], ["/explore", "方向手册"], ["/studio/ecg", "职业体验"], ["/report/plan", "行动规划"]] as const;
export function NavShell() {
  const pathname = usePathname();
  return <nav aria-label="主要导航" className="app-navigation">{items.map(([href, title]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{title}</Link>)}</nav>;
}
