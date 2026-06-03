import { useState, useEffect } from "react";
import WhatsAppFloat from "../components/WhatsAppFloat";
import { auth } from "../firebase";
import { getUserTransactions } from "../services/transactionService";
import { useNavigate } from "react-router-dom";

const POINTLY_API_BASE = "https://www.pointly.com.ng/api/v2";
const POINTLY_API_KEY  = "24c5fdb22b9a94a3f50c95dd4fa59c28a8ed79384ec78b7df933e192ee1b767e";

const NET_CONFIG = {
  mtn:       { bg:"#FFC107", color:"#111",    text:"MTN"    },
  airtel:    { bg:"#EF4444", color:"#fff",    text:"Airtel" },
  glo:       { bg:"#10B881", color:"#fff",    text:"Glo"    },
  "9mobile": { bg:"#111B27", color:"#FFC107", text:"9mobile"},
  etisalat:  { bg:"#111B27", color:"#FFC107", text:"9mobile"},
  "9":       { bg:"#111B27", color:"#FFC107", text:"9mobile"},
};

function getNetConfig(networkName) {
  const key = networkName?.toLowerCase().replace(/\s/g, "").replace(/-/g, "");
  return NET_CONFIG[key] || { bg:"#6A00DF", color:"#fff", text: networkName?.slice(0,6) || "N" };
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
  @keyframes spin { to { transform:rotate(360deg); } }

  .dt-root { position:fixed; inset:0; background:#f4f3f8; font-family:'Poppins',sans-serif; display:flex; flex-direction:column; overflow:hidden; }
  .dt-scroll { flex:1 1 0; min-height:0; overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; padding-bottom:180px; }

  .dt-topbar { display:flex; align-items:center; justify-content:space-between; padding:52px 20px 16px; background:#f4f3f8; }
  .dt-back { width:40px; height:40px; border-radius:12px; background:#fff; border:1.5px solid #E8E4F0; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 1px 6px rgba(0,0,0,.06); }
  .dt-title { font-size:17px; font-weight:800; color:#111B27; }
  .dt-hist { display:flex; align-items:center; gap:5px; background:none; border:none; font-family:'Poppins',sans-serif; font-size:13px; font-weight:600; color:#6A00DF; cursor:pointer; }

  .dt-section { padding:0 20px; margin-top:20px; animation:fadeInUp .4s ease both; }
  .dt-label { font-size:15px; font-weight:700; color:#111B27; margin-bottom:12px; }

  .dt-networks { display:flex; gap:10px; flex-wrap:wrap; }
  .dt-net-item { flex:1; min-width:60px; display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; }
  .dt-net-logo { width:64px; height:64px; border-radius:16px; display:flex; align-items:center; justify-content:center; border:2px solid #E8E4F0; position:relative; transition:border-color .2s, box-shadow .2s; overflow:hidden; }
  .dt-net-logo.active { border-color:#6A00DF; box-shadow:0 0 0 3px rgba(106,0,223,.12); }
  .dt-net-check { position:absolute; top:-1px; right:-1px; width:20px; height:20px; background:#6A00DF; border-radius:50%; display:flex; align-items:center; justify-content:center; }
  .dt-net-name { font-size:12px; font-weight:500; color:#374151; text-align:center; }

  .dt-input-wrap { background:#fff; border:1.5px solid #E8E4F0; border-radius:14px; display:flex; align-items:center; padding:0 16px; transition:border-color .2s; }
  .dt-input-wrap:focus-within { border-color:#6A00DF; }
  .dt-input-wrap.error { border-color:#EF4444; animation:shake .4s ease; }
  .dt-input-icon { color:#6A00DF; display:flex; align-items:center; margin-right:10px; flex-shrink:0; }
  .dt-input { flex:1; height:54px; border:none; outline:none; font-family:'Poppins',sans-serif; font-size:15px; color:#111B27; background:transparent; }
  .dt-input::placeholder { color:#C4BDD6; }

  .dt-plans-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .dt-plan-card { background:#fff; border:1.5px solid #E8E4F0; border-radius:14px; padding:14px; cursor:pointer; transition:all .2s; }
  .dt-plan-card.active { border-color:#6A00DF; background:#F0ECF9; }
  .dt-plan-size { font-size:17px; font-weight:800; color:#111B27; }
  .dt-plan-card.active .dt-plan-size { color:#6A00DF; }
  .dt-plan-validity { font-size:11px; font-weight:500; color:#9ca3af; margin-top:2px; }
  .dt-plan-price { font-size:14px; font-weight:700; color:#6A00DF; margin-top:6px; }

  .dt-plans-loading { display:flex; justify-content:center; padding:24px; }
  .dt-plans-empty { text-align:center; padding:24px; color:#9ca3af; font-size:13px; }

  .dt-bottom { position:fixed; bottom:74px; left:0; right:0; padding:10px 20px 12px; background:#f4f3f8; border-top:1.5px solid #EDE8F8; }
  .dt-buy-btn { width:100%; height:58px; background:linear-gradient(135deg,#6A00DF,#8B3DFF); border:none; border-radius:16px; font-family:'Poppins',sans-serif; font-size:16px; font-weight:800; color:#fff; cursor:pointer; box-shadow:0 8px 24px rgba(106,0,223,.3); transition:transform .15s, opacity .15s; }
  .dt-buy-btn:active { transform:scale(.97); }
  .dt-buy-btn:disabled { opacity:.5; cursor:not-allowed; }

  .dt-nav { position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1.5px solid #EDE8F8; display:flex; align-items:center; padding:10px 0 24px; box-shadow:0 -4px 20px rgba(0,0,0,.07); z-index:100; }
  .dt-nav-item { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; cursor:pointer; background:none; border:none; font-family:'Poppins',sans-serif; }
  .dt-nav-label { font-size:11px; font-weight:500; color:#9ca3af; }
  .dt-nav-item.active .dt-nav-label { color:#6A00DF; font-weight:700; }
  .dt-error-msg { font-size:12px; color:#EF4444; font-weight:500; margin-top:6px; }
  .dt-spinner { width:18px; height:18px; border:2.5px solid rgba(106,0,223,.3); border-top-color:#6A00DF; border-radius:50%; animation:spin .7s linear infinite; margin:0 auto; }
  .dt-net-error { font-size:13px; color:#EF4444; text-align:center; padding:12px 0; }
`;

const BackIcon     = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>);
const HistIcon     = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>);
const PhoneIcon    = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.74a16 16 0 0 0 6.29 6.29l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>);
const CheckSmall   = () => (<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);

const HomeNavIcon    = ({active}) => (<svg width="22" height="22" viewBox="0 0 24 24" fill={active?"#6A00DF":"none"} stroke={active?"#6A00DF":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>);
const AirtimeNavIcon = ({active}) => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6A00DF":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>);
const DataNavIcon    = ({active}) => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6A00DF":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M10.54 16.1a6 6 0 0 1 2.92 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>);
const HistNavIcon    = ({active}) => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6A00DF":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>);
const ProfileNavIcon = ({active}) => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6A00DF":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);

const NAV = [
  { label:"Home",    Icon:HomeNavIcon,    path:"/dashboard" },
  { label:"Airtime", Icon:AirtimeNavIcon, path:"/airtime"   },
  { label:"Data",    Icon:DataNavIcon,    path:"/data"      },
  { label:"History", Icon:HistNavIcon,    path:"/history"   },
  { label:"Profile", Icon:ProfileNavIcon, path:"/profile"   },
];

export default function Data() {
  const navigate = useNavigate();

  const [networks,    setNetworks]    = useState([]);
  const [netsLoading, setNetsLoading] = useState(true);
  const [netsError,   setNetsError]   = useState("");

  const [network,     setNetwork]     = useState(null);
  const [plans,       setPlans]       = useState([]);
  const [plansLoading,setPlansLoading]= useState(false);
  const [plansError,  setPlansError]  = useState("");

  const [phone,       setPhone]       = useState("");
  const [plan,        setPlan]        = useState(null);
  const [errors,      setErrors]      = useState({});

  useEffect(() => {
    fetch(`${POINTLY_API_BASE}/vtu/networks`, {
      headers: { "X-API-Key": POINTLY_API_KEY }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.length) {
          setNetworks(data.data);
          setNetwork(data.data[0]);
        } else {
          setNetsError("Could not load networks.");
        }
      })
      .catch(() => setNetsError("Network error. Please try again."))
      .finally(() => setNetsLoading(false));
  }, []);

  useEffect(() => {
    if (!network) return;
    setPlans([]);
    setPlan(null);
    setPlansError("");
    setPlansLoading(true);
    fetch(`${POINTLY_API_BASE}/vtu/data-plans?network=${encodeURIComponent(network.id || network.network)}`, {
      headers: { "X-API-Key": POINTLY_API_KEY }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.length) {
          setPlans(data.data);
        } else {
          setPlansError("No data plans available for this network.");
        }
      })
      .catch(() => setPlansError("Failed to load plans. Please try again."))
      .finally(() => setPlansLoading(false));
  }, [network]);

  const validate = () => {
    const e = {};
    if (!phone || phone.length < 10) e.phone = "Enter a valid phone number";
    if (!plan)    e.plan    = "Select a data plan";
    if (!network) e.network = "Select a network";
    return e;
  };

  const handleBuy = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const cfg = getNetConfig(network.network);
    navigate("/data/confirm", {
      state: {
        network: { ...cfg, id: network.id, network_id: network.id, name: network.network },
        phone,
        plan,
      }
    });
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="dt-root">
        <div className="dt-scroll">
          <div className="dt-topbar">
            <button className="dt-back" onClick={() => navigate("/dashboard")}><BackIcon /></button>
            <span className="dt-title">Buy Data</span>
            <button className="dt-hist" onClick={() => navigate("/history")}><HistIcon /> History</button>
          </div>

          <div className="dt-section">
            <div className="dt-label">Select Network</div>
            {netsLoading ? (
              <div className="dt-plans-loading"><div className="dt-spinner"/></div>
            ) : netsError ? (
              <div className="dt-net-error">{netsError}</div>
            ) : (
              <div className="dt-networks">
                {networks.map(n => {
                  const cfg = getNetConfig(n.network);
                  const isActive = network?.id === n.id;
                  return (
                    <div className="dt-net-item" key={n.id} onClick={() => setNetwork(n)}>
                      <div className={`dt-net-logo${isActive ? " active" : ""}`} style={{background: cfg.bg}}>
                        <span style={{fontSize: cfg.text.length > 3 ? 10 : 14, fontWeight:900, color:cfg.color}}>{cfg.text}</span>
                        {isActive && <div className="dt-net-check"><CheckSmall /></div>}
                      </div>
                      <span className="dt-net-name">{n.network}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="dt-section">
            <div className="dt-label">Phone Number</div>
            <div className={`dt-input-wrap${errors.phone ? " error" : ""}`}>
              <span className="dt-input-icon"><PhoneIcon /></span>
              <input className="dt-input" type="tel" inputMode="numeric" placeholder="Enter 10 or 11 digit phone number"
                value={phone} onChange={e => { setPhone(e.target.value); setErrors(er => ({...er, phone:""})); }}/>
            </div>
            {errors.phone && <div className="dt-error-msg">{errors.phone}</div>}
          </div>

          <div className="dt-section">
            <div className="dt-label">Select Plan</div>
            {plansLoading ? (
              <div className="dt-plans-loading"><div className="dt-spinner"/></div>
            ) : plansError ? (
              <div className="dt-plans-empty">{plansError}</div>
            ) : plans.length === 0 ? (
              <div className="dt-plans-empty">Select a network to see plans</div>
            ) : (
              <div className="dt-plans-grid">
                {plans.map(p => (
                  <div key={p.id} className={`dt-plan-card${plan?.id === p.id ? " active" : ""}`}
                    onClick={() => { setPlan(p); setErrors(e => ({...e, plan:""})); }}>
                    <div className="dt-plan-size">{p.size || p.name}</div>
                    <div className="dt-plan-validity">{p.validity || p.duration || ""}</div>
                    <div className="dt-plan-price">₦{Number(p.price || p.amount || 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
            {errors.plan && <div className="dt-error-msg" style={{marginTop:8}}>{errors.plan}</div>}
          </div>
        </div>

        <div className="dt-bottom">
          <button className="dt-buy-btn" onClick={handleBuy} disabled={netsLoading || !network || !plan}>
            {plan ? `Buy ${plan.size || plan.name} for ₦${Number(plan.price || plan.amount || 0).toLocaleString()}` : "Buy Data"}
          </button>
        </div>

        <nav className="dt-nav">
          {NAV.map(({ label, Icon, path }) => (
            <button key={label} className={`dt-nav-item${path === "/data" ? " active" : ""}`} onClick={() => navigate(path)}>
              <div style={{width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center'}}>
                <Icon active={path === "/data"} />
              </div>
              <span className="dt-nav-label">{label}</span>
            </button>
          ))}
        </nav>
      </div>
      <WhatsAppFloat />
    </>
  );
}
