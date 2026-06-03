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
