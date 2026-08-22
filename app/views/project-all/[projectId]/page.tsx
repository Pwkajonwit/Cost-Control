import { redirect } from "next/navigation";

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function LegacyProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = await params;
  redirect(`/work-status/${projectId}`);
}
