import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

// --- Assets & Constants ---
const LOGO = "CARTMATES";

const COUNTRIES = [
  "Argentina", "Australia", "Bolivia", "Brazil", "Canada", "China", "France", "Germany",
  "Hong Kong", "Indonesia", "Italy", "Japan", "Macau", "Malaysia", "Mexico", "Peru",
  "Philippines", "Singapore", "South Korea", "Taiwan", "Thailand", "United Kingdom",
  "United States", "Vietnam", "Other",
];

const CONTACT_CHANNELS = ["Line", "Instagram", "Twitter / X", "Facebook", "TikTok", "WeChat", "WhatsApp", "KakaoTalk", "Other"];

const INTERESTS = [
  { id: "bl_gl",  label: "Official BL/GL merchandise",  emoji: "🎭" },
  { id: "artist", label: "Artist brand merchandise",     emoji: "🌟" },
  { id: "food",   label: "Thai food & snacks",           emoji: "🍜" },
  { id: "beauty", label: "Thai beauty & cosmetics",      emoji: "💄" },
  { id: "fashion",label: "Thai fashion",                 emoji: "👗" },
];

const PACKAGES = [
  {
    id: "standard", name: "Standard", price: 900,
    color: "#0484CF", bg: "#e0f2fe",
    desc: "Perfect for getting started",
    features: [
      "Photo on box open (no unpack)",
      "Re-check available (+฿10/tracking)",
      "Basic warehouse management",
    ],
  },
  {
    id: "premium", name: "Premium", price: 1200,
    color: "#7c3aed", bg: "#ede9fe",
    desc: "Most popular choice",
    features: [
      "Everything in Standard",
      "Free re-check included",
      "2% shipping discount",
    ],
  },
  {
    id: "ultimates", name: "Ultimates", price: 1500,
    color: "#d97706", bg: "#fef3c7",
    desc: "Best value for power users",
    features: [
      "Full unpack photo check (no seal break)",
      "Free re-check included",
      "3% shipping discount",
      "Early access & special pricing",
    ],
  },
];

// ── Supabase: ตรวจสอบ username ว่าถูกใช้ไปแล้วหรือยัง ────────────────────────
//   ใช้ RPC fn_check_username_available (SECURITY DEFINER) แทน direct SELECT
//   เพราะ unauthenticated user (ตอน register) จะถูก RLS block จาก SELECT ตรง
//   Function checks profiles.username case-insensitive
async function checkUsernameAvailability(usernameToCheck) {
  const { data, error } = await supabase
    .rpc("fn_check_username_available", { p_username: usernameToCheck.trim() });

  if (error) throw error;
  return data === true; // true = available
}

// --- Sub-components ---
function StepDot({ n, active, done }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: done ? "#075BB0" : active ? "#075BB0" : "#e5e7eb",
        color: done || active ? "#fff" : "#9ca3af",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 800, transition: "all 0.3s",
        boxShadow: active ? "0 0 0 4px rgba(7,91,176,0.2)" : "none",
      }}>
        {done ? "✓" : n}
      </div>
    </div>
  );
}

// Username availability status badge
function UsernameStatus({ status }) {
  if (status === "idle" || status === "empty") return null;
  if (status === "checking") return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: "#6b7280" }}>
      <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", border: "2px solid #6b7280", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} />
      Checking availability...
    </div>
  );
  if (status === "available") return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
      <span>✓</span> Username is available!
    </div>
  );
  if (status === "taken") return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
      <span>✗</span> Username already taken. Please choose another.
    </div>
  );
  return null;
}

