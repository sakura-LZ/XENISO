import { CareerStudio } from "./studio";
export default async function ExperiencePage({ searchParams }: { searchParams: Promise<{ direction?: string }> }) {
  const params = await searchParams;
  return <CareerStudio initialDirection={params.direction ?? ""} />;
}
