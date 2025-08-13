import { getFreeUser, createFreeUser, incrementFreeUserDownloads, incrementFreeUserBundles } from "./free-users-service"
import { getMembership, incrementDownloads, incrementBundles, toTierInfo } from "./memberships-service"

export type UserTier = "free" | "creator_pro"

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

  // Check if user is pro first
  const membership = await getMembership(uid)
  if (membership && membership.isActive) {
    console.log("✅ User is creator_pro")
    return "creator_pro"
  }

  // User is free tier
  console.log("✅ User is free tier")
  return "free"
}

export async function getUserTierInfo(uid: string): Promise<TierInfo> {
  console.log("🔄 Getting tier info for:", uid.substring(0, 8) + "...")

  // Check if user is pro first
  const membership = await getMembership(uid)
  if (membership && membership.isActive) {
    console.log("✅ Returning pro tier info")
    return toTierInfo(membership)
  }

  // User is free - get from freeUsers collection
  console.log("🔄 Getting free user info...")
  let freeUser = await getFreeUser(uid)

  if (!freeUser) {
    console.log("🔄 Creating new free user...")
    freeUser = await createFreeUser(uid)
  }

  const tierInfo: TierInfo = {
    tier: "free",
    downloadsUsed: freeUser.downloadsUsed,
    downloadsLimit: freeUser.downloadsLimit,
    bundlesCreated: freeUser.bundlesCreated,
    bundlesLimit: freeUser.bundlesLimit,
    maxVideosPerBundle: freeUser.maxVideosPerBundle,
    platformFeePercentage: freeUser.platformFeePercentage,
    reachedDownloadLimit: freeUser.downloadsUsed >= freeUser.downloadsLimit,
    reachedBundleLimit: freeUser.bundlesCreated >= freeUser.bundlesLimit,
  }

  console.log("✅ Returning free tier info:", tierInfo)
  return tierInfo
}

export async function incrementUserDownloads(uid: string): Promise<{ success: boolean; reason?: string }> {
  console.log("🔄 Incrementing downloads for:", uid.substring(0, 8) + "...")

  // Check if user is pro first
  const membership = await getMembership(uid)
  if (membership && membership.isActive) {
    console.log("✅ Pro user - unlimited downloads")
    await incrementDownloads(uid)
    return { success: true }
  }

  // User is free - check limits
  console.log("🔄 Free user - checking limits...")
  return await incrementFreeUserDownloads(uid)
}

export async function incrementUserBundles(uid: string): Promise<{ success: boolean; reason?: string }> {
  console.log("🔄 Incrementing bundles for:", uid.substring(0, 8) + "...")

  // Check if user is pro first
  const membership = await getMembership(uid)
  if (membership && membership.isActive) {
    console.log("✅ Pro user - unlimited bundles")
    await incrementBundles(uid)
    return { success: true }
  }

  // User is free - check limits
  console.log("🔄 Free user - checking limits...")
  return await incrementFreeUserBundles(uid)
}

export async function canUserAddVideoToBundle(
  uid: string,
  currentVideoCount: number,
): Promise<{ allowed: boolean; reason?: string }> {
  console.log("🔄 Checking video bundle limit for:", uid.substring(0, 8) + "...")

  // Check if user is pro first
  const membership = await getMembership(uid)
  if (membership && membership.isActive) {
    console.log("✅ Pro user - unlimited videos per bundle")
    return { allowed: true }
  }

  // User is free - check video per bundle limit
  const freeUser = await getFreeUser(uid)
  if (!freeUser) {
    console.log("❌ Free user not found")
    return { allowed: false, reason: "User not found" }
  }

  if (currentVideoCount >= freeUser.maxVideosPerBundle) {
    console.log("❌ Video per bundle limit reached")
    return {
      allowed: false,
      reason: `Free tier limited to ${freeUser.maxVideosPerBundle} videos per bundle. Upgrade to Creator Pro for unlimited videos.`,
    }
  }

  console.log("✅ Video can be added to bundle")
  return { allowed: true }
}
