import { useState } from "react";
import { supabase } from "./supabaseClient";

// ─────────────────────────────────────────────────────────────────────────────
//  CheckoutPage_v1.jsx  —  CartMates Marketplace Checkout
//
//  4-step flow:
//    1. Review        — items + subtotal
//    2. Shipping      — Ship Now / Hold @ Warehouse (1 order = 1 method, MVP)
//    3. Payment       — pick method (PromptPay / Wise / PayPal / Credit Card)
//    4. Upload slip   — confirm + create order
//
//  Props:
//    user         — { id, smart_id, first_name, last_name, country, ... }
//    cart         — [{ id, name, price, qty, img, tag, weight_kg? }]
//    onCancel()   — close checkout (back to cart drawer / landing)
//    onSuccess(orderNo) — order created, slip uploaded
//    onClearCart()    — clear localStorage cart after successful order
//
//  Notes:
//    • Shipping cost for "Ship Now" is a placeholder estimate (₿250 base).
//      Real calculation requires destination + total weight from shipping_rates
//      table — wired in next phase.
//    • Credit Card method uses slip-based flow in MVP (same as others).
//      Real gateway (Omise) deferred to v52+.
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
};

// ─── Country name → ISO3 mapping (for shipping quote lookup) ───────────
const COUNTRY_ISO3 = {
  "Japan":"JPN", "South Korea":"KOR", "Taiwan":"TWN", "Hong Kong":"HKG",
  "China":"CHN", "Singapore":"SGP", "Malaysia":"MYS", "Indonesia":"IDN",
  "Philippines":"PHL", "Vietnam":"VNM", "Macau":"MAC",
  "United States":"USA", "Canada":"CAN", "Mexico":"MEX", "Brazil":"BRA",
  "Argentina":"ARG", "Peru":"PER", "Bolivia":"BOL",
  "United Kingdom":"GBR", "France":"FRA", "Germany":"DEU", "Italy":"ITA",
  "Australia":"AUS", "Thailand":"THA", "Spain":"ESP",
};
const toISO3 = (country) => COUNTRY_ISO3[country] || country?.slice(0,3).toUpperCase();

const PAYMENT_METHODS = [
  {
    id: "promptpay",
    icon: "🇹🇭",
    name: "PromptPay QR",
    desc: "Scan QR with any Thai banking app",
    note: "Best for Thailand-based customers",
  },
  {
    id: "wise",
    icon: "🌍",
    name: "Wise",
    desc: "International transfer (low FX fee)",
    note: "Recommended for overseas",
  },
  {
    id: "paypal",
    icon: "💳",
    name: "PayPal",
    desc: "Pay with PayPal balance or card",
    note: "Familiar for fans worldwide",
  },
  {
    id: "credit_card",
    icon: "💎",
    name: "Credit Card",
    desc: "Visa / Mastercard via bank transfer",
    note: "Slip upload (auto gateway soon)",
  },
];

const STEPS = [
  { n: 1, label: "Review" },
  { n: 2, label: "Shipping" },
  { n: 3, label: "Payment" },
  { n: 4, label: "Confirm" },
];

