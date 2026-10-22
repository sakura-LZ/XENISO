import { DirectionBrowser } from "./direction-browser";
export const metadata = { title: "信息文库 · XENISO 异域同构" };
export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ direction?: string }> }) {
  const { direction } = await searchParams;
  return <main id="main" className="shell xn-library-page py-10"><DirectionBrowser initialDirection={direction} /></main>;
}
