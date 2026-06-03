import { useState, useEffect, useCallback } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";

const POINTLY_API_BASE = "https://www.pointly.com.ng/api/v2";
const POINTLY_API_KEY  = "24c5fdb22b9a94a3f50c95dd4fa59c28a8ed79384ec78b7df933e192ee1b767e";

const STYLES = `
  @keyframes fadeInUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes toastIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

  .ap-tabs { display:flex; gap:8px; margin-bottom:20px; animation:fadeInUp .4s ease both; flex-wrap:wrap; }
  .ap-tab { height:40px; border-radius:10px; border:1px solid #2A2D3A; background:#1A1D27; font-family:'Poppins',sans-serif; font-size:13.5px; font-weight:600; color:#9ca3af; cursor:pointer; padding:0 20px; transition:all .2s; }
  .ap-tab.active { background:#6A00DF; border-color:#6A00DF; color:#fff; }

  .ap-net-row { display:flex; gap:8px; margin-bottom:18px; flex-wrap:wrap; }
  .ap-net-btn { height:38px; border-radius:9px; border:1.5px solid #2A2D3A; background:#1A1D27; font-family:'Poppins',sans-serif; font-size:12.5px; font-weight:700; color:#9ca3af; cursor:pointer; padding:0 14px; display:flex; align-items:center; gap:7px; transition:all .2s; }
  .ap-net-badge { width:22px; height:22px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:8px; font-weight:900; color:#fff; }

  .ap-network-header { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
  .ap-network-badge { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:900; color:#fff; flex-shrink:0; }
  .ap-network-name { font-size:16px; font-weight:800; color:#fff; }

  .ap-sync-bar { display:flex; align-items:center; gap:10px; margin-bottom:16px; padding:12px 14px; background:#1A1D27; border:1px solid #2A2D3A; border-radius:12px; }
  .ap-sync-info { flex:1; font-size:13px; color:#6b7280; }
  .ap-sync-btn { height:36px; background:#6A00DF; border:none; border-radius:9px; font-family:'Poppins',sans-serif; font-size:13px; font-weight:700; color:#fff; cursor:pointer; padding:0 16px; display:flex; align-items:center; gap:7px; flex-shrink:0; transition:opacity .2s; }
  .ap-sync-btn:disabled { opacity:.5; cursor:not-allowed; }
  .ap-sync-spinner { width:13px; height:13px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }

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

  .ap-empty { text-align:center; padding:40px 20px; color:#6b7280; font-size:13px; }

  .ap-airtime-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; animation:fadeInUp .4s .04s ease both; }
  .ap-airtime-card { background:#1A1D27; border:1px solid #2A2D3A; border-radius:14px; padding:16px; }
  .ap-airtime-card:hover { border-color:#6A00DF; }
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
  .ap-toast-icon { width:26px; height:26px; border-radius:50%; background:#10B881; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .ap-toast-text { font-size:14px; font-weight:600; color:#fff; }

  .ap-loading { display:flex; justify-content:center; padding:60px 0; }
  .ap-load-spinner { width:28px; height:28px; border:3px solid #2A2D3A; border-top-color:#6A00DF; border-radius:50%; animation:spin .7s linear infinite; }

  .ap-plan-count { font-size:12px; color:#6b7280; margin-bottom:14px; }
`;

const NETWORKS = [
  { name:"MTN",     code:"MTN", color:"#FFC107" },
  { name:"Airtel",  code:"AIR", color:"#EF4444" },
  { name:"Glo",     code:"GLO", color:"#10B881" },
  { name:"9mobile", code:"9MB", color:"#6A00DF" },
];

const NET_NAME_MAP = { MTN:"MTN", AIR:"Airtel", GLO:"Glo", "9MB":"9mobile" };

const DEFAULT_AIRTIME = {
  MTN:  { discount:3 },
  AIR:  { discount:3 },
  GLO:  { discount:2.5 },
  "9MB":{ discount:2.5 },
};

