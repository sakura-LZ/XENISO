import { DirectionBrowser, type LibraryParams } from "./direction-browser";
export const metadata = { title: "信息文库 · XENISO 异域同构" };
export default async function ExplorePage({ searchParams }: { searchParams: Promise<LibraryParams> }) {
  const params = await searchParams;
  return <main id="main" className="shell xn-library-page py-10"><DirectionBrowser initialParams={params} /></main>;
}
