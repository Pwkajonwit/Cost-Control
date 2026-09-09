"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeSync } from "@/lib/use-realtime-sync";

type UserPermissionSyncProps = {
  currentRole?: string;
  employeeId?: string;
};

export function UserPermissionSync({ currentRole, employeeId }: UserPermissionSyncProps) {
  const router = useRouter();
  const lastSyncRef = useRef<number>(0);
  const currentRoleRef = useRef<string>(currentRole || "");

  useEffect(() => {
    currentRoleRef.current = currentRole || "";
  }, [currentRole]);

  const syncPermissions = async () => {
    if (!employeeId) return;
    const now = Date.now();
    // Throttle checks to once every 3 seconds minimum
    if (now - lastSyncRef.current < 3000) return;
    lastSyncRef.current = now;

    try {
      const res = await fetch("/api/auth/sync", {
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const freshRole = data.user.role || "";
          if (currentRoleRef.current && freshRole && freshRole !== currentRoleRef.current) {
            currentRoleRef.current = freshRole;
            router.refresh();
          }
        }
      }
    } catch {
      // Ignore background fetch failure
    }
  };

  // 1. Check permissions when tab becomes visible or gets focused
  useEffect(() => {
    if (!employeeId) return;

    const handleFocus = () => {
      syncPermissions();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        syncPermissions();
      }
    });

    const handleCustomEvent = () => {
      syncPermissions();
    };
    window.addEventListener("user-permissions-updated", handleCustomEvent);
    window.addEventListener("schema-cache-invalidated", handleCustomEvent);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("user-permissions-updated", handleCustomEvent);
      window.removeEventListener("schema-cache-invalidated", handleCustomEvent);
    };
  }, [employeeId]);

  // 2. Listen to Supabase Realtime changes on master_members
  useRealtimeSync({
    channelName: "members_permission_sync",
    tables: ["master_members"],
    onSync: () => {
      syncPermissions();
    },
    debounceMs: 500,
  });

  return null;
}
