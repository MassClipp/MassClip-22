import { getMembership, getTierInfo, type TierInfo } from "./memberships-service"
import { incrementFreeUserBundles, incrementFreeUserDownloads, checkFreeUserLimits } from "./free-users-service"

export async function incrementUserBundles(uid: string): Promise<void> {
  const membership = await getMembership(uid)

  // Only increment for free users (Creator Pro has unlimited)
  if (!membership || membership.plan === "free") {
    await incrementFreeUserBundles(uid)
  }
}

export async function incrementUserDownloads(uid: string): Promise<void> {
  const membership = await getMembership(uid)

  // Only increment for free users (Creator Pro has unlimited)
  if (!membership || membership.plan === "free") {
    await incrementFreeUserDownloads(uid)
  }
}

export async function getUserTierInfo(uid: string): Promise<
  TierInfo & {
    canDownload: boolean
    canCreateBundle: boolean
  }
> {
  const tierInfo = await getTierInfo(uid)

  // For Creator Pro users, they have unlimited access
  if (tierInfo.plan === "creator_pro" && tierInfo.status === "active") {
    return {
      ...tierInfo,
      canDownload: true,
      canCreateBundle: true,
    }
  }

  // For free users, check limits
  const limits = await checkFreeUserLimits(uid)

  return {
    ...tierInfo,
    canDownload: limits.canDownload,
    canCreateBundle: limits.canCreateBundle,
  }
}

export async function checkUserCanDownload(uid: string): Promise<boolean> {
  const tierInfo = await getUserTierInfo(uid)
  return tierInfo.canDownload
}

export async function checkUserCanCreateBundle(uid: string): Promise<boolean> {
  const tierInfo = await getUserTierInfo(uid)
  return tierInfo.canCreateBundle
}

export async function getUserUsageStats(uid: string): Promise<{
  plan: "free" | "creator_pro"
  status: string
  downloadsUsed: number
  bundlesUsed: number
  maxDownloads: number
  maxBundles: number
  downloadsRemaining: number
  bundlesRemaining: number
}> {
  const tierInfo = await getUserTierInfo(uid)

  const downloadsRemaining =
    tierInfo.maxDownloads === -1
      ? -1 // Unlimited
      : Math.max(0, tierInfo.maxDownloads - tierInfo.downloadsUsed)

  const bundlesRemaining =
    tierInfo.maxBundles === -1
      ? -1 // Unlimited
      : Math.max(0, tierInfo.maxBundles - tierInfo.bundlesUsed)

  return {
    plan: tierInfo.plan,
    status: tierInfo.status,
    downloadsUsed: tierInfo.downloadsUsed,
    bundlesUsed: tierInfo.bundlesUsed,
    maxDownloads: tierInfo.maxDownloads,
    maxBundles: tierInfo.maxBundles,
    downloadsRemaining,
    bundlesRemaining,
  }
}
