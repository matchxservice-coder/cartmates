import { useState, useEffect } from "react";
import { supabase, getActiveSession } from "./supabaseClient";
import LandingPage        from "./LandingPage";
import LoginPage          from "./LoginPage";
import RegisterPage       from "./RegisterPage";
import PlanSelector       from "./PlanSelector";
import CartMatesDashboard from "./CartMatesDashboard_v9";
import StaffDashboard     from "./StaffDashboard_v5";
import ManagerDashboard   from "./ManagerDashboard_V2";

// ─────────────────────────────────────────────────────────────────────────────
//  App_v5.jsx  —  CartMates Root Router  (Supabase, v5 — Soul Mates support)
//
//  CHANGES FROM v4:
//    • New "plan_choice" page between landing and register (lets user pick
//      Soul Mates vs Team Mates before filling personal info).
//    • Profile fetch now includes `package` so we can split customer routing:
//        - package === 'soul_mates' → stay on LandingPage with SM Panel
//        - package === 'standard'|'premium'|'ultimates' → CartMatesDashboard
//    • LandingPage receives `smUser` + `onSmLogout` so it can render the
//      Soul Mates panel without route change.
//
//  Page Flow:
//    boot          → check existing session
//    no session    → LandingPage (default)
//    landing       → "Get Started"  → plan_choice
//    landing       → "Login"        → LoginPage
//    plan_choice   → pick SM/TM     → RegisterPage with defaultPackage
//    session found → fetch profile.role + profile.package → route appropriately
//
//  Role / Package routing:
//    role 'manager'                          → ManagerDashboard
//    role 'staff'                            → StaffDashboard
//    role 'customer' + package 'soul_mates'  → LandingPage + SM Panel (no nav)
//    role 'customer' + (TM packages)         → CartMatesDashboard
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser]               = useState(null);
  const [page, setPage]               = useState("landing");
  const [booting, setBooting]         = useState(true);
  const [defaultPackage, setDefaultPackage] = useState(null);  // passed to RegisterPage
  const [statusMessage, setStatusMessage]   = useState(null);  // { title, body, icon } shown as modal

  // ── 1. Bootstrap session ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    // Detect email verification redirect (?verified=1) from Supabase
    const isVerifyReturn = window.location.search.includes("verified=1");
    // (statusMessage will be set inside bootstrap based on success/failure of profile creation)

    const bootstrap = async () => {
      // If user just verified email, Supabase may have auto-signed them in.
      // We need to: (1) create their profile using pending form data, then
      // (2) sign them out so they go through manual login.
      if (isVerifyReturn) {
        console.log("🔐 Verify return detected — processing pending registration");
        try {
          // Wait briefly for Supabase session to settle
          await new Promise(r => setTimeout(r, 300));

          // Get current session (Supabase should have auto-signed in the user)
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            console.log("✅ Session active for verified user:", session.user.id);

            // Check if profile already exists (avoid duplicate RPC)
            const { data: existingProfile } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", session.user.id)
              .maybeSingle();

            if (existingProfile) {
              console.log("ℹ️ Profile already exists — skipping RPC");
            } else {
              // Retrieve pending registration data from localStorage
              const pendingStr = localStorage.getItem("cm_pending_register");
              if (pendingStr) {
                try {
                  const pending = JSON.parse(pendingStr);
                  console.log("📦 Found pending register data — calling fn_register_customer");

                  const { error: regError } = await supabase.rpc("fn_register_customer", {
                    p_user_id:        session.user.id,
                    p_username:       pending.username,
                    p_first_name:     pending.first_name,
                    p_last_name:      pending.last_name,
                    p_email:          pending.email,
                    p_phone:          pending.phone,
                    p_tax_id:         pending.tax_id,
                    p_country:        pending.country,
                    p_address:        pending.address,
                    p_city:           pending.city,
                    p_state_province: pending.state_province,
                    p_postcode:       pending.postcode,
                    p_channel:        pending.channel,
                    p_channel_user:   pending.channel_user,
                    p_package:        pending.package,
                    p_interests:      pending.interests,
                  });

                  if (regError) {
                    console.error("❌ fn_register_customer failed on verify:", regError);
                    setStatusMessage({
                      icon:  "⚠️",
                      title: "Profile setup incomplete",
                      body:  `Your email is verified but profile creation failed: ${regError.message}. Please contact support.`,
                    });
                  } else {
                    console.log("✅ Profile created successfully");
                    localStorage.removeItem("cm_pending_register");
                    setStatusMessage({
                      icon:  "✅",
                      title: "Email verified!",
                      body:  "Your account is ready. Please log in with your username and password to access your Soul Mates account.",
                    });
                  }
                } catch (e) {
                  console.error("❌ Failed to parse pending data:", e);
                }
              } else {
                console.warn("⚠️ No pending register data found in localStorage");
                setStatusMessage({
                  icon:  "✅",
                  title: "Email verified!",
                  body:  "Your email is confirmed. Please log in with your username and password.",
                });
              }
            }
          } else {
            console.warn("⚠️ No session after verify — falling back to manual login");
            setStatusMessage({
              icon:  "✅",
              title: "Email verified!",
              body:  "Your email is confirmed. You can now log in with your username and password.",
            });
          }

          // Always sign out after verify processing — user must log in manually
          await supabase.auth.signOut();
        } catch (e) {
          console.error("❌ Verify-return processing error:", e);
        }

        // Clean URL + go to login
        window.history.replaceState({}, "", window.location.pathname);
        if (mounted) {
          setBooting(false);
          setPage("login");
        }
        return;
      }

      const session = await getActiveSession();
      if (session?.user) {
        await hydrateUserFromSession(session.user, mounted ? setUser : null);
      }
      if (mounted) setBooting(false);
    };

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        if (!session) {
          setUser(null);
          setPage(prev => prev === "register" ? prev : "landing");
        }
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // ── Helper: hydrate user from Supabase session ───────────────────────────
  const hydrateUserFromSession = async (authUser, setter) => {
    if (!setter) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, role, account_status, tier, smart_id, first_name, last_name, country")
        .eq("id", authUser.id)
        .single();

      if (error || !data) {
        await supabase.auth.signOut();
        return;
      }

      if (data.account_status === "pending_approval") {
        await supabase.auth.signOut();
        setStatusMessage({
          icon:  "⏳",
          title: "Your account is pending approval",
          body:  "Thanks for signing up! A staff member will activate your Team Mates account shortly. You'll receive an email once approved — usually within 24 hours during business days.",
        });
        return;
      }
      if (data.account_status === "suspended") {
        await supabase.auth.signOut();
        setStatusMessage({
          icon:  "🚫",
          title: "Account suspended",
          body:  "Your account has been suspended. Please contact our support team for assistance.",
        });
        return;
      }
      if (data.account_status === "active") {
        console.log("🔍 [hydrate] active user:", { role: data.role, tier: data.tier, smart_id: data.smart_id });
        setter({
          ...authUser,
          role:           data.role,
          account_status: data.account_status,
          username:       data.username,
          tier:           data.tier,        // 'ST' | 'PR' | 'UL' | 'SM'
          smart_id:       data.smart_id,
          first_name:     data.first_name,
          last_name:      data.last_name,
          country:        data.country,
        });
      }
    } catch {
      await supabase.auth.signOut();
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  // handleLogin: re-hydrate from profiles to ensure ALL fields (including tier)
  // are loaded. LoginPage only passes a partial user object — without this
  // re-hydration, tier comes back undefined and SM users route to TM dashboard.
  const handleLogin = async (userData) => {
    console.log("🔐 handleLogin called with:", userData);
    if (userData?.id) {
      await hydrateUserFromSession(userData, setUser);
    } else {
      setUser(userData);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPage("landing");
  };

  const handlePlanChosen = (planType) => {
    // planType from PlanSelector: 'soul_mates' | 'team_mates'
    setDefaultPackage(planType === "soul_mates" ? "soul_mates" : null);
    // null lets RegisterPage show the 3 TM tiers (standard/premium/ultimates)
    setPage("register");
  };

  // ── Resolve which page to render ────────────────────────────────────────
  let view = null;

  // Boot loading screen
  if (booting) {
    view = (
      <div style={{
        minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(145deg, #1A56C4 0%, #3B9EE8 100%)",
        fontFamily: "'Nunito', sans-serif",
      }}>
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🐰</div>
          <div style={{ fontSize: 16, fontWeight: 700, opacity: 0.9 }}>Loading CartMates…</div>
        </div>
      </div>
    );
  }
  // Logged-in → Role + Package routing
  else if (user) {
    console.log("🔍 [App] user routing:", { role: user.role, tier: user.tier, smart_id: user.smart_id });
    if (user.role === "manager")      view = <ManagerDashboard user={user} onLogout={handleLogout} />;
    else if (user.role === "staff")   view = <StaffDashboard   user={user} onLogout={handleLogout} />;
    else if (user.role === "customer") {
      if (user.tier === "SM") {
        view = (
          <LandingPage
            smUser={user}
            onSmLogout={handleLogout}
            onLogin={() => {}}
            onRegister={() => {}}
          />
        );
      } else {
        view = <CartMatesDashboard user={user} onLogout={handleLogout} />;
      }
    } else {
      handleLogout();
    }
  }
  // Public page routing
  else if (page === "login") {
    view = (
      <LoginPage
        onLogin={handleLogin}
        onRegister={() => setPage("plan_choice")}
        onBack={() => setPage("landing")}
      />
    );
  }
  else if (page === "plan_choice") {
    view = (
      <PlanSelector
        onSelect={handlePlanChosen}
        onBack={() => setPage("landing")}
        onLogin={() => setPage("login")}
      />
    );
  }
  else if (page === "register") {
    view = (
      <RegisterPage
        defaultPackage={defaultPackage}
        onBack={() => setPage("plan_choice")}
      />
    );
  }
  else {
    view = (
      <LandingPage
        onLogin={() => setPage("login")}
        onRegister={() => setPage("plan_choice")}
      />
    );
  }

  return (
    <>
      {view}
      <StatusModal message={statusMessage} onClose={() => setStatusMessage(null)}/>
    </>
  );
}


// ── Status Modal — persistent until user dismisses ──────────────────────
function StatusModal({ message, onClose }) {
  if (!message) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, fontFamily: "'Nunito', sans-serif",
        animation: "smFadeIn 0.2s ease",
      }}>
      <style>{`
        @keyframes smFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes smPopIn { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 18, padding: 28,
          maxWidth: 420, width: "100%", textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          animation: "smPopIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
        <div style={{ fontSize: 52, marginBottom: 14, lineHeight: 1 }}>{message.icon}</div>
        <div style={{ fontSize: 19, fontWeight: 900, color: "#075BB0", marginBottom: 10 }}>
          {message.title}
        </div>
        <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.65, marginBottom: 22 }}>
          {message.body}
        </div>
        <button onClick={onClose}
          style={{
            width: "100%", padding: "12px",
            background: "linear-gradient(135deg, #075BB0, #0484CF)",
            color: "white", border: "none", borderRadius: 12,
            fontSize: 14, fontWeight: 900, cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: "0 6px 16px rgba(7,91,176,0.3)",
          }}>
          Got it
        </button>
      </div>
    </div>
  );
}
