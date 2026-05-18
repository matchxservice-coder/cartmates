// ════════════════════════════════════════════════════════════════════════════
// Edge Function: line-push
// ════════════════════════════════════════════════════════════════════════════
//
// Purpose: Sends LINE push notification when a row is INSERTed into 
// notifications table (via Supabase Database Webhook).
//
// Flow:
//   1. Database webhook (set up in Supabase Dashboard) triggers this function
//   2. Function looks up profile.line_user_id + line_notify_enabled
//   3. If linked + enabled, sends LINE push message
//
// Deploy:
//   supabase functions deploy line-push
//
// Database Webhook setup:
//   Supabase Dashboard → Database → Webhooks → Create
//   - Name: notify-via-line
//   - Table: notifications
//   - Events: INSERT
//   - Method: POST
//   - URL: https://<project>.supabase.co/functions/v1/line-push
//   - Headers: { "Authorization": "Bearer <SERVICE_ROLE_KEY>" }
//
// Environment variables (set in Supabase Dashboard):
//   LINE_CHANNEL_ACCESS_TOKEN
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
// ════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") || "";
const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")              || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const LINE_API = "https://api.line.me/v2/bot";

// ── LINE API: push message to user ────────────────────────────────
async function linePush(userId: string, messages: any[]) {
  const res = await fetch(`${LINE_API}/message/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to: userId, messages }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LINE push failed (${res.status}): ${errText}`);
  }
  return await res.json();
}

// ── Build LINE message from notification ──────────────────────────
function buildMessage(notif: any) {
  const title = notif.title || "Notification";
  const body  = notif.body || "";
  const icon  = notif.icon || "🔔";
  
  // Plain text message for now — can upgrade to Flex message later
  return [{
    type: "text",
    text: `${icon} ${title}${body ? "\n\n" + body : ""}\n\n— CartMates 🐰`,
  }];
}

// ── Main handler ──────────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  
  try {
    const payload = await req.json();
    
    // Supabase database webhook payload format:
    // { type: "INSERT", table: "notifications", record: {...}, old_record: null, schema: "public" }
    if (payload.type !== "INSERT" || payload.table !== "notifications") {
      return new Response(JSON.stringify({ skipped: "not an INSERT to notifications" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    
    const notif = payload.record;
    if (!notif?.user_id) {
      return new Response(JSON.stringify({ skipped: "no user_id" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get profile + line settings
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("line_user_id, line_notify_enabled")
      .eq("id", notif.user_id)
      .single();
    
    if (profileErr || !profile) {
      return new Response(JSON.stringify({ skipped: "no profile" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    
    if (!profile.line_user_id) {
      return new Response(JSON.stringify({ skipped: "line not linked" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    
    if (profile.line_notify_enabled === false) {
      return new Response(JSON.stringify({ skipped: "line notify disabled" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Send to LINE
    const messages = buildMessage(notif);
    await linePush(profile.line_user_id, messages);
    
    return new Response(JSON.stringify({ ok: true, sent: messages.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[line-push] error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});