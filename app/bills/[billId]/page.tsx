import { notFound } from "next/navigation";
import { BillDetailClient } from "@/components/dashboards/BillDetailClient";
import { TABLES } from "@/lib/config";
import { hydrateBillRows, hydrateContractRows, hydrateProjectRows } from "@/lib/formulas";
import { getBillDocumentData } from "@/lib/bill-document";
import { getRows } from "@/lib/db";
import type { SheetRow } from "@/lib/types";

export const dynamic = "force-dynamic";

type BillDetailPageProps = {
  params: Promise<{ billId: string }>;
};

export default async function BillDetailPage({ params }: BillDetailPageProps) {
  const { billId } = await params;
  const decodedBillId = decodeURIComponent(billId).trim();

  const [rawDataRows, rawProjectRows, rawContractRows, peopleRows, storeRows, contractorRows, rawCompanyRows] = await Promise.all([
    getRows(TABLES.DATA).catch(() => []),
    getRows(TABLES.PROJECT).catch(() => []),
    getRows(TABLES.CONTRACT_WORK).catch(() => []),
    getRows(TABLES.PEOPLE).catch(() => []),
    getRows(TABLES.STORE).catch(() => []),
    getRows(TABLES.CONTRACTOR).catch(() => []),
    getRows(TABLES.COMPANY).catch(() => []),
  ]);

  const bill = rawDataRows.find((row) => billKey(row) === decodedBillId || String(row._sheetRow || "") === decodedBillId || String(row.id || "") === decodedBillId);
  if (!bill) notFound();

  const documentData = await getBillDocumentData(bill, {
    projects: rawProjectRows,
    companies: rawCompanyRows,
    contractors: contractorRows,
    bills: [bill],
  });

  const projectId = text(bill["ID Project"]);
  const contractId = text(bill["ผู้รับเหมา"]);
  const project = rawProjectRows.filter((row) => text(row["ID Project"] || row.id) === projectId);
  const contract = contractId ? rawContractRows.filter((row) => text(row.id_Conwork || row.id) === contractId) : [];

  // Resolve Requester Name & Link
  const rawRequester = text(bill["ผู้เบิก"]);
  const matchedPerson = rawRequester
    ? peopleRows.find((p) => {
        const code = text(p["รหัสพนักงาน"] || p.id).toLowerCase();
        const nickname = text(p["ชื่อเล่น"]).toLowerCase();
        const fullName = text(p["ชื่อ-นามสกุล"]).toLowerCase();
        const reqLower = rawRequester.toLowerCase();
        return code === reqLower || nickname === reqLower || fullName === reqLower;
      })
    : null;

  const personName = matchedPerson ? text(matchedPerson["ชื่อเล่น"] || matchedPerson["ชื่อ-นามสกุล"]) : "";
  const requesterDisplay = rawRequester
    ? personName && !rawRequester.toLowerCase().includes(personName.toLowerCase())
      ? `${rawRequester} - ${personName}`
      : rawRequester
    : "-";

  const requesterKey = matchedPerson
    ? text(matchedPerson["รหัสพนักงาน"] || matchedPerson["ชื่อเล่น"] || matchedPerson.id || rawRequester)
    : rawRequester;
  const requesterLink = rawRequester ? `/views/people/${encodeURIComponent(requesterKey)}` : "";

  // Resolve Vendor / Store / Contractor Name & Link
  const rawVendor = text(bill["ร้านค้า"] || bill["ผู้รับเหมา"] || bill["ร้านค้า/ผู้รับเหมา"] || bill["ร้าน/บุคคล"]);
  const matchedContractor = rawVendor
    ? contractorRows.find((c) => {
        const code = text(c["id_Contractor"] || c.id).toLowerCase();
        const nickname = text(c["ชื่อเล่น"]).toLowerCase();
        const fullName = text(c["ชื่อ-นามสกุล"]).toLowerCase();
        const vLower = rawVendor.toLowerCase();
        return code === vLower || nickname === vLower || fullName === vLower || vLower.includes(nickname);
      })
    : null;

  const matchedStore = !matchedContractor && rawVendor
    ? storeRows.find((s) => {
        const code = text(s["id_store"] || s.id).toLowerCase();
        const name = text(s["ชื่อร้านค้า"] || s["ชื่อเต็ม"]).toLowerCase();
        const vLower = rawVendor.toLowerCase();
        return code === vLower || name === vLower || vLower.includes(name);
      })
    : null;

  const vendorDisplay = rawVendor || "-";
  const contractorKey = matchedContractor
    ? text(matchedContractor["id_Contractor"] || matchedContractor["ชื่อเล่น"] || rawVendor)
    : rawVendor;
  const storeKey = matchedStore
    ? text(matchedStore["id_store"] || matchedStore["ชื่อร้านค้า"] || rawVendor)
    : rawVendor;

  const vendorLink = rawVendor
    ? matchedContractor
      ? `/views/contractors/${encodeURIComponent(contractorKey)}`
      : `/views/stores/${encodeURIComponent(storeKey)}`
    : "";

  // Resolve Creator Name & Link
  const rawCreatedBy = text(bill["ผู้สร้างบิล"] || bill["created_by"] || bill["ผู้บันทึก"]);
  const matchedCreator = rawCreatedBy
    ? peopleRows.find((p) => {
        const code = text(p["รหัสพนักงาน"] || p.id).toLowerCase();
        const nickname = text(p["ชื่อเล่น"]).toLowerCase();
        const fullName = text(p["ชื่อ-นามสกุล"]).toLowerCase();
        const crLower = rawCreatedBy.toLowerCase();
        return code === crLower || nickname === crLower || fullName === crLower;
      })
    : null;

  const creatorName = matchedCreator ? text(matchedCreator["ชื่อเล่น"] || matchedCreator["ชื่อ-นามสกุล"]) : "";
  const createdByDisplay = rawCreatedBy
    ? creatorName && !rawCreatedBy.toLowerCase().includes(creatorName.toLowerCase())
      ? `${rawCreatedBy} - ${creatorName}`
      : rawCreatedBy
    : "-";

  return (
    <BillDetailClient
      bill={bill}
      decodedBillId={decodedBillId}
      project={project}
      contract={contract}
      requesterDisplay={requesterDisplay}
      requesterLink={requesterLink}
      createdByDisplay={createdByDisplay}
      vendorDisplay={vendorDisplay}
      vendorLink={vendorLink}
      documentData={documentData}
    />
  );
}

function text(value: unknown) {
  return String(value || "").trim();
}

function billKey(row: SheetRow) {
  return text(row["ลำดับ"]) || text(row._sheetRow);
}
