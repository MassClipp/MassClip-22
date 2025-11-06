import type { MembershipDoc } from "./membership-types"

export interface TierInfo {
  plan: "starter" | "pro" | "creator_pro"
  isActive: boolean
  features: {
    unlimitedDownloads: boolean
    premiumContent: boolean
    noWatermark: boolean
    prioritySupport: boolean
    platformFeePercentage: number
    maxVideosPerBundle: number | null
    maxBundles: number | null
    maxFolders: number | null
    canCreateSubfolders: boolean
    canAnalyzeTranscripts: boolean
    canCreateBundles: boolean
  }
  downloadsUsed?: number
  bundlesCreated?: number
  currentPeriodEnd?: Date | null
}

export function toTierInfo(membership: MembershipDoc): TierInfo {
  return {
    plan: membership.plan,
    isActive: membership.isActive,
    features: membership.features,
    downloadsUsed: membership.downloadsUsed,
    bundlesCreated: membership.bundlesCreated,
    currentPeriodEnd: membership.currentPeriodEnd,
  }
}
