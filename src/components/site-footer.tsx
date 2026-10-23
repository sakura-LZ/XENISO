import Link from "next/link";
import Image from "next/image";

const groups = [
  { title: "异域探索", links: [["/profile", "个人画像"], ["/report/initial", "初步评价"], ["/experience", "职业体验"], ["/report/plan", "行动规划"]] },
  { title: "资料与交流", links: [["/explore", "信息文库"], ["/community", "交流社区"]] },
  { title: "账户", links: [["/account", "我的资料与删除"]] },
] as const;

export function SiteFooter() {
  return <footer className="site-footer" data-motion="M-G04">
    <div className="container site-footer-grid">
      <div className="site-footer-brand">
        <Link href="/" aria-label="XENISO 异域同构首页"><Image src="/brand/xeniso-logo.webp" alt="XENISO 异域同构" width={1210} height={340} sizes="200px" /></Link>
        <p lang="en">Different Fields. Shared Potential.</p>
      </div>
      {groups.map(group => <nav key={group.title} aria-label={group.title} className="site-footer-links">
        <p>{group.title}</p>
        <ul>{group.links.map(([href, title]) => <li key={href}><Link href={href}>{title}</Link></li>)}</ul>
      </nav>)}
    </div>
    <div className="container site-footer-credits">
      <p>职业兴趣题目与职业信息来自 <a href="https://services.onetcenter.org/" rel="noreferrer">O*NET Web Services</a>（USDOL/ETA）；O*NET® 为 USDOL/ETA 商标。方向映射为本站编辑整理，不是官方招生结论。</p>
      <p>部分插画来自 <a href="https://storyset.com/" rel="noreferrer">Storyset</a>（Pana 系列），按其许可署名使用。</p>
    </div>
  </footer>;
}
