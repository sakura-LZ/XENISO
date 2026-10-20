import Link from "next/link";
export default function NotFound() {
  return <main id="main" className="shell py-16"><h1 className="text-2xl font-semibold">未找到此页面</h1><Link href="/" className="button mt-6">返回 LIMEN 首页</Link></main>;
}
