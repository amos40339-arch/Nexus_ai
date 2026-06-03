import { useState, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";

const NETWORKS = [
  { name:"MTN",     code:"MTN", color:"#FFC107" },
  { name:"Airtel",  code:"AIR", color:"#EF4444" },
  { name:"Glo",     code:"GLO", color:"#10B881" },
  { name:"9mobile", code:"9MB", color:"#6A00DF" },
];

const DEFAULT_PLANS = {
  MTN: [
    { id:"mtn-50mb",  size:"50MB",  validity:"1 Day",   cost:50,   sellingPrice:60   },
    { id:"mtn-100mb", size:"100MB", validity:"1 Day",   cost:95,   sellingPrice:110  },
    { id:"mtn-200mb", size:"200MB", validity:"3 Days",  cost:160,  sellingPrice:185  },
    { id:"mtn-500mb", size:"500MB", validity:"7 Days",  cost:280,  sellingPrice:320  },
    { id:"mtn-1gb",   size:"1GB",   validity:"30 Days", cost:270,  sellingPrice:310  },
    { id:"mtn-2gb",   size:"2GB",   validity:"30 Days", cost:480,  sellingPrice:550  },
    { id:"mtn-3gb",   size:"3GB",   validity:"30 Days", cost:700,  sellingPrice:800  },
    { id:"mtn-5gb",   size:"5GB",   validity:"30 Days", cost:1150, sellingPrice:1300 },
    { id:"mtn-10gb",  size:"10GB",  validity:"30 Days", cost:2200, sellingPrice:2500 },
    { id:"mtn-20gb",  size:"20GB",  validity:"30 Days", cost:3800, sellingPrice:4300 },
  ],
  AIR: [
    { id:"air-100mb", size:"100MB", validity:"1 Day",   cost:90,   sellingPrice:105  },
    { id:"air-200mb", size:"200MB", validity:"3 Days",  cost:150,  sellingPrice:175  },
    { id:"air-500mb", size:"500MB", validity:"7 Days",  cost:260,  sellingPrice:300  },
    { id:"air-1gb",   size:"1GB",   validity:"30 Days", cost:260,  sellingPrice:300  },
    { id:"air-2gb",   size:"2GB",   validity:"30 Days", cost:460,  sellingPrice:530  },
    { id:"air-3gb",   size:"3GB",   validity:"30 Days", cost:680,  sellingPrice:780  },
    { id:"air-5gb",   size:"5GB",   validity:"30 Days", cost:1100, sellingPrice:1250 },
    { id:"air-10gb",  size:"10GB",  validity:"30 Days", cost:2100, sellingPrice:2400 },
    { id:"air-20gb",  size:"20GB",  validity:"30 Days", cost:3500, sellingPrice:4000 },
  ],
  GLO: [
    { id:"glo-100mb", size:"100MB", validity:"1 Day",   cost:85,   sellingPrice:100  },
    { id:"glo-200mb", size:"200MB", validity:"3 Days",  cost:145,  sellingPrice:170  },
    { id:"glo-500mb", size:"500MB", validity:"7 Days",  cost:250,  sellingPrice:290  },
    { id:"glo-1gb",   size:"1GB",   validity:"30 Days", cost:250,  sellingPrice:290  },
    { id:"glo-2gb",   size:"2GB",   validity:"30 Days", cost:450,  sellingPrice:520  },
    { id:"glo-3gb",   size:"3GB",   validity:"30 Days", cost:650,  sellingPrice:750  },
    { id:"glo-5gb",   size:"5GB",   validity:"30 Days", cost:1050, sellingPrice:1200 },
    { id:"glo-10gb",  size:"10GB",  validity:"30 Days", cost:2000, sellingPrice:2300 },
    { id:"glo-20gb",  size:"20GB",  validity:"30 Days", cost:3300, sellingPrice:3800 },
  ],
  "9MB": [
    { id:"9mb-100mb", size:"100MB", validity:"1 Day",   cost:88,   sellingPrice:102  },
    { id:"9mb-200mb", size:"200MB", validity:"3 Days",  cost:148,  sellingPrice:172  },
    { id:"9mb-500mb", size:"500MB", validity:"7 Days",  cost:255,  sellingPrice:295  },
    { id:"9mb-1gb",   size:"1GB",   validity:"30 Days", cost:255,  sellingPrice:295  },
    { id:"9mb-2gb",   size:"2GB",   validity:"30 Days", cost:455,  sellingPrice:525  },
    { id:"9mb-3gb",   size:"3GB",   validity:"30 Days", cost:660,  sellingPrice:760  },
    { id:"9mb-5gb",   size:"5GB",   validity:"30 Days", cost:1080, sellingPrice:1240 },
    { id:"9mb-10gb",  size:"10GB",  validity:"30 Days", cost:2050, sellingPrice:2350 },
    { id:"9mb-20gb",  size:"20GB",  validity:"30 Days", cost:3400, sellingPrice:3900 },
  ],
};

const DEFAULT_AIRTIME = {
  MTN:   { discount: 3   },
  AIR:   { discount: 3   },
  GLO:   { discount: 2.5 },
  "9MB": { discount: 2.5 },
};

const STYLES = `
  @keyframes fadeInUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes toastIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

  .ap-tabs { display:flex; gap:8px; margin-bottom:20px; animation:fadeInUp .4s ease both; }
  .ap-tab { height:40px; border-radius:10px; border:1px solid #2A2D3A; background:#1A1D27; font-family:'Poppins',sans-serif; font-size:13.5px; font-weight:600; color:#9ca3af; cursor:pointer; padding:0 20px; transition:all .2s; }
  .ap-tab.active { background:#6A00DF; border-color:#6A00DF; color:#fff; }

  .ap-net-row { display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap; }
  .ap-net-btn { height:38px; border-radius:9px; border:1.5px solid #2A2D3A; background:#1A1D27; font-family:'Poppins',sans-serif; font-size:12.5px; font-weight:700; color:#9ca3af; cursor:pointer; padding:0 14px; display:flex; align-items:center; gap:7px; transition:all .2s; }
  .ap-net-badge { width:22px; height:22px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:8px; font-weight:900; color:#fff; }

  .ap-network-header { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
  .ap-network-badge { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:900; color:#fff; flex-shrink:0; }
  .ap-network-name { font-size:16px; font-weight:800; color:#fff; }

  .ap-plan-count { font-size:12px; color:#6b7280; margin-bottom:14px; }
  .ap-plans-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(175px,1fr)); gap:10px; animation:fadeInUp .4s .04s ease both; }
  .ap-plan-card { background:#1A1D27; border:1px solid #2A2D3A; border-radius:14px; padding:14px; transition:border-color .2s; }
  .ap-plan-card:hover { border-color:#6A00DF; }
  .ap-plan-size { font-size:15px; font-weight:800; color:#fff; margin-bottom:2px; }
  .ap-plan-validity { font-size:11.5px; color:#6b7280; margin-bottom:10px; }
  .ap-plan-field { margin-bottom:8px; }
  .ap-plan-label { font-size:10.5px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
  .ap-plan-input { width:100%; height:36px; background:#0F1117; border:1px solid #2A2D3A; border-radius:9px; padding:0 10px; font-family:'Poppins',sans-serif; font-size:13.5px; font-weight:600; color:#fff; outline:none; transition:border-color .2s; box-sizing:border-box; }
  .ap-plan-input:focus { border-color:#6A00DF; }
  .ap-plan-margin { font-size:11px; color:#10B881; font-weight:600; margin-top:5px; }
  .ap-plan-margin.neg { color:#EF4444; }

  .ap-airtime-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; animation:fadeInUp .4s .04s ease both; }
  .ap-airtime-card { background:#1A1D27; border:1px solid #2A2D3A; border-radius:14px; padding:16px; }
  .ap-airtime-network { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
  .ap-airtime-badge { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:900; color:#fff; flex-shrink:0; }
  .ap-airtime-name { font-size:15px; font-weight:800; color:#fff; }

  .ap-save-bar { position:sticky; bottom:0; background:#0F1117; border-top:1px solid #2A2D3A; padding:16px 0 0; margin-top:24px; display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .ap-save-note { font-size:13px; color:#6b7280; }
  .ap-save-btn { height:44px; background:linear-gradient(135deg,#6A00DF,#8B3DFF); border:none; border-radius:12px; font-family:'Poppins',sans-serif; font-size:14px; font-weight:700; color:#fff; cursor:pointer; padding:0 28px; display:flex; align-items:center; gap:8px; box-shadow:0 6px 20px rgba(106,0,223,.3); transition:transform .15s; flex-shrink:0; }
  .ap-save-btn:active { transform:scale(.96); }
  .ap-save-btn:disabled { opacity:.5; cursor:not-allowed; }
  .ap-spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }

  .ap-toast { position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:#1A1D27; border:1px solid #10B881; border-radius:14px; padding:12px 20px; display:flex; align-items:center; gap:10px; z-index:300; box-shadow:0 8px 24px rgba(0,0,0,.4); animation:toastIn .3s ease both; white-space:nowrap; }
  .ap-toast.err { border-color:#EF4444; }
  .ap-toast-icon { width:26px; height:26px; border-radius:50%; background:#10B881; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .ap-toast.err .ap-toast-icon { background:#EF4444; }
  .ap-toast-text { font-size:14px; font-weight:600; color:#fff; }

  .ap-loading { display:flex; justify-content:center; padding:60px 0; }
  .ap-load-spinner { width:28px; height:28px; border:3px solid #2A2D3A; border-top-color:#6A00DF; border-radius:50%; animation:spin .7s linear infinite; }
`;

export default function AdminPricing() {
  const [activeTab, setActiveTab] = useState("data");
  const [network,   setNetwork]   = useState("MTN");
  const [dataPlans, setDataPlans] = useState(DEFAULT_PLANS);
  const [airtime,   setAirtime]   = useState(DEFAULT_AIRTIME);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);

  // Load plans: real API plans from plan_cache (written by Data.jsx), merged with admin selling prices
  useEffect(() => {
    (async () => {
      try {
        const [airtimeSnap, ...snaps] = await Promise.all([
          getDoc(doc(db, "pricing", "airtime")),
          ...NETWORKS.map(n => Promise.all([
            getDoc(doc(db, "plan_cache", n.code)),
            getDoc(doc(db, "pricing", `data_${n.code}`)),
          ])),
        ]);
        if (airtimeSnap.exists()) setAirtime(airtimeSnap.data());

        const merged = { ...DEFAULT_PLANS };
        NETWORKS.forEach((n, i) => {
          const [cacheSnap, pricingSnap] = snaps[i];
          const adminPrices = pricingSnap.exists() ? pricingSnap.data() : {};

          if (cacheSnap.exists()) {
            // Build plan list from real API cache
            const cache = cacheSnap.data();
            merged[n.code] = Object.entries(cache).map(([id, p]) => ({
              id,
              size:         p.data_size || id,
              validity:     p.validity  || "",
              cost:         adminPrices[id]?.cost         ?? Number(p.price) ?? 0,
              sellingPrice: adminPrices[id]?.sellingPrice ?? Math.ceil(Number(p.price) * 1.15),
            })).sort((a,b) => {
              // Sort by size ascending
              const toMB = s => {
                if (!s) return 0;
                if (s.includes("GB")) return parseFloat(s)*1024;
                return parseFloat(s);
              };
              return toMB(a.size) - toMB(b.size);
            });
          } else if (pricingSnap.exists()) {
            // Fall back to saved admin prices if no cache yet
            merged[n.code] = DEFAULT_PLANS[n.code].map(p => ({
              ...p,
              sellingPrice: adminPrices[p.id]?.sellingPrice ?? p.sellingPrice,
              cost:         adminPrices[p.id]?.cost         ?? p.cost,
            }));
          }
        });
        setDataPlans(merged);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const updateSelling = (code, id, val) =>
    setDataPlans(prev => ({
      ...prev,
      [code]: prev[code].map(p => p.id === id ? { ...p, sellingPrice: parseInt(val)||0 } : p)
    }));

  const updateCost = (code, id, val) =>
    setDataPlans(prev => ({
      ...prev,
      [code]: prev[code].map(p => p.id === id ? { ...p, cost: parseInt(val)||0 } : p)
    }));

  const updateAirtime = (code, val) =>
    setAirtime(prev => ({ ...prev, [code]: { discount: parseFloat(val)||0 } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        ...NETWORKS.map(n => {
          const priceMap = {};
          dataPlans[n.code].forEach(p => {
            priceMap[p.id] = { sellingPrice: p.sellingPrice, cost: p.cost, size: p.size, validity: p.validity };
          });
          return setDoc(doc(db, "pricing", `data_${n.code}`), priceMap);
        }),
        setDoc(doc(db, "pricing", "airtime"), airtime),
      ]);
      setToast({ msg: "Prices saved! ClassicSwift app updated instantly.", err: false });
    } catch (e) {
      setToast({ msg: "Save failed. Please try again.", err: true });
    }
    setSaving(false);
    setTimeout(() => setToast(null), 3000);
  };

  const currentNet   = NETWORKS.find(n => n.code === network);
  const currentPlans = dataPlans[network] || [];

  if (loading) return (
    <Layout title="Pricing Manager" subtitle="Plans auto-sync from API when users open the Data page">
      <style>{STYLES}</style>
      <div className="ap-loading"><div className="ap-load-spinner"/></div>
    </Layout>
  );

  return (
    <Layout title="Pricing Manager" subtitle="Plans auto-sync from API when users open the Data page">
      <style>{STYLES}</style>

      <div className="ap-tabs">
        <button className={`ap-tab${activeTab==="data"?" active":""}`} onClick={()=>setActiveTab("data")}>Data Plans</button>
        <button className={`ap-tab${activeTab==="airtime"?" active":""}`} onClick={()=>setActiveTab("airtime")}>Airtime Discount</button>
      </div>

      {activeTab === "data" && (
        <>
          <div className="ap-net-row">
            {NETWORKS.map(n => (
              <button key={n.code} className="ap-net-btn" onClick={() => setNetwork(n.code)}
                style={{
                  borderColor: network===n.code ? n.color : "#2A2D3A",
                  background:  network===n.code ? `${n.color}22` : "#1A1D27",
                  color:       network===n.code ? n.color : "#9ca3af",
                }}>
                <div className="ap-net-badge" style={{background:n.color}}>{n.code}</div>
                {n.name}
              </button>
            ))}
          </div>

          <div className="ap-network-header">
            <div className="ap-network-badge" style={{background:currentNet?.color}}>{network}</div>
            <div className="ap-network-name">{currentNet?.name} Data Plans</div>
          </div>

          <div className="ap-plan-count">{currentPlans.length} plans — edit cost price and selling price</div>

          <div className="ap-plans-grid">
            {currentPlans.map(plan => {
              const margin = plan.sellingPrice - plan.cost;
              const pct    = plan.cost > 0 ? ((margin/plan.cost)*100).toFixed(1) : "0.0";
              return (
                <div className="ap-plan-card" key={plan.id}>
                  <div className="ap-plan-size">{plan.size}</div>
                  <div className="ap-plan-validity">{plan.validity}</div>
                  <div className="ap-plan-field">
                    <div className="ap-plan-label">Cost Price (₦)</div>
                    <input className="ap-plan-input" type="number" value={plan.cost}
                      onChange={e => updateCost(network, plan.id, e.target.value)}/>
                  </div>
                  <div className="ap-plan-field">
                    <div className="ap-plan-label">Selling Price (₦)</div>
                    <input className="ap-plan-input" type="number" value={plan.sellingPrice}
                      onChange={e => updateSelling(network, plan.id, e.target.value)}/>
                  </div>
                  <div className={`ap-plan-margin${margin<0?" neg":""}`}>
                    Margin: ₦{margin} ({pct}%)
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === "airtime" && (
        <div className="ap-airtime-grid">
          {NETWORKS.map(n => (
            <div className="ap-airtime-card" key={n.code}>
              <div className="ap-airtime-network">
                <div className="ap-airtime-badge" style={{background:n.color}}>{n.code}</div>
                <div className="ap-airtime-name">{n.name}</div>
              </div>
              <div className="ap-plan-field">
                <div className="ap-plan-label">Discount % (given to user)</div>
                <input className="ap-plan-input" type="number" step="0.5"
                  value={airtime[n.code]?.discount || 0}
                  onChange={e => updateAirtime(n.code, e.target.value)}/>
              </div>
              <div className="ap-plan-margin" style={{marginTop:8}}>
                User pays ₦{(1000-(airtime[n.code]?.discount||0)*10).toFixed(0)} for ₦1,000 airtime
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ap-save-bar">
        <div className="ap-save-note">Changes saved to Firestore — ClassicSwift updates instantly</div>
        <button className="ap-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? <><div className="ap-spinner"/>Saving...</> : "Save All Changes"}
        </button>
      </div>

      {toast && (
        <div className={`ap-toast${toast.err?" err":""}`}>
          <div className="ap-toast-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {toast.err
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <polyline points="20 6 9 17 4 12"/>}
            </svg>
          </div>
          <span className="ap-toast-text">{toast.msg}</span>
        </div>
      )}
    </Layout>
  );
}
