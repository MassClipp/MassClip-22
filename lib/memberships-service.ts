import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export type MembershipPlan = "creator_pro" | "starter" | "faceless_pro" | "facelessprenuer"
export type MembershipStatus = "active" | "inactive" | "canceled" | "past_due" | "trialing" | "incomplete"

export interface MembershipFeatures {
  unlimitedDownloads: boolean
  premiumContent: boolean
  noWatermark: boolean
  prioritySupport: boolean
  platformFeePercentage: number
  maxVideosPerBundle: number | null
  maxBundles: number | null
  maxFolders: number | null
}

export interface MembershipDoc {
  uid: string
  email?: string
  plan: MembershipPlan
  status: MembershipStatus
  isActive: boolean

  // Stripe related
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  currentPeriodEnd?: Date | null
  priceId?: string
  connectedAccountId?: string

  // Usage (for analytics only - no limits for pro users)
  downloadsUsed: number
  bundlesCreated: number

  // Features (pro features only)
  features: MembershipFeatures

  hasUsedFreeTrial?: boolean // Track if user has ever used free trial for facelessprenuer

  // Metadata
  createdAt: any
  updatedAt: any
}

const STARTER_FEATURES: MembershipFeatures = {
  unlimitedDownloads: false,
  premiumContent: false,
  noWatermark: false,
  prioritySupport: false,
  platformFeePercentage: 20,
  maxVideosPerBundle: 15,
  maxBundles: 5,
  maxFolders: 3,
}

const PRO_FEATURES: MembershipFeatures = {
  unlimitedDownloads: true,
  premiumContent: true,
  noWatermark: true,
  prioritySupport: true,
  platformFeePercentage: 10,
  maxVideosPerBundle: null, // unlimited
  maxBundles: null, // unlimited
  maxFolders: null,
}

const FACELESS_PRO_FEATURES: MembershipFeatures = {
  unlimitedDownloads: false,
  premiumContent: false,
  noWatermark: false,
  prioritySupport: false,
  platformFeePercentage: 15,
  maxVideosPerBundle: 25,
  maxBundles: 5,
  maxFolders: 3,
}

const FACELESSPRENUER_FEATURES: MembershipFeatures = {
  unlimitedDownloads: true,
  premiumContent: true,
  noWatermark: true,
  prioritySupport: true,
  platformFeePercentage: 10,
  maxVideosPerBundle: null, // unlimited
  maxBundles: null, // unlimited
  maxFolders: null,
}

export async function getMembership(uid: string): Promise<MembershipDoc | null> {
  try {
    console.log("🔄 Getting membership for uid:", uid.substring(0, 8) + "...")

    const docRef = adminDb.collection("memberships").doc(uid)
    const docSnap = await docRef.get()

    if (docSnap.exists) {
      const data = docSnap.data() as MembershipDoc

      if (data.status === "trialing") {
        const now = new Date()
        let trialEndDate: Date | null = null

        if (data.currentPeriodEnd) {
          if (typeof data.currentPeriodEnd === "object" && "toDate" in data.currentPeriodEnd) {
            trialEndDate = (data.currentPeriodEnd as any).toDate()
          } else if (data.currentPeriodEnd instanceof Date) {
            trialEndDate = data.currentPeriodEnd
          } else if (typeof data.currentPeriodEnd === "object" && "_seconds" in data.currentPeriodEnd) {
            trialEndDate = new Date((data.currentPeriodEnd as any)._seconds * 1000)
          }
        }

        // If trial has expired, downgrade user to free plan immediately
        if (trialEndDate && trialEndDate <= now) {
          console.log("⚠️ Trial expired, downgrading user to free plan:", uid.substring(0, 8) + "...")

          // Import the downgrade function
          const { downgradeFreeUserFromTrial } = await import("./free-users-service")
          await downgradeFreeUserFromTrial(uid)

          // Delete the membership record since they're now free
          await docRef.delete()

          console.log("✅ User downgraded to free plan due to expired trial")
          return null
        }

        console.log("✅ Found trialing membership (no Stripe validation needed):", {
          plan: data.plan,
          status: data.status,
          isActive: data.isActive,
          trialEndDate: trialEndDate?.toISOString(),
        })
        return data
      }

      // For non-trial memberships, validate with Stripe
      const { getStripeSubscriptionStatus } = await import("./stripe-subscription-service")
      const stripeStatus = await getStripeSubscriptionStatus(uid)

      // If Stripe says the subscription is inactive, return null (free user)
      if (!stripeStatus.isActive) {
        console.log("ℹ️ Stripe subscription inactive - user is free tier")
        return null
      }

      const updatedData = {
        ...data,
        status: stripeStatus.status as MembershipStatus,
        isActive: stripeStatus.isActive,
        currentPeriodEnd: stripeStatus.currentPeriodEnd,
      }

      console.log("✅ Found existing membership with Stripe validation:", {
        plan: updatedData.plan,
        status: updatedData.status,
        isActive: updatedData.isActive,
      })
      return updatedData
    }

    console.log("ℹ️ No membership found - user is free tier")
    return null
  } catch (error) {
    console.error("❌ Error getting membership:", error)
    throw error
  }
}

