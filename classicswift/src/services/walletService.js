import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase";

export const getBalance = async (uid) => {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return { success: false, error: "User not found" };
    const data = snap.data();
    const balance  = Number(data.balance  ?? data.walletBalance ?? 0) || 0;
    const cashback = Number(data.cashback ?? 0) || 0;
    return { success: true, balance, cashback };
  } catch (err) {
    console.error("getBalance error:", err);
    return { success: false, error: err.message, balance: 0, cashback: 0 };
  }
};

// Alias used by AirtimeConfirm, DataConfirm pages
export const fundWallet = async (uid, amount) => {
  try {
    const amt = Number(amount);
    if (!amt || amt <= 0) return { success: false, error: "Invalid amount" };
    await updateDoc(doc(db, "users", uid), {
      balance: increment(amt),
      walletBalance: increment(amt),
    });
    return { success: true };
  } catch (err) {
    console.error("fundWallet error:", err);
    return { success: false, error: err.message };
  }
};

export const deductWallet = async (uid, amount) => {
  return deductBalance(uid, amount);
};

export const deductBalance = async (uid, amount) => {
  try {
    const amt = Number(amount);
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return { success: false, error: "User not found" };
    const data = snap.data();
    const current = Number(data.balance ?? data.walletBalance ?? 0) || 0;
    if (current < amt) return { success: false, error: "Insufficient balance" };
    await updateDoc(doc(db, "users", uid), {
      balance: increment(-amt),
      walletBalance: increment(-amt),
    });
    return { success: true, newBalance: current - amt };
  } catch (err) {
    console.error("deductBalance error:", err);
    return { success: false, error: err.message };
  }
};

export const addCashback = async (uid, amount) => {
  try {
    await updateDoc(doc(db, "users", uid), { cashback: increment(amount) });
    return { success: true };
  } catch (err) {
    console.error("addCashback error:", err);
    return { success: false, error: err.message };
  }
};

export const formatBalance = (amount) => {
  const n = Number(amount) || 0;
  return n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
