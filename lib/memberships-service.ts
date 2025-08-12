import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-safe"

export interface MembershipData {
  uid: string
  email: string
  plan: "free" | "creator_pro"
  status: "active" | "canceled" | "past_due" | "incomplete"
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  cancelAtPeriodEnd?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TierInfo {
  plan: "free" | "creator_pro"
  status: "active" | "canceled" | "past_due" | "incomplete"
  downloadsUsed: number
  bundlesUsed: number
  maxDownloads: number
  maxBundles: number
  canUpload: boolean
  canCreateBundles: boolean
}

export async function setCreatorPro(
  uid: string,
  email: string,
  stripeData?: {
    customerId: string
    subscriptionId: string
    priceId: string
    currentPeriodStart: Date
    currentPeriodEnd: Date
  },
): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  const membershipData: MembershipData = {
    uid,
    email,
    plan: "creator_pro",
    status: "active",
    stripeCustomerId: stripeData?.customerId,
    stripeSubscriptionId: stripeData?.subscriptionId,
    stripePriceId: stripeData?.priceId,
    currentPeriodStart: stripeData?.currentPeriodStart,
    currentPeriodEnd: stripeData?.currentPeriodEnd,
    cancelAtPeriodEnd: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await setDoc(doc(db, "memberships", uid), membershipData)
  console.log("✅ Creator Pro membership set for user:", uid)
}

export async function setFree(uid: string, email: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  const membershipData: MembershipData = {
    uid,
    email,
    plan: "free",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await setDoc(doc(db, "memberships", uid), membershipData)
  console.log("✅ Free membership set for user:", uid)
}

export async function setCreatorProStatus(
  uid: string,
  status: "active" | "canceled" | "past_due" | "incomplete",
  cancelAtPeriodEnd?: boolean,
): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  const membershipRef = doc(db, "memberships", uid)
  await updateDoc(membershipRef, {
    status,
    cancelAtPeriodEnd: cancelAtPeriodEnd ?? false,
    updatedAt: serverTimestamp(),
  })

  console.log("✅ Membership status updated for user:", uid, "to:", status)
}

export async function getMembership(uid: string): Promise<MembershipData | null> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  const membershipDoc = await getDoc(doc(db, "memberships", uid))

  if (!membershipDoc.exists()) {
    return null
  }

  const data = membershipDoc.data()
  return {
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    currentPeriodStart: data.currentPeriodStart?.toDate(),
    currentPeriodEnd: data.currentPeriodEnd?.toDate(),
  } as MembershipData
}

export async function ensureMembership(uid: string, email: string): Promise<MembershipData> {
  let membership = await getMembership(uid)

  if (!membership) {
    await setFree(uid, email)
    membership = await getMembership(uid)
  }

  if (!membership) {
    throw new Error("Failed to create membership")
  }

  return membership
}

export async function cancelMembership(uid: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  const membershipRef = doc(db, "memberships", uid)
  await updateDoc(membershipRef, {
    status: "canceled",
    cancelAtPeriodEnd: true,
    updatedAt: serverTimestamp(),
  })

  console.log("✅ Membership canceled for user:", uid)
}

export async function getTierInfo(uid: string): Promise<TierInfo> {
  const membership = await getMembership(uid)

  if (!membership) {
    // Return default free tier info
    return {
      plan: "free",
      status: "active",
      downloadsUsed: 0,
      bundlesUsed: 0,
      maxDownloads: 5,
      maxBundles: 1,
      canUpload: false,
      canCreateBundles: false,
    }
  }

  // Get usage data from freeUsers collection if free plan
  let downloadsUsed = 0
  let bundlesUsed = 0

  if (membership.plan === "free" && db) {
    try {
      const freeUserDoc = await getDoc(doc(db, "freeUsers", uid))
      if (freeUserDoc.exists()) {
        const freeUserData = freeUserDoc.data()
        downloadsUsed = freeUserData.downloadsUsed || 0
        bundlesUsed = freeUserData.bundlesUsed || 0
      }
    } catch (error) {
      console.error("Error fetching free user data:", error)
    }
  }

  const isCreatorPro = membership.plan === "creator_pro" && membership.status === "active"

  return {
    plan: membership.plan,
    status: membership.status,
    downloadsUsed,
    bundlesUsed,
    maxDownloads: isCreatorPro ? -1 : 5, // -1 means unlimited
    maxBundles: isCreatorPro ? -1 : 1,
    canUpload: isCreatorPro,
    canCreateBundles: isCreatorPro,
  }
}
