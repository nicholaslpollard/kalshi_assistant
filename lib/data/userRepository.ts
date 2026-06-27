import { firebaseDb } from "@/lib/firebase/client";
import {
  Timestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: "user";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  settings: {
    aiEnabledByDefault: boolean;
    theme: "dark";
    advisoryOnly: boolean;
  };
};

export async function getUserProfile(uid: string) {
  const userRef = doc(firebaseDb, "users", uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserProfile;
}

export async function ensureUserProfile(user: User) {
  const userRef = doc(firebaseDb, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    await updateDoc(userRef, {
      email: user.email,
      displayName: user.displayName ?? null,
      updatedAt: Timestamp.now(),
    });

    return;
  }

  const profile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName ?? null,
    role: "user",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    settings: {
      aiEnabledByDefault: true,
      theme: "dark",
      advisoryOnly: true,
    },
  };

  await setDoc(userRef, profile);
}