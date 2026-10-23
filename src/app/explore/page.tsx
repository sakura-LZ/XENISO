import { DirectionBrowser, type LibraryParams } from "./direction-browser";
import "./library-view.css";

export const metadata = { title: "信息文库 · XENISO 异域同构" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<LibraryParams> }) {
  const params = await searchParams;
  return <main id="main" className="shell xnlib-page"><DirectionBrowser initialParams={params} /></main>;
}
