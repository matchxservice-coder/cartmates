// src/ResetPasswordPage.jsx
//
// User lands here after clicking the reset link in their email.
// Supabase automatically signs the user in temporarily so we can update
// their password via supabase.auth.updateUser().
//
// Flow:
//   1. ?reset=1 detected by App.jsx → routes to <ResetPasswordPage />
//   2. User enters new password + confirm → Submit
//   3. supabase.auth.updateUser({ password }) → success
//   4. Sign user out → redirect to login
import { useState } from "react";
import { supabase } from "./supabaseClient";

const C = {
  primary: "#075BB0",
  sky:     "#0484CF",
  border:  "#e2e8f0",
  text:    "#0F172A",
  muted:   "#64748b",
};

export default function ResetPasswordPage({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [done,     setDone]     = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password });
      if (upErr) throw upErr;

      // Sign out so user re-logs in with new password
      await supabase.auth.signOut();
      setDone(true);
    } catch (err) {
      console.error("password update error:", err);
      setError(err.message || "Could not update password. The reset link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={styles.root}>
        <div style={styles.card}>
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:60, marginBottom:14 }}>🎉</div>
            <div style={{ fontSize:22, fontWeight:900, color:C.primary, marginBottom:10 }}>
              Password Updated!
            </div>
            <div style={{ fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:24 }}>
              Your password has been changed successfully.<br/>
              Please log in with your new password.
            </div>
            <button onClick={() => { window.history.replaceState({}, "", "/"); onDone?.(); }}
              style={styles.primaryBtn}>
              Continue to Login →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:42, marginBottom:8 }}>🔐</div>
          <div style={{ fontSize:22, fontWeight:900, color:C.text }}>Set a new password</div>
          <div style={{ fontSize:12, color:C.muted, marginTop:4 }}>
            Choose a strong password (8+ characters)
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>New Password</label>
          <div style={styles.inputWrap}>
            <input
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              autoFocus
              autoComplete="new-password"
              style={styles.input}
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              style={styles.eyeBtn}>{showPw ? "🙈" : "👁️"}</button>
          </div>

          <label style={styles.label}>Confirm Password</label>
          <input
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            value={confirm}
            onChange={(e)=>setConfirm(e.target.value)}
            autoComplete="new-password"
            style={{ ...styles.input, marginBottom: 16 }}
          />

          {error && (
            <div style={{ background:"#fee2e2", color:"#991b1b", borderRadius:8, padding:"10px 12px", fontSize:12, marginBottom:14 }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.primaryBtn}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20, fontFamily: "'Nunito',sans-serif",
  },
  card: {
    background: "white", borderRadius: 18, padding: "32px 28px",
    width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(7,91,176,0.15)",
  },
  label: {
    display: "block", fontSize: 11, fontWeight: 800, color: C.muted,
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, marginTop: 14,
  },
  inputWrap: { position: "relative" },
  input: {
    width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 10,
    padding: "12px 14px", fontSize: 14, fontFamily: "inherit",
    boxSizing: "border-box", outline: "none",
  },
  eyeBtn: {
    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
    background: "transparent", border: "none", cursor: "pointer", fontSize: 16,
  },
  primaryBtn: {
    width: "100%", padding: 13, background: `linear-gradient(135deg,${C.primary},${C.sky})`,
    color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 900,
    cursor: "pointer", fontFamily: "inherit",
  },
};
