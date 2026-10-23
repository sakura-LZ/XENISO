"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const journey = [["/profile", "个人画像"], ["/report/initial", "初步评价"], ["/experience", "职业体验"], ["/report/plan", "行动规划"]] as const;
const destinations = [["/", "首页"], ["/profile", "异域探索"], ["/explore", "信息文库"], ["/community", "交流社区"]] as const;

function Header({ pathname, exploring }: { pathname: string; exploring: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 4);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  const current = (href: string) => href === "/profile" ? exploring : href === "/" ? pathname === "/" : pathname.startsWith(href);
  return <header className="site-header" data-scrolled={scrolled} data-motion="M-G01">
    <div className="site-header-inner container">
      <Link href="/" className="site-brand" aria-label="XENISO 异域同构首页"><Image src="/brand/xeniso-logo.webp" alt="XENISO 异域同构" width={1210} height={340} priority sizes="172px" /></Link>
      <nav id="primary-navigation" className="site-nav" data-open={open} aria-label="主导航">
        {destinations.map(([href, title]) => <Link href={href} key={href} onClick={() => setOpen(false)} aria-current={current(href) ? "page" : undefined}>{title}</Link>)}
      </nav>
      <div className="site-tools">
        <Link href="/account" className="site-account" aria-current={pathname.startsWith("/account") ? "page" : undefined}>我的资料</Link>
        <button ref={button} type="button" className="site-menu" aria-expanded={open} aria-controls="primary-navigation" aria-label={open ? "收起导航" : "展开导航"} onClick={() => setOpen(!open)}><span /><span /></button>
      </div>
    </div>
  </header>;
}

export function NavShell() {
  const pathname = usePathname();
  const current = pathname.startsWith("/profile") || pathname === "/assessment" ? "/profile" : pathname.startsWith("/experience") ? "/experience" : pathname;
  const exploring = journey.some(([href]) => href === current);
  return <>
    <Header key={pathname} pathname={pathname} exploring={exploring} />
    {exploring && <nav className="journey-bar" aria-label="探索进度"><ol className="container">{journey.map(([href, title], index) => <li key={href}><Link href={href} aria-current={current === href ? "step" : undefined}><span className="journey-index" aria-hidden="true">0{index + 1}</span>{title}</Link></li>)}</ol></nav>}
  </>;
}
