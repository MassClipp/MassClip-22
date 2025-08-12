import { doc, setDoc, getDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-safe"

export interface FreeUserData {
  uid: string
  email: string
  downloadsUsed: number
  bundlesUsed: number
  maxDownloads: number
  maxBundles: number
  createdAt: Date
  updatedAt: Date
}

export async function createFreeUser(uid: string, email: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  const freeUserData: Omit<FreeUserData, "createdAt" | "updatedAt"> & {
    createdAt: any
    updatedAt: any
  } = {
    uid,
    email,
    downloadsUsed: 0,
    bundlesUsed: 0,
    maxDownloads: 5,
    maxBundles: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(doc(db, "freeUsers", uid), freeUserData)
  console.log("✅ Free user created:", uid)
}

export async function getFreeUser(uid: string): Promise<FreeUserData | null> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  const freeUserDoc = await getDoc(doc(db, "freeUsers", uid))

  if (!freeUserDoc.exists()) {
    return null
  }

  const data = freeUserDoc.data()
  return {
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as FreeUserData
}

export async function ensureFreeUser(uid: string, email: string): Promise<FreeUserData> {
  let freeUser = await getFreeUser(uid)

  if (!freeUser) {
    await createFreeUser(uid, email)
    freeUser = await getFreeUser(uid)
  }

  if (!freeUser) {
    throw new Error("Failed to create free user")
  }

  return freeUser
}

export async function incrementFreeUserDownloads(uid: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  const freeUserRef = doc(db, "freeUsers", uid)
  await updateDoc(freeUserRef, {
    downloadsUsed: increment(1),
    updatedAt: serverTimestamp(),
  })

  console.log("✅ Free user downloads incremented for:", uid)
}

export async function incrementFreeUserBundles(uid: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  const freeUserRef = doc(db, "freeUsers", uid)
  await updateDoc(freeUserRef, {
    bundlesUsed: increment(1),
    updatedAt: serverTimestamp(),
  })

  console.log("✅ Free user bundles incremented for:", uid)
}

export async function checkFreeUserLimits(uid: string): Promise<{
  canDownload: boolean
  canCreateBundle: boolean
  downloadsUsed: number
  bundlesUsed: number
  maxDownloads: number
  maxBundles: number
}> {
  const freeUser = await getFreeUser(uid)

  if (!freeUser) {
    return {
      canDownload: true,
      canCreateBundle: true,
      downloadsUsed: 0,
      bundlesUsed: 0,
      maxDownloads: 5,
      maxBundles: 1,
    }
  }

  return {
    canDownload: freeUser.downloadsUsed < freeUser.maxDownloads,
    canCreateBundle: freeUser.bundlesUsed < freeUser.maxBundles,
    downloadsUsed: freeUser.downloadsUsed,
    bundlesUsed: freeUser.bundlesUsed,
    maxDownloads: freeUser.maxDownloads,
    maxBundles: freeUser.maxBundles,
  }
}
