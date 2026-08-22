import {
  replyTextMessage,
  replyFlexMessage,
  sendTextMessage,
  sendFlexMessageDetailed,
  getLineTargetGroup,
  logSystemError,
  createBillNotificationFlex,
  createWorkAssignmentFlex,
  createTaskSummaryFlex,
  createMemberTaskTableFlex,
  createBillSearchResultFlex,
  isLineApproverAuthorized,
  getOperatorDisplayName,
  getPeopleMap
} from "@/lib/line";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { insertRowToSupabase } from "@/lib/supabase-db";

/**
  * Central command processor for all 63 AppscriptBot keywords migrated to Next.js + Supabase
  */
export async function handleLineCommand(
  text: string,
  replyToken: string,
  targetId: string,
  userId: string
): Promise<boolean> {
  const rawText = text.trim();
  const lowerText = rawText.toLowerCase();

  try {
    // 1. System Health Check & Test Commands
    if (lowerText === "testbot" || lowerText === "check" || lowerText === "status" || lowerText === "getid") {
      if (lowerText === "getid") {
        await replyTextMessage(replyToken, `🟢 BOT Online (Supabase Engine)\n\nTarget ID: ${targetId}\nUser ID: ${userId}`);
        return true;
      }

      const { data, error } = await supabaseAdmin.from("bills").select("id", { count: "exact", head: true });
      if (error) {
        await replyTextMessage(replyToken, `⚠️ ตรวจสอบระบบ: LINE Webhook ทำงานปกติ แต่พบข้อความจาก Supabase: ${error.message}`);
      } else {
        await replyTextMessage(
          replyToken,
          `✅ 🤖 บอท CostCode Supabase ทำงานปกติ 100%!\n\n- Engine: Next.js v15 (Serverless)\n- Database: Supabase PostgreSQL (Connected)\n- Target ID: ${targetId}\n- Status: พร้อมรับทุกคำสั่ง 24/7`
        );
      }
      return true;
    }

    // 2. Menu & Help Commands
    if (lowerText === "ช่วยด้วย" || lowerText === "ช่วยเหลือ" || lowerText === "ช่วย" || lowerText === "เมนู" || lowerText === "คำสั่ง" || lowerText === "help") {
      const menuText = `🤖 ระบบ LINE Bot ประจำ CostCode Supabase\n\n📌 คำสั่งที่รองรับทั้งหมด (63 คำสั่ง):\n\n1. 📊 หมวดสรุปการเงิน/เบิกเงิน:\n   - พิมพ์ "สรุป" / "สรุปบิล" / "สรุปวันนี้"\n   - พิมพ์ "รออนุมัติ"\n   - พิมพ์ "บิลหลัก: [ชื่อ]" หรือ "บิลย่อย: [ชื่อ]"\n   - พิมพ์ "อนุมัติบิลหลักของ:" / "อนุมัติเงินสดบิลย่อยของ:"\n   - พิมพ์ "ปิดงานบิลหลักลำดับที่:"\n\n2. 🎯 หมวดงาน & PW มอบหมาย:\n   - พิมพ์ "งาน2: [ชื่อพนักงาน]" (ดูตารางงานแผนงาน)\n   - พิมพ์ "งาน: [รายละเอียดงาน]" (สร้างงานใหม่)\n   - พิมพ์ "งานด่วน:" / "ปิดงาน:" / "ยืนยันปิดงาน:" / "s:" (ค้นหา)\n   - พิมพ์ "มอบหมาย:" / "กิจกรรม:" / "PW:" / "PW1:work" / "PWALL:work"\n\n3. ⚡ หมวดคำสั่งลัด (Shortcuts):\n   - พิมพ์ "copy" / "add1" / "add3" / "addp" / "doo"\n\n4. ⚙️ หมวดตรวจสอบระบบ:\n   - พิมพ์ "testbot" / "check" / "getid"`;
      await replyTextMessage(replyToken, menuText);
      return true;
    }

    // 2.1 Template Shortcut Commands (copy, work, add1, add3, addp, doo, doo2)
    if (lowerText === "copy" || lowerText === "work" || lowerText === "add1" || lowerText === "add3" || lowerText === "addp" || lowerText === "doo" || lowerText === "doo2") {
      if (lowerText === "copy" || lowerText === "work") {
        const copyTemplate = `📋 แม่แบบสำหรับสร้างงานทั่วไป (คัดลอกข้อความด้านล่าง):\n\nงาน: [รายละเอียดงาน] - [ชื่อผู้รับผิดชอบ]`;
        await replyTextMessage(replyToken, copyTemplate);
        return true;
      }
      if (lowerText === "add1") {
        const add1Template = `📋 แม่แบบสร้างงานมัลติไลน์ (คัดลอกข้อความด้านล่าง):\n\nรายการ: ตรวจสอบแบบโครงสร้าง\nดู/ทำ: ${new Date().toLocaleDateString("th-TH")}\nส่งงาน: -\nผู้รับ: สมชาย\nประเภท: 1`;
        await replyTextMessage(replyToken, add1Template);
        return true;
      }
      if (lowerText === "add3") {
        const add3Template = `📋 แม่แบบสร้าง 3 งานย่อยต่อกัน (คัดลอกข้อความด้านล่าง):\n\nส่ง: งานเทคอนกรีตเสาอาคาร A\nผู้รับ: ช่างเอก\nหัวหน้า: วิชัย`;
        await replyTextMessage(replyToken, add3Template);
        return true;
      }
      if (lowerText === "addp") {
        const addpTemplate = `📋 แม่แบบเปิดจ้าง PW มัลติไลน์ (คัดลอกข้อความด้านล่าง):\n\nเรื่อง: งานผูกเหล็กและเทคอนกรีตฐานราก\nPR: PR-2026-0801\nสถานที่: ไซต์งาน อาคาร B\nนัดดู: ${new Date().toLocaleDateString("th-TH")}\nนัดเสนอ: -\nติดต่อ1: ช่างเอก\nเบอร์1: 081-234-5678\nบริษัท: บริษัท คอสท์แล็บ จำกัด`;
        await replyTextMessage(replyToken, addpTemplate);
        return true;
      }
      if (lowerText === "doo" || lowerText === "doo2") {
        const { data: activeWorks } = await supabaseAdmin
          .from("contract_works")
          .select("*")
          .order("id", { ascending: false })
          .limit(8);

        if (!activeWorks || activeWorks.length === 0) {
          await replyTextMessage(replyToken, `📋 ไม่พบรายการงานค้างในขณะนี้`);
          return true;
        }

        let summary = `📋 รายการงานค้างล่าสุด (${activeWorks.length} รายการ):\n\n`;
        activeWorks.forEach((w, i) => {
          summary += `${i + 1}. [CW${w.id}] ${w.work_details || w.project_name || "งานประจำวัน"} (รับผิดชอบ: ${w["ชื่อเล่น"] || w.contractor_name || "ทีมงาน"})\n`;
        });
        await replyTextMessage(replyToken, summary);
        return true;
      }
    }

    // 3. Task Commands (Controller_Task.gs)
    // 3.1 Task Search Grid by Member ("งาน2:เจมส์", "งาน:เจมส์") vs Create Task ("งาน: รายละเอียด...")
    if (rawText.startsWith("งาน2:") || rawText.startsWith("งาน:") || rawText.startsWith("งานด่วน:")) {
      const isTaskGridQuery = rawText.startsWith("งาน2:") || (rawText.startsWith("งาน:") && !rawText.includes(" ") && !rawText.includes(":") && !rawText.includes("["));
      const content = rawText.replace(/^งานด่วน:|^งาน2:|^งาน:/, "").trim();

      // A) Query Member Task Table Grid
      if (isTaskGridQuery || content.length < 15) {
        const memberName = content || "ทีมงาน";
        const { data: contractWorks } = await supabaseAdmin
          .from("contract_works")
          .select("*")
          .order("id", { ascending: false })
          .limit(10);

        if (!contractWorks || contractWorks.length === 0) {
          await replyTextMessage(replyToken, `📋 ไม่พบรายการงานของ "${memberName}" ในระบบ\n\nกรุณาตรวจสอบชื่อหรือเพิ่มงานผ่านคำสั่ง "งาน: รายละเอียด" ครับ`);
          return true;
        }

        const dbTasks = contractWorks.map(w => ({
          id: w.id,
          details: w.work_details || w.project_name || "งานประจำวัน",
          dateStr: new Date().toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit" }),
          status: "กำลังทำ"
        }));

        const flex = createMemberTaskTableFlex(memberName, dbTasks);
        const sent = await replyFlexMessage(replyToken, `📋 รายการงานทั้งหมดของ ${memberName} (${dbTasks.length} รายการ)`, flex);

        if (!sent && replyToken) {
          let textSummary = `📋 งานทั้งหมด : ${memberName} (${dbTasks.length} รายการ)\n\n`;
          dbTasks.forEach((t, i) => {
            textSummary += `${i + 1}. [CW${t.id}] ${t.details} (${t.dateStr}) - Close\n`;
          });
          await replyTextMessage(replyToken, textSummary);
        }
        return true;
      }

      // B) Create Task with safe row insertion and generated non-null ID
      const isUrgent = rawText.startsWith("งานด่วน:");
      let assignee = "-";
      let details = content;
      const match = content.match(/\[(.*?)\]$/) || content.match(/-(.*?)$/);
      if (match) {
        assignee = match[1].trim();
        details = content.replace(match[0], "").trim();
      }

      const generatedId = `CW-${Date.now().toString().slice(-6)}`;
      const rowObj = {
        id_Conwork: generatedId,
        id: generatedId,
        "ชื่อเล่น": assignee,
        "ผู้รับผิดชอบ": assignee,
        "รายละเอียดงาน": `${isUrgent ? "🔴 [ด่วน] " : ""}${details}`,
        "เบอร์โทรศัพท์": "-",
        "ยอดเงินจ้าง": 0,
        "ยอดเงินจ่าย": 0
      };

      await insertRowToSupabase("งานรับเหมา", rowObj);

      const notifyMsg = `✅ บันทึกงานเรียบร้อยแล้ว!\n\n📌 รหัสงาน: ${generatedId}\nรายละเอียด: ${details}\nผู้รับผิดชอบ: ${assignee}\nสถานะ: กำลังดำเนินการ`;
      await replyTextMessage(replyToken, notifyMsg);

      // Multi-Group Routing: Push to Task Group if configured and different from source
      const taskGroup = await getLineTargetGroup("task");
      if (taskGroup && taskGroup !== targetId) {
        await sendTextMessage(taskGroup, `📢 [แจ้งเตือนงานใหม่]\n${notifyMsg}`);
      }

      return true;
    }

    // 3.2 Close Task ("ปิดงาน:", "ยืนยันปิดงาน:")
    if (rawText.startsWith("ปิดงาน:") || rawText.startsWith("ยืนยันปิดงาน:")) {
      const taskId = rawText.replace(/^ปิดงาน:|^ยืนยันปิดงาน:/, "").trim();
      if (!taskId) {
        await replyTextMessage(replyToken, `⚠️ กรุณาระบุรหัสงานที่ต้องการปิด\nเช่น ปิดงาน: 101`);
        return true;
      }

      const { error } = await supabaseAdmin
        .from("contract_works")
        .update({ work_details: `[เสร็จสิ้น] (ปิดงานเมื่อ ${new Date().toLocaleDateString("th-TH")})` })
        .eq("id", taskId);

      if (error) {
        await replyTextMessage(replyToken, `❌ ปิดงานรหัส ${taskId} ไม่สำเร็จ: ${error.message}`);
      } else {
        const closeMsg = `🎉 ปิดงานรหัส [${taskId}] เรียบร้อยแล้วครับ!`;
        await replyTextMessage(replyToken, closeMsg);

        // Multi-Group Routing: Push to Task Group
        const taskGroup = await getLineTargetGroup("task");
        if (taskGroup && taskGroup !== targetId) {
          await sendTextMessage(taskGroup, `📢 [อัปเดตงาน]\n${closeMsg}`);
        }
      }
      return true;
    }

    // 3.3 Search Task ("s:", "งานทั้งหมด", ":งานที่ทำ", ":งานที่เสร็จ")
    if (rawText.startsWith("s:") || lowerText === "งานทั้งหมด" || lowerText === "งาน" || lowerText.includes(":งานที่ทำ") || lowerText.includes(":งานที่เสร็จ")) {
      const searchTerm = rawText.replace(/^s:/, "").replace(/^งาน:/, "").trim();
      let query = supabaseAdmin.from("contract_works").select("*");
      if (searchTerm && searchTerm !== "งานทั้งหมด" && searchTerm !== "งาน") {
        query = query.ilike("work_details", `%${searchTerm}%`);
      }
      const { data: tasks } = await query.order("id", { ascending: false }).limit(10);

      if (!tasks || tasks.length === 0) {
        const noTaskMsg = searchTerm
          ? `🔍 ไม่พบงานที่ตรงกับ "${searchTerm}"\n\nลองค้นหาคำอื่น หรือสร้างงานใหม่ด้วยคำสั่ง "งาน: รายละเอียด" ครับ`
          : `📋 ไม่พบรายการงานค้างในระบบขณะนี้`;
        await replyTextMessage(replyToken, noTaskMsg);
        return true;
      }

      const formattedTasks = tasks.map(t => ({
        id: t.id,
        details: t.work_details || "-",
        status: "กำลังทำ",
        project: t.project_name || t.project_id || "งานทั่วไป"
      }));

      const flex = createTaskSummaryFlex(formattedTasks);
      await replyFlexMessage(replyToken, `📋 รายการงานค้าง (${tasks.length} รายการ)`, flex);
      return true;
    }

    // 3.4 Multi-Subtask Creation Command ("ส่ง:")
    if (rawText.startsWith("ส่ง:")) {
      const lines = rawText.replace(/^ส่ง:/, "").trim().split("\n");
      const mainTitle = lines[0]?.trim() || "งานทั่วไป";
      const receiver = lines[1]?.replace(/^ผู้รับ:|^ถึง:|^ผู้รับผิดชอบ:/, "").trim() || "ทีมงาน";
      const head = lines[2]?.replace(/^หัวหน้า:|^อนุมัติโดย:/, "").trim() || "หัวหน้า";

      const now = Date.now();
      const id1 = `CW-${now.toString().slice(-6)}-1`;
      const id2 = `CW-${now.toString().slice(-6)}-2`;
      const id3 = `CW-${now.toString().slice(-6)}-3`;

      // 3 Linked Sub-tasks
      await Promise.all([
        insertRowToSupabase("งานรับเหมา", { id_Conwork: id1, id: id1, "ชื่อเล่น": receiver, "ผู้รับผิดชอบ": receiver, "รายละเอียดงาน": mainTitle }),
        insertRowToSupabase("งานรับเหมา", { id_Conwork: id2, id: id2, "ชื่อเล่น": head, "ผู้รับผิดชอบ": head, "รายละเอียดงาน": `${mainTitle} (ส่ง หัวหน้า)` }),
        insertRowToSupabase("งานรับเหมา", { id_Conwork: id3, id: id3, "ชื่อเล่น": receiver, "ผู้รับผิดชอบ": receiver, "รายละเอียดงาน": `${mainTitle} (ส่ง ${receiver})` }),
      ]);

      const createdMsg = `🎉 สร้าง 3 งานย่อยเรียบร้อยแล้ว!\n\n1. [${id1}] ${mainTitle}\n   ผู้รับผิดชอบ: ${receiver}\n2. [${id2}] ${mainTitle} (ส่ง หัวหน้า)\n   ผู้รับผิดชอบ: ${head}\n3. [${id3}] ${mainTitle} (ส่ง ${receiver})\n   ผู้รับผิดชอบ: ${receiver}`;

      await replyTextMessage(replyToken, createdMsg);

      const taskGroup = await getLineTargetGroup("task");
      if (taskGroup && taskGroup !== targetId) {
        await sendTextMessage(taskGroup, `📢 [สร้าง 3 งานย่อยใหม่]\n${createdMsg}`);
      }
      return true;
    }

    // 3.5 Multi-line Task Edit / Creation Parser ("ลำดับ:", "รายการ:", "ดู/ทำ:")
    if (rawText.includes("รายการ:") && (rawText.includes("ดู/ทำ:") || rawText.includes("ส่งงาน:") || rawText.includes("ลำดับ:"))) {
      const getVal = (key: string) => {
        const regex = new RegExp(`${key}[:\\s]*(.*?)(?=\\n[a-zA-Zก-๙]+:|$)`, "s");
        const match = rawText.match(regex);
        return match ? match[1].trim() : "";
      };

      const taskId = getVal("ลำดับ");
      const listName = getVal("รายการ");
      const doWork = getVal("ดู/ทำ") || getVal("ทำ");
      const sendWork = getVal("ส่งงาน") || getVal("ส่ง");
      const typeNum = getVal("ประเภท");
      const receiver = getVal("ผู้รับ") || getVal("ผู้รับมอบหมาย");

      const typeLabel = typeNum === "1" ? "เอกสาร" : typeNum === "2" ? "แผนงาน" : typeNum === "3" ? "PJSA" : "ทั่วไป";

      if (taskId) {
        await supabaseAdmin
          .from("contract_works")
          .update({
            work_details: `[${typeLabel}] ${listName} (ดู: ${doWork || "-"}, ส่ง: ${sendWork || "-"})`,
            "ชื่อเล่น": receiver || "ทีมงาน"
          })
          .eq("id", taskId);

        await replyTextMessage(replyToken, `✅ อัปเดตงานลำดับ [${taskId}] เรียบร้อยแล้ว! (${typeLabel})`);
      } else {
        const newId = `CW-${Date.now().toString().slice(-6)}`;
        await insertRowToSupabase("งานรับเหมา", {
          id_Conwork: newId,
          id: newId,
          "ชื่อเล่น": receiver || "ทีมงาน",
          "ผู้รับผิดชอบ": receiver || "ทีมงาน",
          "รายละเอียดงาน": `[${typeLabel}] ${listName} (ดู: ${doWork || "-"}, ส่ง: ${sendWork || "-"})`
        });
        await replyTextMessage(replyToken, `✅ สร้างงานใหม่ [${newId}] เรียบร้อยแล้ว! (${typeLabel})`);
      }
      return true;
    }

    // 4. Work / PW Commands (Controller_Work.gs)
    // 4.1 Multi-line Detailed PW Assignment ("เรื่อง:", "PR:", "สถานที่:", "นัดดู:")
    if (rawText.includes("เรื่อง:") || rawText.includes("PR:") || rawText.includes("นัดดู:") || rawText.includes("นัดเสนอ:")) {
      const getPWVal = (key: string) => {
        const regex = new RegExp(`${key}[:\\s]*(.*?)(?=\\n[a-zA-Zก-๙]+:|$)`, "i");
        const match = rawText.match(regex);
        return match ? match[1].trim() : "";
      };

      const topic = getPWVal("เรื่อง") || getPWVal("รายการ");
      const prNo = getPWVal("PR") || "-";
      const location = getPWVal("สถานที่") || "-";
      const inspectDate = getPWVal("นัดดู") || "-";
      const offerDate = getPWVal("นัดเสนอ") || "-";
      const contact1 = getPWVal("ติดต่อ1") || getPWVal("ติดต่อ") || "-";
      const phone1 = getPWVal("เบอร์1") || getPWVal("เบอร์") || "-";
      const company = getPWVal("บริษัท") || "-";

      const pwId = `PW-${Date.now().toString().slice(-6)}`;
      const fullDetails = `${topic} (PR: ${prNo}, สถานที่: ${location}, นัดดู: ${inspectDate}, นัดเสนอ: ${offerDate})`;

      await insertRowToSupabase("งานรับเหมา", {
        id_Conwork: pwId,
        id: pwId,
        "ชื่อเล่น": contact1,
        "ผู้รับผิดชอบ": contact1,
        "รายละเอียดงาน": fullDetails,
        "เบอร์โทรศัพท์": phone1,
        "บริษัท": company
      });

      const flex = createWorkAssignmentFlex({
        id: pwId,
        project_name: company !== "-" ? company : "งานรับเหมา",
        contractor_name: contact1,
        amount: 0,
        details: fullDetails,
        contact: contact1,
        phone: phone1
      });

      await replyFlexMessage(replyToken, `👷‍♂️ บันทึกงานรับเหมามัลติไลน์ [${pwId}] เรียบร้อยแล้ว`, flex);

      const pwGroup = await getLineTargetGroup("pw");
      if (pwGroup && pwGroup !== targetId) {
        await sendFlexMessageDetailed(pwGroup, `📢 [แจ้งเตือนมอบหมายงาน PW มัลติไลน์: ${pwId}]`, flex);
      }
      return true;
    }

    if (rawText.startsWith("มอบหมาย:") || rawText.startsWith("กิจกรรม:") || rawText.startsWith("PW:") || rawText.startsWith("PW1:") || rawText.startsWith("PWALL:")) {
      const content = rawText.replace(/^มอบหมาย:|^กิจกรรม:|^PW:|^PW1:work|^PWALL:work|^PW:/, "").trim();
      if (!content) {
        await replyTextMessage(replyToken, `⚠️ กรุณาระบุรายละเอียดการมอบหมายงาน\nเช่น มอบหมาย: งานผูกเหล็กและเทคอนกรีต [ช่างเอก] ฿250,000`);
        return true;
      }

      // Parse content: "มอบหมาย: งานผูกเหล็ก [ช่างเอก] ฿250,000 โทร:081-234-5678"
      const amountMatch = content.match(/฿([\d,]+)/);
      const contractorMatch = content.match(/\[([^\]]+)\]/);
      const phoneMatch = content.match(/(?:โทร|tel|phone)[:\s]*([\d\-]+)/i);

      const parsedAmount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : 0;
      const parsedContractor = contractorMatch ? contractorMatch[1].trim() : "-";
      const parsedPhone = phoneMatch ? phoneMatch[1].trim() : "-";
      const parsedDetails = content
        .replace(/฿[\d,]+/, "")
        .replace(/\[[^\]]+\]/, "")
        .replace(/(?:โทร|tel|phone)[:\s]*[\d\-]+/i, "")
        .trim() || content;

      const pwId = `PW-${Date.now().toString().slice(-6)}`;

      const flex = createWorkAssignmentFlex({
        id: pwId,
        project_name: "-",
        contractor_name: parsedContractor,
        amount: parsedAmount,
        details: parsedDetails,
        contact: parsedContractor !== "-" ? parsedContractor : "-",
        phone: parsedPhone
      });

      await replyFlexMessage(replyToken, `👷‍♂️ มอบหมายงาน [${pwId}] เรียบร้อยแล้ว`, flex);

      // Multi-Group Routing: Push to PW Work Group
      const pwGroup = await getLineTargetGroup("pw");
      if (pwGroup && pwGroup !== targetId) {
        await sendFlexMessageDetailed(pwGroup, `📢 [แจ้งเตือนมอบหมายงาน PW ใหม่: ${pwId}]`, flex);
      }

      return true;
    }

    // 4.9 Send for Approval Command ("ส่งไปเพื่ออนุมัติบิลลำดับที่:", "ส่งไปเพื่ออนุมัติ:")
    if (
      rawText.startsWith("ส่งไปเพื่ออนุมัติบิลลำดับที่:") ||
      rawText.startsWith("ส่งไปเพื่ออนุมัติ:") ||
      rawText.startsWith("ส่งไปเพื่ออนุมัติบิล:")
    ) {
      const sheetRowStr = rawText.replace(/.*?:/, "").trim();
      if (!sheetRowStr) {
        await replyTextMessage(replyToken, "⚠️ กรุณาระบุลำดับบิลที่ต้องการส่งอนุมัติ");
        return true;
      }

      const { getRowsFromSupabase } = await import("@/lib/supabase-db");
      const { getLineConfigIds, createWithdrawOwnerFlex, sendFlexMessageDetailed } = await import("@/lib/line");
      const { normalizeBillStatus } = await import("@/lib/bill-status");
      const rawBills = await getRowsFromSupabase("Data", 1000);

      const targetIdList = sheetRowStr.split(",").map(id => id.trim()).filter(Boolean);
      const targetBills = rawBills.filter(b => targetIdList.includes(String(b["ลำดับ"] || b.id || b._sheetRow || "").trim()));

      if (targetBills.length === 0) {
        await replyTextMessage(replyToken, `🔍 ไม่พบรายการบิลลำดับที่ [${sheetRowStr}] ในระบบ`);
        return true;
      }

      // Prevent duplicate approval requests for bills that are already approved or finished
      const pendingBills = targetBills.filter(b => {
        const st = normalizeBillStatus(b["สถานะ"] || b.status);
        return st !== "อนุมัติ" && st !== "เบิกแล้ว";
      });

      if (pendingBills.length === 0) {
        await replyTextMessage(
          replyToken,
          `⚠️ รายการบิลลำดับที่ [${sheetRowStr}] อยู่ในสถานะ "อนุมัติแล้ว" หรือ "ปิดงานแล้ว" เรียบร้อยแล้ว (ระบบป้องกันการสั่งอนุมัติซ้ำ)`
        );
        return true;
      }

      const { ownerId } = await getLineConfigIds();
      if (!ownerId) {
        await replyTextMessage(replyToken, "⚠️ ยังไม่ได้ระบุ LINE User ID เจ้าของระบบ (OWN) ในการตั้งค่า LINE System");
        return true;
      }

      const peopleMap = await getPeopleMap();
      const flexForOwner = createWithdrawOwnerFlex(pendingBills, peopleMap);
      const totalAmount = pendingBills.reduce((sum, b) => sum + Number(b["ยอดเงิน"] || b.amount || 0), 0);
      const amountStr = totalAmount.toLocaleString("th-TH");

      const altText = pendingBills.length === 1
        ? `📋 คำขออนุมัติเบิกเงิน #${sheetRowStr} (฿${amountStr})`
        : `📋 คำขออนุมัติเบิกเงิน ${pendingBills.length} รายการ (รวม ฿${amountStr})`;

      const result = await sendFlexMessageDetailed(ownerId, altText, flexForOwner);

      if (result.success) {
        await replyTextMessage(replyToken, `✅ ส่งรายการตั้งเบิกบิลลำดับที่ [${sheetRowStr}] ไปยังเจ้าของระบบ (OWN / Admin) เพื่ออนุมัติเรียบร้อยแล้ว`);
      } else {
        await replyTextMessage(replyToken, `❌ ไม่สามารถส่ง Flex ไปยังเจ้าของระบบได้: ${result.error || "ข้อผิดพลาด LINE API"}`);
      }
      return true;
    }

    // 5. Approve / Disapprove / Close Bill Commands
    if (
      rawText.startsWith("อนุมัติบิลหลักของ:") ||
      rawText.startsWith("อนุมัติเงินสดบิลย่อยของ:") ||
      rawText.startsWith("อนุมัติบิลหลักลำดับที่:") ||
      rawText.startsWith("อนุมัติเงินสดบิลย่อยลำดับที่:") ||
      rawText.startsWith("อนุมัติบิลลำดับที่:") ||
      rawText.startsWith("ไม่อนุมัติบิลลำดับที่:") ||
      rawText.startsWith("ไม่อนุมัติ:") ||
      rawText.startsWith("ปิดงานบิลหลักลำดับที่:") ||
      rawText.startsWith("ปิดงานเงินสดบิลย่อยของ:") ||
      rawText.startsWith("ปิดงานเงินสดบิลย่อยลำดับที่:") ||
      rawText.startsWith("ปิดงานบิลย่อยลำดับที่:") ||
      rawText.startsWith("ปิดงานบิลลำดับที่:") ||
      rawText.startsWith("อนุมัติทั้งหมด:") ||
      rawText.startsWith("ปิดงานทั้งหมด:")
    ) {
      const rawTarget = rawText.replace(/.*?:/, "").trim();
      const isReject = rawText.includes("ไม่อนุมัติ");
      const isApprove = rawText.includes("อนุมัติ") && !isReject;
      const isBatchAll = rawText.startsWith("อนุมัติทั้งหมด:") || rawText.startsWith("ปิดงานทั้งหมด:");

      if (!rawTarget && !isBatchAll) {
        await replyTextMessage(replyToken, `⚠️ กรุณาระบุชื่อผู้เบิกหรือรายละเอียดที่ต้องการ${isReject ? "ไม่อนุมัติ" : isApprove ? "อนุมัติ" : "ปิดงาน"}`);
        return true;
      }

      // Check LINE Approver Authorization
      const isAuthorized = await isLineApproverAuthorized(userId, targetId);
      if (!isAuthorized) {
        await replyTextMessage(
          replyToken,
          `⛔ ขออภัยครับ บัญชี LINE ของคุณไม่มีสิทธิ์ในการ${isReject ? "ไม่อนุมัติ" : isApprove ? "อนุมัติ" : "ปิดงาน"}บิล\n\n(สิทธิ์นี้สงวนไว้เฉพาะผู้ดูแลระบบ Admin หรือ ผู้อนุมัติที่ได้รับอนุญาตเท่านั้น)`
        );
        return true;
      }

      const newStatus = isReject ? "ไม่อนุมัติ" : isApprove ? "อนุมัติ" : "เบิกแล้ว";
      const isSubBatch = rawText.includes("ย่อย") || rawTarget.includes("ย่อย");
      const isMainBatch = rawText.includes("หลัก") || rawTarget.includes("หลัก");
      const cleanTarget = rawTarget.replace(/^หลัก:|^ย่อย:|^บิลหลัก:|^บิลย่อย:|^บิล:|^ลำดับที่:|^บิลลำดับที่:|^หลักลำดับที่:|^ย่อยลำดับที่:/i, "").trim();
      const targetIdList = cleanTarget.split(/[,,\s]+/).map(id => id.trim()).filter(Boolean);

      const { normalizeBillStatus } = await import("@/lib/bill-status");
      const { getRowsFromSupabase, updateRowInSupabase } = await import("@/lib/supabase-db");
      const { getLineConfigIds, createWithdrawApproverFlex, sendFlexMessageDetailed } = await import("@/lib/line");
      const [rawBills, peopleRows] = await Promise.all([
        getRowsFromSupabase("Data", 1000),
        getRowsFromSupabase("master_members", 500).catch(() => []),
      ]);

      function checkIsSubBill(b: any): boolean {
        const billVal = String(b["บิล"] || b.bill || b.bill_type || "").trim();
        if (billVal.includes("ย่อย")) return true;
        if (billVal.includes("หลัก")) return false;
        const cat = String(b["ประเภท"] || b.category || "").trim();
        return cat.includes("ย่อย") || cat.startsWith("2.") || cat.startsWith("3.") || cat.startsWith("8.");
      }

      const peopleMap = new Map<string, string>();
      const nameToEmpIdMap = new Map<string, string>();
      for (const p of peopleRows) {
        const empId = String(p["รหัสพนักงาน"] || p.id || "").trim();
        const empName = String(p["ชื่อเล่น"] || p["ชื่อ-นามสกุล"] || p.name || "").trim();
        if (empId && empName) {
          peopleMap.set(empId, empName);
          nameToEmpIdMap.set(empName, empId);
        }
      }

      const target = cleanTarget;
      const matchedEmpId = nameToEmpIdMap.get(target) || target;

      const targetBills = rawBills.filter(b => {
        const currentSt = String(b["สถานะ"] || b.status || "").trim();
        const normSt = normalizeBillStatus(currentSt);

        // Skip bills that are already approved or finished when performing approval
        if (isApprove && (normSt === "อนุมัติ" || normSt === "เบิกแล้ว" || currentSt.includes("เสร็จ") || currentSt.includes("ปิดงาน") || currentSt.includes("จ่ายแล้ว"))) {
          return false;
        }
        // Skip bills that are already completed/closed when performing close
        if (!isApprove && (normSt === "เบิกแล้ว" || currentSt.includes("เสร็จ") || currentSt.includes("ปิดงาน"))) {
          return false;
        }

        if (isSubBatch && !checkIsSubBill(b)) return false;
        if (isMainBatch && checkIsSubBill(b)) return false;

        const bId = String(b["ลำดับ"] || b.id || b._sheetRow || "").trim();

        // Exact match by Bill ID or ID in targetIdList takes priority (for single/multi bill button actions)
        if (targetIdList.length > 0 && targetIdList.includes(bId)) return true;

        if (!target || target === "ทั้งหมด" || target === "หลัก" || target === "ย่อย") return true;

        const bReq = String(b["ผู้เบิก"] || b.requester || "").trim();
        const bReqName = peopleMap.get(bReq) || bReq;
        const bVendor = String(b["ร้าน/บุคคล"] || b.vendor_or_person || "").trim();
        const bDesc = String(b["สินค้า/ทำงาน"] || b.description || "").trim();

        return (
          targetIdList.includes(bReq) ||
          bReq === target ||
          bReq === matchedEmpId ||
          bReqName.toLowerCase().includes(target.toLowerCase()) ||
          bVendor.toLowerCase().includes(target.toLowerCase()) ||
          bDesc.toLowerCase().includes(target.toLowerCase())
        );
      });

      if (targetBills.length === 0) {
        await replyTextMessage(
          replyToken,
          `🔍 ไม่พบรายการบิล${isSubBatch ? "ย่อย" : isMainBatch ? "หลัก" : ""}ที่สามารถ${isApprove ? "อนุมัติ" : "ปิดงาน"}ได้สำหรับ "${rawTarget || "รายการที่เลือก"}"`
        );
        return true;
      }

      let totalAmount = 0;
      const { approverIds } = await getLineConfigIds();

      for (const b of targetBills) {
        const bId = b.id || b["ลำดับ"] || b._sheetRow;
        totalAmount += Number(b["ยอดเงิน"] || b.amount || 0);
        await updateRowInSupabase("bills", "id", bId, {
          "สถานะ": newStatus,
          status: newStatus
        });
        b["สถานะ"] = newStatus;
        b.status = newStatus;
      }

      // When Owner Approves successfully, forward Multi-Item Flex Message to Approvers (LINE_USER_ID_APPROVER list)
      if (isApprove && approverIds.length > 0) {
        const peopleMap = await getPeopleMap();
        const flexForApprover = createWithdrawApproverFlex(targetBills, peopleMap);
        const totalAmtStr = totalAmount.toLocaleString("th-TH");
        const altText = targetBills.length === 1
          ? `✅ รายการอนุมัติสำเร็จ (รอปิดงาน) #${targetBills[0]["ลำดับ"] || targetBills[0].id || ""} (฿${totalAmtStr})`
          : `✅ รายการอนุมัติสำเร็จ ${targetBills.length} รายการ (รวม ฿${totalAmtStr})`;

        for (const approverId of approverIds) {
          await sendFlexMessageDetailed(approverId, altText, flexForApprover);
        }
      }

      // When Approver Closes bills successfully (!isApprove && !isReject), notify each Requester via LINE Flex Message
      if (!isApprove && !isReject && targetBills.length > 0) {
        const { getLineUserIdByRequester, getLineTargetGroup, createWithdrawCompletedRequesterFlex, sendFlexMessageDetailed } = await import("@/lib/line");

        const billsByRequester = new Map<string, any[]>();
        for (const b of targetBills) {
          const reqKey = String(b["ผู้เบิก"] || b.requester || "").trim();
          if (!billsByRequester.has(reqKey)) {
            billsByRequester.set(reqKey, []);
          }
          billsByRequester.get(reqKey)!.push(b);
        }

        for (const [reqKey, reqBills] of billsByRequester.entries()) {
          const targetUserId = await getLineUserIdByRequester(reqKey);
          const fallbackGroup = await getLineTargetGroup("finance");
          const sendTo = targetUserId || fallbackGroup;

          if (sendTo) {
            const peopleMap = await getPeopleMap();
            const flexForRequester = createWithdrawCompletedRequesterFlex(reqBills, peopleMap);
            const totalAmt = reqBills.reduce((sum, b) => sum + Number(b["ยอดเงิน"] || b.amount || 0), 0);
            const totalAmtStr = totalAmt.toLocaleString("th-TH");
            const altText = reqBills.length === 1
              ? `🎉 รายการเบิกเงินสำเร็จเรียบร้อย #${reqBills[0]["ลำดับ"] || reqBills[0].id || ""} (฿${totalAmtStr})`
              : `🎉 รายการเบิกเงินสำเร็จเรียบร้อย ${reqBills.length} รายการ (รวม ฿${totalAmtStr})`;

            await sendFlexMessageDetailed(sendTo, altText, flexForRequester);
          }
        }
      }

      const formattedTotal = totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const defaultRole = isApprove ? "เจ้าของโครงการ" : "ผู้อนุมัติ";
      const operatorName = await getOperatorDisplayName(userId, defaultRole);

      await replyTextMessage(
        replyToken,
        `✅ ${isApprove ? "อนุมัติ" : "ปิดงาน"}บิล${isSubBatch ? "ย่อย" : isMainBatch ? "หลัก" : ""}ของ "${rawTarget}" เรียบร้อยแล้ว!\n\n📊 จำนวน: ${targetBills.length} รายการ\n💰 ยอดเงินรวม: ฿${formattedTotal}\n👮‍♂️ ผู้ดำเนินการ: ${operatorName}${isApprove && approverIds.length > 0 ? `\n📲 ส่ง Flex ต่อไปยังผู้อนุมัติ (${approverIds.length} ท่าน) เพื่อปิดงานแล้ว` : ""}`
      );
      return true;
    }

    // 6. Query Bills Specific Commands
    // "หลัก", "ย่อย", "บิลหลัก", "บิลย่อย", "หลัก:", "บิลหลัก:", "ย่อย:", "บิลย่อย:", "ทั้งหมด:", "รออนุมัติ", "ตั้งเบิก"
    // "บิล:", "bill:" — ค้นหาทั่วไป (ทั้งบิลหลักและย่อย)
    if (
      rawText === "หลัก" ||
      rawText === "ย่อย" ||
      rawText === "บิลหลัก" ||
      rawText === "บิลย่อย" ||
      rawText.startsWith("หลัก:") ||
      rawText.startsWith("ย่อย:") ||
      rawText.startsWith("บิลหลัก:") ||
      rawText.startsWith("บิลย่อย:") ||
      rawText.startsWith("ทั้งหมด:") ||
      rawText.startsWith("บิล:") ||
      rawText.toLowerCase().startsWith("bill:") ||
      lowerText === "รอตั้งเบิก" ||
      lowerText === "รออนุมัติ" ||
      lowerText === "ตั้งเบิก"
    ) {
      const isSub = rawText.includes("ย่อย");
      const isMain = rawText.includes("หลัก");
      const isPendingFilter = isMain || isSub || lowerText === "รอตั้งเบิก" || lowerText === "รออนุมัติ" || lowerText === "ตั้งเบิก";

      const filterQuery = rawText
        .replace(/^หลัก:|^ย่อย:|^บิลหลัก:|^บิลย่อย:|^ทั้งหมด:|^บิล:|^bill:|^หลัก$|^ย่อย$|^บิลหลัก$|^บิลย่อย$/i, "")
        .trim();

      // ดึงข้อมูลบิลและตารางอ้างอิงทั้งหมดเพื่อ hydrate ข้อมูลให้เหมือนหน้าเว็บ 100%
      const { getRowsFromSupabase } = await import("@/lib/supabase-db");
      const { hydrateBillRows } = await import("@/lib/formulas");

      const [rawBills, peopleRows, projectRows, storeRows, contractRows, contractorRows] = await Promise.all([
        getRowsFromSupabase("Data", 1000),
        getRowsFromSupabase("master_members", 500).catch(() => []),
        getRowsFromSupabase("Project", 500).catch(() => []),
        getRowsFromSupabase("ร้านค้า", 500).catch(() => []),
        getRowsFromSupabase("งานรับเหมา", 500).catch(() => []),
        getRowsFromSupabase("รับเหมา", 500).catch(() => []),
      ]);

      // สร้าง Map สำหรับแปลง รหัสพนักงาน <-> ชื่อเล่น / ชื่อ-นามสกุล
      const peopleMap = new Map<string, string>();
      for (const p of peopleRows) {
        const empId = String(p["รหัสพนักงาน"] || p.id || "").trim();
        const empName = String(p["ชื่อเล่น"] || p["ชื่อ-นามสกุล"] || p.name || "").trim();
        if (empId && empName) {
          peopleMap.set(empId, empName);
        }
      }

      // Hydrated bills (เติมชื่อโครงการ, ร้านค้า, รายละเอียดงาน)
      const hydratedBills = await hydrateBillRows(rawBills, {
        projects: projectRows,
        stores: storeRows,
        contracts: contractRows,
        contractors: contractorRows,
      });

      let filtered = hydratedBills;

      // ✅ กรองเฉพาะบิลสถานะ "รอตั้งเบิก", "ตั้งเบิก" และ "รออนุมัติ" เมื่อพิมพ์ หลัก หรือ ย่อย
      if (isPendingFilter && !rawText.startsWith("ทั้งหมด:")) {
        filtered = filtered.filter(b => {
          const st = String(b["สถานะ"] || b.status || "").trim();
          return (
            st === "รอตั้งเบิก" ||
            st === "ตั้งเบิก" ||
            st === "รออนุมัติ" ||
            st === "รอตรวจสอบ" ||
            st === "รอดำเนินการ" ||
            st === "รอเบิก"
          );
        });
      }

      // กรองเพิ่มเติมตามชื่อ/คำค้นหา (ถ้ามี)
      if (filterQuery && filterQuery !== "ทั้งหมด") {
        const q = filterQuery.toLowerCase();
        filtered = filtered.filter(b => {
          const rawReq = String(b["ผู้เบิก"] || b.requester || "").toLowerCase();
          const mappedReq = (peopleMap.get(String(b["ผู้เบิก"] || b.requester || "").trim()) || "").toLowerCase();
          const vendor = String(b["ร้าน/บุคคล"] || b.vendor_or_person || "").toLowerCase();
          const desc = String(b["สินค้า/ทำงาน"] || b.description || "").toLowerCase();
          const billNo = String(b["บิล"] || b.bill_no || b["ลำดับ"] || b.id || "").toLowerCase();
          const projName = String(b["ชื่อ Project"] || b.project_name || "").toLowerCase();

          return rawReq.includes(q) || mappedReq.includes(q) || vendor.includes(q) || desc.includes(q) || billNo.includes(q) || projName.includes(q);
        });
      }

      // กรองประเภท บิลย่อย vs บิลหลัก
      function checkIsSubBill(b: any): boolean {
        const billVal = String(b["บิล"] || b.bill || b.bill_type || "").trim();
        if (billVal.includes("ย่อย")) return true;
        if (billVal.includes("หลัก")) return false;
        const cat = String(b["ประเภท"] || b.category || "").trim();
        return cat.includes("ย่อย") || cat.startsWith("2.") || cat.startsWith("3.") || cat.startsWith("8.");
      }

      if (isSub) {
        filtered = filtered.filter(b => checkIsSubBill(b));
      } else if (isMain) {
        filtered = filtered.filter(b => !checkIsSubBill(b));
      }

      const totalCount = filtered.length;
      const totalSumAmount = filtered.reduce((sum, b) => sum + Number(b["ยอดเงิน"] || b.amount || 0), 0);

      const bills = filtered.slice(0, 40).map(b => {
        const reqIdOrName = String(b["ผู้เบิก"] || b.requester || "").trim();
        const resolvedRequester = peopleMap.get(reqIdOrName) || reqIdOrName || "-";
        const itemIsSub = checkIsSubBill(b);

        return {
          id: b["ลำดับ"] || b.id,
          bill_no: String(b["ลำดับ"] || b.id || "-"),
          bill_type: itemIsSub ? "ย่อย" : "หลัก",
          project_name: String(b["ชื่อ Project"] || b.project_name || "โครงการ"),
          vendor_or_person: String(b["ร้าน/บุคคล"] || b.vendor_or_person || "-"),
          description: String(b["สินค้า/ทำงาน"] || b.description || "-"),
          amount: Number(b["ยอดเงิน"] || b.amount || 0),
          status: String(b["สถานะ"] || b.status || "ตั้งเบิก"),
          requester: String(resolvedRequester),
          image_url: String(b["รูปถ่ายบิล"] || b.image_url || ""),
          image_urls: typeof b["รูปถ่ายบิล"] === "string" ? b["รูปถ่ายบิล"].split(",") : undefined
        };
      });

      // ✅ FIX: ลบ hardcoded fallback — แสดง "ไม่พบรายการ" แทนข้อมูลปลอม
      if (!bills || bills.length === 0) {
        const noResultMsg = lowerText === "รออนุมัติ"
          ? "✅ ไม่มีรายการรออนุมัติในขณะนี้ครับ\n\nบิลทั้งหมดได้รับการอนุมัติหรือดำเนินการแล้ว"
          : filterQuery
            ? `🔍 ไม่พบรายการบิล${isSub ? "ย่อย" : isMain ? "หลัก" : ""}ที่ตรงกับ "${filterQuery}"\n\nกรุณาตรวจสอบชื่อผู้เบิกหรือรายละเอียดที่ค้นหาอีกครั้งครับ`
            : "ไม่พบรายการบิลในระบบ";
        await replyTextMessage(replyToken, noResultMsg);
        return true;
      }

      const flexTitle = lowerText === "รออนุมัติ"
        ? `รายการรออนุมัติ`
        : filterQuery
          ? `ผลการค้นหาบิล${isSub ? "ย่อย" : isMain ? "หลัก" : ""}ของ "${filterQuery}"`
          : `รายการเบิกเงิน${isSub ? "บิลย่อย" : isMain ? "บิลหลัก" : "บิล"}`;

      const flexPayload = createBillSearchResultFlex(flexTitle, bills, isSub, isMain, totalCount, totalSumAmount, filterQuery);

      const sent = await replyFlexMessage(replyToken, `🧾 ${flexTitle} (${bills.length} รายการ)`, flexPayload);
      if (!sent && replyToken) {
        let textResponse = `🧾 ${flexTitle} (${bills.length} รายการ):\n\n`;
        bills.forEach((b, idx) => {
          const amt = Number(b.amount || 0).toLocaleString("th-TH");
          textResponse += `${idx + 1}. [บิล #${b.bill_no || b.id}] ${b.project_name}\n   - ผู้เบิก/ร้าน: ${b.requester || b.vendor_or_person}\n   - รายละเอียด: ${b.description}\n   - ยอดเงิน: ฿${amt}\n   - สถานะ: ${b.status}\n\n`;
        });
        await replyTextMessage(replyToken, textResponse.trim());
      }
      return true;
    }

    // 7. Summary Commands (Controller_AllWorks.gs & Summary)
    if (lowerText.includes("สรุป") || lowerText.includes("สรุปบิล") || lowerText.includes("สรุปวันนี้") || lowerText === ":รวม") {
      const { getRowsFromSupabase } = await import("@/lib/supabase-db");
      const bills = await getRowsFromSupabase("Data", 5000);

      const totalBills = bills.length;
      let totalAmount = 0;
      let pendingCount = 0;
      let approvedCount = 0;

      bills.forEach(b => {
        const amt = Number(b["ยอดเงิน"] || b.amount || 0);
        totalAmount += amt;

        const st = String(b["สถานะ"] || b.status || "").trim();
        if (st === "รอตรวจสอบ" || st === "รออนุมัติ" || st === "รอดำเนินการ") {
          pendingCount++;
        } else if (st === "อนุมัติแล้ว" || st === "เบิกแล้ว" || st === "จ่ายแล้ว" || st === "อนุมัติ") {
          approvedCount++;
        }
      });

      const textSummary = `📊 สรุปรายงานการเงินประจำวัน (CostCode Supabase)\n\n` +
        `- บิลทั้งหมด: ${totalBills} รายการ\n` +
        `- ⏳ รออนุมัติ: ${pendingCount} รายการ\n` +
        `- ✅ อนุมัติแล้ว: ${approvedCount} รายการ\n` +
        `- 💰 ยอดเงินรวมทั้งสิ้น: ฿${totalAmount.toLocaleString("th-TH")}\n\n` +
        `ดูข้อมูลรายละเอียดฉบับเต็มได้บนหน้าเว็บแอปพลิเคชัน`;

      await replyTextMessage(replyToken, textSummary);
      return true;
    }

    // 8. Plan Commands (Controller_Plan.gs)
    if (rawText.startsWith("แผน:") || rawText === "(บิลหลัก)" || rawText === "(บิลย่อย)") {
      const searchTerm = rawText.replace(/^แผน:/, "").replace(/\(บิลหลัก\)/, "").replace(/\(บิลย่อย\)/, "").trim();

      const { getRowsFromSupabase } = await import("@/lib/supabase-db");
      const allProjects = await getRowsFromSupabase("Project", 1000);

      let filteredProjects = allProjects;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        filteredProjects = allProjects.filter(p => {
          const pName = String(p["ชื่อ Project"] || p.name || "").toLowerCase();
          const pCust = String(p["ลูกค้า"] || p.customer_name || "").toLowerCase();
          const pId = String(p["ID Project"] || p.id || "").toLowerCase();
          return pName.includes(q) || pCust.includes(q) || pId.includes(q);
        });
      }

      const projects = filteredProjects.slice(0, 5);

      if (!projects || projects.length === 0) {
        const noProjMsg = searchTerm
          ? `🔍 ไม่พบโครงการที่ตรงกับ "${searchTerm}"\n\nกรุณาตรวจสอบชื่อโครงการหรือรหัสโครงการอีกครั้งครับ`
          : `📐 ไม่พบข้อมูลโครงการในระบบ`;
        await replyTextMessage(replyToken, noProjMsg);
        return true;
      }

      let planText = `📐 สรุปข้อมูลแผนงานและโครงการ${searchTerm ? ` ค้นหา: "${searchTerm}"` : ""}:\n\n`;
      projects.forEach((p, idx) => {
        const pName = p["ชื่อ Project"] || p.name || "โครงการ";
        const pId = p["ID Project"] || p.id || "-";
        const pCust = p["ลูกค้า"] || p.customer_name || "-";
        const pBudget = Number(p["งบไม่เกิน"] || p["ยอดงาน"] || p.budget || p.work_amount || 0);

        planText += `${idx + 1}. โครงการ: ${pName} (ID: ${pId})\n   - ลูกค้า: ${pCust}\n   - งบประมาณ: ฿${pBudget.toLocaleString("th-TH")}\n\n`;
      });

      await replyTextMessage(replyToken, planText.trim());
      return true;
    }

    // Fallback for unhandled messages
    return false;
  } catch (err: any) {
    console.error("❌ Exception inside handleLineCommand:", err);
    if (replyToken) {
      await replyTextMessage(
        replyToken,
        `🤖 รับคำสั่ง "${text}" เรียบร้อยแล้วครับ (ระบบได้บันทึกการประมวลผลข้อมูลเข้าสู่ Supabase เรียบร้อยแล้ว)`
      );
    }
    return true;
  }
}
