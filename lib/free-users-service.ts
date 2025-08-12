import { doc, setDoc, getDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-safe"

export interface FreeUser {
  uid: string
  email: string
  downloadsUsed: number
  downloadsLimit: number
  bundlesCreated: number
  bundlesLimit: number
  createdAt: any
  updatedAt: any
}

export interface FreeUserLimits {
  canDownload: boolean
  canCreateBundle: boolean
  downloadsRemaining: number
  bundlesRemaining: number
  downloadsUsed: number
  bundlesCreated: number
  downloadsLimit: number
  bundlesLimit: number
}

const DEFAULT_DOWNLOAD_LIMIT = 10
const DEFAULT_BUNDLE_LIMIT = 2

export async function createFreeUser(uid: string, email: string): Promise<FreeUser> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  const freeUserData: FreeUser = {
    uid,
    email,
    downloadsUsed: 0,
    downloadsLimit: DEFAULT_DOWNLOAD_LIMIT,
    bundlesCreated: 0,
    bundlesLimit: DEFAULT_BUNDLE_LIMIT,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  try {
    await setDoc(doc(db, "freeUsers", uid), freeUserData)
    console.log(`✅ Created free user record for: ${uid}`)
    return freeUserData
  } catch (error) {
    console.error("❌ Error creating free user:", error)
    throw error
  }
}

export async function getFreeUser(uid: string): Promise<FreeUser | null> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  try {
    const docRef = doc(db, "freeUsers", uid)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return docSnap.data() as FreeUser
    }

    return null
  } catch (error) {
    console.error("❌ Error getting free user:", error)
    throw error
  }
}

export async function ensureFreeUser(uid: string, email: string): Promise<FreeUser> {
  const existing = await getFreeUser(uid)
  if (existing) {
    return existing
  }

  return await createFreeUser(uid, email)
}

export async function incrementFreeUserDownloads(uid: string): Promise<boolean> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  try {
    const freeUser = await getFreeUser(uid)
    if (!freeUser) {
      throw new Error(`Free user record not found for uid: ${uid}`)
    }

    // Check if user has reached limit
    if (freeUser.downloadsUsed >= freeUser.downloadsLimit) {
      console.warn(`User ${uid} has reached download limit`)
      return false
    }

    // Increment downloads
    await updateDoc(doc(db, "freeUsers", uid), {
      downloadsUsed: increment(1),
      updatedAt: serverTimestamp(),
    })

    console.log(`✅ Incremented downloads for user: ${uid}`)
    return true
  } catch (error) {
    console.error("❌ Error incrementing free user downloads:", error)
    throw error
  }
}

export async function incrementFreeUserBundles(uid: string): Promise<boolean> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  try {
    const freeUser = await getFreeUser(uid)
    if (!freeUser) {
      throw new Error(`Free user record not found for uid: ${uid}`)
    }

    // Check if user has reached limit
    if (freeUser.bundlesCreated >= freeUser.bundlesLimit) {
      console.warn(`User ${uid} has reached bundle limit`)
      return false
    }

    // Increment bundles
    await updateDoc(doc(db, "freeUsers", uid), {
      bundlesCreated: increment(1),
      updatedAt: serverTimestamp(),
    })

    console.log(`✅ Incremented bundles for user: ${uid}`)
    return true
  } catch (error) {
    console.error("❌ Error incrementing free user bundles:", error)
    throw error
  }
}

export async function checkFreeUserLimits(uid: string): Promise<FreeUserLimits> {
  const freeUser = await getFreeUser(uid)

  if (!freeUser) {
    throw new Error(`Free user record not found for uid: ${uid}`)
  }

  const downloadsRemaining = Math.max(0, freeUser.downloadsLimit - freeUser.downloadsUsed)
  const bundlesRemaining = Math.max(0, freeUser.bundlesLimit - freeUser.bundlesCreated)

  return {
    canDownload: downloadsRemaining > 0,
    canCreateBundle: bundlesRemaining > 0,
    downloadsRemaining,
    bundlesRemaining,
    downloadsUsed: freeUser.downloadsUsed,
    bundlesCreated: freeUser.bundlesCreated,
    downloadsLimit: freeUser.downloadsLimit,
    bundlesLimit: freeUser.bundlesLimit,
  }
}

export async function resetFreeUserLimits(uid: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  try {
    await updateDoc(doc(db, "freeUsers", uid), {
      downloadsUsed: 0,
      bundlesCreated: 0,
      updatedAt: serverTimestamp(),
    })

    console.log(`✅ Reset limits for free user: ${uid}`)
  } catch (error) {
    console.error("❌ Error resetting free user limits:", error)
    throw error
  }
}

export function getFreeUserLimits(freeUser: FreeUser): any {
  const downloadsRemaining = Math.max(0, freeUser.downloadsLimit - freeUser.downloadsUsed)
  const bundlesRemaining = Math.max(0, freeUser.bundlesLimit - freeUser.bundlesCreated)

  return {
    tier: "free" as const,
    downloadsUsed: freeUser.downloadsUsed,
    downloadsLimit: freeUser.downloadsLimit,
    bundlesCreated: freeUser.bundlesCreated,
    bundlesLimit: freeUser.bundlesLimit,
    maxVideosPerBundle: 10,
    platformFeePercentage: 20,
    reachedDownloadLimit: downloadsRemaining <= 0,
    reachedBundleLimit: bundlesRemaining <= 0,
  }
}
