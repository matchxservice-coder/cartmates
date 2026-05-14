// ─────────────────────────────────────────────────────────────────────────────
//  supabaseClient.js  —  CartMates  (v1.0)
//
//  วิธีใช้งาน:
//    1. สร้างไฟล์ .env ที่ root โปรเจกต์ แล้วใส่ค่า:
//         VITE_SUPABASE_URL=https://xxxx.supabase.co
//         VITE_SUPABASE_ANON_KEY=eyJ...
//    2. import { supabase } from "./supabaseClient"  ในทุก component ที่ต้องการ
//
//  ถ้าใช้ Create React App ให้เปลี่ยน import.meta.env.VITE_*
//  เป็น process.env.REACT_APP_* และตั้งชื่อ env ใหม่ตามนั้น
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "[CartMates] Missing Supabase env vars.\n" +
    "Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // เก็บ session ใน localStorage เพื่อให้ refresh แล้วยังล็อกอินอยู่
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ─── Helper: ดึง session ปัจจุบัน (ใช้ใน App.jsx ตอน boot) ──────────────────
export async function getActiveSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data?.session ?? null;
}
