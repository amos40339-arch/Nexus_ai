import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, addDoc, serverTimestamp, getDoc, increment } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";

const FLW_PROXY = "https://pointly.com.ng/api/flw_verify.php?token=pL9mK2xQ7nR4wB8vT3";

const STYLES = `
  @keyframes fadeInUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin { to{transform:rotate(360deg)} }

  .at-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:16px; animation:fadeInUp .4s ease both; }
  .at-sum-card { background:#1A1D27; border:1px solid #2A2D3A; border-radius:12px; padding:14px 12px; display:flex; align-items:center; gap:10px; }
  .at-sum-icon { width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .at-sum-val   { font-size:15px; font-weight:800; color:#fff; }
  .at-sum-label { font-size:11px; color:#6b7280; margin-top:2px; }

  .at-toolbar { display:flex; align-items:center; gap:10px; margin-bottom:12px; flex-wrap:wrap; }
  .at-search-wrap { flex:1; min-width:180px; display:flex; align-items:center; background:#1A1D27; border:1px solid #2A2D3A; border-radius:12px; padding:0 14px; }
  .at-search-wrap:focus-within { border-color:#6A00DF; }
  .at-search-icon { color:#6b7280; margin-right:10px; flex-shrink:0; display:flex; align-items:center; }
  .at-search-input { flex:1; height:44px; border:none; outline:none; font-family:'Poppins',sans-serif; font-size:14px; color:#fff; background:transparent; }
  .at-search-input::placeholder { color:#4B5563; }

  .at-tabs { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; -ms-overflow-style:none; scrollbar-width:none; margin-bottom:12px; }
  .at-tabs::-webkit-scrollbar { display:none; }
  .at-tab { height:34px; border-radius:999px; border:1px solid #2A2D3A; background:#1A1D27; font-family:'Poppins',sans-serif; font-size:12.5px; font-weight:600; color:#9ca3af; cursor:pointer; padding:0 14px; white-space:nowrap; flex-shrink:0; transition:all .2s; }
  .at-tab.active { background:#6A00DF; border-color:#6A00DF; color:#fff; }

  .at-cards { display:flex; flex-direction:column; gap:10px; animation:fadeInUp .4s .06s ease both; }
  .at-card { background:#1A1D27; border:1px solid #2A2D3A; border-radius:14px; padding:14px 16px; }
  .at-card-top { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
  .at-txn-icon { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:900; color:#fff; flex-shrink:0; }
  .at-txn-name { font-size:14px; font-weight:700; color:#fff; }
  .at-txn-type { font-size:12px; color:#6b7280; margin-top:2px; }
  .at-card-body { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .at-field { display:flex; flex-direction:column; gap:3px; }
  .at-field-label { font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.4px; }
  .at-field-value { font-size:13.5px; font-weight:600; color:#fff; }
  .at-field-value.purple { color:#6A00DF; }
  .at-card-footer { display:flex; align-items:center; justify-content:space-between; margin-top:12px; padding-top:12px; border-top:1px solid #2A2D3A; }
  .at-date { font-size:12px; color:#6b7280; }
  .at-badge { font-size:11.5px; font-weight:700; border-radius:999px; padding:3px 10px; }
  .at-badge.success { background:rgba(16,184,129,.15); color:#10B881; }
  .at-badge.failed  { background:rgba(239,68,68,.15); color:#EF4444; }
  .at-badge.pending { background:rgba(245,158,11,.15); color:#F59E0B; }
  .at-id { font-size:11px; color:#6b7280; }

  .at-loading { display:flex; justify-content:center; padding:60px 0; }
  .at-spinner { width:28px; height:28px; border:3px solid #2A2D3A; border-top-color:#6A00DF; border-radius:50%; animation:spin .7s linear infinite; }
  .at-empty { text-align:center; padding:40px 20px; color:#6b7280; font-size:13.5px; }

  /* Manual Credit Tool */
  .mc-box { background:#1A1D27; border:1px solid #6A00DF40; border-radius:16px; padding:20px; margin-bottom:20px; animation:fadeInUp .4s ease both; }
  .mc-title { font-size:15px; font-weight:800; color:#fff; margin-bottom:4px; }
  .mc-sub { font-size:12px; color:#6b7280; margin-bottom:16px; }
  .mc-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; }
  .mc-field { display:flex; flex-direction:column; gap:6px; }
  .mc-label { font-size:11px; font-weight:600; color:#9ca3af; text-transform:uppercase; letter-spacing:.4px; }
  .mc-input { height:44px; background:#0F1117; border:1px solid #2A2D3A; border-radius:10px; padding:0 14px; font-family:'Poppins',sans-serif; font-size:13px; color:#fff; outline:none; }
  .mc-input:focus { border-color:#6A00DF; }
  .mc-input::placeholder { color:#4B5563; }
  .mc-actions { display:flex; gap:10px; margin-top:14px; }
  .mc-btn { height:44px; border-radius:12px; border:none; font-family:'Poppins',sans-serif; font-size:13px; font-weight:700; cursor:pointer; padding:0 20px; transition:opacity .2s; }
  .mc-btn:disabled { opacity:.4; cursor:not-allowed; }
  .mc-btn-verify { background:linear-gradient(135deg,#6A00DF,#8B3DFF); color:#fff; }
  .mc-btn-credit { background:rgba(16,184,129,.2); color:#10B881; border:1px solid #10B88140; }
  .mc-result { margin-top:14px; border-radius:12px; padding:14px; font-size:13px; }
  .mc-result.ok  { background:rgba(16,184,129,.1); border:1px solid #10B88130; color:#10B881; }
  .mc-result.err { background:rgba(239,68,68,.1);  border:1px solid #EF444430; color:#EF4444; }
  .mc-result.info{ background:rgba(106,0,223,.1);  border:1px solid #6A00DF30; color:#a78bfa; }
  .mc-result-row { display:flex; justify-content:space-between; margin-bottom:6px; }
  .mc-result-key { color:#9ca3af; }
  .mc-result-val { font-weight:700; color:#fff; }
`;

