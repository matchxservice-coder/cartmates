import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabaseClient";

// ─────────────────────────────────────────────────────────────────────────────
//  SoulMatesPanel_v1.jsx  —  CartMates Soul Mates Panel
//
//  Props:
//    user        — { id, username, smart_id, email, country, role }
//    onLogout    — fn()
//    cartCount   — number (badge from marketplace cart)
//    onOpenCart  — fn() (open cart drawer)
//
//  Architecture:
//    NavTrigger  → rendered inside LandingPage navbar (exported separately)
//    Drawer      → quick peek, slide from right
//    Overlay     → full panel, 5 tabs, mock data → swap to Supabase later
//
//  Usage in LandingPage.jsx:
//    import { SMNavTrigger, SoulMatesPanel } from "./SoulMatesPanel_v1";
//    {smUser && <SMNavTrigger user={smUser} onOpen={()=>setSmOpen(true)} cartCount={cartCount}/>}
//    {smUser && <SoulMatesPanel user={smUser} onLogout={handleLogout} cartCount={cartCount} onOpenCart={()=>setCartOpen(true)}/>}
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  primary: "#075BB0",
  sky:     "#0484CF",
  yellow:  "#FFEB59",
  bg:      "#F8FAFC",
  dark:    "#0A1628",
  text:    "#0F172A",
  muted:   "#64748B",
  green:   "#22c55e",
  red:     "#ef4444",
  orange:  "#f97316",
};

// ── Live data — fetched from Supabase, no more mocks ────────────────────────
// Default empty shapes so existing render paths don't break before fetch completes.
const EMPTY_PROFILE = {
  smart_id:           "",
  full_name:          "",
  email:              "",
  country:            "",
  country_flag:       "",
  plan:               "Soul Mates",
  member_since:       "",
  warehouse_address:  "",
  parcels_in_storage: 0,
  storage_limit_days: 30,
};

// Country → flag emoji map (small helper, can be moved to util later)
const COUNTRY_FLAGS = {
  "Japan":"🇯🇵","South Korea":"🇰🇷","Taiwan":"🇹🇼","Hong Kong":"🇭🇰",
  "China":"🇨🇳","Singapore":"🇸🇬","Malaysia":"🇲🇾","Indonesia":"🇮🇩",
  "Philippines":"🇵🇭","Vietnam":"🇻🇳","Macau":"🇲🇴",
  "United States":"🇺🇸","Canada":"🇨🇦","Mexico":"🇲🇽","Brazil":"🇧🇷",
  "Argentina":"🇦🇷","Peru":"🇵🇪","Bolivia":"🇧🇴",
  "United Kingdom":"🇬🇧","France":"🇫🇷","Germany":"🇩🇪","Italy":"🇮🇹",
  "Australia":"🇦🇺","Thailand":"🇹🇭",
};

// Storage days per tier (keyed by tier_code enum values)
const STORAGE_DAYS = {
  SM: 30,   // Soul Mates
  ST: 30,   // Standard
  PR: 45,   // Premium
  UL: 60,   // Ultimates
};

// Warehouse address — would be fetched from a config table later
const WAREHOUSE_ADDRESS = "123/45 CartMates Warehouse, Lat Krabang, Bangkok 10520, Thailand";

// ── Status helpers ────────────────────────────────────────────────────────────
const PARCEL_STATUS = {
  arrived:   { label:"In Warehouse", bg:"#dcfce7", color:"#166534" },
  rechecking:{ label:"Rechecking",   bg:"#fef9c3", color:"#854d0e" },
  packed:    { label:"Packed",       bg:"#dbeafe", color:"#1e40af" },
  shipped:   { label:"Shipped",      bg:"#e0e7ff", color:"#3730a3" },
};
const ORDER_STATUS = {
  pending_payment:{ label:"Pending Payment", bg:"#fef9c3", color:"#854d0e" },
  processing:     { label:"Processing",      bg:"#dbeafe", color:"#1e40af" },
  shipped:        { label:"Shipped",         bg:"#dcfce7", color:"#166534" },
  completed:      { label:"Completed",       bg:"#f1f5f9", color:"#475569" },
};
const SHIP_STATUS = {
  awaiting_payment: { label:"Awaiting Payment", bg:"#fef9c3", color:"#854d0e" },
  in_transit:       { label:"In Transit ✈️",    bg:"#dbeafe", color:"#1e40af" },
  delivered:        { label:"Delivered ✓",       bg:"#dcfce7", color:"#166534" },
};
const PAY_STATUS = {
  pending_slip: { label:"Upload Slip",  bg:"#fef9c3", color:"#854d0e" },
  reviewing:    { label:"Reviewing",    bg:"#dbeafe", color:"#1e40af" },
  confirmed:    { label:"Confirmed ✓",  bg:"#dcfce7", color:"#166534" },
  rejected:     { label:"Rejected",     bg:"#fee2e2", color:"#dc2626" },
};

