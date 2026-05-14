import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

// ─── Asset paths — วางไฟล์รูปไว้ใน /public/assets/ ────────────────
// mascot  →  /assets/cartmates-mascot.png   (กระต่ายเข็นรถ)
// logo    →  /assets/cartmates-logo.png     (ตัวหนังสือ CARTMATES)
const MASCOT_SRC = "/assets/cartmates-mascot.png";
const LOGO_SRC   = "/assets/cartmates-logo.png";

export default function LoginPage({ onLogin, onRegister, onBack }) {
  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [isMobile, setIsMobile]         = useState(false);

  // ── Responsive detection ────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Login handler ───────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // 1. Resolve username → email + role + status
      const { data: lookupData, error: lookupError } = await supabase
        .rpc("fn_login_lookup", { p_username: username.trim().toLowerCase() });

      if (lookupError || !lookupData || lookupData.length === 0) {
        setError("Username not found. Please check and try again.");
        setLoading(false);
        return;
      }
      const { email, role, account_status } = lookupData[0];

      // 2. Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError("Incorrect password. Please try again.");
        setLoading(false);
        return;
      }

      // 3. Gate by status
      if (account_status === "pending_approval") {
        setError("⏳ Your account is pending approval. We'll notify you once activated.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      if (account_status === "suspended") {
        setError("Your account has been suspended. Please contact support.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // 4. Hand off to App router
      onLogin({ ...authData.user, role, account_status, username: username.trim() });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Demo login removed (production mode) ────────────────────────

  const S = isMobile ? mobileStyles : desktopStyles;

  return (
    <div style={S.root}>

      {/* ══ LEFT / TOP — Branding ════════════════════════════════ */}
      <div style={S.leftPanel}>
        <div style={S.circleOuter} />
        <div style={S.circleInner} />

        <div style={S.leftContent}>
          {/* Mascot → img file */}
          <div style={S.mascotWrap}>
            <img src={MASCOT_SRC} alt="CartMates bunny mascot" style={S.mascotImg} />
          </div>

          <div style={S.sloganBlock}>
            <h1 style={S.slogan}>
              We Pack. We Care.<br />We Deliver Worldwide.
            </h1>
            <p style={S.tagline}>
              Warehouse &amp; Fulfillment service in Thailand<br />
              International Shipping
            </p>
            {/* Pills — hidden on mobile */}
            {!isMobile && (
              <div style={desktopStyles.pillRow}>
                {["📦 Consolidation", "🌏 Global Shipping", "✅ Inspection"].map((t) => (
                  <span key={t} style={desktopStyles.pill}>{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ RIGHT / BOTTOM — Form ════════════════════════════════ */}
      <div style={S.rightPanel}>
        <div style={S.formCard}>

          {/* Back to Landing */}
          {onBack && (
            <button onClick={onBack} style={shared.backBtn}>
              ← Back to Home
            </button>
          )}

          {/* Logo → img file */}
          <div style={S.logoWrap}>
            <img src={LOGO_SRC} alt="CartMates" style={S.logoImg} />
          </div>

          <h2 style={S.welcome}>Welcome back 👋</h2>
          <p style={S.sub}>
            Sign in to your CartMates account.<br />
            Works for customers, staff, and managers.
          </p>

          {/* Status banner */}
          {error && (
            <div style={{
              ...shared.banner,
              ...(error.startsWith("⏳") ? shared.bannerPending : shared.bannerError),
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={shared.form}>
            {/* Username */}
            <div style={shared.fieldGroup}>
              <label style={shared.label}>USERNAME</label>
              <div style={shared.inputWrap}>
                <span style={shared.inputIcon}><UserIcon /></span>
                <input
                  type="text"
                  placeholder="your_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={shared.input}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            </div>

            {/* Password */}
            <div style={shared.fieldGroup}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={shared.label}>PASSWORD</label>
                <a href="#" style={shared.forgotLink} onClick={(e) => e.preventDefault()}>
                  Forgot password?
                </a>
              </div>
              <div style={shared.inputWrap}>
                <span style={shared.inputIcon}><LockIcon /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...shared.input, paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button type="button" style={shared.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              style={{ ...shared.signInBtn, opacity: loading ? 0.75 : 1 }}
              disabled={loading}
            >
              {loading ? "⏳ Signing in…" : "Sign In →"}
            </button>
          </form>

          <p style={shared.registerText}>
            New here?{" "}
            <button style={shared.registerLink} onClick={onRegister}>
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Desktop styles ───────────────────────────────────────────────
const desktopStyles = {
  root: {
    display: "flex",
    flexDirection: "row",
    minHeight: "100vh",
    fontFamily: "'Nunito', 'Poppins', sans-serif",
  },
  leftPanel: {
    position: "relative",
    flex: "0 0 44%",
    background: "linear-gradient(145deg, #1A56C4 0%, #3B9EE8 60%, #5BBCF5 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  circleOuter: {
    position: "absolute",
    width: 500, height: 500,
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.15)",
    top: "50%", left: "50%",
    transform: "translate(-50%,-50%)",
    pointerEvents: "none",
  },
  circleInner: {
    position: "absolute",
    width: 360, height: 360,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.08)",
    top: "50%", left: "50%",
    transform: "translate(-50%,-50%)",
    pointerEvents: "none",
  },
  leftContent: {
    position: "relative",
    zIndex: 1,
    textAlign: "center",
    padding: "40px 48px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
  },
  sloganBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  mascotWrap: {
    width: 220, height: 220,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.22))",
  },
  mascotImg: {
    width: "100%", height: "100%",
    objectFit: "contain",
  },
  slogan: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 28,
    fontWeight: 900,
    color: "#FFEB59",
    lineHeight: 1.35,
    margin: 0,
    letterSpacing: "-0.3px",
    textShadow: "0 2px 10px rgba(0,0,0,0.2)",
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.88)",
    margin: 0,
    lineHeight: 1.7,
  },
  pillRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  pill: {
    background: "rgba(255,255,255,0.18)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    padding: "5px 14px",
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.32)",
    letterSpacing: "0.3px",
  },
  rightPanel: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#F8FAFF",
    padding: "40px 24px",
  },
  formCard: {
    width: "100%",
    maxWidth: 440,
    background: "#fff",
    borderRadius: 20,
    boxShadow: "0 4px 40px rgba(26,86,196,0.09), 0 1px 4px rgba(0,0,0,0.04)",
    padding: "40px 44px",
    border: "1px solid rgba(26,86,196,0.08)",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 28,
  },
  logoImg: { height: 48, width: "auto", objectFit: "contain" },
  welcome: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 26, fontWeight: 900,
    color: "#1A1F3A",
    margin: "0 0 6px",
  },
  sub: {
    fontSize: 13.5,
    color: "#6B7494",
    margin: "0 0 24px",
    lineHeight: 1.6,
  },
};

// ─── Mobile styles ────────────────────────────────────────────────
const mobileStyles = {
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    fontFamily: "'Nunito', 'Poppins', sans-serif",
  },
  leftPanel: {
    position: "relative",
    background: "linear-gradient(145deg, #1A56C4 0%, #3B9EE8 80%)",
    overflow: "hidden",
    padding: "28px 20px 24px",
  },
  circleOuter: {
    position: "absolute",
    width: 280, height: 280,
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.12)",
    top: "50%", left: "50%",
    transform: "translate(-50%,-50%)",
    pointerEvents: "none",
  },
  circleInner: {
    position: "absolute",
    width: 190, height: 190,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.07)",
    top: "50%", left: "50%",
    transform: "translate(-50%,-50%)",
    pointerEvents: "none",
  },
  leftContent: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  sloganBlock: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  mascotWrap: {
    width: 96, height: 96,
    flexShrink: 0,
    filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))",
  },
  mascotImg: {
    width: "100%", height: "100%",
    objectFit: "contain",
  },
  slogan: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 17,
    fontWeight: 900,
    color: "#FFEB59",
    lineHeight: 1.35,
    margin: 0,
    textShadow: "0 1px 6px rgba(0,0,0,0.18)",
  },
  tagline: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.84)",
    margin: 0,
    lineHeight: 1.6,
  },
  rightPanel: {
    flex: 1,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    background: "#F8FAFF",
    padding: "20px 16px 40px",
  },
  formCard: {
    width: "100%",
    maxWidth: 440,
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 4px 28px rgba(26,86,196,0.09)",
    padding: "28px 22px",
    border: "1px solid rgba(26,86,196,0.08)",
  },
  logoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 18,
  },
  logoImg: { height: 38, width: "auto", objectFit: "contain" },
  welcome: {
    fontFamily: "'Nunito', sans-serif",
    fontSize: 21, fontWeight: 900,
    color: "#1A1F3A",
    margin: "0 0 4px",
  },
  sub: {
    fontSize: 12.5,
    color: "#6B7494",
    margin: "0 0 18px",
    lineHeight: 1.6,
  },
};

