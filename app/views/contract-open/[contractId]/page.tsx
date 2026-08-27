import { redirect } from "next/navigation";

type ContractDetailPageProps = {
  params: Promise<{ contractId: string }>;
};

export default async function LegacyContractDetailPage({ params }: ContractDetailPageProps) {
  const { contractId } = await params;
  redirect(`/contract-open/${contractId}`);
}
