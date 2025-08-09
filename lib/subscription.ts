import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

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

export async function checkSubscription(userId?: string): Promise<SubscriptionData> {
  try {
    if (!userId) {
      return {
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
    }

    const userDoc = await getDoc(doc(db, "users", userId))

    if (!userDoc.exists()) {
      return {
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
    }

    const userData = userDoc.data()
    const plan = userData.plan || "free"
    const isActive = userData.subscriptionActive || false

    const features = {
      unlimitedDownloads: plan === "pro" || plan === "creator_pro",
      premiumContent: plan === "pro" || plan === "creator_pro",
      noWatermark: plan === "pro" || plan === "creator_pro",
      prioritySupport: plan === "pro" || plan === "creator_pro",
      platformFeePercentage: plan === "pro" || plan === "creator_pro" ? 10 : 20,
      maxVideosPerBundle: plan === "pro" || plan === "creator_pro" ? null : 10,
      maxBundles: plan === "pro" || plan === "creator_pro" ? null : 2,
    }

    return {
      isActive,
      plan,
      stripeCustomerId: userData.stripeCustomerId,
      stripeSubscriptionId: userData.stripeSubscriptionId,
      currentPeriodEnd: userData.currentPeriodEnd?.toDate(),
      features,
    }
  } catch (error) {
    console.error("Error checking subscription:", error)
    return {
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
  }
}

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
      return {
        unlimitedDownloads: false,
        premiumContent: false,
        noWatermark: false,
        prioritySupport: false,
        platformFeePercentage: 20,
        maxVideosPerBundle: 10,
        maxBundles: 2,
      }
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
  return plan === "pro" || plan === "creator_pro" ? null : 10
}

export function getMaxBundles(plan: string): number | null {
  return plan === "pro" || plan === "creator_pro" ? null : 2
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
