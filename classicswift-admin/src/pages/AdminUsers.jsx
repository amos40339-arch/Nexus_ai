import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";

const STYLES = `
  @keyframes fadeInUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin { to{transform:rotate(360deg)} }

  .au-toolbar { display:flex; align-items:center; gap:10px; margin-bottom:16px; animation:fadeInUp .4s ease both; flex-wrap:wrap; }
  .au-search-wrap { flex:1; min-width:200px; display:flex; align-items:center; background:#1A1D27; border:1px solid #2A2D3A; border-radius:12px; padding:0 14px; transition:border-color .2s; }
  .au-search-wrap:focus-within { border-color:#6A00DF; }
  .au-search-icon { color:#6b7280; margin-right:10px; flex-shrink:0; display:flex; align-items:center; }
  .au-search-input { flex:1; height:44px; border:none; outline:none; font-family:'Poppins',sans-serif; font-size:14px; color:#fff; background:transparent; }
  .au-search-input::placeholder { color:#4B5563; }

  .au-count { font-size:13px; color:#6b7280; margin-bottom:12px; }
  .au-cards { display:flex; flex-direction:column; gap:10px; animation:fadeInUp .4s .04s ease both; }
  .au-card { background:#1A1D27; border:1px solid #2A2D3A; border-radius:14px; padding:16px; }
  .au-card-top { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
  .au-avatar { width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,#6A00DF,#8B3DFF); display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:800; color:#fff; flex-shrink:0; }
  .au-user-name  { font-size:14px; font-weight:700; color:#fff; }
  .au-user-email { font-size:12px; color:#6b7280; margin-top:2px; }
  .au-card-body { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .au-field { display:flex; flex-direction:column; gap:3px; }
  .au-field-label { font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.4px; }
  .au-field-value { font-size:13.5px; font-weight:600; color:#fff; }
  .au-field-value.purple { color:#6A00DF; }
  .au-card-footer { margin-top:12px; padding-top:12px; border-top:1px solid #2A2D3A; display:flex; justify-content:space-between; align-items:center; }
  .au-joined { font-size:12px; color:#6b7280; }

  .au-loading { display:flex; justify-content:center; padding:60px 0; }
  .au-spinner { width:28px; height:28px; border:3px solid #2A2D3A; border-top-color:#6A00DF; border-radius:50%; animation:spin .7s linear infinite; }
  .au-empty { text-align:center; padding:60px 20px; color:#6b7280; font-size:13.5px; }
`;

const getBalance = (u) => Number(u.balance ?? u.walletBalance ?? 0) || 0;

export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(collection(db, "users")).then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a,b) => {
        const ta = a.createdAt?.toDate?.() || new Date(0);
        const tb = b.createdAt?.toDate?.() || new Date(0);
        return tb - ta;
      });
      setUsers(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.name||"").toLowerCase().includes(q) || (u.email||"").toLowerCase().includes(q);
  });

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  };

  return (
    <Layout title="Users" subtitle={`${users.length} total registered users`}>
      <style>{STYLES}</style>

      <div className="au-toolbar">
        <div className="au-search-wrap">
          <div className="au-search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <input className="au-search-input" placeholder="Search by name or email..."
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      {loading ? (
        <div className="au-loading"><div className="au-spinner"/></div>
      ) : filtered.length === 0 ? (
        <div className="au-empty">{users.length === 0 ? "No users registered yet" : "No users match your search"}</div>
      ) : (
        <>
          <div className="au-count">Showing {filtered.length} of {users.length} users</div>
          <div className="au-cards">
            {filtered.map((u,i) => (
              <div className="au-card" key={i}>
                <div className="au-card-top">
                  <div className="au-avatar">{(u.name||u.email||"U").charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="au-user-name">{u.name||"Unknown"}</div>
                    <div className="au-user-email">{u.email}</div>
                  </div>
                </div>
                <div className="au-card-body">
                  <div className="au-field">
                    <div className="au-field-label">Balance</div>
                    <div className="au-field-value purple">₦{getBalance(u).toLocaleString()}</div>
                  </div>
                  <div className="au-field">
                    <div className="au-field-label">Cashback</div>
                    <div className="au-field-value">₦{(u.cashback||0).toLocaleString()}</div>
                  </div>
                  <div className="au-field">
                    <div className="au-field-label">Phone</div>
                    <div className="au-field-value" style={{fontSize:12}}>{u.phone||"—"}</div>
                  </div>
                  <div className="au-field">
                    <div className="au-field-label">Provider</div>
                    <div className="au-field-value" style={{textTransform:"capitalize"}}>{u.provider||"email"}</div>
                  </div>
                </div>
                <div className="au-card-footer">
                  <span className="au-joined">Joined {formatDate(u.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}
