import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./supabaseClient";

// ─────────────────────────────────────────────────────────────────────────────
//  ManagerMarketplaceTab_v1.jsx — Manager Marketplace Module
//
//  Plug into ManagerDashboard as a single tab:
//    1. Add to TABS:  { key:"marketplace", label:"🛍️ Marketplace", icon:Ic.pkg }
//    2. Add to ALL_TABS array (top of file)
//    3. Import:       import ManagerMarketplaceTab from "./ManagerMarketplaceTab";
//    4. Render:       {activeTab === "marketplace" && <ManagerMarketplaceTab/>}
//
//  Sub-tabs inside this module:
//    • Products  — full CRUD with image upload, stock management
//    • Orders    — view orders, change status, see customer info
//    • Payments  — approve/reject marketplace payment slips
//
//  Storage bucket required: 'marketplace-products' (public)
//  Tables used: marketplace_products, marketplace_orders,
//               marketplace_order_items, marketplace_payments, profiles
// ─────────────────────────────────────────────────────────────────────────────

// ─── Colors (matching ManagerDashboard palette) ─────────────────────
const C = {
  primary: "#075BB0",
  sky:     "#0484CF",
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

// ─── Status maps ────────────────────────────────────────────────────
const ORDER_STATUS = {
  pending_payment:  { label:"Pending Payment",  bg:"#fef3c7", color:"#92400e" },
  pending_approval: { label:"Review Slip",      bg:"#dbeafe", color:"#1e40af" },
  paid:             { label:"Paid",             bg:"#d1fae5", color:"#065f46" },
  processing:       { label:"Processing",       bg:"#e0e7ff", color:"#3730a3" },
  shipped:          { label:"Shipped",          bg:"#cffafe", color:"#155e75" },
  in_warehouse:     { label:"In Warehouse",     bg:"#f3e8ff", color:"#6b21a8" },
  completed:        { label:"Completed",        bg:"#f1f5f9", color:"#475569" },
  cancelled:        { label:"Cancelled",        bg:"#fee2e2", color:"#991b1b" },
  refunded:         { label:"Refunded",         bg:"#e2e8f0", color:"#475569" },
};

const PAY_STATUS = {
  pending_slip:    { label:"Awaiting Slip",  bg:"#fef3c7", color:"#92400e" },
  pending_review:  { label:"Pending Review", bg:"#dbeafe", color:"#1e40af" },
  confirmed:       { label:"Confirmed",      bg:"#d1fae5", color:"#065f46" },
  rejected:        { label:"Rejected",       bg:"#fee2e2", color:"#991b1b" },
};

const PAY_METHODS = {
  promptpay:   "🇹🇭 PromptPay",
  wise:        "🌍 Wise",
  paypal:      "💳 PayPal",
  credit_card: "💎 Credit Card",
};

const CATEGORIES = [
  { value:"bl_gl",   label:"Official BL/GL merchandise" },
  { value:"artist",  label:"Artist brand merchandise" },
  { value:"food",    label:"Thai food & snacks" },
  { value:"beauty",  label:"Thai beauty & cosmetics" },
  { value:"fashion", label:"Thai fashion" },
  { value:"other",   label:"Other" },
];

// ─── Small UI helpers ───────────────────────────────────────────────
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

const inp = (err) => ({
  width:"100%", padding:"10px 12px",
  border:`1.5px solid ${err?C.red:C.border}`, borderRadius:8,
  fontSize:13, outline:"none", fontFamily:"inherit",
  background:"white", color:C.text, boxSizing:"border-box",
});
const lbl = { display:"block", fontSize:11, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:5 };

// ════════════════════════════════════════════════════════════════════
// SUB-TAB 1: PRODUCTS — full CRUD
// ════════════════════════════════════════════════════════════════════

function ProductsSubtab({ refreshKey }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [editing, setEditing]   = useState(null);  // null | 'new' | <product>

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_products")
      .select("*")
      .order("sort_order", { ascending:true })
      .order("created_at", { ascending:false });
    if (!error) setProducts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts, refreshKey]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("manager-marketplace-products")
      .on("postgres_changes", { event:"*", schema:"public", table:"marketplace_products" }, fetchProducts)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchProducts]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return products.filter(p => {
      if (filterCat && p.category !== filterCat) return false;
      if (term && !p.name.toLowerCase().includes(term) && !p.sku.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [products, search, filterCat]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    const { error } = await supabase.from("marketplace_products").delete().eq("id", id);
    if (error) alert("Delete failed: " + error.message);
    else fetchProducts();
  };

  const handleToggleActive = async (p) => {
    await supabase.from("marketplace_products")
      .update({ is_active: !p.is_active })
      .eq("id", p.id);
    fetchProducts();
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        <input
          placeholder="🔍 Search SKU or name..."
          value={search} onChange={e=>setSearch(e.target.value)}
          style={{ ...inp(), flex:"1 1 220px", maxWidth:340 }}
        />
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{ ...inp(), width:"auto" }}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <div style={{ flex:1 }}/>
        <button onClick={()=>setEditing("new")}
          style={{ background:C.primary, color:"white", border:"none", borderRadius:8, padding:"10px 16px", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
          + Add Product
        </button>
      </div>

      {/* Quick stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:16 }}>
        {[
          { label:"Total products", value:products.length, color:C.primary },
          { label:"Active",         value:products.filter(p=>p.is_active).length, color:C.green },
          { label:"Out of stock",   value:products.filter(p=>p.is_active && p.stock_qty === 0).length, color:C.red },
          { label:"Low stock (<5)", value:products.filter(p=>p.is_active && p.stock_qty > 0 && p.stock_qty < 5).length, color:C.amber },
        ].map(s => (
          <div key={s.label} style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px" }}>
            <div style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:900, color:s.color, marginTop:2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Products grid */}
      {loading ? <Loading/> :
       filtered.length === 0 ? <Empty icon="🛍️" title="No products" hint="Click '+ Add Product' to create your first listing"/> :
       (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", display:"flex", flexDirection:"column", opacity: p.is_active ? 1 : 0.55 }}>
              {/* Image */}
              <div style={{ aspectRatio:"1/1", background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:48, position:"relative" }}>
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                ) : "📦"}
                {p.tag && (
                  <div style={{ position:"absolute", top:8, left:8, background:"#FFEB59", color:C.text, fontSize:10, fontWeight:900, padding:"3px 8px", borderRadius:6 }}>{p.tag}</div>
                )}
                {!p.is_active && (
                  <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.6)", color:"white", fontSize:10, fontWeight:800, padding:"3px 8px", borderRadius:6 }}>Hidden</div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding:12, flex:1, display:"flex", flexDirection:"column" }}>
                <div style={{ fontSize:10, color:C.muted, fontFamily:"monospace", marginBottom:3 }}>{p.sku}</div>
                <div style={{ fontSize:13, fontWeight:800, color:C.text, lineHeight:1.3, marginBottom:6, minHeight:34 }}>{p.name}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontSize:16, fontWeight:900, color:C.primary }}>฿{Number(p.price_thb).toLocaleString()}</span>
                  <span style={{ fontSize:11, color: p.stock_qty === 0 ? C.red : p.stock_qty < 5 ? C.amber : C.muted, fontWeight:700 }}>
                    Stock: {p.stock_qty}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ marginTop:"auto", display:"flex", gap:6 }}>
                  <button onClick={()=>setEditing(p)} style={{ flex:1, background:"#EFF6FF", color:C.primary, border:"none", borderRadius:7, padding:"7px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                    Edit
                  </button>
                  <button onClick={()=>handleToggleActive(p)} style={{ flex:1, background:p.is_active ? "#fef3c7" : "#d1fae5", color: p.is_active ? "#92400e" : "#065f46", border:"none", borderRadius:7, padding:"7px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                    {p.is_active ? "Hide" : "Show"}
                  </button>
                  <button onClick={()=>handleDelete(p.id)} style={{ background:"#fee2e2", color:C.red, border:"none", borderRadius:7, padding:"7px 10px", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
       )
      }

      {/* Editor modal */}
      {editing && (
        <ProductEditor
          product={editing === "new" ? null : editing}
          onClose={()=>setEditing(null)}
          onSaved={()=>{ setEditing(null); fetchProducts(); }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Product Editor Modal (Create / Edit)
// ════════════════════════════════════════════════════════════════════

function ProductEditor({ product, onClose, onSaved }) {
  const isNew = !product;
  const [form, setForm] = useState({
    sku:         product?.sku         || "",
    name:        product?.name        || "",
    description: product?.description || "",
    category:    product?.category    || "bl_gl",
    price_thb:   product?.price_thb   ?? "",
    stock_qty:   product?.stock_qty   ?? 0,
    weight_kg:   product?.weight_kg   ?? 0.5,
    width_cm:    product?.width_cm    ?? "",
    length_cm:   product?.length_cm   ?? "",
    height_cm:   product?.height_cm   ?? "",
    tag:         product?.tag         || "",
    is_active:   product?.is_active   ?? true,
    sort_order:  product?.sort_order  ?? 0,
  });
  const [images, setImages] = useState(product?.images || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleUpload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    setErr("");
    try {
      const newUrls = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const path = `products/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("marketplace-products").upload(path, file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("marketplace-products").getPublicUrl(path);
        newUrls.push(publicUrl);
      }
      setImages(prev => [...prev, ...newUrls]);
    } catch (e) {
      setErr("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!form.sku.trim() || !form.name.trim() || !form.price_thb) {
      setErr("SKU, name, and price are required");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const payload = {
        sku:         form.sku.trim(),
        name:        form.name.trim(),
        description: form.description.trim() || null,
        category:    form.category,
        price_thb:   Number(form.price_thb),
        stock_qty:   Number(form.stock_qty),
        weight_kg:   Number(form.weight_kg),
        width_cm:    form.width_cm  === "" ? null : Number(form.width_cm),
        length_cm:   form.length_cm === "" ? null : Number(form.length_cm),
        height_cm:   form.height_cm === "" ? null : Number(form.height_cm),
        tag:         form.tag.trim() || null,
        is_active:   form.is_active,
        sort_order:  Number(form.sort_order),
        images,
        stock_type:  "cartmates",
      };

      if (isNew) {
        const { error } = await supabase.from("marketplace_products").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("marketplace_products").update(payload).eq("id", product.id);
        if (error) throw error;
      }
      onSaved?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:600, backdropFilter:"blur(2px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:601,
        width:"min(720px,96vw)", maxHeight:"92vh", background:"white", borderRadius:16, overflow:"hidden",
        display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.25)" }}>

        <div style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, padding:"18px 24px", display:"flex", alignItems:"center", color:"white" }}>
          <div>
            <div style={{ fontSize:18, fontWeight:900 }}>{isNew ? "✨ New Product" : "✏️ Edit Product"}</div>
            <div style={{ fontSize:12, opacity:0.8 }}>{isNew ? "Add a new item to the Marketplace" : product.sku}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft:"auto", width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.2)", border:"none", color:"white", fontSize:16, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:24 }}>
          {/* Images */}
          <div style={{ marginBottom:18 }}>
            <label style={lbl}>Product Images</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
              {images.map((url, i) => (
                <div key={i} style={{ position:"relative", width:80, height:80, borderRadius:8, overflow:"hidden", border:`1.5px solid ${C.border}` }}>
                  <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  <button onClick={()=>removeImage(i)} style={{ position:"absolute", top:2, right:2, width:20, height:20, borderRadius:"50%", background:"rgba(0,0,0,0.7)", color:"white", border:"none", fontSize:11, cursor:"pointer" }}>✕</button>
                  {i === 0 && <div style={{ position:"absolute", bottom:0, left:0, right:0, background:C.primary, color:"white", fontSize:9, fontWeight:800, textAlign:"center", padding:"1px 0" }}>MAIN</div>}
                </div>
              ))}
              <label style={{ width:80, height:80, borderRadius:8, border:`2px dashed ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:C.muted, fontSize:11, fontWeight:700, flexDirection:"column", gap:4, background:"#f8fafc" }}>
                <span style={{ fontSize:20 }}>📷</span>
                <span>{uploading ? "..." : "Add"}</span>
                <input type="file" accept="image/*" multiple onChange={e=>handleUpload(e.target.files)} style={{ display:"none" }} disabled={uploading}/>
              </label>
            </div>
            <div style={{ fontSize:11, color:C.muted }}>First image is the main thumbnail shown in cart and listings.</div>
          </div>

          {/* SKU + Name */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:12, marginBottom:14 }}>
            <div>
              <label style={lbl}>SKU *</label>
              <input style={inp()} value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))} placeholder="GMM-001"/>
            </div>
            <div>
              <label style={lbl}>Product name *</label>
              <input style={inp()} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="GMMTV Official Album Box Set"/>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Description</label>
            <textarea style={{ ...inp(), minHeight:70, resize:"vertical" }} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Detailed description, contents, sizing..."/>
          </div>

          {/* Category + Tag */}
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <label style={lbl}>Category</label>
              <select style={inp()} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Tag (optional)</label>
              <input style={inp()} value={form.tag} onChange={e=>setForm(f=>({...f,tag:e.target.value}))} placeholder="NEW / HOT / LIMITED"/>
            </div>
          </div>

          {/* Price + Stock + Weight */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <label style={lbl}>Price (THB) *</label>
              <input type="number" style={inp()} value={form.price_thb} onChange={e=>setForm(f=>({...f,price_thb:e.target.value}))} placeholder="1250"/>
            </div>
            <div>
              <label style={lbl}>Stock qty *</label>
              <input type="number" style={inp()} value={form.stock_qty} onChange={e=>setForm(f=>({...f,stock_qty:e.target.value}))}/>
            </div>
            <div>
              <label style={lbl}>Weight (kg)</label>
              <input type="number" step="0.001" style={inp()} value={form.weight_kg} onChange={e=>setForm(f=>({...f,weight_kg:e.target.value}))}/>
            </div>
          </div>

          {/* Dimensions */}
          <div style={{ background:"#f8fafc", border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:800, color:C.primary, marginBottom:4, display:"flex", alignItems:"center", gap:6 }}>
              📐 Dimensions (single item)
            </div>
            <div style={{ fontSize:11, color:C.muted, marginBottom:10 }}>
              Used to calculate dimensional weight and pick the right box for shipping.
              Leave empty if unknown — system will use estimates.
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <div>
                <label style={lbl}>Width (cm)</label>
                <input type="number" step="0.1" style={inp()} value={form.width_cm} onChange={e=>setForm(f=>({...f,width_cm:e.target.value}))} placeholder="15"/>
              </div>
              <div>
                <label style={lbl}>Length (cm)</label>
                <input type="number" step="0.1" style={inp()} value={form.length_cm} onChange={e=>setForm(f=>({...f,length_cm:e.target.value}))} placeholder="22"/>
              </div>
              <div>
                <label style={lbl}>Height (cm)</label>
                <input type="number" step="0.1" style={inp()} value={form.height_cm} onChange={e=>setForm(f=>({...f,height_cm:e.target.value}))} placeholder="5"/>
              </div>
            </div>
            {form.width_cm && form.length_cm && form.height_cm && form.weight_kg && (
              <div style={{ marginTop:10, padding:"8px 10px", background:"white", borderRadius:8, fontSize:11, color:C.text, display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:C.muted }}>📦 Volume: {(Number(form.width_cm)*Number(form.length_cm)*Number(form.height_cm)).toLocaleString()} cm³</span>
                <span style={{ color:C.muted }}>⚖️ Volumetric: {((Number(form.width_cm)*Number(form.length_cm)*Number(form.height_cm))/5000).toFixed(2)} kg</span>
                <span style={{ fontWeight:700, color:C.primary }}>
                  Billable: {Math.max(Number(form.weight_kg), (Number(form.width_cm)*Number(form.length_cm)*Number(form.height_cm))/5000).toFixed(2)} kg
                </span>
              </div>
            )}
          </div>

          {/* Sort + Active */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <label style={lbl}>Sort order</label>
              <input type="number" style={inp()} value={form.sort_order} onChange={e=>setForm(f=>({...f,sort_order:e.target.value}))}/>
              <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>Lower numbers show first</div>
            </div>
            <div>
              <label style={lbl}>Status</label>
              <div onClick={()=>setForm(f=>({...f,is_active:!f.is_active}))} style={{ cursor:"pointer", padding:"10px 12px", border:`1.5px solid ${form.is_active?C.green:"#e2e8f0"}`, borderRadius:8, background: form.is_active ? "#d1fae5" : "#f1f5f9", display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:700, color: form.is_active ? "#065f46" : C.muted }}>
                <span>{form.is_active ? "👁️" : "🚫"}</span>
                <span>{form.is_active ? "Active — visible on Marketplace" : "Hidden — not visible to customers"}</span>
              </div>
            </div>
          </div>

          {err && <div style={{ background:"#fee2e2", border:`1.5px solid #fca5a5`, borderRadius:8, padding:"10px 12px", color:"#991b1b", fontSize:12, fontWeight:700, marginBottom:12 }}>⚠️ {err}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${C.border}`, display:"flex", gap:10, background:"#f8fafc" }}>
          <button onClick={onClose} disabled={saving} style={{ padding:"10px 20px", background:"white", color:C.muted, border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Cancel
          </button>
          <div style={{ flex:1 }}/>
          <button onClick={handleSave} disabled={saving || uploading}
            style={{ padding:"10px 24px", background:`linear-gradient(135deg,${C.primary},${C.sky})`, color:"white", border:"none", borderRadius:8, fontSize:13, fontWeight:800, cursor: (saving || uploading) ? "not-allowed" : "pointer", fontFamily:"inherit", opacity: (saving || uploading) ? 0.6 : 1 }}>
            {saving ? "Saving…" : (isNew ? "Create Product" : "Save Changes")}
          </button>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// SUB-TAB 2: ORDERS
// ════════════════════════════════════════════════════════════════════

function OrdersSubtab() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch]   = useState("");
  const [expanded, setExpanded] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_orders")
      .select(`
        *,
        items:marketplace_order_items(id, product_name, product_sku, qty, unit_price, line_total),
        customer:profiles!marketplace_orders_user_id_fkey(smart_id, first_name, last_name, email, country)
      `)
      .order("created_at", { ascending:false });
    if (!error) setOrders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const ch = supabase.channel("manager-marketplace-orders")
      .on("postgres_changes", { event:"*", schema:"public", table:"marketplace_orders" }, fetchOrders)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchOrders]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return orders.filter(o => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (term) {
        const customerName = `${o.customer?.first_name||""} ${o.customer?.last_name||""}`.toLowerCase();
        const fields = [o.order_no, o.customer?.smart_id, customerName, o.customer?.email].join(" ").toLowerCase();
        if (!fields.includes(term)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, search]);

  const updateStatus = async (orderId, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === "shipped") updates.shipped_at = new Date().toISOString();
    if (newStatus === "completed") updates.completed_at = new Date().toISOString();
    if (newStatus === "paid") updates.paid_at = new Date().toISOString();

    const { error } = await supabase.from("marketplace_orders").update(updates).eq("id", orderId);
    if (error) alert("Update failed: " + error.message);
    else fetchOrders();
  };

  const counts = useMemo(() => ({
    all:      orders.length,
    review:   orders.filter(o => o.status === "pending_approval").length,
    paid:     orders.filter(o => o.status === "paid").length,
    process:  orders.filter(o => o.status === "processing").length,
    shipped:  orders.filter(o => o.status === "shipped").length,
    hold:     orders.filter(o => o.status === "in_warehouse").length,
  }), [orders]);

  return (
    <div>
      {/* Filter chips */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        {[
          { key:"",                  label:"All",         count:counts.all,    color:C.primary },
          { key:"pending_approval",  label:"Review Slip", count:counts.review, color:C.amber },
          { key:"paid",              label:"Paid",        count:counts.paid,   color:C.green },
          { key:"processing",        label:"Processing",  count:counts.process,color:C.sky },
          { key:"shipped",           label:"Shipped",     count:counts.shipped,color:C.violet },
          { key:"in_warehouse",      label:"Hold @ WH",   count:counts.hold,   color:C.muted },
        ].map(c => (
          <button key={c.label} onClick={()=>setStatusFilter(c.key)}
            style={{
              padding:"7px 14px", fontSize:12, fontWeight:800,
              border:`1.5px solid ${statusFilter === c.key ? c.color : C.border}`,
              borderRadius:20, cursor:"pointer", fontFamily:"inherit",
              background: statusFilter === c.key ? c.color : "white",
              color: statusFilter === c.key ? "white" : C.text,
              display:"flex", alignItems:"center", gap:6,
            }}>
            {c.label}
            <span style={{ background: statusFilter === c.key ? "rgba(255,255,255,0.25)" : "#f1f5f9", padding:"1px 7px", borderRadius:10, fontSize:11 }}>{c.count}</span>
          </button>
        ))}
      </div>

      <input placeholder="🔍 Search order #, customer name, smart ID, email..."
        value={search} onChange={e=>setSearch(e.target.value)}
        style={{ ...inp(), marginBottom:14 }}/>

      {loading ? <Loading/> :
       filtered.length === 0 ? <Empty icon="📋" title="No orders" hint="Orders will show up here once customers checkout."/> :
       (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(o => {
            const isOpen = expanded === o.id;
            const customer = o.customer || {};
            return (
              <div key={o.id} style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
                {/* Header row */}
                <div onClick={()=>setExpanded(isOpen ? null : o.id)} style={{ padding:14, cursor:"pointer", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                  <div style={{ width:42, height:42, borderRadius:10, background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
                    {o.shipping_method === "ship_now" ? "✈️" : "📦"}
                  </div>
                  <div style={{ flex:"1 1 200px", minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:C.text, fontFamily:"monospace" }}>{o.order_no}</div>
                    <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                      {`${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "—"}
                      {customer.smart_id && <> · <span style={{ fontFamily:"monospace" }}>{customer.smart_id}</span></>}
                      {customer.country && <> · {customer.country}</>}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:15, fontWeight:900, color:C.primary }}>฿{Number(o.total_thb).toLocaleString()}</div>
                    <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                      {new Date(o.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge map={ORDER_STATUS} k={o.status}/>
                  <span style={{ color:C.muted, fontSize:18, transform: isOpen ? "rotate(180deg)" : "", transition:"transform 0.2s" }}>▾</span>
                </div>

                {/* Expanded panel */}
                {isOpen && (
                  <div style={{ borderTop:`1px solid ${C.border}`, background:"#f8fafc", padding:16 }}>
                    {/* Items */}
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:12, fontWeight:800, color:C.text, marginBottom:8 }}>Items</div>
                      {(o.items || []).map(it => (
                        <div key={it.id} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px dashed ${C.border}`, fontSize:12 }}>
                          <span style={{ color:C.text }}>{it.product_name} <span style={{ color:C.muted, fontFamily:"monospace" }}>· {it.product_sku}</span></span>
                          <span style={{ color:C.text, fontWeight:700 }}>{it.qty} × ฿{Number(it.unit_price).toLocaleString()} = ฿{Number(it.line_total).toLocaleString()}</span>
                        </div>
                      ))}
                      <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0 0", fontSize:13, fontWeight:800, color:C.text }}>
                        <span>Subtotal</span>
                        <span>฿{Number(o.items_subtotal).toLocaleString()}</span>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", fontSize:12, color:C.muted }}>
                        <span>Shipping ({o.shipping_method === "ship_now" ? "Ship Now" : "Hold @ Warehouse"})</span>
                        <span>฿{Number(o.shipping_cost || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Shipping address */}
                    {o.shipping_method === "ship_now" && o.shipping_address && (
                      <div style={{ marginBottom:14, background:"white", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 12px", fontSize:12 }}>
                        <div style={{ fontWeight:800, color:C.text, marginBottom:4 }}>📍 Shipping Address</div>
                        <div style={{ color:C.muted, lineHeight:1.6 }}>
                          <strong style={{ color:C.text }}>{o.shipping_address.name}</strong><br/>
                          {o.shipping_address.line1}<br/>
                          {[o.shipping_address.city, o.shipping_address.state, o.shipping_address.postcode].filter(Boolean).join(", ")}<br/>
                          {o.shipping_address.country} · {o.shipping_address.phone}
                        </div>
                      </div>
                    )}

                    {o.customer_note && (
                      <div style={{ marginBottom:14, background:"#fef3c7", border:`1px solid #fde68a`, borderRadius:8, padding:"10px 12px", fontSize:12 }}>
                        <strong style={{ color:"#92400e" }}>💬 Customer note:</strong> <span style={{ color:"#78350f" }}>{o.customer_note}</span>
                      </div>
                    )}

                    {/* Status actions */}
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {o.status === "paid" && (
                        <button onClick={()=>updateStatus(o.id,"processing")} style={btnAction(C.sky)}>Start Processing →</button>
                      )}
                      {o.status === "processing" && o.shipping_method === "ship_now" && (
                        <button onClick={()=>updateStatus(o.id,"shipped")} style={btnAction(C.green)}>Mark Shipped ✈️</button>
                      )}
                      {o.status === "processing" && o.shipping_method === "hold_warehouse" && (
                        <button onClick={()=>updateStatus(o.id,"in_warehouse")} style={btnAction(C.violet)}>Move to Warehouse 📦</button>
                      )}
                      {o.status === "shipped" && (
                        <button onClick={()=>updateStatus(o.id,"completed")} style={btnAction(C.muted)}>Mark Completed</button>
                      )}
                      {!["cancelled","completed","refunded"].includes(o.status) && (
                        <button onClick={()=>{
                          if (window.confirm("Cancel this order?")) updateStatus(o.id,"cancelled");
                        }} style={btnAction(C.red, true)}>Cancel Order</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
       )}
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
// SUB-TAB 3: PAYMENTS (Marketplace slip approval)
// ════════════════════════════════════════════════════════════════════

function PaymentsSubtab() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [viewing, setViewing]   = useState(null);  // payment being reviewed

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_payments")
      .select(`
        *,
        order:marketplace_orders(order_no, status, total_thb, shipping_method),
        customer:profiles!marketplace_payments_user_id_fkey(smart_id, first_name, last_name, email)
      `)
      .order("created_at", { ascending:false });
    if (!error) setPayments(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  useEffect(() => {
    const ch = supabase.channel("manager-marketplace-payments")
      .on("postgres_changes", { event:"*", schema:"public", table:"marketplace_payments" }, fetchPayments)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchPayments]);

  const filtered = useMemo(() =>
    statusFilter ? payments.filter(p => p.status === statusFilter) : payments,
    [payments, statusFilter]
  );

  const counts = useMemo(() => ({
    review:    payments.filter(p => p.status === "pending_review").length,
    slip:      payments.filter(p => p.status === "pending_slip").length,
    confirmed: payments.filter(p => p.status === "confirmed").length,
    rejected:  payments.filter(p => p.status === "rejected").length,
  }), [payments]);

  return (
    <div>
      {/* Filter chips */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        {[
          { key:"",                  label:"All",          count: payments.length,   color:C.primary },
          { key:"pending_review",    label:"Pending review", count: counts.review,   color:C.amber },
          { key:"pending_slip",      label:"Awaiting slip",  count: counts.slip,     color:C.muted },
          { key:"confirmed",         label:"Confirmed",      count: counts.confirmed,color:C.green },
          { key:"rejected",          label:"Rejected",       count: counts.rejected, color:C.red },
        ].map(c => (
          <button key={c.label} onClick={()=>setStatusFilter(c.key)}
            style={{
              padding:"7px 14px", fontSize:12, fontWeight:800,
              border:`1.5px solid ${statusFilter === c.key ? c.color : C.border}`,
              borderRadius:20, cursor:"pointer", fontFamily:"inherit",
              background: statusFilter === c.key ? c.color : "white",
              color: statusFilter === c.key ? "white" : C.text,
              display:"flex", alignItems:"center", gap:6,
            }}>
            {c.label}
            <span style={{ background: statusFilter === c.key ? "rgba(255,255,255,0.25)" : "#f1f5f9", padding:"1px 7px", borderRadius:10, fontSize:11 }}>{c.count}</span>
          </button>
        ))}
      </div>

      {loading ? <Loading/> :
       filtered.length === 0 ? <Empty icon="💳" title="No payments" hint="Marketplace payment slips will appear here for review."/> :
       (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(p => {
            const customer = p.customer || {};
            return (
              <div key={p.id} style={{ background:"white", border:`1px solid ${C.border}`, borderRadius:12, padding:14, display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                <div style={{ width:42, height:42, borderRadius:10, background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>💳</div>
                <div style={{ flex:"1 1 220px", minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:800, color:C.text, fontFamily:"monospace" }}>{p.order?.order_no || "—"}</div>
                  <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                    {`${customer.first_name||""} ${customer.last_name||""}`.trim() || "—"}
                    {customer.smart_id && <> · <span style={{ fontFamily:"monospace" }}>{customer.smart_id}</span></>}
                  </div>
                </div>
                <div style={{ flex:"0 0 auto" }}>
                  <div style={{ fontSize:11, color:C.muted, fontWeight:600 }}>{PAY_METHODS[p.method] || p.method}</div>
                  <div style={{ fontSize:15, fontWeight:900, color:C.primary, marginTop:2 }}>฿{Number(p.amount_thb).toLocaleString()}</div>
                </div>
                <Badge map={PAY_STATUS} k={p.status}/>
                {p.slip_url && (
                  <button onClick={()=>setViewing(p)} style={{ background:C.primary, color:"white", border:"none", borderRadius:8, padding:"8px 14px", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                    View Slip →
                  </button>
                )}
              </div>
            );
          })}
        </div>
       )}

      {viewing && (
        <SlipReviewModal payment={viewing} onClose={()=>setViewing(null)} onReviewed={()=>{ setViewing(null); fetchPayments(); }}/>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Slip Review Modal — approve/reject Marketplace slip
// ════════════════════════════════════════════════════════════════════

function SlipReviewModal({ payment, onClose, onReviewed }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const customer = payment.customer || {};

  const approve = async () => {
    if (!window.confirm("Approve this slip? Order will be marked as paid.")) return;
    setSaving(true);
    try {
      // 1. Update payment
      await supabase.from("marketplace_payments").update({
        status:      "confirmed",
        reviewed_at: new Date().toISOString(),
      }).eq("id", payment.id);

      // 2. Update order: pending_approval → paid (or in_warehouse if hold)
      const newStatus = payment.order?.shipping_method === "hold_warehouse" ? "in_warehouse" : "paid";
      await supabase.from("marketplace_orders").update({
        status:  newStatus,
        paid_at: new Date().toISOString(),
      }).eq("id", payment.order_id);

      onReviewed?.();
    } catch (e) {
      alert("Approve failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) { alert("Please give a reason so the customer can re-upload."); return; }
    setSaving(true);
    try {
      await supabase.from("marketplace_payments").update({
        status:           "rejected",
        rejection_reason: reason.trim(),
        reviewed_at:      new Date().toISOString(),
      }).eq("id", payment.id);

      // Revert order back to pending_payment so customer can re-upload
      await supabase.from("marketplace_orders").update({
        status: "pending_payment",
      }).eq("id", payment.order_id);

      onReviewed?.();
    } catch (e) {
      alert("Reject failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(15,23,42,0.55)", zIndex:600, backdropFilter:"blur(2px)" }}/>
      <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:601,
        width:"min(640px,96vw)", maxHeight:"94vh", background:"white", borderRadius:16, overflow:"hidden",
        display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(0,0,0,0.3)" }}>

        <div style={{ background:`linear-gradient(135deg,${C.primary},${C.sky})`, padding:"16px 22px", display:"flex", alignItems:"center", color:"white" }}>
          <div>
            <div style={{ fontSize:17, fontWeight:900 }}>Review Payment Slip</div>
            <div style={{ fontSize:12, opacity:0.85, fontFamily:"monospace" }}>{payment.order?.order_no}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft:"auto", width:30, height:30, borderRadius:"50%", background:"rgba(255,255,255,0.2)", border:"none", color:"white", fontSize:14, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:22 }}>
          {/* Summary grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18, padding:14, background:"#f8fafc", borderRadius:10, border:`1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase" }}>Customer</div>
              <div style={{ fontSize:13, fontWeight:800, color:C.text, marginTop:2 }}>{`${customer.first_name||""} ${customer.last_name||""}`.trim() || "—"}</div>
              <div style={{ fontSize:11, color:C.muted, fontFamily:"monospace" }}>{customer.smart_id}</div>
            </div>
            <div>
              <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase" }}>Amount Claimed</div>
              <div style={{ fontSize:18, fontWeight:900, color:C.primary, marginTop:2 }}>฿{Number(payment.amount_thb).toLocaleString()}</div>
              <div style={{ fontSize:11, color:C.muted }}>via {PAY_METHODS[payment.method] || payment.method}</div>
            </div>
            <div>
              <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase" }}>Order Total</div>
              <div style={{ fontSize:13, fontWeight:800, color:C.text, marginTop:2 }}>฿{Number(payment.order?.total_thb || 0).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:"0.05em", textTransform:"uppercase" }}>Uploaded</div>
              <div style={{ fontSize:12, color:C.text, marginTop:2 }}>{payment.slip_uploaded_at ? new Date(payment.slip_uploaded_at).toLocaleString() : "—"}</div>
            </div>
          </div>

          {/* Amount mismatch warning */}
          {Number(payment.amount_thb) !== Number(payment.order?.total_thb || 0) && (
            <div style={{ background:"#fef3c7", border:"1.5px solid #fde68a", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#92400e", fontWeight:700 }}>
              ⚠️ Slip amount differs from order total by ฿{Math.abs(Number(payment.amount_thb) - Number(payment.order?.total_thb || 0)).toLocaleString()} — please verify.
            </div>
          )}

          {/* Slip image */}
          <div style={{ marginBottom:18 }}>
            <div style={lbl}>Slip image</div>
            {payment.slip_url ? (
              <a href={payment.slip_url} target="_blank" rel="noreferrer">
                <img src={payment.slip_url} alt="slip" style={{ width:"100%", maxHeight:420, objectFit:"contain", borderRadius:10, border:`1.5px solid ${C.border}`, background:"#f8fafc" }}/>
              </a>
            ) : <div style={{ padding:30, textAlign:"center", color:C.muted, fontSize:12 }}>No slip uploaded</div>}
            {payment.slip_url && (
              <div style={{ fontSize:11, color:C.sky, fontWeight:700, marginTop:4, textAlign:"center" }}>Click image to open in new tab</div>
            )}
          </div>

          {/* Rejection reason input (only when rejecting) */}
          {payment.status !== "rejected" && (
            <div style={{ marginBottom:8 }}>
              <label style={lbl}>Rejection reason (only fill if rejecting)</label>
              <textarea style={{ ...inp(), minHeight:60, resize:"vertical" }} value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Amount doesn't match / Slip is unclear / Wrong account"/>
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>The customer will see this reason and can re-upload a corrected slip.</div>
            </div>
          )}

          {payment.rejection_reason && (
            <div style={{ background:"#fee2e2", border:"1.5px solid #fca5a5", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#991b1b" }}>
              <strong>Previous rejection reason:</strong> {payment.rejection_reason}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding:"14px 22px", borderTop:`1px solid ${C.border}`, display:"flex", gap:10, background:"#f8fafc" }}>
          <button onClick={onClose} disabled={saving} style={{ padding:"10px 18px", background:"white", color:C.muted, border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            Close
          </button>
          <div style={{ flex:1 }}/>
          {payment.status !== "rejected" && payment.status !== "confirmed" && (
            <>
              <button onClick={reject} disabled={saving} style={{ padding:"10px 18px", background:"white", color:C.red, border:`1.5px solid ${C.red}`, borderRadius:8, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", opacity: saving ? 0.5 : 1 }}>
                Reject
              </button>
              <button onClick={approve} disabled={saving} style={{ padding:"10px 22px", background:`linear-gradient(135deg,${C.green},#059669)`, color:"white", border:"none", borderRadius:8, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", opacity: saving ? 0.5 : 1 }}>
                {saving ? "Saving…" : "✓ Approve"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN — ManagerMarketplaceTab (default export)
// ════════════════════════════════════════════════════════════════════

const SUB_TABS = [
  { key:"products", label:"Products", icon:"🛍️" },
  { key:"orders",   label:"Orders",   icon:"📋" },
  { key:"payments", label:"Payments", icon:"💳" },
];

export default function ManagerMarketplaceTab() {
  const [sub, setSub] = useState("products");

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

      {sub === "products" && <ProductsSubtab/>}
      {sub === "orders"   && <OrdersSubtab/>}
      {sub === "payments" && <PaymentsSubtab/>}
    </div>
  );
}
