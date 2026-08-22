import { MasterTableView } from "@/components/views/MasterTableView";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CustomersPage({ searchParams }: PageProps) {
  const query = await searchParams;
  return <MasterTableView viewId="customers" searchParams={query} />;
}

