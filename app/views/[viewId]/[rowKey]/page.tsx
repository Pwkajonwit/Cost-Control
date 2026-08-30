import { MasterDetailView } from "@/components/views/MasterDetailView";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ viewId: string; rowKey: string }>;
};

export default async function GenericViewDetailPage({ params }: PageProps) {
  const { viewId, rowKey } = await params;
  return <MasterDetailView viewId={viewId} rowKey={rowKey} />;
}
