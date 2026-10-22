import Link from "next/link";
import { ProfileForm } from "../profile-form";
export const metadata = { title: "基本情况 · XENISO 异域同构" };
export default function BasicsPage() {
  return <main id="main" className="xn-basics-page"><Link href="/profile" className="xn-back-link">返回个人画像</Link><ProfileForm /></main>;
}
