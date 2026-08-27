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

      const results = await Promise.all(
        approverIds.map(approverId => sendFlexMessageDetailed(approverId, altText, flex))
      );

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
      const requesterKey = String(firstBill["ผู้เบิก"] || firstBill.requester || "").trim();
      const creatorKey = String(firstBill["ผู้สร้างบิล"] || firstBill.created_by || firstBill["ผู้บันทึก"] || "").trim();

      const [targetUserId, creatorUserId, fallbackGroup] = await Promise.all([
        requesterKey ? getLineUserIdByRequester(requesterKey) : Promise.resolve(""),
        creatorKey ? getLineUserIdByRequester(creatorKey) : Promise.resolve(""),
        getLineTargetGroup("finance")
      ]);

      const validGroup = fallbackGroup && fallbackGroup.startsWith("C") ? fallbackGroup : "";
      const recipients = new Set<string>();
      if (targetUserId) recipients.add(targetUserId);
      if (creatorUserId) recipients.add(creatorUserId);
      if (recipients.size === 0 && validGroup) recipients.add(validGroup);

      if (recipients.size === 0) {
        return NextResponse.json({
          error: `ไม่พบบัญชี LINE ของผู้เบิก "${requesterKey || "-"}" หรือผู้สร้างบิล "${creatorKey || "-"}" ในระบบ`
        }, { status: 400 });
      }

      const flex = createWithdrawCompletedRequesterFlex(bills, peopleMap);
      const altText = bills.length === 1
        ? `🎉 รายการเบิกเงินสำเร็จเรียบร้อย #${bills[0]._sheetRow || bills[0].id || bills[0]["ลำดับ"] || ""} (฿${amountStr})`
        : `🎉 รายการเบิกเงินสำเร็จเรียบร้อย ${bills.length} รายการ (รวม ฿${amountStr})`;

      const results = [];
      for (const sendTo of recipients) {
        const res = await sendFlexMessageDetailed(sendTo, altText, flex);
        results.push(res);
      }

      return NextResponse.json({ success: true, count: recipients.size, targets: Array.from(recipients), results });
    }

    // Default: requester & creator
    const firstBill = bills[0];
    const requesterKey = String(firstBill["ผู้เบิก"] || firstBill.requester || "").trim();
    const creatorKey = String(firstBill["ผู้สร้างบิล"] || firstBill.created_by || firstBill["ผู้บันทึก"] || "").trim();

    const [targetUserId, creatorUserId, fallbackGroup] = await Promise.all([
      requesterKey ? getLineUserIdByRequester(requesterKey) : Promise.resolve(""),
      creatorKey ? getLineUserIdByRequester(creatorKey) : Promise.resolve(""),
      getLineTargetGroup("finance")
    ]);

    const validGroup = fallbackGroup && fallbackGroup.startsWith("C") ? fallbackGroup : "";
    const sessionLineUserId = req.cookies.get("auth_line_user_id")?.value;

    const recipients = new Set<string>();
    if (targetUserId) recipients.add(targetUserId);
    if (creatorUserId) recipients.add(creatorUserId);
    if (sessionLineUserId && sessionLineUserId.startsWith("U")) recipients.add(sessionLineUserId);
    if (recipients.size === 0 && validGroup) recipients.add(validGroup);

    if (recipients.size === 0) {
      return NextResponse.json({
        error: `ไม่พบบัญชี LINE ของผู้เบิก "${requesterKey || "-"}" หรือผู้สร้างบิล "${creatorKey || "-"}" ในระบบ`
      }, { status: 400 });
    }

    const flex = createWithdrawRequesterFlex(bills, peopleMap);
    const altText = bills.length === 1
      ? `📄 แจ้งเตือนรายการตั้งเบิกเงิน #${bills[0]._sheetRow || bills[0].id || bills[0]["ลำดับ"] || ""} (฿${amountStr})`
      : `📄 แจ้งเตือนรายการตั้งเบิกเงิน ${bills.length} รายการ (รวม ฿${amountStr})`;

    const results = [];
    for (const sendTo of recipients) {
      const res = await sendFlexMessageDetailed(sendTo, altText, flex);
      results.push(res);
    }

    return NextResponse.json({ success: true, count: recipients.size, targets: Array.from(recipients), results });
  } catch (err: any) {
    console.error("❌ Withdraw notification error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
