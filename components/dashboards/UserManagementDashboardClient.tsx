"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Check,
  CheckCheck,
  CheckCircle2,
  Copy,
  Crown,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Lock,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  Upload,
  User,
  UserCheck,
  Users,
  X
} from "lucide-react";
import { showConfirm, showToast } from "@/components/ToastProvider";

export type SystemUserRole = "Admin" | "Admin_Approver" | "Admin_Closer" | "User" | "Manager" | "Approver";
export type SortField = "username" | "displayName" | "phone" | "role" | "lineUserId" | "status";
export type SortDirection = "asc" | "desc";

export type SystemUser = {
  id: string;
  username: string;
  displayName: string;
  role: SystemUserRole;
  status: "Active" | "Inactive";
  phone?: string;
  lineUserId?: string;
  pictureUrl?: string;
  isOwner?: boolean;        // 👑 เจ้าของระบบ (OWN / Admin)
  canApprove?: boolean;     // 🟢 มีสิทธิ์อนุมัติบิล
  canCloseBill?: boolean;   // 🔵 มีสิทธิ์ปิดบิล / Approve จ่ายเงิน
  canDelete?: boolean;      // 🗑️ มีสิทธิ์ลบข้อมูล (User = false)
  createdAt?: string;
};

export function UserManagementDashboardClient() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  // Modal State for Single User Create / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SystemUser>({
    id: "",
    username: "",
    displayName: "",
    role: "User",
    status: "Active",
    phone: "",
    lineUserId: "",
    pictureUrl: "",
    isOwner: false,
    canApprove: false,
    canCloseBill: false,
    canDelete: false,
  });

  // Modal State for CSV / Batch Import
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [parsedPreviewUsers, setParsedPreviewUsers] = useState<SystemUser[]>([]);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Sorting State
  const [sortField, setSortField] = useState<SortField | null>("username");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  function handleSort(field: SortField) {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  function handleDownloadTemplate() {
    const headers = [
      "รหัสพนักงาน/ID",
      "ชื่อแสดงผล/ชื่อเล่น",
      "สิทธิ์การใช้งาน (User/Admin/Admin_Approver/Admin_Closer)",
      "เบอร์โทรศัพท์",
      "LINE User ID (ถ้ามี)",
      "สถานะ (Active/Inactive)"
    ];

    const sampleRows = [
      ["PT101", "สมชาย ใจดี (ช่างเอก)", "User", "081-234-5678", "", "Active"],
      ["PT102", "สมหญิง รักงาน (หญิง)", "Admin_Approver", "089-987-6543", "U1234567890abcdef1234567890abcdef", "Active"],
      ["PT103", "วิชัย การช่าง (ชัย)", "Admin_Closer", "086-555-1234", "", "Active"],
      ["PT104", "มานะ ขยันยิ่ง (นะ)", "Admin", "084-111-2222", "", "Active"]
    ];

    const csvContent = [
      headers.join(","),
      ...sampleRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "user_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("success", "ดาวน์โหลดเทมเพลต user_import_template.csv เรียบร้อยแล้ว");
  }

  function handleImportTextChange(text: string) {
    setImportText(text);
    const parsed = parseImportText(text);
    setParsedPreviewUsers(parsed);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || "");
      handleImportTextChange(content);
    };
    reader.readAsText(file, "UTF-8");
    if (importFileInputRef.current) {
      importFileInputRef.current.value = "";
    }
  }

  async function handleConfirmImport() {
    if (parsedPreviewUsers.length === 0) {
      showToast("error", "ไม่พบข้อมูลที่ถูกต้องสำหรับนำเข้า");
      return;
    }

    let nextUsers: SystemUser[];
    if (importMode === "replace") {
      const confirmed = await showConfirm(`คุณเลือก "แทนที่ทั้งหมด" ระบบจะล้างรายชื่อเดิม ${users.length} บัญชี แล้วใช้รายชื่อใหม่ ${parsedPreviewUsers.length} บัญชี ใช่หรือไม่?`);
      if (!confirmed) return;
      nextUsers = [...parsedPreviewUsers];
    } else {
      const userMap = new Map<string, SystemUser>();
      users.forEach(u => userMap.set(u.id || u.username, u));

      parsedPreviewUsers.forEach(newU => {
        const key = newU.id || newU.username;
        if (userMap.has(key)) {
          const existing = userMap.get(key)!;
          userMap.set(key, {
            ...existing,
            ...newU,
            createdAt: existing.createdAt || newU.createdAt
          });
        } else {
          userMap.set(key, newU);
        }
      });
      nextUsers = Array.from(userMap.values());
    }

    setUsers(nextUsers);
    setImportModalOpen(false);
    setImportText("");
    setParsedPreviewUsers([]);
    await handleSaveUsersToDb(nextUsers);
    showToast("success", `นำเข้ารายชื่อผู้ใช้สำเร็จ ${parsedPreviewUsers.length} รายการ`);
  }

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error("Failed to fetch users:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveUsersToDb(updatedUsers: SystemUser[]) {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: updatedUsers }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveResult({
          success: true,
          message: "บันทึกข้อมูลผู้ใช้งานและแยกสิทธิ์ อนุมัติ / ปิดบิล / กรอกข้อมูล เรียบร้อยแล้ว!"
        });
        showToast("success", "บันทึกสิทธิ์ผู้ใช้งานและผู้อนุมัติ LINE เรียบร้อยแล้ว");
      } else {
        setSaveResult({ success: false, message: data.error || "เกิดข้อผิดพลาดในการบันทึก" });
        showToast("error", data.error || "เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (err: any) {
      setSaveResult({ success: false, message: err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
      showToast("error", err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSaving(false);
    }
  }

  function handleOpenCreateModal() {
    setEditingUserId(null);
    setFormData({
      id: `PT${100 + users.length + 1}`,
      username: `PT${100 + users.length + 1}`,
      displayName: "",
      role: "User",
      status: "Active",
      phone: "",
      lineUserId: "",
      pictureUrl: "",
      isOwner: false,
      canApprove: false,
      canCloseBill: false,
      canDelete: false,
    });
    setModalOpen(true);
  }

  function handleOpenEditModal(targetUser: SystemUser) {
    setEditingUserId(targetUser.id || targetUser.username);
    setFormData({
      ...targetUser,
      isOwner: Boolean(targetUser.isOwner),
      canApprove: Boolean(targetUser.canApprove || targetUser.role === "Admin_Approver"),
      canCloseBill: Boolean(targetUser.canCloseBill || targetUser.role === "Admin_Closer"),
      canDelete: targetUser.canDelete !== undefined ? Boolean(targetUser.canDelete) : (targetUser.role !== "User"),
    });
    setModalOpen(true);
  }

  // Auto preset permissions when selecting a role
  function handleRoleChange(selectedRole: SystemUserRole) {
    let canApprove = false;
    let canCloseBill = false;
    let canDelete = true;

    if (selectedRole === "Admin") {
      canApprove = false;
      canCloseBill = false;
      canDelete = true;
    } else if (selectedRole === "Admin_Approver" || selectedRole === "Approver") {
      canApprove = true;
      canCloseBill = false;
      canDelete = true;
    } else if (selectedRole === "Admin_Closer") {
      canApprove = true;
      canCloseBill = true;
      canDelete = true;
    } else if (selectedRole === "User") {
      canApprove = false;
      canCloseBill = false;
      canDelete = false; // User: กรอกข้อมูลอย่างเดียว ไม่มีสิทธิ์ลบ
    }

    setFormData((prev) => ({
      ...prev,
      role: selectedRole,
      canApprove,
      canCloseBill,
      canDelete,
    }));
  }

  async function handleDeleteUser(targetUser: SystemUser) {
    const confirmed = await showConfirm(`คุณต้องการลบบัญชีผู้ใช้ "${targetUser.displayName || targetUser.username}" ใช่หรือไม่?`);
    if (!confirmed) return;
    const targetKey = targetUser.id || targetUser.username;
    const nextUsers = users.filter((x) => (x.id || x.username) !== targetKey);
    setUsers(nextUsers);
    handleSaveUsersToDb(nextUsers);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.username.trim() || !formData.displayName.trim()) return;

    let nextUsers: SystemUser[];
    if (editingUserId !== null) {
      nextUsers = users.map((u) => {
        if ((u.id || u.username) === editingUserId) {
          return { ...formData, id: formData.username.trim() };
        }
        if (formData.isOwner) {
          return { ...u, isOwner: false };
        }
        return u;
      });
    } else {
      const newUser: SystemUser = {
        ...formData,
        id: formData.username.trim(),
        createdAt: new Date().toISOString().split("T")[0],
      };
      if (formData.isOwner) {
        nextUsers = users.map(u => ({ ...u, isOwner: false }));
        nextUsers = [newUser, ...nextUsers];
      } else {
        nextUsers = [newUser, ...users];
      }
    }

    setUsers(nextUsers);
    setModalOpen(false);
    handleSaveUsersToDb(nextUsers);
  }

  function copyText(text: string, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast("success", `คัดลอก ${label} แล้ว: ${text}`);
  }

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search)) ||
      (u.lineUserId && u.lineUserId.toLowerCase().includes(search.toLowerCase())) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0;
    let comparison = 0;

    switch (sortField) {
      case "username":
        comparison = (a.username || a.id || "").localeCompare(b.username || b.id || "", undefined, { numeric: true });
        break;
      case "displayName":
        comparison = (a.displayName || "").localeCompare(b.displayName || "", "th");
        break;
      case "phone":
        comparison = (a.phone || "").localeCompare(b.phone || "");
        break;
      case "role": {
        const getRoleRank = (u: SystemUser) => {
          if (u.isOwner) return 1;
          if (u.canCloseBill || u.role === "Admin_Closer") return 2;
          if (u.canApprove || u.role === "Admin_Approver" || u.role === "Approver") return 3;
          if (u.role === "Admin") return 4;
          return 5;
        };
        comparison = getRoleRank(a) - getRoleRank(b);
        if (comparison === 0) {
          comparison = (a.displayName || "").localeCompare(b.displayName || "", "th");
        }
        break;
      }
      case "lineUserId":
        comparison = (a.lineUserId || "").localeCompare(b.lineUserId || "");
        break;
      case "status":
        comparison = (a.status || "Active").localeCompare(b.status || "Active");
        break;
      default:
        comparison = 0;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const ownerUser = users.find((u) => u.isOwner || (u.role === "Admin" && u.lineUserId));
  const approversCount = users.filter((u) => Boolean(u.canApprove) || u.role === "Admin_Approver" || u.role === "Approver").length;
  const closersCount = users.filter((u) => Boolean(u.canCloseBill) || u.role === "Admin_Closer").length;
  const lineLinkedCount = users.filter((u) => Boolean(u.lineUserId)).length;

  return (
    <div className="space-y-4 font-sans text-xs text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <Users size={16} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <span>จัดการผู้ใช้ระบบ & กำหนดสิทธิ์</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-100 text-slate-700 border border-slate-200">
                {users.length} บัญชี
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              แยกสิทธิ์ 4 ระดับ: Admin ปกติ / Admin อนุมัติบิล / Admin ปิดบิล / User กรอกข้อมูลอย่างเดียว (ห้ามลบ)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg transition flex items-center gap-1.5 cursor-pointer text-xs font-normal"
            title="ดาวน์โหลดไฟล์แม่แบบ CSV สำหรับกรอกรายชื่อ"
          >
            <Download size={14} className="text-slate-500" />
            <span>ดาวน์โหลดเทมเพลต CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setImportModalOpen(true);
              setImportText("");
              setParsedPreviewUsers([]);
            }}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg transition flex items-center gap-1.5 cursor-pointer text-xs font-normal"
            title="นำเข้ารายชื่อผู้ใช้งานหลายรายการจากไฟล์หรือคัดลอกวาง"
          >
            <Upload size={14} className="text-emerald-700" />
            <span>นำเข้ารายชื่อ</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-3.5 py-1.5 bg-[#0b3531] hover:bg-[#072724] text-white rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 text-xs font-normal shadow-xs"
          >
            <Plus size={14} className="text-[#d4f54e]" />
            <span>เพิ่มผู้ใช้ใหม่</span>
          </button>
        </div>
      </div>

      {saveResult && (
        <div
          className={`px-3 py-2 rounded-lg border flex items-center justify-between gap-2 animate-in fade-in text-xs ${
            saveResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {saveResult.success ? <CheckCircle2 size={15} /> : <ShieldAlert size={15} />}
            <span className="font-medium">{saveResult.message}</span>
          </div>
          <button type="button" onClick={() => setSaveResult(null)} className="text-slate-400 hover:text-slate-600 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Stats Grid - 4 Roles Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Admin ปกติ */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
            <Shield size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 uppercase">Admin ปกติ</div>
            <div className="text-sm font-semibold text-purple-900 truncate">
              {users.filter(u => u.role === "Admin" && !u.canApprove && !u.canCloseBill).length} บัญชี
            </div>
          </div>
        </div>

        {/* Card 2: Admin อนุมัติ */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Check size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 uppercase">Admin อนุมัติบิล</div>
            <div className="text-sm font-semibold text-emerald-800 truncate">{approversCount} ท่าน</div>
          </div>
        </div>

        {/* Card 3: Admin ปิดบิล */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
            <CheckCheck size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 uppercase">Admin ปิดบิล</div>
            <div className="text-sm font-semibold text-blue-800 truncate">{closersCount} ท่าน</div>
          </div>
        </div>

        {/* Card 4: User กรอกข้อมูลอย่างเดียว */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <User size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 uppercase">User (กรอกอย่างเดียว)</div>
            <div className="text-sm font-semibold text-slate-800 truncate">
              {users.filter(u => u.role === "User" || (!u.canDelete && !u.canApprove)).length} บัญชี
            </div>
          </div>
        </div>
      </div>

      {/* User Accounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {/* Table Topbar */}
        <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อผู้ใช้, Username หรือ เบอร์โทร..."
              className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:border-slate-400 font-normal text-xs"
            />
          </div>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-emerald-600" : "text-slate-500"} />
            <span>รีเฟรช</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs font-normal">
                {/* 1. Username */}
                <th
                  onClick={() => handleSort("username")}
                  className="py-2.5 px-3 border-r border-slate-200 w-28 cursor-pointer select-none hover:bg-slate-100 transition-colors group"
                  title="คลิกเพื่อจัดเรียงตาม Username"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>USERNAME</span>
                    <span className="shrink-0 text-slate-400 group-hover:text-slate-700">
                      {sortField === "username" ? (
                        sortDirection === "asc" ? <ArrowUp size={12} className="text-emerald-700" /> : <ArrowDown size={12} className="text-emerald-700" />
                      ) : (
                        <ArrowUpDown size={11} className="opacity-30 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>

                {/* 2. ชื่อผู้ใช้งาน */}
                <th
                  onClick={() => handleSort("displayName")}
                  className="py-2.5 px-3 border-r border-slate-200 min-w-[150px] cursor-pointer select-none hover:bg-slate-100 transition-colors group"
                  title="คลิกเพื่อจัดเรียงตามชื่อผู้ใช้งาน"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>ชื่อผู้ใช้งาน</span>
                    <span className="shrink-0 text-slate-400 group-hover:text-slate-700">
                      {sortField === "displayName" ? (
                        sortDirection === "asc" ? <ArrowUp size={12} className="text-emerald-700" /> : <ArrowDown size={12} className="text-emerald-700" />
                      ) : (
                        <ArrowUpDown size={11} className="opacity-30 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>

                {/* 3. เบอร์โทร */}
                <th
                  onClick={() => handleSort("phone")}
                  className="py-2.5 px-3 border-r border-slate-200 min-w-[110px] cursor-pointer select-none hover:bg-slate-100 transition-colors group"
                  title="คลิกเพื่อจัดเรียงตามเบอร์โทร"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>เบอร์โทร</span>
                    <span className="shrink-0 text-slate-400 group-hover:text-slate-700">
                      {sortField === "phone" ? (
                        sortDirection === "asc" ? <ArrowUp size={12} className="text-emerald-700" /> : <ArrowDown size={12} className="text-emerald-700" />
                      ) : (
                        <ArrowUpDown size={11} className="opacity-30 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>

                {/* 4. บทบาท & สิทธิ์การใช้งาน */}
                <th
                  onClick={() => handleSort("role")}
                  className="py-2.5 px-3 border-r border-slate-200 min-w-[240px] cursor-pointer select-none hover:bg-slate-100 transition-colors group"
                  title="คลิกเพื่อจัดเรียงตามบทบาทและสิทธิ์"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>บทบาท & สิทธิ์การใช้งาน</span>
                    <span className="shrink-0 text-slate-400 group-hover:text-slate-700">
                      {sortField === "role" ? (
                        sortDirection === "asc" ? <ArrowUp size={12} className="text-emerald-700" /> : <ArrowDown size={12} className="text-emerald-700" />
                      ) : (
                        <ArrowUpDown size={11} className="opacity-30 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>

                {/* 5. LINE User ID */}
                <th
                  onClick={() => handleSort("lineUserId")}
                  className="py-2.5 px-3 border-r border-slate-200 min-w-[150px] cursor-pointer select-none hover:bg-slate-100 transition-colors group"
                  title="คลิกเพื่อจัดเรียงตาม LINE ID"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>LINE USER ID</span>
                    <span className="shrink-0 text-slate-400 group-hover:text-slate-700">
                      {sortField === "lineUserId" ? (
                        sortDirection === "asc" ? <ArrowUp size={12} className="text-emerald-700" /> : <ArrowDown size={12} className="text-emerald-700" />
                      ) : (
                        <ArrowUpDown size={11} className="opacity-30 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>

                {/* 6. สถานะ */}
                <th
                  onClick={() => handleSort("status")}
                  className="py-2.5 px-3 border-r border-slate-200 w-24 cursor-pointer select-none hover:bg-slate-100 transition-colors group"
                  title="คลิกเพื่อจัดเรียงตามสถานะ"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>สถานะ</span>
                    <span className="shrink-0 text-slate-400 group-hover:text-slate-700">
                      {sortField === "status" ? (
                        sortDirection === "asc" ? <ArrowUp size={12} className="text-emerald-700" /> : <ArrowDown size={12} className="text-emerald-700" />
                      ) : (
                        <ArrowUpDown size={11} className="opacity-30 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>

                {/* 7. จัดการ */}
                <th className="py-2.5 px-3 text-center w-20 font-normal text-slate-700">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-normal">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>กำลังโหลดข้อมูลผู้ใช้งาน...</span>
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 text-xs font-normal">
                    ไม่พบข้อมูลผู้ใช้ระบบ
                  </td>
                </tr>
              ) : (
                sortedUsers.map((u, idx) => {
                  const isUserOwner = Boolean(u.isOwner);
                  const isUserApprover = Boolean(u.canApprove) || u.role === "Admin_Approver" || u.role === "Approver";
                  const isUserCloser = Boolean(u.canCloseBill) || u.role === "Admin_Closer";
                  const canUserDelete = u.canDelete !== undefined ? Boolean(u.canDelete) : (u.role !== "User");

                  return (
                    <tr key={u.id || idx} className="hover:bg-slate-50/80 transition-colors text-xs">
                      <td className="py-2 px-3 border-r border-slate-100 font-mono text-slate-800 font-medium">
                        {u.username}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-100 text-slate-900">
                        <div className="flex items-center gap-2">
                          {u.pictureUrl ? (
                            <img src={u.pictureUrl} alt={u.displayName} className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center shrink-0">
                              {u.displayName ? u.displayName.charAt(0) : "U"}
                            </div>
                          )}
                          <span className="truncate font-medium">{u.displayName}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-100 text-slate-600 font-mono text-xs">
                        {u.phone ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={11} className="text-slate-400" />
                            <span>{u.phone}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-100">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Role Badge */}
                          {u.role === "Admin_Closer" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-blue-50 text-blue-700 border-blue-200">
                              Admin (Approve / ปิดบิล)
                            </span>
                          ) : (u.role === "Admin_Approver" || (u.role === "Admin" && isUserApprover)) ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                              Admin (อนุมัติ)
                            </span>
                          ) : u.role === "Admin" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-purple-50 text-purple-700 border-purple-200">
                              Admin (ปกติ)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold border bg-slate-100 text-slate-700 border-slate-200">
                              User (กรอกข้อมูล)
                            </span>
                          )}

                          {/* Owner Badge */}
                          {isUserOwner && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold" title="เจ้าของระบบ รับแจ้งเตือนหลัก">
                              <Crown size={10} className="text-amber-700" />
                              <span>เจ้าของระบบ</span>
                            </span>
                          )}

                          {/* Approver Badge */}
                          {isUserApprover && !isUserCloser && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium" title="ผู้อนุมัติบิลทาง LINE">
                              <Check size={10} className="text-emerald-600" />
                              <span>อนุมัติบิล</span>
                            </span>
                          )}

                          {/* Closer Badge */}
                          {isUserCloser && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-medium" title="ผู้ปิดบิล & จ่ายเงินทาง LINE">
                              <CheckCheck size={10} className="text-blue-600" />
                              <span>ปิดบิล</span>
                            </span>
                          )}

                          {/* Deletion Permission Badge */}
                          {!canUserDelete && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-medium" title="ไม่มีสิทธิ์ลบข้อมูล">
                              <Ban size={9} className="text-rose-600" />
                              <span>ห้ามลบ</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-100">
                        {u.lineUserId ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              onClick={() => copyText(u.lineUserId || "", "LINE User ID")}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                              title="คลิกเพื่อคัดลอก LINE ID"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span className="max-w-[90px] truncate">{u.lineUserId}</span>
                              <Copy size={10} className="text-emerald-500 ml-0.5" />
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200">
                            ยังไม่ผูก LINE
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-100">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            u.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          <span>{u.status === "Active" ? "ใช้งานได้" : "ระงับ"}</span>
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
                            title="แก้ไขข้อมูลและสิทธิ์"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="p-1 rounded border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                            title="ลบบัญชีผู้ใช้"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 text-slate-900">
              <h3 className="text-xs font-semibold flex items-center gap-2">
                <Users size={15} className="text-slate-700" />
                <span>{editingUserId !== null ? "แก้ไขผู้ใช้งาน & กำหนดสิทธิ์" : "เพิ่มผู้ใช้งานใหม่"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-4 space-y-3.5 max-h-[85vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 block text-xs font-medium">Username / รหัส *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="เช่น PT101"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-slate-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 block text-xs font-medium">ชื่อผู้ใช้งาน *</label>
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="เช่น คุณแมน"
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-slate-500 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 block text-xs font-medium">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="081-234-5678"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-slate-500 text-xs"
                />
              </div>

              {/* LINE User ID */}
              <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 block text-xs font-semibold">
                    LINE User ID (สำหรับรับแจ้งเตือน & อนุมัติ/ปิดบิล)
                  </label>
                  <span className="text-[10px] text-slate-400">พิมพ์ 'getid' ใน LINE</span>
                </div>
                <input
                  type="text"
                  value={formData.lineUserId || ""}
                  onChange={(e) => setFormData({ ...formData, lineUserId: e.target.value })}
                  placeholder="เช่น Ueb1f6ef3ef267b791da3588ed341e026"
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-slate-500 text-xs"
                />
                <p className="text-[10px] text-slate-500 leading-tight">
                  ใช้ส่งการ์ด Flex ขออนุมัติบิลเงินสด/ปิดบิล และแจ้งเตือนสรุปรายวันทาง LINE ส่วนตัว
                </p>
              </div>

              {/* 🌟 ROLE SELECTION WITH 4 PRESETS */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 block text-xs font-medium">บทบาทหลัก (Role)</label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleRoleChange(e.target.value as SystemUserRole)}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-slate-500 text-xs bg-white font-medium"
                  >
                    <option value="Admin">Admin (ปกติ) - ไม่มีสิทธิ์อนุมัติ/ปิดบิล</option>
                    <option value="Admin_Approver">Admin (อนุมัติ) - สิทธิ์อนุมัติบิล</option>
                    <option value="Admin_Closer">Admin (Approve / ปิดบิล) - สิทธิ์ปิดบิล</option>
                    <option value="User">User (ผู้ใช้ทั่วไป) - กรอกอย่างเดียว ห้ามลบ</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 block text-xs font-medium">สถานะบัญชี</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-slate-500 text-xs bg-white"
                  >
                    <option value="Active">ใช้งานได้ (Active)</option>
                    <option value="Inactive">ระงับใช้งาน (Inactive)</option>
                  </select>
                </div>
              </div>

              {/* 🌟 4 GRANULAR PERMISSION TOGGLES */}
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                  กำหนดสิทธิ์ละเอียด (Permission Switches)
                </div>

                {/* 1. System Owner Toggle */}
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.isOwner)}
                    onChange={(e) => setFormData({ ...formData, isOwner: e.target.checked })}
                    className="mt-0.5 accent-amber-600 rounded"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                      <Crown size={12} className="text-amber-600" />
                      <span>เจ้าของระบบ (System Owner / OWN)</span>
                    </span>
                    <p className="text-[10px] text-amber-700 leading-tight">
                      รับรายงานแจ้งเตือนการสร้างบิลใหม่ และสรุประบบประจำวันทาง LINE
                    </p>
                  </div>
                </label>

                {/* 2. Bill Approver Toggle */}
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.canApprove)}
                    onChange={(e) => setFormData({ ...formData, canApprove: e.target.checked })}
                    className="mt-0.5 accent-emerald-600 rounded"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                      <Check size={12} className="text-emerald-600" />
                      <span>สิทธิ์อนุมัติบิล (Admin อนุมัติบิล)</span>
                    </span>
                    <p className="text-[10px] text-emerald-700 leading-tight">
                      รับการ์ด Flex Message ขออนุมัติบิลเงินสด/ใบตั้งเบิก และกดอนุมัติผ่าน LINE ได้
                    </p>
                  </div>
                </label>

                {/* 3. Bill Closer Toggle */}
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.canCloseBill)}
                    onChange={(e) => setFormData({ ...formData, canCloseBill: e.target.checked })}
                    className="mt-0.5 accent-blue-600 rounded"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                      <CheckCheck size={12} className="text-blue-600" />
                      <span>สิทธิ์ปิดบิล (Admin Approve / ปิดบิล)</span>
                    </span>
                    <p className="text-[10px] text-blue-700 leading-tight">
                      รับการ์ด Flex ปิดงานบิล และกดยืนยันการจ่ายเงินสำเร็จผ่าน LINE ได้
                    </p>
                  </div>
                </label>

                {/* 4. Delete Record Toggle */}
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.canDelete)}
                    onChange={(e) => setFormData({ ...formData, canDelete: e.target.checked })}
                    className="mt-0.5 accent-slate-800 rounded"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      <Trash2 size={12} className="text-slate-700" />
                      <span>สิทธิ์ลบข้อมูล (Can Delete Records)</span>
                    </span>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      สามารถลบรายการบิล โครงการ หรือข้อมูลในระบบได้ (หากปิดไว้จะกรอกข้อมูลได้เท่านั้น ห้ามลบ)
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition text-xs font-normal cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-[#0b3531] hover:bg-[#072724] text-white transition flex items-center gap-1.5 text-xs font-normal cursor-pointer shadow-xs"
                >
                  {saving ? <RefreshCw size={13} className="animate-spin text-[#d4f54e]" /> : <Save size={14} className="text-[#d4f54e]" />}
                  <span>บันทึกข้อมูล</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📥 Modal: นำเข้ารายชื่อผู้ใช้งาน (Batch / CSV Import) */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-2xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Upload size={14} />
                </div>
                <div>
                  <h3 className="text-sm font-normal text-slate-900 m-0">นำเข้ารายชื่อผู้ใช้ระบบ (Import Users)</h3>
                  <p className="text-[11px] text-slate-500 font-normal m-0">
                    นำเข้าไฟล์ CSV หรือคัดลอกตารางจาก Excel / Google Sheets มาวาง
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 font-normal text-xs text-slate-700">
              {/* Template Download & File Upload Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="space-y-0.5">
                  <div className="text-xs font-normal text-slate-800">1. ใช้ไฟล์เทมเพลตตัวอย่าง</div>
                  <div className="text-[11px] text-slate-500">ดาวน์โหลดแม่แบบเพื่อกรอกรายชื่อพนักงานได้ถูกต้อง</div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer font-normal"
                >
                  <Download size={13} className="text-slate-600" />
                  <span>ดาวน์โหลดเทมเพลต .CSV</span>
                </button>
              </div>

              {/* 2. File Selector or Text Paste Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-normal text-slate-800">
                    2. เลือกไฟล์ หรือ วางข้อความข้อมูล
                  </label>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".csv, .txt, text/csv, text/plain"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => importFileInputRef.current?.click()}
                    className="text-xs text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer font-normal"
                  >
                    <FileSpreadsheet size={13} />
                    <span>เลือกไฟล์จากเครื่อง (.csv / .txt)</span>
                  </button>
                </div>

                <textarea
                  value={importText}
                  onChange={(e) => handleImportTextChange(e.target.value)}
                  placeholder={`วางข้อมูลที่นี่ (รองรับทั้ง CSV และคัดลอกตารางจาก Excel/Sheets) เช่น:\nPT101, สมชาย ใจดี, User, 081-234-5678, , Active\nPT102, สมหญิง รักงาน, Admin_Approver, 089-987-6543, U12345..., Active`}
                  rows={5}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-800 resize-y"
                />
              </div>

              {/* 3. Preview Section */}
              {parsedPreviewUsers.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-normal text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>พบข้อมูลที่สามารถนำเข้าได้ {parsedPreviewUsers.length} รายการ</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">ตรวจสอบความถูกต้องก่อนกดบันทึก</span>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-48 bg-white">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0 font-normal">
                        <tr>
                          <th className="py-1.5 px-2.5">#</th>
                          <th className="py-1.5 px-2.5">รหัส/ID</th>
                          <th className="py-1.5 px-2.5">ชื่อแสดงผล</th>
                          <th className="py-1.5 px-2.5">สิทธิ์ (Role)</th>
                          <th className="py-1.5 px-2.5">เบอร์โทร</th>
                          <th className="py-1.5 px-2.5">LINE ID</th>
                          <th className="py-1.5 px-2.5 text-center">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedPreviewUsers.map((u, idx) => (
                          <tr key={`${u.id}-${idx}`} className="hover:bg-slate-50">
                            <td className="py-1 px-2.5 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-1 px-2.5 font-mono text-slate-800">{u.id || u.username}</td>
                            <td className="py-1 px-2.5 text-slate-900">{u.displayName}</td>
                            <td className="py-1 px-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                u.role === "Admin_Closer" ? "bg-blue-100 text-blue-800" :
                                u.role === "Admin_Approver" ? "bg-emerald-100 text-emerald-800" :
                                u.role === "Admin" ? "bg-purple-100 text-purple-800" :
                                "bg-slate-100 text-slate-700"
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-1 px-2.5 text-slate-600">{u.phone || "-"}</td>
                            <td className="py-1 px-2.5 font-mono text-slate-400 truncate max-w-[100px]">{u.lineUserId || "-"}</td>
                            <td className="py-1 px-2.5 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${u.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                {u.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : importText.trim() ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2 font-normal">
                  <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                  <span>ไม่สามารถแปลงข้อมูลได้ กรุณาตรวจสอบรูปแบบข้อความ หรือใช้ไฟล์เทมเพลตตัวอย่าง</span>
                </div>
              ) : null}

              {/* 4. Import Mode Options */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="text-xs font-normal text-slate-800">3. รูปแบบการนำเข้า</div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-normal">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === "append"}
                      onChange={() => setImportMode("append")}
                      className="accent-slate-900"
                    />
                    <span>เพิ่มต่อท้าย / อัปเดตรายชื่อเดิม (แนะนำ)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-rose-700 font-normal">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                      className="accent-rose-600"
                    />
                    <span>แทนที่รายชื่อทั้งหมด (ลบของเดิมออก)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition text-xs font-normal cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={saving || parsedPreviewUsers.length === 0}
                onClick={handleConfirmImport}
                className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white transition flex items-center gap-1.5 text-xs font-normal cursor-pointer shadow-xs"
              >
                {saving ? <RefreshCw size={13} className="animate-spin text-white" /> : <Check size={14} className="text-white" />}
                <span>ยืนยันนำเข้าข้อมูล ({parsedPreviewUsers.length} รายการ)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function parseImportText(text: string): SystemUser[] {
  if (!text || !text.trim()) return [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstLine = lines[0].toLowerCase();
  const hasHeader =
    firstLine.includes("รหัส") ||
    firstLine.includes("username") ||
    firstLine.includes("id") ||
    firstLine.includes("ชื่อ") ||
    firstLine.includes("name") ||
    firstLine.includes("role") ||
    firstLine.includes("สิทธิ์");

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const parsedUsers: SystemUser[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const rawLine = dataLines[i];
    const cells = splitCsvLine(rawLine);
    if (!cells || cells.length === 0) continue;

    const id = (cells[0] || "").trim();
    const displayName = (cells[1] || cells[0] || "").trim();
    const rawRole = (cells[2] || "User").trim();
    const phone = (cells[3] || "").trim();
    const lineUserId = (cells[4] || "").trim();
    const rawStatus = (cells[5] || "Active").trim();

    if (!id && !displayName) continue;

    let role: SystemUserRole = "User";
    let canApprove = false;
    let canCloseBill = false;
    let canDelete = false;
    let isOwner = false;

    const lowerRole = rawRole.toLowerCase();
    if (lowerRole.includes("closer") || lowerRole.includes("ปิดบิล")) {
      role = "Admin_Closer";
      canApprove = true;
      canCloseBill = true;
      canDelete = true;
    } else if (lowerRole.includes("approver") || lowerRole.includes("อนุมัติ")) {
      role = "Admin_Approver";
      canApprove = true;
      canCloseBill = false;
      canDelete = true;
    } else if (lowerRole.includes("owner") || lowerRole.includes("เจ้าของ")) {
      role = "Admin";
      isOwner = true;
      canDelete = true;
    } else if (lowerRole.includes("admin") || lowerRole.includes("แอดมิน")) {
      role = "Admin";
      canDelete = true;
    } else {
      role = "User";
      canDelete = false;
    }

    const status =
      lowerRole.includes("inactive") || rawStatus.toLowerCase().includes("inactive") || rawStatus === "ปิดใช้งาน"
        ? "Inactive"
        : "Active";

    parsedUsers.push({
      id: id || `PT${100 + parsedUsers.length + 1}`,
      username: id || displayName,
      displayName: displayName || id,
      role,
      status,
      phone,
      lineUserId,
      isOwner,
      canApprove,
      canCloseBill,
      canDelete,
      createdAt: new Date().toISOString().split("T")[0],
    });
  }

  return parsedUsers;
}

function splitCsvLine(line: string): string[] {
  if (line.includes("\t")) {
    return line.split("\t").map((c) => c.trim().replace(/^["']|["']$/g, ""));
  }

  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        current += char;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ""));
  return result;
}
