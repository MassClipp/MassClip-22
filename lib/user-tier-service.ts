import {
  getFreeUser,
  getFreeUserLimits,
  incrementDownloads as incrementFreeDownloads,
  incrementBundles as incrementFreeBundles,
} from "./free-users-service"
import {
  getMembership,
  toTierInfo,
  incrementDownloads as incrementMembershipDownloads,
  incrementBundles as incrementMembershipBundles,
} from "./memberships-service"

export type UserTier = "free" | "creator_pro"

export interface UserTierInfo {
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

export async function getUserTierInfo(uid: string): Promise<UserTierInfo> {
  // First check if user has active membership
  const membership = await getMembership(uid)
  if (membership && membership.isActive && membership.plan === "creator_pro") {
    return toTierInfo(membership)
  }

  // Fall back to free user limitations
  const freeUser = await getFreeUser(uid)
  if (!freeUser) {
    throw new Error(`No free user record found for uid: ${uid}`)
  }

  return getFreeUserLimits(freeUser)
}

export async function incrementUserDownloads(uid: string): Promise<void> {
  // Check if user has active membership first
  const membership = await getMembership(uid)
  if (membership && membership.isActive && membership.plan === "creator_pro") {
    await incrementMembershipDownloads(uid)
    return
  }

  // Otherwise increment free user downloads
  await incrementFreeDownloads(uid)
}

export async function incrementUserBundles(uid: string): Promise<void> {
  // Check if user has active membership first
  const membership = await getMembership(uid)
  if (membership && membership.isActive && membership.plan === "creator_pro") {
    await incrementMembershipBundles(uid)
    return
  }

  // Otherwise increment free user bundles
  await incrementFreeBundles(uid)
}

export async function canUserDownload(uid: string): Promise<{ allowed: boolean; reason?: string }> {
  const tierInfo = await getUserTierInfo(uid)

  if (tierInfo.tier === "creator_pro") {
    return { allowed: true }
  }

  if (tierInfo.reachedDownloadLimit) {
    return { allowed: false, reason: "Download limit reached" }
  }

  return { allowed: true }
}

export async function canUserCreateBundle(uid: string): Promise<{ allowed: boolean; reason?: string }> {
  const tierInfo = await getUserTierInfo(uid)

  if (tierInfo.tier === "creator_pro") {
    return { allowed: true }
  }

  if (tierInfo.reachedBundleLimit) {
    return { allowed: false, reason: "Bundle limit reached" }
  }

  return { allowed: true }
}
