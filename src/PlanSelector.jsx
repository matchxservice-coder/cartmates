import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  PlanSelector_v1.jsx  —  CartMates Plan Choice Screen
//
//  Shown BEFORE RegisterPage so users pick Soul Mates (B2C) vs Team Mates (GOM)
//  first. The choice is passed to RegisterPage as `defaultPackage`.
//
//  Props:
//    onSelect(planType)   — 'soul_mates' | 'team_mates'  → goes to RegisterPage
//    onBack()             — back to landing/login
//
//  Usage in App.jsx:
//    page === "choose_plan" → <PlanSelector onSelect={(p)=>{setRegPlan(p); setPage("register");}} onBack={...}/>
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  primary: "#075BB0",
  sky:     "#0484CF",
  yellow:  "#FFEB59",
  bg:      "#F8FAFC",
  dark:    "#0A1628",
  text:    "#0F172A",
  muted:   "#64748B",
};

export default function PlanSelector({ onSelect, onBack, onLogin }) {
  const [hovered, setHovered] = useState(null);

  const plans = [
    {
      id: "soul_mates",
      icon: "🐰",
      title: "Soul Mates",
      subtitle: "For individual fans",
      price: "Pay per shipment",
      priceNote: "No monthly fee",
      desc: "Perfect if you're shopping Thai merch for yourself. We receive your parcels, consolidate them, and ship to you worldwide.",
      features: [
        "Free warehouse storage (30 days)",
        "Photo verification on every parcel",
        "Consolidate multiple orders into one shipment",
        "Pay only when you ship",
        "Shop the Mates Market with your account",
      ],
      ctaLabel: "Start Free — Sign up →",
      gradient: `linear-gradient(135deg, ${C.primary}, ${C.sky})`,
      accent: C.sky,
      badge: "Most fans pick this",
    },
    {
      id: "team_mates",
      icon: "👥",
      title: "Team Mates",
      subtitle: "For Group Order Managers (GOM)",
      price: "From ฿900/month",
      priceNote: "3 tiers available",
      desc: "Built for GOMs handling group orders. Full backend dashboard, bulk shipping discounts, and customer management tools.",
      features: [
        "Manage unlimited customer orders",
        "Bulk shipping rate discounts (up to 3%)",
        "Replace Google Forms with real CRM",
        "Up to 60 days warehouse storage",
        "Priority access to limited drops",
      ],
      ctaLabel: "View plans & sign up →",
      gradient: `linear-gradient(135deg, #d97706, #f59e0b)`,
      accent: "#d97706",
      badge: "Business plan",
    },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(145deg, ${C.primary} 0%, ${C.sky} 100%)`,
      fontFamily: "'Nunito', 'Poppins', sans-serif",
      padding: "20px 16px 40px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@700;800;900&display=swap');
        *{ box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp{ from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fade-up{ animation: fadeUp 0.45s ease both; }
        .fade-up-1{ animation: fadeUp 0.45s 0.1s ease both; }
        .fade-up-2{ animation: fadeUp 0.45s 0.2s ease both; }
        .plan-card{ transition: all 0.25s cubic-bezier(0.4,0,0.2,1); }
        .plan-card:hover{ transform: translateY(-6px); box-shadow: 0 24px 48px rgba(0,0,0,0.25)!important; }
        @media (max-width: 760px) {
          .plans-row { grid-template-columns: 1fr!important; }
        }
      `}</style>

      {/* Back to Home */}
      <div style={{ maxWidth: 900, margin: "0 auto", paddingTop: 0 }}>
        <button onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.15)",
            color: "white",
            border: "1.5px solid rgba(255,255,255,0.3)",
            borderRadius: 10,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            backdropFilter: "blur(8px)",
          }}>
          ← Back to Home
        </button>
      </div>

      {/* Header */}
      <div className="fade-up" style={{ maxWidth: 900, margin: "20px auto 32px", textAlign: "center", color: "white", paddingTop: 0 }}>
        <div style={{ fontSize: 38, marginBottom: 8 }}>🐰</div>
        <h1 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: "clamp(28px, 5vw, 38px)", fontWeight: 900, lineHeight: 1.15, marginBottom: 10 }}>
          Welcome to CartMates
        </h1>
        <p style={{ fontSize: 15, opacity: 0.85, maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
          Which one are you? Pick the plan that fits how you shop or run your business.
        </p>
      </div>

      {/* Plans grid */}
      <div className="plans-row fade-up-1" style={{
        maxWidth: 900, margin: "0 auto",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18,
      }}>
        {plans.map(p => (
          <div key={p.id} className="plan-card"
            onMouseEnter={() => setHovered(p.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: "white",
              borderRadius: 22,
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              border: hovered === p.id ? `2px solid ${p.accent}` : "2px solid transparent",
              display: "flex", flexDirection: "column",
            }}>

            {/* Card header */}
            <div style={{
              background: p.gradient,
              padding: "24px 22px 20px",
              color: "white",
              position: "relative",
            }}>
              {/* Badge */}
              <div style={{
                position: "absolute", top: 14, right: 14,
                background: "rgba(255,255,255,0.22)",
                backdropFilter: "blur(6px)",
                fontSize: 10, fontWeight: 800, color: "white",
                padding: "3px 10px", borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.3)",
              }}>
                {p.badge}
              </div>

              <div style={{ fontSize: 38, marginBottom: 10 }}>{p.icon}</div>
              <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 24, fontWeight: 900, marginBottom: 3 }}>{p.title}</div>
              <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>{p.subtitle}</div>

              {/* Price */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.2)" }}>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{p.price}</div>
                <div style={{ fontSize: 11, opacity: 0.78, marginTop: 2 }}>{p.priceNote}</div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, marginBottom: 16 }}>
                {p.desc}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 18, flex: 1 }}>
                {p.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      background: `${p.accent}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 1,
                    }}>
                      <span style={{ color: p.accent, fontSize: 11, fontWeight: 900 }}>✓</span>
                    </div>
                    <span style={{ fontSize: 12.5, color: C.text, lineHeight: 1.55 }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onSelect(p.id)}
                style={{
                  width: "100%",
                  background: p.gradient,
                  color: "white",
                  border: "none", borderRadius: 12,
                  padding: "13px 16px",
                  fontSize: 14, fontWeight: 800,
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: `0 6px 16px ${p.accent}55`,
                  transition: "transform 0.15s",
                }}
                onMouseEnter={e => e.target.style.transform = "translateY(-1px)"}
                onMouseLeave={e => e.target.style.transform = ""}
              >
                {p.ctaLabel}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="fade-up-2" style={{ maxWidth: 900, margin: "28px auto 0", textAlign: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 12 }}>
          Already have an account?{" "}
          <span onClick={onLogin || onBack} style={{ color: C.yellow, fontWeight: 800, cursor: "pointer", textDecoration: "underline" }}>
            Log in instead
          </span>
        </div>
        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 14 }}>
          🐰 Not sure which one? Soul Mates is the right choice for 90% of people.
        </div>
      </div>
    </div>
  );
}
