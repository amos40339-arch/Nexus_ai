import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const getUser = async (uid) => {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return { success: false, error: "User not found" };
    return { success: true, data: { id: snap.id, ...snap.data() } };
  } catch (err) {
    console.error("getUser error:", err);
    return { success: false, error: err.message };
  }
};

export const updateUser = async (uid, data) => {
  try {
    await updateDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (err) {
    console.error("updateUser error:", err);
    return { success: false, error: err.message };
  }
};

export const createUser = async (uid, data) => {
  try {
    await setDoc(doc(db, "users", uid), {
      ...data,
      balance:       0,
      walletBalance: 0,
      cashback:      0,
      createdAt:     serverTimestamp(),
    }, { merge: true });
    return { success: true };
  } catch (err) {
    console.error("createUser error:", err);
    return { success: false, error: err.message };
  }
};
