import { auth } from "@/firebase/config"
import type { MembershipData } from "./membership-service"

export interface SubscriptionInfo {
  isActive: boolean
  plan: "free" | "creator_pro"
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  currentPeriodEnd?: Date
  features: {
    unlimitedDownloads: boolean
    premiumContent: boolean
    noWatermark: boolean
    prioritySupport: boolean
    platformFeePercentage: number
    maxVideosPerBundle: number | null
    maxBundles: number | null
  }
}

const FREE_DEFAULTS: SubscriptionInfo = {
  isActive: false,
  plan: "free",
  features: {
    unlimitedDownloads: false,
    premiumContent: false,
    noWatermark: false,
    prioritySupport: false,
    platformFeePercentage: 20,
    maxVideosPerBundle: 10,
    maxBundles: 2,
  },
}

// This function is designed to be called from the client-side.
export async function checkClientSubscription(): Promise<SubscriptionInfo> {
  const user = auth.currentUser
  if (!user) {
    return { ...FREE_DEFAULTS }
  }

  try {
    const token = await user.getIdToken()
    const response = await fetch("/api/user/membership", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      console.error("Failed to fetch membership status, falling back to free tier.")
      return { ...FREE_DEFAULTS }
    }

    const membership: MembershipData = await response.json()

    const plan = membership.tier
    const isActive = membership.isActive

    return {
      isActive,
      plan,
      stripeCustomerId: membership.stripeCustomerId,
      stripeSubscriptionId: membership.stripeSubscriptionId,
      currentPeriodEnd: membership.currentPeriodEnd
        ? new Date((membership.currentPeriodEnd as any)._seconds * 1000)
        : undefined,
      features: {
        unlimitedDownloads: isActive,
        premiumContent: isActive,
        noWatermark: isActive,
        prioritySupport: isActive,
        platformFeePercentage: isActive ? 10 : 20,
        maxVideosPerBundle: membership.limits.maxVideosPerBundle,
        maxBundles: membership.limits.bundlesLimit,
      },
    }
  } catch (error) {
    console.error("Error checking subscription:", error)
    return { ...FREE_DEFAULTS }
  }
}

// --- BACKWARD COMPATIBILITY LAYER ---

// Re-exporting `checkSubscription` which now uses the new client-side fetch.
// Note: This is now an async function. Callers may need to be updated.
export async function checkSubscription(userId?: string): Promise<SubscriptionInfo> {
  // If no userId is provided, or it doesn't match the current user, return free defaults.
  const currentUser = auth.currentUser
  if (!userId || !currentUser || currentUser.uid !== userId) {
    return FREE_DEFAULTS
  }
  return checkClientSubscription()
}

export function getPlatformFeePercentage(plan: string): number {
  return plan === "creator_pro" ? 10 : 20
}

export function calculatePlatformFee(amount: number, plan: string): number {
  const feePercentage = getPlatformFeePercentage(plan)
  return Math.round((amount * feePercentage) / 100)
}

function getMaxVideosPerBundle(plan: string): number | null {
  return plan === "creator_pro" ? null : 10
}

function getMaxBundles(plan: string): number | null {
  return plan === "creator_pro" ? null : 2
}

export function canAddVideoToBundle(currentVideoCount: number, plan: string): boolean {
  const maxVideos = getMaxVideosPerBundle(plan)
  if (maxVideos === null) return true // unlimited
  return currentVideoCount < maxVideos
}

export function canCreateBundle(currentBundleCount: number, plan: string): boolean {
  const maxBundles = getMaxBundles(plan)
  if (maxBundles === null) return true // unlimited
  return currentBundleCount < maxBundles
}