function StatusBadge({ map, key_ }) {
  const s = map[key_] || { label: key_, bg:"#f1f5f9", color:"#475569" };
  return (
    <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, whiteSpace:"nowrap", flexShrink:0 }}>
      {s.label}
    </span>
  );
}

function Card({ children, onClick, hover=true }) {
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={()=>hover&&setH(true)} onMouseLeave={()=>setH(false)}
      style={{ background:"#f8fafc", border:`1.5px solid ${h?"#075BB0":"#e2e8f0"}`, borderRadius:14, padding:"14px 16px", transition:"all 0.18s", boxShadow:h?"0 4px 16px rgba(7,91,176,0.09)":"none", cursor:onClick?"pointer":"default" }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, count }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
      <span style={{ fontSize:15, fontWeight:800, color:C.text }}>{children}</span>
      {count !== undefined && <span style={{ background:"#f1f5f9", color:C.muted, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:8 }}>{count}</span>}
    </div>
  );
}

// ── Tab Contents ─────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"60px 20px", color:C.muted }}>
      <div style={{ fontSize:36, marginBottom:10, animation:"spin 1s linear infinite" }}>🐰</div>
      <div style={{ fontSize:13, fontWeight:700 }}>Loading...</div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function EmptyState({ icon, title, hint, address }) {
  return (
    <div style={{ textAlign:"center", padding:"40px 20px", color:C.muted }}>
      <div style={{ fontSize:56, marginBottom:14 }}>{icon}</div>
      <div style={{ fontWeight:800, fontSize:16, color:C.text, marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:13, lineHeight:1.6, maxWidth:340, margin:"0 auto" }}>{hint}</div>
      {address && (
        <div style={{ marginTop:20, padding:14, background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", borderRadius:12, textAlign:"left", maxWidth:380, margin:"20px auto 0" }}>
          <div style={{ fontSize:11, fontWeight:800, color:C.primary, marginBottom:4 }}>🏭 Your Warehouse Address</div>
          <div style={{ fontSize:12, color:C.text, lineHeight:1.6 }}>{address}</div>
        </div>
      )}
    </div>
  );
}

function TabParcels({ parcels, profile, loading }) {
  if (loading) return <LoadingState/>;
  if (!parcels || parcels.length === 0) {
    return <EmptyState icon="📦" title="No parcels yet" hint="When packages arrive at our warehouse, they'll show up here." address={profile.warehouse_address}/>;
  }

  const totalWeight = parcels.reduce((s,p) => s + (Number(p.weight_kg) || 0), 0);
  const storageDays = profile.storage_limit_days;

  return (
    <div>
      {/* Summary row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
        {[
          { icon:"📦", num: parcels.length, label:"In Warehouse", color:C.primary },
          { icon:"📅", num:`${storageDays}d`, label:"Storage Limit", color:"#7c3aed" },
          { icon:"⚖️", num:`${totalWeight.toFixed(1)}kg`, label:"Total Weight", color:C.sky },
        ].map(s=>(
          <div key={s.label} style={{ background:"white", border:"1.5px solid #e2e8f0", borderRadius:12, padding:"12px", textAlign:"center" }}>
            <div style={{ fontSize:20, marginBottom:2 }}>{s.icon}</div>
            <div style={{ fontSize:18, fontWeight:900, color:s.color }}>{s.num}</div>
            <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Warehouse address banner */}
      <div style={{ background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", border:"1.5px solid #bfdbfe", borderRadius:12, padding:"12px 14px", marginBottom:18, display:"flex", gap:10, alignItems:"flex-start" }}>
        <span style={{ fontSize:20, flexShrink:0 }}>🏭</span>
        <div>
          <div style={{ fontSize:11, fontWeight:800, color:C.primary, marginBottom:2 }}>Your Warehouse Address</div>
          <div style={{ fontSize:12, color:C.text, lineHeight:1.6 }}>{profile.warehouse_address}</div>
          <div style={{ fontSize:11, color:C.sky, fontWeight:700, marginTop:4, cursor:"pointer" }} onClick={()=>{ navigator.clipboard?.writeText(profile.warehouse_address); }}>Copy Address →</div>
        </div>
      </div>

      <SectionTitle count={parcels.length}>My Parcels</SectionTitle>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {parcels.map(p => (
          <Card key={p.id}>
            {/* Flag note */}
            {p.flag_note && !p.flag_acknowledged && (
              <div style={{ background:"#fef9c3", border:"1px solid #fde047", borderRadius:8, padding:"8px 10px", marginBottom:10, fontSize:11, color:"#854d0e", fontWeight:700 }}>
                ⚠️ {p.flag_note}
              </div>
            )}
            <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
              <div style={{ width:44, height:44, borderRadius:10, background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>📦</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:4, lineHeight:1.3 }}>{p.item_desc || "Parcel"}</div>
                <div style={{ display:"flex", gap:12, fontSize:11, color:C.muted, flexWrap:"wrap", marginBottom:8 }}>
                  <span>🔢 {p.domestic_tracking || "—"}</span>
                  <span>⚖️ {p.weight_kg ? `${p.weight_kg} kg` : "—"}</span>
                  <span>📅 {p.arrived_at ? new Date(p.arrived_at).toLocaleDateString() : "—"}</span>
                </div>
                <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                  <StatusBadge map={PARCEL_STATUS} key_={p.status}/>
                  <button style={{ background:"#EFF6FF", color:C.primary, border:"none", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    📸 Request Recheck
                  </button>
                  <button style={{ background:"#fefce8", color:"#854d0e", border:"none", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    📦 Pack & Ship
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TabOrders({ orders, loading }) {
  if (loading) return <LoadingState/>;
  if (!orders || orders.length === 0) {
    return <EmptyState icon="🛒" title="No orders yet" hint="Browse the Mates Market and grab some Thai merch! Your orders will appear here."/>;
  }

  return (
    <div>
      <SectionTitle count={orders.length}>Orders from Mates Market</SectionTitle>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {orders.map(o => {
          const itemsLabel = (o.items_summary || o.items || []).join(" · ") || `${o.item_count || 0} item${(o.item_count||0)>1?"s":""}`;
          return (
          <Card key={o.id}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:10, background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🛒</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{o.order_no}</div>
                  <StatusBadge map={ORDER_STATUS} key_={o.status}/>
                </div>
                <div style={{ fontSize:12, color:C.muted, marginBottom:6, lineHeight:1.5 }}>{itemsLabel}</div>
                <div style={{ display:"flex", gap:12, fontSize:11, color:C.muted, marginBottom:8, flexWrap:"wrap" }}>
                  <span>💰 ฿{Number(o.total_thb || 0).toLocaleString()}</span>
                  <span>📅 {o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}</span>
                  <span style={{ background:"#f1f5f9", padding:"1px 7px", borderRadius:6 }}>
                    {o.shipping_method === "hold_warehouse" ? "📦 Hold @ Warehouse" : "✈️ Ship Now"}
                  </span>
                </div>
                {o.status === "pending_payment" && (
                  <button style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", border:"none", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                    Upload Payment Slip →
                  </button>
                )}
              </div>
            </div>
          </Card>
        );})}
      </div>
    </div>
  );
}

function TabShipments({ shipments, loading }) {
  if (loading) return <LoadingState/>;

  return (
    <div>
      {/* 15-day banner */}
      <div style={{ background:"linear-gradient(135deg,#FFEB59,#fbbf24)", borderRadius:12, padding:"12px 14px", marginBottom:18, display:"flex", gap:10, alignItems:"flex-start" }}>
        <span style={{ fontSize:20, flexShrink:0 }}>⏰</span>
        <div style={{ fontSize:12, color:C.dark, fontWeight:700, lineHeight:1.5 }}>
          <strong>15-Day Receipt Window:</strong> Once tracking is issued, please confirm receipt within 15 days. After that, the shipment will be auto-marked as received.
        </div>
      </div>

      {(!shipments || shipments.length === 0) ? (
        <EmptyState icon="✈️" title="No shipments yet" hint="When you request to ship parcels out, they'll appear here with tracking info."/>
      ) : (
        <>
          <SectionTitle count={shipments.length}>My Shipments</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {shipments.map(s => (
              <Card key={s.id}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:10, background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                    {s.status === "delivered" ? "✅" : "✈️"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                      <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{s.doc_no || s.shipment_no} {s.destination && `→ ${s.destination}`}</div>
                      <StatusBadge map={SHIP_STATUS} key_={s.status}/>
                    </div>
                    <div style={{ display:"flex", gap:12, fontSize:11, color:C.muted, marginBottom:6, flexWrap:"wrap" }}>
                      <span>📦 {s.boxes || 1} box{(s.boxes || 1)>1?"es":""}</span>
                      {s.total_weight && <span>⚖️ {s.total_weight} kg</span>}
                      {s.shipping_cost && <span>💰 ฿{Number(s.shipping_cost).toLocaleString()}</span>}
                    </div>
                    {s.tracking_number && (
                      <div style={{ background:"#f8fafc", borderRadius:8, padding:"6px 10px", marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>Tracking:</span>
                        <span style={{ fontSize:12, fontWeight:800, color:C.primary, fontFamily:"monospace" }}>{s.tracking_number}</span>
                        <span style={{ marginLeft:"auto", fontSize:11, color:C.sky, fontWeight:700, cursor:"pointer" }} onClick={()=>navigator.clipboard?.writeText(s.tracking_number)}>Copy</span>
                      </div>
                    )}
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {s.status === "in_transit" && (
                        <>
                          <button style={{ background:`linear-gradient(135deg,${C.green},#16a34a)`, color:"white", border:"none", borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                            ✅ Confirm Received
                          </button>
                          <button style={{ background:"#fee2e2", color:C.red, border:"none", borderRadius:8, padding:"5px 12px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                            🚨 File Claim
                          </button>
                        </>
                      )}
                      {s.status === "delivered" && (
                        <span style={{ fontSize:11, color:C.muted, fontStyle:"italic" }}>Delivered — no action needed</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TabPayments({ payments, loading }) {
  if (loading) return <LoadingState/>;
  if (!payments || payments.length === 0) {
    return <EmptyState icon="💳" title="No payments yet" hint="Your payment history will show up here after your first order or shipment."/>;
  }

  const outstanding = payments.filter(p => p.status === "pending_slip");
  const totalDue = outstanding.reduce((s, p) => s + Number(p.amount_thb || p.amount || 0), 0);

  return (
    <div>
      {/* Outstanding banner */}
      {outstanding.length > 0 && (
        <div style={{ background:"#fef9c3", border:"1.5px solid #fde047", borderRadius:12, padding:"14px 16px", marginBottom:18, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:24 }}>⚠️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:800, color:"#854d0e" }}>Outstanding Payment</div>
            <div style={{ fontSize:12, color:"#a16207", marginTop:2 }}>{outstanding.length} payment{outstanding.length>1?"s":""} pending · Total ฿{totalDue.toLocaleString()}</div>
          </div>
        </div>
      )}

      <SectionTitle count={payments.length}>Payment History</SectionTitle>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {payments.map(p => {
          const amount = Number(p.amount_thb || p.amount || 0);
          const type = p.source_type || p.type || "payment";
          const ref = p.source_ref || p.ref || "";
          return (
          <Card key={p.id}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:10, background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                {type === "shipping" ? "✈️" : "🛒"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{ref || "Payment"}</div>
                  <StatusBadge map={PAY_STATUS} key_={p.status}/>
                </div>
                <div style={{ display:"flex", gap:12, fontSize:11, color:C.muted, marginBottom:p.status==="pending_slip"?8:0 }}>
                  <span>💰 ฿{amount.toLocaleString()}</span>
                  <span>📅 {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</span>
                  <span style={{ textTransform:"capitalize" }}>{type}</span>
                </div>
                {p.status === "pending_slip" && (
                  <div style={{ display:"flex", gap:6 }}>
                    <label style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:800, cursor:"pointer", display:"inline-block" }}>
                      📎 Upload Slip
                      <input type="file" accept="image/*" style={{ display:"none" }}/>
                    </label>
                    <label style={{ background:"#f1f5f9", color:C.muted, borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:700, cursor:"pointer", display:"inline-block" }}>
                      📷 Camera
                      <input type="file" accept="image/*" capture="environment" style={{ display:"none" }}/>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );})}
      </div>
    </div>
  );
}

function TabProfile({ profile, loading }) {
  const [copied, setCopied] = useState(false);

  if (loading) return <LoadingState/>;

  const p = profile;
  const copySmartId = () => {
    navigator.clipboard?.writeText(p.smart_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      {/* Smart ID hero */}
      <div style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, borderRadius:16, padding:"24px", marginBottom:20, textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(255,255,255,0.07) 1px,transparent 1px)", backgroundSize:"20px 20px" }}/>
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:C.yellow, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 12px" }}>🐰</div>
          <div style={{ fontSize:18, fontWeight:900, color:"white", marginBottom:2 }}>{p.full_name}</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.75)", marginBottom:16 }}>{p.email}</div>

          {/* Smart ID display */}
          <div style={{ background:"rgba(255,255,255,0.15)", backdropFilter:"blur(8px)", borderRadius:12, padding:"10px 16px", display:"inline-flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.7)", fontWeight:700 }}>Smart ID</span>
            <span style={{ fontSize:18, fontWeight:900, color:C.yellow, fontFamily:"monospace", letterSpacing:"0.05em" }}>{p.smart_id}</span>
            <button onClick={copySmartId} style={{ background:"rgba(255,255,255,0.2)", color:"white", border:"none", borderRadius:6, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"background 0.2s" }}>
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Info rows */}
      <div style={{ background:"white", border:"1.5px solid #e2e8f0", borderRadius:14, overflow:"hidden", marginBottom:16 }}>
        {[
          { label:"Plan",         value:p.plan,             icon:"✨" },
          { label:"Country",      value:`${p.country_flag} ${p.country}`, icon:"🌏" },
          { label:"Member Since", value:p.member_since,     icon:"📅" },
          { label:"In Warehouse", value:`${p.parcels_in_storage} parcels`, icon:"📦" },
          { label:"Storage Limit",value:`${p.storage_limit_days} days`,   icon:"⏰" },
        ].map((row, i, arr) => (
          <div key={row.label} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom: i<arr.length-1?"1px solid #f1f5f9":"none" }}>
            <span style={{ fontSize:18, width:24, textAlign:"center", flexShrink:0 }}>{row.icon}</span>
            <span style={{ fontSize:13, color:C.muted, fontWeight:600, flex:1 }}>{row.label}</span>
            <span style={{ fontSize:13, fontWeight:800, color:C.text }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Warehouse address */}
      <div style={{ background:"#f8fafc", border:"1.5px solid #e2e8f0", borderRadius:14, padding:"14px 16px", marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:800, color:C.primary, marginBottom:6 }}>🏭 Send Packages to This Address</div>
        <div style={{ fontSize:13, color:C.text, lineHeight:1.7, marginBottom:8 }}>{p.warehouse_address}</div>
        <div style={{ fontSize:12, color:C.muted, fontWeight:700 }}>Recipient name: <span style={{ color:C.text }}>{p.smart_id} / {p.full_name}</span></div>
      </div>

      {/* Address book placeholder */}
      <button style={{ width:"100%", background:"#f8fafc", border:"1.5px dashed #cbd5e1", borderRadius:12, padding:"12px", fontSize:13, fontWeight:700, color:C.muted, cursor:"pointer", fontFamily:"inherit", marginBottom:16 }}>
        + Add Shipping Address
      </button>
    </div>
  );
}

// ── Tabs config (badges populated dynamically based on live data) ─────────────
const buildTabs = ({ parcels = [], orders = [], payments = [] } = {}) => ([
  { key:"parcels",   icon:"📦", label:"My Parcels",  badge: parcels.length },
  { key:"orders",    icon:"🛒", label:"My Orders",   badge: orders.filter(o => o.status === "pending_payment").length },
  { key:"shipments", icon:"✈️", label:"Shipments",   badge: 0 },
  { key:"payments",  icon:"💳", label:"Payments",    badge: payments.filter(p => p.status === "pending_slip").length },
  { key:"profile",   icon:"👤", label:"Profile",     badge: 0 },
]);

// ── SM Nav Trigger (standalone variant — unused; main component renders its own) ──
export function SMNavTrigger({ onOpen, totalBadge = 0 }) {
  return (
    <div onClick={onOpen} style={{ position:"relative", cursor:"pointer", width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,${C.yellow},#fbbf24)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:`0 0 0 2px white, 0 0 0 4px ${C.primary}`, transition:"transform 0.2s, box-shadow 0.2s", flexShrink:0 }}
      onMouseEnter={e=>e.currentTarget.style.transform="scale(1.08)"}
      onMouseLeave={e=>e.currentTarget.style.transform=""}>
      🐰
      {totalBadge > 0 && (
        <div style={{ position:"absolute", top:-3, right:-3, background:C.red, color:"white", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid white" }}>
          {totalBadge > 9 ? "9+" : totalBadge}
        </div>
      )}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function SoulMatesPanel({ user, onLogout, cartCount = 0, onOpenCart }) {
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [activeTab, setActiveTab]     = useState("parcels");

  // ── Live data state ──────────────────────────────────────────────────────
  const [profile, setProfile]   = useState(EMPTY_PROFILE);
  const [parcels, setParcels]   = useState([]);
  const [orders, setOrders]     = useState([]);
  const [shipments, setShipments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);

  // ── Fetcher ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);

    try {
      // Profile
      const { data: pf } = await supabase
        .from("profiles")
        .select("smart_id, first_name, last_name, email, country, shipping_address, tier, created_at")
        .eq("id", user.id)
        .single();

      if (pf) {
        const fullName = `${pf.first_name || ""} ${pf.last_name || ""}`.trim();
        setProfile({
          smart_id:           pf.smart_id || "",
          full_name:          fullName,
          email:              pf.email || user.email || "",
          country:            pf.country || "",
          country_flag:       COUNTRY_FLAGS[pf.country] || "🌏",
          plan:               pf.tier === "SM" ? "Soul Mates" : (pf.tier || "Soul Mates"),
          member_since:       pf.created_at ? new Date(pf.created_at).toLocaleDateString("en-US",{year:"numeric",month:"long"}) : "",
          warehouse_address:  WAREHOUSE_ADDRESS,
          storage_limit_days: STORAGE_DAYS[pf.tier] || 30,
          parcels_in_storage: 0,
        });
      }

      // Parcels (member_id = current user)
      // Using select("*") to avoid 400 from non-existent column names
      const { data: pc, error: pcErr } = await supabase
        .from("parcels")
        .select("*")
        .eq("member_id", user.id)
        .in("status", ["arrived","rechecking","packed"])
        .order("arrived_at", { ascending: false });

      if (pcErr) console.warn("parcels query failed:", pcErr);
      setParcels(pc || []);
      setProfile(p => ({ ...p, parcels_in_storage: (pc || []).length }));

      // Marketplace orders
      const { data: mo } = await supabase
        .from("marketplace_orders")
        .select("id, order_no, total_thb, status, shipping_method, created_at, items_subtotal")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // For each order, fetch item names for display label (lightweight)
      if (mo && mo.length > 0) {
        const orderIds = mo.map(o => o.id);
        const { data: items } = await supabase
          .from("marketplace_order_items")
          .select("order_id, product_name, qty")
          .in("order_id", orderIds);

        const itemsByOrder = (items || []).reduce((acc, it) => {
          (acc[it.order_id] ??= []).push(`${it.product_name} × ${it.qty}`);
          return acc;
        }, {});

        setOrders(mo.map(o => ({
          ...o,
          items_summary: itemsByOrder[o.id] || [],
          item_count:    (itemsByOrder[o.id] || []).length,
        })));
      } else {
        setOrders([]);
      }

      // Shipments — using select("*") to handle schema field-name variance.
      // Note: schema uses 'issued_at' on shipments, not 'created_at'.
      const { data: sh, error: shErr } = await supabase
        .from("shipments")
        .select("*")
        .eq("member_id", user.id)
        .order("issued_at", { ascending: false });

      if (shErr) console.warn("shipments query failed:", shErr);
      setShipments((sh || []).map(s => ({
        ...s,
        total_weight: s.total_weight_kg || s.total_weight || s.weight_kg,
        created_at:   s.issued_at || s.created_at,   // normalize for UI
      })));

      // Payments — combine traditional payments + marketplace_payments
      // Using select("*") on both for schema field-name safety.
      const [{ data: traditional, error: tradErr }, { data: mpPay, error: mpErr }] = await Promise.all([
        supabase.from("payments")
          .select("*")
          .eq("member_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("marketplace_payments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (tradErr) console.warn("payments query failed:", tradErr);
      if (mpErr)   console.warn("marketplace_payments query failed:", mpErr);

      // Normalize and merge
      const merged = [
        ...(traditional || []).map(p => ({
          ...p,
          source_type: p.source_type || "shipping",
        })),
        ...(mpPay || []).map(p => ({
          ...p,
          source_type: "marketplace",
          source_ref:  p.order_id,  // could enrich with order_no via join later
        })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setPayments(merged);

    } catch (err) {
      console.error("SoulMatesPanel fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial fetch + when user changes
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Realtime subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel(`sm-panel-${user.id}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"parcels",              filter:`member_id=eq.${user.id}` }, fetchAll)
      .on("postgres_changes", { event:"*", schema:"public", table:"marketplace_orders",   filter:`user_id=eq.${user.id}`   }, fetchAll)
      .on("postgres_changes", { event:"*", schema:"public", table:"marketplace_payments", filter:`user_id=eq.${user.id}`   }, fetchAll)
      .on("postgres_changes", { event:"*", schema:"public", table:"payments",             filter:`member_id=eq.${user.id}` }, fetchAll)
      .on("postgres_changes", { event:"*", schema:"public", table:"shipments",            filter:`member_id=eq.${user.id}` }, fetchAll)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id, fetchAll]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const TABS = buildTabs({ parcels, orders, payments });
  const totalBadge = parcels.length + payments.filter(p => p.status === "pending_slip").length;

  const openOverlay = (tab = "parcels") => {
    setActiveTab(tab);
    setDrawerOpen(false);
    setOverlayOpen(true);
  };

  const closeAll = () => { setDrawerOpen(false); setOverlayOpen(false); };

  return (
    <>
      {/* ── Nav trigger button ── */}
      <div onClick={()=>setDrawerOpen(true)} style={{ position:"relative", cursor:"pointer", width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,${C.yellow},#fbbf24)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:`0 0 0 2px white, 0 0 0 4px ${drawerOpen||overlayOpen?C.yellow:C.primary}`, transition:"all 0.2s", flexShrink:0 }}
        onMouseEnter={e=>e.currentTarget.style.transform="scale(1.08)"}
        onMouseLeave={e=>e.currentTarget.style.transform=""}>
        🐰
        {totalBadge > 0 && (
          <div style={{ position:"absolute", top:-3, right:-3, background:C.red, color:"white", borderRadius:"50%", width:16, height:16, fontSize:9, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid white" }}>
            {totalBadge > 9 ? "9+" : totalBadge}
          </div>
        )}
      </div>

      {/* ══════════════ DRAWER ══════════════════════════════════════ */}
      {drawerOpen && (
        <>
          <div onClick={()=>setDrawerOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(10,22,40,0.3)", zIndex:400 }}/>
          <div style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(300px,90vw)", background:"white", zIndex:401, display:"flex", flexDirection:"column", boxShadow:"-8px 0 48px rgba(0,0,0,0.18)", borderRadius:"20px 0 0 20px",
            animation:"smDrawerIn 0.32s cubic-bezier(0.4,0,0.2,1)" }}>
            <style>{`@keyframes smDrawerIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

            {/* Header */}
            <div style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, padding:"20px 20px 16px", flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <div style={{ width:42, height:42, borderRadius:"50%", background:C.yellow, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>🐰</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, fontSize:14, color:"white" }}>{profile.full_name || user?.username || "Loading..."}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.75)", fontFamily:"monospace" }}>{profile.smart_id || "—"}</div>
                </div>
                <div onClick={()=>setDrawerOpen(false)} style={{ width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"white", cursor:"pointer" }}>✕</div>
              </div>
              {/* Quick stats */}
              <div style={{ display:"flex", gap:6 }}>
                {[{n:parcels.length,l:"Parcels"},{n:shipments.filter(s=>s.status==="in_transit").length,l:"In Transit"},{n:payments.filter(p=>p.status==="pending_slip").length,l:"Unpaid"}].map(s=>(
                  <div key={s.l} style={{ flex:1, background:"rgba(255,255,255,0.15)", borderRadius:8, padding:"7px 4px", textAlign:"center" }}>
                    <div style={{ fontWeight:900, fontSize:16, color:"white" }}>{s.n}</div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.75)", fontWeight:700 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nav items */}
            <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
              {TABS.map(tab => (
                <div key={tab.key} onClick={()=>openOverlay(tab.key)}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px", cursor:"pointer", borderLeft:"3px solid transparent", transition:"all 0.15s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.background="#f8fafc"; e.currentTarget.style.borderLeftColor=C.primary; }}
                  onMouseLeave={e=>{ e.currentTarget.style.background=""; e.currentTarget.style.borderLeftColor="transparent"; }}>
                  <span style={{ fontSize:18, width:24, textAlign:"center", flexShrink:0 }}>{tab.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{tab.label}</div>
                  </div>
                  {tab.badge > 0 && (
                    <span style={{ background:C.primary, color:"white", fontSize:10, fontWeight:900, padding:"2px 7px", borderRadius:10 }}>{tab.badge}</span>
                  )}
                  <span style={{ fontSize:14, color:"#cbd5e1" }}>›</span>
                </div>
              ))}

              {/* Cart shortcut */}
              {cartCount > 0 && (
                <div onClick={()=>{ setDrawerOpen(false); onOpenCart?.(); }}
                  style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 20px", cursor:"pointer", background:"#fefce8", borderLeft:"3px solid #fbbf24" }}>
                  <span style={{ fontSize:18, width:24, textAlign:"center" }}>🛒</span>
                  <div style={{ flex:1, fontSize:13, fontWeight:700, color:"#854d0e" }}>My Cart</div>
                  <span style={{ background:C.yellow, color:C.dark, fontSize:10, fontWeight:900, padding:"2px 7px", borderRadius:10 }}>{cartCount}</span>
                  <span style={{ fontSize:14, color:"#cbd5e1" }}>›</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding:"12px 20px", borderTop:"1px solid #f1f5f9", display:"flex", gap:8, flexShrink:0 }}>
              <button onClick={()=>openOverlay("parcels")} style={{ flex:1, background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", border:"none", borderRadius:10, padding:"10px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                Full Dashboard →
              </button>
              <button onClick={()=>{ closeAll(); onLogout(); }} style={{ background:"#f1f5f9", color:C.muted, border:"none", borderRadius:10, padding:"10px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                Log out
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════ FULL OVERLAY ════════════════════════════════ */}
      {overlayOpen && (
        <>
          <div onClick={closeAll} style={{ position:"fixed", inset:0, background:"rgba(10,22,40,0.65)", zIndex:500, backdropFilter:"blur(4px)", animation:"smFadeIn 0.3s ease" }}/>
          <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:501,
            width:"min(820px,96vw)", height:"min(660px,92vh)",
            background:"white", borderRadius:24, overflow:"hidden", display:"flex", flexDirection:"column",
            boxShadow:"0 40px 100px rgba(0,0,0,0.45)",
            animation:"smPanelIn 0.32s cubic-bezier(0.34,1.2,0.64,1)" }}>
            <style>{`
              @keyframes smFadeIn{from{opacity:0}to{opacity:1}}
              @keyframes smPanelIn{from{transform:translate(-50%,-50%) scale(0.92);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
            `}</style>

            {/* Header */}
            <div style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, padding:"16px 24px", display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
              <div style={{ width:38, height:38, borderRadius:"50%", background:C.yellow, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🐰</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:900, fontSize:15, color:"white" }}>{profile.full_name || "Loading..."}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.75)", fontFamily:"monospace" }}>Soul Mates · {profile.smart_id || "—"} · {profile.country_flag} {profile.country}</div>
              </div>
              {/* Cart shortcut in overlay header */}
              {cartCount > 0 && (
                <div onClick={()=>{ closeAll(); onOpenCart?.(); }} style={{ position:"relative", cursor:"pointer", width:34, height:34, borderRadius:9, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                  🛒
                  <div style={{ position:"absolute", top:-4, right:-4, background:C.red, color:"white", borderRadius:"50%", width:15, height:15, fontSize:9, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", border:"1.5px solid white" }}>{cartCount}</div>
                </div>
              )}
              <div onClick={closeAll} style={{ width:30, height:30, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"white", cursor:"pointer" }}>✕</div>
            </div>

            {/* Tabs */}
            <div style={{ display:"flex", background:"#f8fafc", borderBottom:"1px solid #e2e8f0", flexShrink:0, overflowX:"auto" }}>
              {TABS.map(tab => (
                <button key={tab.key} onClick={()=>setActiveTab(tab.key)}
                  style={{ flex:1, minWidth:80, padding:"12px 8px", background:activeTab===tab.key?"white":"transparent", border:"none", borderBottom:`3px solid ${activeTab===tab.key?C.primary:"transparent"}`, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                  <span style={{ fontSize:18 }}>{tab.icon}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:activeTab===tab.key?C.primary:C.muted, whiteSpace:"nowrap" }}>{tab.label}</span>
                  {tab.badge > 0 && <span style={{ background:C.red, color:"white", fontSize:9, fontWeight:900, padding:"1px 5px", borderRadius:8 }}>{tab.badge}</span>}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
              {activeTab === "parcels"   && <TabParcels   parcels={parcels}   profile={profile} loading={loading}/>}
              {activeTab === "orders"    && <TabOrders    orders={orders}     loading={loading}/>}
              {activeTab === "shipments" && <TabShipments shipments={shipments} loading={loading}/>}
              {activeTab === "payments"  && <TabPayments  payments={payments} loading={loading}/>}
              {activeTab === "profile"   && <TabProfile   profile={profile}   loading={loading}/>}
            </div>

            {/* Footer */}
            <div style={{ padding:"14px 24px", borderTop:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0, background:"white" }}>
              <div style={{ fontSize:12, color:C.muted }}>🐰 Soul Mates · {profile.smart_id || "—"}</div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={closeAll} style={{ background:"#f1f5f9", color:C.muted, border:"none", borderRadius:10, padding:"9px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  ← Back to Shop
                </button>
                <button onClick={()=>setActiveTab("shipments")} style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", border:"none", borderRadius:10, padding:"9px 20px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                  Request Shipment ✈️
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
