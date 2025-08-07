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
      }
    default:
      return {
        unlimitedDownloads: false,
        premiumContent: false,
        noWatermark: false,
        prioritySupport: false,
        platformFeePercentage: 20,
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
