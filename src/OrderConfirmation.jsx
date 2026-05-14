import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  OrderConfirmation_v1.jsx  —  Thank you screen after successful checkout
//
//  Props:
//    orderNo         — 'SM-ORD-0089'
//    user            — { first_name, smart_id }
//    onBackToShop()  — close → landing
//    onViewOrders()  — open SM Panel → My Orders tab
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

export default function OrderConfirmation({ orderNo, user, onBackToShop, onViewOrders }) {
  const [bounced, setBounced] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBounced(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(145deg, ${C.primary} 0%, ${C.sky} 100%)`,
      fontFamily: "'Nunito', 'Poppins', sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@700;800;900&display=swap');
        *{ box-sizing:border-box; margin:0; padding:0; }
        @keyframes bounceIn {
          0%{ transform:scale(0); opacity:0; }
          60%{ transform:scale(1.15); opacity:1; }
          100%{ transform:scale(1); }
        }
        @keyframes fadeUp {
          from{opacity:0;transform:translateY(20px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes float {
          0%,100%{ transform:translateY(0); }
          50%{ transform:translateY(-8px); }
        }
        .bunny-bounce { animation: bounceIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both; }
        .float { animation: float 3s ease-in-out infinite; }
        .fade-up-1 { animation: fadeUp 0.5s 0.3s ease both; }
        .fade-up-2 { animation: fadeUp 0.5s 0.5s ease both; }
        .fade-up-3 { animation: fadeUp 0.5s 0.7s ease both; }
      `}</style>

      <div style={{
        background: "white", borderRadius: 24, padding: "40px 32px",
        maxWidth: 480, width: "100%", textAlign: "center",
        boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
      }}>
        {/* Bunny success */}
        <div className="bunny-bounce" style={{ marginBottom: 16 }}>
          <div className="float" style={{
            width: 96, height: 96,
            background: `linear-gradient(135deg, ${C.yellow}, #fbbf24)`,
            borderRadius: "50%",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 52,
            boxShadow: `0 12px 32px ${C.yellow}80`,
          }}>
            🐰
          </div>
        </div>

        <h1 className="fade-up-1" style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontSize: 30, fontWeight: 900, color: C.primary, marginBottom: 8, lineHeight: 1.1,
        }}>
          Order Submitted!
        </h1>

        <p className="fade-up-1" style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 24 }}>
          Thank you, <strong style={{ color: C.text }}>{user?.first_name || "fan"}</strong>! 🎉<br/>
          Your payment slip is being reviewed.
        </p>

        {/* Order # card */}
        <div className="fade-up-2" style={{
          background: `linear-gradient(135deg, ${C.bg}, #E0F2FE)`,
          border: `2px dashed ${C.primary}`,
          borderRadius: 14, padding: "16px 20px", marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.1em" }}>ORDER NUMBER</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.primary, fontFamily: "monospace", marginTop: 4 }}>{orderNo}</div>
        </div>

        {/* What happens next */}
        <div className="fade-up-2" style={{ textAlign: "left", marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 10 }}>What happens next?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { n: 1, icon: "🔍", text: "We review your slip within 24 hours" },
              { n: 2, icon: "📦", text: "Once approved, we'll pack your order" },
              { n: 3, icon: "✉️", text: "You'll get an email when it ships out" },
            ].map(s => (
              <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.bg, borderRadius: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.primary, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{s.n}</div>
                <span style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="fade-up-3" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onViewOrders} style={{
            width: "100%", padding: "13px",
            background: `linear-gradient(135deg, ${C.primary}, ${C.sky})`,
            color: "white", border: "none", borderRadius: 12,
            fontSize: 14, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
          }}>
            View My Orders →
          </button>
          <button onClick={onBackToShop} style={{
            width: "100%", padding: "13px",
            background: C.yellow, color: C.dark, border: "none", borderRadius: 12,
            fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
          }}>
            Keep Shopping 🛍️
          </button>
        </div>
      </div>
    </div>
  );
}
