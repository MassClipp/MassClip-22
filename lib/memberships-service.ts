import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, increment } from "firebase/firestore"
import { db } from "@/lib/firebase-safe"

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
  // Active state - only one of freeUsers or memberships can be active
  active: boolean
  isActive: boolean // Keep for backward compatibility

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
  if (!db) {
    console.error("❌ Firestore not initialized")
    throw new Error("Firestore not initialized")
  }

  try {
    console.log("🔄 Getting active membership for uid:", uid.substring(0, 8) + "...")
    const docRef = doc(db, "memberships", uid)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data() as MembershipDoc

      // Only return if active
      if (data.active && data.isActive) {
        console.log("✅ Found active membership:", { plan: data.plan, status: data.status })
        return data
      } else {
        console.log("ℹ️ Membership exists but is inactive")
        return null
      }
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
    email?: string
    stripeCustomerId: string
    stripeSubscriptionId: string
    currentPeriodEnd?: Date | null
    priceId?: string | null
    connectedAccountId?: string
    status?: Exclude<MembershipStatus, "inactive">
  },
) {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  console.log("🔄 Setting creator pro membership for:", uid.substring(0, 8) + "...")

  // First, deactivate the freeUser document
  const { deactivateFreeUser } = await import("./free-users-service")
  try {
    await deactivateFreeUser(uid)
  } catch (error) {
    console.warn("⚠️ Could not deactivate freeUser (may not exist):", error)
  }

  // Create/update the active membership
  await setDoc(
    doc(db, "memberships", uid),
    {
      uid,
      email: params.email ?? null,
      plan: "creator_pro",
      status: params.status ?? "active",
      active: true, // This membership is now active
      isActive: (params.status ?? "active") === "active" || (params.status ?? "active") === "trialing",
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      currentPeriodEnd: params.currentPeriodEnd ?? null,
      priceId: params.priceId ?? null,
      connectedAccountId: params.connectedAccountId ?? null,
      downloadsUsed: 0,
      bundlesCreated: 0,
      features: { ...PRO_FEATURES },
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  )

  console.log("✅ Creator pro membership set successfully and freeUser deactivated")
}

export async function setCreatorProStatus(uid: string, status: MembershipStatus, updates?: Partial<MembershipDoc>) {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  console.log("🔄 Updating membership status to:", status, "for:", uid.substring(0, 8) + "...")

  const isActiveStatus = status === "active" || status === "trialing"

  await setDoc(
    doc(db, "memberships", uid),
    {
      status,
      active: isActiveStatus, // Only active if status is active/trialing
      isActive: isActiveStatus,
      updatedAt: serverTimestamp(),
      ...updates,
    },
    { merge: true },
  )

  // If membership becomes inactive, reactivate freeUser
  if (!isActiveStatus) {
    const { reactivateFreeUser } = await import("./free-users-service")
    try {
      await reactivateFreeUser(uid)
    } catch (error) {
      console.warn("⚠️ Could not reactivate freeUser:", error)
    }
  }

  console.log("✅ Membership status updated successfully")
}

export async function incrementDownloads(uid: string) {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  // Pro users - just increment for analytics, no limits
  await setDoc(
    doc(db, "memberships", uid),
    {
      downloadsUsed: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function incrementBundles(uid: string) {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  // Pro users - just increment for analytics, no limits
  await setDoc(
    doc(db, "memberships", uid),
    {
      bundlesCreated: increment(1),
      updatedAt: serverTimestamp(),
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
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  await updateDoc(doc(db, "memberships", uid), {
    status: "canceled",
    isActive: false,
    updatedAt: serverTimestamp(),
  })
  console.log(`✅ Canceled membership for user: ${uid}`)
}

export async function deleteMembership(uid: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  await deleteDoc(doc(db, "memberships", uid))
  console.log(`✅ Deleted membership record for user: ${uid}`)
}

export async function deactivateMembership(uid: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  console.log("🔄 Deactivating membership (downgrading to free):", uid.substring(0, 8) + "...")

  // Deactivate the membership
  await updateDoc(doc(db, "memberships", uid), {
    active: false,
    isActive: false,
    status: "canceled",
    updatedAt: serverTimestamp(),
  })

  // Reactivate the freeUser document
  const { reactivateFreeUser } = await import("./free-users-service")
  try {
    await reactivateFreeUser(uid)
  } catch (error) {
    console.error("❌ Could not reactivate freeUser:", error)
    throw error
  }

  console.log("✅ Membership deactivated and freeUser reactivated")
}
