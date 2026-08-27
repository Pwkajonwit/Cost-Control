import { MasterDetailView } from "@/components/views/MasterDetailView";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ rowKey: string }>;
};

export default async function LoansDetailPage({ params }: PageProps) {
  const { rowKey } = await params;
  return <MasterDetailView viewId="loans" rowKey={rowKey} />;
}
