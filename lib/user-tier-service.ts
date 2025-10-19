import { getFreeUser, createFreeUser, incrementFreeUserDownloads, incrementFreeUserBundles } from "./free-users-service"
import { getMembership, incrementDownloads, incrementBundles, toTierInfo } from "./memberships-service"
import { consumeBundleSlot } from "./bundle-slots-service"

export type UserTier = "starter" | "creator_pro"

export interface TierInfo {
  tier: UserTier
  downloadsUsed: number
  downloadsLimit: number | null
  bundlesCreated: number
  bundlesLimit: number | null
  maxVideosPerBundle: number | null
  platformFeePercentage: number
  reachedDownloadLimit: boolean
  reachedBundleLimit: boolean
}

export async function getUserTier(uid: string): Promise<UserTier> {
  console.log("🔄 Getting user tier for:", uid.substring(0, 8) + "...")

  const membership = await getMembership(uid)
  if (membership && membership.isActive) {
    console.log("✅ User is creator_pro")
    return "creator_pro"
  }

  console.log("✅ User is starter tier")
  return "starter"
}

export async function getUserTierInfo(uid: string): Promise<TierInfo> {
  console.log("🔄 Getting tier info for:", uid.substring(0, 8) + "...")

  const membership = await getMembership(uid)
  if (membership && membership.isActive) {
    console.log("✅ Returning pro tier info")
    return toTierInfo(membership)
  }

  console.log("🔄 Getting starter user info...")
  let freeUser = await getFreeUser(uid)

  if (!freeUser) {
    console.log("🔄 Creating new starter user...")
    freeUser = await createFreeUser(uid, "")
  }

  console.log("🔄 Getting real-time bundle count...")
  const { getFirestore } = await import("firebase-admin/firestore")
  const db = getFirestore()

  const bundlesQuery = db.collection("bundles").where("creatorId", "==", uid)
  const bundlesSnapshot = await bundlesQuery.get()
  const actualBundlesCreated = bundlesSnapshot.size

  console.log("📊 Bundle count comparison:", {
    storedBundlesCreated: freeUser.bundlesCreated,
    actualBundlesCreated: actualBundlesCreated,
    bundlesLimit: freeUser.bundlesLimit,
  })

  const tierInfo: TierInfo = {
    tier: "starter", // Changed from "free" to "starter"
    downloadsUsed: freeUser.downloadsUsed,
    downloadsLimit: freeUser.downloadsLimit,
    bundlesCreated: actualBundlesCreated, // Use real-time count
    bundlesLimit: freeUser.bundlesLimit, // This already includes base (5) + purchased slots
    maxVideosPerBundle: freeUser.maxVideosPerBundle,
    platformFeePercentage: freeUser.platformFeePercentage,
    reachedDownloadLimit: freeUser.downloadsUsed >= freeUser.downloadsLimit,
    reachedBundleLimit: actualBundlesCreated >= freeUser.bundlesLimit, // Use real-time count
  }

  console.log("✅ Returning starter tier info:", {
    bundlesCreated: tierInfo.bundlesCreated,
    bundlesLimit: tierInfo.bundlesLimit,
    maxVideosPerBundle: tierInfo.maxVideosPerBundle,
    reachedBundleLimit: tierInfo.reachedBundleLimit,
  })
  return tierInfo
}

export async function incrementUserDownloads(uid: string): Promise<{ success: boolean; reason?: string }> {
  console.log("🔄 Incrementing downloads for:", uid.substring(0, 8) + "...")

  const membership = await getMembership(uid)
  if (membership && membership.isActive) {
    console.log("✅ Pro user - unlimited downloads")
    await incrementDownloads(uid)
    return { success: true }
  }

  // User is starter - check limits
  console.log("🔄 Starter user - checking limits...")
  return await incrementFreeUserDownloads(uid)
}

export async function incrementUserBundles(uid: string): Promise<{ success: boolean; reason?: string }> {
  console.log("🔄 Incrementing bundles for:", uid.substring(0, 8) + "...")

  const membership = await getMembership(uid)
  if (membership && membership.isActive) {
    console.log("✅ Pro user - unlimited bundles")
    await incrementBundles(uid)
    return { success: true }
  }

  // User is starter - check limits and consume bundle slots if needed
  console.log("🔄 Starter user - checking limits and bundle slots...")

  const freeUser = await getFreeUser(uid)
  if (!freeUser) {
    return { success: false, reason: "User not found" }
  }

  // Check if within base starter limit
  if (freeUser.bundlesCreated < freeUser.bundlesLimit) {
    console.log("✅ Within base starter limit, incrementing normally")
    return await incrementFreeUserBundles(uid)
  }

  console.log("🔄 Beyond starter limit, checking bundle slots...")
  const slotResult = await consumeBundleSlot(uid)

  if (!slotResult.success) {
    console.log("❌ No bundle slots available")
    return {
      success: false,
      reason: `Bundle limit reached (${freeUser.bundlesLimit} bundles max). Purchase extra bundle slots or upgrade to Creator Pro for unlimited bundles.`,
    }
  }

  // Consume slot successful, increment bundle count
  console.log("✅ Bundle slot consumed, incrementing bundle count")
  const incrementResult = await incrementFreeUserBundles(uid)

  if (!incrementResult.success) {
    console.error("❌ Failed to increment bundle count after consuming slot")
    return { success: false, reason: "Failed to create bundle after consuming slot" }
  }

  console.log("✅ Bundle created using purchased slot")
  return { success: true }
}

export async function canUserAddVideoToBundle(
  uid: string,
  currentVideoCount: number,
): Promise<{ allowed: boolean; reason?: string }> {
  console.log("🔄 Checking video bundle limit for:", uid.substring(0, 8) + "...")

  const membership = await getMembership(uid)
  if (membership && membership.isActive) {
    console.log("✅ Pro user - unlimited videos per bundle")
    return { allowed: true }
  }

  // User is starter - check video per bundle limit
  const freeUser = await getFreeUser(uid)
  if (!freeUser) {
    console.log("❌ Starter user not found")
    return { allowed: false, reason: "User not found" }
  }

  if (currentVideoCount >= freeUser.maxVideosPerBundle) {
    console.log("❌ Video per bundle limit reached")
    return {
      allowed: false,
      reason: `Starter tier limited to ${freeUser.maxVideosPerBundle} videos per bundle. Upgrade to Creator Pro for unlimited videos.`,
    }
  }

  console.log("✅ Video can be added to bundle")
  return { allowed: true }
}
