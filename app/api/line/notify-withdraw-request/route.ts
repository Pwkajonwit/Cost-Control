import { NextRequest, NextResponse } from "next/server";
import {
  sendFlexMessageDetailed,
  getLineUserIdByRequester,
  getLineTargetGroup,
  getLineConfigIds,
  getPeopleMap,
  createWithdrawRequesterFlex,
  createWithdrawOwnerFlex,
  createWithdrawApproverFlex,
  createWithdrawCompletedRequesterFlex
} from "@/lib/line";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bills = body.rows && Array.isArray(body.rows) && body.rows.length > 0 
      ? body.rows 
      : body.row 
        ? [body.row] 
        : [];

    if (bills.length === 0) {
      return NextResponse.json({ error: "Missing row or rows data" }, { status: 400 });
    }

    const peopleMap = await getPeopleMap();
    const targetRole = body.targetRole || "requester";
    const totalAmount = bills.reduce((sum: number, b: any) => sum + Number(b["ยอดเงิน"] || b.amount || 0), 0);
    const amountStr = totalAmount.toLocaleString("th-TH");

    if (targetRole === "approver") {
      const { approverIds } = await getLineConfigIds();
      if (approverIds.length === 0) {
        return NextResponse.json({ error: "No Approver LINE User IDs configured" }, { status: 400 });
      }

      const flex = createWithdrawApproverFlex(bills, peopleMap);
      const altText = bills.length === 1
        ? `✅ รายการอนุมัติสำเร็จ (รอปิดงาน) #${bills[0]._sheetRow || bills[0].id || bills[0]["ลำดับ"] || ""} (฿${amountStr})`
        : `✅ รายการอนุมัติสำเร็จ ${bills.length} รายการ (รวม ฿${amountStr})`;

      const results = [];
      for (const approverId of approverIds) {
        const res = await sendFlexMessageDetailed(approverId, altText, flex);
        results.push(res);
      }

      return NextResponse.json({ success: true, count: approverIds.length, results });
    }

    if (targetRole === "owner") {
      const { ownerId } = await getLineConfigIds();
      if (!ownerId) {
        return NextResponse.json({ error: "No Owner LINE User ID configured" }, { status: 400 });
      }

      const flex = createWithdrawOwnerFlex(bills, peopleMap);
      const altText = bills.length === 1
        ? `📋 คำขออนุมัติเบิกเงิน #${bills[0]._sheetRow || bills[0].id || bills[0]["ลำดับ"] || ""} (฿${amountStr})`
        : `📋 คำขออนุมัติเบิกเงิน ${bills.length} รายการ (รวม ฿${amountStr})`;

      const result = await sendFlexMessageDetailed(ownerId, altText, flex);
      return NextResponse.json({ success: result.success, error: result.error, target: ownerId });
    }

    if (targetRole === "completed" || targetRole === "closed") {
      const firstBill = bills[0];
      const requesterKey = firstBill["ผู้เบิก"] || firstBill.requester || "";
      const targetUserId = await getLineUserIdByRequester(requesterKey);
      const fallbackGroup = await getLineTargetGroup("finance");
      const validGroup = fallbackGroup && fallbackGroup.startsWith("C") ? fallbackGroup : "";
      const sendTo = targetUserId || validGroup;

      if (!sendTo) {
        return NextResponse.json({ error: "No LINE User ID or Group target found for requester" }, { status: 400 });
      }

      const flex = createWithdrawCompletedRequesterFlex(bills, peopleMap);
      const altText = bills.length === 1
        ? `🎉 รายการเบิกเงินสำเร็จเรียบร้อย #${bills[0]._sheetRow || bills[0].id || bills[0]["ลำดับ"] || ""} (฿${amountStr})`
        : `🎉 รายการเบิกเงินสำเร็จเรียบร้อย ${bills.length} รายการ (รวม ฿${amountStr})`;

      const result = await sendFlexMessageDetailed(sendTo, altText, flex);

      // Also notify the bill creator (if different from requester)
      const creatorKey = String(firstBill["ผู้สร้างบิล"] || firstBill.created_by || firstBill["ผู้บันทึก"] || "").trim();
      if (creatorKey && creatorKey !== requesterKey) {
        const creatorUserId = await getLineUserIdByRequester(creatorKey);
        if (creatorUserId && creatorUserId !== targetUserId) {
          sendFlexMessageDetailed(creatorUserId, altText, flex).catch((e) =>
            console.warn("Failed notifying bill creator:", e)
          );
        }
      }

      return NextResponse.json({ success: result.success, error: result.error, target: sendTo });
    }

    // Default: requester
    const firstBill = bills[0];
    const requesterKey = firstBill["ผู้เบิก"] || firstBill.requester || "";
    const targetUserId = await getLineUserIdByRequester(requesterKey);
    const fallbackGroup = await getLineTargetGroup("finance");

    // Only send to fallbackGroup if it is an actual LINE Group ID starting with "C"
    const validGroup = fallbackGroup && fallbackGroup.startsWith("C") ? fallbackGroup : "";
    const sendTo = targetUserId || validGroup;

    if (!sendTo) {
      return NextResponse.json({ error: `No LINE User ID found for requester "${requesterKey}"` }, { status: 400 });
    }

    const flex = createWithdrawRequesterFlex(bills, peopleMap);
    const altText = bills.length === 1
      ? `📄 แจ้งเตือนรายการตั้งเบิกเงิน #${bills[0]._sheetRow || bills[0].id || bills[0]["ลำดับ"] || ""} (฿${amountStr})`
      : `📄 แจ้งเตือนรายการตั้งเบิกเงิน ${bills.length} รายการ (รวม ฿${amountStr})`;

    const result = await sendFlexMessageDetailed(sendTo, altText, flex);

    return NextResponse.json({ success: result.success, error: result.error, target: sendTo });
  } catch (err: any) {
    console.error("❌ Withdraw notification error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
