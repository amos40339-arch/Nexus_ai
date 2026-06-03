import { useState, useEffect } from "react";
import WhatsAppFloat from "../components/WhatsAppFloat";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserTransactions, formatTransaction } from "../services/transactionService";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeInUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideUp  { from { transform:translateY(100%); } to { transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes spin     { to { transform:rotate(360deg); } }

  .hs-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:200; animation:fadeIn .2s ease; display:flex; align-items:flex-end; }
  .hs-sheet { width:100%; background:#fff; border-radius:24px 24px 0 0; padding:20px 20px 44px; animation:slideUp .3s cubic-bezier(.25,.46,.45,.94); }
  .hs-sheet-drag { width:40px; height:4px; background:#E8E4F0; border-radius:2px; margin:0 auto 20px; }
  .hs-sheet-title { font-size:17px; font-weight:800; color:#111B27; margin-bottom:18px; }
  .hs-sheet-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .hs-sheet-label { font-size:13px; font-weight:600; color:#374151; }

  .hs-filter-options { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; }
  .hs-filter-opt { height:36px; border-radius:999px; border:1.5px solid #E8E4F0; background:#fff; font-family:'Poppins',sans-serif; font-size:13px; font-weight:600; color:#374151; cursor:pointer; padding:0 16px; transition:all .2s; }
  .hs-filter-opt.active { background:#6A00DF; border-color:#6A00DF; color:#fff; }

  .hs-date-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px; }
  .hs-date-field { display:flex; flex-direction:column; gap:6px; }
  .hs-date-field label { font-size:12px; font-weight:600; color:#9ca3af; }
  .hs-date-input { height:46px; border:1.5px solid #E8E4F0; border-radius:12px; padding:0 12px; font-family:'Poppins',sans-serif; font-size:14px; color:#111B27; background:#fff; outline:none; width:100%; transition:border-color .2s; }
  .hs-date-input:focus { border-color:#6A00DF; }

  .hs-date-pills { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; }
  .hs-date-pill { height:34px; border-radius:999px; border:1.5px solid #E8E4F0; background:#fff; font-family:'Poppins',sans-serif; font-size:12.5px; font-weight:600; color:#374151; cursor:pointer; padding:0 14px; transition:all .2s; }
  .hs-date-pill.active { background:#6A00DF; border-color:#6A00DF; color:#fff; }

  .hs-sheet-apply { width:100%; height:52px; background:linear-gradient(135deg,#6A00DF,#8B3DFF); border:none; border-radius:14px; font-family:'Poppins',sans-serif; font-size:15px; font-weight:800; color:#fff; cursor:pointer; box-shadow:0 6px 20px rgba(106,0,223,.28); transition:transform .15s; }
  .hs-sheet-apply:active { transform:scale(.97); }
  .hs-sheet-reset { width:100%; height:44px; background:none; border:none; font-family:'Poppins',sans-serif; font-size:14px; font-weight:600; color:#9ca3af; cursor:pointer; margin-top:8px; }

  .hs-filter-btn.has-filter { color:#fff; background:#6A00DF; border-radius:999px; padding:6px 14px; }

  .hs-root { position:fixed; inset:0; background:#f4f3f8; font-family:'Poppins',sans-serif; display:flex; flex-direction:column; overflow:hidden; }
  .hs-scroll { flex:1 1 0; min-height:0; overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; padding-bottom:100px; }

  .hs-topbar { display:flex; align-items:center; justify-content:space-between; padding:52px 20px 14px; background:#f4f3f8; position:sticky; top:0; z-index:10; }
  .hs-back { width:40px; height:40px; border-radius:12px; background:#fff; border:1.5px solid #E8E4F0; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 1px 6px rgba(0,0,0,.06); flex-shrink:0; }
  .hs-title { font-size:17px; font-weight:800; color:#111B27; }
  .hs-filter-btn { display:flex; align-items:center; gap:5px; background:none; border:none; font-family:'Poppins',sans-serif; font-size:13px; font-weight:600; color:#6A00DF; cursor:pointer; }

  .hs-search-row { display:flex; align-items:center; gap:10px; padding:0 20px; margin-bottom:14px; animation:fadeInUp .4s ease both; }
  .hs-search-wrap { flex:1; background:#fff; border:1.5px solid #E8E4F0; border-radius:14px; display:flex; align-items:center; padding:0 14px; transition:border-color .2s; }
  .hs-search-wrap:focus-within { border-color:#6A00DF; }
  .hs-search-icon { color:#9ca3af; display:flex; align-items:center; margin-right:8px; flex-shrink:0; }
  .hs-search-input { flex:1; height:46px; border:none; outline:none; font-family:'Poppins',sans-serif; font-size:14px; color:#111B27; background:transparent; }
  .hs-search-input::placeholder { color:#C4BDD6; }
  .hs-cal-btn { width:46px; height:46px; background:#fff; border:1.5px solid #E8E4F0; border-radius:14px; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; color:#374151; }

  .hs-tabs-wrap { padding:0 20px; margin-bottom:18px; animation:fadeInUp .4s .04s ease both; }
  .hs-tabs { display:flex; gap:8px; overflow-x:auto; padding-bottom:2px; -ms-overflow-style:none; scrollbar-width:none; }
  .hs-tabs::-webkit-scrollbar { display:none; }
  .hs-tab { height:36px; border-radius:999px; border:1.5px solid #E8E4F0; background:#fff; font-family:'Poppins',sans-serif; font-size:13px; font-weight:600; color:#374151; cursor:pointer; white-space:nowrap; padding:0 16px; transition:all .2s; flex-shrink:0; }
  .hs-tab.active { background:#6A00DF; border-color:#6A00DF; color:#fff; }

  .hs-group { padding:0 20px; margin-bottom:16px; animation:fadeInUp .4s .08s ease both; }
  .hs-group-label { font-size:13.5px; font-weight:700; color:#111B27; margin-bottom:10px; }
  .hs-group-card { background:#fff; border-radius:18px; overflow:hidden; }

  .hs-txn { display:flex; align-items:center; gap:12px; padding:14px 16px; border-bottom:1px solid #F4F3F8; cursor:pointer; transition:background .15s; }
  .hs-txn:last-child { border-bottom:none; }
  .hs-txn:active { background:#F8F7FF; }
  .hs-txn-icon { width:46px; height:46px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:11px; font-weight:900; color:#fff; letter-spacing:-.3px; }
  .hs-txn-info { flex:1; min-width:0; }
  .hs-txn-name { font-size:14px; font-weight:600; color:#111B27; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .hs-txn-sub { font-size:12px; color:#9ca3af; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .hs-txn-right { text-align:right; flex-shrink:0; display:flex; flex-direction:column; align-items:flex-end; gap:5px; }
  .hs-txn-amt { font-size:14px; font-weight:700; }
  .hs-txn-amt.credit { color:#10B881; }
  .hs-txn-amt.debit  { color:#111B27; }
  .hs-txn-badge { font-size:11px; font-weight:600; border-radius:999px; padding:2px 10px; }
  .hs-txn-badge.success { background:#DCFCE7; color:#166534; }
  .hs-txn-badge.failed  { background:#FEE2E2; color:#DC2626; }
  .hs-txn-badge.pending { background:#FEF9C3; color:#854D0E; }
  .hs-txn-arrow { color:#D5CDF0; flex-shrink:0; }

  .hs-load-more { display:flex; align-items:center; justify-content:center; gap:7px; padding:18px 0 6px; font-size:14px; font-weight:700; color:#6A00DF; background:none; border:none; cursor:pointer; font-family:'Poppins',sans-serif; width:100%; }
  .hs-load-more:disabled { opacity:.5; cursor:not-allowed; }

  .hs-empty { display:flex; flex-direction:column; align-items:center; padding:60px 20px; gap:12px; }
  .hs-empty-icon { width:72px; height:72px; border-radius:50%; background:#EDE8F8; display:flex; align-items:center; justify-content:center; }
  .hs-empty-title { font-size:16px; font-weight:700; color:#111B27; }
  .hs-empty-sub { font-size:13px; color:#9ca3af; text-align:center; }

  .hs-nav { position:fixed; bottom:0; left:0; right:0; background:#fff; border-top:1.5px solid #EDE8F8; display:flex; align-items:center; padding:10px 0 24px; box-shadow:0 -4px 20px rgba(0,0,0,.07); z-index:100; }
  .hs-nav-item { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; cursor:pointer; background:none; border:none; font-family:'Poppins',sans-serif; }
  .hs-nav-label { font-size:11px; font-weight:500; color:#9ca3af; }
  .hs-nav-item.active .hs-nav-label { color:#6A00DF; font-weight:700; }
`;

const BackIcon      = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>);
const FilterIcon    = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>);
const SearchIcon    = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>);
const CalIcon2      = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>);
const ArrowR        = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>);
const ChevronDown   = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>);
const HistEmptyIcon = () => (<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>);
const HomeNavIcon    = ({active}) => (<svg width="22" height="22" viewBox="0 0 24 24" fill={active?"#6A00DF":"none"} stroke={active?"#6A00DF":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>);
const AirtimeNavIcon = ({active}) => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6A00DF":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>);
const DataNavIcon    = ({active}) => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6A00DF":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M10.54 16.1a6 6 0 0 1 2.92 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>);
const HistoryNavIcon = ({active}) => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6A00DF":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/></svg>);
const ProfileNavIcon = ({active}) => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active?"#6A00DF":"#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);

const NAV = [
  { label:"Home",    Icon:HomeNavIcon,    path:"/dashboard" },
  { label:"Airtime", Icon:AirtimeNavIcon, path:"/airtime"   },
  { label:"Data",    Icon:DataNavIcon,    path:"/data"      },
  { label:"History", Icon:HistoryNavIcon, path:"/history"   },
  { label:"Profile", Icon:ProfileNavIcon, path:"/profile"   },
];

const TABS = ["All","Airtime","Data","Bills","Transfers","Top up"];
const PAGE_SIZE = 20;

// Compute date range from pill shortcut
function pillToRange(pill) {
  const now   = new Date();
  const today = new Date(now); today.setHours(0,0,0,0);
  if (pill === "Today") return { from: today, to: new Date(today.getTime() + 86400000 - 1) };
  if (pill === "Yesterday") {
    const y = new Date(today); y.setDate(today.getDate() - 1);
    return { from: y, to: new Date(y.getTime() + 86400000 - 1) };
  }
  if (pill === "Last 7 days")  { const f = new Date(today); f.setDate(today.getDate()-6);  return { from: f, to: new Date() }; }
  if (pill === "Last 30 days") { const f = new Date(today); f.setDate(today.getDate()-29); return { from: f, to: new Date() }; }
  if (pill === "This month")   { const f = new Date(now.getFullYear(), now.getMonth(), 1);  return { from: f, to: new Date() }; }
  return null;
}

export default function History() {
  const navigate = useNavigate();
  const [tab,          setTab]          = useState("All");
  const [search,       setSearch]       = useState("");
  const [showFilter,   setShowFilter]   = useState(false);
  const [showCal,      setShowCal]      = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [datePill,     setDatePill]     = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [allTxns,      setAllTxns]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [lastDoc,      setLastDoc]      = useState(null);
  const [hasMore,      setHasMore]      = useState(false);

  const fetchTransactions = async (uid, cursor = null) => {
    const res = await getUserTransactions(uid, PAGE_SIZE, cursor);
    if (!res.success) return;
    const formatted = res.data.map(formatTransaction);
    setAllTxns(prev => cursor ? [...prev, ...formatted] : formatted);
    setLastDoc(res.lastDoc);
    setHasMore(res.hasMore);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/login"); return; }
      await fetchTransactions(u.uid);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLoadMore = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchTransactions(uid, lastDoc);
    setLoadingMore(false);
  };

  // Apply all filters to flat transaction list
  const filtered = allTxns.filter(txn => {
    if (tab !== "All" && txn.category !== tab) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!txn.name.toLowerCase().includes(q) && !(txn.sub||"").toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== "All" && txn.status !== statusFilter) return false;

    // Date filter — pill takes priority over manual inputs
    const dateRange = datePill ? pillToRange(datePill) : null;
    const fromDate  = dateRange ? dateRange.from : (dateFrom ? new Date(dateFrom + "T00:00:00") : null);
    const toDate    = dateRange ? dateRange.to   : (dateTo   ? new Date(dateTo   + "T23:59:59") : null);
    const txDate    = txn.rawDate instanceof Date ? txn.rawDate : new Date();
    if (fromDate && txDate < fromDate) return false;
    if (toDate   && txDate > toDate)   return false;

    return true;
  });

  // Group filtered transactions by date
  const grouped = (() => {
    const today     = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const groups    = { "Today":[], "Yesterday":[], "Earlier":[] };
    filtered.forEach(txn => {
      const d = new Date(txn.rawDate instanceof Date ? txn.rawDate : new Date());
      d.setHours(0,0,0,0);
      if (d.getTime() === today.getTime())          groups["Today"].push(txn);
      else if (d.getTime() === yesterday.getTime()) groups["Yesterday"].push(txn);
      else                                          groups["Earlier"].push(txn);
    });
    return Object.entries(groups)
      .filter(([, items]) => items.length > 0)
      .map(([date, items]) => ({ date, items }));
  })();

  const hasActiveFilter = statusFilter !== "All" || datePill || dateFrom || dateTo;

  return (
    <>
      <style>{STYLES}</style>
      <div className="hs-root">
        <div className="hs-scroll">

          <div className="hs-topbar">
            <button className="hs-back" onClick={() => navigate("/dashboard")}><BackIcon /></button>
            <span className="hs-title">Transaction History</span>
            <button
              className={`hs-filter-btn${hasActiveFilter ? " has-filter" : ""}`}
              onClick={() => setShowFilter(true)}>
              <FilterIcon /> Filter{statusFilter !== "All" ? ` • ${statusFilter}` : ""}
            </button>
          </div>

          <div className="hs-search-row">
            <div className="hs-search-wrap">
              <span className="hs-search-icon"><SearchIcon /></span>
              <input className="hs-search-input" placeholder="Search transactions"
                value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <button
              className="hs-cal-btn"
              style={{borderColor: datePill||dateFrom ? "#6A00DF" : undefined, color: datePill||dateFrom ? "#6A00DF" : undefined}}
              onClick={() => setShowCal(true)}>
              <CalIcon2 />
            </button>
          </div>

          <div className="hs-tabs-wrap">
            <div className="hs-tabs">
              {TABS.map(t => (
                <button key={t} className={`hs-tab${tab===t?" active":""}`} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{display:"flex",justifyContent:"center",padding:"60px 0"}}>
              <div style={{width:32,height:32,border:"3px solid #EDE8F8",borderTopColor:"#6A00DF",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
            </div>
          ) : grouped.length === 0 ? (
            <div className="hs-empty">
              <div className="hs-empty-icon"><HistEmptyIcon /></div>
              <div className="hs-empty-title">No transactions found</div>
              <div className="hs-empty-sub">
                {allTxns.length === 0 ? "Your transactions will appear here." : "Try a different filter or search term."}
              </div>
            </div>
          ) : (
            grouped.map(group => (
              <div className="hs-group" key={group.date}>
                <div className="hs-group-label">{group.date}</div>
                <div className="hs-group-card">
                  {group.items.map(txn => (
                    <div className="hs-txn" key={txn.id}
                      onClick={() => navigate("/transaction/receipt", { state: { txn } })}>
                      <div className="hs-txn-icon" style={{background:txn.iconBg}}>
                        {txn.iconText}
                      </div>
                      <div className="hs-txn-info">
                        <div className="hs-txn-name">{txn.name}</div>
                        <div className="hs-txn-sub">{txn.sub} • {txn.date}</div>
                      </div>
                      <div className="hs-txn-right">
                        <div className={`hs-txn-amt ${txn.type}`}>{txn.amount}</div>
                        <div className={`hs-txn-badge ${txn.status==="Successful"?"success":txn.status==="Failed"?"failed":"pending"}`}>
                          {txn.status}
                        </div>
                      </div>
                      <div className="hs-txn-arrow"><ArrowR /></div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Load More — fetches next page from Firestore */}
          {!loading && hasMore && (
            <button className="hs-load-more" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore
                ? <><div style={{width:16,height:16,border:"2.5px solid #EDE8F8",borderTopColor:"#6A00DF",borderRadius:"50%",animation:"spin .7s linear infinite"}}/> Loading...</>
                : <> Load More Transactions <ChevronDown /></>}
            </button>
          )}

        </div>

        <nav className="hs-nav">
          {NAV.map(({ label, Icon, path }) => (
            <button key={label} className={`hs-nav-item${path==="/history"?" active":""}`} onClick={() => navigate(path)}>
              <div style={{width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon active={path==="/history"} />
              </div>
              <span className="hs-nav-label">{label}</span>
            </button>
          ))}
        </nav>

        {showFilter && (
          <div className="hs-overlay" onClick={e => { if(e.target===e.currentTarget) setShowFilter(false); }}>
            <div className="hs-sheet">
              <div className="hs-sheet-drag"/>
              <div className="hs-sheet-row">
                <div className="hs-sheet-title">Filter Transactions</div>
                <button onClick={() => setShowFilter(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af",lineHeight:1}}>×</button>
              </div>
              <div className="hs-sheet-label" style={{marginBottom:10}}>By Status</div>
              <div className="hs-filter-options">
                {["All","Successful","Failed","Pending"].map(s => (
                  <button key={s} className={`hs-filter-opt${statusFilter===s?" active":""}`}
                    onClick={() => setStatusFilter(s)}>{s}</button>
                ))}
              </div>
              <div className="hs-sheet-label" style={{marginBottom:10}}>By Type</div>
              <div className="hs-filter-options">
                {TABS.map(t => (
                  <button key={t} className={`hs-filter-opt${tab===t?" active":""}`}
                    onClick={() => setTab(t)}>{t}</button>
                ))}
              </div>
              <button className="hs-sheet-apply" onClick={() => setShowFilter(false)}>Apply Filter</button>
              <button className="hs-sheet-reset" onClick={() => { setStatusFilter("All"); setTab("All"); setShowFilter(false); }}>Reset All</button>
            </div>
          </div>
        )}

        {showCal && (
          <div className="hs-overlay" onClick={e => { if(e.target===e.currentTarget) setShowCal(false); }}>
            <div className="hs-sheet">
              <div className="hs-sheet-drag"/>
              <div className="hs-sheet-row">
                <div className="hs-sheet-title">Select Date Range</div>
                <button onClick={() => setShowCal(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#9ca3af",lineHeight:1}}>×</button>
              </div>
              <div className="hs-sheet-label" style={{marginBottom:10}}>Quick Select</div>
              <div className="hs-date-pills">
                {["Today","Yesterday","Last 7 days","Last 30 days","This month"].map(p => (
                  <button key={p} className={`hs-date-pill${datePill===p?" active":""}`}
                    onClick={() => { setDatePill(p); setDateFrom(""); setDateTo(""); }}>
                    {p}
                  </button>
                ))}
              </div>
              <div className="hs-sheet-label" style={{marginBottom:10}}>Custom Range</div>
              <div className="hs-date-grid">
                <div className="hs-date-field">
                  <label>From</label>
                  <input className="hs-date-input" type="date"
                    value={dateFrom} onChange={e => { setDateFrom(e.target.value); setDatePill(""); }}/>
                </div>
                <div className="hs-date-field">
                  <label>To</label>
                  <input className="hs-date-input" type="date"
                    value={dateTo} onChange={e => { setDateTo(e.target.value); setDatePill(""); }}/>
                </div>
              </div>
              <button className="hs-sheet-apply" onClick={() => setShowCal(false)}>Apply Date Range</button>
              <button className="hs-sheet-reset" onClick={() => { setDatePill(""); setDateFrom(""); setDateTo(""); setShowCal(false); }}>Clear Date Filter</button>
            </div>
          </div>
        )}
      </div>
      <WhatsAppFloat />
    </>
  );
}
