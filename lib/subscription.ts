import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { getMembership } from "@/lib/memberships-service"

export type SubscriptionStatus = "active" | "inactive" | "canceled" | "past_due" | "trialing"

export interface SubscriptionData {
  isActive: boolean
  plan: "free" | "pro" | "creator_pro"
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  currentPeriodEnd?: Date
  features: {
    unlimitedDownloads: boolean
    premiumContent: boolean
    noWatermark: boolean
    prioritySupport: boolean
    platformFeePercentage: number
    maxVideosPerBundle: number | null // null means unlimited
    maxBundles: number | null // null means unlimited
  }
}

// Defaults for free tier
const FREE_DEFAULTS = {
  unlimitedDownloads: false,
  premiumContent: false,
  noWatermark: false,
  prioritySupport: false,
  platformFeePercentage: 20,
  maxVideosPerBundle: 10,
  maxBundles: 2,
}

export async function checkSubscription(userId?: string): Promise<SubscriptionData> {
  try {
    if (!userId) {
      // Anonymous/unauthenticated -> treat as free
      return {
        isActive: false,
        plan: "free",
        features: { ...FREE_DEFAULTS },
      }
    }

    const membership = await getMembership(userId)
    if (membership && membership.isActive) {
      return {
        isActive: true,
        plan: "creator_pro",
        stripeCustomerId: membership.stripeCustomerId,
        stripeSubscriptionId: membership.stripeSubscriptionId,
        currentPeriodEnd: membership.currentPeriodEnd,
        features: {
          unlimitedDownloads: true,
          premiumContent: true,
          noWatermark: true,
          prioritySupport: true,
          platformFeePercentage: 10,
          maxVideosPerBundle: null, // unlimited
          maxBundles: null, // unlimited
        },
      }
    }

    const freeSnap = await getDoc(doc(db, "freeUsers", userId))
    if (freeSnap.exists()) {
      const data = freeSnap.data() as any

      // Prefer stored limits if present, fallback to defaults
      const platformFeePercentage =
        typeof data.platformFeePercentage === "number"
          ? data.platformFeePercentage
          : FREE_DEFAULTS.platformFeePercentage

      const maxVideosPerBundle =
        typeof data.maxVideosPerBundle === "number" ? data.maxVideosPerBundle : FREE_DEFAULTS.maxVideosPerBundle

      const maxBundles = typeof data.bundlesLimit === "number" ? data.bundlesLimit : FREE_DEFAULTS.maxBundles

      return {
        isActive: false,
        plan: "free",
        features: {
          unlimitedDownloads: false,
          premiumContent: false,
          noWatermark: false,
          prioritySupport: false,
          platformFeePercentage,
          maxVideosPerBundle,
          maxBundles,
        },
      }
    }

    return {
      isActive: false,
      plan: "free",
      features: { ...FREE_DEFAULTS },
    }
  } catch (error) {
    console.error("Error checking subscription (tier lookup):", error)
    return {
      isActive: false,
      plan: "free",
      features: { ...FREE_DEFAULTS },
    }
  }
}

// Kept for compatibility with any existing callers that check "pro" too.
export function getSubscriptionFeatures(plan: string) {
  switch (plan) {
    case "pro":
    case "creator_pro":
      return {
        unlimitedDownloads: true,
        premiumContent: true,
        noWatermark: true,
        prioritySupport: true,
        platformFeePercentage: 10,
        maxVideosPerBundle: null, // unlimited
        maxBundles: null, // unlimited
      }
    default:
      return { ...FREE_DEFAULTS }
  }
}

export function getPlatformFeePercentage(plan: string): number {
  return plan === "pro" || plan === "creator_pro" ? 10 : 20
}

export function calculatePlatformFee(amount: number, plan: string): number {
  const feePercentage = getPlatformFeePercentage(plan)
  return Math.round((amount * feePercentage) / 100)
}

export function calculateCreatorEarnings(amount: number, plan: string): number {
  const platformFee = calculatePlatformFee(amount, plan)
  return amount - platformFee
}

export function getMaxVideosPerBundle(plan: string): number | null {
  return plan === "pro" || plan === "creator_pro" ? null : FREE_DEFAULTS.maxVideosPerBundle
}

export function getMaxBundles(plan: string): number | null {
  return plan === "pro" || plan === "creator_pro" ? null : FREE_DEFAULTS.maxBundles
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
