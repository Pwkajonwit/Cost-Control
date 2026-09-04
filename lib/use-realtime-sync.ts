"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type UseRealtimeSyncOptions = {
  channelName: string;
  tables: string[];
  onSync: () => void;
  debounceMs?: number;
  customEvents?: string[];
  enabled?: boolean;
};

/**
 * High-performance hook for Supabase Realtime live sync with automatic event debouncing.
 * Prevents thundering-herd API requests and rapid UI re-renders on batch operations.
 */
export function useRealtimeSync({
  channelName,
  tables,
  onSync,
  debounceMs = 600,
  customEvents = ["bills-data-updated", "data-updated"],
  enabled = true,
}: UseRealtimeSyncOptions) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const triggerDebouncedSync = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onSyncRef.current();
      }, debounceMs);
    };

    // 1. Listen to Local Custom Window Events
    const registeredEvents = customEvents || [];
    registeredEvents.forEach((eventName) => {
      window.addEventListener(eventName, triggerDebouncedSync);
    });

    // 2. Subscribe to Supabase Realtime Channels
    const supabase = getSupabaseBrowserClient();
    let channel: any = null;

    if (supabase && tables.length > 0) {
      channel = supabase.channel(channelName);

      tables.forEach((tableName) => {
        channel = channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: tableName },
          () => {
            triggerDebouncedSync();
          }
        );
      });

      channel.subscribe();
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      registeredEvents.forEach((eventName) => {
        window.removeEventListener(eventName, triggerDebouncedSync);
      });
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [channelName, debounceMs, enabled, JSON.stringify(tables), JSON.stringify(customEvents)]);
}
