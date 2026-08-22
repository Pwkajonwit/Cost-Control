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
  Phone
} from "lucide-react";
import { showConfirm } from "@/components/ToastProvider";

type SystemUser = {
  id: string;
  username: string;
  displayName: string;
  role: "Admin" | "Manager" | "User";
  status: "Active" | "Inactive";
  phone?: string;
  lineUserId?: string;
  pictureUrl?: string;
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
        setSaveResult({ success: true, message: "บันทึกข้อมูลผู้ใช้งานลง Supabase เรียบร้อยแล้ว!" });
      } else {
        setSaveResult({ success: false, message: data.error || "เกิดข้อผิดพลาดในการบันทึก" });
      }
    } catch (err: any) {
      setSaveResult({ success: false, message: err.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
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
    });
    setModalOpen(true);
  }

  function handleOpenEditModal(index: number) {
    setEditingIndex(index);
    setFormData({ ...users[index] });
    setModalOpen(true);
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
      nextUsers[editingIndex] = { ...formData, id: formData.username.trim() };
    } else {
      const newUser: SystemUser = {
        ...formData,
        id: formData.username.trim(),
        createdAt: new Date().toISOString().split("T")[0],
      };
      nextUsers = [newUser, ...users];
    }

    setUsers(nextUsers);
    setModalOpen(false);
    handleSaveUsersToDb(nextUsers);
  }

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search)) ||
      (u.lineUserId && u.lineUserId.toLowerCase().includes(search.toLowerCase())) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const adminCount = users.filter((u) => u.role === "Admin").length;
  const managerCount = users.filter((u) => u.role === "Manager").length;
  const lineLinkedCount = users.filter((u) => Boolean(u.lineUserId)).length;

  return (
    <div className="space-y-3.5 font-sans text-xs text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <h1 className="text-base text-slate-900 tracking-tight">จัดการผู้ใช้ระบบ</h1>
          <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200">
            {users.length} บัญชี
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md transition flex items-center gap-1.5 cursor-pointer shrink-0 text-xs"
        >
          <Plus size={14} />
          <span>เพิ่มผู้ใช้ใหม่</span>
        </button>
      </div>

      {saveResult && (
        <div
          className={`px-3 py-2 rounded-md border flex items-center justify-between gap-2 animate-in fade-in text-xs ${
            saveResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-1.5">
            {saveResult.success ? <CheckCircle2 size={15} /> : <ShieldAlert size={15} />}
            <span>{saveResult.message}</span>
          </div>
          <button type="button" onClick={() => setSaveResult(null)} className="text-slate-400 hover:text-slate-600 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-md border border-slate-200 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <Users size={15} />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 uppercase">ผู้ใช้ทั้งหมด</div>
            <div className="text-slate-900 truncate text-xs">{users.length} บัญชี</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-md border border-slate-200 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <Shield size={15} />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 uppercase">Admin</div>
            <div className="text-slate-900 truncate text-xs">{adminCount} บัญชี</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-md border border-slate-200 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <UserCheck size={15} />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 uppercase">Manager</div>
            <div className="text-slate-900 truncate text-xs">{managerCount} บัญชี</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-md border border-slate-200 flex items-center gap-2.5 shadow-2xs">
          <div className="w-8 h-8 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 size={15} />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-500 uppercase">ผูก LINE แล้ว</div>
            <div className="text-emerald-800 truncate text-xs">{lineLinkedCount} บัญชี</div>
          </div>
        </div>
      </div>

      {/* User Accounts Table */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-2xs">
        {/* Table Topbar */}
        <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-white">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อผู้ใช้, Username หรือ เบอร์โทร..."
              className="w-full bg-white border border-slate-300 rounded px-8 py-1 text-slate-800 focus:outline-none focus:border-slate-500 font-normal text-xs"
            />
          </div>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1 cursor-pointer text-xs"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>รีเฟรช</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 text-xs">
                <th className="py-2.5 px-3 border-r border-slate-200 w-28">Username</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[170px]">ชื่อผู้ใช้งาน</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[130px]">เบอร์โทรศัพท์</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[140px]">LINE Status</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-28">สิทธิ์ (Role)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 w-24">สถานะ</th>
                <th className="py-2.5 px-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-slate-600" />
                    <span>กำลังโหลด...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                    ไม่พบข้อมูลผู้ใช้ระบบ
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => (
                  <tr key={u.id || idx} className="hover:bg-slate-50 transition-colors text-xs">
                    <td className="py-2 px-3 border-r border-slate-100 font-mono text-slate-800">{u.username}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-900">
                      <div className="flex items-center gap-2">
                        {u.pictureUrl ? (
                          <img src={u.pictureUrl} alt={u.displayName} className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs flex items-center justify-center shrink-0">
                            {u.displayName.charAt(0)}
                          </div>
                        )}
                        <span className="truncate">{u.displayName}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-600 font-mono text-xs">
                      {u.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={11} className="text-slate-400" />
                          <span>{u.phone}</span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100">
                      {u.lineUserId ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 border border-emerald-200" title={u.lineUserId}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>ผูกกับ LINE แล้ว</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          ยังไม่ผูก
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-800 border border-slate-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${
                          u.status === "Active"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
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
                          className="w-6 h-6 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                          title="แก้ไขผู้ใช้"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(idx)}
                          className="w-6 h-6 rounded border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                          title="ลบบัญชีผู้ใช้"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>



      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-md border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white text-slate-900">
              <h3 className="text-xs flex items-center gap-1.5">
                <Users size={14} className="text-slate-600" />
                <span>{editingIndex !== null ? "แก้ไขผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-4 space-y-3 max-h-[85vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-slate-700 block text-xs">Username / รหัส *</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="เช่น PT101"
                  className="w-full border border-slate-300 rounded px-2.5 py-1 font-mono text-slate-800 focus:outline-none focus:border-slate-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 block text-xs">ชื่อผู้ใช้งาน *</label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="เช่น คุณแมน"
                  className="w-full border border-slate-300 rounded px-2.5 py-1 text-slate-800 focus:outline-none focus:border-slate-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 block text-xs">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="081-234-5678"
                  className="w-full border border-slate-300 rounded px-2.5 py-1 font-mono text-slate-800 focus:outline-none focus:border-slate-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 block text-xs">LINE User ID (e.g. U123456...)</label>
                <input
                  type="text"
                  value={formData.lineUserId || ""}
                  onChange={(e) => setFormData({ ...formData, lineUserId: e.target.value })}
                  placeholder="LINE User ID (ปล่อยว่างไว้หากยังไม่ผูก)"
                  className="w-full border border-slate-300 rounded px-2.5 py-1 font-mono text-slate-800 focus:outline-none focus:border-slate-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 block text-xs">รูปโปรไฟล์ (URL)</label>
                <input
                  type="url"
                  value={formData.pictureUrl || ""}
                  onChange={(e) => setFormData({ ...formData, pictureUrl: e.target.value })}
                  placeholder="https://profile.line-scdn.net/..."
                  className="w-full border border-slate-300 rounded px-2.5 py-1 font-mono text-slate-800 focus:outline-none focus:border-slate-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-700 block text-xs">สิทธิ์การใช้งาน</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-slate-500 text-xs"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="User">User</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 block text-xs">สถานะ</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-slate-500 text-xs"
                  >
                    <option value="Active">ใช้งานได้</option>
                    <option value="Inactive">ระงับใช้งาน</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 transition text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1 text-xs cursor-pointer"
                >
                  {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={14} />}
                  <span>บันทึก</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

