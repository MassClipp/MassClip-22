import { getMembership, toTierInfo } from "@/lib/memberships-service"
import { getFreeUserLimits } from "@/lib/free-users-service"

export interface TierInfo {
  tier: "free" | "creator_pro"
  downloadsUsed: number
  downloadsLimit: number | null
  bundlesCreated: number
  bundlesLimit: number | null
  maxVideosPerBundle: number | null
  platformFeePercentage: number
  reachedDownloadLimit: boolean
  reachedBundleLimit: boolean
}

export class UserTierService {
  /**
   * Single source of truth for user tier information
   * Checks memberships first, then falls back to freeUsers
   */
  static async getUserTierInfo(uid: string): Promise<TierInfo> {
    // First check if user has active membership
    const membership = await getMembership(uid)

    if (membership && membership.isActive && membership.plan === "creator_pro") {
      // User has active pro membership - unlimited everything
      return toTierInfo(membership)
    }

    // Fall back to free user limitations
    const freeUserLimits = await getFreeUserLimits(uid)

    if (!freeUserLimits) {
      // User doesn't exist in either collection - return default free limits
      return {
        tier: "free",
        downloadsUsed: 0,
        downloadsLimit: 5,
        bundlesCreated: 0,
        bundlesLimit: 2,
        maxVideosPerBundle: 10,
        platformFeePercentage: 20,
        reachedDownloadLimit: false,
        reachedBundleLimit: false,
      }
    }

    // Return free user limits
    return {
      tier: "free",
      downloadsUsed: freeUserLimits.downloadsUsed,
      downloadsLimit: freeUserLimits.downloadsLimit,
      bundlesCreated: freeUserLimits.bundlesCreated,
      bundlesLimit: freeUserLimits.bundlesLimit,
      maxVideosPerBundle: 10,
      platformFeePercentage: 20,
      reachedDownloadLimit: freeUserLimits.downloadsUsed >= freeUserLimits.downloadsLimit,
      reachedBundleLimit: freeUserLimits.bundlesCreated >= freeUserLimits.bundlesLimit,
    }
  }

  /**
   * Check if user can download (has remaining downloads)
   */
  static async canDownload(uid: string): Promise<boolean> {
    const tierInfo = await this.getUserTierInfo(uid)

    // Pro users have unlimited downloads
    if (tierInfo.tier === "creator_pro") {
      return true
    }

    // Free users check against limit
    return !tierInfo.reachedDownloadLimit
  }

  /**
   * Check if user can create bundle (has remaining bundle slots)
   */
  static async canCreateBundle(uid: string): Promise<boolean> {
    const tierInfo = await this.getUserTierInfo(uid)

    // Pro users have unlimited bundles
    if (tierInfo.tier === "creator_pro") {
      return true
    }

    // Free users check against limit
    return !tierInfo.reachedBundleLimit
  }
}

// Named exports for compatibility
export async function getUserTierInfo(uid: string): Promise<TierInfo> {
  return UserTierService.getUserTierInfo(uid)
}

export async function canDownload(uid: string): Promise<boolean> {
  return UserTierService.canDownload(uid)
}

export async function canCreateBundle(uid: string): Promise<boolean> {
  return UserTierService.canCreateBundle(uid)
}
