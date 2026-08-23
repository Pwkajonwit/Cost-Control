import { TABLES } from "@/lib/config";
import { getRows } from "@/lib/db";
import { hydrateBillRows } from "@/lib/formulas";
import { DocumentsManagerClient } from "@/components/documents/DocumentsManagerClient";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const [rawBills, rawProjects, rawContractors, rawStores, rawContracts, rawCompanies] = await Promise.all([
    getRows(TABLES.DATA).catch(() => []),
    getRows(TABLES.PROJECT).catch(() => []),
    getRows(TABLES.CONTRACTOR).catch(() => []),
    getRows(TABLES.STORE).catch(() => []),
    getRows(TABLES.CONTRACT_WORK).catch(() => []),
    getRows(TABLES.COMPANY).catch(() => []),
  ]);

  const hydratedBills = await hydrateBillRows(rawBills, {
    projects: rawProjects,
    stores: rawStores,
    contracts: rawContracts,
    contractors: rawContractors,
  });

  // Sort latest bills first
  const sortedBills = [...hydratedBills].sort((a, b) => {
    const seqA = Number(a["ลำดับ"] || a._sheetRow || 0);
    const seqB = Number(b["ลำดับ"] || b._sheetRow || 0);
    return seqB - seqA;
  });

  return (
    <DocumentsManagerClient
      bills={sortedBills}
      projects={rawProjects}
      contractors={rawContractors}
      companies={rawCompanies}
    />
  );
}
