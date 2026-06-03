import { useState, useEffect } from "react";
import WhatsAppFloat from "../components/WhatsAppFloat";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

const NETWORKS = [
  { id:"MTN",  network:"MTN",     code:"MTN",  bg:"#FFC107", color:"#111",    text:"MTN"     },
  { id:"AIR",  network:"Airtel",  code:"AIR",  bg:"#EF4444", color:"#fff",    text:"Airtel"  },
  { id:"GLO",  network:"Glo",     code:"GLO",  bg:"#10B881", color:"#fff",    text:"Glo"     },
  { id:"9MB",  network:"9mobile", code:"9MB",  bg:"#111B27", color:"#FFC107", text:"9mobile" },
];

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

// Default plans used when Firestore has no saved pricing yet
const DEFAULT_PLANS = {
  MTN: [
    { id:"mtn-50mb",  size:"50MB",  validity:"1 Day",   sellingPrice:60   },
    { id:"mtn-100mb", size:"100MB", validity:"1 Day",   sellingPrice:110  },
    { id:"mtn-200mb", size:"200MB", validity:"3 Days",  sellingPrice:185  },
    { id:"mtn-500mb", size:"500MB", validity:"7 Days",  sellingPrice:320  },
    { id:"mtn-1gb",   size:"1GB",   validity:"30 Days", sellingPrice:310  },
    { id:"mtn-2gb",   size:"2GB",   validity:"30 Days", sellingPrice:550  },
    { id:"mtn-3gb",   size:"3GB",   validity:"30 Days", sellingPrice:800  },
    { id:"mtn-5gb",   size:"5GB",   validity:"30 Days", sellingPrice:1300 },
    { id:"mtn-10gb",  size:"10GB",  validity:"30 Days", sellingPrice:2500 },
    { id:"mtn-20gb",  size:"20GB",  validity:"30 Days", sellingPrice:4300 },
  ],
  AIR: [
    { id:"air-100mb", size:"100MB", validity:"1 Day",   sellingPrice:105  },
    { id:"air-200mb", size:"200MB", validity:"3 Days",  sellingPrice:175  },
    { id:"air-500mb", size:"500MB", validity:"7 Days",  sellingPrice:300  },
    { id:"air-1gb",   size:"1GB",   validity:"30 Days", sellingPrice:300  },
    { id:"air-2gb",   size:"2GB",   validity:"30 Days", sellingPrice:530  },
    { id:"air-3gb",   size:"3GB",   validity:"30 Days", sellingPrice:780  },
    { id:"air-5gb",   size:"5GB",   validity:"30 Days", sellingPrice:1250 },
    { id:"air-10gb",  size:"10GB",  validity:"30 Days", sellingPrice:2400 },
    { id:"air-20gb",  size:"20GB",  validity:"30 Days", sellingPrice:4000 },
  ],
  GLO: [
    { id:"glo-100mb", size:"100MB", validity:"1 Day",   sellingPrice:100  },
    { id:"glo-200mb", size:"200MB", validity:"3 Days",  sellingPrice:170  },
    { id:"glo-500mb", size:"500MB", validity:"7 Days",  sellingPrice:290  },
    { id:"glo-1gb",   size:"1GB",   validity:"30 Days", sellingPrice:290  },
    { id:"glo-2gb",   size:"2GB",   validity:"30 Days", sellingPrice:520  },
    { id:"glo-3gb",   size:"3GB",   validity:"30 Days", sellingPrice:750  },
    { id:"glo-5gb",   size:"5GB",   validity:"30 Days", sellingPrice:1200 },
    { id:"glo-10gb",  size:"10GB",  validity:"30 Days", sellingPrice:2300 },
    { id:"glo-20gb",  size:"20GB",  validity:"30 Days", sellingPrice:3800 },
  ],
  "9MB": [
    { id:"9mb-100mb", size:"100MB", validity:"1 Day",   sellingPrice:102  },
    { id:"9mb-200mb", size:"200MB", validity:"3 Days",  sellingPrice:172  },
    { id:"9mb-500mb", size:"500MB", validity:"7 Days",  sellingPrice:295  },
    { id:"9mb-1gb",   size:"1GB",   validity:"30 Days", sellingPrice:295  },
    { id:"9mb-2gb",   size:"2GB",   validity:"30 Days", sellingPrice:525  },
    { id:"9mb-3gb",   size:"3GB",   validity:"30 Days", sellingPrice:760  },
    { id:"9mb-5gb",   size:"5GB",   validity:"30 Days", sellingPrice:1240 },
    { id:"9mb-10gb",  size:"10GB",  validity:"30 Days", sellingPrice:2350 },
    { id:"9mb-20gb",  size:"20GB",  validity:"30 Days", sellingPrice:3900 },
  ],
};

