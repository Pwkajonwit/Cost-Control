"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  User,
  Users,
  Pencil,
  Trash2,
  X,
  Save,
  ShieldAlert,
  Phone,
  Crown,
  Check,
  ExternalLink,
  Copy,
  Lock,
  Ban,
  CheckCheck
} from "lucide-react";
import { showConfirm, showToast } from "@/components/ToastProvider";

export type SystemUserRole = "Admin" | "Admin_Approver" | "Admin_Closer" | "User" | "Manager" | "Approver";

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

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
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

  useEffect(() => {
    fetchUsers();
  }, []);

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
    setEditingIndex(null);
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

  function handleOpenEditModal(index: number) {
    setEditingIndex(index);
    const u = users[index];
    setFormData({
      ...u,
      isOwner: Boolean(u.isOwner),
      canApprove: Boolean(u.canApprove || u.role === "Admin_Approver"),
      canCloseBill: Boolean(u.canCloseBill || u.role === "Admin_Closer"),
      canDelete: u.canDelete !== undefined ? Boolean(u.canDelete) : (u.role !== "User"),
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

  async function handleDeleteUser(index: number) {
    const confirmed = await showConfirm(`คุณต้องการลบบัญชีผู้ใช้ "${users[index].displayName || users[index].username}" ใช่หรือไม่?`);
    if (!confirmed) return;
    const nextUsers = users.filter((_, i) => i !== index);
    setUsers(nextUsers);
    handleSaveUsersToDb(nextUsers);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.username.trim() || !formData.displayName.trim()) return;

    let nextUsers: SystemUser[];
    if (editingIndex !== null) {
      nextUsers = [...users];
      if (formData.isOwner) {
        nextUsers = nextUsers.map((u, i) => i === editingIndex ? u : { ...u, isOwner: false });
      }
      nextUsers[editingIndex] = { ...formData, id: formData.username.trim() };
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

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-3.5 py-1.5 bg-[#0b3531] hover:bg-[#072724] text-white rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 text-xs font-medium shadow-xs"
        >
          <Plus size={14} className="text-[#d4f54e]" />
          <span>เพิ่มผู้ใช้ใหม่</span>
        </button>
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
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs font-semibold">
                <th className="py-2.5 px-3 border-r border-slate-200 w-24">Username</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[150px]">ชื่อผู้ใช้งาน</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[110px]">เบอร์โทร</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[240px]">บทบาท & สิทธิ์การใช้งาน</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[150px]">LINE User ID</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-20">สถานะ</th>
                <th className="py-2.5 px-3 text-center w-20">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>กำลังโหลดข้อมูลผู้ใช้งาน...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                    ไม่พบข้อมูลผู้ใช้ระบบ
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
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
                            onClick={() => handleOpenEditModal(idx)}
                            className="p-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
                            title="แก้ไขข้อมูลและสิทธิ์"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(idx)}
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
                <span>{editingIndex !== null ? "แก้ไขผู้ใช้งาน & กำหนดสิทธิ์" : "เพิ่มผู้ใช้งานใหม่"}</span>
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
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition text-xs font-medium cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-[#0b3531] hover:bg-[#072724] text-white transition flex items-center gap-1.5 text-xs font-medium cursor-pointer shadow-xs"
                >
                  {saving ? <RefreshCw size={13} className="animate-spin text-[#d4f54e]" /> : <Save size={14} className="text-[#d4f54e]" />}
                  <span>บันทึกข้อมูล</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