export const getUserMembership = getMembership

// Legacy exports for compatibility - these should not be used for new code
// Free users should use free-users-service.ts instead
export async function setFree(uid: string, opts?: { email?: string }) {
  console.warn("⚠️ setFree called on memberships-service - this should use free-users-service instead")
  // This is a no-op since free users should be in freeUsers collection
  return
}

export async function ensureMembership(uid: string, email?: string): Promise<MembershipDoc | null> {
  console.warn("⚠️ ensureMembership called on memberships-service - free users should use free-users-service")
  // Only return existing pro memberships, don't create free ones
  return await getMembership(uid)
}

export async function getTierInfo(uid: string) {
  console.warn("⚠️ getTierInfo called on memberships-service - use user-tier-service instead")
  const membership = await getMembership(uid)
  if (membership && membership.isActive) {
    return toTierInfo(membership)
  }
  // Return null for free users - they should use free-users-service
  return null
}

export async function setCreatorPro(
  uid: string,
  params: {
    email?: string | null
    stripeCustomerId: string
    stripeSubscriptionId: string
    currentPeriodEnd?: Date | null
    priceId?: string | null
    connectedAccountId?: string
    status?: Exclude<MembershipStatus, "inactive">
  },
) {
  console.log("🔄 Creating Creator Pro membership for:", uid.substring(0, 8) + "...")

  const membershipData: Partial<MembershipDoc> = {
    uid,
    email: params.email || null,
    plan: "creator_pro",
    status: params.status || "active",
    isActive: params.status === "active" || params.status === "trialing",
    stripeCustomerId: params.stripeCustomerId,
    stripeSubscriptionId: params.stripeSubscriptionId,
    currentPeriodEnd: params.currentPeriodEnd || null,
    priceId: params.priceId || null,
    connectedAccountId: params.connectedAccountId || null,
    downloadsUsed: 0,
    bundlesCreated: 0,
    features: { ...PRO_FEATURES },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await adminDb.collection("memberships").doc(uid).set(membershipData)
  console.log("✅ Creator Pro membership created successfully")
}

export async function setStarter(
  uid: string,
  params: {
    email?: string | null
    stripeCustomerId: string
    stripeSubscriptionId: string
    currentPeriodEnd?: Date | null
    priceId?: string | null
    connectedAccountId?: string
    status?: Exclude<MembershipStatus, "inactive">
  },
) {
  console.log("🔄 Creating Starter membership for:", uid.substring(0, 8) + "...")

  const membershipData: Partial<MembershipDoc> = {
    uid,
    email: params.email || null,
    plan: "starter",
    status: params.status || "active",
    isActive: params.status === "active" || params.status === "trialing",
    stripeCustomerId: params.stripeCustomerId,
    stripeSubscriptionId: params.stripeSubscriptionId,
    currentPeriodEnd: params.currentPeriodEnd || null,
    priceId: params.priceId || null,
    connectedAccountId: params.connectedAccountId || null,
    downloadsUsed: 0,
    bundlesCreated: 0,
    features: { ...STARTER_FEATURES },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await adminDb.collection("memberships").doc(uid).set(membershipData)
  console.log("✅ Starter membership created successfully with plan: starter")
}

export async function setFacelessPro(
  uid: string,
  params: {
    email?: string | null
    stripeCustomerId: string
    stripeSubscriptionId: string
    currentPeriodEnd?: Date | null
    priceId?: string | null
    connectedAccountId?: string
    status?: Exclude<MembershipStatus, "inactive">
  },
) {
  console.log("🔄 Creating Faceless Pro membership for:", uid.substring(0, 8) + "...")

  const membershipData: Partial<MembershipDoc> = {
    uid,
    email: params.email || null,
    plan: "faceless_pro",
    status: params.status || "active",
    isActive: params.status === "active" || params.status === "trialing",
    stripeCustomerId: params.stripeCustomerId,
    stripeSubscriptionId: params.stripeSubscriptionId,
    currentPeriodEnd: params.currentPeriodEnd || null,
    priceId: params.priceId || null,
    connectedAccountId: params.connectedAccountId || null,
    downloadsUsed: 0,
    bundlesCreated: 0,
    features: { ...FACELESS_PRO_FEATURES },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await adminDb.collection("memberships").doc(uid).set(membershipData)
  console.log("✅ Faceless Pro membership created successfully")
}

export async function setFacelessprenuer(
  uid: string,
  params: {
    email?: string | null
    stripeCustomerId: string
    stripeSubscriptionId: string
    currentPeriodEnd?: Date | null
    priceId?: string | null
    connectedAccountId?: string
    status?: Exclude<MembershipStatus, "inactive">
  },
) {
  console.log("🔄 Creating Facelessprenuer membership for:", uid.substring(0, 8) + "...")

  const freeUserDoc = await adminDb.collection("freeUsers").doc(uid).get()
  const preservedTrialFlag = freeUserDoc.data()?.preservedTrialFlag === true

  const membershipData: Partial<MembershipDoc> = {
    uid,
    email: params.email || null,
    plan: "facelessprenuer",
    status: params.status || "active",
    isActive: params.status === "active" || params.status === "trialing",
    stripeCustomerId: params.stripeCustomerId,
    stripeSubscriptionId: params.stripeSubscriptionId,
    currentPeriodEnd: params.currentPeriodEnd || null,
    priceId: params.priceId || null,
    connectedAccountId: params.connectedAccountId || null,
    downloadsUsed: 0,
    bundlesCreated: 0,
    features: { ...FACELESSPRENUER_FEATURES },
    hasUsedFreeTrial: preservedTrialFlag || false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await adminDb.collection("memberships").doc(uid).set(membershipData)
  console.log("✅ Facelessprenuer membership created successfully with trial flag:", preservedTrialFlag)
}

export async function setCreatorProStatus(uid: string, status: MembershipStatus, updates?: Partial<MembershipDoc>) {
  console.log("🔄 Updating membership status to:", status, "for:", uid.substring(0, 8) + "...")

  await adminDb
    .collection("memberships")
    .doc(uid)
    .set(
      {
        status,
        isActive: status === "active" || status === "trialing",
        updatedAt: FieldValue.serverTimestamp(),
        ...updates,
      },
      { merge: true },
    )

  console.log("✅ Membership status updated successfully")
}

export async function incrementDownloads(uid: string) {
  // Pro users - just increment for analytics, no limits
  await adminDb
    .collection("memberships")
    .doc(uid)
    .set(
      {
        downloadsUsed: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
}

export async function incrementBundles(uid: string) {
  // Pro users - just increment for analytics, no limits
  await adminDb
    .collection("memberships")
    .doc(uid)
    .set(
      {
        bundlesCreated: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
}

export function toTierInfo(m: MembershipDoc) {
  // This should only be called for active pro users
  return {
    tier: m.plan as const,
    downloadsUsed: m.downloadsUsed ?? 0,
    downloadsLimit: m.features.unlimitedDownloads ? null : m.features.maxVideosPerBundle,
    bundlesCreated: m.bundlesCreated ?? 0,
    bundlesLimit: m.features.unlimitedDownloads ? null : m.features.maxBundles,
    maxVideosPerBundle: m.features.maxVideosPerBundle,
    platformFeePercentage: m.features.platformFeePercentage,
    maxFolders: m.features.maxFolders,
    reachedDownloadLimit: false, // never reached for pro
    reachedBundleLimit: false, // never reached for pro
  }
}

export async function cancelMembership(uid: string): Promise<void> {
  await adminDb.collection("memberships").doc(uid).update({
    status: "canceled",
    isActive: false,
    updatedAt: FieldValue.serverTimestamp(),
  })
  console.log(`✅ Canceled membership for user: ${uid}`)
}

export async function deleteMembership(uid: string): Promise<void> {
  await adminDb.collection("memberships").doc(uid).delete()
  console.log(`✅ Deleted membership record for user: ${uid}`)
}

// Additional updates can be added here if necessary
