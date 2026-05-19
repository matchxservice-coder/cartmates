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

function TabParcels({ parcels, profile, loading, onRequestShipment }) {
  const [lightbox, setLightbox] = useState(null);  // { photos: [...urls], index: 0 }
  const [selected, setSelected] = useState(() => new Set());

  // selectable = parcels in 'arrived' state with no shipment yet
  const selectableIds = new Set(
    (parcels || []).filter(p => p.status === "arrived" && !p.shipment_id).map(p => p.id)
  );

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(selectableIds));
  };

  const clearAll = () => setSelected(new Set());

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

      {/* Selection action bar — sticky-feel above list */}
      {selectableIds.size > 0 && (
        <div style={{
          background: selected.size > 0 ? `linear-gradient(135deg,${C.primary},${C.sky})` : "#f1f5f9",
          color: selected.size > 0 ? "white" : C.muted,
          border: selected.size > 0 ? "none" : "1.5px dashed #cbd5e1",
          borderRadius: 12,
          padding: "10px 14px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          transition: "all 0.2s",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, fontWeight:700 }}>
            {selected.size > 0 ? (
              <>
                <span>✅ {selected.size} selected</span>
                <button onClick={clearAll}
                  style={{ background:"rgba(255,255,255,0.2)", color:"white", border:"none", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  Clear
                </button>
              </>
            ) : (
              <span>☐ Select parcels to ship</span>
            )}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {selected.size < selectableIds.size && (
              <button onClick={selectAll}
                style={{ background: selected.size > 0 ? "rgba(255,255,255,0.2)" : "white", color: selected.size > 0 ? "white" : C.primary, border: selected.size > 0 ? "none" : `1.5px solid ${C.primary}`, borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                Select all ({selectableIds.size})
              </button>
            )}
            {selected.size > 0 && (
              <button onClick={() => onRequestShipment(Array.from(selected))}
                style={{ background:"white", color:C.primary, border:"none", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:900, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 2px 8px rgba(0,0,0,0.15)" }}>
                Request Shipment ✈️
              </button>
            )}
          </div>
        </div>
      )}

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
              {/* Selection checkbox — only for 'arrived' parcels not yet in shipment */}
              {selectableIds.has(p.id) && (
                <label style={{ display:"flex", alignItems:"center", marginTop:10, cursor:"pointer" }}>
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    style={{ width:18, height:18, cursor:"pointer", accentColor:C.primary }}
                  />
                </label>
              )}
              <div style={{ width:44, height:44, borderRadius:10, background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>📦</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:4, lineHeight:1.3 }}>{p.item_desc || "Parcel"}</div>
                <div style={{ display:"flex", gap:12, fontSize:11, color:C.muted, flexWrap:"wrap", marginBottom:8 }}>
                  <span>🔢 {p.domestic_tracking || "—"}</span>
                  <span>⚖️ {p.weight_kg ? `${Number(p.weight_kg).toFixed(2)} kg` : "—"}</span>
                  <span>📅 {p.arrived_at ? new Date(p.arrived_at).toLocaleDateString() : "—"}</span>
                </div>

                {/* Photos grid */}
                {p.all_photos && p.all_photos.length > 0 && (
                  <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
                    {p.all_photos.slice(0, 4).map((url, i) => (
                      <button key={i} onClick={() => setLightbox({ photos: p.all_photos, index: i })}
                        style={{ width:54, height:54, borderRadius:8, overflow:"hidden", border:`1px solid ${C.border}`, display:"block", flexShrink:0, position:"relative", padding:0, cursor:"pointer", background:"transparent" }}>
                        <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                        {i === 3 && p.all_photos.length > 4 && (
                          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800 }}>
                            +{p.all_photos.length - 4}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

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
      <PhotoLightbox lightbox={lightbox} onClose={() => setLightbox(null)} onNav={(dir) => setLightbox(lb => lb && ({ ...lb, index: (lb.index + dir + lb.photos.length) % lb.photos.length }))}/>
    </div>
  );
}

// ── Photo Lightbox modal ──────────────────────────────────────────────────
function PhotoLightbox({ lightbox, onClose, onNav }) {
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")  onNav(-1);
      if (e.key === "ArrowRight") onNav(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, onClose, onNav]);

  if (!lightbox) return null;
  const { photos, index } = lightbox;
  const url = photos[index];

  return (
    <div onClick={onClose}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.92)",
        zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center",
        animation:"fadeIn 0.18s ease",
      }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

      {/* Close button */}
      <button onClick={onClose}
        style={{ position:"absolute", top:18, right:18, width:42, height:42, borderRadius:"50%", background:"rgba(255,255,255,0.15)", color:"white", border:"none", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(6px)" }}>
        ✕
      </button>

      {/* Counter */}
      {photos.length > 1 && (
        <div style={{ position:"absolute", top:24, left:24, padding:"6px 14px", background:"rgba(255,255,255,0.15)", color:"white", borderRadius:20, fontSize:13, fontWeight:700, backdropFilter:"blur(6px)" }}>
          {index + 1} / {photos.length}
        </div>
      )}

      {/* Prev */}
      {photos.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNav(-1); }}
          style={{ position:"absolute", left:18, top:"50%", transform:"translateY(-50%)", width:48, height:48, borderRadius:"50%", background:"rgba(255,255,255,0.15)", color:"white", border:"none", fontSize:24, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(6px)" }}>
          ‹
        </button>
      )}

      {/* Image */}
      <img src={url} alt="" onClick={(e) => e.stopPropagation()}
        style={{ maxWidth:"92vw", maxHeight:"88vh", objectFit:"contain", borderRadius:8, boxShadow:"0 20px 80px rgba(0,0,0,0.6)" }}/>

      {/* Next */}
      {photos.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNav(1); }}
          style={{ position:"absolute", right:18, top:"50%", transform:"translateY(-50%)", width:48, height:48, borderRadius:"50%", background:"rgba(255,255,255,0.15)", color:"white", border:"none", fontSize:24, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(6px)" }}>
          ›
        </button>
      )}
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
  const [detail, setDetail] = useState(null);   // selected shipment for modal
  const [lightbox, setLightbox] = useState(null);

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
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {shipments.map(s => {
              const parcelCount = s.parcels_list?.length || 0;
              return (
                <button key={s.id}
                  onClick={() => setDetail(s)}
                  style={{
                    width:"100%", background:"white", border:`1px solid ${C.border}`, borderRadius:12,
                    padding:"12px 14px", display:"flex", alignItems:"center", gap:12, cursor:"pointer",
                    fontFamily:"inherit", textAlign:"left", transition:"all 0.15s",
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=C.primary; e.currentTarget.style.boxShadow="0 4px 12px rgba(7,91,176,0.1)";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border; e.currentTarget.style.boxShadow="none";}}
                >
                  <div style={{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                    {s.status === "delivered" ? "✅" : "✈️"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, fontFamily:"monospace" }}>
                      {s.doc_no || s.id?.slice(0,8)}
                    </div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                      📦 {parcelCount} parcel{parcelCount>1?"s":""} · ⚖️ {Number(s.total_weight || 0).toFixed(2)} kg · 📅 {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <StatusBadge map={SHIP_STATUS} key_={s.status}/>
                  <span style={{ fontSize:16, color:C.muted, marginLeft:4 }}>›</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <ShipmentDetailModal
        shipment={detail}
        onClose={() => setDetail(null)}
        onOpenPhoto={(photos, index) => setLightbox({ photos, index })}
      />
      <PhotoLightbox lightbox={lightbox} onClose={() => setLightbox(null)} onNav={(dir) => setLightbox(lb => lb && ({ ...lb, index: (lb.index + dir + lb.photos.length) % lb.photos.length }))}/>
    </div>
  );
}

// ── Shipment Detail Modal (SM) ────────────────────────────────────────
function ShipmentDetailModal({ shipment, onClose, onOpenPhoto }) {
  useEffect(() => {
    if (!shipment) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shipment, onClose]);

  if (!shipment) return null;
  const parcels = shipment.parcels_list || [];

  return (
    <div onClick={onClose}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.6)",
        zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center",
        padding:20, animation:"sdmFadeIn 0.2s ease",
      }}>
      <style>{`
        @keyframes sdmFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes sdmPopIn{from{transform:scale(0.94);opacity:0}to{transform:scale(1);opacity:1}}
      `}</style>
      <div onClick={e=>e.stopPropagation()}
        style={{
          background:"white", borderRadius:18, width:"100%", maxWidth:560,
          maxHeight:"90vh", display:"flex", flexDirection:"column",
          boxShadow:"0 20px 60px rgba(0,0,0,0.3)",
          animation:"sdmPopIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          overflow:"hidden",
        }}>
        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", padding:"18px 22px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
          <div>
            <div style={{ fontSize:11, opacity:0.85, marginBottom:2, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Shipment</div>
            <div style={{ fontSize:18, fontWeight:900, fontFamily:"monospace" }}>
              {shipment.doc_no || shipment.id?.slice(0,8)}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.2)", color:"white", border:"none", width:34, height:34, borderRadius:"50%", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"18px 22px" }}>
          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
            {[
              { label:"Parcels", value:parcels.length, icon:"📦" },
              { label:"Weight",  value:`${Number(shipment.total_weight||0).toFixed(2)} kg`, icon:"⚖️" },
              { label:"Status",  value:shipment.status, icon:"📊" },
            ].map(s => (
              <div key={s.label} style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                <div style={{ fontSize:16 }}>{s.icon}</div>
                <div style={{ fontSize:13, fontWeight:900, color:C.text, marginTop:2 }}>{s.value}</div>
                <div style={{ fontSize:9, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginTop:1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Customer note */}
          {shipment.customer_note && (
            <div style={{ background:"#EFF6FF", border:"1px solid #bfdbfe", borderRadius:10, padding:"10px 12px", fontSize:12, color:C.primary, marginBottom:14, lineHeight:1.6 }}>
              💬 <strong>Your note:</strong> {shipment.customer_note}
            </div>
          )}

          {/* Parcels */}
          <div style={{ fontSize:11, fontWeight:800, color:C.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>
            Parcels in this shipment
          </div>
          {parcels.length === 0 ? (
            <div style={{ fontSize:12, color:C.muted, fontStyle:"italic", padding:"20px 0", textAlign:"center" }}>No parcels linked.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {parcels.map(p => {
                const items  = p.parcel_items  || [];
                const photos = p.parcel_photos || [];
                const weight = items.reduce((sum, i) => sum + (Number(i.weight) || 0) * (Number(i.qty) || 1), 0);
                const photoUrls = photos.map(ph => ph.url);
                return (
                  <div key={p.id} style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:photos.length>0?8:0 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:C.text }}>📦 {p.item_desc || "Parcel"}</div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:3, lineHeight:1.5 }}>
                          🔢 {p.domestic_tracking || "—"}
                          <br/>⚖️ {weight.toFixed(2)} kg
                          {p.arrived_at && <><br/>📅 Arrived {new Date(p.arrived_at).toLocaleDateString()}</>}
                        </div>
                      </div>
                      <StatusBadge map={PARCEL_STATUS} key_={p.status}/>
                    </div>
                    {/* Photos */}
                    {photos.length > 0 && (
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {photos.slice(0, 6).map((ph, i) => (
                          <button key={i} onClick={() => onOpenPhoto(photoUrls, i)}
                            style={{ width:56, height:56, borderRadius:8, overflow:"hidden", border:`1px solid ${C.border}`, padding:0, cursor:"pointer", background:"transparent", position:"relative", flexShrink:0 }}>
                            <img src={ph.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                            {i === 5 && photos.length > 6 && (
                              <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800 }}>
                                +{photos.length - 6}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop:"1px solid #e2e8f0", padding:"12px 22px", background:"#f8fafc", display:"flex", justifyContent:"flex-end" }}>
          <button onClick={onClose}
            style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", border:"none", borderRadius:10, padding:"9px 20px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TabPayments({ payments, loading, onPay }) {
  if (loading) return <LoadingState/>;
  if (!payments || payments.length === 0) {
    return <EmptyState icon="💳" title="No payments yet" hint="Your payment history will show up here after your first order or shipment."/>;
  }

  const outstanding = payments.filter(p => p.status === "unpaid");
  const totalDue = outstanding.reduce((s, p) => s + Number(p.amount || 0), 0);

  const statusColors = {
    unpaid:           { bg:"#fef9c3", color:"#854d0e", icon:"⏳" },
    pending_approval: { bg:"#dbeafe", color:"#1e40af", icon:"🔍" },
    approved:         { bg:"#d1fae5", color:"#065f46", icon:"✓"  },
    paid:             { bg:"#d1fae5", color:"#065f46", icon:"✅" },
    rejected:         { bg:"#fee2e2", color:"#991b1b", icon:"❌" },
    waived:           { bg:"#e0e7ff", color:"#3730a3", icon:"〰️" },
  };

  return (
    <div>
      {/* Outstanding banner */}
      {outstanding.length > 0 && (
        <div style={{ background:"#fef9c3", border:"1.5px solid #fde047", borderRadius:12, padding:"14px 16px", marginBottom:18, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:24 }}>⚠️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:800, color:"#854d0e" }}>Outstanding Payment</div>
            <div style={{ fontSize:12, color:"#a16207", marginTop:2 }}>{outstanding.length} item{outstanding.length>1?"s":""} pending · Total ฿{totalDue.toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 })}</div>
          </div>
        </div>
      )}

      <SectionTitle count={payments.length}>Payment History</SectionTitle>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {payments.map(p => {
          const amount = Number(p.amount || 0);
          const sc = statusColors[p.status] || { bg:"#f1f5f9", color:"#64748b", icon:"•" };
          const ctx = parseContext(p.context);
          return (
            <Card key={p.id}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:44, height:44, borderRadius:10, background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                  {p.type === "shipping" ? "✈️" : p.type === "subscription" ? "🎫" : "💰"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{p.item_desc || "Payment"}</div>
                    <span style={{ background:sc.bg, color:sc.color, fontSize:10, fontWeight:800, padding:"3px 9px", borderRadius:20, whiteSpace:"nowrap" }}>
                      {sc.icon} {p.status}
                    </span>
                  </div>
                  <div style={{ display:"flex", gap:12, fontSize:11, color:C.muted, marginBottom:8, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:900, color:p.status==="unpaid"?"#dc2626":C.muted }}>฿{amount.toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 })}</span>
                    <span>📅 {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</span>
                    {ctx?.carrier && <span>🚚 {ctx.carrier}</span>}
                    {ctx?.intl_tracking && <span style={{ fontFamily:"monospace" }}>🔢 {ctx.intl_tracking}</span>}
                  </div>
                  {p.status === "unpaid" && (
                    <button onClick={() => onPay(p)}
                      style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", border:"none", borderRadius:8, padding:"6px 16px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                      💳 Pay Now
                    </button>
                  )}
                  {p.status === "pending_approval" && (
                    <div style={{ fontSize:11, color:"#1e40af", background:"#dbeafe", borderRadius:8, padding:"6px 10px", display:"inline-block" }}>
                      🔍 Slip uploaded — waiting for staff approval
                    </div>
                  )}
                  {p.status === "rejected" && p.rejection_note && (
                    <div style={{ fontSize:11, color:"#991b1b", background:"#fee2e2", borderRadius:8, padding:"6px 10px", marginTop:4 }}>
                      ❌ <strong>Rejected:</strong> {p.rejection_note}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Helper: parse JSON context safely
function parseContext(ctx) {
  if (!ctx) return null;
  try { return typeof ctx === "string" ? JSON.parse(ctx) : ctx; } catch { return null; }
}

// ── Pay Box Modal (SM uploads slip OR shows PromptPay QR) ──────────────
function PayBoxModal({ payment, loading, result, onClose, onUploadSlip }) {
  const [method, setMethod] = useState("slip");   // 'slip' | 'promptpay'
  const [file, setFile]     = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (payment) {
      setMethod("slip"); setFile(null); setPreview(null);
    }
  }, [payment?.id]);

  if (!payment) return null;

  const amount = Number(payment.amount || 0);
  const ctx = parseContext(payment.context);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    try {
      if (typeof URL !== "undefined" && URL.createObjectURL) {
        setPreview(URL.createObjectURL(f));
      } else {
        // Fallback: FileReader for older browsers
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(f);
      }
    } catch (err) {
      console.warn("preview generation failed:", err);
    }
  };

  // Build a simple PromptPay QR string (just for display; manual confirm)
  // Note: This is a placeholder text; real PromptPay payload requires CRC.
  const ppNumber = "0812345678";  // TODO: replace with CartMates real PromptPay number

  return (
    <div onClick={() => !loading && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:"white", borderRadius:18, width:"100%", maxWidth:480, maxHeight:"92vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", overflow:"hidden", fontFamily:"'Nunito',sans-serif" }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", padding:"18px 22px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, opacity:0.85, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Pay</div>
            <div style={{ fontSize:15, fontWeight:900, marginTop:2, lineHeight:1.3 }}>{payment.item_desc}</div>
            <div style={{ fontSize:22, fontWeight:900, marginTop:6 }}>฿{amount.toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 })}</div>
          </div>
          <button onClick={() => !loading && onClose()} disabled={loading} style={{ background:"rgba(255,255,255,0.2)", color:"white", border:"none", width:32, height:32, borderRadius:"50%", fontSize:14, cursor:loading?"not-allowed":"pointer" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 22px" }}>
          {result ? (
            <div style={{ textAlign:"center", padding:"30px 10px" }}>
              <div style={{ fontSize:52, marginBottom:12 }}>{result.success ? "🎉" : "⚠️"}</div>
              <div style={{ fontSize:18, fontWeight:900, color:result.success?C.primary:"#dc2626", marginBottom:10 }}>
                {result.success ? "Payment Submitted!" : "Failed"}
              </div>
              <div style={{ fontSize:12, color:C.muted, lineHeight:1.7 }}>{result.message}</div>
            </div>
          ) : (
            <>
              {/* Method tabs */}
              <div style={{ display:"flex", gap:6, marginBottom:14 }}>
                <button onClick={()=>setMethod("slip")}
                  style={{ flex:1, padding:"10px", border:`1.5px solid ${method==="slip"?C.primary:"#e2e8f0"}`, background:method==="slip"?"#EFF6FF":"white", color:method==="slip"?C.primary:C.muted, borderRadius:10, fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                  📎 Bank Transfer Slip
                </button>
                <button onClick={()=>setMethod("promptpay")}
                  style={{ flex:1, padding:"10px", border:`1.5px solid ${method==="promptpay"?C.primary:"#e2e8f0"}`, background:method==="promptpay"?"#EFF6FF":"white", color:method==="promptpay"?C.primary:C.muted, borderRadius:10, fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                  📱 PromptPay
                </button>
              </div>

              {method === "promptpay" && (
                <div style={{ textAlign:"center", padding:"10px 0 16px" }}>
                  <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", background:"#fafbfc", border:"1.5px solid #e2e8f0", borderRadius:14, padding:16 }}>
                    <div style={{ fontSize:11, color:C.muted, marginBottom:8, fontWeight:700 }}>📱 Scan with banking app</div>
                    {/* Simple QR placeholder using google chart API */}
                    <img alt="PromptPay QR"
                      src={`https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(`promptpay://${ppNumber}?amount=${amount}`)}`}
                      style={{ width:180, height:180, borderRadius:8, background:"white", border:"1px solid #e2e8f0" }}/>
                    <div style={{ fontSize:11, color:C.text, marginTop:10, fontFamily:"monospace", fontWeight:700 }}>{ppNumber}</div>
                    <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>CARTMATES CO., LTD.</div>
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:14, lineHeight:1.6 }}>
                    After paying, please upload the confirmation slip below for verification.
                  </div>
                </div>
              )}

              {/* Slip upload — shown for both methods */}
              <div style={{ fontSize:11, fontWeight:800, color:C.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                {method === "slip" ? "Payment Slip" : "Confirmation Slip"}
              </div>

              {preview ? (
                <div style={{ position:"relative", marginBottom:12 }}>
                  <img src={preview} alt="" style={{ width:"100%", borderRadius:10, border:`1.5px solid ${C.border}` }}/>
                  <button onClick={() => { setFile(null); setPreview(null); }}
                    style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.6)", color:"white", border:"none", width:28, height:28, borderRadius:"50%", fontSize:12, cursor:"pointer" }}>✕</button>
                </div>
              ) : (
                <div style={{ display:"flex", gap:6, marginBottom:12 }}>
                  <label style={{ flex:1, background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", borderRadius:10, padding:"12px", fontSize:13, fontWeight:800, cursor:"pointer", textAlign:"center" }}>
                    📎 Choose Image
                    <input type="file" accept="image/*" onChange={onFile} style={{ display:"none" }}/>
                  </label>
                  <label style={{ flex:1, background:"#f1f5f9", color:C.text, borderRadius:10, padding:"12px", fontSize:13, fontWeight:800, cursor:"pointer", textAlign:"center" }}>
                    📷 Camera
                    <input type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display:"none" }}/>
                  </label>
                </div>
              )}

              <div style={{ background:"#fef9c3", border:"1px solid #fde047", borderRadius:10, padding:"10px 12px", fontSize:11, color:"#854d0e", lineHeight:1.6 }}>
                💡 After upload, your payment will be reviewed by staff. You'll be notified once approved.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop:`1px solid ${C.border}`, padding:"12px 22px", background:"#f8fafc", display:"flex", gap:8 }}>
          {result ? (
            <button onClick={onClose} style={{ flex:1, padding:11, background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", border:"none", borderRadius:10, fontSize:13, fontWeight:900, cursor:"pointer", fontFamily:"inherit" }}>Got it</button>
          ) : (
            <>
              <button onClick={onClose} disabled={loading} style={{ flex:1, padding:11, background:"#f1f5f9", color:C.muted, border:"none", borderRadius:10, fontSize:12, fontWeight:800, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit" }}>Cancel</button>
              <button onClick={() => onUploadSlip(file, method)} disabled={loading || !file}
                style={{ flex:2, padding:11, background:(loading || !file)?"#94a3b8":`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", border:"none", borderRadius:10, fontSize:12, fontWeight:900, cursor:(loading || !file)?"not-allowed":"pointer", fontFamily:"inherit" }}>
                {loading ? "Submitting..." : "Submit Payment 💳"}
              </button>
            </>
          )}
        </div>
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

  // ── Shipment request modal state ──
  const [shipReqModal, setShipReqModal] = useState(null);  // { parcelIds: [...] } | null
  const [shipReqLoading, setShipReqLoading] = useState(false);
  const [shipReqResult, setShipReqResult] = useState(null);  // { success: bool, message: str }

  // ── Pay box modal state ──
  const [payModal, setPayModal] = useState(null);  // selected payment row
  const [payLoading, setPayLoading] = useState(false);
  const [payResult, setPayResult] = useState(null);

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
      // JOIN parcel_items (for weight + dimensions) and parcel_photos (for images)
      const { data: pc, error: pcErr } = await supabase
        .from("parcels")
        .select(`
          *,
          parcel_items(weight, width, length, height, item_desc, qty),
          parcel_photos(id, url, type)
        `)
        .eq("member_id", user.id)
        .in("status", ["arrived","rechecking","packed"])
        .order("arrived_at", { ascending: false });

      if (pcErr) console.warn("parcels query failed:", pcErr);

      // Normalize: roll up parcel_items weight + photos to top level
      const normalized = (pc || []).map(p => {
        const items  = p.parcel_items || [];
        const photos = p.parcel_photos || [];
        const totalWeight = items.reduce((s,i) => s + (Number(i.weight) || 0) * (Number(i.qty) || 1), 0);
        return {
          ...p,
          weight_kg:        totalWeight || null,
          inbound_photos:   photos.filter(ph => ph.type === "arrival").map(ph => ph.url),
          recheck_photos:   photos.filter(ph => ph.type === "recheck").map(ph => ph.url),
          packing_photos:   photos.filter(ph => ph.type === "packing").map(ph => ph.url),
          all_photos:       photos.map(ph => ph.url),
        };
      });

      setParcels(normalized);
      setProfile(p => ({ ...p, parcels_in_storage: normalized.length }));

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

      // Shipments — joined via shipment_boxes.member_id pattern
      // Shipments with parcels embedded
      const { data: sh } = await supabase
        .from("shipments")
        .select(`
          *,
          parcels(id, item_desc, domestic_tracking, status, arrived_at,
                  parcel_items(weight, width, length, height, qty),
                  parcel_photos(url, type))
        `)
        .eq("member_id", user.id)
        .order("created_at", { ascending: false });

      // Normalize: roll up parcels list + total weight
      setShipments((sh || []).map(s => {
        const parcelsList = s.parcels || [];
        const totalWeight = parcelsList.reduce((sum, p) => {
          const items = p.parcel_items || [];
          return sum + items.reduce((ss, i) => ss + (Number(i.weight) || 0) * (Number(i.qty) || 1), 0);
        }, 0);
        return {
          ...s,
          parcels_list: parcelsList,
          total_weight: totalWeight,
        };
      }));

      // Payments — fetch from `payments` table with proper columns
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("id, type, item_desc, amount, status, slip_url, slip_uploaded_at, approved_at, rejection_note, rejected_at, paid_at, context, created_at")
        .eq("member_id", user.id)
        .order("created_at", { ascending: false });

      setPayments(paymentsData || []);

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
              {activeTab === "parcels"   && <TabParcels   parcels={parcels}   profile={profile} loading={loading} onRequestShipment={(ids) => setShipReqModal({ parcelIds: ids })}/>}
              {activeTab === "orders"    && <TabOrders    orders={orders}     loading={loading}/>}
              {activeTab === "shipments" && <TabShipments shipments={shipments} loading={loading}/>}
              {activeTab === "payments"  && <TabPayments  payments={payments} loading={loading} onPay={(p)=>{ setPayModal(p); setPayResult(null); }}/>}
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
                  View Shipments ✈️
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Request Shipment Modal */}
      <RequestShipmentModal
        modal={shipReqModal}
        parcels={parcels}
        loading={shipReqLoading}
        result={shipReqResult}
        onClose={() => { setShipReqModal(null); setShipReqResult(null); }}
        onConfirm={async (note) => {
          console.log("🚀 [Ship] Confirm clicked, modal:", shipReqModal);
          if (!shipReqModal) {
            console.warn("⚠️ [Ship] No modal — aborting");
            return;
          }
          setShipReqLoading(true);
          try {
            console.log("🚀 [Ship] Calling fn_request_shipment with:", {
              p_parcel_ids: shipReqModal.parcelIds,
              p_note: note,
            });
            const { data, error } = await supabase.rpc("fn_request_shipment", {
              p_parcel_ids: shipReqModal.parcelIds,
              p_address_id: null,
              p_note:       note || null,
            });
            console.log("🚀 [Ship] RPC response:", { data, error });
            if (error) {
              console.error("❌ [Ship] RPC error:", error);
              setShipReqResult({ success: false, message: error.message });
            } else {
              console.log("✅ [Ship] Success — shipment_id:", data);
              setShipReqResult({ success: true, message: "Shipment requested! Our staff will start packing soon." });
              await fetchAll();
            }
          } catch (e) {
            console.error("❌ [Ship] Exception:", e);
            setShipReqResult({ success: false, message: e.message || "Network error" });
          } finally {
            setShipReqLoading(false);
          }
        }}
      />

      {/* Pay Box Modal */}
      <PayBoxModal
        payment={payModal}
        loading={payLoading}
        result={payResult}
        onClose={() => { setPayModal(null); setPayResult(null); }}
        onUploadSlip={async (file, method) => {
          if (!payModal || !file) return;
          setPayLoading(true);
          try {
            // Upload to payment-slips bucket
            const ext = (file.name || "slip").split(".").pop()?.toLowerCase() || "jpg";
            const path = `${user.id}/${payModal.id}/${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("payment-slips")
              .upload(path, file, { cacheControl: "3600", upsert: false });
            if (upErr) throw upErr;

            const { data: pub } = supabase.storage.from("payment-slips").getPublicUrl(path);
            const slipUrl = pub?.publicUrl;
            if (!slipUrl) throw new Error("Failed to get slip URL");

            // Call RPC
            const { error: rpcErr } = await supabase.rpc("fn_pay_box", {
              p_payment_id: payModal.id,
              p_slip_url:   slipUrl,
              p_method:     method,
            });
            if (rpcErr) throw rpcErr;

            setPayResult({ success: true, message: "Your payment has been submitted. Our staff will review and approve it shortly." });
            await fetchAll();
          } catch (e) {
            console.error("pay box error:", e);
            setPayResult({ success: false, message: e.message || "Failed to submit payment" });
          } finally {
            setPayLoading(false);
          }
        }}
      />
    </>
  );
}

// ── Request Shipment Modal ────────────────────────────────────────────────
function RequestShipmentModal({ modal, parcels, loading, result, onClose, onConfirm }) {
  const [note, setNote] = useState("");
  useEffect(() => { if (modal) setNote(""); }, [modal]);
  if (!modal) return null;

  const selectedParcels = (parcels || []).filter(p => modal.parcelIds.includes(p.id));
  const totalWeight = selectedParcels.reduce((s,p) => s + (Number(p.weight_kg) || 0), 0);

  return (
    <div onClick={() => !loading && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:9998, display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"rsFadeIn 0.2s ease", fontFamily:"'Nunito',sans-serif" }}>
      <style>{`@keyframes rsFadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:"white", borderRadius:18, padding:24, maxWidth:480, width:"100%", boxShadow:"0 24px 64px rgba(0,0,0,0.3)", maxHeight:"90vh", overflow:"auto" }}>

        {result ? (
          /* ── Result screen ── */
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:52, marginBottom:12 }}>{result.success ? "🎉" : "⚠️"}</div>
            <div style={{ fontSize:19, fontWeight:900, color:result.success?"#075BB0":"#dc2626", marginBottom:10 }}>
              {result.success ? "Shipment Requested!" : "Could not submit"}
            </div>
            <div style={{ fontSize:13, color:"#475569", lineHeight:1.7, marginBottom:22 }}>{result.message}</div>
            <button onClick={onClose} style={{ width:"100%", padding:12, background:"linear-gradient(135deg,#075BB0,#0484CF)", color:"white", border:"none", borderRadius:12, fontSize:14, fontWeight:900, cursor:"pointer", fontFamily:"inherit" }}>
              Got it
            </button>
          </div>
        ) : (
          /* ── Confirmation form ── */
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:18, fontWeight:900, color:"#075BB0" }}>✈️ Request Shipment</div>
              <button onClick={onClose} disabled={loading} style={{ background:"transparent", border:"none", fontSize:20, cursor:loading?"not-allowed":"pointer", color:"#94a3b8" }}>✕</button>
            </div>

            <div style={{ fontSize:13, color:"#475569", marginBottom:12, lineHeight:1.6 }}>
              You're about to request shipment for <strong>{selectedParcels.length} parcel{selectedParcels.length>1?"s":""}</strong> (total <strong>{totalWeight.toFixed(2)} kg</strong>).
            </div>

            {/* Parcel list */}
            <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 12px", marginBottom:14, maxHeight:160, overflow:"auto" }}>
              {selectedParcels.map(p => (
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"6px 0", borderBottom:"1px dashed #e2e8f0" }}>
                  <span style={{ color:"#0F172A", fontWeight:700 }}>📦 {p.item_desc || "Parcel"}</span>
                  <span style={{ color:"#64748b" }}>{p.weight_kg ? `${Number(p.weight_kg).toFixed(2)} kg` : "—"}</span>
                </div>
              ))}
            </div>

            {/* Note */}
            <label style={{ display:"block", fontSize:11, fontWeight:800, color:"#64748b", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              Special note for staff (optional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. consolidate into 2 boxes, fragile, etc."
              rows={3}
              style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"10px 12px", fontSize:13, resize:"vertical", fontFamily:"inherit", marginBottom:14, boxSizing:"border-box" }}
            />

            {/* Info */}
            <div style={{ background:"#fef9c3", border:"1px solid #fde047", borderRadius:10, padding:"10px 12px", fontSize:11.5, color:"#854d0e", lineHeight:1.6, marginBottom:18 }}>
              💡 Our staff will pack and weigh your parcels, then send you the final shipping cost. You can pay and confirm before we ship.
            </div>

            <div style={{ display:"flex", gap:8 }}>
              <button onClick={onClose} disabled={loading} style={{ flex:1, padding:12, background:"#f1f5f9", color:"#64748b", border:"none", borderRadius:12, fontSize:13, fontWeight:800, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit" }}>
                Cancel
              </button>
              <button onClick={() => onConfirm(note)} disabled={loading} style={{ flex:2, padding:12, background:loading?"#94a3b8":"linear-gradient(135deg,#075BB0,#0484CF)", color:"white", border:"none", borderRadius:12, fontSize:13, fontWeight:900, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit" }}>
                {loading ? "Submitting..." : "Confirm Request ✈️"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
