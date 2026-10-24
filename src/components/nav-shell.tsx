"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { IconBack, IconHome, IconCompass, IconBook, IconChat, IconAccount } from "@/components/icons";
import { JOURNEY_STEPS, isJourneyRoute } from "@/lib/journey";

/** 进度条的四步与动效层的判定共用一份清单（src/lib/journey.ts），不各写一遍 */
const journey = JOURNEY_STEPS;
const destinations = [
  ["/", "首页", IconHome],
  ["/profile", "异域探索", IconCompass],
  ["/explore", "信息文库", IconBook],
  ["/community", "交流社区", IconChat],
] as const;

function Header({ pathname, exploring }: { pathname: string; exploring: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  // 固定的上一级入口在刷新和直接打开内页时也可用，不依赖 document.referrer。
  const parent = pathname.startsWith("/profile/") || pathname === "/assessment"
    ? { href: "/profile", label: "返回个人画像" }
    : pathname.startsWith("/experience/")
      ? { href: "/experience", label: "返回职业体验" }
      : { href: "/", label: "返回首页" };
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
      {pathname !== "/" && <Link className="site-back" href={parent.href} aria-label={parent.label}><IconBack className="site-back-icon" /><span className="site-back-label">{parent.label}</span></Link>}
      <Link href="/" className="site-brand" aria-label="XENISO 异域同构首页"><Image src="/brand/xeniso-logo.webp" alt="XENISO 异域同构" width={1210} height={340} priority sizes="172px" /></Link>
      <nav id="primary-navigation" className="site-nav" data-open={open} aria-label="主导航">
        {destinations.map(([href, title, Icon]) => (
          <Link href={href} key={href} onClick={() => setOpen(false)} aria-current={current(href) ? "page" : undefined}>
            <Icon className="site-nav-icon" />
            <span>{title}</span>
          </Link>
        ))}
        <Link href="/guide" className="site-guide-mobile" onClick={() => setOpen(false)} aria-current={pathname === "/guide" ? "page" : undefined}>使用指南</Link>
      </nav>
      <div className="site-tools">
        <Link href="/guide" className="site-help" aria-label="使用指南" title="使用指南" aria-current={pathname === "/guide" ? "page" : undefined}><span aria-hidden="true">?</span><span className="site-help-label">使用指南</span></Link>
        <Link href="/account" className="site-account" aria-current={pathname.startsWith("/account") ? "page" : undefined}>
          <IconAccount className="site-account-icon" />
          <span>我的资料</span>
        </Link>
        <button ref={button} type="button" className="site-menu" aria-expanded={open} aria-controls="primary-navigation" aria-label={open ? "收起导航" : "展开导航"} onClick={() => setOpen(!open)}><span /><span /></button>
      </div>
    </div>
  </header>;
}

export function NavShell() {
  const pathname = usePathname();
  const current = pathname.startsWith("/profile") ? "/profile" : pathname === "/assessment" ? "/report/initial" : pathname.startsWith("/experience") ? "/experience" : pathname;
  const exploring = isJourneyRoute(pathname);
  return <>
    <Header key={pathname} pathname={pathname} exploring={exploring} />
    {exploring && <nav className="journey-bar" aria-label="探索进度"><ol className="container">{journey.map(([href, title], index) => <li key={href}><Link href={href} aria-current={current === href ? "step" : undefined}><span className="journey-index" aria-hidden="true">0{index + 1}</span>{title}</Link></li>)}</ol></nav>}
  </>;
}
