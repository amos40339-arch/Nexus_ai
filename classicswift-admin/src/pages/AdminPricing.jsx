import { useState, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";

// PHP proxy on Pointly server — avoids CORS from Render.com
const PROXY = "https://www.pointly.com.ng/api/vtu_proxy.php";

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

  .ap-sync-bar { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
  .ap-sync-btn { height:36px; background:#1A1D27; border:1px solid #6A00DF; border-radius:10px; font-family:'Poppins',sans-serif; font-size:13px; font-weight:600; color:#6A00DF; cursor:pointer; padding:0 16px; display:flex; align-items:center; gap:7px; transition:all .2s; }
  .ap-sync-btn:hover { background:#6A00DF22; }
  .ap-sync-btn:disabled { opacity:.5; cursor:not-allowed; }
  .ap-sync-status { font-size:12px; color:#6b7280; }
  .ap-sync-ok { color:#10B881; }
  .ap-sync-err { color:#EF4444; }

  .ap-plans-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:10px; }
  .ap-plan-card { background:#1A1D27; border:1px solid #2A2D3A; border-radius:14px; padding:14px; transition:border-color .2s; }
  .ap-plan-card:hover { border-color:#6A00DF; }
  .ap-plan-size { font-size:15px; font-weight:800; color:#fff; margin-bottom:2px; }
  .ap-plan-validity { font-size:11.5px; color:#6b7280; margin-bottom:10px; }
  .ap-plan-field { margin-bottom:8px; }
  .ap-plan-label { font-size:10.5px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
  .ap-plan-input { width:100%; height:36px; background:#0F1117; border:1px solid #2A2D3A; border-radius:9px; padding:0 10px; font-family:'Poppins',sans-serif; font-size:13.5px; font-weight:600; color:#fff; outline:none; transition:border-color .2s; }
  .ap-plan-input:focus { border-color:#6A00DF; }
  .ap-plan-margin { font-size:11px; color:#10B881; font-weight:600; margin-top:5px; }
  .ap-plan-margin.neg { color:#EF4444; }
  .ap-plan-api-price { font-size:11px; color:#6b7280; margin-bottom:6px; }

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
  .ap-spin-sm { width:13px; height:13px; border:2px solid rgba(106,0,223,.3); border-top-color:#6A00DF; border-radius:50%; animation:spin .7s linear infinite; }

  .ap-toast { position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:#1A1D27; border:1px solid #10B881; border-radius:14px; padding:12px 20px; display:flex; align-items:center; gap:10px; z-index:300; box-shadow:0 8px 24px rgba(0,0,0,.4); animation:toastIn .3s ease both; white-space:nowrap; }
  .ap-toast.err { border-color:#EF4444; }
  .ap-toast-icon { width:26px; height:26px; border-radius:50%; background:#10B881; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .ap-toast.err .ap-toast-icon { background:#EF4444; }
  .ap-toast-text { font-size:14px; font-weight:600; color:#fff; }

  .ap-loading { display:flex; justify-content:center; padding:60px 0; }
  .ap-load-spinner { width:28px; height:28px; border:3px solid #2A2D3A; border-top-color:#6A00DF; border-radius:50%; animation:spin .7s linear infinite; }
  .ap-plan-count { font-size:12px; color:#6b7280; margin-bottom:14px; }
  .ap-empty { text-align:center; padding:40px 0; color:#6b7280; font-size:13px; }
`;

const NETWORKS = [
  { name:"MTN",     code:"MTN", id:1, color:"#FFC107" },
  { name:"Airtel",  code:"AIR", id:2, color:"#EF4444" },
  { name:"Glo",     code:"GLO", id:3, color:"#10B881" },
  { name:"9mobile", code:"9MB", id:4, color:"#6A00DF" },
];

const DEFAULT_AIRTIME = {
  MTN:  { discount:3 },
  AIR:  { discount:3 },
  GLO:  { discount:2.5 },
  "9MB":{ discount:2.5 },
};

function extractPlans(data) {
  if (!data?.success) return [];
  const d = data.data;
  if (!d) return [];
  if (Array.isArray(d.data_plans) && d.data_plans.length) return d.data_plans;
  if (Array.isArray(d.plans)      && d.plans.length)      return d.plans;
  if (Array.isArray(d)            && d.length)            return d;
  if (Array.isArray(d.data)       && d.data.length)       return d.data;
  return [];
}

export default function AdminPricing() {
  const [activeTab,  setActiveTab]  = useState("data");
  const [network,    setNetwork]    = useState("MTN");

  // plans: { MTN: [{id, data_size, validity, price, sellingPrice},...], ... }
  const [plans,      setPlans]      = useState({});
  const [airtime,    setAirtime]    = useState(DEFAULT_AIRTIME);

  const [pageLoading,setPageLoading]= useState(true);
  const [syncing,    setSyncing]    = useState(false);
  const [syncMsg,    setSyncMsg]    = useState("");
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(null);

  // Load saved selling prices from Firestore on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [airtimeSnap, ...netSnaps] = await Promise.all([
          getDoc(doc(db, "pricing", "airtime")),
          ...NETWORKS.map(n => getDoc(doc(db, "pricing", `data_${n.code}`))),
        ]);
        if (airtimeSnap.exists()) setAirtime(airtimeSnap.data());

        const loaded = {};
        NETWORKS.forEach((n, i) => {
          const snap = netSnaps[i];
          if (snap.exists()) loaded[n.code] = Object.values(snap.data());
        });
        setPlans(loaded);
      } catch (err) { console.error(err); }
      setPageLoading(false);
    };
    load();
  }, []);

  // Fetch live plans from Pointly via PHP proxy
  const syncNetwork = async (netCode) => {
    const net = NETWORKS.find(n => n.code === netCode);
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch(`${PROXY}?action=data-plans&network_id=${net.id}`);
      const data = await res.json();
      const fetched = extractPlans(data);
      if (!fetched.length) { setSyncMsg("No plans returned from API"); setSyncing(false); return; }

      // Merge with existing saved selling prices
      const existing = plans[netCode] || [];
      const merged = fetched.map(p => {
        const saved = existing.find(e => e.id === p.id);
        return {
          id:          p.id,
          data_size:   p.data_size,
          validity:    p.validity,
          apiPrice:    p.price,           // Pointly cost price
          sellingPrice: saved?.sellingPrice ?? Math.ceil(p.price * 1.15), // default 15% markup
        };
      });
      setPlans(prev => ({ ...prev, [netCode]: merged }));
      setSyncMsg(`Synced ${merged.length} plans`);
    } catch (err) {
      setSyncMsg("Sync failed — check proxy on Pointly server");
    }
    setSyncing(false);
  };

  const updateSellingPrice = (planId, val) => {
    setPlans(prev => ({
      ...prev,
      [network]: (prev[network] || []).map(p =>
        p.id === planId ? { ...p, sellingPrice: parseInt(val) || 0 } : p
      )
    }));
  };

  const updateAirtime = (net, val) => {
    setAirtime(prev => ({ ...prev, [net]: { discount: parseFloat(val) || 0 } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saveOps = NETWORKS.map(n => {
        const planList = plans[n.code] || [];
        if (!planList.length) return Promise.resolve();
        const priceMap = {};
        planList.forEach(p => {
          priceMap[p.id] = {
            sellingPrice: p.sellingPrice,
            apiPrice:     p.apiPrice,
            data_size:    p.data_size,
            validity:     p.validity,
          };
        });
        return setDoc(doc(db, "pricing", `data_${n.code}`), priceMap);
      });
      saveOps.push(setDoc(doc(db, "pricing", "airtime"), airtime));
      await Promise.all(saveOps);
      setToast({ msg: "Prices saved! ClassicSwift app updated.", err: false });
    } catch (err) {
      setToast({ msg: "Save failed. Please try again.", err: true });
    }
    setSaving(false);
    setTimeout(() => setToast(null), 3000);
  };

  const currentNet   = NETWORKS.find(n => n.code === network);
  const currentPlans = plans[network] || [];

  if (pageLoading) return (
    <Layout title="Pricing Manager" subtitle="Sync and edit data plan prices">
      <style>{STYLES}</style>
      <div className="ap-loading"><div className="ap-load-spinner"/></div>
    </Layout>
  );

  return (
    <Layout title="Pricing Manager" subtitle="Sync live plans from Pointly, then set your selling prices">
      <style>{STYLES}</style>

      <div className="ap-tabs">
        <button className={`ap-tab${activeTab==="data"?" active":""}`} onClick={()=>setActiveTab("data")}>Data Plans</button>
        <button className={`ap-tab${activeTab==="airtime"?" active":""}`} onClick={()=>setActiveTab("airtime")}>Airtime Discount</button>
      </div>

      {activeTab === "data" && (
        <>
          <div className="ap-net-row">
            {NETWORKS.map(n => (
              <button key={n.code} className="ap-net-btn"
                onClick={() => setNetwork(n.code)}
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

          <div className="ap-sync-bar">
            <button className="ap-sync-btn" onClick={() => syncNetwork(network)} disabled={syncing}>
              {syncing ? <><div className="ap-spin-sm"/>Syncing...</> : <>↻ Sync Plans from Pointly</>}
            </button>
            {syncMsg && (
              <span className={`ap-sync-status ${syncMsg.includes("failed") || syncMsg.includes("No") ? "ap-sync-err" : "ap-sync-ok"}`}>
                {syncMsg}
              </span>
            )}
          </div>

          <div className="ap-plan-count">
            {currentPlans.length ? `${currentPlans.length} plans — set your selling price for each` : "No plans yet — click Sync Plans to load from Pointly"}
          </div>

          {currentPlans.length === 0 ? (
            <div className="ap-empty">Click "Sync Plans from Pointly" to load live plans for {currentNet?.name}</div>
          ) : (
            <div className="ap-plans-grid">
              {currentPlans.map(plan => {
                const margin = plan.sellingPrice - (plan.apiPrice || 0);
                const pct    = plan.apiPrice > 0 ? ((margin / plan.apiPrice) * 100).toFixed(1) : "0.0";
                return (
                  <div className="ap-plan-card" key={plan.id}>
                    <div className="ap-plan-size">{plan.data_size}</div>
                    <div className="ap-plan-validity">{plan.validity}</div>
                    <div className="ap-plan-api-price">Pointly cost: ₦{Number(plan.apiPrice||0).toLocaleString()}</div>
                    <div className="ap-plan-field">
                      <div className="ap-plan-label">Your Selling Price (₦)</div>
                      <input className="ap-plan-input" type="number"
                        value={plan.sellingPrice}
                        onChange={e => updateSellingPrice(plan.id, e.target.value)}/>
                    </div>
                    <div className={`ap-plan-margin${margin < 0 ? " neg" : ""}`}>
                      Margin: ₦{margin} ({pct}%)
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                User pays ₦{(1000 - (airtime[n.code]?.discount||0)*10).toFixed(0)} for ₦1,000 airtime
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ap-save-bar">
        <div className="ap-save-note">Saved to Firestore — ClassicSwift app updates instantly</div>
        <button className="ap-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? <><div className="ap-spinner"/>Saving...</> : "Save All Changes"}
        </button>
      </div>

      {toast && (
        <div className={`ap-toast${toast.err?" err":""}`}>
          <div className="ap-toast-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {toast.err ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <polyline points="20 6 9 17 4 12"/>}
            </svg>
          </div>
          <span className="ap-toast-text">{toast.msg}</span>
        </div>
      )}
    </Layout>
  );
}
