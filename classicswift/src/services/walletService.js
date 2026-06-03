import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase";

export const getBalance = async (uid) => {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return { success: false, error: "User not found" };
    const data = snap.data();
    const balance  = data.balance  ?? data.walletBalance ?? 0;
    const cashback = data.cashback ?? 0;
    return { success: true, balance, cashback };
  } catch (err) {
    console.error("getBalance error:", err);
    return { success: false, error: err.message, balance: 0, cashback: 0 };
  }
};

// Alias used by AirtimeConfirm, DataConfirm pages
export const deductWallet = async (uid, amount) => {
  return deductBalance(uid, amount);
};

export const deductBalance = async (uid, amount) => {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return { success: false, error: "User not found" };
    const data = snap.data();
    const current = data.balance ?? data.walletBalance ?? 0;
    if (current < amount) return { success: false, error: "Insufficient balance" };
    const newBalance = current - amount;
    await updateDoc(doc(db, "users", uid), { balance: newBalance, walletBalance: newBalance });
    return { success: true, newBalance };
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
  if (amount === null || amount === undefined) return "0.00";
  return Number(amount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
