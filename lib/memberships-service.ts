import { doc, getDoc, setDoc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase-safe"

export interface Membership {
  uid: string
  plan: "free" | "creator_pro"
  status: "active" | "inactive" | "cancelled" | "past_due"
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string
  currentPeriodStart?: any
  currentPeriodEnd?: any
  cancelAtPeriodEnd?: boolean
  createdAt: any
  updatedAt: any
  features: {
    unlimitedDownloads: boolean
    unlimitedBundles: boolean
    prioritySupport: boolean
  }
}

export interface TierInfo {
  tier: "free" | "creator_pro"
  downloadsUsed: number
  downloadsLimit: number
  bundlesCreated: number
  bundlesLimit: number
  maxVideosPerBundle: number
  platformFeePercentage: number
  reachedDownloadLimit: boolean
  reachedBundleLimit: boolean
  hasActiveSubscription?: boolean
  subscriptionStatus?: string
}

export async function createMembership(uid: string, plan: "free" | "creator_pro" = "free"): Promise<Membership> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  const membershipData: Membership = {
    uid,
    plan,
    status: plan === "creator_pro" ? "active" : "inactive",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    features: {
      unlimitedDownloads: plan === "creator_pro",
      unlimitedBundles: plan === "creator_pro",
      prioritySupport: plan === "creator_pro",
    },
  }

  try {
    await setDoc(doc(db, "memberships", uid), membershipData)
    console.log(`✅ Created membership for: ${uid}`)
    return membershipData
  } catch (error) {
    console.error("❌ Error creating membership:", error)
    throw error
  }
}

export async function getMembership(uid: string): Promise<Membership | null> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  try {
    const docRef = doc(db, "memberships", uid)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return docSnap.data() as Membership
    }

    return null
  } catch (error) {
    console.error("❌ Error getting membership:", error)
    throw error
  }
}

export const getUserMembership = getMembership

export async function updateMembership(uid: string, updates: Partial<Membership>): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  try {
    await updateDoc(doc(db, "memberships", uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    })
    console.log(`✅ Updated membership for: ${uid}`)
  } catch (error) {
    console.error("❌ Error updating membership:", error)
    throw error
  }
}

export async function setCreatorPro(
  uid: string,
  stripeData?: {
    customerId: string
    subscriptionId: string
    priceId: string
    currentPeriodStart: any
    currentPeriodEnd: any
  },
): Promise<void> {
  const updates: Partial<Membership> = {
    plan: "creator_pro",
    status: "active",
    features: {
      unlimitedDownloads: true,
      unlimitedBundles: true,
      prioritySupport: true,
    },
  }

  if (stripeData) {
    updates.stripeCustomerId = stripeData.customerId
    updates.stripeSubscriptionId = stripeData.subscriptionId
    updates.stripePriceId = stripeData.priceId
    updates.currentPeriodStart = stripeData.currentPeriodStart
    updates.currentPeriodEnd = stripeData.currentPeriodEnd
  }

  await updateMembership(uid, updates)
}

export async function setFree(uid: string): Promise<void> {
  await updateMembership(uid, {
    plan: "free",
    status: "inactive",
    features: {
      unlimitedDownloads: false,
      unlimitedBundles: false,
      prioritySupport: false,
    },
  })
}

export async function setCreatorProStatus(
  uid: string,
  status: "active" | "inactive" | "cancelled" | "past_due",
): Promise<void> {
  await updateMembership(uid, { status })
}

export async function ensureMembership(uid: string): Promise<Membership> {
  let membership = await getMembership(uid)

  if (!membership) {
    membership = await createMembership(uid, "free")
  }

  return membership
}

export async function getTierInfo(uid: string): Promise<TierInfo> {
  const membership = await getMembership(uid)

  if (!membership) {
    // Return default free tier
    return {
      tier: "free",
      downloadsUsed: 0,
      downloadsLimit: 10,
      bundlesCreated: 0,
      bundlesLimit: 2,
      maxVideosPerBundle: 10,
      platformFeePercentage: 20,
      reachedDownloadLimit: false,
      reachedBundleLimit: false,
      hasActiveSubscription: false,
      subscriptionStatus: "inactive",
    }
  }

  if (membership.plan === "creator_pro" && membership.status === "active") {
    return {
      tier: "creator_pro",
      downloadsUsed: 0,
      downloadsLimit: -1, // Unlimited
      bundlesCreated: 0,
      bundlesLimit: -1, // Unlimited
      maxVideosPerBundle: -1, // Unlimited
      platformFeePercentage: 10,
      reachedDownloadLimit: false,
      reachedBundleLimit: false,
      hasActiveSubscription: true,
      subscriptionStatus: membership.status,
    }
  }

  // Free tier
  return {
    tier: "free",
    downloadsUsed: 0,
    downloadsLimit: 10,
    bundlesCreated: 0,
    bundlesLimit: 2,
    maxVideosPerBundle: 10,
    platformFeePercentage: 20,
    reachedDownloadLimit: false,
    reachedBundleLimit: false,
    hasActiveSubscription: false,
    subscriptionStatus: membership.status,
  }
}

export async function cancelMembership(uid: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  try {
    await updateMembership(uid, {
      status: "cancelled",
      cancelAtPeriodEnd: true,
    })
    console.log(`✅ Cancelled membership for: ${uid}`)
  } catch (error) {
    console.error("❌ Error cancelling membership:", error)
    throw error
  }
}

export async function deleteMembership(uid: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  try {
    await deleteDoc(doc(db, "memberships", uid))
    console.log(`✅ Deleted membership for: ${uid}`)
  } catch (error) {
    console.error("❌ Error deleting membership:", error)
    throw error
  }
}

export function toTierInfo(membership: Membership): TierInfo {
  if (membership.plan === "creator_pro" && membership.status === "active") {
    return {
      tier: "creator_pro",
      downloadsUsed: 0,
      downloadsLimit: -1, // Unlimited
      bundlesCreated: 0,
      bundlesLimit: -1, // Unlimited
      maxVideosPerBundle: -1, // Unlimited
      platformFeePercentage: 10,
      reachedDownloadLimit: false,
      reachedBundleLimit: false,
      hasActiveSubscription: true,
      subscriptionStatus: membership.status,
    }
  }

  return {
    tier: "free",
    downloadsUsed: 0,
    downloadsLimit: 10,
    bundlesCreated: 0,
    bundlesLimit: 2,
    maxVideosPerBundle: 10,
    platformFeePercentage: 20,
    reachedDownloadLimit: false,
    reachedBundleLimit: false,
    hasActiveSubscription: false,
    subscriptionStatus: membership.status,
  }
}

export async function incrementDownloads(uid: string): Promise<void> {
  // For memberships, we don't track download counts since they're unlimited
  // This is a no-op for creator_pro users
  console.log(`📊 Download tracked for creator_pro user: ${uid}`)
}

export async function incrementBundles(uid: string): Promise<void> {
  // For memberships, we don't track bundle counts since they're unlimited
  // This is a no-op for creator_pro users
  console.log(`📊 Bundle tracked for creator_pro user: ${uid}`)
}
