import {
  collection, addDoc, getDocs, query,
  where, orderBy, limit, startAfter, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";

export const saveTransaction = async (uid, data) => {
  try {
    const ref = await addDoc(collection(db, "transactions"), {
      userId:    uid,
      type:      data.type,
      network:   data.network  || "",
      phone:     data.phone    || "",
      amount:    data.amount,
      fee:       data.fee      || 0,
      status:    data.status   || "success",
      reference: data.reference || generateRef(),
      details:   data.details  || {},
      createdAt: serverTimestamp(),
    });
    return { success: true, id: ref.id };
  } catch (err) {
    console.error("saveTransaction error:", err);
    return { success: false, error: err.message };
  }
};

// Paginated fetch — pass lastDoc from previous call to get next page
export const getUserTransactions = async (uid, limitCount = 20, lastDoc = null) => {
  try {
    let q = query(
      collection(db, "transactions"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    if (lastDoc) q = query(
      collection(db, "transactions"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const txns = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || new Date(),
    }));
    return {
      success: true,
      data:    txns,
      lastDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === limitCount,
    };
  } catch (err) {
    console.error("getUserTransactions error:", err);
    return { success: false, error: err.message, data: [], lastDoc: null, hasMore: false };
  }
};

export const getRecentTransactions = async (uid) => {
  return getUserTransactions(uid, 3);
};

export const formatTransaction = (txn) => {
  const typeMap = {
    airtime:     { name:"Airtime Purchase", icon:"AIR", color:"#FFC107", category:"Airtime"   },
    data:        { name:"Data Purchase",    icon:"DAT", color:"#FFC107", category:"Data"      },
    bill:        { name:"Bill Payment",     icon:"⚡",  color:"#3B82F6", category:"Bills"     },
    wallet_fund: { name:"Wallet Funded",    icon:"↑",   color:"#10B881", category:"Top up"    },
    transfer:    { name:"Bank Transfer",    icon:"→",   color:"#6A00DF", category:"Transfers" },
  };

  const meta = typeMap[txn.type] || typeMap.airtime;

  const networkStr = txn.network && typeof txn.network === "object"
    ? (txn.network.name || txn.network.text || "")
    : (txn.network || "");

  const networkColors = { MTN:"#FFC107", AIR:"#EF4444", GLO:"#10B881", "9MB":"#6A00DF" };
  const iconBg = networkColors[networkStr] || meta.color;

  const date    = txn.createdAt instanceof Date ? txn.createdAt : new Date();
  const timeStr = date.toLocaleString("en-US", {
    month:"short", day:"numeric", hour:"numeric", minute:"2-digit"
  });

  const rawAmount = Number(txn.amount);
  const amount = isNaN(rawAmount) ? 0 : rawAmount;

  return {
    id:       txn.id,
    name:     networkStr ? `${networkStr} ${meta.name}` : meta.name,
    sub:      txn.phone || "—",
    amount:   txn.type === "wallet_fund" ? `+₦${amount.toLocaleString()}` : `-₦${amount.toLocaleString()}`,
    type:     txn.type === "wallet_fund" ? "credit" : "debit",
    status:   txn.status === "success" ? "Successful" : "Failed",
    iconBg,
    iconText: networkStr || meta.icon,
    category: meta.category,
    date:     timeStr,
    rawDate:  date,
    raw:      txn,
  };
};

const generateRef = () => "CS-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