// Summary row for Step 3
function SummaryRow({ label, value, highlight }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "9px 0", borderBottom: "1px solid #f1f5f9",
      gap: 12,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0, paddingTop: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: highlight ? "#075BB0" : "#1f2937", fontWeight: highlight ? 700 : 500, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

// --- Main RegisterPage Component ---
//
// Props:
//   onBack            — go back to login/landing
//   onSubmitToStaff   — (legacy, optional)
//   defaultPackage    — 'soul_mates' | 'standard' | 'premium' | 'ultimates' | undefined
//                       If 'soul_mates' → Step 2 hides Team Mates tiers and locks pkg
//                       Otherwise → user picks from ST/PR/UL on Step 2 as before
//
export default function RegisterPage({ onBack, onSubmitToStaff, defaultPackage }) {
  const isSoulMates = defaultPackage === "soul_mates";

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Step 1 state
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState("idle"); // idle | empty | checking | available | taken
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [taxId, setTaxId] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [postcode, setPostcode] = useState("");
  const [channel, setChannel] = useState("");
  const [channelUser, setChannelUser] = useState("");

  // Step 2 state — pre-fill for Soul Mates so they skip tier selection
  const [pkg, setPkg] = useState(isSoulMates ? "soul_mates" : "");
  const [interests, setInterests] = useState([]);

  // Step 3 state
  const [agreeTC, setAgreeTC] = useState(false);
  const [agreeItems, setAgreeItems] = useState(false);

  // Username debounce ref
  const usernameDebounce = useRef(null);

  // Real-time username availability check (debounced 600ms)
  useEffect(() => {
    if (usernameDebounce.current) clearTimeout(usernameDebounce.current);

    if (!username.trim()) {
      setUsernameStatus("empty");
      return;
    }
    if (username.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    usernameDebounce.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(username);
        setUsernameStatus(available ? "available" : "taken");
        if (!available) {
          setErrors(prev => ({ ...prev, username: "Username already taken" }));
        } else {
          setErrors(prev => ({ ...prev, username: null }));
        }
      } catch {
        // network error → reset silently
        setUsernameStatus("idle");
      }
    }, 600);

    return () => clearTimeout(usernameDebounce.current);
  }, [username]);

  // Helper Styles
  const iSty = (err) => ({
    width: "100%", padding: "11px 14px",
    border: `1.5px solid ${err ? "#ef4444" : "#e5e7eb"}`,
    borderRadius: 10, fontSize: 14, outline: "none",
    fontFamily: "inherit", boxSizing: "border-box",
    transition: "border-color 0.15s", color: "#1f2937",
    background: "#fff",
  });

  const lSty = {
    display: "block", fontSize: 11, fontWeight: 700, color: "#374151",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
  };

  const enOnly = (val) => /^[a-zA-Z0-9 .,!?@#$%&*()+_=:;/|<>~`^\n\r\-\'\"\.]*$/.test(val) || val === "";

  const onFoc = (e) => { e.target.style.borderColor = "#075BB0"; };
  const onBlr = (e) => { e.target.style.borderColor = errors[e.target.name] ? "#ef4444" : "#e5e7eb"; };
  const errMsg = (key) => errors[key] && (
    <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{errors[key]}</div>
  );

  // Validation Logic
  const validateStep1 = () => {
    const e = {};
    if (!username.trim()) e.username = "Required";
    else if (usernameStatus === "taken") e.username = "Username already taken";
    else if (usernameStatus === "checking") e.username = "Please wait while we check username availability";
    if (!firstName.trim()) e.firstName = "Required";
    if (!lastName.trim()) e.lastName = "Required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Valid email required";
    if (!password) e.password = "Required";
    else if (password.length < 6) e.password = "Password must be at least 6 characters";
    else if (!/[A-Z]/.test(password)) e.password = "Must contain at least one uppercase letter (A–Z)";
    else if (!/[a-z]/.test(password)) e.password = "Must contain at least one lowercase letter (a–z)";
    else if (!/[0-9]/.test(password)) e.password = "Must contain at least one number (0–9)";
    if (!confirmPassword) e.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    if (!phone.trim()) e.phone = "Required";
    if (!country) e.country = "Please select a country";
    if (!address.trim()) e.address = "Required";
    if (!city.trim()) e.city = "Required";
    if (!postcode.trim()) e.postcode = "Required";
    if (!channel) e.channel = "Please select a channel";
    if (channel && !channelUser.trim()) e.channelUser = "Please enter your username/ID";
    return e;
  };

  const validateStep2 = () => {
    const e = {};
    if (!pkg) e.pkg = "Please select a package";
    if (interests.length === 0) e.interests = "Please select at least one interest";
    return e;
  };

  const validateStep3 = () => {
    const e = {};
    if (!agreeTC) e.agreeTC = "You must agree to Terms & Conditions";
    if (!agreeItems) e.agreeItems = "You must acknowledge the prohibited items list";
    return e;
  };

  const goNext = () => {
    let errs = {};
    if (step === 1) errs = validateStep1();
    if (step === 2) errs = validateStep2();
    if (step === 3) errs = validateStep3();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    if (step < 3) setStep(step + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // ── Pre-check: Username must still be available ──
      const isStillAvailable = await checkUsernameAvailability(username);
      if (!isStillAvailable) {
        setErrors({ general: "Sorry, this username was just taken by another user. Please pick a different one." });
        setUsernameStatus("taken");
        setLoading(false);
        return;
      }

      // ── Reserve username (DB-level lock for 24h) ──────────────────────
      // This blocks anyone else from reserving the same username while
      // this user is verifying their email.
      const { error: reserveError } = await supabase.rpc("fn_reserve_username", {
        p_username: username.trim(),
        p_email:    email.trim().toLowerCase(),
      });
      if (reserveError) {
        console.error("Reserve error:", reserveError);
        setErrors({ general: reserveError.message || "Could not reserve username. Please pick another." });
        setUsernameStatus("taken");
        setLoading(false);
        return;
      }
      console.log("🔒 Username reserved:", username);

      // ── Save form data to localStorage BEFORE signUp ─────────────────────
      // (RPC will be called AFTER user verifies email, when session is active)
      const pendingData = {
        username:       username.trim().toLowerCase(),
        first_name:     firstName.trim(),
        last_name:      lastName.trim(),
        email:          email.trim().toLowerCase(),
        phone:          phone.trim(),
        tax_id:         taxId.trim() || null,
        country:        country,
        address:        address.trim(),
        city:           city.trim(),
        state_province: stateProvince.trim() || null,
        postcode:       postcode.trim(),
        channel:        channel,
        channel_user:   channelUser.trim(),
        package:        pkg,
        interests:      interests,
      };
      localStorage.setItem("cm_pending_register", JSON.stringify(pendingData));
      console.log("💾 Saved pending register data to localStorage");

      // ── Step 1: สร้าง Supabase Auth user ─────────────────────────────────
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          // After clicking verify link in email, Supabase redirects here
          emailRedirectTo: window.location.origin + "/?verified=1",
          // ข้อมูลที่ต้องการให้ Supabase trigger บันทึกเข้า profiles table
          data: {
            username: username.trim().toLowerCase(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });

      if (signUpError) {
        // signUp failed — release the username reservation
        try {
          await supabase.rpc("fn_release_reservation", { p_email: email.trim().toLowerCase() });
          console.log("🔓 Username reservation released after signUp error");
        } catch (e) {
          console.warn("Failed to release reservation:", e);
        }

        // กรณี email ซ้ำ
        if (signUpError.message?.includes("already registered") ||
            signUpError.message?.includes("already been registered")) {
          setErrors({ email: "This email is already registered. Please login instead." });
          setStep(1);
        }
        // Rate limit (429)
        else if (signUpError.message?.includes("after") &&
                 signUpError.message?.includes("seconds")) {
          // Extract the wait time from message like "after 44 seconds"
          const m = signUpError.message.match(/(\d+)\s+seconds/);
          const waitSec = m ? m[1] : "60";
          setErrors({ general: `⏳ Please wait ${waitSec} seconds before trying again. (Supabase rate limit)` });
        }
        else {
          setErrors({ general: signUpError.message || "Registration failed. Please try again." });
        }
        setLoading(false);
        return;
      }

      const authUserId = signUpData?.user?.id;
      if (!authUserId) {
        console.log("⚠️ No authUserId returned, but no error — assuming email-verify flow");
        setSubmitted(true);
        setLoading(false);
        return;
      }

      console.log("✅ signUp success — authUserId:", authUserId, "— email verify sent");
      console.log("📝 fn_register_customer will be called after email verification");

      // ── Step 2: Sign out (best-effort — never block on this) ──────────
      // User must verify email before logging in.
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("signOut warning (non-blocking):", e);
      }

      console.log("✅ Showing 'Check your inbox' screen");
      setSubmitted(true);
    } catch (err) {
      console.error("❌ Register flow error (unexpected):", err);
      setSubmitted(true);  // still show check-inbox; email may have been sent
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (id) => {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
    if (errors.interests) setErrors(prev => ({ ...prev, interests: null }));
  };

  const selectedPkg = PACKAGES.find(p => p.id === pkg);

  // --- Render Success State ---
  if (submitted) {
    // ── Soul Mates: must verify email before login ──
    if (isSoulMates) {
      return (
        <div style={{
          minHeight: "100vh", background: "linear-gradient(145deg,#075BB0,#0484CF,#e0f2fe)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Outfit,system-ui,sans-serif", padding: 20,
        }}>
          <style>{`
            @keyframes bounceIn {
              0%{ transform:scale(0); opacity:0; }
              60%{ transform:scale(1.15); opacity:1; }
              100%{ transform:scale(1); }
            }
            @keyframes envWiggle {
              0%,100%{ transform:rotate(-3deg); }
              50%{ transform:rotate(3deg); }
            }
            .env-pop { animation: bounceIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both; }
            .env-wiggle { animation: envWiggle 2.4s ease-in-out infinite; transform-origin: center; }
          `}</style>
          <div style={{
            background: "#fff", borderRadius: 24, padding: 36, maxWidth: 460,
            width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}>
            <div className="env-pop" style={{ marginBottom: 16 }}>
              <div className="env-wiggle" style={{
                width: 96, height: 96, margin: "0 auto",
                background: "linear-gradient(135deg, #FFEB59, #fbbf24)",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 52, boxShadow: "0 12px 32px rgba(255,235,89,0.5)",
              }}>📬</div>
            </div>

            <div style={{ fontSize: 24, fontWeight: 900, color: "#075BB0", marginBottom: 8 }}>
              Check your inbox!
            </div>
            <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 6 }}>
              Hi <strong style={{ color: "#0F172A" }}>{firstName}</strong>! 🎉
            </div>
            <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 22 }}>
              We sent a verification link to:
            </div>

            {/* Email pill */}
            <div style={{
              background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)",
              border: "1.5px solid #bfdbfe", borderRadius: 999,
              padding: "10px 18px", marginBottom: 22,
              fontSize: 14, fontWeight: 800, color: "#075BB0",
              display: "inline-block", wordBreak: "break-all",
            }}>
              📧 {email}
            </div>

            {/* Steps */}
            <div style={{
              background: "#fef9c3", border: "1.5px solid #fde047", borderRadius: 14,
              padding: "16px 18px", marginBottom: 20, textAlign: "left",
            }}>
              <div style={{
                fontSize: 12, fontWeight: 800, color: "#854d0e", marginBottom: 10,
                textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center",
              }}>
                🐰 Next Steps
              </div>
              {[
                { num: "1", text: "Open the email we just sent you" },
                { num: "2", text: "Click the verify link inside" },
                { num: "3", text: "Come back here and log in with your username" },
              ].map((item) => (
                <div key={item.num} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0", fontSize:13, color:"#78350f" }}>
                  <span style={{ width:22, height:22, borderRadius:"50%", background:"#854d0e", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, flexShrink:0 }}>{item.num}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 18, lineHeight: 1.5 }}>
              💡 Can't find it? Check your spam folder or wait a minute — emails sometimes take a bit to arrive.
            </div>

            <button onClick={() => { window.location.href = "/"; }}
              style={{
                width: "100%", padding: "14px",
                background: "linear-gradient(135deg, #075BB0, #0484CF)",
                color: "#fff", border: "none", borderRadius: 12,
                fontSize: 15, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
                boxShadow: "0 6px 16px rgba(7,91,176,0.3)",
              }}>
              Got it — back to Home
            </button>
          </div>
        </div>
      );
    }

    // ── Team Mates: pending approval screen (original) ──
    return (
      <div style={{
        minHeight: "100vh", background: "linear-gradient(145deg,#075BB0,#0484CF,#e0f2fe)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Outfit,system-ui,sans-serif", padding: 20,
      }}>
        <div style={{
          background: "#fff", borderRadius: 24, padding: 36, maxWidth: 460,
          width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#075BB0", marginBottom: 8 }}>
            Application Submitted!
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.8, marginBottom: 18 }}>
            Thank you <strong>{username}</strong>!<br />
            Your application is now <strong style={{ color: "#d97706" }}>Pending Approval</strong>.
          </div>

          {/* ⭐ Contact instruction box */}
          <div style={{
            background: "#fff8e6", border: "1.5px solid #fde68a", borderRadius: 14,
            padding: "16px 18px", marginBottom: 20, textAlign: "left",
          }}>
            <div style={{
              fontSize: 12, fontWeight: 800, color: "#92400e", marginBottom: 10,
              textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center",
            }}>
              📨 Next Step — Contact Admin to Activate
            </div>
            <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.7, marginBottom: 12 }}>
              Please contact our admin team via any channel below to activate your account
              and complete your package payment:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <a href="https://line.me/R/ti/p/@cartmates" target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                  background: "#06c755", color: "#fff", borderRadius: 10,
                  fontSize: 12, fontWeight: 700, textDecoration: "none",
                }}>
                <span style={{ fontSize: 16 }}>💬</span>
                <span style={{ flex: 1 }}>Line: <strong>@cartmates</strong></span>
              </a>
              <a href="https://wa.me/66826929983" target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                  background: "#25d366", color: "#fff", borderRadius: 10,
                  fontSize: 12, fontWeight: 700, textDecoration: "none",
                }}>
                <span style={{ fontSize: 16 }}>📱</span>
                <span style={{ flex: 1 }}>WhatsApp: <strong>+66 82 692 9983</strong></span>
              </a>
              <a href="mailto:cs@cartmates.co"
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                  background: "#075BB0", color: "#fff", borderRadius: 10,
                  fontSize: 12, fontWeight: 700, textDecoration: "none",
                }}>
                <span style={{ fontSize: 16 }}>✉️</span>
                <span style={{ flex: 1 }}>Email: <strong>cs@cartmates.co</strong></span>
              </a>
            </div>
          </div>

          {onBack && (
            <button onClick={onBack}
              style={{
                width: "100%", padding: "12px", background: "#075BB0", color: "#fff",
                border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit",
              }}>
              Back to Login
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- Render Form Steps ---
  return (
    <div style={{
      minHeight: "100vh", background: "#f1f5f9",
      fontFamily: "Outfit,system-ui,sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .fade-up{animation:fadeUp .4s ease both}
        select option{color:#1f2937}
        input:focus,select:focus,textarea:focus{border-color:#075BB0 !important;box-shadow:0 0 0 3px rgba(7,91,176,0.08);}
      `}</style>

      {/* Header */}
      <div style={{
        background: "#075BB0", padding: "16px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 12px rgba(7,91,176,0.3)",
      }}>
        <span style={{ color: "#fff", fontWeight: 900, fontSize: 20 }}>{LOGO}</span>
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          {isSoulMates ? "🐰 Soul Mates Sign-up" : "👥 Team Mates Sign-up"}
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px 60px" }}>

        {/* Step Progress Bar */}
        <div style={{
          background: "#fff", borderRadius: 16, padding: "20px 24px",
          marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
            {[
              { n: 1, label: "Personal Info" },
              { n: 2, label: "Package" },
              { n: 3, label: "Review & Terms" },
            ].map((s, i) => (
              <div key={s.n} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <StepDot n={s.n} active={step === s.n} done={step > s.n} />
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: step >= s.n ? "#075BB0" : "#9ca3af",
                    whiteSpace: "nowrap",
                  }}>
                    {s.label}
                  </span>
                </div>
                {i < 2 && (
                  <div style={{
                    width: 60, height: 2,
                    background: step > s.n ? "#075BB0" : "#e5e7eb",
                    margin: "0 8px", marginBottom: 22,
                    transition: "background 0.3s",
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── STEP 1: Personal Info ── */}
        {step === 1 && (
          <div className="fade-up">
            <div style={{
              background: "#fff", borderRadius: 16, padding: 24,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#075BB0", marginBottom: 4 }}>
                Personal Information
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>
                All fields marked * are required
              </div>

              {/* ⚠ English-only notice */}
              <div style={{
                background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10,
                padding: "10px 14px", marginBottom: 20,
                display: "flex", alignItems: "flex-start", gap: 10,
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.6 }}>
                  <strong>English only</strong> — Please fill in all fields using <strong>English (A–Z)</strong> characters only. Thai, Japanese, Chinese, or other non-Latin scripts are not accepted.
                </div>
              </div>

              {/* Username */}
              <div style={{ marginBottom: 16 }}>
                <label style={lSty}>Username * (For Login)</label>
                <div style={{ position: "relative" }}>
                  <input
                    value={username}
                    onChange={e => {
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, "");
                      setUsername(val);
                      setErrors(prev => ({ ...prev, username: null }));
                    }}
                    name="username"
                    placeholder="e.g. niko_tanaka"
                    style={{
                      ...iSty(errors.username),
                      borderColor:
                        usernameStatus === "available" ? "#16a34a"
                        : usernameStatus === "taken" ? "#ef4444"
                        : errors.username ? "#ef4444"
                        : "#e5e7eb",
                    }}
                    onFocus={onFoc}
                    onBlur={e => {
                      if (usernameStatus === "available") e.target.style.borderColor = "#16a34a";
                      else if (usernameStatus === "taken" || errors.username) e.target.style.borderColor = "#ef4444";
                      else e.target.style.borderColor = "#e5e7eb";
                    }}
                    autoComplete="off"
                    maxLength={30}
                  />
                  {usernameStatus === "available" && (
                    <span style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      color: "#16a34a", fontWeight: 800, fontSize: 16,
                    }}>✓</span>
                  )}
                  {usernameStatus === "taken" && (
                    <span style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      color: "#ef4444", fontWeight: 800, fontSize: 16,
                    }}>✗</span>
                  )}
                </div>
                <UsernameStatus status={usernameStatus} />
                {errMsg("username")}
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                  Letters, numbers, underscores, hyphens and dots only. Min 3 characters.
                </div>
              </div>

              {/* Name Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={lSty}>First Name *</label>
                  <input
                    value={firstName}
                    onChange={e => { if (enOnly(e.target.value)) setFirstName(e.target.value); }}
                    name="firstName" placeholder="e.g. Niko"
                    style={iSty(errors.firstName)} onFocus={onFoc} onBlur={onBlr}
                  />
                  {errMsg("firstName")}
                </div>
                <div>
                  <label style={lSty}>Last Name *</label>
                  <input
                    value={lastName}
                    onChange={e => { if (enOnly(e.target.value)) setLastName(e.target.value); }}
                    name="lastName" placeholder="e.g. Tanaka"
                    style={iSty(errors.lastName)} onFocus={onFoc} onBlur={onBlr}
                  />
                  {errMsg("lastName")}
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={lSty}>Email Address *</label>
                <input
                  value={email} onChange={e => setEmail(e.target.value)}
                  name="email" type="email" placeholder="your@email.com"
                  style={iSty(errors.email)} onFocus={onFoc} onBlur={onBlr}
                />
                {errMsg("email")}
              </div>

              {/* Password */}
              <div style={{ marginBottom: 16 }}>
                <label style={lSty}>Create Password *</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setErrors(prev => ({ ...prev, password: null, confirmPassword: null }));
                    }}
                    name="password"
                    placeholder="Min 6 chars, A-Z, a-z, 0-9"
                    style={{ ...iSty(errors.password), paddingRight: 42 }}
                    onFocus={onFoc} onBlur={onBlr}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      color: "#9ca3af", fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center",
                    }}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                {/* Password strength indicators */}
                {password.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
                    {[
                      { ok: password.length >= 6,        label: "At least 6 characters" },
                      { ok: /[A-Z]/.test(password),      label: "Uppercase letter (A–Z)" },
                      { ok: /[a-z]/.test(password),      label: "Lowercase letter (a–z)" },
                      { ok: /[0-9]/.test(password),      label: "Number (0–9)" },
                    ].map(rule => (
                      <div key={rule.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                        <span style={{ color: rule.ok ? "#16a34a" : "#d1d5db", fontWeight: 800 }}>
                          {rule.ok ? "✓" : "○"}
                        </span>
                        <span style={{ color: rule.ok ? "#16a34a" : "#9ca3af", fontWeight: rule.ok ? 600 : 400 }}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {errMsg("password")}
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: 16 }}>
                <label style={lSty}>Confirm Password *</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => {
                      setConfirmPassword(e.target.value);
                      setErrors(prev => ({ ...prev, confirmPassword: null }));
                    }}
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    style={{
                      ...iSty(errors.confirmPassword),
                      paddingRight: 42,
                      borderColor:
                        confirmPassword && password === confirmPassword ? "#16a34a"
                        : errors.confirmPassword ? "#ef4444"
                        : "#e5e7eb",
                    }}
                    onFocus={onFoc}
                    onBlur={e => {
                      if (confirmPassword && password === confirmPassword) e.target.style.borderColor = "#16a34a";
                      else if (errors.confirmPassword) e.target.style.borderColor = "#ef4444";
                      else e.target.style.borderColor = "#e5e7eb";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    style={{
                      position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      color: "#9ca3af", fontSize: 16, lineHeight: 1, display: "flex", alignItems: "center",
                    }}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? "🙈" : "👁️"}
                  </button>
                  {confirmPassword && password === confirmPassword && (
                    <span style={{
                      position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)",
                      color: "#16a34a", fontWeight: 800, fontSize: 14,
                    }}>✓</span>
                  )}
                </div>
                {confirmPassword && password && password !== confirmPassword && !errors.confirmPassword && (
                  <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>Passwords do not match</div>
                )}
                {errMsg("confirmPassword")}
              </div>

              {/* Tax ID / VAT Number (Optional) */}
              <div style={{ marginBottom: 16 }}>
                <label style={lSty}>
                  Tax ID / VAT Number
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 500, color: "#9ca3af", textTransform: "none", letterSpacing: 0 }}>
                    (Optional — for customs / tax refund purposes)
                  </span>
                </label>
                <input
                  value={taxId}
                  onChange={e => { if (enOnly(e.target.value)) setTaxId(e.target.value); }}
                  name="taxId"
                  placeholder="e.g. TW12345678 or GB123456789"
                  style={iSty(false)}
                  onFocus={onFoc}
                  onBlur={e => { e.target.style.borderColor = "#e5e7eb"; }}
                />
              </div>

              {/* Phone */}
              <div style={{ marginBottom: 16 }}>
                <label style={lSty}>Phone Number *</label>
                <input
                  value={phone}
                  onChange={e => { if (/^[0-9+\- ()]*$/.test(e.target.value) || e.target.value === "") setPhone(e.target.value); }}
                  name="phone" placeholder="+81 90 1234 5678"
                  style={iSty(errors.phone)} onFocus={onFoc} onBlur={onBlr}
                />
                {errMsg("phone")}
              </div>

              {/* Country */}
              <div style={{ marginBottom: 16 }}>
                <label style={lSty}>Country *</label>
                <select
                  value={country}
                  onChange={e => { setCountry(e.target.value); setErrors(p => ({ ...p, country: null })); }}
                  name="country"
                  style={{ ...iSty(errors.country), color: country ? "#1f2937" : "#9ca3af" }}
                >
                  <option value="">Select your country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errMsg("country")}
              </div>

              {/* Address */}
              <div style={{ marginBottom: 12 }}>
                <label style={lSty}>Street Address *</label>
                <textarea
                  value={address}
                  onChange={e => { if (enOnly(e.target.value)) setAddress(e.target.value); }}
                  name="address" rows={2} placeholder="House no., street, building, floor..."
                  style={{ ...iSty(errors.address), resize: "vertical", lineHeight: 1.5 }}
                  onFocus={onFoc} onBlur={onBlr}
                />
                {errMsg("address")}
              </div>

              {/* City / State / Postcode */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={lSty}>City *</label>
                  <input
                    value={city}
                    onChange={e => { if (enOnly(e.target.value)) { setCity(e.target.value); setErrors(p => ({ ...p, city: null })); } }}
                    name="city" placeholder="e.g. Tokyo"
                    style={iSty(errors.city)} onFocus={onFoc} onBlur={onBlr}
                  />
                  {errMsg("city")}
                </div>
                <div>
                  <label style={lSty}>
                    State / Province
                    <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 500, color: "#9ca3af", textTransform: "none", letterSpacing: 0 }}>(optional)</span>
                  </label>
                  <input
                    value={stateProvince}
                    onChange={e => { if (enOnly(e.target.value)) setStateProvince(e.target.value); }}
                    name="stateProvince" placeholder="e.g. Kanto"
                    style={iSty(false)} onFocus={onFoc} onBlur={e => { e.target.style.borderColor = "#e5e7eb"; }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16, maxWidth: "50%", paddingRight: 6 }}>
                <label style={lSty}>Postcode / ZIP *</label>
                <input
                  value={postcode}
                  onChange={e => { if (/^[a-zA-Z0-9 \-]*$/.test(e.target.value)) { setPostcode(e.target.value); setErrors(p => ({ ...p, postcode: null })); } }}
                  name="postcode" placeholder="e.g. 150-0002"
                  style={iSty(errors.postcode)} onFocus={onFoc} onBlur={onBlr}
                />
                {errMsg("postcode")}
              </div>

              {/* Contact Channel */}
              <div style={{ marginBottom: 4 }}>
                <label style={lSty}>Preferred Contact Channel *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <select
                      value={channel}
                      onChange={e => { setChannel(e.target.value); setChannelUser(""); setErrors(p => ({ ...p, channel: null })); }}
                      style={{ ...iSty(errors.channel), color: channel ? "#1f2937" : "#9ca3af" }}
                    >
                      <option value="">Select channel</option>
                      {CONTACT_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errMsg("channel")}
                  </div>
                  <div>
                    <input
                      value={channelUser}
                      onChange={e => {
                        if (enOnly(e.target.value)) {
                          setChannelUser(e.target.value);
                          setErrors(p => ({ ...p, channelUser: null }));
                        }
                      }}
                      placeholder={channel ? `Your ${channel} ID/username` : "Username / ID"}
                      disabled={!channel}
                      style={{
                        ...iSty(errors.channelUser),
                        background: channel ? "#fff" : "#f9fafb",
                        color: channel ? "#1f2937" : "#9ca3af",
                      }}
                      onFocus={onFoc} onBlur={onBlr}
                    />
                    {errMsg("channelUser")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Package + Interests ── */}
        {step === 2 && (
          <div className="fade-up">
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#075BB0", marginBottom: 4 }}>
                {isSoulMates ? "Your Plan" : "Choose Your Package"}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>
                {isSoulMates
                  ? "You're signing up as a Soul Mates member — no monthly fee."
                  : "All packages include warehouse consolidation service"}
              </div>

              {isSoulMates ? (
                // ── Soul Mates locked card ──
                <div style={{
                  border: "2px solid #075BB0",
                  borderRadius: 14, padding: 18,
                  background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)",
                  boxShadow: "0 4px 16px rgba(7,91,176,0.15)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 22 }}>🐰</span>
                        <span style={{ fontSize: 17, fontWeight: 900, color: "#075BB0" }}>Soul Mates</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#075BB0", fontWeight: 700 }}>For individual fans · Pay per shipment</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#075BB0" }}>FREE</div>
                      <div style={{ fontSize: 10, color: "#0484CF", fontWeight: 700 }}>No monthly fee</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      "Free warehouse storage (30 days)",
                      "Photo verification on every parcel",
                      "Consolidate multiple orders into one shipment",
                      "Pay only when you ship",
                      "Shop the Mates Market with your account",
                    ].map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, color: "#1e3a8a" }}>
                        <span style={{ color: "#075BB0", fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, padding: "8px 10px", background: "rgba(255,255,255,0.7)", borderRadius: 8, fontSize: 11, color: "#075BB0", fontWeight: 700, textAlign: "center" }}>
                    🐰 You'll only pay for shipping when you ship. No commitments.
                  </div>
                </div>
              ) : (
                // ── Team Mates tier selector (original) ──
                <>
                  {PACKAGES.map(p => (
                    <div key={p.id} onClick={() => { setPkg(p.id); setErrors(prev => ({ ...prev, pkg: null })); }}
                      style={{
                        border: `2px solid ${pkg === p.id ? p.color : "#e5e7eb"}`,
                        borderRadius: 14, padding: 16, marginBottom: 12, cursor: "pointer",
                        background: pkg === p.id ? p.bg : "#fff",
                        transition: "all 0.2s",
                        boxShadow: pkg === p.id ? `0 4px 16px ${p.color}30` : "none",
                      }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: p.color, marginBottom: 2 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>{p.desc}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: p.color }}>฿{p.price.toLocaleString()}</div>
                          <div style={{ fontSize: 10, color: "#9ca3af" }}>/month</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {p.features.map(f => (
                          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, color: "#374151" }}>
                            <span style={{ color: p.color, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {errMsg("pkg")}
                </>
              )}
            </div>

            <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#075BB0", marginBottom: 4 }}>Product Interests *</div>
              {INTERESTS.map(item => {
                const selected = interests.includes(item.id);
                return (
                  <div key={item.id} onClick={() => toggleInterest(item.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                      borderRadius: 10, marginBottom: 8,
                      border: `1.5px solid ${selected ? "#075BB0" : "#e5e7eb"}`,
                      background: selected ? "#f0f7ff" : "#fff",
                      cursor: "pointer", transition: "all 0.15s",
                    }}>
                    <span style={{ fontSize: 16 }}>{item.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: selected ? 700 : 400, color: selected ? "#075BB0" : "#374151" }}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
              {errMsg("interests")}
            </div>
          </div>
        )}

        {/* ── STEP 3: Review + Terms ── */}
        {step === 3 && (
          <div className="fade-up">

            {/* ── Customer Summary Card ── */}
            <div style={{
              background: "#fff", borderRadius: 16, padding: 24,
              marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#075BB0", marginBottom: 2 }}>
                📋 Review Your Information
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>
                Please review your details before confirming. This information will be sent to the CartMates team for approval.
              </div>

              {/* Account Info Section */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 10, fontWeight: 800, color: "#075BB0", textTransform: "uppercase",
                  letterSpacing: "0.08em", marginBottom: 8, paddingBottom: 6,
                  borderBottom: "2px solid #e0f2fe",
                }}>
                  Account
                </div>
                <SummaryRow label="Username" value={`@${username}`} highlight />
                <SummaryRow label="Email" value={email} />
                <SummaryRow label="Full Name" value={`${firstName} ${lastName}`} />
                {taxId && <SummaryRow label="Tax ID / VAT" value={taxId} />}
              </div>

              {/* Contact Info */}
              <div style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 10, fontWeight: 800, color: "#075BB0", textTransform: "uppercase",
                  letterSpacing: "0.08em", marginBottom: 8, paddingBottom: 6,
                  borderBottom: "2px solid #e0f2fe",
                }}>
                  Contact & Location
                </div>
                <SummaryRow label="Phone" value={phone} />
                <SummaryRow label="Country" value={country} />
                <SummaryRow label="Street" value={address} />
                {city && <SummaryRow label="City" value={`${city}${stateProvince ? `, ${stateProvince}` : ""}`} />}
                {postcode && <SummaryRow label="Postcode" value={postcode} />}
                <SummaryRow label={channel} value={channelUser} />
              </div>

              {/* Package & Interests */}
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 800, color: "#075BB0", textTransform: "uppercase",
                  letterSpacing: "0.08em", marginBottom: 8, paddingBottom: 6,
                  borderBottom: "2px solid #e0f2fe",
                }}>
                  Package & Interests
                </div>
                {selectedPkg && (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: selectedPkg.bg, borderRadius: 10, padding: "10px 14px",
                    marginBottom: 10, border: `1.5px solid ${selectedPkg.color}40`,
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: selectedPkg.color }}>{selectedPkg.name}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{selectedPkg.desc}</div>
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: selectedPkg.color }}>
                      ฿{selectedPkg.price.toLocaleString()}<span style={{ fontSize: 10, fontWeight: 500, color: "#9ca3af" }}>/mo</span>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {interests.map(id => {
                    const item = INTERESTS.find(i => i.id === id);
                    return item ? (
                      <span key={id} style={{
                        background: "#f0f7ff", border: "1px solid #bfdbfe",
                        borderRadius: 20, padding: "4px 10px", fontSize: 11,
                        color: "#075BB0", fontWeight: 600,
                      }}>
                        {item.emoji} {item.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#075BB0", marginBottom: 12 }}>Terms & Conditions</div>
              <div style={{
                background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 12,
                padding: 16, height: 140, overflowY: "auto", fontSize: 12, lineHeight: 1.8, marginBottom: 16,
                color: "#374151",
              }}>
                <strong>1. Service Usage</strong><br />
                CartMates provides package consolidation and forwarding services from Thailand to your country. By registering, you agree to use the service for lawful purposes only.<br /><br />
                <strong>2. Membership Fee</strong><br />
                Monthly membership fees are charged as per your selected package. Fees are non-refundable once charged.<br /><br />
                <strong>3. Package Handling</strong><br />
                CartMates will consolidate and photograph packages as described in your plan. CartMates is not liable for damage caused during original shipment to our warehouse.<br /><br />
                <strong>4. Privacy</strong><br />
                Your personal information is stored securely and will not be shared with third parties without your consent, except as required by law.
              </div>
              <div
                onClick={() => { setAgreeTC(!agreeTC); setErrors(p => ({ ...p, agreeTC: null })); }}
                style={{ display: "flex", gap: 12, cursor: "pointer", alignItems: "center" }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                  border: `2px solid ${agreeTC ? "#075BB0" : "#d1d5db"}`,
                  background: agreeTC ? "#075BB0" : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {agreeTC && <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: "#374151" }}>I have read and agree to the Terms & Conditions</span>
              </div>
              {errMsg("agreeTC")}
            </div>

            {/* Prohibited Items */}
            <div style={{ background: "#fff", borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#b91c1c", marginBottom: 12 }}>⚠️ Prohibited Items</div>
              <div style={{
                background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 12,
                padding: 16, marginBottom: 16, fontSize: 12, lineHeight: 1.9, color: "#374151",
              }}>
                The following items are <strong style={{ color: "#b91c1c" }}>strictly prohibited</strong> from being shipped through CartMates:<br /><br />
                🚫 Explosives, firearms, and weapons of any kind<br />
                🚫 Illegal drugs and controlled substances<br />
                🚫 Flammable liquids and gases (e.g. aerosols, lighters)<br />
                🚫 Counterfeit or pirated goods<br />
                🚫 Live animals or plants<br />
                🚫 Perishable food items (unless pre-approved)<br />
                🚫 Items restricted by destination country import laws
              </div>
              <div
                onClick={() => { setAgreeItems(!agreeItems); setErrors(p => ({ ...p, agreeItems: null })); }}
                style={{ display: "flex", gap: 12, cursor: "pointer", alignItems: "center" }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                  border: `2px solid ${agreeItems ? "#b91c1c" : "#d1d5db"}`,
                  background: agreeItems ? "#b91c1c" : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {agreeItems && <span style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: "#374151" }}>I confirm my shipments will not include any prohibited items</span>
              </div>
              {errMsg("agreeItems")}
            </div>

            {/* Final confirmation notice */}
            {agreeTC && agreeItems && (
              <div style={{
                background: "linear-gradient(135deg,#f0f7ff,#e0f2fe)",
                border: "1.5px solid #bfdbfe", borderRadius: 14, padding: 16,
                marginBottom: 8, textAlign: "center",
                animation: "fadeUp 0.3s ease both",
              }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>✅</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#075BB0", marginBottom: 2 }}>
                  Ready to Submit!
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Your application will be sent to the CartMates team for approval.
                </div>
              </div>
            )}
          </div>
        )}

        {/* General submission error */}
        {errors.general && (
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA",
            borderRadius: 10, padding: "12px 16px", marginBottom: 12,
            fontSize: 13, color: "#B91C1C", lineHeight: 1.5,
          }}>
            ⚠️ {errors.general}
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {(step > 1 || onBack) && (
            <button
              onClick={step > 1 ? () => setStep(step - 1) : onBack}
              style={{
                padding: "13px 20px", border: "1.5px solid #e5e7eb",
                borderRadius: 12, background: "#fff", cursor: "pointer",
                fontSize: 14, fontWeight: 600, color: "#6b7280",
                fontFamily: "inherit",
              }}>
              ← Back
            </button>
          )}
          <button
            onClick={goNext}
            disabled={loading || (step === 1 && usernameStatus === "checking")}
            style={{
              flex: 1, padding: "13px",
              background: loading ? "#9ca3af" : "#075BB0",
              color: "#fff", border: "none", borderRadius: 12,
              fontSize: 14, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit", transition: "background 0.2s",
            }}>
            {loading ? "Submitting..." : step < 3 ? "Next →" : "✓ Confirm & Submit Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
