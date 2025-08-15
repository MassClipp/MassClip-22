import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export interface FreeUserDoc {
  uid: string
  email: string
  // Usage tracking
  downloadsUsed: number
  bundlesCreated: number
  // Free tier limits
  downloadsLimit: number
  bundlesLimit: number
  maxVideosPerBundle: number
  platformFeePercentage: number
  // Features
  hasUnlimitedDownloads: boolean
  hasPremiumContent: boolean
  hasNoWatermark: boolean
  hasPrioritySupport: boolean
  hasLimitedOrganization: boolean
  // Timestamps
  createdAt: any
  updatedAt: any
  // Monthly reset tracking
  lastResetDate: any
  currentPeriodStart: any
  // Upgrade status
  upgradedToPro?: boolean
  upgradeDate?: any
}

const FREE_TIER_DEFAULTS = {
  downloadsLimit: 15,
  bundlesLimit: 2,
  maxVideosPerBundle: 10,
  platformFeePercentage: 20,
  hasUnlimitedDownloads: false,
  hasPremiumContent: false,
  hasNoWatermark: false,
  hasPrioritySupport: false,
  hasLimitedOrganization: true,
}

export async function getFreeUser(uid: string): Promise<FreeUserDoc | null> {
  try {
    console.log("🔄 Getting freeUser for uid:", uid.substring(0, 8) + "...")
    const docRef = adminDb.collection("freeUsers").doc(uid)
    const docSnap = await docRef.get()

    if (docSnap.exists) {
      const data = docSnap.data() as FreeUserDoc
      console.log("✅ Found existing freeUser:", {
        downloadsUsed: data.downloadsUsed,
        bundlesCreated: data.bundlesCreated,
        downloadsLimit: data.downloadsLimit,
        bundlesLimit: data.bundlesLimit,
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
  console.log("🔄 Creating freeUser for uid:", uid.substring(0, 8) + "...")

  // Check if already exists
  const existing = await getFreeUser(uid)
  if (existing) {
    console.log("✅ FreeUser already exists, returning existing")
    return existing
  }

  const now = new Date()
  const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1) // First day of current month

  const freeUserDoc: FreeUserDoc = {
    uid,
    email,
    // Usage tracking (starts at 0)
    downloadsUsed: 0,
    bundlesCreated: 0,
    // Free tier limits
    ...FREE_TIER_DEFAULTS,
    // Timestamps
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastResetDate: FieldValue.serverTimestamp(),
    currentPeriodStart: currentPeriodStart,
  }

  try {
    const docRef = adminDb.collection("freeUsers").doc(uid)
    await docRef.set(freeUserDoc)
    console.log("✅ Created new freeUser successfully with all tier attributes")
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

export async function checkAndResetMonthlyLimits(uid: string): Promise<FreeUserDoc> {
  const freeUser = await getFreeUser(uid)
  if (!freeUser) {
    throw new Error("Free user not found")
  }

  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastResetDate = freeUser.lastResetDate?.toDate?.() || freeUser.lastResetDate

  // Check if we need to reset monthly limits
  if (!lastResetDate || lastResetDate < currentMonthStart) {
    console.log("🔄 Resetting monthly limits for user:", uid.substring(0, 8) + "...")

    const docRef = adminDb.collection("freeUsers").doc(uid)
    await docRef.update({
      downloadsUsed: 0,
      lastResetDate: FieldValue.serverTimestamp(),
      currentPeriodStart: currentMonthStart,
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log("✅ Monthly limits reset successfully")

    // Return updated user data
    return (await getFreeUser(uid)) as FreeUserDoc
  }

  return freeUser
}

export async function incrementFreeUserDownloads(uid: string): Promise<{ success: boolean; reason?: string }> {
  console.log("🔄 Incrementing downloads for freeUser:", uid.substring(0, 8) + "...")

  try {
    // Check and reset monthly limits if needed
    const freeUser = await checkAndResetMonthlyLimits(uid)

    // Check if user has reached download limit
    if (freeUser.downloadsUsed >= freeUser.downloadsLimit) {
      console.warn("❌ User has reached download limit:", freeUser.downloadsUsed, "/", freeUser.downloadsLimit)
      return { success: false, reason: "Monthly download limit reached (15 downloads)" }
    }

    const docRef = adminDb.collection("freeUsers").doc(uid)
    await docRef.update({
      downloadsUsed: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log("✅ Incremented freeUser downloads:", freeUser.downloadsUsed + 1, "/", freeUser.downloadsLimit)
    return { success: true }
  } catch (error) {
    console.error("❌ Error incrementing freeUser downloads:", error)
    throw error
  }
}

export async function incrementFreeUserBundles(uid: string): Promise<{ success: boolean; reason?: string }> {
  console.log("🔄 Incrementing bundles for freeUser:", uid.substring(0, 8) + "...")

  try {
    const freeUser = await getFreeUser(uid)
    if (!freeUser) {
      throw new Error("Free user not found")
    }

    // Check if user has reached bundle limit
    if (freeUser.bundlesCreated >= freeUser.bundlesLimit) {
      console.warn("❌ User has reached bundle limit:", freeUser.bundlesCreated, "/", freeUser.bundlesLimit)
      return { success: false, reason: "Bundle limit reached (2 bundles max)" }
    }

    const docRef = adminDb.collection("freeUsers").doc(uid)
    await docRef.update({
      bundlesCreated: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log("✅ Incremented freeUser bundles:", freeUser.bundlesCreated + 1, "/", freeUser.bundlesLimit)
    return { success: true }
  } catch (error) {
    console.error("❌ Error incrementing freeUser bundles:", error)
    throw error
  }
}

export async function canUserAddVideoToBundle(
  uid: string,
  currentVideoCount: number,
): Promise<{ allowed: boolean; reason?: string }> {
  const freeUser = await getFreeUser(uid)
  if (!freeUser) {
    throw new Error("Free user not found")
  }

  if (currentVideoCount >= freeUser.maxVideosPerBundle) {
    return {
      allowed: false,
      reason: `Video limit reached (${freeUser.maxVideosPerBundle} videos per bundle max)`,
    }
  }

  return { allowed: true }
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
  // Check and reset monthly limits if needed
  const freeUser = await checkAndResetMonthlyLimits(uid)

  if (!freeUser) {
    // Return default limits if no record exists
    return {
      tier: "free",
      downloadsUsed: 0,
      downloadsLimit: FREE_TIER_DEFAULTS.downloadsLimit,
      bundlesCreated: 0,
      bundlesLimit: FREE_TIER_DEFAULTS.bundlesLimit,
      maxVideosPerBundle: FREE_TIER_DEFAULTS.maxVideosPerBundle,
      platformFeePercentage: FREE_TIER_DEFAULTS.platformFeePercentage,
      reachedDownloadLimit: false,
      reachedBundleLimit: false,
      ...FREE_TIER_DEFAULTS,
      daysUntilReset: 0,
    }
  }

  // Calculate days until next reset
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
    hasUnlimitedDownloads: freeUser.hasUnlimitedDownloads,
    hasPremiumContent: freeUser.hasPremiumContent,
    hasNoWatermark: freeUser.hasNoWatermark,
    hasPrioritySupport: freeUser.hasPrioritySupport,
    hasLimitedOrganization: freeUser.hasLimitedOrganization,
    daysUntilReset,
  }
}

export async function upgradeFreeUserToPro(uid: string): Promise<void> {
  console.log("🔄 Upgrading free user to pro:", uid.substring(0, 8) + "...")

  try {
    const docRef = adminDb.collection("freeUsers").doc(uid)

    // We'll keep the freeUsers record but mark it as inactive
    // The memberships collection will handle the pro features
    await docRef.update({
      updatedAt: FieldValue.serverTimestamp(),
      // Add a flag to indicate this user has been upgraded
      upgradedToPro: true,
      upgradeDate: FieldValue.serverTimestamp(),
    })

    console.log("✅ Free user marked as upgraded to pro")
  } catch (error) {
    console.error("❌ Error upgrading free user:", error)
    throw error
  }
}