export default function AdminPricing() {
  const [activeTab,   setActiveTab]   = useState("data");
  const [network,     setNetwork]     = useState("MTN");
  const [dataPlans,   setDataPlans]   = useState({});   // { MTN: [{...plan, sellingPrice}], ... }
  const [airtime,     setAirtime]     = useState(DEFAULT_AIRTIME);
  const [loading,     setLoading]     = useState(true);
  const [syncing,     setSyncing]     = useState(false);
  const [syncMsg,     setSyncMsg]     = useState("");
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState("");

  // Load saved prices from Firestore
  useEffect(() => {
    const load = async () => {
      try {
        const [airtimeSnap] = await Promise.all([
          getDoc(doc(db, "pricing", "airtime")),
        ]);
        if (airtimeSnap.exists()) setAirtime(airtimeSnap.data());
      } catch (err) {
        console.error("Failed to load airtime pricing:", err);
      }

      // Load plans for current network
      await loadPlansForNetwork("MTN");
      setLoading(false);
    };
    load();
  }, []);

  const loadPlansForNetwork = useCallback(async (netCode) => {
    // Check if we already have plans for this network
    setDataPlans(prev => {
      if (prev[netCode]) return prev; // already loaded
      return prev;
    });

    try {
      // Fetch live plans from Pointly
      const networkName = NET_NAME_MAP[netCode];
      const netRes = await fetch(`${POINTLY_API_BASE}/vtu/networks`, {
        headers: { "X-API-Key": POINTLY_API_KEY }
      });
      const netData = await netRes.json();
      const netObj = netData.data?.find(n =>
        n.network?.toLowerCase() === networkName?.toLowerCase()
      );
      if (!netObj) return;

      const plansRes = await fetch(
        `${POINTLY_API_BASE}/vtu/data-plans?network=${encodeURIComponent(netObj.id || netObj.network)}`,
        { headers: { "X-API-Key": POINTLY_API_KEY } }
      );
      const plansData = await plansRes.json();
      if (!plansData.success || !plansData.data?.length) return;

      // Load saved selling prices from Firestore
      const savedSnap = await getDoc(doc(db, "pricing", `data_${netCode}`));
      const savedPrices = savedSnap.exists() ? savedSnap.data() : {};

      const merged = plansData.data.map(p => ({
        ...p,
        costPrice:    Number(p.price || p.amount || 0),
        sellingPrice: savedPrices[p.id]?.sellingPrice
          ?? Math.ceil(Number(p.price || p.amount || 0) * 1.05),
      }));

      setDataPlans(prev => ({ ...prev, [netCode]: merged }));
    } catch (err) {
      console.error("loadPlansForNetwork error:", err);
    }
  }, []);

  const handleNetworkTab = async (code) => {
    setNetwork(code);
    if (!dataPlans[code]) {
      setSyncMsg("Loading plans...");
      await loadPlansForNetwork(code);
      setSyncMsg("");
    }
  };

  const handleSyncNetwork = async () => {
    setSyncing(true);
    setSyncMsg("Fetching live plans from Pointly...");
    // Force reload by clearing the network's plans
    setDataPlans(prev => { const n = {...prev}; delete n[network]; return n; });
    await loadPlansForNetwork(network);
    setSyncMsg(`Synced ${dataPlans[network]?.length || 0} plans`);
    setTimeout(() => setSyncMsg(""), 3000);
    setSyncing(false);
  };

  const updateSellingPrice = (netCode, planId, val) => {
    setDataPlans(prev => ({
      ...prev,
      [netCode]: prev[netCode].map(p =>
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
      // Save each network's selling prices as { [planId]: { sellingPrice } }
      const saveOps = Object.entries(dataPlans).map(([netCode, plans]) => {
        const priceMap = {};
        plans.forEach(p => { priceMap[p.id] = { sellingPrice: p.sellingPrice, size: p.size || p.name, validity: p.validity || p.duration || "" }; });
        return setDoc(doc(db, "pricing", `data_${netCode}`), priceMap);
      });
      saveOps.push(setDoc(doc(db, "pricing", "airtime"), airtime));
      await Promise.all(saveOps);
      setToast("Prices saved! ClassicSwift app updated.");
      setTimeout(() => setToast(""), 3000);
    } catch (err) {
      console.error(err);
      setToast("Save failed. Please try again.");
      setTimeout(() => setToast(""), 3000);
    }
    setSaving(false);
  };

  const currentNet = NETWORKS.find(n => n.code === network);
  const currentPlans = dataPlans[network] || [];

  if (loading) {
    return (
      <Layout title="Pricing Manager" subtitle="Edit airtime discounts and data plan prices">
        <style>{STYLES}</style>
        <div className="ap-loading"><div className="ap-load-spinner"/></div>
      </Layout>
    );
  }

  return (
    <Layout title="Pricing Manager" subtitle="Edit airtime discounts and data plan prices">
      <style>{STYLES}</style>

      <div className="ap-tabs">
        <button className={`ap-tab${activeTab==="data"?" active":""}`} onClick={()=>setActiveTab("data")}>Data Plans</button>
        <button className={`ap-tab${activeTab==="airtime"?" active":""}`} onClick={()=>setActiveTab("airtime")}>Airtime Discount</button>
      </div>

      {activeTab === "data" && (
        <>
          {/* Network selector */}
          <div className="ap-net-row">
            {NETWORKS.map(n => (
              <button key={n.code}
                className="ap-net-btn"
                onClick={() => handleNetworkTab(n.code)}
                style={{
                  borderColor: network===n.code ? n.color : "#2A2D3A",
                  background:  network===n.code ? `${n.color}22` : "#1A1D27",
                  color:       network===n.code ? n.color : "#9ca3af",
                }}>
                <div className="ap-net-badge" style={{background:n.color}}>{n.code}</div>
                {n.name}
                {dataPlans[n.code] && <span style={{fontSize:11,opacity:.6}}>({dataPlans[n.code].length})</span>}
              </button>
            ))}
          </div>

          {/* Network header + sync */}
          <div className="ap-network-header">
            <div className="ap-network-badge" style={{background:currentNet?.color}}>{network}</div>
            <div className="ap-network-name">{currentNet?.name} Data Plans</div>
          </div>

          <div className="ap-sync-bar">
            <div className="ap-sync-info">
              {syncMsg || (currentPlans.length > 0
                ? `${currentPlans.length} plans loaded from Pointly API`
                : "Click Sync to load live plans from Pointly")}
            </div>
            <button className="ap-sync-btn" onClick={handleSyncNetwork} disabled={syncing}>
              {syncing ? <><div className="ap-sync-spinner"/>Syncing...</> : "↻ Sync Plans"}
            </button>
          </div>

          {currentPlans.length === 0 ? (
            <div className="ap-empty">No plans loaded yet — click Sync Plans above</div>
          ) : (
            <>
              <div className="ap-plan-count">Showing {currentPlans.length} plans — edit selling price for each</div>
              <div className="ap-plans-grid">
                {currentPlans.map(plan => {
                  const cost   = plan.costPrice || 0;
                  const sell   = plan.sellingPrice || 0;
                  const margin = sell - cost;
                  const pct    = cost > 0 ? ((margin / cost) * 100).toFixed(1) : "0.0";
                  return (
                    <div className="ap-plan-card" key={plan.id}>
                      <div className="ap-plan-size">{plan.size || plan.name}</div>
                      <div className="ap-plan-validity">{plan.validity || plan.duration || "—"}</div>
                      <div className="ap-plan-field">
                        <div className="ap-plan-label">Cost (Pointly Price ₦)</div>
                        <input className="ap-plan-input" type="number" readOnly
                          value={cost} style={{color:"#6b7280",cursor:"not-allowed"}}/>
                      </div>
                      <div className="ap-plan-field">
                        <div className="ap-plan-label">Your Selling Price (₦)</div>
                        <input className="ap-plan-input" type="number"
                          value={sell}
                          onChange={e => updateSellingPrice(network, plan.id, e.target.value)}/>
                      </div>
                      <div className={`ap-plan-margin${margin < 0 ? " neg" : ""}`}>
                        Margin: ₦{margin} ({pct}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
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
        <div className="ap-save-note">Changes saved to Firestore — ClassicSwift app updates instantly</div>
        <button className="ap-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? <><div className="ap-spinner"/>Saving...</> : "Save All Changes"}
        </button>
      </div>

      {toast && (
        <div className="ap-toast">
          <div className="ap-toast-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span className="ap-toast-text">{toast}</span>
        </div>
      )}
    </Layout>
  );
}
