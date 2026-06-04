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

const PRESET_AMOUNTS = ["₦100","₦200","₦500","₦1,000","₦2,000","₦5,000","₦10,000"];

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
  @keyframes spin { to { transform:rotate(360deg); } }

  .at-root { position:fixed; inset:0; background:#f4f3f8; font-family:'Poppins',sans-serif; display:flex; flex-direction:column; overflow:hidden; }
  .at-scroll { flex:1 1 0; min-height:0; overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; padding-bottom:180px; }

  .at-topbar { display:flex; align-items:center; justify-content:space-between; padding:52px 20px 16px; background:#f4f3f8; }
  .at-back { width:40px; height:40px; border-radius:12px; background:#fff; border:1.5px solid #E8E4F0; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 1px 6px rgba(0,0,0,.06); }
  .at-title { font-size:17px; font-weight:800; color:#111B27; }
  .at-hist { display:flex; align-items:center; gap:5px; background:none; border:none; font-family:'Poppins',sans-serif; font-size:13px; font-weight:600; color:#6A00DF; cursor:pointer; }

  .at-section { padding:0 20px; margin-top:20px; animation:fadeInUp .4s ease both; }
  .at-label { font-size:15px; font-weight:700; color:#111B27; margin-bottom:12px; }

  .at-networks { display:flex; gap:10px; flex-wrap:wrap; }
  .at-net-item { flex:1; min-width:60px; display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; }
  .at-net-logo { width:64px; height:64px; border-radius:16px; display:flex; align-items:center; justify-content:center; border:2px solid #E8E4F0; position:relative; transition:border-color .2s, box-shadow .2s; overflow:hidden; }
  .at-net-logo.active { border-color:#6A00DF; box-shadow:0 0 0 3px rgba(106,0,223,.12); }
  .at-net-check { position:absolute; top:-1px; right:-1px; width:20px; height:20px; background:#6A00DF; border-radius:50%; display:flex; align-items:center; justify-content:center; }
  .at-net-name { font-size:12px; font-weight:500; color:#374151; text-align:center; }

  .at-input-wrap { background:#fff; border:1.5px solid #E8E4F0; border-radius:14px; display:flex; align-items:center; padding:0 16px; transition:border-color .2s; }
  .at-input-wrap:focus-within { border-color:#6A00DF; }
  .at-input-wrap.error { border-color:#EF4444; animation:shake .4s ease; }
  .at-input-icon { color:#6A00DF; display:flex; align-items:center; margin-right:10px; flex-shrink:0; }
  .at-input { flex:1; height:54px; border:none; outline:none; font-family:'Poppins',sans-serif; font-size:15px; color:#111B27; background:transparent; }
  .at-input::placeholder { color:#C4BDD6; }
  .at-contact-btn { background:none; border:none; cursor:pointer; color:#9ca3af; display:flex; align-items:center; padding:0; }

  .at-amounts { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
  .at-amt-btn { height:44px; border-radius:12px; border:1.5px solid #E8E4F0; background:#fff; font-family:'Poppins',sans-serif; font-size:13px; font-weight:600; color:#374151; cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center; }
  .at-amt-btn.active { border-color:#6A00DF; background:#F0ECF9; color:#6A00DF; }
  .at-amt-other { width:100%; height:44px; margin-top:8px; border-radius:12px; border:1.5px solid #E8E4F0; background:#fff; font-family:'Poppins',sans-serif; font-size:13px; font-weight:600; color:#6A00DF; cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center; gap:6px; }
  .at-amt-other.active { border-color:#6A00DF; background:#F0ECF9; }
  .at-custom-wrap { margin-top:8px; }

  .at-contacts { display:flex; flex-direction:column; gap:2px; }
  .at-contact-item { background:#fff; border-radius:14px; padding:12px 14px; display:flex; align-items:center; gap:12px; cursor:pointer; }
  .at-contact-avatar { width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg,#6A00DF,#8B3DFF); display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:800; color:#fff; flex-shrink:0; }
  .at-contact-info { flex:1; min-width:0; }
  .at-contact-name { font-size:14px; font-weight:600; color:#111B27; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .at-contact-phone { font-size:12px; color:#9ca3af; margin-top:2px; }
  .at-contact-send { width:38px; height:38px; border-radius:50%; border:1.5px solid #E8E4F0; display:flex; align-items:center; justify-content:center; color:#6A00DF; flex-shrink:0; }
  .at-section-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }

  .at-banner { background:#F0ECF9; border-radius:14px; padding:14px 16px; display:flex; align-items:center; gap:12px; cursor:pointer; }
  .at-banner-icon { width:40px; height:40px; border-radius:12px; background:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#6A00DF; }
  .at-banner-text { flex:1; min-width:0; }
  .at-banner-title { font-size:13.5px; font-weight:600; color:#111B27; }
  .at-banner-sub { font-size:12px; color:#9ca3af; margin-top:2px; }

  .at-bottom { position:fixed; bottom:74px; left:0; right:0; padding:10px 20px 12px; background:#f4f3f8; border-top:1.5px solid #EDE8F8; }
  .at-buy-btn { width:100%; height:58px; background:linear-gradient(135deg,#6A00DF,#8B3DFF); border:none; border-radius:16px; font-family:'Poppins',sans-serif; font-size:16px; font-weight:800; color:#fff; cursor:pointer; box-shadow:0 8px 24px rgba(106,0,223,.3); transition:transform .15s, opacity .15s; }
  .at-buy-btn:active { transform:scale(.97); }
  .at-buy-btn:disabled { opacity:.5; cursor:not-allowed; }

  .at-nav { position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1.5px solid #EDE8F8; display:flex; align-items:center; padding:10px 0 24px; box-shadow:0 -4px 20px rgba(0,0,0,.07); z-index:100; }
  .at-nav-item { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; cursor:pointer; background:none; border:none; font-family:'Poppins',sans-serif; }
  .at-nav-label { font-size:11px; font-weight:500; color:#9ca3af; }
  .at-nav-item.active .at-nav-label { color:#6A00DF; font-weight:700; }
  .at-error-msg { font-size:12px; color:#EF4444; font-weight:500; margin-top:6px; }
  .at-spinner { width:18px; height:18px; border:2.5px solid rgba(106,0,223,.3); border-top-color:#6A00DF; border-radius:50%; animation:spin .7s linear infinite; margin:0 auto; }
  .at-loading { display:flex; justify-content:center; padding:20px 0; }
  .at-net-error { font-size:13px; color:#EF4444; text-align:center; padding:12px 0; }
`;

const BackIcon     = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>);
const HistIcon     = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>);
const PhoneIcon    = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.74a16 16 0 0 0 6.29 6.29l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>);
const PersonIcon   = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const SendIcon2    = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>);
const CheckSmall   = () => (<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const ArrowR       = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>);
const PlusIcon     = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);
const DiscountIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6A00DF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 9h.01M15 15h.01M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0M15 9l-6 6"/></svg>);

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

export default function Airtime() {
  const navigate = useNavigate();

  const [networks,    setNetworks]    = useState([]);
  const [netsLoading, setNetsLoading] = useState(true);
  const [netsError,   setNetsError]   = useState("");

  const [network,    setNetwork]    = useState(null);
  const [phone,      setPhone]      = useState("");
  const [amount,     setAmount]     = useState("");
  const [customAmt,  setCustomAmt]  = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [errors,     setErrors]     = useState({});
  const [recentContacts, setRecentContacts] = useState([]);

  useEffect(() => {
    const FALLBACK = [
      { id:1, network:"MTN"     },
      { id:2, network:"Airtel"  },
      { id:3, network:"Glo"     },
      { id:4, network:"9mobile" },
    ];
    fetch(`${POINTLY_API_BASE}/vtu/networks`, {
      headers: { "X-API-Key": POINTLY_API_KEY }
    })
      .then(r => r.json())
      .then(data => {
        let nets = (data.success && data.data?.length) ? data.data : FALLBACK;
        const has9 = nets.some(n => {
          const k = n.network?.toLowerCase().replace(/\s/g,"");
          return k === "9mobile" || k === "etisalat";
        });
        if (!has9) nets = [...nets, { id:4, network:"9mobile" }];
        setNetworks(nets);
        setNetwork(nets[0]);
      })
      .catch(() => { setNetworks(FALLBACK); setNetwork(FALLBACK[0]); })
      .finally(() => setNetsLoading(false));
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getUserTransactions(uid, 20).then(res => {
      if (!res.success) return;
      const seen = new Set();
      const contacts = [];
      res.data.forEach(t => {
        if ((t.type === "airtime" || t.type === "data") && t.phone && !seen.has(t.phone)) {
          seen.add(t.phone);
          contacts.push({ name: t.phone, phone: t.phone, init: t.network?.charAt(0) || "N" });
        }
      });
      setRecentContacts(contacts.slice(0, 5));
    });
  }, []);

  const finalAmount = showCustom ? customAmt : amount;

  const handleAmt = (a) => {
    if (a === "other") { setShowCustom(true); setAmount(""); }
    else { setShowCustom(false); setAmount(a); setCustomAmt(""); }
    setErrors(e => ({ ...e, amount: "" }));
  };

  const handleContact = (c) => {
    setPhone(c.phone.replace(/\s/g, ""));
    setErrors(e => ({ ...e, phone: "" }));
  };

  const validate = () => {
    const e = {};
    if (!phone || phone.replace(/\D/g,"").length < 10) e.phone = "Enter a valid phone number";
    if (!finalAmount) e.amount = "Select or enter an amount";
    if (!network) e.network = "Select a network";
    return e;
  };

  const handleBuy = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const cfg = getNetConfig(network.network);
    navigate("/airtime/confirm", {
      state: {
        network: { ...cfg, id: network.id, network_id: network.id, name: network.network },
        phone,
        amount: finalAmount,
      }
    });
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="at-root">
        <div className="at-scroll">
          <div className="at-topbar">
            <button className="at-back" onClick={() => navigate("/dashboard")}><BackIcon /></button>
            <span className="at-title">Buy Airtime</span>
            <button className="at-hist" onClick={() => navigate("/history")}><HistIcon /> History</button>
          </div>

          <div className="at-section">
            <div className="at-label">Select Network</div>
            {netsLoading ? (
              <div className="at-loading"><div className="at-spinner"/></div>
            ) : netsError ? (
              <div className="at-net-error">{netsError}</div>
            ) : (
              <div className="at-networks">
                {networks.map(n => {
                  const cfg = getNetConfig(n.network);
                  const isActive = network?.id === n.id;
                  return (
                    <div className="at-net-item" key={n.id} onClick={() => setNetwork(n)}>
                      <div className={`at-net-logo${isActive ? " active" : ""}`} style={{background: cfg.bg}}>
                        <span style={{fontSize: cfg.text.length > 3 ? 10 : 14, fontWeight:900, color:cfg.color}}>{cfg.text}</span>
                        {isActive && <div className="at-net-check"><CheckSmall /></div>}
                      </div>
                      <span className="at-net-name">{n.network}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="at-section">
            <div className="at-label">Phone Number</div>
            <div className={`at-input-wrap${errors.phone ? " error" : ""}`}>
              <span className="at-input-icon"><PhoneIcon /></span>
              <input className="at-input" type="tel" inputMode="numeric" placeholder="Enter 10 or 11 digit phone number"
                value={phone} onChange={e => { setPhone(e.target.value); setErrors(er => ({...er, phone:""})); }}/>
              <button className="at-contact-btn"><PersonIcon /></button>
            </div>
            {errors.phone && <div className="at-error-msg">{errors.phone}</div>}
          </div>

          <div className="at-section">
            <div className="at-label">Amount</div>
            <div className="at-amounts">
              {PRESET_AMOUNTS.map(a => (
                <button key={a} className={`at-amt-btn${amount === a && !showCustom ? " active" : ""}`} onClick={() => handleAmt(a)}>{a}</button>
              ))}
            </div>
            <button className={`at-amt-other${showCustom ? " active" : ""}`} onClick={() => handleAmt("other")}>
              <PlusIcon /> Other Amount
            </button>
            {showCustom && (
              <div className="at-custom-wrap">
                <div className={`at-input-wrap${errors.amount ? " error" : ""}`}>
                  <span className="at-input-icon" style={{fontSize:16, fontWeight:700, color:"#6A00DF"}}>₦</span>
                  <input className="at-input" type="number" inputMode="numeric" placeholder="Enter custom amount"
                    value={customAmt} onChange={e => { setCustomAmt(e.target.value); setErrors(er => ({...er, amount:""})); }}/>
                </div>
              </div>
            )}
            {errors.amount && <div className="at-error-msg">{errors.amount}</div>}
          </div>

          {recentContacts.length > 0 && (
            <div className="at-section">
              <div className="at-section-row">
                <div className="at-label" style={{marginBottom:0}}>Recent Contacts</div>
              </div>
              <div className="at-contacts">
                {recentContacts.map(c => (
                  <div className="at-contact-item" key={c.phone} onClick={() => handleContact(c)}>
                    <div className="at-contact-avatar">{c.init}</div>
                    <div className="at-contact-info">
                      <div className="at-contact-name">{c.name}</div>
                      <div className="at-contact-phone">{c.phone}</div>
                    </div>
                    <div className="at-contact-send"><SendIcon2 /></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="at-section" style={{marginBottom:8}}>
            <div className="at-banner">
              <div className="at-banner-icon"><DiscountIcon /></div>
              <div className="at-banner-text">
                <div className="at-banner-title">Enjoy discounts on airtime</div>
                <div className="at-banner-sub">You get the best rates on all networks.</div>
              </div>
              <ArrowR />
            </div>
          </div>
        </div>

        <div className="at-bottom">
          <button className="at-buy-btn" onClick={handleBuy} disabled={netsLoading || !network}>
            Buy Airtime
          </button>
        </div>

        <nav className="at-nav">
          {NAV.map(({ label, Icon, path }) => (
            <button key={label} className={`at-nav-item${path === "/airtime" ? " active" : ""}`} onClick={() => navigate(path)}>
              <div style={{width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center'}}>
                <Icon active={path === "/airtime"} />
              </div>
              <span className="at-nav-label">{label}</span>
            </button>
          ))}
        </nav>
      </div>
      <WhatsAppFloat />
    </>
  );
}
