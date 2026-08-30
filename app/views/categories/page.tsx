import { MasterTableView } from "@/components/views/MasterTableView";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CategoriesPage({ searchParams }: PageProps) {
  const query = await searchParams;
  return <MasterTableView viewId="categories" searchParams={query} />;
}

