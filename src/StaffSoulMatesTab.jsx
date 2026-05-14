import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./supabaseClient";

// ─────────────────────────────────────────────────────────────────────────────
//  StaffSoulMatesTab_v1.jsx — Staff dashboard Soul Mates module
//
//  Standalone tab that plugs into StaffDashboard. Handles all SM-specific
//  warehouse operations separately from TM workflow.
//
//  Sub-tabs:
//    1. 📦 Inbound      — incoming parcels for SM members (scan + register)
//    2. 🛒 Orders       — Marketplace orders awaiting packing
//    3. 🚀 Shipments    — pending ship requests (from My Parcels)
//    4. ✓ Completed     — shipped today/this week
//
//  To plug in: see plug instructions at bottom of file.
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  primary: "#075BB0",
  sky:     "#0484CF",
  yellow:  "#FFEB59",
  bg:      "#f1f5f9",
  surface: "#ffffff",
  text:    "#0f172a",
  muted:   "#64748b",
  border:  "#e2e8f0",
  green:   "#10b981",
  red:     "#ef4444",
  amber:   "#f59e0b",
  violet:  "#7c3aed",
};

const ORDER_STATUS = {
  pending_payment:  { label:"Pending Payment",  bg:"#fef3c7", color:"#92400e" },
  pending_approval: { label:"Manager Review",   bg:"#dbeafe", color:"#1e40af" },
  paid:             { label:"Ready to Pack",    bg:"#d1fae5", color:"#065f46" },
  processing:       { label:"Packing",          bg:"#e0e7ff", color:"#3730a3" },
  shipped:          { label:"Shipped",          bg:"#cffafe", color:"#155e75" },
  in_warehouse:     { label:"Hold @ Warehouse", bg:"#f3e8ff", color:"#6b21a8" },
  completed:        { label:"Completed",        bg:"#f1f5f9", color:"#475569" },
  cancelled:        { label:"Cancelled",        bg:"#fee2e2", color:"#991b1b" },
};

const PARCEL_STATUS = {
  arrived:    { label:"Arrived",     bg:"#dbeafe", color:"#1e40af" },
  rechecking: { label:"Rechecking",  bg:"#fef3c7", color:"#92400e" },
  packed:     { label:"Packed",      bg:"#d1fae5", color:"#065f46" },
  shipped:    { label:"Shipped",     bg:"#cffafe", color:"#155e75" },
};

function Badge({ map, k }) {
  const s = map[k] || { label:k, bg:"#f1f5f9", color:"#475569" };
  return (
    <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20, whiteSpace:"nowrap" }}>
      {s.label}
    </span>
  );
}

function Loading() {
  return (
    <div style={{ padding:60, textAlign:"center", color:C.muted }}>
      <div style={{ fontSize:34, marginBottom:8, animation:"spin 1s linear infinite" }}>🐰</div>
      <div style={{ fontSize:13, fontWeight:700 }}>Loading…</div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Empty({ icon, title, hint }) {
  return (
    <div style={{ padding:60, textAlign:"center", color:C.muted }}>
      <div style={{ fontSize:52, marginBottom:14 }}>{icon}</div>
      <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:13 }}>{hint}</div>
    </div>
  );
}

const inp = () => ({
  width:"100%", padding:"10px 12px",
  border:`1.5px solid ${C.border}`, borderRadius:8,
  fontSize:13, outline:"none", fontFamily:"inherit",
  background:"white", color:C.text, boxSizing:"border-box",
});
const lbl = { display:"block", fontSize:11, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:5 };

