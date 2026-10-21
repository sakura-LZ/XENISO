import { PlanReport } from "./report";
export default async function Page({ searchParams }: { searchParams: Promise<{ direction?: string }> }) {
  const { direction } = await searchParams;
  return <PlanReport initialDirection={direction ?? ""} />;
}
