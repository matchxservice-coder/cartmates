// ═══════════════════════════════════════════════════════════════════════════
//  useRealtimeSync.js — CartMates Realtime Sync Hook
//
//  Subscribe Supabase realtime channel แบบ "Hybrid Strategy":
//    - UPDATE event → patch state ตรงๆ (เร็ว, smooth)
//    - INSERT/DELETE event → call onRefetch() (ดึงข้อมูลใหม่ทั้งก้อน)
//
//  ทำไม Hybrid?
//    UPDATE บ่อยและ smooth UI สำคัญ — เช่น staff เปลี่ยน status parcel
//    INSERT/DELETE ไม่บ่อย — แต่ต้องการ data ที่ถูก 100% (เช่น JOIN
//    กับตารางอื่นเหมือน parcel_photos, shipment_boxes)
//
//  Usage (CartMatesDashboard):
//    useRealtimeSync({
//      table: "parcels",
//      filter: `member_id=eq.${user.id}`,
//      setState: setParcels,
//      onRefetch: fetchAll,
//      transformRow: (row) => ({ ...normalizeParcel(row) }),
//      enabled: !!user?.id,
//    });
//
//  Usage (StaffDashboard):
//    useRealtimeSync({
//      table: "parcels",
//      // ไม่มี filter → ดึงทุก row (RLS อนุญาต staff อยู่แล้ว)
//      setState: setParcels,
//      onRefetch: fetchData,
//      transformRow: normalizeParcel,
//      enabled: true,
//    });
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

/**
 * @param {Object}   options
 * @param {string}   options.table         - ชื่อตาราง เช่น "parcels"
 * @param {string}  [options.filter]       - PostgREST filter expression เช่น "member_id=eq.uuid"
 * @param {Function} options.setState      - state setter (เช่น setParcels)
 * @param {Function} options.onRefetch     - callback เมื่อต้อง refetch (INSERT/DELETE)
 * @param {Function} [options.transformRow]- map DB row → state shape (default: identity)
 * @param {boolean}  [options.enabled]     - เปิด/ปิด subscription (default: true)
 * @param {string}   [options.idField]     - field name ของ primary key (default: "id")
 * @param {string}   [options.debugLabel]  - prefix สำหรับ console log (default: table name)
 */
export function useRealtimeSync({
  table,
  filter,
  setState,
  onRefetch,
  transformRow = (r) => r,
  enabled = true,
  idField = "id",
  debugLabel,
}) {
  // เก็บ latest callbacks ใน ref → ไม่ต้อง unsubscribe/resubscribe ทุกครั้งที่ parent re-render
  const setStateRef    = useRef(setState);
  const onRefetchRef   = useRef(onRefetch);
  const transformRef   = useRef(transformRow);

  useEffect(() => {
    setStateRef.current  = setState;
    onRefetchRef.current = onRefetch;
    transformRef.current = transformRow;
  }, [setState, onRefetch, transformRow]);

  useEffect(() => {
    if (!enabled) return;

    const label = debugLabel || `[realtime:${table}]`;
    const channelName = `rt-${table}-${filter || "all"}-${Date.now()}`;

    const channel = supabase.channel(channelName);

    const config = {
      event: "*",
      schema: "public",
      table,
      ...(filter ? { filter } : {}),
    };

    channel.on("postgres_changes", config, (payload) => {
      const { eventType, new: newRow, old: oldRow } = payload;

      try {
        if (eventType === "UPDATE") {
          // ── Hybrid: PATCH ─────────────────────────────────────
          // หา row เดิมแล้ว update ให้ตรงด้วย transformRow
          const transformed = transformRef.current(newRow);
          setStateRef.current((prev) => {
            if (!Array.isArray(prev)) return prev;
            const idx = prev.findIndex((r) => r[idField] === newRow[idField]);
            if (idx === -1) {
              // row ที่ update ไม่มีใน state — อาจเป็นการเปลี่ยน filter
              // (เช่น parcel ของลูกค้า A ถูก reassign ไปลูกค้า B)
              // ไม่ต้องทำอะไร — ให้ refetch ครั้งหน้าจัดการ
              return prev;
            }
            const next = [...prev];
            // Merge เพื่อกัน field ที่ frontend คำนวณเอง (เช่น days, p1, p2, p3)
            // หายตอน patch — ใส่ของเดิมก่อน แล้ว overlay ของใหม่
            next[idx] = { ...prev[idx], ...transformed };
            return next;
          });
          console.log(`${label} 🔄 UPDATE patched:`, newRow[idField]);
        }
        else if (eventType === "INSERT" || eventType === "DELETE") {
          // ── Hybrid: REFETCH ───────────────────────────────────
          // INSERT/DELETE มัก involve relations (parcel_photos, shipment_boxes)
          // ต้อง refetch เพื่อให้ JOIN ครบ
          console.log(`${label} ${eventType === "INSERT" ? "➕" : "➖"} ${eventType} → refetch`);
          onRefetchRef.current?.();
        }
      } catch (err) {
        console.error(`${label} handler error:`, err);
        // Fallback: refetch ทั้งก้อน เพื่อกัน state เพี้ยน
        onRefetchRef.current?.();
      }
    });

    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        console.log(`${label} ✅ subscribed (filter: ${filter || "none"})`);
      } else if (status === "CHANNEL_ERROR") {
        console.error(`${label} ❌ channel error:`, err);
      } else if (status === "TIMED_OUT") {
        console.warn(`${label} ⏰ timed out — Supabase may not have realtime enabled for this table`);
      }
    });

    // Cleanup
    return () => {
      console.log(`${label} 🛑 unsubscribed`);
      supabase.removeChannel(channel);
    };
    // ⚠️ deps คือสิ่งที่ทำให้ channel re-subscribe — เก็บแค่ identity ของ subscription
  }, [table, filter, enabled, idField, debugLabel]);
}
