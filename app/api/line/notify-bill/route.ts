import { NextRequest, NextResponse } from "next/server";
import { sendFlexMessage, createBillNotificationFlex } from "@/lib/line";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bill, targetGroup: requestedGroup } = body;

    if (!bill) {
      return NextResponse.json({ error: "Missing bill object" }, { status: 400 });
    }

    const targetGroup =
      requestedGroup ||
      process.env.LINE_GROUP_ID_FINANCE ||
      process.env.LINE_GROUP_ID_SUMMARY ||
      process.env.LINE_USER_ID_OWN ||
      "";

    if (!targetGroup) {
      return NextResponse.json({ error: "Missing LINE group ID configuration" }, { status: 400 });
    }

    const flex = createBillNotificationFlex(bill);
    const success = await sendFlexMessage(
      targetGroup,
      `🧾 รายการแจ้งเตือนการเบิกเงิน: ฿${Number(bill.amount || 0).toLocaleString("th-TH")}`,
      flex
    );

    return NextResponse.json({ success });
  } catch (err: any) {
    console.error("❌ Notify bill error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

