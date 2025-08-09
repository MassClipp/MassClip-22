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