export default function Data() {
  const navigate = useNavigate();

  const [network,      setNetwork]      = useState(NETWORKS[0]);
  const [allPlans,     setAllPlans]     = useState(DEFAULT_PLANS);
  const [plansLoading, setPlansLoading] = useState(true);

  const [phone,  setPhone]  = useState("");
  const [plan,   setPlan]   = useState(null);
  const [errors, setErrors] = useState({});

  // Load pricing from Firestore (set by admin in AdminPricing)
  useEffect(() => {
    const load = async () => {
      try {
        const snaps = await Promise.all(
          NETWORKS.map(n => getDoc(doc(db, "pricing", `data_${n.code}`)))
        );
        const loaded = {};
        NETWORKS.forEach((n, i) => {
          const snap = snaps[i];
          if (snap.exists()) {
            const saved = snap.data();
            loaded[n.code] = DEFAULT_PLANS[n.code].map(p => ({
              ...p,
              sellingPrice: saved[p.id]?.sellingPrice ?? p.sellingPrice,
            }));
          }
        });
        if (Object.keys(loaded).length) {
          setAllPlans(prev => ({ ...prev, ...loaded }));
        }
      } catch (err) {
        console.error("Failed to load pricing:", err);
      }
      setPlansLoading(false);
    };
    load();
  }, []);

  // Reset plan when network changes
  useEffect(() => { setPlan(null); }, [network]);

  const plans = allPlans[network.code] || [];

  const validate = () => {
    const e = {};
    if (!phone || phone.replace(/\D/g,"").length < 10) e.phone = "Enter a valid phone number";
    if (!plan) e.plan = "Select a data plan";
    return e;
  };

  const handleBuy = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    navigate("/data/confirm", {
      state: {
        network: { id: network.id, network_id: network.id, name: network.network, bg: network.bg, color: network.color, text: network.text },
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
            <div className="dt-networks">
              {NETWORKS.map(n => {
                const isActive = network.id === n.id;
                return (
                  <div className="dt-net-item" key={n.id} onClick={() => setNetwork(n)}>
                    <div className={`dt-net-logo${isActive ? " active" : ""}`} style={{background: n.bg}}>
                      <span style={{fontSize: n.text.length > 3 ? 10 : 14, fontWeight:900, color:n.color}}>{n.text}</span>
                      {isActive && <div className="dt-net-check"><CheckSmall /></div>}
                    </div>
                    <span className="dt-net-name">{n.network}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dt-section">
            <div className="dt-label">Phone Number</div>
            <div className={`dt-input-wrap${errors.phone ? " error" : ""}`}>
              <span className="dt-input-icon"><PhoneIcon /></span>
              <input className="dt-input" type="tel" inputMode="numeric"
                placeholder="Enter 10 or 11 digit phone number"
                value={phone}
                onChange={e => { setPhone(e.target.value); setErrors(er => ({...er, phone:""})); }}/>
            </div>
            {errors.phone && <div className="dt-error-msg">{errors.phone}</div>}
          </div>

          <div className="dt-section">
            <div className="dt-label">Data Plan</div>
            {plansLoading ? (
              <div className="dt-plans-loading"><div className="dt-spinner"/></div>
            ) : (
              <div className="dt-plans-grid">
                {plans.map(p => (
                  <div key={p.id} className={`dt-plan-card${plan?.id === p.id ? " active" : ""}`}
                    onClick={() => { setPlan(p); setErrors(e => ({...e, plan:""})); }}>
                    <div className="dt-plan-size">{p.size}</div>
                    <div className="dt-plan-validity">{p.validity}</div>
                    <div className="dt-plan-price">₦{Number(p.sellingPrice).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
            {errors.plan && <div className="dt-error-msg" style={{marginTop:8}}>{errors.plan}</div>}
          </div>
        </div>

        <div className="dt-bottom">
          <button className="dt-buy-btn" onClick={handleBuy} disabled={plansLoading || !plan}>
            {plan ? `Buy ${plan.size} for ₦${Number(plan.sellingPrice).toLocaleString()}` : "Continue"}
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
