import {
  collection, addDoc, getDocs, query,
  where, orderBy, updateDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";

export const getUnreadCount = async (uid) => {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    return { success: true, count: snap.size };
  } catch (err) {
    console.error("getUnreadCount error:", err);
    return { success: false, count: 0 };
  }
};

export const getNotifications = async (uid, limitCount = 30) => {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, data };
  } catch (err) {
    console.error("getNotifications error:", err);
    return { success: false, data: [] };
  }
};

export const markAsRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, "notifications", notificationId), { read: true });
    return { success: true };
  } catch (err) {
    console.error("markAsRead error:", err);
    return { success: false };
  }
};

export const markAllRead = async (uid) => {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => updateDoc(doc(db, "notifications", d.id), { read: true })));
    return { success: true };
  } catch (err) {
    console.error("markAllRead error:", err);
    return { success: false };
  }
};

export const sendWelcomeNotification = async (uid, name) => {
  return createNotification(
    uid,
    "Welcome to ClassicSwift! 🎉",
    `Hi ${name || "there"}, your account is ready. Fund your wallet to get started.`,
    "info"
  );
};

export const sendTransactionNotification = async (uid, type, amount, network, status) => {
  const success = status === "success";
  const label   = type === "airtime" ? "Airtime" : type === "data" ? "Data" : "Transaction";
  const net     = network ? `${network} ` : "";
  return createNotification(
    uid,
    success ? `${net}${label} Successful ✅` : `${net}${label} Failed ❌`,
    success
      ? `Your ${net}${label.toLowerCase()} purchase of ₦${Number(amount).toLocaleString()} was successful.`
      : `Your ${net}${label.toLowerCase()} purchase of ₦${Number(amount).toLocaleString()} failed. Please try again.`,
    success ? "success" : "error"
  );
};

export const createNotification = async (uid, title, body, type = "info") => {
  try {
    await addDoc(collection(db, "notifications"), {
      userId: uid, title, body, type, read: false,
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    return { success: false };
  }
};
