async function testTrace() {
  const enc = encodeURIComponent("รายชื่อ");
  // 1. Get current row for PT105
  const get1 = await fetch(`http://localhost:3000/api/rows?tableName=${enc}&search=PT105`);
  const data1 = await get1.json();
  const originalRow = data1.rows?.[0];
  console.log("1. Original Row in DB:", originalRow);

  // 2. Simulate what FormModal sends when editing nickname from 'ต้อม' to 'ต้อม (แก้ไขใหม่)'
  const formSubmitValues = {
    "รหัสพนักงาน": originalRow["รหัสพนักงาน"],
    "ชื่อเล่น": "ต้อม (แก้ไขใหม่)",
    "ชื่อ-นามสกุล": originalRow["ชื่อ-นามสกุล"],
    "เลขบัญชี": originalRow["เลขบัญชี"],
    "ธนาคาร": originalRow["ธนาคาร"] || "",
    "เบอร์โทร": originalRow["เบอร์โทร"] || "",
    "ที่อยู่": originalRow["ที่อยู่"] || "",
    "เลขที่บัตรประชาชน": originalRow["เลขที่บัตรประชาชน"] || "",
    "สิทธิ์การใช้งาน": originalRow["สิทธิ์การใช้งาน"] || "User"
  };

  console.log("2. Sending PATCH payload:", {
    tableName: "รายชื่อ",
    sheetRow: originalRow["รหัสพนักงาน"],
    values: formSubmitValues
  });

  const patchRes = await fetch("http://localhost:3000/api/rows", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tableName: "รายชื่อ",
      sheetRow: originalRow["รหัสพนักงาน"],
      values: formSubmitValues
    })
  });

  console.log("3. PATCH Response Status:", patchRes.status, await patchRes.json());

  // 4. Immediately fetch from API as if reloadRows() or page refresh occurred
  const get2 = await fetch(`http://localhost:3000/api/rows?tableName=${enc}&search=PT105&_t=${Date.now()}`);
  const data2 = await get2.json();
  console.log("4. Row after reloadRows:", data2.rows?.[0]);
}

testTrace().catch(console.error);
