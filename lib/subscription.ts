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
  }
}

export async function checkSubscription(userId?: string): Promise<SubscriptionData> {
  try {
    // Temporarily return creator_pro plan for all users
    return {
      isActive: true,
      plan: "creator_pro",
      features: {
        unlimitedDownloads: true,
        premiumContent: true,
        noWatermark: true,
        prioritySupport: true,
      },
    }

    // Original logic commented out temporarily
    /*
    if (!userId) {
      return {
        isActive: false,
        plan: "free",
        features: {
          unlimitedDownloads: false,
          premiumContent: false,
          noWatermark: false,
          prioritySupport: false,
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
    }

    return {
      isActive,
      plan,
      stripeCustomerId: userData.stripeCustomerId,
      stripeSubscriptionId: userData.stripeSubscriptionId,
      currentPeriodEnd: userData.currentPeriodEnd?.toDate(),
      features,
    }
    */
  } catch (error) {
    console.error("Error checking subscription:", error)
    // Even on error, temporarily return creator_pro
    return {
      isActive: true,
      plan: "creator_pro",
      features: {
        unlimitedDownloads: true,
        premiumContent: true,
        noWatermark: true,
        prioritySupport: true,
      },
    }
  }
}

export function getSubscriptionFeatures(plan: string) {
  // Temporarily always return full features
  return {
    unlimitedDownloads: true,
    premiumContent: true,
    noWatermark: true,
    prioritySupport: true,
  }

  // Original logic commented out
  /*
  switch (plan) {
    case "pro":
    case "creator_pro":
      return {
        unlimitedDownloads: true,
        premiumContent: true,
        noWatermark: true,
        prioritySupport: true,
      }
    default:
      return {
        unlimitedDownloads: false,
        premiumContent: false,
        noWatermark: false,
        prioritySupport: false,
      }
  }
  */
}
