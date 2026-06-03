import { useState, useEffect } from "react";
import WhatsAppFloat from "../components/WhatsAppFloat";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { fundWallet, getBalance, formatBalance } from "../services/walletService";
import { saveTransaction } from "../services/transactionService";
import { sendTransactionNotification } from "../services/notificationService";

const FLUTTERWAVE_PUBLIC_KEY = "FLWPUBK-b9a74771178a0275046562af8d84d013-X";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeInUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes slideUp  { from { transform:translateY(100%); } to { transform:translateY(0); } }
  @keyframes spin     { to { transform:rotate(360deg); } }
  @keyframes scaleIn  { 0%{opacity:0;transform:scale(.6)} 60%{transform:scale(1.08)} 100%{opacity:1;transform:scale(1)} }
  @keyframes pulse    { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.18);opacity:.2} }
  @keyframes shake    { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }

  .fw-root { position:fixed; inset:0; background:#f4f3f8; font-family:'Poppins',sans-serif; display:flex; flex-direction:column; overflow:hidden; }
  .fw-scroll { flex:1 1 0; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; padding-bottom:130px; }

  .fw-topbar { display:flex; align-items:center; justify-content:space-between; padding:52px 20px 16px; }
  .fw-back { width:40px; height:40px; border-radius:12px; background:#fff; border:1.5px solid #E8E4F0; display:flex; align-items:center; justify-content:center; cursor:pointer; }
  .fw-title { font-size:17px; font-weight:800; color:#111B27; }
  .fw-spacer { width:40px; }

  .fw-balance-chip { display:flex; align-items:center; justify-content:center; margin:0 20px 20px; background:#fff; border:1.5px solid #EDE8F8; border-radius:14px; padding:12px 16px; gap:8px; animation:fadeInUp .4s ease both; }
  .fw-balance-label { font-size:13px; color:#9ca3af; font-weight:500; }
  .fw-balance-amt   { font-size:15px; font-weight:800; color:#6A00DF; }

  .fw-amount-section { margin:0 20px 16px; animation:fadeInUp .4s .04s ease both; }
  .fw-amount-label { font-size:13px; font-weight:700; color:#374151; margin-bottom:10px; }
  .fw-amount-wrap { background:#fff; border:2px solid #E8E4F0; border-radius:16px; display:flex; align-items:center; padding:0 16px; transition:border-color .2s; margin-bottom:12px; }
  .fw-amount-wrap:focus-within { border-color:#6A00DF; box-shadow:0 0 0 3px rgba(106,0,223,.1); }
  .fw-amount-wrap.error { border-color:#EF4444; animation:shake .4s ease; }
  .fw-currency { font-size:22px; font-weight:800; color:#6A00DF; margin-right:8px; flex-shrink:0; }
  .fw-amount-input { flex:1; height:64px; border:none; outline:none; font-family:'Poppins',sans-serif; font-size:28px; font-weight:800; color:#111B27; background:transparent; min-width:0; }
  .fw-amount-input::placeholder { color:#D5CDF0; font-size:24px; }
  .fw-error-msg { font-size:12.5px; color:#EF4444; font-weight:600; margin-top:-6px; margin-bottom:8px; }

  .fw-presets { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:4px; }
  .fw-preset { height:44px; border-radius:12px; border:1.5px solid #E8E4F0; background:#fff; font-family:'Poppins',sans-serif; font-size:14px; font-weight:700; color:#374151; cursor:pointer; transition:all .2s; }
  .fw-preset:active { transform:scale(.95); }
  .fw-preset.active { background:#6A00DF; border-color:#6A00DF; color:#fff; box-shadow:0 4px 14px rgba(106,0,223,.25); }

  .fw-method-section { margin:16px 20px; animation:fadeInUp .4s .08s ease both; }
  .fw-method-label { font-size:13px; font-weight:700; color:#374151; margin-bottom:10px; }
  .fw-methods { display:flex; flex-direction:column; gap:8px; }
  .fw-method { display:flex; align-items:center; gap:14px; padding:14px 16px; background:#fff; border-radius:14px; border:2px solid #E8E4F0; cursor:pointer; transition:all .2s; }
  .fw-method.active { border-color:#6A00DF; background:#FDFCFF; }
  .fw-method-icon { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .fw-method-title { font-size:14px; font-weight:600; color:#111B27; }
  .fw-method-sub   { font-size:12px; color:#9ca3af; margin-top:2px; }
  .fw-method-radio { width:20px; height:20px; border-radius:50%; border:2px solid #E8E4F0; display:flex; align-items:center; justify-content:center; margin-left:auto; flex-shrink:0; transition:border-color .2s; }
  .fw-method.active .fw-method-radio { border-color:#6A00DF; }
  .fw-method-radio-dot { width:10px; height:10px; border-radius:50%; background:#6A00DF; display:none; }
  .fw-method.active .fw-method-radio-dot { display:block; }

  .fw-fee-note { margin:0 20px; background:#EDE8F8; border-radius:12px; padding:12px 14px; display:flex; align-items:flex-start; gap:8px; animation:fadeInUp .4s .1s ease both; }
  .fw-fee-text { font-size:12.5px; color:#6A00DF; font-weight:500; line-height:1.5; }

  .fw-bottom { position:fixed; bottom:0; left:0; right:0; padding:12px 20px 44px; background:#f4f3f8; border-top:1.5px solid #EDE8F8; }
  .fw-pay-btn { width:100%; height:58px; background:linear-gradient(135deg,#6A00DF,#8B3DFF); border:none; border-radius:16px; font-family:'Poppins',sans-serif; font-size:16px; font-weight:800; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 8px 24px rgba(106,0,223,.3); transition:transform .15s, opacity .15s; }
  .fw-pay-btn:active  { transform:scale(.97); }
  .fw-pay-btn:disabled { opacity:.45; cursor:not-allowed; }
  .fw-spinner { width:18px; height:18px; border:2.5px solid rgba(255,255,255,.4); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }

  .fw-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:200; animation:fadeIn .2s ease; display:flex; align-items:flex-end; }
  .fw-success-sheet { width:100%; background:#fff; border-radius:24px 24px 0 0; padding:32px 20px 52px; animation:slideUp .3s cubic-bezier(.25,.46,.45,.94); display:flex; flex-direction:column; align-items:center; }
  .fw-check-wrap { position:relative; width:80px; height:80px; display:flex; align-items:center; justify-content:center; margin-bottom:18px; }
  .fw-glow  { position:absolute; width:80px; height:80px; border-radius:50%; background:rgba(16,184,129,.15); animation:pulse 2s ease-in-out infinite; }
  .fw-glow2 { position:absolute; width:62px; height:62px; border-radius:50%; background:rgba(16,184,129,.2); animation:pulse 2s .3s ease-in-out infinite; }
  .fw-check-circle { width:56px; height:56px; border-radius:50%; background:#10B881; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 20px rgba(16,184,129,.4); animation:scaleIn .5s cubic-bezier(.34,1.56,.64,1) both; z-index:1; }
  .fw-success-amt   { font-size:32px; font-weight:800; color:#111B27; margin-bottom:6px; }
  .fw-success-title { font-size:18px; font-weight:700; color:#111B27; }
  .fw-success-sub   { font-size:13.5px; color:#9ca3af; text-align:center; margin-top:6px; line-height:1.5; }
  .fw-success-new-bal { background:#F0FDF4; border:1.5px solid #BBF7D0; border-radius:14px; padding:12px 20px; margin:18px 0; display:flex; align-items:center; justify-content:space-between; width:100%; }
  .fw-success-bal-label { font-size:13px; color:#374151; font-weight:500; }
  .fw-success-bal-amt   { font-size:16px; font-weight:800; color:#10B881; }
  .fw-success-btn { width:100%; height:54px; background:linear-gradient(135deg,#6A00DF,#8B3DFF); border:none; border-radius:14px; font-family:'Poppins',sans-serif; font-size:15px; font-weight:800; color:#fff; cursor:pointer; box-shadow:0 6px 20px rgba(106,0,223,.28); }
  .fw-success-btn2 { width:100%; height:50px; background:none; border:none; font-family:'Poppins',sans-serif; font-size:14px; font-weight:600; color:#9ca3af; cursor:pointer; margin-top:8px; }
`;

const BackIcon  = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>);
const CheckIcon = () => (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>);
const InfoIcon  = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6A00DF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>);

const PRESETS = [500, 1000, 2000, 5000, 10000, 20000];

const METHODS = [
  {
    id: "transfer",
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B881" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    iconBg: "#DCFCE7",
    title: "Bank Transfer",
    sub: "Transfer from any Nigerian bank",
    badge: "Selected"
  },
];

const formatAmount = (val) => {
  const num = parseInt(val.replace(/,/g,""), 10);
  if (isNaN(num)) return "";
  return num.toLocaleString();
};

const calcFee = (amount) => {
  if (!amount) return 0;
  const num = parseInt(amount.replace(/,/g,""), 10);
  if (isNaN(num) || num <= 0) return 0;
  let fee = num * 0.014;
  if (num > 2500) fee += 100;
  return Math.min(fee, 2000);
};

// Process a confirmed Flutterwave payment (used by both callback and redirect handler)
async function processConfirmedPayment({ uid, rawAmt, fee, txRef, transactionId, paymentType, userEmail }) {
  await fundWallet(uid, rawAmt);
  await saveTransaction(uid, {
    type:      "wallet_fund",
    network:   "Wallet",
    phone:     userEmail || "",
    amount:    rawAmt,
    fee:       Math.round(fee),
    status:    "success",
    reference: transactionId?.toString() || txRef || ("CS-FUND-" + Date.now()),
    details: {
      flw_ref:        txRef || "",
      transaction_id: transactionId || "",
      payment_type:   paymentType || "banktransfer",
    },
  });
  try {
    await sendTransactionNotification(uid, "wallet_fund", rawAmt, "Wallet", "success");
  } catch(_) {}
  localStorage.setItem("balanceUpdated", Date.now().toString());
}

export default function FundWallet() {
  const navigate   = useNavigate();
  const user       = auth.currentUser;
  const [amount,    setAmount]    = useState("");
  const [method,    setMethod]    = useState("transfer");
  const [loading,   setLoading]   = useState(false);
  const [walletBal, setWalletBal] = useState(0);
  const [newBal,    setNewBal]    = useState(0);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);
  const [paidAmt,   setPaidAmt]   = useState(0);

  // Load current balance
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getBalance(uid).then(res => { if (res.success) setWalletBal(res.balance); });
  }, []);

  // Handle Flutterwave redirect callback (?status=successful&tx_ref=...&transaction_id=...)
  // Bank transfer payments redirect back to this page instead of firing the inline callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flwStatus     = params.get("status");
    const txRef         = params.get("tx_ref");
    const transactionId = params.get("transaction_id");

    if (!flwStatus || !txRef) return;

    // Remove params from URL immediately so a reload doesn't re-process
    window.history.replaceState({}, "", window.location.pathname);

    const pendingStr = localStorage.getItem("cs_pending_fw");
    if (!pendingStr) return;
    localStorage.removeItem("cs_pending_fw");

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    if (flwStatus === "successful" || flwStatus === "completed") {
      const pending = JSON.parse(pendingStr);
      const rawAmt  = pending.amount;
      const fee     = pending.fee;

      setLoading(true);

      processConfirmedPayment({
        uid,
        rawAmt,
        fee,
        txRef,
        transactionId,
        paymentType: "banktransfer",
        userEmail: auth.currentUser?.email || "",
      }).then(async () => {
        const balRes     = await getBalance(uid);
        const updatedBal = balRes.success ? balRes.balance : walletBal + rawAmt;
        setNewBal(updatedBal);
        setWalletBal(updatedBal);
        setLoading(false);
        setPaidAmt(rawAmt);
        setSuccess(true);
      }).catch(err => {
        console.error("Redirect payment processing error:", err);
        setLoading(false);
        setError("Payment received but wallet update failed. Contact support with ref: " + txRef);
      });
    } else {
      setError("Payment was not completed. Status: " + flwStatus + ". Try again.");
    }
  }, []);

  const rawAmount = parseInt((amount || "0").replace(/,/g,""), 10);
  const fee       = calcFee(amount);
  const total     = rawAmount + Math.round(fee);
  const isValid   = rawAmount >= 100;

  const handleAmount = (val) => {
    const digits = val.replace(/[^0-9]/g,"");
    setAmount(formatAmount(digits));
    setError("");
  };

  const handlePreset = (val) => {
    setAmount(val.toLocaleString());
    setError("");
  };

  const launchFlutterwave = (rawAmt) => {
    window.FlutterwaveCheckout({
      public_key:      FLUTTERWAVE_PUBLIC_KEY,
      tx_ref:          "CS-" + Date.now(),
      amount:          rawAmt,
      currency:        "NGN",
      payment_options: "banktransfer",
      // Use clean pathname so redirect lands back here without stale params
      redirect_url:    window.location.origin + window.location.pathname,
      customer: {
        email: user?.email || "support@classicswiftt.com",
        name:  user?.displayName || "Customer",
      },
      customizations: {
        title:       "ClassicSwift",
        description: "Wallet Funding",
      },
      callback: async (response) => {
        // This fires for card payments; bank transfers use redirect_url instead
        if (response.status === "successful" || response.status === "completed") {
          const uid = auth.currentUser?.uid;
          if (uid) {
            // Clear pending since we're handling it here
            localStorage.removeItem("cs_pending_fw");

            await processConfirmedPayment({
              uid,
              rawAmt,
              fee,
              txRef:         response.flw_ref || "",
              transactionId: response.transaction_id?.toString() || "",
              paymentType:   response.payment_type || "banktransfer",
              userEmail:     user?.email || "",
            });

            const balRes     = await getBalance(uid);
            const updatedBal = balRes.success ? balRes.balance : walletBal + rawAmt;
            setNewBal(updatedBal);
            setWalletBal(updatedBal);
          }
          setLoading(false);
          setPaidAmt(rawAmt);
          setSuccess(true);
        } else {
          localStorage.removeItem("cs_pending_fw");
          setLoading(false);
          setError("Payment was not completed. Try again.");
        }
      },
      onclose: () => {
        // Don't clear loading here — bank transfer redirect may still be incoming
        // Only stop loading if no pending transaction
        const pending = localStorage.getItem("cs_pending_fw");
        if (!pending) setLoading(false);
      },
    });
  };

  const handlePay = () => {
    if (!isValid) { setError("Minimum amount is ₦100"); return; }
    if (rawAmount > 1000000) { setError("Maximum amount is ₦1,000,000"); return; }
    setLoading(true);
    setError("");

    // Save pending tx BEFORE launching so redirect handler can recover it
    localStorage.setItem("cs_pending_fw", JSON.stringify({ amount: rawAmount, fee }));

    const old = document.getElementById("flw-script");
    if (old) old.remove();
    delete window.FlutterwaveCheckout;

    const script    = document.createElement("script");
    script.id       = "flw-script";
    script.src      = "https://checkout.flutterwave.com/v3.js";
    script.onload   = () => launchFlutterwave(rawAmount);
    script.onerror  = () => {
      localStorage.removeItem("cs_pending_fw");
      setLoading(false);
      setError("Payment service unavailable. Check your connection.");
    };
    document.body.appendChild(script);
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="fw-root">
        <div className="fw-scroll">

          <div className="fw-topbar">
            <button className="fw-back" onClick={() => navigate("/dashboard")}><BackIcon /></button>
            <span className="fw-title">Fund Wallet</span>
            <div className="fw-spacer"/>
          </div>

          <div className="fw-balance-chip">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6A00DF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>
            <span className="fw-balance-label">Current Balance:</span>
            <span className="fw-balance-amt">₦{formatBalance(walletBal)}</span>
          </div>

          <div className="fw-amount-section">
            <div className="fw-amount-label">Enter Amount</div>
            <div className={`fw-amount-wrap${error?" error":""}`}>
              <span className="fw-currency">₦</span>
              <input className="fw-amount-input" type="text" inputMode="numeric"
                placeholder="0.00" value={amount}
                onChange={e => handleAmount(e.target.value)}/>
            </div>
            {error && <div className="fw-error-msg">⚠ {error}</div>}
            <div className="fw-presets">
              {PRESETS.map(p => (
                <button key={p}
                  className={`fw-preset${rawAmount===p?" active":""}`}
                  onClick={() => handlePreset(p)}>
                  ₦{p.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="fw-method-section">
            <div className="fw-method-label">Payment Method</div>
            <div className="fw-methods">
              {METHODS.map(m => (
                <div key={m.id} className={`fw-method${method===m.id?" active":""}`}
                  onClick={() => setMethod(m.id)}>
                  <div className="fw-method-icon" style={{background:m.iconBg}}>{m.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div className="fw-method-title">{m.title}</div>
                      {m.badge && <span style={{fontSize:11,fontWeight:700,color:"#10B881",background:"#DCFCE7",borderRadius:6,padding:"2px 8px"}}>{m.badge}</span>}
                    </div>
                    <div className="fw-method-sub">{m.sub}</div>
                  </div>
                  <div className="fw-method-radio">
                    <div className="fw-method-radio-dot"/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isValid && (
            <div className="fw-fee-note">
              <div style={{flexShrink:0,marginTop:1}}><InfoIcon /></div>
              <div className="fw-fee-text">
                Flutterwave fee: <strong>₦{Math.round(fee).toLocaleString()}</strong> · You will be charged <strong>₦{total.toLocaleString()}</strong> total. ₦{rawAmount.toLocaleString()} will be credited to your wallet.
              </div>
            </div>
          )}

        </div>

        <div className="fw-bottom">
          <button className="fw-pay-btn" onClick={handlePay} disabled={!isValid || loading}>
            {loading
              ? <><div className="fw-spinner"/> Processing...</>
              : isValid
              ? `Fund ₦${rawAmount.toLocaleString()} → Pay ₦${total.toLocaleString()}`
              : "Enter an Amount to Continue"
            }
          </button>
        </div>

        {success && (
          <div className="fw-overlay">
            <div className="fw-success-sheet">
              <div className="fw-check-wrap">
                <div className="fw-glow"/><div className="fw-glow2"/>
                <div className="fw-check-circle"><CheckIcon /></div>
              </div>
              <div className="fw-success-amt">₦{paidAmt.toLocaleString()}</div>
              <div className="fw-success-title">Wallet Funded!</div>
              <div className="fw-success-sub">Your wallet has been credited successfully. Your new balance is ready to use.</div>
              <div className="fw-success-new-bal">
                <span className="fw-success-bal-label">New Balance</span>
                <span className="fw-success-bal-amt">₦{formatBalance(newBal)}</span>
              </div>
              <button className="fw-success-btn" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </button>
              <button className="fw-success-btn2" onClick={() => { setSuccess(false); setAmount(""); }}>
                Fund Again
              </button>
            </div>
          </div>
        )}

      </div>
      <WhatsAppFloat />
    </>
  );
}