// ════════════════════════════════════════════════════════════════════
// SUB-TAB 1: INBOUND — Parcels arriving at warehouse for SM members
// ════════════════════════════════════════════════════════════════════
function InboundSubtab({ user }) {
  const [search, setSearch]   = useState("");
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Fetch all SM members (tier='SM')
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, smart_id, first_name, last_name, country, email")
        .eq("tier", "SM")
        .eq("account_status", "active")
        .order("created_at", { ascending: false });
      setMembers(data || []);
    };
    fetch();
  }, []);

  // Fetch parcels for selected member
  const fetchParcels = useCallback(async () => {
    if (!selectedMember) return;
    setLoading(true);
    const { data } = await supabase
      .from("parcels")
      .select("*")
      .eq("member_id", selectedMember.id)
      .order("arrived_at", { ascending: false });
    setParcels(data || []);
    setLoading(false);
  }, [selectedMember]);

  useEffect(() => { fetchParcels(); }, [fetchParcels]);

  // Realtime
  useEffect(() => {
    if (!selectedMember) return;
    const ch = supabase.channel(`staff-sm-inbound-${selectedMember.id}`)
      .on("postgres_changes", { event:"*", schema:"public", table:"parcels", filter:`member_id=eq.${selectedMember.id}` }, fetchParcels)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [selectedMember, fetchParcels]);

  const filteredMembers = useMemo(() => {
    if (!search) return members.slice(0, 20);
    const term = search.toLowerCase();
    return members.filter(m =>
      m.smart_id?.toLowerCase().includes(term) ||
      `${m.first_name||""} ${m.last_name||""}`.toLowerCase().includes(term) ||
      m.email?.toLowerCase().includes(term)
    ).slice(0, 20);
  }, [members, search]);

  return (
    <div>
      {/* Member search/lock */}
      {!selectedMember ? (
        <>
          <div style={{ background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", borderRadius:14, padding:"16px 18px", marginBottom:16 }}>
            <div style={{ fontSize:15, fontWeight:800, color:C.primary, marginBottom:4 }}>🔍 Find Soul Mates Member</div>
            <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>Search by Smart ID, name, or email to start logging incoming parcels.</div>
            <input
              autoFocus
              placeholder="🔎 SM-JPN-042, mumu, customer@email..."
              value={search}
              onChange={e=>setSearch(e.target.value)}
              style={{ ...inp(), background:"white", borderColor:C.primary, fontSize:14 }}
            />
          </div>

          <div style={{ fontSize:12, fontWeight:800, color:C.text, marginBottom:8 }}>
            {search ? `Results (${filteredMembers.length})` : `Recent Soul Mates (${filteredMembers.length})`}
          </div>

          {filteredMembers.length === 0 ? (
            <Empty icon="🔍" title="No matches" hint="Try a different search term"/>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filteredMembers.map(m => (
                <div key={m.id} onClick={()=>setSelectedMember(m)}
                  style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:12, padding:12, cursor:"pointer", display:"flex", alignItems:"center", gap:12, transition:"all 0.15s" }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.background = "#f8fafc"; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "white"; }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>🐰</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:800, color:C.text, fontFamily:"monospace" }}>{m.smart_id || "—"}</div>
                    <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                      {`${m.first_name||""} ${m.last_name||""}`.trim() || "—"}
                      {m.country && <> · {m.country}</>}
                    </div>
                  </div>
                  <span style={{ color:C.primary, fontSize:18 }}>›</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Selected member header */}
          <div style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, borderRadius:14, padding:"14px 18px", marginBottom:14, display:"flex", alignItems:"center", gap:12, color:"white" }}>
            <div style={{ width:42, height:42, borderRadius:10, background:C.yellow, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🐰</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, opacity:0.85, fontWeight:700 }}>LOCKED ON</div>
              <div style={{ fontSize:14, fontWeight:900, fontFamily:"monospace" }}>{selectedMember.smart_id}</div>
              <div style={{ fontSize:12, opacity:0.85, marginTop:2 }}>
                {`${selectedMember.first_name||""} ${selectedMember.last_name||""}`.trim()} · {selectedMember.country}
              </div>
            </div>
            <button onClick={()=>{ setSelectedMember(null); setShowForm(false); }} style={{ background:"rgba(255,255,255,0.2)", color:"white", border:"none", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
              Change
            </button>
          </div>

          {/* Quick stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:8, marginBottom:14 }}>
            {[
              { label:"In Warehouse", value: parcels.filter(p => ["arrived","rechecking"].includes(p.status)).length, color:C.green },
              { label:"Packed",       value: parcels.filter(p => p.status === "packed").length, color:C.amber },
              { label:"Shipped",      value: parcels.filter(p => p.status === "shipped").length, color:C.muted },
              { label:"Total weight", value: `${parcels.reduce((s,p)=>s+(Number(p.weight_kg)||0),0).toFixed(1)} kg`, color:C.primary },
            ].map(s => (
              <div key={s.label} style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:"uppercase" }}>{s.label}</div>
                <div style={{ fontSize:18, fontWeight:900, color:s.color, marginTop:2 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Add parcel button */}
          {!showForm && (
            <button onClick={()=>setShowForm(true)}
              style={{ width:"100%", background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", border:"none", borderRadius:12, padding:"14px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit", marginBottom:14 }}>
              + Log new parcel arrival
            </button>
          )}

          {/* Add parcel form */}
          {showForm && (
            <NewParcelForm
              member={selectedMember}
              staffUserId={user?.id}
              onCancel={()=>setShowForm(false)}
              onSaved={()=>{ setShowForm(false); fetchParcels(); }}
            />
          )}

          {/* Parcels list */}
          {loading ? <Loading/> :
           parcels.length === 0 ? <Empty icon="📦" title="No parcels yet" hint="Click 'Log new parcel arrival' above to register an incoming package"/> :
           (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ fontSize:12, fontWeight:800, color:C.text }}>All parcels ({parcels.length})</div>
              {parcels.map(p => (
                <div key={p.id} style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:12, padding:12 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>📦</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:C.text }}>{p.item_desc || "Parcel"}</div>
                        <Badge map={PARCEL_STATUS} k={p.status}/>
                      </div>
                      <div style={{ display:"flex", gap:12, fontSize:11, color:C.muted, flexWrap:"wrap", marginBottom:6 }}>
                        <span>🔢 {p.domestic_tracking || "—"}</span>
                        <span>⚖️ {p.weight_kg || "—"} kg</span>
                        <span>📅 {p.arrived_at ? new Date(p.arrived_at).toLocaleDateString() : "—"}</span>
                      </div>
                      {p.flag_note && (
                        <div style={{ background:"#fef9c3", border:"1px solid #fde047", borderRadius:6, padding:"6px 8px", fontSize:11, color:"#854d0e", fontWeight:700 }}>
                          ⚠️ {p.flag_note}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
           )
          }
        </>
      )}
    </div>
  );
}

// ── New Parcel Form (inside Inbound) ─────────────────────────────────
function NewParcelForm({ member, staffUserId, onCancel, onSaved }) {
  const [form, setForm] = useState({
    domestic_tracking: "",
    item_desc:         "",
    weight_kg:         "",
    width:             "",
    length:            "",
    height:            "",
    notes:             "",
  });
  const [photoFiles, setPhotoFiles] = useState([]);   // File[]
  const [photoPreviews, setPhotoPreviews] = useState([]); // base64[]
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const handlePhotos = (files) => {
    const arr = Array.from(files || []);
    setPhotoFiles(prev => [...prev, ...arr]);
    arr.forEach(f => {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreviews(prev => [...prev, reader.result]);
      reader.readAsDataURL(f);
    });
  };

  const removePhoto = (i) => {
    setPhotoFiles(prev => prev.filter((_, idx) => idx !== i));
    setPhotoPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    if (!form.domestic_tracking.trim() || !form.item_desc.trim()) {
      setErr("Tracking number and item description are required");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      // 1. Insert parcel
      const { data: parcel, error: parcelErr } = await supabase
        .from("parcels")
        .insert({
          member_id:         member.id,
          domestic_tracking: form.domestic_tracking.trim(),
          item_desc:         form.item_desc.trim(),
          weight_kg:         form.weight_kg ? Number(form.weight_kg) : null,
          width:             form.width  ? Number(form.width)  : null,
          length:            form.length ? Number(form.length) : null,
          height:            form.height ? Number(form.height) : null,
          status:            "arrived",
          arrived_at:        new Date().toISOString(),
          flag_note:         form.notes.trim() || null,
        })
        .select("id")
        .single();
      if (parcelErr) throw parcelErr;

      // 2. Upload photos to Supabase Storage + insert into parcel_photos
      if (photoFiles.length > 0) {
        const uploadedUrls = [];
        for (const file of photoFiles) {
          const ext = file.name.split(".").pop();
          const path = `parcels/${parcel.id}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("parcel-photos")
            .upload(path, file);
          if (upErr) throw new Error("Photo upload failed: " + upErr.message);
          const { data: { publicUrl } } = supabase.storage
            .from("parcel-photos")
            .getPublicUrl(path);
          uploadedUrls.push(publicUrl);
        }

        // Insert rows into parcel_photos
        const rows = uploadedUrls.map(url => ({
          parcel_id: parcel.id,
          url,
          type:      "inbound",
          uploaded_by: staffUserId,
        }));
        const { error: photoErr } = await supabase.from("parcel_photos").insert(rows);
        if (photoErr) console.warn("parcel_photos insert warning:", photoErr);
      }

      onSaved?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Live billable weight preview
  const w = Number(form.width), l = Number(form.length), h = Number(form.height);
  const volumetric = (w && l && h) ? (w * l * h) / 5000 : 0;
  const actual = Number(form.weight_kg) || 0;
  const billable = Math.max(actual, volumetric);

  return (
    <div style={{ background:"white", border:`2px solid ${C.primary}`, borderRadius:14, padding:18, marginBottom:14 }}>
      <div style={{ fontSize:14, fontWeight:800, color:C.primary, marginBottom:14 }}>📦 New Parcel Arrival</div>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div>
          <label style={lbl}>Domestic Tracking # *</label>
          <input autoFocus style={inp()} value={form.domestic_tracking} onChange={e=>setForm(f=>({...f,domestic_tracking:e.target.value}))} placeholder="TH001234567"/>
        </div>
        <div>
          <label style={lbl}>Item Description *</label>
          <input style={inp()} value={form.item_desc} onChange={e=>setForm(f=>({...f,item_desc:e.target.value}))} placeholder="e.g. GMMTV photobook"/>
        </div>

        {/* Weight + Dimensions */}
        <div style={{ background:"#f8fafc", border:`1px solid ${C.border}`, borderRadius:10, padding:14 }}>
          <div style={{ fontSize:12, fontWeight:800, color:C.primary, marginBottom:10 }}>⚖️ Weight & Dimensions</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
            <div>
              <label style={lbl}>Weight (kg)</label>
              <input type="number" step="0.001" style={inp()} value={form.weight_kg} onChange={e=>setForm(f=>({...f,weight_kg:e.target.value}))} placeholder="0.5"/>
            </div>
            <div>
              <label style={lbl}>W (cm)</label>
              <input type="number" step="0.1" style={inp()} value={form.width} onChange={e=>setForm(f=>({...f,width:e.target.value}))} placeholder="15"/>
            </div>
            <div>
              <label style={lbl}>L (cm)</label>
              <input type="number" step="0.1" style={inp()} value={form.length} onChange={e=>setForm(f=>({...f,length:e.target.value}))} placeholder="22"/>
            </div>
            <div>
              <label style={lbl}>H (cm)</label>
              <input type="number" step="0.1" style={inp()} value={form.height} onChange={e=>setForm(f=>({...f,height:e.target.value}))} placeholder="5"/>
            </div>
          </div>
          {(actual > 0 || volumetric > 0) && (
            <div style={{ marginTop:10, padding:"8px 10px", background:"white", borderRadius:8, fontSize:11, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
              <span style={{ color:C.muted }}>Actual: <strong style={{ color:C.text }}>{actual.toFixed(2)} kg</strong></span>
              <span style={{ color:C.muted }}>Volumetric: <strong style={{ color:C.text }}>{volumetric.toFixed(2)} kg</strong></span>
              <span style={{ fontWeight:700, color:C.primary }}>Billable: {billable.toFixed(2)} kg</span>
            </div>
          )}
        </div>

        {/* Photos */}
        <div>
          <label style={lbl}>📸 Photos (optional)</label>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {photoPreviews.map((src, i) => (
              <div key={i} style={{ position:"relative", width:80, height:80, borderRadius:8, overflow:"hidden", border:`1.5px solid ${C.border}` }}>
                <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                <button onClick={()=>removePhoto(i)} style={{ position:"absolute", top:2, right:2, width:20, height:20, borderRadius:"50%", background:"rgba(0,0,0,0.7)", color:"white", border:"none", fontSize:11, cursor:"pointer" }}>✕</button>
              </div>
            ))}
            <label style={{ width:80, height:80, borderRadius:8, border:`2px dashed ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.muted, fontSize:11, fontWeight:700, flexDirection:"column", gap:4, background:"#f8fafc" }}>
              <span style={{ fontSize:20 }}>📷</span>
              <span>Add</span>
              <input type="file" accept="image/*" multiple onChange={e=>handlePhotos(e.target.files)} style={{ display:"none" }}/>
            </label>
            <label style={{ width:80, height:80, borderRadius:8, border:`2px dashed ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.muted, fontSize:11, fontWeight:700, flexDirection:"column", gap:4, background:"#f8fafc" }}>
              <span style={{ fontSize:20 }}>📸</span>
              <span>Camera</span>
              <input type="file" accept="image/*" capture="environment" onChange={e=>handlePhotos(e.target.files)} style={{ display:"none" }}/>
            </label>
          </div>
        </div>

        <div>
          <label style={lbl}>Notes / Flag (optional)</label>
          <textarea style={{ ...inp(), minHeight:60, resize:"vertical" }} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Any damage, special handling required?"/>
        </div>

        {err && <div style={{ background:"#fee2e2", border:"1.5px solid #fca5a5", borderRadius:8, padding:"10px 12px", color:"#991b1b", fontSize:12, fontWeight:700 }}>⚠️ {err}</div>}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel} disabled={saving} style={{ padding:"10px 20px", background:"white", color:C.muted, border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Cancel
          </button>
          <div style={{ flex:1 }}/>
          <button onClick={handleSave} disabled={saving} style={{ padding:"10px 22px", background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", border:"none", borderRadius:8, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Log Arrival ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SUB-TAB 2: ORDERS — Marketplace orders awaiting packing
// ════════════════════════════════════════════════════════════════════
function OrdersSubtab({ user }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_orders")
      .select(`
        *,
        items:marketplace_order_items(id, product_name, product_sku, qty),
        customer:profiles!marketplace_orders_user_id_fkey(smart_id, first_name, last_name, country)
      `)
      .in("status", ["paid", "processing", "in_warehouse"])
      .order("paid_at", { ascending: true });   // FIFO: oldest paid first
    setOrders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const ch = supabase.channel("staff-sm-orders")
      .on("postgres_changes", { event:"*", schema:"public", table:"marketplace_orders" }, fetchOrders)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchOrders]);

  const startPacking = async (orderId) => {
    await supabase.from("marketplace_orders").update({ status: "processing" }).eq("id", orderId);
  };

  const markShipped = async (order) => {
    const tracking = window.prompt("Enter international tracking number:");
    if (!tracking?.trim()) return;
    await supabase.from("marketplace_orders").update({
      status: "shipped",
      international_tracking: tracking.trim(),
      shipped_at: new Date().toISOString(),
    }).eq("id", order.id);
  };

  const moveToWarehouse = async (orderId) => {
    if (!window.confirm("Move this order to Hold @ Warehouse?")) return;
    await supabase.from("marketplace_orders").update({ status: "in_warehouse" }).eq("id", orderId);
  };

  if (loading) return <Loading/>;
  if (orders.length === 0) return <Empty icon="🛒" title="No orders to pack" hint="When customers pay for Marketplace orders, they'll appear here"/>;

  return (
    <div>
      <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>
        Showing {orders.length} order{orders.length>1?"s":""} ready or in progress.
        FIFO order — oldest payment first.
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {orders.map(o => {
          const customer = o.customer || {};
          const isShipNow = o.shipping_method === "ship_now";
          return (
            <div key={o.id} style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:12, padding:14 }}>
              {/* Header */}
              <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:10, flexWrap:"wrap" }}>
                <div style={{ width:42, height:42, borderRadius:10, background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                  {isShipNow ? "✈️" : "📦"}
                </div>
                <div style={{ flex:"1 1 200px", minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:800, color:C.text, fontFamily:"monospace" }}>{o.order_no}</div>
                  <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                    <span style={{ fontFamily:"monospace", fontWeight:700 }}>{customer.smart_id || "—"}</span>
                    · {`${customer.first_name||""} ${customer.last_name||""}`.trim()}
                    {customer.country && <> · {customer.country}</>}
                  </div>
                </div>
                <Badge map={ORDER_STATUS} k={o.status}/>
              </div>

              {/* Items */}
              <div style={{ background:"#f8fafc", borderRadius:8, padding:"8px 12px", marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>Items</div>
                {(o.items || []).map(it => (
                  <div key={it.id} style={{ fontSize:12, color:C.text, padding:"2px 0" }}>
                    {it.qty}× {it.product_name} <span style={{ color:C.muted, fontFamily:"monospace" }}>· {it.product_sku}</span>
                  </div>
                ))}
              </div>

              {/* Shipping info */}
              <div style={{ display:"flex", gap:14, fontSize:11, color:C.muted, marginBottom:10, flexWrap:"wrap" }}>
                <span>📅 Paid {o.paid_at ? new Date(o.paid_at).toLocaleDateString() : "—"}</span>
                <span>💰 ฿{Number(o.total_thb).toLocaleString()}</span>
                {o.billable_weight_kg && <span>⚖️ {Number(o.billable_weight_kg).toFixed(2)} kg billable</span>}
                {o.carrier && <span>✈️ {o.carrier}</span>}
              </div>

              {/* Ship Now address */}
              {isShipNow && o.shipping_address && (
                <details style={{ marginBottom:10, fontSize:12 }}>
                  <summary style={{ cursor:"pointer", color:C.primary, fontWeight:700, fontSize:12 }}>📍 Show shipping address</summary>
                  <div style={{ marginTop:6, padding:10, background:"#f8fafc", borderRadius:6, color:C.text, lineHeight:1.6 }}>
                    <strong>{o.shipping_address.name}</strong><br/>
                    {o.shipping_address.line1}<br/>
                    {[o.shipping_address.city, o.shipping_address.state, o.shipping_address.postcode].filter(Boolean).join(", ")}<br/>
                    {o.shipping_address.country} · {o.shipping_address.phone}
                  </div>
                </details>
              )}

              {/* Customer note */}
              {o.customer_note && (
                <div style={{ background:"#fef3c7", border:"1px solid #fde68a", borderRadius:8, padding:"8px 10px", marginBottom:10, fontSize:12 }}>
                  <strong style={{ color:"#92400e" }}>💬 Note:</strong> <span style={{ color:"#78350f" }}>{o.customer_note}</span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {o.status === "paid" && isShipNow && (
                  <button onClick={()=>startPacking(o.id)} style={btnAction(C.sky)}>Start Packing →</button>
                )}
                {o.status === "paid" && !isShipNow && (
                  <button onClick={()=>moveToWarehouse(o.id)} style={btnAction(C.violet)}>📦 Move to Warehouse</button>
                )}
                {o.status === "processing" && isShipNow && (
                  <button onClick={()=>markShipped(o)} style={btnAction(C.green)}>✈️ Mark Shipped + Add Tracking</button>
                )}
                {o.status === "in_warehouse" && (
                  <span style={{ fontSize:11, color:C.muted, fontStyle:"italic" }}>Holding — customer will request shipment from My Parcels</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const btnAction = (color, ghost = false) => ({
  background: ghost ? "white" : color,
  color: ghost ? color : "white",
  border: ghost ? `1.5px solid ${color}` : "none",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "inherit",
});

// ════════════════════════════════════════════════════════════════════
// SUB-TAB 3: SHIPMENTS — Customer-requested ship outs (from My Parcels)
// ════════════════════════════════════════════════════════════════════
function ShipmentsSubtab() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading]     = useState(true);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    // Get shipments for SM members only
    const { data } = await supabase
      .from("shipments")
      .select(`
        *,
        customer:profiles!shipments_member_id_fkey(smart_id, first_name, last_name, country, tier)
      `)
      .order("issued_at", { ascending: false })
      .limit(50);

    // Filter to only SM members (since shipments table may have all tiers)
    const smOnly = (data || []).filter(s => s.customer?.tier === "SM");
    setShipments(smOnly);
    setLoading(false);
  }, []);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  useEffect(() => {
    const ch = supabase.channel("staff-sm-shipments")
      .on("postgres_changes", { event:"*", schema:"public", table:"shipments" }, fetchShipments)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchShipments]);

  if (loading) return <Loading/>;
  if (shipments.length === 0) return <Empty icon="✈️" title="No Soul Mates shipments yet" hint="When SM customers request to ship parcels out, they'll show here"/>;

  return (
    <div>
      <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>
        Recent Soul Mates shipments ({shipments.length})
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {shipments.map(s => {
          const c = s.customer || {};
          return (
            <div key={s.id} style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:12, padding:14, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              <div style={{ width:40, height:40, borderRadius:10, background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>✈️</div>
              <div style={{ flex:"1 1 200px", minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:800, color:C.text, fontFamily:"monospace" }}>{s.doc_no || s.id?.slice(0,8)}</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                  <span style={{ fontFamily:"monospace", fontWeight:700 }}>{c.smart_id}</span>
                  {` · ${c.first_name||""} ${c.last_name||""}`.trim()}
                </div>
              </div>
              <div style={{ fontSize:11, color:C.muted, flexShrink:0, textAlign:"right" }}>
                {s.tracking_number && <div style={{ fontFamily:"monospace", color:C.primary, fontWeight:700 }}>{s.tracking_number}</div>}
                <div>{s.issued_at ? new Date(s.issued_at).toLocaleDateString() : "—"}</div>
              </div>
              <span style={{ background:"#dbeafe", color:"#1e40af", fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20 }}>
                {s.status || "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN — StaffSoulMatesTab (default export)
// ════════════════════════════════════════════════════════════════════
const SUB_TABS = [
  { key:"inbound",   label:"Inbound",   icon:"📦" },
  { key:"orders",    label:"Orders",    icon:"🛒" },
  { key:"shipments", label:"Shipments", icon:"✈️" },
];

export default function StaffSoulMatesTab({ user }) {
  const [sub, setSub] = useState("inbound");

  return (
    <div>
      {/* Sub-tab nav */}
      <div style={{ display:"flex", gap:0, background:"white", border:`1px solid ${C.border}`, borderRadius:12, padding:4, marginBottom:18, width:"fit-content" }}>
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={()=>setSub(t.key)}
            style={{
              padding:"9px 18px", fontSize:13, fontWeight:800, border:"none",
              borderRadius:9, cursor:"pointer", fontFamily:"inherit",
              background: sub === t.key ? `linear-gradient(135deg,${C.primary},${C.sky})` : "transparent",
              color: sub === t.key ? "white" : C.muted,
              display:"flex", alignItems:"center", gap:7, transition:"all 0.15s",
            }}>
            <span style={{ fontSize:15 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {sub === "inbound"   && <InboundSubtab user={user}/>}
      {sub === "orders"    && <OrdersSubtab user={user}/>}
      {sub === "shipments" && <ShipmentsSubtab/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLUG INSTRUCTIONS for StaffDashboard.jsx:
//
//   1. Top of file — add import:
//      import StaffSoulMatesTab from "./StaffSoulMatesTab";
//
//   2. Inside component — add to TABS array (near line 9762):
//      { key:"soulmates", label:"🐰 Soul Mates", icon:Ic.users },
//
//   3. In render section (near line 9961) — add:
//      {activeTab === "soulmates" && <StaffSoulMatesTab user={user}/>}
// ─────────────────────────────────────────────────────────────────────────────