const NETWORK_COLORS = { MTN:"#FFC107", AIR:"#EF4444", GLO:"#10B881", "9MB":"#6A00DF" };
const TABS = ["All","airtime","data","wallet_fund","bill"];
const TAB_LABELS = { All:"All", airtime:"Airtime", data:"Data", wallet_fund:"Wallet", bill:"Bills" };

function ManualCreditTool({ users }) {
  const [txnId,    setTxnId]    = useState("");
  const [txRef,    setTxRef]    = useState("");
  const [userId,   setUserId]   = useState("");
  const [verifying, setVerifying] = useState(false);
  const [crediting, setCrediting] = useState(false);
  const [result,   setResult]   = useState(null);
  const [verified, setVerified] = useState(null);

  const userOptions = Object.entries(users).map(([id, u]) => ({
    id, label: u.name || u.email || id
  }));

  const handleVerify = async () => {
    if (!txnId.trim() && !txRef.trim()) return;
    setVerifying(true);
    setResult(null);
    setVerified(null);
    try {
      const params = txnId.trim()
        ? `&transaction_id=${encodeURIComponent(txnId.trim())}`
        : `&tx_ref=${encodeURIComponent(txRef.trim())}`;
      const res  = await fetch(`${FLW_PROXY}${params}`);
      const data = await res.json();
      if (data.status === "success" && data.data) {
        const d = data.data;
        setVerified({
          amount:    d.amount,
          currency:  d.currency,
          status:    d.status,
          email:     d.customer?.email || "—",
          ref:       d.tx_ref || "—",
          flwRef:    d.flw_ref || "—",
          createdAt: d.created_at || "—",
        });
        setResult({ type: "ok", msg: `Payment verified: ₦${d.amount} — ${d.status}` });
      } else {
        setResult({ type: "err", msg: data.message || "Verification failed" });
      }
    } catch (e) {
      setResult({ type: "err", msg: "Network error: " + e.message });
    }
    setVerifying(false);
  };

  const handleCredit = async () => {
    if (!verified || !userId) {
      setResult({ type: "err", msg: "Select a user first" });
      return;
    }
    if (verified.status !== "successful") {
      setResult({ type: "err", msg: `Cannot credit — payment status is "${verified.status}", not "successful"` });
      return;
    }
    setCrediting(true);
    try {
      const userRef  = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) { setResult({ type: "err", msg: "User not found in Firebase" }); setCrediting(false); return; }

      const creditAmount   = Number(verified.amount);

      await updateDoc(userRef, {
        balance:       increment(creditAmount),
        walletBalance: increment(creditAmount),
      });

      await addDoc(collection(db, "transactions"), {
        userId:    userId,
        type:      "wallet_fund",
        amount:    creditAmount,
        fee:       0,
        status:    "success",
        reference: verified.ref || "MANUAL-" + txnId,
        details:   { flwTransactionId: txnId, manualCredit: true, verifiedAt: new Date().toISOString() },
        network:   "",
        phone:     "",
        createdAt: serverTimestamp(),
      });

      setResult({
        type: "ok",
        msg:  `✓ Wallet credited ₦${creditAmount.toLocaleString()} successfully.`
      });
      setVerified(null);
      setTxnId("");
      setUserId("");
    } catch (e) {
      setResult({ type: "err", msg: "Credit failed: " + e.message });
    }
    setCrediting(false);
  };

  return (
    <div className="mc-box">
      <div className="mc-title">Manual Payment Credit</div>
      <div className="mc-sub">For users who paid via Flutterwave but wallet was not credited</div>

      <div className="mc-row">
        <div className="mc-field">
          <div className="mc-label">Transaction ID <span style={{color:"#4B5563",fontWeight:400}}>or</span> Reference</div>
          <input className="mc-input" placeholder="Transaction ID (e.g. 12345678)"
            value={txnId} onChange={e => { setTxnId(e.target.value); if(e.target.value) setTxRef(""); }} />
          <input className="mc-input" placeholder="Reference (e.g. CS-1234567890-1234)" style={{marginTop:6}}
            value={txRef} onChange={e => { setTxRef(e.target.value); if(e.target.value) setTxnId(""); }} />
        </div>
        <div className="mc-field">
          <div className="mc-label">Select User</div>
          <select className="mc-input" value={userId} onChange={e => setUserId(e.target.value)}
            style={{cursor:"pointer"}}>
            <option value="">— Select user —</option>
            {userOptions.map(u => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mc-actions">
        <button className="mc-btn mc-btn-verify" onClick={handleVerify}
          disabled={(!txnId.trim() && !txRef.trim()) || verifying}>
          {verifying ? "Verifying..." : "🔍 Verify Payment"}
        </button>
        {verified && (
          <button className="mc-btn mc-btn-credit" onClick={handleCredit}
            disabled={crediting || !userId}>
            {crediting ? "Crediting..." : `✓ Credit ₦${Number(verified.amount).toLocaleString()}`}
          </button>
        )}
      </div>

      {verified && (
        <div className="mc-result info">
          <div className="mc-result-row"><span className="mc-result-key">Amount</span><span className="mc-result-val">₦{Number(verified.amount).toLocaleString()} {verified.currency}</span></div>
          <div className="mc-result-row"><span className="mc-result-key">Status</span><span className="mc-result-val">{verified.status}</span></div>
          <div className="mc-result-row"><span className="mc-result-key">Customer</span><span className="mc-result-val">{verified.email}</span></div>
          <div className="mc-result-row"><span className="mc-result-key">Reference</span><span className="mc-result-val">{verified.ref}</span></div>
          <div className="mc-result-row"><span className="mc-result-key">Date</span><span className="mc-result-val">{verified.createdAt}</span></div>
        </div>
      )}

      {result && !verified && (
        <div className={`mc-result ${result.type}`}>{result.msg}</div>
      )}
    </div>
  );
}

export default function AdminTransactions() {
  const [txns,    setTxns]    = useState([]);
  const [users,   setUsers]   = useState({});
  const [search,  setSearch]  = useState("");
  const [tab,     setTab]     = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const usersMap  = {};
        usersSnap.docs.forEach(d => { usersMap[d.id] = d.data(); });
        setUsers(usersMap);

        const txnSnap = await getDocs(query(
          collection(db, "transactions"),
          orderBy("createdAt", "desc"),
          limit(100)
        ));
        setTxns(txnSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = txns.filter(t => {
    const matchTab    = tab === "All" || t.type === tab;
    const userName    = users[t.userId]?.name || users[t.userId]?.email || "";
    const matchSearch = !search || userName.toLowerCase().includes(search.toLowerCase()) || (t.reference||"").toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const totalVol = txns.filter(t=>t.status==="success"&&t.type!=="wallet_fund").reduce((s,t)=>s+(t.amount||0),0);
  const success  = txns.filter(t=>t.status==="success").length;
  const failed   = txns.filter(t=>t.status==="failed").length;

  const formatTime = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" });
  };

  return (
    <Layout title="Transactions" subtitle="All platform transactions">
      <style>{STYLES}</style>

      <ManualCreditTool users={users} />

      <div className="at-summary">
        <div className="at-sum-card">
          <div className="at-sum-icon" style={{background:"rgba(106,0,223,.15)"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6A00DF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/><path d="M6 4l12 16M18 4L6 20"/></svg>
          </div>
          <div>
            <div className="at-sum-val">₦{totalVol >= 1000 ? (totalVol/1000).toFixed(1)+"k" : totalVol}</div>
            <div className="at-sum-label">Volume</div>
          </div>
        </div>
        <div className="at-sum-card">
          <div className="at-sum-icon" style={{background:"rgba(16,184,129,.15)"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B881" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <div className="at-sum-val">{success}</div>
            <div className="at-sum-label">Success</div>
          </div>
        </div>
        <div className="at-sum-card">
          <div className="at-sum-icon" style={{background:"rgba(239,68,68,.15)"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <div>
            <div className="at-sum-val">{failed}</div>
            <div className="at-sum-label">Failed</div>
          </div>
        </div>
      </div>

      <div className="at-toolbar">
        <div className="at-search-wrap">
          <div className="at-search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <input className="at-search-input" placeholder="Search user or reference..."
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      <div className="at-tabs">
        {TABS.map(t=>(
          <button key={t} className={`at-tab${tab===t?" active":""}`} onClick={()=>setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="at-loading"><div className="at-spinner"/></div>
      ) : filtered.length === 0 ? (
        <div className="at-empty">{txns.length === 0 ? "No transactions yet" : "No transactions match your filter"}</div>
      ) : (
        <div className="at-cards">
          {filtered.map((t,i) => {
            const user     = users[t.userId];
            const userName = user?.name || user?.email || "Unknown";
            const netName  = typeof t.network === 'object' ? (t.network?.name || t.network?.text || "—") : (t.network || "—");
            const iconBg   = NETWORK_COLORS[netName] || "#10B881";
            return (
              <div className="at-card" key={i}>
                <div className="at-card-top">
                  <div className="at-txn-icon" style={{background:iconBg}}>{netName}</div>
                  <div>
                    <div className="at-txn-name">{userName}</div>
                    <div className="at-txn-type">{TAB_LABELS[t.type] || t.type}</div>
                  </div>
                </div>
                <div className="at-card-body">
                  <div className="at-field">
                    <div className="at-field-label">Amount</div>
                    <div className="at-field-value purple">₦{(t.amount||0).toLocaleString()}</div>
                  </div>
                  <div className="at-field">
                    <div className="at-field-label">Network</div>
                    <div className="at-field-value">{netName}</div>
                  </div>
                  <div className="at-field">
                    <div className="at-field-label">Phone</div>
                    <div className="at-field-value" style={{fontSize:12}}>{t.phone||"—"}</div>
                  </div>
                  <div className="at-field">
                    <div className="at-field-label">Status</div>
                    <span className={`at-badge ${t.status||"pending"}`}>{t.status||"pending"}</span>
                  </div>
                </div>
                <div className="at-card-footer">
                  <div>
                    <div className="at-id">{(t.reference||t.id||"").slice(0,20)}</div>
                    <div className="at-date">{formatTime(t.createdAt)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
