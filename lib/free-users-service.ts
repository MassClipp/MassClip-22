import { doc, setDoc, getDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore"
import { db } from "@/lib/firebase-safe"

export interface FreeUserDoc {
  uid: string
  email?: string
  // Active state - only one of freeUsers or memberships can be active
  active: boolean

  // Usage limits for free tier
  downloadsUsed: number
  downloadsLimit: number
  bundlesCreated: number
  bundlesLimit: number
  maxVideosPerBundle: number
  platformFeePercentage: number

  // Metadata
  createdAt: any
  updatedAt: any
}

const FREE_DEFAULTS = {
  downloadsLimit: 50,
  bundlesLimit: 2,
  maxVideosPerBundle: 10,
  platformFeePercentage: 20,
}

export async function getFreeUser(uid: string): Promise<FreeUserDoc | null> {
  if (!db) {
    console.error("❌ Firestore not initialized")
    throw new Error("Firestore not initialized")
  }

  try {
    console.log("🔄 Getting active free user for uid:", uid.substring(0, 8) + "...")
    const docRef = doc(db, "freeUsers", uid)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data() as FreeUserDoc

      // Only return if active
      if (data.active) {
        console.log("✅ Found active free user")
        return data
      } else {
        console.log("ℹ️ Free user exists but is inactive (likely upgraded to pro)")
        return null
      }
    }

    console.log("ℹ️ No free user document found")
    return null
  } catch (error) {
    console.error("❌ Error getting free user:", error)
    throw error
  }
}

export async function createFreeUser(uid: string, email?: string): Promise<FreeUserDoc> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  console.log("🔄 Creating new active free user for:", uid.substring(0, 8) + "...")

  const freeUserData: FreeUserDoc = {
    uid,
    email: email || "",
    active: true, // New free users are active by default
    downloadsUsed: 0,
    downloadsLimit: FREE_DEFAULTS.downloadsLimit,
    bundlesCreated: 0,
    bundlesLimit: FREE_DEFAULTS.bundlesLimit,
    maxVideosPerBundle: FREE_DEFAULTS.maxVideosPerBundle,
    platformFeePercentage: FREE_DEFAULTS.platformFeePercentage,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(doc(db, "freeUsers", uid), freeUserData)

  console.log("✅ Free user created successfully")
  return freeUserData
}

export async function incrementFreeUserDownloads(uid: string): Promise<{ success: boolean; reason?: string }> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  console.log("🔄 Incrementing downloads for free user:", uid.substring(0, 8) + "...")

  let freeUser = await getFreeUser(uid)
  if (!freeUser) {
    console.log("🔄 No active free user found, creating one...")
    freeUser = await createFreeUser(uid)
  }

  // Check if at limit
  if (freeUser.downloadsUsed >= freeUser.downloadsLimit) {
    console.log("❌ Download limit reached")
    return {
      success: false,
      reason: `Download limit reached (${freeUser.downloadsLimit}). Upgrade to Creator Pro for unlimited downloads.`,
    }
  }

  // Increment usage
  await updateDoc(doc(db, "freeUsers", uid), {
    downloadsUsed: increment(1),
    updatedAt: serverTimestamp(),
  })

  console.log("✅ Download incremented successfully")
  return { success: true }
}

export async function incrementFreeUserBundles(uid: string): Promise<{ success: boolean; reason?: string }> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  console.log("🔄 Incrementing bundles for free user:", uid.substring(0, 8) + "...")

  let freeUser = await getFreeUser(uid)
  if (!freeUser) {
    console.log("🔄 No active free user found, creating one...")
    freeUser = await createFreeUser(uid)
  }

  // Check if at limit
  if (freeUser.bundlesCreated >= freeUser.bundlesLimit) {
    console.log("❌ Bundle limit reached")
    return {
      success: false,
      reason: `Bundle limit reached (${freeUser.bundlesLimit}). Upgrade to Creator Pro for unlimited bundles.`,
    }
  }

  // Increment usage
  await updateDoc(doc(db, "freeUsers", uid), {
    bundlesCreated: increment(1),
    updatedAt: serverTimestamp(),
  })

  console.log("✅ Bundle incremented successfully")
  return { success: true }
}

