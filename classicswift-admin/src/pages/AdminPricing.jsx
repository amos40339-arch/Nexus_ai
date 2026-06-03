import { useState, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";

const STYLES = `
  @keyframes fadeInUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin { to{transform:rotate(360deg)} }
  @keyframes toastIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

  .ap-tabs { display:flex; gap:8px; margin-bottom:20px; animation:fadeInUp .4s ease both; }
  .ap-tab { height:40px; border-radius:10px; border:1px solid #2A2D3A; background:#1A1D27; font-family:'Poppins',sans-serif; font-size:13.5px; font-weight:600; color:#9ca3af; cursor:pointer; padding:0 20px; transition:all .2s; }
  .ap-tab.active { background:#6A00DF; border-color:#6A00DF; color:#fff; }

  .ap-network-section { margin-bottom:20px; animation:fadeInUp .4s .04s ease both; }
  .ap-network-header { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
  .ap-network-badge { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:900; color:#fff; flex-shrink:0; }
  .ap-network-name { font-size:16px; font-weight:800; color:#fff; }

  .ap-plans-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
  .ap-plan-card { background:#1A1D27; border:1px solid #2A2D3A; border-radius:14px; padding:16px; transition:border-color .2s; }
  .ap-plan-card:hover { border-color:#6A00DF; }
  .ap-plan-size { font-size:15px; font-weight:800; color:#fff; margin-bottom:4px; }
  .ap-plan-validity { font-size:12px; color:#6b7280; margin-bottom:12px; }
  .ap-plan-field { margin-bottom:8px; }
  .ap-plan-label { font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; margin-bottom:5px; }
  .ap-plan-input { width:100%; height:38px; background:#0F1117; border:1px solid #2A2D3A; border-radius:9px; padding:0 10px; font-family:'Poppins',sans-serif; font-size:14px; font-weight:600; color:#fff; outline:none; transition:border-color .2s; }
  .ap-plan-input:focus { border-color:#6A00DF; }
  .ap-plan-input.readonly { color:#6b7280; cursor:not-allowed; }
  .ap-plan-margin { font-size:11.5px; color:#10B881; font-weight:600; margin-top:6px; }

  .ap-airtime-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; animation:fadeInUp .4s .04s ease both; }
  .ap-airtime-card { background:#1A1D27; border:1px solid #2A2D3A; border-radius:14px; padding:16px; }
  .ap-airtime-card:hover { border-color:#6A00DF; }
  .ap-airtime-network { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
  .ap-airtime-badge { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:900; color:#fff; flex-shrink:0; }
  .ap-airtime-name { font-size:15px; font-weight:800; color:#fff; }

  .ap-save-bar { position:sticky; bottom:0; background:#0F1117; border-top:1px solid #2A2D3A; padding:16px 0 0; margin-top:24px; display:flex; align-items:center; justify-content:space-between; animation:fadeInUp .4s .08s ease both; }
  .ap-save-note { font-size:13px; color:#6b7280; }
  .ap-save-btn { height:44px; background:linear-gradient(135deg,#6A00DF,#8B3DFF); border:none; border-radius:12px; font-family:'Poppins',sans-serif; font-size:14px; font-weight:700; color:#fff; cursor:pointer; padding:0 28px; display:flex; align-items:center; gap:8px; box-shadow:0 6px 20px rgba(106,0,223,.3); transition:transform .15s; }
  .ap-save-btn:active { transform:scale(.96); }
  .ap-save-btn:disabled { opacity:.5; cursor:not-allowed; }
  .ap-spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }

  .ap-toast { position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:#1A1D27; border:1px solid #10B881; border-radius:14px; padding:12px 20px; display:flex; align-items:center; gap:10px; z-index:300; box-shadow:0 8px 24px rgba(0,0,0,.4); animation:toastIn .3s ease both; white-space:nowrap; }
  .ap-toast-icon { width:26px; height:26px; border-radius:50%; background:#10B881; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .ap-toast-text { font-size:14px; font-weight:600; color:#fff; }

  .ap-loading { display:flex; justify-content:center; padding:60px 0; }
  .ap-load-spinner { width:28px; height:28px; border:3px solid #2A2D3A; border-top-color:#6A00DF; border-radius:50%; animation:spin .7s linear infinite; }
`;

const NETWORKS = [
  { name:"MTN",    code:"MTN", color:"#FFC107" },
  { name:"Airtel", code:"AIR", color:"#EF4444" },
  { name:"Glo",    code:"GLO", color:"#10B881" },
  { name:"9mobile",code:"9MB", color:"#6A00DF" },
];

const DEFAULT_DATA_PLANS = {
  MTN: [
    { size:"100MB", validity:"Daily",   cost:95,  price:100 },
    { size:"500MB", validity:"Weekly",  cost:280, price:300 },
    { size:"1GB",   validity:"Monthly", cost:270, price:300 },
    { size:"2GB",   validity:"Monthly", cost:480, price:500 },
    { size:"5GB",   validity:"Monthly", cost:1150,price:1200 },
    { size:"10GB",  validity:"Monthly", cost:2200,price:2500 },
  ],
  AIR: [
    { size:"100MB", validity:"Daily",   cost:90,  price:100 },
    { size:"500MB", validity:"Weekly",  cost:260, price:300 },
    { size:"1GB",   validity:"Monthly", cost:260, price:300 },
    { size:"2GB",   validity:"Monthly", cost:460, price:500 },
    { size:"5GB",   validity:"Monthly", cost:1100,price:1200 },
    { size:"10GB",  validity:"Monthly", cost:2100,price:2500 },
  ],
  GLO: [
    { size:"100MB", validity:"Daily",   cost:85,  price:100 },
    { size:"500MB", validity:"Weekly",  cost:250, price:300 },
    { size:"1GB",   validity:"Monthly", cost:250, price:300 },
    { size:"2GB",   validity:"Monthly", cost:450, price:500 },
    { size:"5GB",   validity:"Monthly", cost:1050,price:1200 },
    { size:"10GB",  validity:"Monthly", cost:2000,price:2500 },
  ],
  "9MB": [
    { size:"100MB", validity:"Daily",   cost:88,  price:100 },
    { size:"500MB", validity:"Weekly",  cost:255, price:300 },
    { size:"1GB",   validity:"Monthly", cost:255, price:300 },
    { size:"2GB",   validity:"Monthly", cost:455, price:500 },
    { size:"5GB",   validity:"Monthly", cost:1080,price:1200 },
    { size:"10GB",  validity:"Monthly", cost:2050,price:2500 },
  ],
};

const DEFAULT_AIRTIME = {
  MTN:  { discount:3 },
  AIR:  { discount:3 },
  GLO:  { discount:2.5 },
  "9MB":{ discount:2.5 },
};

export default function AdminPricing() {
  const [activeTab,  setActiveTab]  = useState("data");
  const [network,    setNetwork]    = useState("MTN");
  const [dataPlans,  setDataPlans]  = useState(DEFAULT_DATA_PLANS);
  const [airtime,    setAirtime]    = useState(DEFAULT_AIRTIME);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState(false);

  // Load live prices from Firestore on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [dataSnap, airtimeSnap] = await Promise.all([
          getDoc(doc(db, "pricing", "data_plans")),
          getDoc(doc(db, "pricing", "airtime")),
        ]);
        if (dataSnap.exists())    setDataPlans(dataSnap.data());
        if (airtimeSnap.exists()) setAirtime(airtimeSnap.data());
      } catch (err) {
        console.error("Failed to load pricing:", err);
      }
      setLoading(false);
    };
    load();
  }, []);

  const updateDataPrice = (net, idx, field, val) => {
    setDataPlans(prev => ({
      ...prev,
      [net]: prev[net].map((p,i) => i===idx ? {...p, [field]: parseInt(val)||0 } : p)
    }));
  };

  const updateAirtime = (net, val) => {
    setAirtime(prev => ({ ...prev, [net]: { discount: parseFloat(val)||0 } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "pricing", "data_plans"), dataPlans);
      await setDoc(doc(db, "pricing", "airtime"),    airtime);
      setToast(true);
      setTimeout(() => setToast(false), 3000);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const currentNet = NETWORKS.find(n=>n.code===network);

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
          <div style={{display:"flex",gap:10,marginBottom:20}}>
            {NETWORKS.map(n => (
              <button key={n.code}
                onClick={()=>setNetwork(n.code)}
                style={{
                  height:40, borderRadius:10, border:`2px solid ${network===n.code?n.color:"#2A2D3A"}`,
                  background: network===n.code?`${n.color}20`:"#1A1D27",
                  fontFamily:"Poppins,sans-serif", fontSize:13, fontWeight:700,
                  color: network===n.code?n.color:"#9ca3af", cursor:"pointer",
                  padding:"0 16px", display:"flex", alignItems:"center", gap:8, transition:"all .2s"
                }}>
                <div style={{width:24,height:24,borderRadius:7,background:n.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"#fff"}}>
                  {n.code}
                </div>
                {n.name}
              </button>
            ))}
          </div>

          <div className="ap-network-section">
            <div className="ap-network-header">
              <div className="ap-network-badge" style={{background:currentNet?.color}}>{network}</div>
              <div className="ap-network-name">{currentNet?.name} Data Plans</div>
            </div>
            <div className="ap-plans-grid">
              {(dataPlans[network] || []).map((plan,i) => {
                const margin    = plan.price - plan.cost;
                const marginPct = plan.cost > 0 ? ((margin/plan.cost)*100).toFixed(1) : "0.0";
                return (
                  <div className="ap-plan-card" key={i}>
                    <div className="ap-plan-size">{plan.size}</div>
                    <div className="ap-plan-validity">{plan.validity}</div>
                    <div className="ap-plan-field">
                      <div className="ap-plan-label">Cost Price (₦)</div>
                      <input className="ap-plan-input" type="number"
                        value={plan.cost}
                        onChange={e=>updateDataPrice(network,i,"cost",e.target.value)}/>
                    </div>
                    <div className="ap-plan-field">
                      <div className="ap-plan-label">Selling Price (₦)</div>
                      <input className="ap-plan-input" type="number"
                        value={plan.price}
                        onChange={e=>updateDataPrice(network,i,"price",e.target.value)}/>
                    </div>
                    <div className="ap-plan-margin">
                      Margin: ₦{margin} ({marginPct}%)
                    </div>
                  </div>
                );
              })}
            </div>
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
                <div className="ap-plan-label">Discount % (what you give users)</div>
                <input className="ap-plan-input" type="number" step="0.5"
                  value={airtime[n.code]?.discount || 0}
                  onChange={e=>updateAirtime(n.code,e.target.value)}/>
              </div>
              <div className="ap-plan-margin" style={{marginTop:8}}>
                User buys ₦1,000 airtime → pays ₦{(1000 - (airtime[n.code]?.discount||0)*10).toFixed(0)} → you earn ₦{((airtime[n.code]?.discount||0)*10).toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ap-save-bar">
        <div className="ap-save-note">
          Changes saved to Firestore — ClassicSwift app updates instantly
        </div>
        <button className="ap-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? <><div className="ap-spinner"/>Saving...</> : "Save All Changes"}
        </button>
      </div>

      {toast && (
        <div className="ap-toast">
          <div className="ap-toast-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span className="ap-toast-text">Prices saved successfully! App updated.</span>
        </div>
      )}

    </Layout>
  );
}
