export interface FreeUserDoc {
  uid: string
  email: string
  // Usage tracking
  downloadsUsed: number
  bundlesCreated: number
  downloadsLimit: number
  bundlesLimit: number // 5 bundles for Starter
  maxVideosPerBundle: number // 15 videos per bundle for Starter
  platformFeePercentage: number // 20% for Starter
  maxFolders: number // 3 folders for Starter
  canCreateSubfolders: boolean // true for Starter
  canAnalyzeTranscripts: boolean // false for Starter (Basic Vex AI only)
  canCreateBundles: boolean
  // Features
  hasUnlimitedDownloads: boolean
  hasPremiumContent: boolean
  hasNoWatermark: boolean
  hasPrioritySupport: boolean
  hasLimitedOrganization: boolean
  // Permanent trial tracking field
  hasUsedFreeTrial?: boolean // Permanent flag - once true, never resets
  trialActive?: boolean // Indicates if the user is currently in a trial period
  hasUsedFirstWeekDiscount?: boolean // Track if user has used $3 first week promo on ANY plan
  firstWeekDiscountUsedDate?: any // When they used the discount
  firstWeekDiscountPlan?: "starter" | "creator_pro" // Which plan they used it on
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

const STARTER_TIER_DEFAULTS = {
  downloadsLimit: 15,
  bundlesLimit: 5, // Changed from 2 to 5
  maxVideosPerBundle: 15, // Changed from 10 to 15
  platformFeePercentage: 20,
  maxFolders: 3, // Changed from 2 to 3
  canCreateSubfolders: true, // Changed from false to true
  canAnalyzeTranscripts: false, // Basic Vex AI only
  canCreateBundles: false,
  hasUnlimitedDownloads: false,
  hasPremiumContent: false,
  hasNoWatermark: false,
  hasPrioritySupport: false,
  hasLimitedOrganization: true,
  trialActive: false,
}

export async function getFreeUser(uid: string): Promise<FreeUserDoc | null> {
  try {
    const { adminDb } = await import("@/lib/firebase-admin")

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

  const { adminDb } = await import("@/lib/firebase-admin")

  const now = new Date()
  const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1) // First day of current month

  const freeUserDoc: FreeUserDoc = {
    uid,
    email,
    // Usage tracking (starts at 0)
    downloadsUsed: 0,
    bundlesCreated: 0,
    ...STARTER_TIER_DEFAULTS,
    // Timestamps
    createdAt: new Date(),
    updatedAt: new Date(),
    lastResetDate: new Date(),
    currentPeriodStart: currentPeriodStart,
  }

  try {
    const docRef = adminDb.collection("freeUsers").doc(uid)
    await docRef.set(freeUserDoc)
    console.log("✅ Created new freeUser successfully with Starter tier attributes")
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

    const { adminDb } = await import("@/lib/firebase-admin")

    const docRef = adminDb.collection("freeUsers").doc(uid)
    await docRef.update({
      downloadsUsed: 0,
      lastResetDate: new Date(),
      currentPeriodStart: currentMonthStart,
      updatedAt: new Date(),
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

    const { adminDb } = await import("@/lib/firebase-admin")

    const docRef = adminDb.collection("freeUsers").doc(uid)
    await docRef.update({
      downloadsUsed: freeUser.downloadsUsed + 1,
      updatedAt: new Date(),
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

    const { adminDb } = await import("@/lib/firebase-admin")

    const docRef = adminDb.collection("freeUsers").doc(uid)
    await docRef.update({
      bundlesCreated: freeUser.bundlesCreated + 1,
      updatedAt: new Date(),
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
  tier: "starter"
  downloadsUsed: number
  downloadsLimit: number
  bundlesCreated: number
  bundlesLimit: number
  maxVideosPerBundle: number
  platformFeePercentage: number
  maxFolders: number
  canCreateSubfolders: boolean
  canAnalyzeTranscripts: boolean
  canCreateBundles: boolean
  reachedDownloadLimit: boolean
  reachedBundleLimit: boolean
  hasUnlimitedDownloads: boolean
  hasPremiumContent: boolean
  hasNoWatermark: boolean
  hasPrioritySupport: boolean
  hasLimitedOrganization: boolean
  daysUntilReset: number
  hasUsedFreeTrial?: boolean
  trialActive?: boolean
  hasUsedFirstWeekDiscount?: boolean
}> {
  // Check and reset monthly limits if needed
  const freeUser = await checkAndResetMonthlyLimits(uid)

  if (!freeUser) {
    // Return default limits if no record exists
    return {
      tier: "starter",
      downloadsUsed: 0,
      downloadsLimit: STARTER_TIER_DEFAULTS.downloadsLimit,
      bundlesCreated: 0,
      bundlesLimit: STARTER_TIER_DEFAULTS.bundlesLimit,
      maxVideosPerBundle: STARTER_TIER_DEFAULTS.maxVideosPerBundle,
      platformFeePercentage: STARTER_TIER_DEFAULTS.platformFeePercentage,
      maxFolders: STARTER_TIER_DEFAULTS.maxFolders,
      canCreateSubfolders: STARTER_TIER_DEFAULTS.canCreateSubfolders,
      canAnalyzeTranscripts: STARTER_TIER_DEFAULTS.canAnalyzeTranscripts,
      canCreateBundles: STARTER_TIER_DEFAULTS.canCreateBundles,
      reachedDownloadLimit: false,
      reachedBundleLimit: false,
      ...STARTER_TIER_DEFAULTS,
      daysUntilReset: 0,
      hasUsedFreeTrial: false,
      trialActive: false,
      hasUsedFirstWeekDiscount: false,
    }
  }

  // Check if user has old FREE tier limits (2 bundles, 10 videos) and update to STARTER limits (5 bundles, 15 videos)
  const needsUpdate =
    freeUser.bundlesLimit === 2 ||
    freeUser.maxVideosPerBundle === 10 ||
    freeUser.maxFolders === 2 ||
    freeUser.canCreateSubfolders === false

  if (needsUpdate) {
    console.log("🔄 Auto-updating outdated limits to Starter plan defaults for user:", uid.substring(0, 8) + "...")

    const { adminDb } = await import("@/lib/firebase-admin")

    const docRef = adminDb.collection("freeUsers").doc(uid)
    await docRef.update({
      bundlesLimit: STARTER_TIER_DEFAULTS.bundlesLimit, // 5
      maxVideosPerBundle: STARTER_TIER_DEFAULTS.maxVideosPerBundle, // 15
      maxFolders: STARTER_TIER_DEFAULTS.maxFolders, // 3
      canCreateSubfolders: STARTER_TIER_DEFAULTS.canCreateSubfolders, // true
      platformFeePercentage: STARTER_TIER_DEFAULTS.platformFeePercentage, // 20
      updatedAt: new Date(),
    })

    console.log("✅ Updated user limits to Starter plan defaults")

    // Fetch the updated document
    const updatedDoc = await docRef.get()
    const updatedFreeUser = updatedDoc.data() as FreeUserDoc

    // Calculate days until next reset
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      tier: "starter",
      downloadsUsed: updatedFreeUser.downloadsUsed,
      downloadsLimit: updatedFreeUser.downloadsLimit,
      bundlesCreated: updatedFreeUser.bundlesCreated,
      bundlesLimit: updatedFreeUser.bundlesLimit,
      maxVideosPerBundle: updatedFreeUser.maxVideosPerBundle,
      platformFeePercentage: updatedFreeUser.platformFeePercentage,
      maxFolders: updatedFreeUser.maxFolders,
      canCreateSubfolders: updatedFreeUser.canCreateSubfolders,
      canAnalyzeTranscripts: updatedFreeUser.canAnalyzeTranscripts,
      canCreateBundles: updatedFreeUser.canCreateBundles,
      reachedDownloadLimit: updatedFreeUser.downloadsUsed >= updatedFreeUser.downloadsLimit,
      reachedBundleLimit: updatedFreeUser.bundlesCreated >= updatedFreeUser.bundlesLimit,
      hasUnlimitedDownloads: updatedFreeUser.hasUnlimitedDownloads,
      hasPremiumContent: updatedFreeUser.hasPremiumContent,
      hasNoWatermark: updatedFreeUser.hasNoWatermark,
      hasPrioritySupport: updatedFreeUser.hasPrioritySupport,
      hasLimitedOrganization: updatedFreeUser.hasLimitedOrganization,
      daysUntilReset,
      hasUsedFreeTrial: updatedFreeUser.hasUsedFreeTrial ?? false,
      trialActive: updatedFreeUser.trialActive ?? false,
      hasUsedFirstWeekDiscount: updatedFreeUser.hasUsedFirstWeekDiscount ?? false,
    }
  }

  // Calculate days until next reset
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return {
    tier: "starter",
    downloadsUsed: freeUser.downloadsUsed,
    downloadsLimit: freeUser.downloadsLimit,
    bundlesCreated: freeUser.bundlesCreated,
    bundlesLimit: freeUser.bundlesLimit,
    maxVideosPerBundle: freeUser.maxVideosPerBundle,
    platformFeePercentage: freeUser.platformFeePercentage,
    maxFolders: freeUser.maxFolders ?? STARTER_TIER_DEFAULTS.maxFolders,
    canCreateSubfolders: freeUser.canCreateSubfolders ?? STARTER_TIER_DEFAULTS.canCreateSubfolders,
    canAnalyzeTranscripts: freeUser.canAnalyzeTranscripts ?? STARTER_TIER_DEFAULTS.canAnalyzeTranscripts,
    canCreateBundles: freeUser.canCreateBundles ?? STARTER_TIER_DEFAULTS.canCreateBundles,
    reachedDownloadLimit: freeUser.downloadsUsed >= freeUser.downloadsLimit,
    reachedBundleLimit: freeUser.bundlesCreated >= freeUser.bundlesLimit,
    hasUnlimitedDownloads: freeUser.hasUnlimitedDownloads,
    hasPremiumContent: freeUser.hasPremiumContent,
    hasNoWatermark: freeUser.hasNoWatermark,
    hasPrioritySupport: freeUser.hasPrioritySupport,
    hasLimitedOrganization: freeUser.hasLimitedOrganization,
    daysUntilReset,
    hasUsedFreeTrial: freeUser.hasUsedFreeTrial ?? false,
    trialActive: freeUser.trialActive ?? false,
    hasUsedFirstWeekDiscount: freeUser.hasUsedFirstWeekDiscount ?? false,
  }
}

export async function upgradeFreeUserToPro(uid: string): Promise<void> {
  console.log("🔄 Upgrading free user to pro:", uid.substring(0, 8) + "...")

  try {
    const { adminDb } = await import("@/lib/firebase-admin")

    const docRef = adminDb.collection("freeUsers").doc(uid)

    // We'll keep the freeUsers record but mark it as inactive
    // The memberships collection will handle the pro features
    await docRef.update({
      updatedAt: new Date(),
      // Add a flag to indicate this user has been upgraded
      upgradedToPro: true,
      upgradeDate: new Date(),
    })

    console.log("✅ Free user marked as upgraded to pro")
  } catch (error) {
    console.error("❌ Error upgrading free user:", error)
    throw error
  }
}

export async function downgradeFreeUserFromTrial(uid: string): Promise<void> {
  console.log("🔄 Downgrading user from trial to starter plan:", uid.substring(0, 8) + "...")

  try {
    const { adminDb } = await import("@/lib/firebase-admin")

    const docRef = adminDb.collection("freeUsers").doc(uid)
    const docSnap = await docRef.get()

    if (docSnap.exists) {
      await docRef.update({
        trialActive: false,
        canCreateBundles: false,
        canAnalyzeTranscripts: false,
        maxFolders: 3, // Starter tier
        canCreateSubfolders: true, // Starter tier
        bundlesLimit: 5, // Starter tier
        maxVideosPerBundle: 15, // Starter tier
        platformFeePercentage: 20,
        updatedAt: new Date(),
      })
      console.log("✅ Updated existing freeUser record to Starter plan limits")
    } else {
      const freeUserDoc: Partial<FreeUserDoc> = {
        uid,
        email: "", // Will be updated when we have the email
        downloadsUsed: 0,
        bundlesCreated: 0,
        ...STARTER_TIER_DEFAULTS,
        hasUsedFreeTrial: true, // Mark that they've used their trial
        createdAt: new Date(),
        updatedAt: new Date(),
        lastResetDate: new Date(),
        currentPeriodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      }
      await docRef.set(freeUserDoc)
      console.log("✅ Created new freeUser record with Starter plan limits")
    }

    // Also update the users collection
    const userRef = adminDb.collection("users").doc(uid)
    await userRef.update({
      trialActive: false,
      plan: "starter", // Changed from "free" to "starter"
      updatedAt: new Date(),
    })

    console.log("✅ User downgraded from trial to Starter plan successfully")
  } catch (error) {
    console.error("❌ Error downgrading user from trial:", error)
    throw error
  }
}
