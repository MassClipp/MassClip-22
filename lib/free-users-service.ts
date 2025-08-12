import { doc, setDoc, getDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-safe"

export interface FreeUserDoc {
  uid: string
  email: string
  downloadsUsed: number
  bundlesCreated: number
  createdAt: any
  updatedAt: any
}

export async function getFreeUser(uid: string): Promise<FreeUserDoc | null> {
  if (!db) {
    console.error("❌ Firestore not initialized")
    throw new Error("Firestore not initialized")
  }

  try {
    console.log("🔄 Getting freeUser for uid:", uid.substring(0, 8) + "...")
    const docRef = doc(db, "freeUsers", uid)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data() as FreeUserDoc
      console.log("✅ Found existing freeUser:", {
        downloadsUsed: data.downloadsUsed,
        bundlesCreated: data.bundlesCreated,
      })
      return data
    }

    console.log("ℹ️ No existing freeUser found")
    return null
  } catch (error) {
    console.error("❌ Error getting freeUser:", error)
    throw error
  }
}

export async function createFreeUser(uid: string, email: string): Promise<FreeUserDoc> {
  if (!db) {
    console.error("❌ Firestore not initialized")
    throw new Error("Firestore not initialized")
  }

  console.log("🔄 Creating freeUser for uid:", uid.substring(0, 8) + "...")

  // Check if already exists
  const existing = await getFreeUser(uid)
  if (existing) {
    console.log("✅ FreeUser already exists, returning existing")
    return existing
  }

  const freeUserDoc: FreeUserDoc = {
    uid,
    email,
    downloadsUsed: 0,
    bundlesCreated: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  try {
    const docRef = doc(db, "freeUsers", uid)
    await setDoc(docRef, freeUserDoc)
    console.log("✅ Created new freeUser successfully")
    return freeUserDoc
  } catch (error) {
    console.error("❌ Error creating freeUser:", error)
    throw error
  }
}

export async function ensureFreeUser(uid: string, email: string): Promise<FreeUserDoc> {
  const existing = await getFreeUser(uid)
  if (existing) {
    return existing
  }
  return await createFreeUser(uid, email)
}

export async function incrementFreeUserDownloads(uid: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  console.log("🔄 Incrementing downloads for freeUser:", uid.substring(0, 8) + "...")

  try {
    const docRef = doc(db, "freeUsers", uid)
    await updateDoc(docRef, {
      downloadsUsed: increment(1),
      updatedAt: serverTimestamp(),
    })
    console.log("✅ Incremented freeUser downloads")
  } catch (error) {
    console.error("❌ Error incrementing freeUser downloads:", error)
    throw error
  }
}

export async function incrementFreeUserBundles(uid: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  console.log("🔄 Incrementing bundles for freeUser:", uid.substring(0, 8) + "...")

  try {
    const docRef = doc(db, "freeUsers", uid)
    await updateDoc(docRef, {
      bundlesCreated: increment(1),
      updatedAt: serverTimestamp(),
    })
    console.log("✅ Incremented freeUser bundles")
  } catch (error) {
    console.error("❌ Error incrementing freeUser bundles:", error)
    throw error
  }
}

export async function getFreeUserLimits(uid: string): Promise<{
  downloadsUsed: number
  downloadsLimit: number
  bundlesCreated: number
  bundlesLimit: number
  reachedDownloadLimit: boolean
  reachedBundleLimit: boolean
}> {
  const freeUser = await getFreeUser(uid)

  if (!freeUser) {
    // Return default limits if no record exists
    return {
      downloadsUsed: 0,
      downloadsLimit: 15,
      bundlesCreated: 0,
      bundlesLimit: 2,
      reachedDownloadLimit: false,
      reachedBundleLimit: false,
    }
  }

  const downloadsLimit = 15
  const bundlesLimit = 2

  return {
    downloadsUsed: freeUser.downloadsUsed,
    downloadsLimit,
    bundlesCreated: freeUser.bundlesCreated,
    bundlesLimit,
    reachedDownloadLimit: freeUser.downloadsUsed >= downloadsLimit,
    reachedBundleLimit: freeUser.bundlesCreated >= bundlesLimit,
  }
}