export async function deactivateFreeUser(uid: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  console.log("🔄 Deactivating free user (upgrading to pro):", uid.substring(0, 8) + "...")

  const docRef = doc(db, "freeUsers", uid)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    await updateDoc(docRef, {
      active: false,
      updatedAt: serverTimestamp(),
    })
    console.log("✅ Free user deactivated")
  } else {
    console.log("ℹ️ No free user document to deactivate")
  }
}

export async function reactivateFreeUser(uid: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  console.log("🔄 Reactivating free user (downgrading from pro):", uid.substring(0, 8) + "...")

  const docRef = doc(db, "freeUsers", uid)
  const docSnap = await getDoc(docRef)

  if (docSnap.exists()) {
    await updateDoc(docRef, {
      active: true,
      updatedAt: serverTimestamp(),
    })
    console.log("✅ Free user reactivated")
  } else {
    console.log("🔄 No free user document found, creating new active one...")
    await createFreeUser(uid)
  }
}

export function toFreeTierInfo(f: FreeUserDoc) {
  return {
    tier: "free" as const,
    downloadsUsed: f.downloadsUsed,
    downloadsLimit: f.downloadsLimit,
    bundlesCreated: f.bundlesCreated,
    bundlesLimit: f.bundlesLimit,
    maxVideosPerBundle: f.maxVideosPerBundle,
    platformFeePercentage: f.platformFeePercentage,
    reachedDownloadLimit: f.downloadsUsed >= f.downloadsLimit,
    reachedBundleLimit: f.bundlesCreated >= f.bundlesLimit,
  }
}

export async function getFreeUserLimits(uid: string): Promise<{
  tier: "free"
  downloadsUsed: number
  downloadsLimit: number
  bundlesCreated: number
  bundlesLimit: number
  maxVideosPerBundle: number
  platformFeePercentage: number
  reachedDownloadLimit: boolean
  reachedBundleLimit: boolean
  hasUnlimitedDownloads: boolean
  hasPremiumContent: boolean
  hasNoWatermark: boolean
  hasPrioritySupport: boolean
  hasLimitedOrganization: boolean
  daysUntilReset: number
}> {
  const freeUser = await getFreeUser(uid)

  if (!freeUser) {
    // Return default limits if no record exists
    return {
      tier: "free",
      downloadsUsed: 0,
      downloadsLimit: FREE_DEFAULTS.downloadsLimit,
      bundlesCreated: 0,
      bundlesLimit: FREE_DEFAULTS.bundlesLimit,
      maxVideosPerBundle: FREE_DEFAULTS.maxVideosPerBundle,
      platformFeePercentage: FREE_DEFAULTS.platformFeePercentage,
      reachedDownloadLimit: false,
      reachedBundleLimit: false,
      hasUnlimitedDownloads: false,
      hasPremiumContent: false,
      hasNoWatermark: false,
      hasPrioritySupport: false,
      hasLimitedOrganization: true,
      daysUntilReset: 0,
    }
  }

  // Calculate days until next reset (monthly)
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return {
    tier: "free",
    downloadsUsed: freeUser.downloadsUsed,
    downloadsLimit: freeUser.downloadsLimit,
    bundlesCreated: freeUser.bundlesCreated,
    bundlesLimit: freeUser.bundlesLimit,
    maxVideosPerBundle: freeUser.maxVideosPerBundle,
    platformFeePercentage: freeUser.platformFeePercentage,
    reachedDownloadLimit: freeUser.downloadsUsed >= freeUser.downloadsLimit,
    reachedBundleLimit: freeUser.bundlesCreated >= freeUser.bundlesLimit,
    hasUnlimitedDownloads: false,
    hasPremiumContent: false,
    hasNoWatermark: false,
    hasPrioritySupport: false,
    hasLimitedOrganization: true,
    daysUntilReset,
  }
}

export async function canUserAddVideoToBundle(
  uid: string,
  currentVideoCount: number,
): Promise<{ allowed: boolean; reason?: string }> {
  const freeUser = await getFreeUser(uid)

  if (!freeUser) {
    // If no free user record, they might be pro or we should create one
    // For safety, allow the action and let the server-side validation handle it
    return { allowed: true }
  }

  if (currentVideoCount >= freeUser.maxVideosPerBundle) {
    return {
      allowed: false,
      reason: `Video limit reached (${freeUser.maxVideosPerBundle} videos per bundle max)`,
    }
  }

  return { allowed: true }
}
