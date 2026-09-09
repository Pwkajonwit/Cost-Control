import { notFound } from "next/navigation";
import { getMultipleBillsDocumentData } from "@/lib/bill-document";
import { BatchBillDocumentPrintClient } from "@/components/documents/BatchBillDocumentPrintClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PrintPageProps = {
  searchParams: Promise<{
    ids?: string;
    mode?: "all" | "contract" | "voucher" | "tax50twi";
  }>;
};

export default async function DocumentsPrintPage({ searchParams }: PrintPageProps) {
  const { ids, mode = "all" } = await searchParams;

  if (!ids) {
    notFound();
  }

  const billIdList = ids
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (billIdList.length === 0) {
    notFound();
  }

  const documents = await getMultipleBillsDocumentData(billIdList);

  if (documents.length === 0) {
    notFound();
  }

  return (
    <BatchBillDocumentPrintClient
      documents={documents}
      initialMode={mode}
    />
  );
}