export default function CheckoutPage({ user, cart, onCancel, onSuccess, onClearCart }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 2 — Shipping
  const [shipMethod, setShipMethod] = useState(""); // 'ship_now' | 'hold_warehouse'
  const [addr, setAddr] = useState({
    name:    `${user?.first_name || ""} ${user?.last_name || ""}`.trim(),
    line1:   "",
    city:    "",
    state:   "",
    postcode:"",
    country: user?.country || "",
    phone:   "",
  });

  // Step 3 — Payment
  const [payMethod, setPayMethod] = useState("");

  // Smart shipping quote (Ship Now only)
  const [quote, setQuote]               = useState(null);   // { pack, carriers, ... }
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError]     = useState("");
  const [selectedCarrier, setSelectedCarrier] = useState(null); // { carrier_id, cost_thb, ... }

  // Step 4 — Slip
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [customerNote, setCustomerNote] = useState("");

  // Totals
  const itemsTotal   = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const packFee      = quote?.pack?.box?.pack_fee_thb ? Number(quote.pack.box.pack_fee_thb) : 0;
  const shippingCost = shipMethod === "ship_now" ? (selectedCarrier?.cost_thb || 0) + packFee : 0;
  const grandTotal   = itemsTotal + shippingCost;

  // ── Fetch shipping quote when needed (Ship Now + address.country set) ────
  useEffect(() => {
    if (shipMethod !== "ship_now" || !addr.country) {
      setQuote(null);
      setSelectedCarrier(null);
      return;
    }

    let cancelled = false;
    const fetchQuote = async () => {
      setQuoteLoading(true);
      setQuoteError("");
      try {
        const items = cart.map(i => ({ product_id: i.id, qty: i.qty }));
        const { data, error } = await supabase.rpc("fn_marketplace_shipping_quote", {
          p_items:        items,
          p_country_code: toISO3(addr.country),
        });
        if (cancelled) return;
        if (error) throw error;
        if (data?.success === false) throw new Error(data.error || "Failed to calculate shipping");
        setQuote(data);
        // Auto-select cheapest carrier
        if (data?.carriers?.length > 0) {
          setSelectedCarrier(data.carriers[0]);
        } else {
          setSelectedCarrier(null);
          setQuoteError("No carriers available for this destination yet. Please contact us.");
        }
      } catch (e) {
        if (!cancelled) {
          setQuoteError(e.message || "Unable to calculate shipping right now.");
          setQuote(null);
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    };

    fetchQuote();
    return () => { cancelled = true; };
  }, [shipMethod, addr.country, cart]);

  // ── Validations ─────────────────────────────────────────────────────────────
  const canGoStep2 = cart.length > 0;
  const canGoStep3 = shipMethod === "hold_warehouse" ||
                     (shipMethod === "ship_now" && addr.line1 && addr.city && addr.postcode && addr.country && addr.phone && selectedCarrier);
  const canGoStep4 = !!payMethod;
  const canSubmit  = !!slipFile;

  // ── Handle slip upload preview ──────────────────────────────────────────────
  const handleSlipChange = (file) => {
    if (!file) return;
    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = () => setSlipPreview(reader.result);
    reader.readAsDataURL(file);
  };

  // ── Submit order ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Create order via RPC
      const items = cart.map(i => ({
        product_id: i.id,
        qty:        i.qty,
        unit_price: i.price,
      }));

      const { data: orderRes, error: orderErr } = await supabase.rpc("fn_create_marketplace_order", {
        p_user_id:          user.id,
        p_items:            items,
        p_shipping_method:  shipMethod,
        p_shipping_address: shipMethod === "ship_now" ? addr : null,
        p_shipping_cost:    shippingCost,
        p_customer_note:    customerNote || null,
      });

      if (orderErr) throw orderErr;
      if (!orderRes?.success) throw new Error(orderRes?.error || "Failed to create order");

      const orderId  = orderRes.order_id;
      const orderNo  = orderRes.order_no;

      // 2. Upload slip to Supabase Storage
      const ext      = slipFile.name.split(".").pop();
      const slipPath = `marketplace_slips/${user.id}/${orderId}_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("payment-slips")
        .upload(slipPath, slipFile);

      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-slips")
        .getPublicUrl(slipPath);

      // 3. Create payment record
      const { error: payErr } = await supabase.from("marketplace_payments").insert({
        order_id:         orderId,
        user_id:          user.id,
        method:           payMethod,
        amount_thb:       grandTotal,
        slip_url:         publicUrl,
        slip_uploaded_at: new Date().toISOString(),
        status:           "pending_review",
      });

      if (payErr) throw payErr;

      // 4. Update order: status + smart pack metadata
      const orderUpdate = { status: "pending_approval" };
      if (shipMethod === "ship_now" && selectedCarrier && quote?.pack?.box) {
        orderUpdate.selected_carrier_id = selectedCarrier.carrier_id;
        orderUpdate.selected_box_id     = quote.pack.box.id;
        orderUpdate.billable_weight_kg  = Number(quote.billable_kg);
        orderUpdate.pack_fee_thb        = packFee;
        orderUpdate.carrier             = selectedCarrier.carrier_name;
      }
      await supabase
        .from("marketplace_orders")
        .update(orderUpdate)
        .eq("id", orderId);

      // 5. Clear cart + call onSuccess
      onClearCart?.();
      onSuccess?.(orderNo);

    } catch (e) {
      console.error(e);
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => setStep(s => Math.min(4, s + 1));
  const goBack = () => step === 1 ? onCancel?.() : setStep(s => Math.max(1, s - 1));

  // ── Common styles ───────────────────────────────────────────────────────────
  const inputSty = {
    width: "100%", padding: "11px 14px",
    border: "1.5px solid #e2e8f0", borderRadius: 10,
    fontSize: 14, outline: "none", fontFamily: "inherit",
    background: "white", color: C.text, boxSizing: "border-box",
    transition: "border-color 0.15s",
  };
  const lblSty = {
    display: "block", fontSize: 11, fontWeight: 700, color: "#475569",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #1A56C4 0%, #3B9EE8 100%)",
      fontFamily: "'Nunito', 'Poppins', sans-serif",
      padding: "20px 16px 60px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Baloo+2:wght@700;800;900&display=swap');
        *{ box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp{ from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up{ animation: fadeUp .35s ease both; }
        input:focus, textarea:focus, select:focus { border-color: ${C.primary}!important; box-shadow: 0 0 0 3px rgba(7,91,176,0.08); }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 720, margin: "0 auto 20px", color: "white", textAlign: "center" }}>
        <div style={{ fontSize: 30, marginBottom: 6 }}>🛒</div>
        <h1 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 26, fontWeight: 900 }}>Checkout</h1>
        <p style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Almost there, {user?.first_name || "fan"}! 🐰</p>
      </div>

      {/* Step indicator */}
      <div style={{ maxWidth: 720, margin: "0 auto 18px", background: "white", borderRadius: 16, padding: "16px 20px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: step >= s.n ? C.primary : "#e5e7eb",
                  color: step >= s.n ? "white" : "#9ca3af",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800,
                  boxShadow: step === s.n ? `0 0 0 4px ${C.primary}25` : "none",
                  transition: "all 0.25s",
                }}>
                  {step > s.n ? "✓" : s.n}
                </div>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: step >= s.n ? C.primary : "#9ca3af", whiteSpace: "nowrap" }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 40, height: 2, background: step > s.n ? C.primary : "#e5e7eb", margin: "0 6px 18px", transition: "background 0.25s" }}/>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content card */}
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* ─── STEP 1: Review ─────────────────────────────── */}
        {step === 1 && (
          <div className="fade-up" style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.primary, marginBottom: 16 }}>Review Your Cart</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, background: C.bg, borderRadius: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{item.img}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {item.tag && <div style={{ fontSize: 11, color: C.sky, fontWeight: 800, marginBottom: 2 }}>{item.tag}</div>}
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.text, lineHeight: 1.3, marginBottom: 4 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>฿{item.price.toLocaleString()} × {item.qty}</div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 15, color: C.primary, flexShrink: 0 }}>฿{(item.price * item.qty).toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted }}>
                <span>Items subtotal</span>
                <span style={{ fontWeight: 700 }}>฿{itemsTotal.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, fontStyle: "italic" }}>
                <span>Shipping</span>
                <span>Calculated next step</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 900, color: C.text, marginTop: 6 }}>
                <span>Estimated Total</span>
                <span style={{ color: C.primary }}>฿{itemsTotal.toLocaleString()}+</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Shipping Method ───────────────────── */}
        {step === 2 && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.primary, marginBottom: 4 }}>Shipping Method</h2>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Choose what happens with your purchase</p>

              {[
                { id: "ship_now", icon: "🚀", title: "Ship Now", desc: "We ship directly to your address as soon as payment is confirmed.", note: "Smart-pack calculation runs after you enter your address" },
                { id: "hold_warehouse", icon: "📦", title: "Hold at Warehouse", desc: "We'll hold your items in our Bangkok warehouse — combine with other parcels later to save on shipping.", note: "Pay only ฿" + itemsTotal.toLocaleString() + " now · shipping later when consolidated" },
              ].map(m => (
                <div key={m.id} onClick={() => setShipMethod(m.id)}
                  style={{
                    border: `2px solid ${shipMethod === m.id ? C.primary : "#e5e7eb"}`,
                    borderRadius: 14, padding: 16, marginBottom: 10, cursor: "pointer",
                    background: shipMethod === m.id ? "#EFF6FF" : "white",
                    transition: "all 0.2s",
                    display: "flex", alignItems: "flex-start", gap: 14,
                    boxShadow: shipMethod === m.id ? `0 4px 16px ${C.primary}25` : "none",
                  }}>
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{m.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 3 }}>{m.title}</div>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 6 }}>{m.desc}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.primary }}>{m.note}</div>
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    border: `2px solid ${shipMethod === m.id ? C.primary : "#cbd5e1"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {shipMethod === m.id && <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.primary }}/>}
                  </div>
                </div>
              ))}
            </div>

            {/* Address form — only show for Ship Now */}
            {shipMethod === "ship_now" && (
              <div className="fade-up" style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: C.primary, marginBottom: 14 }}>Shipping Address</h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={lblSty}>Recipient name *</label>
                    <input style={inputSty} value={addr.name} onChange={e => setAddr(a => ({ ...a, name: e.target.value }))} placeholder="Full name"/>
                  </div>
                  <div>
                    <label style={lblSty}>Address line *</label>
                    <input style={inputSty} value={addr.line1} onChange={e => setAddr(a => ({ ...a, line1: e.target.value }))} placeholder="Street, building, unit"/>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={lblSty}>City *</label>
                      <input style={inputSty} value={addr.city} onChange={e => setAddr(a => ({ ...a, city: e.target.value }))}/>
                    </div>
                    <div>
                      <label style={lblSty}>State / Province</label>
                      <input style={inputSty} value={addr.state} onChange={e => setAddr(a => ({ ...a, state: e.target.value }))}/>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={lblSty}>Postcode *</label>
                      <input style={inputSty} value={addr.postcode} onChange={e => setAddr(a => ({ ...a, postcode: e.target.value }))}/>
                    </div>
                    <div>
                      <label style={lblSty}>Country *</label>
                      <input style={inputSty} value={addr.country} onChange={e => setAddr(a => ({ ...a, country: e.target.value }))}/>
                    </div>
                  </div>
                  <div>
                    <label style={lblSty}>Phone *</label>
                    <input style={inputSty} value={addr.phone} onChange={e => setAddr(a => ({ ...a, phone: e.target.value }))} placeholder="+81 90 0000 0000"/>
                  </div>
                </div>
              </div>
            )}

            {/* Smart Pack + Carrier selection — only for Ship Now with country set */}
            {shipMethod === "ship_now" && addr.country && (
              <div className="fade-up" style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 20 }}>📦</span>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: C.primary, margin: 0 }}>Smart Pack Calculation</h3>
                </div>

                {quoteLoading && (
                  <div style={{ padding: "30px 0", textAlign: "center", color: C.muted }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>🐰</div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>Calculating optimal box & shipping...</div>
                  </div>
                )}

                {quoteError && !quoteLoading && (
                  <div style={{ background: "#fee2e2", border: "1.5px solid #fca5a5", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "#991b1b", fontWeight: 700 }}>
                    ⚠️ {quoteError}
                  </div>
                )}

                {quote?.pack?.box && !quoteLoading && (
                  <>
                    {/* Box info */}
                    <div style={{ background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)", border: "1.5px solid #bfdbfe", borderRadius: 12, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 32 }}>{quote.pack.box.emoji || "📦"}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: C.primary }}>{quote.pack.box.name}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                          {quote.pack.box.external_w}×{quote.pack.box.external_l}×{quote.pack.box.external_h} cm · max {quote.pack.box.max_weight_kg} kg
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Pack fee</div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>฿{Number(quote.pack.box.pack_fee_thb || 0).toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Weight breakdown */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
                      <div style={{ background: C.bg, borderRadius: 10, padding: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Actual</div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: C.text, marginTop: 2 }}>{Number(quote.pack.total_kg).toFixed(2)} kg</div>
                      </div>
                      <div style={{ background: C.bg, borderRadius: 10, padding: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase" }}>Volumetric</div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: C.text, marginTop: 2 }}>{Number(quote.pack.volumetric_kg).toFixed(2)} kg</div>
                      </div>
                      <div style={{ background: `linear-gradient(135deg,${C.primary},${C.sky})`, borderRadius: 10, padding: 10, textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.85)", fontWeight: 700, textTransform: "uppercase" }}>Billable</div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: "white", marginTop: 2 }}>{Number(quote.billable_kg).toFixed(2)} kg</div>
                      </div>
                    </div>

                    {/* Carriers */}
                    <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 8 }}>
                      Choose carrier ({quote.carriers?.length || 0} available)
                    </div>
                    {(quote.carriers || []).length === 0 ? (
                      <div style={{ padding: "20px", textAlign: "center", color: C.muted, fontSize: 12, fontStyle: "italic", background: C.bg, borderRadius: 10 }}>
                        No carriers configured for {addr.country} yet. Please contact support.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {quote.carriers.map((c, i) => {
                          const selected = selectedCarrier?.carrier_id === c.carrier_id;
                          return (
                            <div key={c.carrier_id} onClick={() => setSelectedCarrier(c)}
                              style={{
                                border: `2px solid ${selected ? C.primary : "#e5e7eb"}`,
                                borderRadius: 12, padding: 12, cursor: "pointer",
                                background: selected ? "#EFF6FF" : "white",
                                transition: "all 0.15s",
                                display: "flex", alignItems: "center", gap: 12,
                              }}>
                              {c.logo_url ? (
                                <img src={c.logo_url} alt={c.carrier_name} style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }}/>
                              ) : (
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✈️</div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: C.text, display: "flex", alignItems: "center", gap: 6 }}>
                                  {c.carrier_name}
                                  {i === 0 && <span style={{ fontSize: 9, background: "#10b981", color: "white", padding: "2px 6px", borderRadius: 6, fontWeight: 900 }}>CHEAPEST</span>}
                                </div>
                                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Zone: {c.group_name || "—"}</div>
                              </div>
                              <div style={{ fontSize: 16, fontWeight: 900, color: C.primary, flexShrink: 0 }}>฿{Number(c.cost_thb).toLocaleString()}</div>
                              <div style={{
                                width: 20, height: 20, borderRadius: "50%",
                                border: `2px solid ${selected ? C.primary : "#cbd5e1"}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                              }}>
                                {selected && <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.primary }}/>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 3: Payment Method ───────────────────── */}
        {step === 3 && (
          <div className="fade-up" style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.primary, marginBottom: 4 }}>Payment Method</h2>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Pick how you'd like to pay</p>

            <div style={{ background: "linear-gradient(135deg, #FFEB59, #fbbf24)", borderRadius: 12, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: C.dark, fontWeight: 700 }}>
              💰 Total to pay: <span style={{ fontWeight: 900, fontSize: 14 }}>฿{grandTotal.toLocaleString()}</span>
            </div>

            {PAYMENT_METHODS.map(m => (
              <div key={m.id} onClick={() => setPayMethod(m.id)}
                style={{
                  border: `2px solid ${payMethod === m.id ? C.primary : "#e5e7eb"}`,
                  borderRadius: 14, padding: 14, marginBottom: 10, cursor: "pointer",
                  background: payMethod === m.id ? "#EFF6FF" : "white",
                  transition: "all 0.2s",
                  display: "flex", alignItems: "center", gap: 14,
                  boxShadow: payMethod === m.id ? `0 4px 16px ${C.primary}25` : "none",
                }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: payMethod === m.id ? "white" : C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{m.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{m.desc}</div>
                  <div style={{ fontSize: 10, color: C.sky, fontWeight: 700, marginTop: 3, fontStyle: "italic" }}>{m.note}</div>
                </div>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  border: `2px solid ${payMethod === m.id ? C.primary : "#cbd5e1"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {payMethod === m.id && <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.primary }}/>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── STEP 4: Confirm + Slip ───────────────────── */}
        {step === 4 && (
          <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Payment instructions */}
            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.primary, marginBottom: 12 }}>
                {PAYMENT_METHODS.find(m => m.id === payMethod)?.icon} Pay {PAYMENT_METHODS.find(m => m.id === payMethod)?.name}
              </h2>

              {payMethod === "promptpay" && (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ display: "inline-block", padding: 14, background: C.bg, borderRadius: 14, marginBottom: 10 }}>
                    <div style={{ width: 160, height: 160, background: "white", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80 }}>📱</div>
                  </div>
                  <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>PromptPay: <strong style={{ color: C.text }}>0826929983</strong></p>
                  <p style={{ fontWeight: 900, fontSize: 22, color: C.primary }}>฿{grandTotal.toLocaleString()}</p>
                </div>
              )}

              {payMethod === "wise" && (
                <div style={{ background: C.bg, borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 800, color: C.text, marginBottom: 8 }}>Send to Wise:</div>
                  <div><strong>Account holder:</strong> CartMates Co., Ltd.</div>
                  <div><strong>Email:</strong> cs@cartmates.co</div>
                  <div><strong>Amount:</strong> ฿{grandTotal.toLocaleString()} THB</div>
                </div>
              )}

              {payMethod === "paypal" && (
                <div style={{ background: C.bg, borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 800, color: C.text, marginBottom: 8 }}>PayPal:</div>
                  <div><strong>PayPal email:</strong> pay@cartmates.co</div>
                  <div><strong>Amount:</strong> ฿{grandTotal.toLocaleString()} THB (≈ USD equivalent)</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Please send as "Friends & Family" to avoid fees.</div>
                </div>
              )}

              {payMethod === "credit_card" && (
                <div style={{ background: C.bg, borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 800, color: C.text, marginBottom: 8 }}>Bank transfer from your card:</div>
                  <div><strong>Bank:</strong> Kasikorn Bank</div>
                  <div><strong>Account:</strong> 123-4-56789-0</div>
                  <div><strong>Name:</strong> CartMates Co., Ltd.</div>
                  <div><strong>Amount:</strong> ฿{grandTotal.toLocaleString()}</div>
                </div>
              )}
            </div>

            {/* Slip upload */}
            <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: C.primary, marginBottom: 4 }}>Upload Payment Slip *</h3>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>We'll review within 24 hours and confirm your order</p>

              {slipPreview ? (
                <div style={{ position: "relative", marginBottom: 14 }}>
                  <img src={slipPreview} alt="slip preview" style={{ width: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 12, border: `2px solid ${C.green}` }}/>
                  <button onClick={() => { setSlipFile(null); setSlipPreview(null); }} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 30, height: 30, fontSize: 14, cursor: "pointer" }}>✕</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <label style={{ flex: 1, padding: "14px", background: `linear-gradient(135deg, ${C.primary}, ${C.sky})`, color: "white", borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: "pointer", textAlign: "center", display: "block" }}>
                    📎 Choose File
                    <input type="file" accept="image/*" onChange={e => handleSlipChange(e.target.files?.[0])} style={{ display: "none" }}/>
                  </label>
                  <label style={{ flex: 1, padding: "14px", background: C.bg, color: C.muted, borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: "pointer", textAlign: "center", display: "block", border: "1.5px solid #e2e8f0" }}>
                    📷 Camera
                    <input type="file" accept="image/*" capture="environment" onChange={e => handleSlipChange(e.target.files?.[0])} style={{ display: "none" }}/>
                  </label>
                </div>
              )}

              <div>
                <label style={lblSty}>Note for CartMates (optional)</label>
                <textarea style={{ ...inputSty, minHeight: 60, resize: "vertical" }} value={customerNote} onChange={e => setCustomerNote(e.target.value)} placeholder="Any special requests?"/>
              </div>
            </div>

            {/* Final summary */}
            <div style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.sky})`, borderRadius: 16, padding: 20, color: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, opacity: 0.85 }}>
                <span>Items</span><span>฿{itemsTotal.toLocaleString()}</span>
              </div>
              {shipMethod === "ship_now" && selectedCarrier && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, opacity: 0.85 }}>
                    <span>Shipping ({selectedCarrier.carrier_name})</span><span>฿{Number(selectedCarrier.cost_thb).toLocaleString()}</span>
                  </div>
                  {packFee > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13, opacity: 0.85 }}>
                      <span>Pack fee ({quote?.pack?.box?.name})</span><span>฿{packFee.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
              {shipMethod === "hold_warehouse" && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13, opacity: 0.85 }}>
                  <span>Shipping</span><span style={{ fontStyle: "italic" }}>Calculated later</span>
                </div>
              )}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.25)", paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 18 }}>
                <span>Total</span><span style={{ color: C.yellow }}>฿{grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Error display ─────────────────────────────── */}
        {error && (
          <div style={{ marginTop: 12, background: "#fee2e2", border: "1.5px solid #fca5a5", borderRadius: 12, padding: "12px 14px", color: "#991b1b", fontSize: 13, fontWeight: 700 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ─── Navigation buttons ───────────────────────── */}
        <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
          <button onClick={goBack} disabled={loading}
            style={{
              padding: "14px 22px", background: "rgba(255,255,255,0.95)", color: C.text,
              border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
              opacity: loading ? 0.5 : 1,
            }}>
            {step === 1 ? "Cancel" : "← Back"}
          </button>

          {step < 4 ? (
            <button onClick={goNext}
              disabled={
                (step === 1 && !canGoStep2) ||
                (step === 2 && !canGoStep3) ||
                (step === 3 && !canGoStep4)
              }
              style={{
                flex: 1, padding: "14px", background: C.yellow, color: C.dark,
                border: "none", borderRadius: 12, fontSize: 15, fontWeight: 900,
                cursor: "pointer", fontFamily: "inherit",
                opacity: ((step === 1 && !canGoStep2) || (step === 2 && !canGoStep3) || (step === 3 && !canGoStep4)) ? 0.5 : 1,
              }}>
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={!canSubmit || loading}
              style={{
                flex: 1, padding: "14px", background: C.yellow, color: C.dark,
                border: "none", borderRadius: 12, fontSize: 15, fontWeight: 900,
                cursor: (canSubmit && !loading) ? "pointer" : "not-allowed", fontFamily: "inherit",
                opacity: (canSubmit && !loading) ? 1 : 0.5,
              }}>
              {loading ? "Submitting..." : "Submit Order 🐰"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
