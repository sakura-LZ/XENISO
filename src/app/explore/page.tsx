import { DirectionBrowser } from "./direction-browser";
export const metadata = { title: "跨学科方向手册 · LIMEN" };
export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ direction?: string }> }) {
  const { direction } = await searchParams;
  return <main id="main" className="shell py-10"><DirectionBrowser initialDirection={direction} /></main>;
}
