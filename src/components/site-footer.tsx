import Link from "next/link";
import Image from "next/image";

const groups = [
  { title: "异域探索", links: [["/profile", "从个人画像开始"]] },
  { title: "资料与交流", links: [["/explore", "信息文库"], ["/community", "交流社区"]] },
  { title: "帮助与账户", links: [["/guide", "使用指南"], ["/account", "我的资料与删除"]] },
] as const;

export function SiteFooter() {
  return <footer className="site-footer" data-motion="M-G04">
    <div className="container site-footer-grid">
      <div className="site-footer-brand">
        <Link href="/" aria-label="XENISO 异域同构首页"><Image src="/brand/xeniso-logo.webp" alt="XENISO 异域同构" width={1210} height={340} sizes="200px" /></Link>
      </div>
      {groups.map(group => <nav key={group.title} aria-label={group.title} className="site-footer-links">
        <p>{group.title}</p>
        <ul>{group.links.map(([href, title]) => <li key={href}><Link href={href}>{title}</Link></li>)}</ul>
      </nav>)}
    </div>
  </footer>;
}
