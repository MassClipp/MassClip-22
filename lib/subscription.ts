import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { getMembership } from "@/lib/memberships-service"

export type SubscriptionStatus = "active" | "inactive" | "canceled" | "past_due" | "trialing"

export interface SubscriptionData {
  isActive: boolean
  plan: "starter" | "pro" | "creator_pro" // Changed "free" to "starter"
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
    maxFolders: number | null
    canCreateSubfolders: boolean
    canAnalyzeTranscripts: boolean
    canCreateBundles: boolean
  }
}

const STARTER_DEFAULTS = {
  unlimitedDownloads: false,
  premiumContent: false,
  noWatermark: false,
  prioritySupport: false,
  platformFeePercentage: 20,
  maxVideosPerBundle: 15, // Changed from 10 to 15
  maxBundles: 5, // Changed from 2 to 5
  maxFolders: 3, // Changed from 2 to 3
  canCreateSubfolders: true, // Changed from false to true
  canAnalyzeTranscripts: false,
  canCreateBundles: false,
}

export async function checkSubscription(userId?: string): Promise<SubscriptionData> {
  try {
    if (!userId) {
      return {
        isActive: false,
        plan: "starter", // Changed from "free" to "starter"
        features: { ...STARTER_DEFAULTS },
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
          maxVideosPerBundle: null,
          maxBundles: null,
          maxFolders: null,
          canCreateSubfolders: true,
          canAnalyzeTranscripts: true,
          canCreateBundles: true,
        },
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
        plan: "starter", // Changed from "free" to "starter"
        features: {
          unlimitedDownloads: false,
          premiumContent: false,
          noWatermark: false,
          prioritySupport: false,
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
      plan: "starter", // Changed from "free" to "starter"
      features: { ...STARTER_DEFAULTS },
    }
  } catch (error) {
    console.error("Error checking subscription (tier lookup):", error)
    return {
      isActive: false,
      plan: "starter", // Changed from "free" to "starter"
      features: { ...STARTER_DEFAULTS },
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
        maxVideosPerBundle: null,
        maxBundles: null,
        maxFolders: null,
        canCreateSubfolders: true,
        canAnalyzeTranscripts: true,
        canCreateBundles: true,
      }
    default:
      return { ...STARTER_DEFAULTS } // Using STARTER_DEFAULTS
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
  return plan === "pro" || plan === "creator_pro" ? null : STARTER_DEFAULTS.maxVideosPerBundle
}

export function getMaxBundles(plan: string): number | null {
  return plan === "pro" || plan === "creator_pro" ? null : STARTER_DEFAULTS.maxBundles
}

export function getMaxFolders(plan: string): number | null {
  return plan === "pro" || plan === "creator_pro" ? null : STARTER_DEFAULTS.maxFolders
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

export function canCreateSubfolders(plan: string): boolean {
  return plan === "pro" || plan === "creator_pro"
}

export function canAnalyzeTranscripts(plan: string): boolean {
  return plan === "pro" || plan === "creator_pro"
}

export function canUserCreateBundles(plan: string): boolean {
  return plan === "pro" || plan === "creator_pro"
}
