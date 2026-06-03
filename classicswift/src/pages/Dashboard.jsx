import { useState, useEffect, useCallback } from "react";
import WhatsAppFloat from "../components/WhatsAppFloat";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getBalance, formatBalance } from "../services/walletService";
import { getRecentTransactions, formatTransaction } from "../services/transactionService";
import { getUnreadCount } from "../services/notificationService";
import { getUser } from "../services/userService";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes sparkle { 0%,100%{opacity:0;transform:scale(0)} 50%{opacity:1;transform:scale(1)} }
  @keyframes spin { to { transform:rotate(360deg); } }

  html, body {
    overscroll-behavior: none;
    overscroll-behavior-y: none;
  }

  .db-root {
    position: fixed; inset: 0;
    background: #f4f3f8;
    font-family: 'Poppins', sans-serif;
    display: flex; flex-direction: column;
    overflow: hidden;
    overscroll-behavior: none;
  }

  /* none (not contain) — contain still allows pull-to-refresh on Android */
  .db-scroll {
    flex: 1 1 0; min-height: 0;
    overflow-y: auto; overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: none;
    overscroll-behavior-y: none;
    touch-action: pan-y;
    padding-bottom: 100px;
  }

  .db-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:52px 22px 20px; background:#f4f3f8;
    animation:fadeInUp .5s ease both;
  }
  .db-header-left { display:flex; align-items:center; gap:12px; }
  .db-avatar {
    width:50px; height:50px; border-radius:50%;
    background:linear-gradient(135deg,#6A00DF,#8B3DFF);
    display:flex; align-items:center; justify-content:center;
    font-size:19px; font-weight:800; color:#fff;
    flex-shrink:0; overflow:hidden;
    box-shadow:0 4px 14px rgba(106,0,223,.25);
  }
  .db-avatar img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
  .db-greeting { font-size:13px; font-weight:400; color:#9ca3af; line-height:1.2; }
  .db-username { font-size:17px; font-weight:800; color:#111B27; display:flex; align-items:center; gap:6px; }
  .db-header-right { display:flex; align-items:center; gap:8px; }

  .db-notif-btn {
    width:44px; height:44px; border-radius:14px;
    background:#fff; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    position:relative; box-shadow:0 2px 10px rgba(0,0,0,.07);
    transition:transform .15s;
  }
  .db-notif-btn:active { transform:scale(.93); }
  .db-notif-dot {
    position:absolute; top:6px; right:6px;
    width:8px; height:8px; border-radius:50%;
    background:#EF4444; border:2px solid #fff;
  }

  .db-refresh-btn {
    width:44px; height:44px; border-radius:14px;
    background:#fff; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 2px 10px rgba(0,0,0,.07);
    transition:transform .15s; color:#6A00DF;
  }
  .db-refresh-btn:active { transform:scale(.93); }
  .db-refresh-btn:disabled { opacity:.5; cursor:not-allowed; }
  .db-refresh-spinning { animation:spin .7s linear infinite; }

  .db-section { padding:0 22px; margin-top:24px; animation:fadeInUp .5s ease both; }
  .db-section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .db-section-title { font-size:16px; font-weight:700; color:#111B27; }
  .db-view-all {
    font-size:13px; font-weight:600; color:#6A00DF;
    background:none; border:none; cursor:pointer;
    font-family:'Poppins',sans-serif;
    display:flex; align-items:center; gap:3px;
  }

  .db-balances { display:flex; gap:12px; align-items:stretch; }

  .db-bal-main {
    flex:1.55; min-width:0;
    background:linear-gradient(135deg,#6A00DF 0%,#8B3DFF 100%);
    border-radius:18px; padding:14px;
    display:flex; flex-direction:column; justify-content:space-between;
    box-shadow:0 8px 28px rgba(106,0,223,.3);
    position:relative; overflow:hidden; min-height:148px;
  }
  .db-bal-main::before {
    content:''; position:absolute;
    width:80px; height:80px; border-radius:50%;
    background:rgba(255,255,255,.07);
    top:-20px; right:-20px; pointer-events:none;
  }
  .db-bal-row { display:flex; align-items:center; justify-content:space-between; position:relative; z-index:1; }
  .db-bal-label { font-size:11px; font-weight:500; color:rgba(255,255,255,.8); }
  .db-bal-icons { display:flex; align-items:center; gap:5px; position:relative; z-index:1; }
  .db-bal-eye {
    background:rgba(255,255,255,.15); border:none; cursor:pointer;
    color:rgba(255,255,255,.95); display:flex; align-items:center;
    padding:5px; border-radius:7px; transition:background .2s; position:relative; z-index:1;
  }
  .db-bal-eye:active { background:rgba(255,255,255,.28); }
  .db-bal-amount {
    font-size:clamp(18px,5.2vw,23px); font-weight:800; color:#fff;
    letter-spacing:-.5px; margin:8px 0 10px; line-height:1;
    position:relative; z-index:1;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .db-fund-btn {
    width:100%; height:36px; border-radius:10px;
    background:#fff; border:none; color:#6A00DF;
    font-family:'Poppins',sans-serif; font-size:13px; font-weight:800;
    cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;
    box-shadow:0 2px 8px rgba(255,255,255,.18);
    transition:opacity .2s,transform .15s;
    flex-shrink:0; position:relative; z-index:1;
  }
  .db-fund-btn:active { opacity:.88; transform:scale(.97); }

  .db-bal-cash {
    flex:1; min-width:0; background:#EDE8F8;
    border-radius:18px; padding:14px;
    display:flex; flex-direction:column; justify-content:space-between; min-height:148px;
  }
  .db-bal-cash-top { display:flex; align-items:center; justify-content:space-between; }
  .db-bal-cash-label { font-size:11px; font-weight:500; color:#6A00DF; }
  .db-bal-cash-eye {
    background:rgba(106,0,223,.1); border:none; cursor:pointer;
    color:#6A00DF; display:flex; align-items:center;
    padding:4px; border-radius:7px; transition:background .2s;
  }
  .db-bal-cash-eye:active { background:rgba(106,0,223,.2); }
  .db-bal-cash-icon { margin:6px 0 4px; }
  .db-bal-cash-amount {
    font-size:clamp(15px,4vw,19px); font-weight:800; color:#111B27;
    letter-spacing:-.4px; margin-bottom:10px; line-height:1;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  }
  .db-bal-cash-btn {
    width:100%; height:34px; border-radius:9px;
    background:#fff; border:1.5px solid #D5CDF0;
    color:#6A00DF; font-family:'Poppins',sans-serif;
    font-size:11px; font-weight:700; cursor:pointer;
    display:flex; align-items:center; justify-content:center; gap:4px;
    transition:background .2s;
  }
  .db-bal-cash-btn:active { background:#D5CDF0; }

  .db-actions { display:flex; justify-content:space-between; gap:8px; }
  .db-action-item { flex:1; display:flex; flex-direction:column; align-items:center; gap:8px; cursor:pointer; }
  .db-action-icon {
    width:58px; height:58px; border-radius:16px;
    background:#fff; border:1.5px solid #EDE8F8;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 2px 10px rgba(0,0,0,.06);
    transition:transform .15s,box-shadow .15s;
  }
  .db-action-item:active .db-action-icon { transform:scale(.92); }
  .db-action-label { font-size:11.5px; font-weight:500; color:#374151; text-align:center; }

  .db-refer {
    margin:24px 22px 0;
    background:linear-gradient(135deg,#6A00DF 0%,#7B2FFF 100%);
    border-radius:20px; padding:22px 20px;
    display:flex; align-items:center; justify-content:space-between;
    position:relative; overflow:hidden;
    box-shadow:0 8px 28px rgba(106,0,223,.28);
    animation:fadeInUp .5s .2s ease both;
  }
  .db-refer::before {
    content:''; position:absolute;
    width:140px; height:140px; border-radius:50%;
    background:rgba(255,255,255,.06);
    top:-40px; right:60px; pointer-events:none;
  }
  .db-refer-left { flex:1; z-index:1; }
  .db-refer-tag {
    display:inline-flex; align-items:center; gap:5px;
    background:rgba(255,255,255,.15); border-radius:999px;
    padding:3px 10px; font-size:11px; font-weight:600; color:#fff; margin-bottom:8px;
  }
  .db-refer-title { font-size:22px; font-weight:800; color:#fff; line-height:1.2; }
  .db-refer-sub { font-size:13px; font-weight:400; color:rgba(255,255,255,.8); margin-top:6px; line-height:1.5; }
  .db-refer-btn {
    margin-top:14px; display:inline-flex; align-items:center; gap:6px;
    background:#fff; border:none; border-radius:10px;
    padding:9px 16px; font-family:'Poppins',sans-serif;
    font-size:13px; font-weight:700; color:#6A00DF; cursor:pointer; transition:transform .15s;
  }
  .db-refer-btn:active { transform:scale(.95); }
  .db-refer-right { width:110px; flex-shrink:0; z-index:1; }
  .db-sp1 { position:absolute; top:18px; right:118px; animation:sparkle 2.4s ease-in-out infinite; pointer-events:none; }
  .db-sp2 { position:absolute; bottom:22px; right:106px; animation:sparkle 2.4s .8s ease-in-out infinite; pointer-events:none; }
  .db-sp3 { position:absolute; top:40px; right:88px; animation:sparkle 2.4s 1.6s ease-in-out infinite; pointer-events:none; }

  .db-txn-list { display:flex; flex-direction:column; background:#fff; border-radius:16px; overflow:hidden; }
  .db-txn-item {
    background:#fff; padding:14px 16px;
    display:flex; align-items:center; gap:14px;
    cursor:pointer; transition:background .15s;
    border-bottom:1px solid #F4F3F8;
  }
  .db-txn-item:last-child { border-bottom:none; }
  .db-txn-item:active { background:#F8F7FF; }
  .db-txn-icon { width:46px; height:46px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:11px; font-weight:800; color:#fff; }
  .db-txn-info { flex:1; min-width:0; }
  .db-txn-name { font-size:14px; font-weight:600; color:#111B27; }
  .db-txn-date { font-size:12px; font-weight:400; color:#9ca3af; margin-top:2px; }
  .db-txn-right { text-align:right; flex-shrink:0; }
  .db-txn-amount { font-size:14px; font-weight:700; color:#111B27; }
  .db-txn-status { font-size:12px; font-weight:600; color:#10B881; margin-top:2px; }
  .db-txn-status.failed { color:#EF4444; }
  .db-view-all-txn {
    margin-top:10px; width:100%; height:48px;
    background:#fff; border:1.5px solid #EDE8F8; border-radius:14px;
    font-family:'Poppins',sans-serif; font-size:14px; font-weight:600; color:#6A00DF;
    cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;
    transition:background .2s;
  }
  .db-view-all-txn:active { background:#F0ECF9; }

  .db-bottom-nav {
    position:fixed; bottom:0; left:0; right:0;
    background:#fff; border-top:1.5px solid #EDE8F8;
    display:flex; align-items:center; padding:10px 0 24px;
    box-shadow:0 -4px 20px rgba(0,0,0,.07); z-index:100;
  }
  .db-nav-item {
    flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;
    cursor:pointer; background:none; border:none;
    font-family:'Poppins',sans-serif; transition:transform .15s;
  }
  .db-nav-item:active { transform:scale(.9); }
  .db-nav-label { font-size:11px; font-weight:500; color:#9ca3af; }
  .db-nav-item.active .db-nav-label { color:#6A00DF; font-weight:700; }
`;

const BellIcon       = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111B27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>);
const EyeIcon        = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>);
const EyeOffIcon     = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>);
const WalletIcon     = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>);
const PlusIcon       = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);
const ArrowRightIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>);
const HomeIcon       = ({active}) => (<svg width="22" height="22" viewBox="0 0 24 24" fill={active?"#6A00DF":"none"} stroke={active?"#6A00DF":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>);
const AirtimeNavIcon = ({active}) => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6A00DF":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>);
const DataNavIcon    = ({active}) => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6A00DF":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M10.54 16.1a6 6 0 0 1 2.92 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>);
const HistoryNavIcon = ({active}) => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6A00DF":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>);
const ProfileNavIcon = ({active}) => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6A00DF":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const AirtimeIcon  = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6A00DF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>);
const DataIcon     = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6A00DF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M10.54 16.1a6 6 0 0 1 2.92 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>);
const HistoryIcon  = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6A00DF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>);
const ReferIcon    = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6A00DF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const SecurityIcon = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6A00DF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>);
const RefreshIcon  = ({ spinning }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    style={spinning ? { animation: "spin .7s linear infinite" } : {}}>
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

const GiftBoxSVG = () => (
  <svg viewBox="0 0 110 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'auto',animation:'floatY 3s ease-in-out infinite'}}>
    <defs><linearGradient id="gbg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8B3DFF"/><stop offset="1" stopColor="#6A00DF"/></linearGradient></defs>
    <rect x="10" y="52" width="90" height="62" rx="8" fill="url(#gbg)"/>
    <rect x="47" y="52" width="16" height="62" fill="#FF8C00" opacity=".9"/>
    <rect x="5" y="36" width="100" height="24" rx="7" fill="#7B2FFF"/>
    <rect x="5" y="48" width="100" height="12" fill="#FF8C00" opacity=".9"/>
    <path d="M55 36 Q35 14 28 26 Q33 34 55 36Z" fill="#FFA000"/>
    <path d="M55 36 Q75 14 82 26 Q77 34 55 36Z" fill="#FF8C00"/>
    <circle cx="55" cy="36" r="8" fill="#FFB300"/>
    <circle cx="55" cy="36" r="5" fill="#FFC107"/>
    <rect x="18" y="62" width="28" height="5" rx="2.5" fill="#fff" opacity=".12"/>
  </svg>
);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

const QUICK_ACTIONS = [
  { label:"Airtime",      Icon:AirtimeIcon,  path:"/airtime"    },
  { label:"Data",         Icon:DataIcon,     path:"/data"       },
  { label:"History",      Icon:HistoryIcon,  path:"/history"    },
  { label:"Refer & Earn", Icon:ReferIcon,    path:"/refer-earn" },
  { label:"Security",     Icon:SecurityIcon, path:"/security"   },
];

const NAV_ITEMS = [
  { label:"Home",    Icon:HomeIcon,       path:"/dashboard" },
  { label:"Airtime", Icon:AirtimeNavIcon, path:"/airtime"   },
  { label:"Data",    Icon:DataNavIcon,    path:"/data"      },
  { label:"History", Icon:HistoryNavIcon, path:"/history"   },
  { label:"Profile", Icon:ProfileNavIcon, path:"/profile"   },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [user,        setUser]        = useState(null);
  const [authReady,   setAuthReady]   = useState(false);
  const [showBal,     setShowBal]     = useState(true);
  const [showCash,    setShowCash]    = useState(true);
  const [activeNav,   setActiveNav]   = useState("/dashboard");
  const [balance,     setBalance]     = useState(0);
  const [cashback,    setCashback]    = useState(0);
  const [txns,        setTxns]        = useState([]);
  const [loadingBal,  setLoadingBal]  = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [photoURL,    setPhotoURL]    = useState(null);

  const firstName = user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "User";
  const initials  = firstName.charAt(0).toUpperCase();

  // useCallback so the function reference is stable across renders
  const loadData = useCallback(async (uid, showLoadingSpinner = false) => {
    if (!uid) return;
    if (showLoadingSpinner) setLoadingBal(true);
    try {
      const [notifRes, balRes, txnRes, userRes] = await Promise.allSettled([
        getUnreadCount(uid),
        getBalance(uid),
        getRecentTransactions(uid),
        getUser(uid),
      ]);
      if (notifRes.status === "fulfilled" && notifRes.value.success) {
        setUnreadNotif(notifRes.value.count);
      }
      if (balRes.status === "fulfilled" && balRes.value.success) {
        setBalance(balRes.value.balance ?? 0);
        setCashback(balRes.value.cashback ?? 0);
      }
      if (txnRes.status === "fulfilled" && txnRes.value.success) {
        setTxns(txnRes.value.data.map(formatTransaction));
      }
      if (userRes.status === "fulfilled" && userRes.value.success) {
        setPhotoURL(userRes.value.data?.photoURL || null);
      }
    } catch (err) {
      console.error("loadData error:", err);
    }
    setLoadingBal(false);
  }, []);

  const handleRefresh = async () => {
    // Always use auth.currentUser — most reliable uid source
    const uid = auth.currentUser?.uid;
    if (!uid || refreshing) return;
    setRefreshing(true);
    // Pass true so balance shows "..." while re-fetching
    await loadData(uid, true);
    setRefreshing(false);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const hasSession = sessionStorage.getItem("cs_session");
        if (!hasSession) {
          const isOAuth = u.providerData?.some(p => p.providerId !== "password");
          if (isOAuth) {
            sessionStorage.setItem("cs_session", "true");
          } else {
            await signOut(auth);
            navigate("/login");
            return;
          }
        }
        setUser(u);
        setAuthReady(true);
        loadData(u.uid, true);
      } else {
        setAuthReady(true);
        navigate("/login");
      }
    });

    // balanceUpdated fires from FundWallet after payment — reload data
    const handleStorage = (e) => {
      if (e.key === "balanceUpdated") {
        const uid = auth.currentUser?.uid;
        if (uid) loadData(uid);
      }
    };
    window.addEventListener("storage", handleStorage);

    // Reload when tab becomes visible again (user returns from Flutterwave redirect)
    const handleVisibility = () => {
      if (!document.hidden) {
        const uid = auth.currentUser?.uid;
        if (uid) loadData(uid);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      unsub();
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadData]);

  if (!authReady) return (
    <div style={{minHeight:"100vh",background:"#f4f3f8",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:32,height:32,border:"3px solid #EDE8F8",borderTopColor:"#6A00DF",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <style>{STYLES}</style>
      <div className="db-root">
        <div className="db-scroll">

          <div className="db-header">
            <div className="db-header-left">
              <div className="db-avatar">
                {photoURL ? <img src={photoURL} alt="avatar"/> : initials}
              </div>
              <div>
                <div className="db-greeting">{getGreeting()}</div>
                <div className="db-username">{firstName} 👋</div>
              </div>
            </div>
            <div className="db-header-right">
              <button className="db-refresh-btn" onClick={handleRefresh} disabled={refreshing} title="Refresh">
                <RefreshIcon spinning={refreshing}/>
              </button>
              <button className="db-notif-btn" onClick={() => navigate("/notifications")}>
                <BellIcon/>
                {unreadNotif > 0 && <div className="db-notif-dot"/>}
              </button>
            </div>
          </div>

          <div className="db-section" style={{animationDelay:'.05s'}}>
            <div className="db-section-header">
              <div className="db-section-title">Your Balances</div>
              <button className="db-view-all" onClick={() => navigate("/history")}>View all <ArrowRightIcon/></button>
            </div>
            <div className="db-balances">
              <div className="db-bal-main">
                <div className="db-bal-row">
                  <span className="db-bal-label">Account Balance</span>
                  <div className="db-bal-icons">
                    <button className="db-bal-eye" onClick={() => setShowBal(s=>!s)}>
                      {showBal ? <EyeIcon/> : <EyeOffIcon/>}
                    </button>
                    <WalletIcon/>
                  </div>
                </div>
                <div className="db-bal-amount">
                  {loadingBal ? "..." : showBal ? `₦${formatBalance(balance)}` : "• • • • • •"}
                </div>
                <button className="db-fund-btn" onClick={() => navigate("/fund-wallet")}>
                  <PlusIcon/> Fund Wallet
                </button>
              </div>
              <div className="db-bal-cash">
                <div className="db-bal-cash-top">
                  <span className="db-bal-cash-label">Cashback Balance</span>
                  <button className="db-bal-cash-eye" onClick={() => setShowCash(s=>!s)}>
                    {showCash ? <EyeIcon/> : <EyeOffIcon/>}
                  </button>
                </div>
                <div className="db-bal-cash-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6A00DF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
                    <path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                  </svg>
                </div>
                <div className="db-bal-cash-amount">
                  {loadingBal ? "..." : showCash ? `₦${formatBalance(cashback)}` : "• • • • •"}
                </div>
                <button className="db-bal-cash-btn" onClick={() => navigate("/cashback")}>
                  View Cashback <ArrowRightIcon/>
                </button>
              </div>
            </div>
          </div>

          <div className="db-section" style={{animationDelay:'.1s'}}>
            <div className="db-section-header">
              <div className="db-section-title">Quick Actions</div>
              <button className="db-view-all" onClick={() => navigate("/airtime")}>View all</button>
            </div>
            <div className="db-actions">
              {QUICK_ACTIONS.map(({ label, Icon, path }) => (
                <div className="db-action-item" key={label} onClick={() => navigate(path)}>
                  <div className="db-action-icon"><Icon/></div>
                  <span className="db-action-label">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="db-refer">
            <div className="db-refer-left">
              <div className="db-refer-tag">🎁 Earn Rewards</div>
              <div className="db-refer-title">Refer &amp; Earn</div>
              <div className="db-refer-sub">Earn up to 10% on every successful referral</div>
              <button className="db-refer-btn" onClick={() => navigate("/refer-earn")}>Learn More <ArrowRightIcon/></button>
            </div>
            <div className="db-refer-right"><GiftBoxSVG/></div>
            <div className="db-sp1"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 0L7 5L12 6L7 7L6 12L5 7L0 6L5 5Z" fill="rgba(255,255,255,0.5)"/></svg></div>
            <div className="db-sp2"><svg width="8" height="8" viewBox="0 0 12 12"><path d="M6 0L7 5L12 6L7 7L6 12L5 7L0 6L5 5Z" fill="rgba(255,200,0,0.6)"/></svg></div>
            <div className="db-sp3"><svg width="10" height="10" viewBox="0 0 12 12"><path d="M6 0L7 5L12 6L7 7L6 12L5 7L0 6L5 5Z" fill="rgba(255,255,255,0.3)"/></svg></div>
          </div>

          <div className="db-section" style={{animationDelay:'.15s'}}>
            <div className="db-section-header">
              <div className="db-section-title">Recent Transactions</div>
              <button className="db-view-all" onClick={() => navigate("/history")}>View all</button>
            </div>
            <div className="db-txn-list">
              {txns.length === 0 ? (
                <div style={{padding:"20px",textAlign:"center",color:"#9ca3af",fontSize:13.5}}>No transactions yet</div>
              ) : txns.map(txn => (
                <div className="db-txn-item" key={txn.id}
                  onClick={() => navigate("/transaction/receipt", { state: { txn } })}>
                  <div className="db-txn-icon" style={{background:txn.iconBg}}>{txn.iconText}</div>
                  <div className="db-txn-info">
                    <div className="db-txn-name">{txn.name}</div>
                    <div className="db-txn-date">{txn.date}</div>
                  </div>
                  <div className="db-txn-right">
                    <div className="db-txn-amount">{txn.amount}</div>
                    <div className={`db-txn-status${txn.status==="Failed"?" failed":""}`}>{txn.status}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="db-view-all-txn" onClick={() => navigate("/history")}>
              View all transactions <ArrowRightIcon/>
            </button>
          </div>

        </div>

        <nav className="db-bottom-nav">
          {NAV_ITEMS.map(({ label, Icon, path }) => (
            <button key={label}
              className={`db-nav-item${activeNav===path?" active":""}`}
              onClick={() => { setActiveNav(path); if (path !== "/dashboard") navigate(path); }}>
              <div style={{width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon active={activeNav===path}/>
              </div>
              <span className="db-nav-label">{label}</span>
            </button>
          ))}
        </nav>

      </div>
      <WhatsAppFloat/>
    </>
  );
}
