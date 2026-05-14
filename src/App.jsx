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

  // ── 1. Bootstrap session ─────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
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
        alert("⏳ Your account is pending approval. We'll notify you once activated.");
        return;
      }
      if (data.account_status === "suspended") {
        await supabase.auth.signOut();
        alert("Your account has been suspended. Please contact support.");
        return;
      }
      if (data.account_status === "active") {
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
  // re-hydration, customer_sm routing fails because user.tier is undefined.
  const handleLogin = async (userData) => {
    console.log("🔐 handleLogin called with:", userData);
    try {
      if (userData?.id) {
        await hydrateUserFromSession(userData, setUser);
        console.log("✅ handleLogin: hydrated successfully");
      } else {
        console.log("⚠️ handleLogin: no userData.id, using partial user");
        setUser(userData);
      }
    } catch (err) {
      console.error("❌ handleLogin error:", err);
      // Fallback: at least set what we have so the user isn't stuck
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

  // ── Boot loading screen ──────────────────────────────────────────────────
  if (booting) {
    return (
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

  // ── Logged-in → Role + Package routing ───────────────────────────────────
  if (user) {
    console.log("🔍 USER DEBUG:", user);        
    console.log("🔍 user.tier =", user.tier);  
    if (user.role === "manager") return <ManagerDashboard user={user} onLogout={handleLogout} />;
    if (user.role === "staff")   return <StaffDashboard   user={user} onLogout={handleLogout} />;

    if (user.role === "customer") {
      // Soul Mates → stay on LandingPage, render SM Panel via prop
      if (user.tier === "SM") {
        return (
          <LandingPage
            smUser={user}
            onSmLogout={handleLogout}
            onLogin={() => {}}
            onRegister={() => {}}
          />
        );
      }
      // Team Mates (ST/PR/UL) → full dashboard
      return <CartMatesDashboard user={user} onLogout={handleLogout} />;
    }

    // Unknown role → safe logout
    handleLogout();
    return null;
  }

  // ── Not logged in → public page routing ─────────────────────────────────
  if (page === "login") {
    return (
      <LoginPage
        onLogin={handleLogin}
        onRegister={() => setPage("plan_choice")}
        onBack={() => setPage("landing")}
      />
    );
  }

  if (page === "plan_choice") {
    return (
      <PlanSelector
        onSelect={handlePlanChosen}
        onBack={() => setPage("login")}
      />
    );
  }

  if (page === "register") {
    return (
      <RegisterPage
        defaultPackage={defaultPackage}
        onBack={() => setPage("plan_choice")}
      />
    );
  }

  // Default: Landing
  return (
    <LandingPage
      onLogin={() => setPage("login")}
      onRegister={() => setPage("plan_choice")}
    />
  );
}
