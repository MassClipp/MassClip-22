import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export type MembershipPlan = "creator_pro"
export type MembershipStatus = "active" | "inactive" | "canceled" | "past_due" | "trialing"

export interface MembershipFeatures {
  unlimitedDownloads: boolean
  premiumContent: boolean
  noWatermark: boolean
  prioritySupport: boolean
  platformFeePercentage: number
  maxVideosPerBundle: number | null
  maxBundles: number | null
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

  // Metadata
  createdAt: any
  updatedAt: any
}

const PRO_FEATURES: MembershipFeatures = {
  unlimitedDownloads: true,
  premiumContent: true,
  noWatermark: true,
  prioritySupport: true,
  platformFeePercentage: 10,
  maxVideosPerBundle: null, // unlimited
  maxBundles: null, // unlimited
}

export async function getMembership(uid: string): Promise<MembershipDoc | null> {
  try {
    console.log("🔄 Getting membership for uid:", uid.substring(0, 8) + "...")
    const docRef = adminDb.collection("memberships").doc(uid)
    const docSnap = await docRef.get()

    if (docSnap.exists) {
      const data = docSnap.data() as MembershipDoc
      console.log("✅ Found existing membership:", { plan: data.plan, status: data.status })
      return data
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
    isActive: true,
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
    tier: "creator_pro" as const,
    downloadsUsed: m.downloadsUsed ?? 0,
    downloadsLimit: null, // unlimited
    bundlesCreated: m.bundlesCreated ?? 0,
    bundlesLimit: null, // unlimited
    maxVideosPerBundle: null, // unlimited
    platformFeePercentage: m.features.platformFeePercentage,
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
