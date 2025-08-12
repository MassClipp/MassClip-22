import {
  getFreeUser,
  incrementFreeUserDownloads,
  incrementFreeUserBundles,
  checkFreeUserLimits,
} from "@/lib/free-users-service"
import { getMembership, type TierInfo } from "@/lib/memberships-service"

export interface UserTierInfo extends TierInfo {
  tier: "free" | "creator_pro"
  downloadsUsed: number
  downloadsLimit: number
  bundlesCreated: number
  bundlesLimit: number
  maxVideosPerBundle: number
  platformFeePercentage: number
  reachedDownloadLimit: boolean
  reachedBundleLimit: boolean
  hasActiveSubscription?: boolean
  subscriptionStatus?: string
}

export async function getUserTierInfo(uid: string): Promise<UserTierInfo> {
  try {
    // First check membership (paid plans)
    const membership = await getMembership(uid)

    if (membership && membership.plan === "creator_pro" && membership.status === "active") {
      // User has active Creator Pro subscription
      return {
        tier: "creator_pro",
        downloadsUsed: 0,
        downloadsLimit: -1, // Unlimited
        bundlesCreated: 0,
        bundlesLimit: -1, // Unlimited
        maxVideosPerBundle: -1, // Unlimited
        platformFeePercentage: 10,
        reachedDownloadLimit: false,
        reachedBundleLimit: false,
        hasActiveSubscription: true,
        subscriptionStatus: membership.status,
      }
    }

    // Fall back to free user limits
    const freeUser = await getFreeUser(uid)

    if (!freeUser) {
      // No records found, return default free tier
      return {
        tier: "free",
        downloadsUsed: 0,
        downloadsLimit: 10,
        bundlesCreated: 0,
        bundlesLimit: 2,
        maxVideosPerBundle: 10,
        platformFeePercentage: 20,
        reachedDownloadLimit: false,
        reachedBundleLimit: false,
        hasActiveSubscription: false,
        subscriptionStatus: membership?.status || "inactive",
      }
    }

    // Return free user tier info
    const limits = await checkFreeUserLimits(uid)

    return {
      tier: "free",
      downloadsUsed: freeUser.downloadsUsed,
      downloadsLimit: freeUser.downloadsLimit,
      bundlesCreated: freeUser.bundlesCreated,
      bundlesLimit: freeUser.bundlesLimit,
      maxVideosPerBundle: 10,
      platformFeePercentage: 20,
      reachedDownloadLimit: !limits.canDownload,
      reachedBundleLimit: !limits.canCreateBundle,
      hasActiveSubscription: false,
      subscriptionStatus: membership?.status || "inactive",
    }
  } catch (error) {
    console.error("❌ Error getting user tier info:", error)

    // Return safe defaults on error
    return {
      tier: "free",
      downloadsUsed: 0,
      downloadsLimit: 10,
      bundlesCreated: 0,
      bundlesLimit: 2,
      maxVideosPerBundle: 10,
      platformFeePercentage: 20,
      reachedDownloadLimit: false,
      reachedBundleLimit: false,
      hasActiveSubscription: false,
    }
  }
}

export async function incrementUserDownloads(uid: string): Promise<boolean> {
  try {
    // Check if user has Creator Pro
    const membership = await getMembership(uid)

    if (membership && membership.plan === "creator_pro" && membership.status === "active") {
      // Creator Pro users have unlimited downloads
      return true
    }

    // For free users, increment and check limits
    return await incrementFreeUserDownloads(uid)
  } catch (error) {
    console.error("❌ Error incrementing user downloads:", error)
    return false
  }
}

export async function incrementUserBundles(uid: string): Promise<boolean> {
  try {
    // Check if user has Creator Pro
    const membership = await getMembership(uid)

    if (membership && membership.plan === "creator_pro" && membership.status === "active") {
      // Creator Pro users have unlimited bundles
      return true
    }

    // For free users, increment and check limits
    return await incrementFreeUserBundles(uid)
  } catch (error) {
    console.error("❌ Error incrementing user bundles:", error)
    return false
  }
}

export async function canUserDownload(uid: string): Promise<boolean> {
  try {
    const tierInfo = await getUserTierInfo(uid)

    if (tierInfo.tier === "creator_pro") {
      return true // Unlimited
    }

    return !tierInfo.reachedDownloadLimit
  } catch (error) {
    console.error("❌ Error checking download permission:", error)
    return false
  }
}

export async function canUserCreateBundle(uid: string): Promise<boolean> {
  try {
    const tierInfo = await getUserTierInfo(uid)

    if (tierInfo.tier === "creator_pro") {
      return true // Unlimited
    }

    return !tierInfo.reachedBundleLimit
  } catch (error) {
    console.error("❌ Error checking bundle creation permission:", error)
    return false
  }
}

export async function getUserDownloadsRemaining(uid: string): Promise<number> {
  try {
    const tierInfo = await getUserTierInfo(uid)

    if (tierInfo.tier === "creator_pro") {
      return -1 // Unlimited
    }

    return Math.max(0, tierInfo.downloadsLimit - tierInfo.downloadsUsed)
  } catch (error) {
    console.error("❌ Error getting downloads remaining:", error)
    return 0
  }
}

export async function getUserBundlesRemaining(uid: string): Promise<number> {
  try {
    const tierInfo = await getUserTierInfo(uid)

    if (tierInfo.tier === "creator_pro") {
      return -1 // Unlimited
    }

    return Math.max(0, tierInfo.bundlesLimit - tierInfo.bundlesCreated)
  } catch (error) {
    console.error("❌ Error getting bundles remaining:", error)
    return 0
  }
}
