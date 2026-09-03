"use client";

import { useEffect, useState } from "react";
import { LogIn, User, AlertCircle, Building2, ShieldCheck, RefreshCw, Phone } from "lucide-react";
import { useLineAuth } from "@/components/LineAuthProvider";
import type { SheetRow } from "@/lib/types";

interface SystemUser {
  id?: string;
  username?: string;
  displayName?: string;
  role?: string;
  status?: string;
  phone?: string;
  lineUserId?: string;
  pictureUrl?: string;
}

export function LoginScreen({ peopleRows = [] }: { peopleRows?: SheetRow[] }) {
  const { loginWithLine, isLoading: isLineLoading } = useLineAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usersList, setUsersList] = useState<SystemUser[]>([]);
  const [companySettings, setCompanySettings] = useState({
    companyName: "CostLab Application",
    companySubTitle: "ระบบบริหารและติดตามงบประมาณก่อสร้าง",
    logoUrl: "",
  });

  useEffect(() => {
    // Load Company Settings
    const cached = localStorage.getItem("costlab_company_settings");
    if (cached) {
      try {
        setCompanySettings((prev) => ({ ...prev, ...JSON.parse(cached) }));
      } catch (e) {}
    }

    fetch("/api/company-settings")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.settings) {
          setCompanySettings((prev) => ({ ...prev, ...json.settings }));
        }
      })
      .catch(() => {});

    // Fetch System Users List (from /settings/users)
    fetch("/api/users")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.users)) {
          setUsersList(json.users);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = phoneNumber.trim();
    if (!rawInput) return;

    setLoading(true);
    setError("");

    const cleanInputDigits = rawInput.replace(/\D/g, "");

    // 1. Search in /settings/users list by phone number first, fallback to username/id
    let targetUser = usersList.find((u) => {
      if (u.status === "Inactive") return false;

      const userPhoneDigits = String(u.phone || "").replace(/\D/g, "");
      const usernameDigits = String(u.username || "").replace(/\D/g, "");
      const rawUsername = String(u.username || "").trim().toLowerCase();
      const rawId = String(u.id || "").trim().toLowerCase();
      const targetLower = rawInput.toLowerCase();

      return (
        (cleanInputDigits && userPhoneDigits && userPhoneDigits === cleanInputDigits) ||
        (cleanInputDigits && usernameDigits && usernameDigits === cleanInputDigits) ||
        rawUsername === targetLower ||
        rawId === targetLower
      );
    });

    // 2. Fallback: Search in master_members (peopleRows)
    if (!targetUser && peopleRows && peopleRows.length > 0) {
      const foundInPeople = peopleRows.find((p) => {
        const pPhoneDigits = String(p["เบอร์โทรศัพท์"] || p.phone || "").replace(/\D/g, "");
        const pIdDigits = String(p["id"] || p.id || "").replace(/\D/g, "");
        const rawPId = String(p["id"] || p.id || "").trim().toLowerCase();
        const rawNickname = String(p["ชื่อเล่น"] || p.nickname || "").trim().toLowerCase();
        const targetLower = rawInput.toLowerCase();

        return (
          (cleanInputDigits && pPhoneDigits && pPhoneDigits === cleanInputDigits) ||
          (cleanInputDigits && pIdDigits && pIdDigits === cleanInputDigits) ||
          rawPId === targetLower ||
          rawNickname === targetLower
        );
      });

      if (foundInPeople) {
        targetUser = {
          id: String(foundInPeople["id"] || foundInPeople.id || rawInput),
          username: String(foundInPeople["id"] || foundInPeople.id || rawInput),
          displayName: String(foundInPeople["ชื่อเล่น"] || foundInPeople["ชื่อ-นามสกุล"] || foundInPeople.full_name || rawInput),
          role: String(foundInPeople["สิทธิ์การใช้งาน"] || foundInPeople.role || "User"),
          status: "Active",
          phone: String(foundInPeople["เบอร์โทรศัพท์"] || foundInPeople.phone || ""),
        };
      }
    }

    if (!targetUser) {
      setError("ไม่พบเบอร์โทรศัพท์หรือชื่อผู้ใช้นี้ในระบบ (สามารถกรอก 'admin' หรือเบอร์โทรศัพท์ในระบบ)");
      setLoading(false);
      return;
    }

    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: targetUser.username || targetUser.id || rawInput,
          name: targetUser.displayName || targetUser.username || targetUser.id,
          role: targetUser.role || "User",
          pictureUrl: targetUser.pictureUrl || "",
          lineUserId: targetUser.lineUserId || "",
        }),
      });
      window.location.href = "/";
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#062e2b] flex items-center justify-center p-4 font-sans text-xs">
      {/* Compact Clean Card */}
      <div className="w-full max-w-sm bg-white rounded-lg p-6 shadow-2xl space-y-5 border border-slate-100">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 flex items-center justify-center">
            {companySettings.logoUrl ? (
              <img
                src={companySettings.logoUrl}
                alt="Logo"
                className="w-full h-full object-contain drop-shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[#0b3531] text-[#d4f54e] flex items-center justify-center shadow-xs">
                <Building2 size={22} />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-lg text-slate-900 leading-tight">
              {companySettings.companyName || "CostLab Executive"}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {companySettings.companySubTitle || "ระบบบริหารและติดตามงบประมาณก่อสร้าง"}
            </p>
          </div>
        </div>

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="phoneNumber" className="block text-xs text-slate-700 mb-1">
              เบอร์โทรศัพท์ (Phone Number)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Phone size={15} />
              </div>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                required
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (error) setError("");
                }}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-[#0b3531] text-xs transition"
                placeholder="ระบุเบอร์โทรศัพท์..."
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-1.5">
              <AlertCircle size={14} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading || !phoneNumber.trim()}
            className="w-full py-2 px-4 bg-[#0b3531] hover:bg-[#062e2b] text-white rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs shadow-sm"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin text-[#d4f54e]" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <LogIn size={14} className="text-[#d4f54e]" />
                <span>เข้าสู่ระบบ</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-3">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <span className="relative bg-white px-2.5 text-xs text-slate-400">หรือเข้าด้วย</span>
        </div>

        {/* LINE OA / LIFF Login Button */}
        <button
          type="button"
          onClick={loginWithLine}
          disabled={isLineLoading}
          className="w-full py-2.5 px-4 bg-[#06C755] hover:bg-[#05b34c] active:bg-[#049f43] text-white font-medium rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs text-xs"
        >
          <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M24 10.304c0-4.58-4.51-8.304-10.05-8.304-5.543 0-10.05 3.724-10.05 8.304 0 4.1 3.58 7.53 8.42 8.16.33.07.77.21.88.49.1.26.07.66.03.93l-.15.93c-.05.29-.24 1.13.99.62 1.23-.52 6.64-3.91 9.07-6.69 1.57-1.74 2.86-3.83 2.86-6.44zm-14.88 1.9h-1.87v-3.79h.61v3.18h1.26v.61zm2.39 0h-.61v-3.79h.61v3.79zm3.56 0h-.62l-1.39-2.07v2.07h-.61v-3.79h.62l1.39 2.06v-2.06h.61v3.79zm3.32-3.18h-1.25v.98h1.25v.6h-1.25v1.0h1.25v.6h-1.86v-3.79h1.86v.61z" />
          </svg>
          <span>{isLineLoading ? "กำลังเชื่อมต่อ LINE..." : "เข้าสู่ระบบด้วย LINE"}</span>
        </button>

        {/* Account Linking Help Tip */}
        <p className="text-xs text-slate-500 text-center leading-normal m-0">
          💡 เข้าใช้งานครั้งแรก ป๊อปอัปจะแสดงข้อมูลโปรไฟล์ LINE ของคุณ และให้ระบุเบอร์โทรศัพท์เพียงครั้งเดียวเพื่อผูกเข้ากับบัญชีในระบบ
        </p>

        {/* Footer Security Note */}
        <div className="pt-1 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck size={12} className="text-emerald-600" />
          <span>ระบบยืนยันตัวตนพนักงาน (6. ชื่อพนักงาน)</span>
        </div>
      </div>
    </div>
  );
}
