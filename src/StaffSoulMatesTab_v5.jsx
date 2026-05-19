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
  const [lightbox, setLightbox] = useState(null);

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
      .select(`
        *,
        parcel_items(weight, width, length, height),
        parcel_photos(id, url, type)
      `)
      .eq("member_id", selectedMember.id)
      .order("arrived_at", { ascending: false });

    // Normalize: roll up weight + photo URLs
    const normalized = (data || []).map(p => {
      const items  = p.parcel_items  || [];
      const photos = p.parcel_photos || [];
      const totalWeight = items.reduce((s,i) => s + (Number(i.weight) || 0) * (Number(i.qty) || 1), 0);
      return {
        ...p,
        weight_kg:  totalWeight || null,
        all_photos: photos.map(ph => ph.url),
      };
    });

    setParcels(normalized);
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
                        <span>⚖️ {p.weight_kg ? `${Number(p.weight_kg).toFixed(2)} kg` : "—"}</span>
                        <span>📅 {p.arrived_at ? new Date(p.arrived_at).toLocaleDateString() : "—"}</span>
                      </div>

                      {/* Photos thumbnails */}
                      {p.all_photos && p.all_photos.length > 0 && (
                        <div style={{ display:"flex", gap:6, marginBottom:6, flexWrap:"wrap" }}>
                          {p.all_photos.slice(0, 5).map((url, i) => (
                            <button key={i} onClick={() => setLightbox({ photos: p.all_photos, index: i })}
                              style={{ width:52, height:52, borderRadius:6, overflow:"hidden", border:`1px solid ${C.border}`, padding:0, cursor:"pointer", background:"transparent", position:"relative", flexShrink:0 }}>
                              <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                              {i === 4 && p.all_photos.length > 5 && (
                                <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800 }}>
                                  +{p.all_photos.length - 5}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

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

      {/* Photo Lightbox — rendered at root so it overlays everything */}
      <StaffPhotoLightbox lightbox={lightbox} onClose={() => setLightbox(null)} onNav={(dir) => setLightbox(lb => lb && ({ ...lb, index: (lb.index + dir + lb.photos.length) % lb.photos.length }))}/>
    </div>
  );
}

// ── Photo Lightbox modal (Staff) ─────────────────────────────────────
function StaffPhotoLightbox({ lightbox, onClose, onNav }) {
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
        animation:"sLbFadeIn 0.18s ease",
      }}>
      <style>{`@keyframes sLbFadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <button onClick={onClose} style={{ position:"absolute", top:18, right:18, width:42, height:42, borderRadius:"50%", background:"rgba(255,255,255,0.15)", color:"white", border:"none", fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
      {photos.length > 1 && (
        <div style={{ position:"absolute", top:24, left:24, padding:"6px 14px", background:"rgba(255,255,255,0.15)", color:"white", borderRadius:20, fontSize:13, fontWeight:700 }}>
          {index + 1} / {photos.length}
        </div>
      )}
      {photos.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNav(-1); }} style={{ position:"absolute", left:18, top:"50%", transform:"translateY(-50%)", width:48, height:48, borderRadius:"50%", background:"rgba(255,255,255,0.15)", color:"white", border:"none", fontSize:24, cursor:"pointer" }}>‹</button>
      )}
      <img src={url} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth:"92vw", maxHeight:"88vh", objectFit:"contain", borderRadius:8, boxShadow:"0 20px 80px rgba(0,0,0,0.6)" }}/>
      {photos.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNav(1); }} style={{ position:"absolute", right:18, top:"50%", transform:"translateY(-50%)", width:48, height:48, borderRadius:"50%", background:"rgba(255,255,255,0.15)", color:"white", border:"none", fontSize:24, cursor:"pointer" }}>›</button>
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
      // 1. Insert parcel header (only tracking + desc + status — no dimensions or weight)
      const { data: parcel, error: parcelErr } = await supabase
        .from("parcels")
        .insert({
          member_id:         member.id,
          domestic_tracking: form.domestic_tracking.trim(),
          item_desc:         form.item_desc.trim(),
          status:            "arrived",
          arrived_at:        new Date().toISOString(),
          flag_note:         form.notes.trim() || null,
        })
        .select("id")
        .single();
      if (parcelErr) throw parcelErr;

      // 1b. Insert parcel_items row — weight + dimensions live here, not on parcels
      if (form.weight_kg || form.width || form.length || form.height) {
        const { error: itemErr } = await supabase.from("parcel_items").insert({
          parcel_id:  parcel.id,
          line_no:    1,
          item_desc:  form.item_desc.trim(),
          qty:        1,
          weight:     form.weight_kg ? Number(form.weight_kg) : null,
          width:      form.width  ? Number(form.width)  : null,
          length:     form.length ? Number(form.length) : null,
          height:     form.height ? Number(form.height) : null,
        });
        if (itemErr) console.warn("parcel_items insert warning:", itemErr);
      }

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
        // Schema enum photo_type: 'arrival' | 'recheck' | 'packing'
        // Use 'arrival' for inbound/new parcel photos.
        const rows = uploadedUrls.map(url => ({
          parcel_id: parcel.id,
          url,
          type:      "arrival",
        }));
        const { error: photoErr } = await supabase.from("parcel_photos").insert(rows);
        if (photoErr) console.warn("parcel_photos insert failed:", photoErr);
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
  const [detail, setDetail]       = useState(null);
  const [lightbox, setLightbox]   = useState(null);
  const [invoiceModal, setInvoiceModal] = useState(null);  // shipment for invoice
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState(null);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("shipments")
      .select(`
        *,
        customer:profiles!shipments_member_id_fkey(smart_id, first_name, last_name, country, tier, email),
        parcels(id, item_desc, domestic_tracking, status, arrived_at,
                parcel_items(weight, width, length, height, qty),
                parcel_photos(url, type)),
        shipment_boxes(id, box_no, actual_weight, volumetric_weight, status, carrier, intl_tracking, shipping_cost, invoice_data)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    const smOnly = (data || [])
      .filter(s => s.customer?.tier === "SM")
      .map(s => {
        const parcelsList = s.parcels || [];
        const totalWeight = parcelsList.reduce((sum, p) => {
          const items = p.parcel_items || [];
          return sum + items.reduce((ss, i) => ss + (Number(i.weight) || 0) * (Number(i.qty) || 1), 0);
        }, 0);
        return { ...s, parcels_list: parcelsList, total_weight: totalWeight, boxes_list: s.shipment_boxes || [] };
      });
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

  const submitInvoice = async (boxInvoices) => {
    if (!invoiceModal) return;
    setInvoiceLoading(true);
    try {
      const { error } = await supabase.rpc("fn_send_invoice", {
        p_shipment_id:  invoiceModal.id,
        p_box_invoices: boxInvoices,
      });
      if (error) {
        setInvoiceResult({ success: false, message: error.message });
      } else {
        setInvoiceResult({ success: true, message: "Invoice sent to customer! They can now pay in their Payments tab." });
        await fetchShipments();
      }
    } catch (e) {
      setInvoiceResult({ success: false, message: e.message || "Network error" });
    } finally {
      setInvoiceLoading(false);
    }
  };

  if (loading) return <Loading/>;
  if (shipments.length === 0) return <Empty icon="✈️" title="No Soul Mates shipments yet" hint="When SM customers request to ship parcels out, they'll show here"/>;

  return (
    <div>
      <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>
        Recent Soul Mates shipments ({shipments.length})
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {shipments.map(s => {
          const c = s.customer || {};
          const parcelsList = s.parcels_list || [];
          const statusColors = {
            ship_requested: { bg:"#fef9c3", color:"#854d0e" },
            packed:         { bg:"#dbeafe", color:"#1e40af" },
            invoice_sent:   { bg:"#fce7f3", color:"#9f1239" },
            invoice_paid:   { bg:"#d1fae5", color:"#065f46" },
            shipped:        { bg:"#e0e7ff", color:"#3730a3" },
          };
          const sc = statusColors[s.status] || { bg:"#f1f5f9", color:"#64748b" };
          return (
            <button key={s.id}
              onClick={() => setDetail(s)}
              style={{ width:"100%", background:"white", border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:12, cursor:"pointer", fontFamily:"inherit", textAlign:"left", transition:"all 0.15s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.primary; e.currentTarget.style.boxShadow="0 4px 12px rgba(7,91,176,0.1)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border; e.currentTarget.style.boxShadow="none";}}>
              <div style={{ width:38, height:38, borderRadius:10, background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>✈️</div>
              <div style={{ flex:"1 1 200px", minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:800, color:C.text, fontFamily:"monospace" }}>{s.doc_no || s.id?.slice(0,8)}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                  <span style={{ fontFamily:"monospace", fontWeight:700 }}>{c.smart_id}</span>
                  {` · ${c.first_name||""} ${c.last_name||""}`.trim()}
                  {c.country && ` · 🌍 ${c.country}`}
                </div>
              </div>
              <div style={{ fontSize:11, color:C.muted, flexShrink:0, textAlign:"right" }}>
                <div>📦 {parcelsList.length} · ⚖️ {s.total_weight.toFixed(2)} kg</div>
                <div>{s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}</div>
              </div>
              <span style={{ background:sc.bg, color:sc.color, fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20, whiteSpace:"nowrap" }}>
                {s.status || "—"}
              </span>
              <span style={{ fontSize:16, color:C.muted, marginLeft:4 }}>›</span>
            </button>
          );
        })}
      </div>

      <StaffShipmentDetailModal
        shipment={detail}
        onClose={() => setDetail(null)}
        onOpenPhoto={(photos, index) => setLightbox({ photos, index })}
        onSendInvoice={(s) => { setDetail(null); setInvoiceModal(s); setInvoiceResult(null); }}
      />
      <StaffPhotoLightbox lightbox={lightbox} onClose={() => setLightbox(null)} onNav={(dir) => setLightbox(lb => lb && ({ ...lb, index: (lb.index + dir + lb.photos.length) % lb.photos.length }))}/>

      <SendInvoiceModal
        shipment={invoiceModal}
        loading={invoiceLoading}
        result={invoiceResult}
        onClose={() => { setInvoiceModal(null); setInvoiceResult(null); }}
        onConfirm={submitInvoice}
      />
    </div>
  );
}

// ── Send Invoice Modal ────────────────────────────────────────────────
function SendInvoiceModal({ shipment, loading, result, onClose, onConfirm }) {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (shipment) {
      setRows((shipment.boxes_list || []).map(b => ({
        box_id: b.id,
        box_no: b.box_no,
        actual_weight: b.actual_weight,
        volumetric_weight: b.volumetric_weight,
        carrier: b.carrier || "",
        intl_tracking: b.intl_tracking || "",
        shipping_cost: b.shipping_cost || "",
      })));
    }
  }, [shipment?.id]);

  if (!shipment) return null;

  const updateRow = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const total = rows.reduce((s, r) => s + (Number(r.shipping_cost) || 0), 0);

  const handleSubmit = () => {
    for (const r of rows) {
      if (!r.carrier?.trim()) return alert(`Box #${r.box_no}: carrier required`);
      if (!r.intl_tracking?.trim()) return alert(`Box #${r.box_no}: tracking number required`);
      if (!r.shipping_cost || Number(r.shipping_cost) <= 0) return alert(`Box #${r.box_no}: shipping cost required`);
    }
    onConfirm(rows.map(r => ({
      box_id:        r.box_id,
      carrier:       r.carrier.trim(),
      intl_tracking: r.intl_tracking.trim(),
      shipping_cost: Number(r.shipping_cost),
    })));
  };

  return (
    <div onClick={() => !loading && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:9001, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:"white", borderRadius:18, width:"100%", maxWidth:680, maxHeight:"92vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", overflow:"hidden", fontFamily:"'Nunito',sans-serif" }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,#16a34a,#22c55e)`, color:"white", padding:"18px 22px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
          <div>
            <div style={{ fontSize:11, opacity:0.85, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Send Invoice</div>
            <div style={{ fontSize:17, fontWeight:900, marginTop:2, fontFamily:"monospace" }}>{shipment.doc_no || shipment.id?.slice(0,8)}</div>
            <div style={{ fontSize:11, opacity:0.9, marginTop:2 }}>🐰 {shipment.customer?.first_name} {shipment.customer?.last_name} · 🌍 {shipment.customer?.country}</div>
          </div>
          <button onClick={() => !loading && onClose()} disabled={loading} style={{ background:"rgba(255,255,255,0.2)", color:"white", border:"none", width:32, height:32, borderRadius:"50%", fontSize:14, cursor:loading?"not-allowed":"pointer" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 22px" }}>
          {result ? (
            <div style={{ textAlign:"center", padding:"30px 10px" }}>
              <div style={{ fontSize:52, marginBottom:12 }}>{result.success ? "🎉" : "⚠️"}</div>
              <div style={{ fontSize:18, fontWeight:900, color:result.success?"#16a34a":"#dc2626", marginBottom:10 }}>
                {result.success ? "Invoice Sent!" : "Failed"}
              </div>
              <div style={{ fontSize:12, color:C.muted, lineHeight:1.7 }}>{result.message}</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:11, color:C.muted, marginBottom:14, lineHeight:1.5 }}>
                Enter carrier, tracking number, and shipping cost for each box. The customer will see the total in their Payments tab.
              </div>

              {rows.map((r, idx) => (
                <div key={r.box_id} style={{ border:`1.5px solid ${C.border}`, borderRadius:12, padding:14, marginBottom:12, background:"#fafbfc" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <div style={{ fontSize:13, fontWeight:900, color:C.primary }}>📦 Box #{r.box_no}</div>
                    <div style={{ fontSize:10, color:C.muted }}>
                      Actual: {Number(r.actual_weight).toFixed(2)} kg · Vol: {Number(r.volumetric_weight).toFixed(2)} kg
                    </div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1.4fr 1fr", gap:8 }}>
                    <TextField label="Carrier"  value={r.carrier} onChange={v => updateRow(idx, "carrier", v)} placeholder="e.g. DHL"/>
                    <TextField label="Tracking" value={r.intl_tracking} onChange={v => updateRow(idx, "intl_tracking", v)} placeholder="Tracking number"/>
                    <NumField  label="Cost (฿)" value={r.shipping_cost} onChange={v => updateRow(idx, "shipping_cost", v)}/>
                  </div>
                </div>
              ))}

              <div style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", borderRadius:12, padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
                <div style={{ fontSize:13, fontWeight:800 }}>Total to invoice</div>
                <div style={{ fontSize:22, fontWeight:900 }}>฿{total.toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 })}</div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop:`1px solid ${C.border}`, padding:"12px 22px", background:"#f8fafc", display:"flex", gap:8 }}>
          {result ? (
            <button onClick={onClose} style={{ flex:1, padding:11, background:`linear-gradient(135deg,#16a34a,#22c55e)`, color:"white", border:"none", borderRadius:10, fontSize:13, fontWeight:900, cursor:"pointer", fontFamily:"inherit" }}>Got it</button>
          ) : (
            <>
              <button onClick={onClose} disabled={loading} style={{ flex:1, padding:11, background:"#f1f5f9", color:C.muted, border:"none", borderRadius:10, fontSize:12, fontWeight:800, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit" }}>Cancel</button>
              <button onClick={handleSubmit} disabled={loading || rows.length===0} style={{ flex:2, padding:11, background:loading?"#94a3b8":"linear-gradient(135deg,#16a34a,#22c55e)", color:"white", border:"none", borderRadius:10, fontSize:12, fontWeight:900, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit" }}>
                {loading ? "Sending..." : "Send Invoice 📧"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper: text field ────────────────────────────────────────
function TextField({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display:"flex", flexDirection:"column" }}>
      <span style={{ fontSize:9, color:C.muted, fontWeight:800, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.04em" }}>{label}</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ border:"1.5px solid #e2e8f0", borderRadius:8, padding:"7px 9px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box", width:"100%" }}/>
    </label>
  );
}

// ── Staff Shipment Detail Modal ────────────────────────────────────────
function StaffShipmentDetailModal({ shipment, onClose, onOpenPhoto, onSendInvoice }) {
  useEffect(() => {
    if (!shipment) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shipment, onClose]);

  if (!shipment) return null;
  const parcels = shipment.parcels_list || [];
  const c = shipment.customer || {};

  return (
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"ssmFadeIn 0.2s ease" }}>
      <style>{`@keyframes ssmFadeIn{from{opacity:0}to{opacity:1}}@keyframes ssmPopIn{from{transform:scale(0.94);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:"white", borderRadius:18, width:"100%", maxWidth:620, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", animation:"ssmPopIn 0.25s cubic-bezier(0.34,1.56,0.64,1)", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", padding:"18px 22px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
          <div>
            <div style={{ fontSize:11, opacity:0.85, marginBottom:2, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Shipment</div>
            <div style={{ fontSize:18, fontWeight:900, fontFamily:"monospace" }}>{shipment.doc_no || shipment.id?.slice(0,8)}</div>
            <div style={{ fontSize:12, opacity:0.9, marginTop:4 }}>
              🐰 {c.first_name} {c.last_name} · {c.smart_id} · 🌍 {c.country}
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
              <div key={s.label} style={{ background:"#f8fafc", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                <div style={{ fontSize:16 }}>{s.icon}</div>
                <div style={{ fontSize:13, fontWeight:900, color:C.text, marginTop:2 }}>{s.value}</div>
                <div style={{ fontSize:9, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginTop:1 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Customer note */}
          {shipment.customer_note && (
            <div style={{ background:"#EFF6FF", border:"1px solid #bfdbfe", borderRadius:10, padding:"10px 12px", fontSize:12, color:C.primary, marginBottom:14, lineHeight:1.6 }}>
              💬 <strong>Customer note:</strong> {shipment.customer_note}
            </div>
          )}

          {/* Parcels */}
          <div style={{ fontSize:11, fontWeight:800, color:C.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>
            Parcels in shipment
          </div>
          {parcels.length === 0 ? (
            <div style={{ fontSize:12, color:C.muted, fontStyle:"italic", padding:"20px 0", textAlign:"center" }}>No parcels linked.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {parcels.map(p => {
                const items  = p.parcel_items  || [];
                const photos = p.parcel_photos || [];
                const weight = items.reduce((sum, i) => sum + (Number(i.weight) || 0) * (Number(i.qty) || 1), 0);
                const dim = items[0] ? `${items[0].width||"?"}×${items[0].length||"?"}×${items[0].height||"?"}cm` : "";
                const photoUrls = photos.map(ph => ph.url);
                return (
                  <div key={p.id} style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:photos.length>0?8:0 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:C.text }}>📦 {p.item_desc || "Parcel"}</div>
                        <div style={{ fontSize:11, color:C.muted, marginTop:3, lineHeight:1.6 }}>
                          🔢 {p.domestic_tracking || "—"}
                          <br/>⚖️ {weight.toFixed(2)} kg {dim && `· 📐 ${dim}`}
                          {p.arrived_at && <><br/>📅 Arrived {new Date(p.arrived_at).toLocaleDateString()}</>}
                        </div>
                      </div>
                      <Badge map={PARCEL_STATUS} k={p.status}/>
                    </div>
                    {photos.length > 0 && (
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {photos.slice(0, 6).map((ph, i) => (
                          <button key={i} onClick={() => onOpenPhoto(photoUrls, i)}
                            style={{ width:56, height:56, borderRadius:8, overflow:"hidden", border:`1px solid ${C.border}`, padding:0, cursor:"pointer", background:"transparent", position:"relative", flexShrink:0 }}>
                            <img src={ph.url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                            {i === 5 && photos.length > 6 && (
                              <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800 }}>+{photos.length - 6}</div>
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
        <div style={{ borderTop:`1px solid ${C.border}`, padding:"12px 22px", background:"#f8fafc", display:"flex", gap:8, justifyContent:"flex-end" }}>
          {shipment.status === "packed" && onSendInvoice && (
            <button onClick={() => onSendInvoice(shipment)}
              style={{ background:`linear-gradient(135deg,#16a34a,#22c55e)`, color:"white", border:"none", borderRadius:10, padding:"9px 18px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
              📧 Send Invoice
            </button>
          )}
          <button onClick={onClose}
            style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", border:"none", borderRadius:10, padding:"9px 20px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN — StaffSoulMatesTab (default export)
// ════════════════════════════════════════════════════════════════════
// ── Packing Subtab (Pending shipment requests from SM) ────────────────
function PackingSubtab({ user }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [packModal, setPackModal] = useState(null);  // selected shipment for packing
  const [packLoading, setPackLoading] = useState(false);
  const [packResult, setPackResult] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shipments")
      .select(`
        id, member_id, doc_no, status, requested_at, customer_note, created_at,
        profiles!shipments_member_id_fkey(id, smart_id, first_name, last_name, country, email, tier),
        parcels(id, item_desc, domestic_tracking, status, arrived_at,
                parcel_items(weight, width, length, height, qty),
                parcel_photos(url, type))
      `)
      .eq("status", "ship_requested")
      .order("requested_at", { ascending: false });

    if (error) {
      console.warn("packing fetch error:", error);
      setRequests([]);
      setLoading(false);
      return;
    }

    const normalized = (data || [])
      .filter(s => s.profiles?.tier === "SM")
      .map(s => {
        const totalWeight = (s.parcels || []).reduce((sum, p) => {
          const items = p.parcel_items || [];
          return sum + items.reduce((ss, i) => ss + (Number(i.weight) || 0) * (Number(i.qty) || 1), 0);
        }, 0);
        return { ...s, total_weight: totalWeight, parcel_count: (s.parcels || []).length };
      });

    setRequests(normalized);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    const ch = supabase.channel("staff-sm-packing")
      .on("postgres_changes", { event: "*", schema: "public", table: "shipments" }, () => fetchRequests())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchRequests]);

  const submitPack = async (boxes) => {
    if (!packModal) return;
    setPackLoading(true);
    try {
      const { error } = await supabase.rpc("fn_pack_shipment", {
        p_shipment_id: packModal.id,
        p_boxes: boxes,
      });
      if (error) {
        setPackResult({ success: false, message: error.message });
      } else {
        setPackResult({ success: true, message: "Packing complete! Now you can send invoice in the Shipments tab." });
        await fetchRequests();
      }
    } catch (e) {
      setPackResult({ success: false, message: e.message || "Network error" });
    } finally {
      setPackLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding:40, textAlign:"center", color:C.muted }}>Loading...</div>;
  }

  if (requests.length === 0) {
    return (
      <div style={{ background:"white", border:`1.5px solid ${C.border}`, borderRadius:14, padding:"40px 20px", textAlign:"center" }}>
        <div style={{ fontSize:36, marginBottom:10 }}>📭</div>
        <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:6 }}>No packing tasks</div>
        <div style={{ fontSize:12, color:C.muted }}>Customers haven't requested any shipments yet.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize:13, fontWeight:800, color:C.text, marginBottom:12 }}>
        📦 Ready to Pack ({requests.length})
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {requests.map(req => (
          <div key={req.id} style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:14, padding:14, boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, gap:10, flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:900, color:C.primary }}>
                  🐰 {req.profiles?.first_name} {req.profiles?.last_name}
                </div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                  {req.profiles?.smart_id} · 🌍 {req.profiles?.country || "—"}
                </div>
              </div>
              <div style={{ background:"#fef9c3", color:"#854d0e", padding:"4px 10px", borderRadius:8, fontSize:10, fontWeight:800 }}>
                ⏳ Awaiting packing
              </div>
            </div>

            <div style={{ display:"flex", gap:14, padding:"8px 12px", background:"#f8fafc", borderRadius:10, marginBottom:10, fontSize:11, color:C.muted, flexWrap:"wrap" }}>
              <span>📦 {req.parcel_count} parcel{req.parcel_count>1?"s":""}</span>
              <span>⚖️ {req.total_weight.toFixed(2)} kg</span>
              <span>📅 {req.requested_at ? new Date(req.requested_at).toLocaleString() : "—"}</span>
            </div>

            {req.customer_note && (
              <div style={{ background:"#EFF6FF", border:"1px solid #bfdbfe", borderRadius:8, padding:"8px 10px", fontSize:11, color:C.primary, marginBottom:10 }}>
                💬 <strong>Note:</strong> {req.customer_note}
              </div>
            )}

            <div style={{ marginBottom:12 }}>
              {(req.parcels || []).map(p => (
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"6px 0", borderBottom:"1px dashed #e2e8f0" }}>
                  <span style={{ color:C.text }}>📦 {p.item_desc || "Parcel"} <span style={{ color:C.muted }}>· {p.domestic_tracking || "—"}</span></span>
                  <span style={{ color:C.muted }}>{(p.parcel_items?.[0]?.weight) ? `${Number(p.parcel_items[0].weight).toFixed(2)} kg` : "—"}</span>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", justifyContent:"flex-end" }}>
              <button onClick={() => { setPackModal(req); setPackResult(null); }}
                style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", border:"none", borderRadius:10, padding:"8px 16px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                Pack Boxes 📦
              </button>
            </div>
          </div>
        ))}
      </div>

      <PackBoxesModal
        shipment={packModal}
        loading={packLoading}
        result={packResult}
        onClose={() => { setPackModal(null); setPackResult(null); }}
        onConfirm={submitPack}
      />
    </div>
  );
}

// ── Pack Boxes Modal ────────────────────────────────────────
function PackBoxesModal({ shipment, loading, result, onClose, onConfirm }) {
  const [boxes, setBoxes] = useState([
    { box_no: 1, actual_weight: "", width: "", length: "", height: "", parcel_ids: [] }
  ]);

  useEffect(() => {
    // Reset when modal opens with new shipment
    if (shipment) {
      const parcelIds = (shipment.parcels || []).map(p => p.id);
      setBoxes([{ box_no: 1, actual_weight: "", width: "", length: "", height: "", parcel_ids: parcelIds }]);
    }
  }, [shipment?.id]);

  if (!shipment) return null;
  const allParcels = shipment.parcels || [];

  const addBox = () => {
    setBoxes(prev => [
      ...prev,
      { box_no: prev.length + 1, actual_weight: "", width: "", length: "", height: "", parcel_ids: [] }
    ]);
  };

  const removeBox = (idx) => {
    if (boxes.length === 1) return;
    setBoxes(prev => prev.filter((_, i) => i !== idx).map((b, i) => ({ ...b, box_no: i + 1 })));
  };

  const updateBox = (idx, field, value) => {
    setBoxes(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };

  const toggleParcelInBox = (boxIdx, parcelId) => {
    setBoxes(prev => prev.map((b, i) => {
      if (i !== boxIdx) return b;
      const has = b.parcel_ids.includes(parcelId);
      return { ...b, parcel_ids: has ? b.parcel_ids.filter(id => id !== parcelId) : [...b.parcel_ids, parcelId] };
    }));
  };

  // Helper: which parcels are already in OTHER boxes
  const parcelInOtherBox = (boxIdx, parcelId) => {
    return boxes.some((b, i) => i !== boxIdx && b.parcel_ids.includes(parcelId));
  };

  const handleSubmit = () => {
    // Validation
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (!b.actual_weight || Number(b.actual_weight) <= 0) {
        alert(`Box #${b.box_no}: please enter actual weight`);
        return;
      }
      if (!b.width || !b.length || !b.height) {
        alert(`Box #${b.box_no}: please enter all dimensions`);
        return;
      }
      if (b.parcel_ids.length === 0) {
        alert(`Box #${b.box_no}: please select at least one parcel`);
        return;
      }
    }
    // Check all parcels assigned
    const allAssigned = new Set(boxes.flatMap(b => b.parcel_ids));
    if (allAssigned.size !== allParcels.length) {
      if (!confirm(`Only ${allAssigned.size} of ${allParcels.length} parcels are assigned to a box. Continue anyway?`)) return;
    }

    onConfirm(boxes.map(b => ({
      box_no: b.box_no,
      actual_weight: Number(b.actual_weight),
      width:  Number(b.width),
      length: Number(b.length),
      height: Number(b.height),
      parcel_ids: b.parcel_ids,
    })));
  };

  return (
    <div onClick={() => !loading && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:"white", borderRadius:18, width:"100%", maxWidth:680, maxHeight:"92vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,0.3)", overflow:"hidden", fontFamily:"'Nunito',sans-serif" }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", padding:"18px 22px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
          <div>
            <div style={{ fontSize:11, opacity:0.85, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Pack Shipment</div>
            <div style={{ fontSize:17, fontWeight:900, marginTop:2, fontFamily:"monospace" }}>{shipment.doc_no || shipment.id?.slice(0,8)}</div>
            <div style={{ fontSize:11, opacity:0.9, marginTop:2 }}>
              🐰 {shipment.profiles?.first_name} {shipment.profiles?.last_name} · 🌍 {shipment.profiles?.country}
            </div>
          </div>
          <button onClick={() => !loading && onClose()} disabled={loading} style={{ background:"rgba(255,255,255,0.2)", color:"white", border:"none", width:32, height:32, borderRadius:"50%", fontSize:14, cursor:loading?"not-allowed":"pointer" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 22px" }}>
          {result ? (
            /* Result screen */
            <div style={{ textAlign:"center", padding:"30px 10px" }}>
              <div style={{ fontSize:52, marginBottom:12 }}>{result.success ? "🎉" : "⚠️"}</div>
              <div style={{ fontSize:18, fontWeight:900, color:result.success?C.primary:"#dc2626", marginBottom:10 }}>
                {result.success ? "Packing Complete!" : "Failed"}
              </div>
              <div style={{ fontSize:12, color:C.muted, lineHeight:1.7, marginBottom:22 }}>{result.message}</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:11, color:C.muted, marginBottom:14, lineHeight:1.5 }}>
                Create one or more boxes for this shipment. Assign each parcel to a box, then enter actual weight + dimensions.
              </div>

              {boxes.map((box, idx) => (
                <div key={idx} style={{ border:`1.5px solid ${C.border}`, borderRadius:12, padding:14, marginBottom:12, background:"#fafbfc" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <div style={{ fontSize:13, fontWeight:900, color:C.primary }}>📦 Box #{box.box_no}</div>
                    {boxes.length > 1 && (
                      <button onClick={() => removeBox(idx)}
                        style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"3px 8px", fontSize:10, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  {/* Parcels selector */}
                  <div style={{ fontSize:10, fontWeight:800, color:C.muted, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                    Parcels in this box
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:12 }}>
                    {allParcels.map(p => {
                      const inThis = box.parcel_ids.includes(p.id);
                      const inOther = parcelInOtherBox(idx, p.id);
                      return (
                        <label key={p.id}
                          style={{
                            display:"flex", alignItems:"center", gap:8,
                            background: inThis ? "#dbeafe" : (inOther ? "#f1f5f9" : "white"),
                            border: `1px solid ${inThis ? C.primary : "#e2e8f0"}`,
                            borderRadius:8, padding:"6px 10px",
                            cursor: inOther ? "not-allowed" : "pointer",
                            opacity: inOther ? 0.5 : 1,
                          }}>
                          <input
                            type="checkbox"
                            checked={inThis}
                            disabled={inOther}
                            onChange={() => toggleParcelInBox(idx, p.id)}
                          />
                          <span style={{ fontSize:11, fontWeight:700, color:C.text, flex:1 }}>
                            📦 {p.item_desc || "Parcel"} <span style={{ color:C.muted, fontWeight:600 }}>· {p.domestic_tracking || "—"}</span>
                          </span>
                          {inOther && <span style={{ fontSize:9, color:C.muted, fontStyle:"italic" }}>(in another box)</span>}
                        </label>
                      );
                    })}
                  </div>

                  {/* Weight + Dimensions */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
                    <NumField label="Weight (kg)" value={box.actual_weight} onChange={v => updateBox(idx, "actual_weight", v)}/>
                    <NumField label="Width (cm)"  value={box.width}         onChange={v => updateBox(idx, "width", v)}/>
                    <NumField label="Length (cm)" value={box.length}        onChange={v => updateBox(idx, "length", v)}/>
                    <NumField label="Height (cm)" value={box.height}        onChange={v => updateBox(idx, "height", v)}/>
                  </div>
                  {box.width && box.length && box.height && (
                    <div style={{ fontSize:10, color:C.muted, marginTop:6 }}>
                      Volumetric: <strong style={{ color:C.primary }}>{((Number(box.width)*Number(box.length)*Number(box.height))/5000).toFixed(2)} kg</strong>
                    </div>
                  )}
                </div>
              ))}

              <button onClick={addBox}
                style={{ width:"100%", background:"#f1f5f9", color:C.primary, border:`1.5px dashed ${C.primary}`, borderRadius:10, padding:"10px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                + Add another box
              </button>
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
              <button onClick={handleSubmit} disabled={loading} style={{ flex:2, padding:11, background:loading?"#94a3b8":`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", border:"none", borderRadius:10, fontSize:12, fontWeight:900, cursor:loading?"not-allowed":"pointer", fontFamily:"inherit" }}>
                {loading ? "Packing..." : `Mark Packed (${boxes.length} box${boxes.length>1?"es":""})`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper: number input field ────────────────────────────────────────
function NumField({ label, value, onChange }) {
  return (
    <label style={{ display:"flex", flexDirection:"column" }}>
      <span style={{ fontSize:9, color:C.muted, fontWeight:800, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.04em" }}>{label}</span>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ border:"1.5px solid #e2e8f0", borderRadius:8, padding:"7px 9px", fontSize:12, fontFamily:"inherit", boxSizing:"border-box", width:"100%" }}
      />
    </label>
  );
}


const SUB_TABS = [
  { key:"inbound",   label:"Inbound",   icon:"📦" },
  { key:"packing",   label:"Packing",   icon:"📦" },
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
      {sub === "packing"   && <PackingSubtab user={user}/>}
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
