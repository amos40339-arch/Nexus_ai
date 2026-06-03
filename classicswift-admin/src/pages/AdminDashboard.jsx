import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState({ users:0, revenue:0, txns:0, failed:0 });
  const [txns,    setTxns]    = useState([]);
  const [users,   setUsers]   = useState([]);
  const [nets,    setNets]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const usersData = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const txnSnap = await getDocs(query(collection(db, "transactions"), orderBy("createdAt","desc"), limit(50)));
        const txnData = txnSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const rev    = txnData.filter(t=>t.status==="success").reduce((s,t)=>s+(t.amount||0),0);
        const failed = txnData.filter(t=>t.status==="failed").length;
        setStats({ users: usersData.length, revenue: rev, txns: txnData.length, failed });
        setTxns(txnData.slice(0,5));
        setUsers(usersData.slice(0,3));

        const nc = {};
        txnData.forEach(t => {
          const nKey = typeof t.network==='object'?(t.network?.name||t.network?.text||null):t.network;
          if (nKey && nKey !== "—") nc[nKey] = (nc[nKey]||0)+1;
        });
        const tot = Object.values(nc).reduce((s,v)=>s+v,0);
        setNets(Object.entries(nc).map(([n,c])=>({ n, pct: tot>0?Math.round(c/tot*100):0 })).sort((a,b)=>b.pct-a.pct));
      } catch(e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const fmtTime = ts => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
  };

  const getBalance = (u) => u.balance ?? u.walletBalance ?? 0;

  const NET_COLORS = { MTN:"#FFC107", AIR:"#EF4444", GLO:"#10B881", "9MB":"#6A00DF" };

  const s = `
    @keyframes fadeInUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .ds{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;animation:fadeInUp .4s ease both}
    @media(min-width:768px){.ds{grid-template-columns:repeat(4,1fr)}}
    .dc{background:#1A1D27;border:1px solid #2A2D3A;border-radius:16px;padding:16px}
    .dv{font-size:22px;font-weight:800;color:#fff;margin-bottom:4px}
    .dl{font-size:12px;color:#6b7280}
    .dg{display:grid;grid-template-columns:1fr;gap:16px;margin-bottom:24px;animation:fadeInUp .4s .06s ease both}
    @media(min-width:768px){.dg{grid-template-columns:1.4fr 1fr}}
    .ca{background:#1A1D27;border:1px solid #2A2D3A;border-radius:16px;padding:20px}
    .ch{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
    .ct{font-size:15px;font-weight:700;color:#fff}
    .cb{font-size:12.5px;font-weight:600;color:#6A00DF;background:none;border:none;cursor:pointer;font-family:'Poppins',sans-serif}
    .tr{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #2A2D3A}
    .tr:last-child{border-bottom:none}
    .ti{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0}
    .tn{font-size:13px;font-weight:600;color:#fff}
    .td{font-size:11.5px;color:#6b7280;margin-top:2px}
    .tbg{font-size:10.5px;font-weight:600;border-radius:999px;padding:2px 8px;margin-top:3px;display:inline-block}
    .tbg.success{background:rgba(16,184,129,.15);color:#10B881}
    .tbg.failed{background:rgba(239,68,68,.15);color:#EF4444}
    .ta{font-size:13px;font-weight:700;margin-left:auto;flex-shrink:0}
    .ta.c{color:#10B881}
    .nr{display:flex;align-items:center;gap:12px;margin-bottom:12px}
    .nr:last-child{margin-bottom:0}
    .nn{font-size:13px;font-weight:600;color:#fff;width:60px;flex-shrink:0}
    .nb{flex:1;height:8px;background:#2A2D3A;border-radius:999px;overflow:hidden}
    .nf{height:100%;border-radius:999px}
    .np{font-size:12px;font-weight:700;color:#9ca3af;width:36px;text-align:right;flex-shrink:0}
    .ur{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #2A2D3A}
    .ur:last-child{border-bottom:none}
    .ua{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6A00DF,#8B3DFF);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;flex-shrink:0}
    .uname{font-size:13px;font-weight:600;color:#fff}
    .uemail{font-size:11.5px;color:#6b7280;margin-top:1px}
    .ubal{font-size:13px;font-weight:700;color:#6A00DF;margin-left:auto;flex-shrink:0}
    .ld{display:flex;justify-content:center;padding:40px 0}
    .sp{width:28px;height:28px;border:3px solid #2A2D3A;border-top-color:#6A00DF;border-radius:50%;animation:spin .7s linear infinite}
    .em{text-align:center;padding:24px;color:#6b7280;font-size:13px}
  `;

  return (
    <Layout title="Dashboard" subtitle={new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}>
      <style>{s}</style>

      <div className="ds">
        {[
          { val: stats.users.toLocaleString(),                    label:"Total Users"   },
          { val: `₦${(stats.revenue/1000).toFixed(1)}k`,         label:"Total Revenue" },
          { val: stats.txns.toLocaleString(),                     label:"Transactions"  },
          { val: stats.failed.toLocaleString(),                   label:"Failed Txns"   },
        ].map((s,i) => (
          <div className="dc" key={i}>
            <div className="dv">{s.val}</div>
            <div className="dl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="dg">
        <div className="ca">
          <div className="ch">
            <div className="ct">Recent Transactions</div>
            <button className="cb" onClick={()=>navigate("/transactions")}>View all</button>
          </div>
          {loading ? <div className="ld"><div className="sp"/></div>
          : txns.length === 0 ? <div className="em">No transactions yet</div>
          : txns.map((t,i) => (
            <div className="tr" key={i}>
              {(() => {
                const nName = typeof t.network==='object'?(t.network?.name||t.network?.text||"—"):(t.network||"—");
                return <div className="ti" style={{background:NET_COLORS[nName]||"#10B881"}}>{nName}</div>;
              })()}
              <div>
                <div className="tn">{t.type==="wallet_fund"?"Wallet Funded":`${t.network||""} ${t.type||""}`}</div>
                <div className="td">{fmtTime(t.createdAt)}</div>
                <div className={`tbg ${t.status}`}>{t.status==="success"?"Successful":"Failed"}</div>
              </div>
              <div className={`ta${t.type==="wallet_fund"?" c":""}`} style={{marginLeft:"auto"}}>
                {t.type==="wallet_fund"?"+":"-"}₦{(t.amount||0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div className="ca">
            <div className="ch"><div className="ct">Network Breakdown</div></div>
            {loading ? <div className="ld"><div className="sp"/></div>
            : nets.length === 0 ? <div className="em">No data yet</div>
            : nets.map((n,i) => (
              <div className="nr" key={i}>
                <div className="nn">{n.n}</div>
                <div className="nb"><div className="nf" style={{width:`${n.pct}%`,background:NET_COLORS[n.n]||"#6b7280"}}/></div>
                <div className="np">{n.pct}%</div>
              </div>
            ))}
          </div>

          <div className="ca">
            <div className="ch">
              <div className="ct">Recent Users</div>
              <button className="cb" onClick={()=>navigate("/users")}>View all</button>
            </div>
            {loading ? <div className="ld"><div className="sp"/></div>
            : users.length === 0 ? <div className="em">No users yet</div>
            : users.map((u,i) => (
              <div className="ur" key={i}>
                <div className="ua">{(u.name||u.email||"U").charAt(0).toUpperCase()}</div>
                <div>
                  <div className="uname">{u.name||"Unknown"}</div>
                  <div className="uemail">{u.email}</div>
                </div>
                <div className="ubal">₦{getBalance(u).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