// ─── Shared styles (screen-size independent) ──────────────────────
const shared = {
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "none",
    border: "none",
    color: "#6B7280",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    padding: "0 0 16px 0",
    fontFamily: "inherit",
    letterSpacing: 0.2,
  },
  banner: {
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 16,
    fontSize: 13,
    lineHeight: 1.5,
  },
  bannerError: {
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    color: "#B91C1C",
  },
  bannerPending: {
    background: "#FFF7ED",
    border: "1px solid #FED7AA",
    color: "#9A3412",
  },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 10.5, fontWeight: 800, color: "#8A91B0", letterSpacing: "1.2px" },
  inputWrap: { position: "relative", display: "flex", alignItems: "center" },
  inputIcon: {
    position: "absolute", left: 14,
    display: "flex", alignItems: "center",
    color: "#9CA3C0", pointerEvents: "none",
  },
  input: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    border: "1.5px solid #E2E8F5",
    background: "#F8FAFF",
    fontSize: 14.5,
    color: "#1A1F3A",
    paddingLeft: 44,
    paddingRight: 16,
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  eyeBtn: {
    position: "absolute", right: 12,
    background: "none", border: "none",
    cursor: "pointer", color: "#9CA3C0",
    display: "flex", alignItems: "center", padding: 4,
  },
  forgotLink: { fontSize: 12, color: "#1A56C4", textDecoration: "none", fontWeight: 700 },
  signInBtn: {
    width: "100%", height: 50,
    background: "linear-gradient(135deg, #1A56C4 0%, #3B9EE8 100%)",
    color: "#fff", fontSize: 16, fontWeight: 800,
    border: "none", borderRadius: 12,
    cursor: "pointer", letterSpacing: "0.3px",
    fontFamily: "inherit", marginTop: 4,
    boxShadow: "0 4px 16px rgba(26,86,196,0.3)",
    transition: "opacity 0.2s",
  },
  divider: { display: "flex", alignItems: "center", gap: 10, margin: "20px 0 14px" },
  dividerLine: { flex: 1, height: 1, background: "#E8EDF8" },
  dividerText: { fontSize: 11, color: "#A0AABE", whiteSpace: "nowrap", fontWeight: 700, letterSpacing: "0.3px" },
  demoRow: { display: "flex", gap: 8, marginBottom: 20 },
  demoBtn: {
    flex: 1, height: 36,
    background: "transparent",
    border: "1.5px solid", borderRadius: 8,
    fontSize: 12, fontWeight: 800,
    cursor: "pointer", fontFamily: "inherit",
  },
  registerText: { textAlign: "center", fontSize: 13, color: "#6B7494", margin: 0 },
  registerLink: {
    background: "none", border: "none",
    color: "#1A56C4", fontWeight: 800, fontSize: 13,
    cursor: "pointer", textDecoration: "underline",
    fontFamily: "inherit", padding: 0,
  },
};

// ─── Icons ────────────────────────────────────────────────────────
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
