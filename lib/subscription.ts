import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { getMembership } from "@/lib/memberships-service"

export type SubscriptionStatus = "active" | "inactive" | "canceled" | "past_due" | "trialing"

export interface SubscriptionData {
  isActive: boolean
  plan: "starter" | "pro" | "creator_pro" | "faceless_pro" | "facelessprenuer"
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  currentPeriodEnd?: Date
  features: {
    platformFeePercentage: number
    maxVideosPerBundle: number | null
    maxBundles: number | null
    maxFolders: number | null
    canCreateSubfolders: boolean
    canAnalyzeTranscripts: boolean
    canCreateBundles: boolean
  }
}

const STARTER_DEFAULTS = {
  platformFeePercentage: 20,
  maxVideosPerBundle: 15,
  maxBundles: 5,
  maxFolders: 3,
  canCreateSubfolders: true,
  canAnalyzeTranscripts: false,
  canCreateBundles: false,
}

const FACELESS_PRO_FEATURES = {
  platformFeePercentage: 20,
  maxVideosPerBundle: 15,
  maxBundles: 5,
  maxFolders: 3,
  canCreateSubfolders: true,
  canAnalyzeTranscripts: false,
  canCreateBundles: false,
}

const FACELESSPRENUER_FEATURES = {
  platformFeePercentage: 10,
  maxVideosPerBundle: null,
  maxBundles: null,
  maxFolders: null,
  canCreateSubfolders: true,
  canAnalyzeTranscripts: true,
  canCreateBundles: true,
}

export async function checkSubscription(userId?: string): Promise<SubscriptionData> {
  try {
    if (!userId) {
      return {
        isActive: false,
        plan: "starter",
        features: { ...STARTER_DEFAULTS },
      }
    }

    const membership = await getMembership(userId)
    if (membership && membership.isActive) {
      const plan = membership.plan as "starter" | "pro" | "creator_pro" | "faceless_pro" | "facelessprenuer"

      let features
      if (plan === "faceless_pro") {
        features = { ...FACELESS_PRO_FEATURES }
      } else if (plan === "facelessprenuer") {
        features = { ...FACELESSPRENUER_FEATURES }
      } else if (plan === "starter") {
        features = { ...STARTER_DEFAULTS }
      } else {
        // creator_pro or pro
        features = {
          platformFeePercentage: 10,
          maxVideosPerBundle: null,
          maxBundles: null,
          maxFolders: null,
          canCreateSubfolders: true,
          canAnalyzeTranscripts: true,
          canCreateBundles: true,
        }
      }

      return {
        isActive: true,
        plan,
        stripeCustomerId: membership.stripeCustomerId,
        stripeSubscriptionId: membership.stripeSubscriptionId,
        currentPeriodEnd: membership.currentPeriodEnd,
        features,
      }
    }

    const freeSnap = await getDoc(doc(db, "freeUsers", userId))
    if (freeSnap.exists()) {
      const data = freeSnap.data() as any

      const platformFeePercentage =
        typeof data.platformFeePercentage === "number"
          ? data.platformFeePercentage
          : STARTER_DEFAULTS.platformFeePercentage

      const maxVideosPerBundle =
        typeof data.maxVideosPerBundle === "number" ? data.maxVideosPerBundle : STARTER_DEFAULTS.maxVideosPerBundle

      const maxBundles = typeof data.bundlesLimit === "number" ? data.bundlesLimit : STARTER_DEFAULTS.maxBundles

      const maxFolders = typeof data.maxFolders === "number" ? data.maxFolders : STARTER_DEFAULTS.maxFolders

      const canCreateSubfolders =
        typeof data.canCreateSubfolders === "boolean" ? data.canCreateSubfolders : STARTER_DEFAULTS.canCreateSubfolders

      const canAnalyzeTranscripts =
        typeof data.canAnalyzeTranscripts === "boolean"
          ? data.canAnalyzeTranscripts
          : STARTER_DEFAULTS.canAnalyzeTranscripts

      const canCreateBundles =
        typeof data.canCreateBundles === "boolean" ? data.canCreateBundles : STARTER_DEFAULTS.canCreateBundles

      return {
        isActive: false,
        plan: "starter",
        features: {
          platformFeePercentage,
          maxVideosPerBundle,
          maxBundles,
          maxFolders,
          canCreateSubfolders,
          canAnalyzeTranscripts,
          canCreateBundles,
        },
      }
    }

    return {
      isActive: false,
      plan: "starter",
      features: { ...STARTER_DEFAULTS },
    }
  } catch (error) {
    console.error("Error checking subscription (tier lookup):", error)
    return {
      isActive: false,
      plan: "starter",
      features: { ...STARTER_DEFAULTS },
    }
  }
}

export function getSubscriptionFeatures(plan: string) {
  if (plan === "faceless_pro") {
    return { ...FACELESS_PRO_FEATURES }
  }
  if (plan === "facelessprenuer") {
    return { ...FACELESSPRENUER_FEATURES }
  }

  switch (plan) {
    case "pro":
    case "creator_pro":
      return {
        platformFeePercentage: 10,
        maxVideosPerBundle: null,
        maxBundles: null,
        maxFolders: null,
        canCreateSubfolders: true,
        canAnalyzeTranscripts: true,
        canCreateBundles: true,
      }
    default:
      return { ...STARTER_DEFAULTS }
  }
}

export function getPlatformFeePercentage(plan: string): number {
  if (plan === "faceless_pro") return 20
  if (plan === "facelessprenuer") return 10
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
  if (plan === "faceless_pro") return 15
  if (plan === "facelessprenuer") return null
  return plan === "pro" || plan === "creator_pro" ? null : STARTER_DEFAULTS.maxVideosPerBundle
}

export function getMaxBundles(plan: string): number | null {
  if (plan === "faceless_pro") return 5
  if (plan === "facelessprenuer") return null
  return plan === "pro" || plan === "creator_pro" ? null : STARTER_DEFAULTS.maxBundles
}

export function getMaxFolders(plan: string): number | null {
  if (plan === "faceless_pro") return 3
  if (plan === "facelessprenuer") return null
  return plan === "pro" || plan === "creator_pro" ? null : STARTER_DEFAULTS.maxFolders
}

export function canCreateSubfolders(plan: string): boolean {
  return plan === "pro" || plan === "creator_pro" || plan === "faceless_pro" || plan === "facelessprenuer"
}

export function canAnalyzeTranscripts(plan: string): boolean {
  return plan === "facelessprenuer" || plan === "creator_pro" || plan === "pro"
}

export function canUserCreateBundlesManually(plan: string): boolean {
  return plan === "faceless_pro" || plan === "facelessprenuer" || plan === "creator_pro" || plan === "pro"
}

export { canUserCreateBundlesManually as canUserCreateBundles }
