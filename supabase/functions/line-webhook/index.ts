// ════════════════════════════════════════════════════════════════════════════
// Edge Function: line-webhook
// ════════════════════════════════════════════════════════════════════════════
//
// Purpose: Receives webhook events from LINE Messaging API
//
// Events handled:
//   - follow      : User added bot as friend → send welcome message
//   - message     : User sent text → check if it's a 6-digit link code → link account
//   - unfollow    : User blocked bot → unlink account (set line_user_id = NULL)
//
// Deploy:
//   supabase functions deploy line-webhook --no-verify-jwt
//
// LINE Console Webhook URL:
//   https://<project>.supabase.co/functions/v1/line-webhook
//
// Environment variables (set in Supabase Dashboard):
//   LINE_CHANNEL_SECRET       — for signature verification
//   LINE_CHANNEL_ACCESS_TOKEN — for sending replies
//   SUPABASE_URL              — auto-set by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — auto-set by Supabase
// ════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const LINE_CHANNEL_SECRET       = Deno.env.get("LINE_CHANNEL_SECRET")       || "";
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") || "";
const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")              || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const LINE_API = "https://api.line.me/v2/bot";

// ── Verify LINE signature ─────────────────────────────────────────
function verifySignature(body: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET) return false;
  const hmac = createHmac("sha256", LINE_CHANNEL_SECRET);
  hmac.update(body);
  const computed = hmac.digest("base64");
  return computed === signature;
}

// ── LINE API: reply to a message ──────────────────────────────────
async function lineReply(replyToken: string, messages: any[]) {
  return await fetch(`${LINE_API}/message/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}

// ── LINE API: get user profile ────────────────────────────────────
async function lineGetProfile(userId: string) {
  const res = await fetch(`${LINE_API}/profile/${userId}`, {
    headers: { "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
  });
  if (!res.ok) return null;
  return await res.json();
}

// ── Event handlers ────────────────────────────────────────────────

async function handleFollow(event: any, supabase: any) {
  // User added bot as friend
  await lineReply(event.replyToken, [{
    type: "text",
    text: "🐰 Welcome to CartMates!\n\nTo link your account, please:\n1. Open the Profile page in the CartMates app\n2. Tap \"Connect LINE\"\n3. Send the 6-digit code here\n\nWe'll notify you about your parcel updates ✨",
  }]);
}

async function handleUnfollow(event: any, supabase: any) {
  // User blocked bot — unlink their account
  const lineUserId = event.source?.userId;
  if (!lineUserId) return;
  
  await supabase
    .from("profiles")
    .update({
      line_user_id: null,
      line_linked_at: null,
      line_display_name: null,
      line_notify_enabled: false,
    })
    .eq("line_user_id", lineUserId);
}

async function handleMessage(event: any, supabase: any) {
  if (event.message.type !== "text") return;
  
  const text = (event.message.text || "").trim();
  const lineUserId = event.source?.userId;
  if (!lineUserId) return;
  
  // Check if it's a 6-digit code
  const codeMatch = text.match(/^(\d{6})$/);
  
  if (!codeMatch) {
    // Not a code — give helpful message
    await lineReply(event.replyToken, [{
      type: "text",
      text: "🔢 Please send the 6-digit code from the CartMates app to link your account.\n\nIf you don't have a code yet, open the Profile page in the CartMates app → tap \"Connect LINE\".",
    }]);
    return;
  }
  
  const code = codeMatch[1];
  
  // Get LINE profile (display name)
  const lineProfile = await lineGetProfile(lineUserId);
  const displayName = lineProfile?.displayName || null;
  
  // Redeem token
  const { data, error } = await supabase
    .rpc("fn_redeem_line_link_token", {
      p_token: code,
      p_line_user_id: lineUserId,
      p_display_name: displayName,
    });
  
  if (error) {
    console.error("[LineWebhook] redeem error:", error);
    await lineReply(event.replyToken, [{
      type: "text",
      text: "⚠ Something went wrong. Please try again.",
    }]);
    return;
  }
  
  if (!data?.ok) {
    const reason = data?.error === "invalid_or_expired"
      ? "Code is invalid or expired. Please request a new code in the app."
      : "Something went wrong: " + (data?.error || "unknown");
    await lineReply(event.replyToken, [{
      type: "text",
      text: "⚠ " + reason,
    }]);
    return;
  }
  
  // Success!
  await lineReply(event.replyToken, [{
    type: "text",
    text: "✅ Connected successfully!\n\nYou'll now receive LINE notifications for:\n📦 Parcel arrived at warehouse\n🔍 Re-check completed\n✅ Ready to ship / Awaiting payment\n💰 Slip approved\n\nTo turn off notifications, go to the Profile page in the app.",
  }]);
}

// ── Main webhook handler ──────────────────────────────────────────

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  
  const body = await req.text();
  const signature = req.headers.get("x-line-signature") || "";
  
  // Verify signature
  if (!verifySignature(body, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }
  
  const payload = JSON.parse(body);
  const events = payload.events || [];
  
  // Init Supabase service-role client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Process each event
  for (const event of events) {
    try {
      switch (event.type) {
        case "follow":   await handleFollow(event, supabase); break;
        case "unfollow": await handleUnfollow(event, supabase); break;
        case "message":  await handleMessage(event, supabase); break;
        default:
          console.log("[LineWebhook] unhandled event:", event.type);
      }
    } catch (err) {
      console.error("[LineWebhook] event error:", err);
    }
  }
  
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});