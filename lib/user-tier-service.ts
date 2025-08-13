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

  // Check if user has active pro membership first
  const membership = await getMembership(uid)
  if (membership) {
    console.log("✅ User has active creator_pro membership")
    return "creator_pro"
  }

  // Check if user has active free user document
  const freeUser = await getFreeUser(uid)
  if (freeUser) {
    console.log("✅ User has active free tier")
    return "free"
  }

  // No active documents found - this shouldn't happen, but default to free
  console.warn("⚠️ No active user documents found, defaulting to free")
  return "free"
}

export async function getUserTierInfo(uid: string): Promise<TierInfo> {
  console.log("🔄 Getting tier info for:", uid.substring(0, 8) + "...")

  // Check if user has active pro membership first
  const membership = await getMembership(uid)
  if (membership) {
    console.log("✅ Returning active pro tier info")
    return toTierInfo(membership)
  }

  // User should have active free user document
  console.log("🔄 Getting active free user info...")
  let freeUser = await getFreeUser(uid)

  if (!freeUser) {
    console.log("🔄 No active free user found, creating new one...")
    freeUser = await createFreeUser(uid, "")
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

  console.log("✅ Returning active free tier info:", tierInfo)
  return tierInfo
}

export async function incrementUserDownloads(uid: string): Promise<{ success: boolean; reason?: string }> {
  console.log("🔄 Incrementing downloads for:", uid.substring(0, 8) + "...")

  // Check if user has active pro membership first
  const membership = await getMembership(uid)
  if (membership) {
    console.log("✅ Active pro user - unlimited downloads")
    await incrementDownloads(uid)
    return { success: true }
  }

  // User should have active free user document - check limits
  console.log("🔄 Active free user - checking limits...")
  return await incrementFreeUserDownloads(uid)
}

export async function incrementUserBundles(uid: string): Promise<{ success: boolean; reason?: string }> {
  console.log("🔄 Incrementing bundles for:", uid.substring(0, 8) + "...")

  // Check if user has active pro membership first
  const membership = await getMembership(uid)
  if (membership) {
    console.log("✅ Active pro user - unlimited bundles")
    await incrementBundles(uid)
    return { success: true }
  }

  // User should have active free user document - check limits
  console.log("🔄 Active free user - checking limits...")
  return await incrementFreeUserBundles(uid)
}

export async function canUserAddVideoToBundle(
  uid: string,
  currentVideoCount: number,
): Promise<{ allowed: boolean; reason?: string }> {
  console.log("🔄 Checking video bundle limit for:", uid.substring(0, 8) + "...")

  // Check if user has active pro membership first
  const membership = await getMembership(uid)
  if (membership) {
    console.log("✅ Active pro user - unlimited videos per bundle")
    return { allowed: true }
  }

  // User should have active free user document - check video per bundle limit
  const freeUser = await getFreeUser(uid)
  if (!freeUser) {
    console.log("❌ No active free user found")
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
