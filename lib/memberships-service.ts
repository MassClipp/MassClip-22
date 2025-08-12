import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, increment } from "firebase/firestore"
import { db } from "@/lib/firebase-safe"

export type MembershipPlan = "free" | "creator_pro"
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

  // Usage
  downloadsUsed: number
  bundlesCreated: number

  // Features/caps (single place to read app limits)
  features: MembershipFeatures

  // Metadata
  createdAt: any
  updatedAt: any
}

const FREE_FEATURES: MembershipFeatures = {
  unlimitedDownloads: false,
  premiumContent: false,
  noWatermark: false,
  prioritySupport: false,
  platformFeePercentage: 20,
  maxVideosPerBundle: 10,
  maxBundles: 2,
}

const PRO_FEATURES: MembershipFeatures = {
  unlimitedDownloads: true,
  premiumContent: true,
  noWatermark: true,
  prioritySupport: true,
  platformFeePercentage: 10,
  maxVideosPerBundle: null,
  maxBundles: null,
}

export async function getMembership(uid: string): Promise<MembershipDoc | null> {
  if (!db) {
    console.error("❌ Firestore not initialized")
    throw new Error("Firestore not initialized")
  }

  try {
    console.log("🔄 Getting membership for uid:", uid.substring(0, 8) + "...")
    const docRef = doc(db, "memberships", uid)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data() as MembershipDoc
      console.log("✅ Found existing membership:", { plan: data.plan, status: data.status })
      return data
    }

    console.log("ℹ️ No existing membership found")
    return null
  } catch (error) {
    console.error("❌ Error getting membership:", error)
    throw error
  }
}

export const getUserMembership = getMembership

export async function ensureMembership(uid: string, email?: string): Promise<MembershipDoc> {
  console.log("🔄 Ensuring membership for uid:", uid.substring(0, 8) + "...")

  const existing = await getMembership(uid)
  if (existing) {
    console.log("✅ Membership already exists, returning existing")
    return existing
  }

  console.log("🔄 Creating new free membership...")

  const membershipDoc: MembershipDoc = {
    uid,
    email,
    plan: "free",
    status: "active",
    isActive: true,
    downloadsUsed: 0,
    bundlesCreated: 0,
    features: { ...FREE_FEATURES },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  if (!db) {
    console.error("❌ Firestore not initialized")
    throw new Error("Firestore not initialized")
  }

  try {
    const docRef = doc(db, "memberships", uid)
    await setDoc(docRef, membershipDoc, { merge: true })
    console.log("✅ Created new free membership successfully")
    return membershipDoc
  } catch (error) {
    console.error("❌ Error creating membership:", error)
    throw error
  }
}

export async function setFree(uid: string, opts?: { email?: string; overrides?: Partial<MembershipFeatures> }) {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  const features = { ...FREE_FEATURES, ...(opts?.overrides || {}) }
  await setDoc(
    doc(db, "memberships", uid),
    {
      uid,
      email: opts?.email,
      plan: "free",
      status: "active",
      isActive: true,
      features,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  )
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

  await setDoc(
    doc(db, "memberships", uid),
    {
      uid,
      email: params.email ?? null,
      plan: "creator_pro",
      status: params.status ?? "active",
      isActive: (params.status ?? "active") === "active" || (params.status ?? "active") === "trialing",
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      currentPeriodEnd: params.currentPeriodEnd ?? null,
      priceId: params.priceId ?? null,
      connectedAccountId: params.connectedAccountId ?? null,
      features: { ...PRO_FEATURES },
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function setCreatorProStatus(uid: string, status: MembershipStatus, updates?: Partial<MembershipDoc>) {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

  await setDoc(
    doc(db, "memberships", uid),
    {
      status,
      isActive: status === "active" || status === "trialing",
      updatedAt: serverTimestamp(),
      ...updates,
    },
    { merge: true },
  )
}

export async function incrementDownloads(uid: string) {
  if (!db) {
    throw new Error("Firestore not initialized")
  }

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
  const tier: "free" | "creator_pro" = m.plan === "creator_pro" && m.isActive ? "creator_pro" : "free"

  return {
    tier,
    downloadsUsed: m.downloadsUsed ?? 0,
    downloadsLimit: m.features.unlimitedDownloads ? null : 15,
    bundlesCreated: m.bundlesCreated ?? 0,
    bundlesLimit: m.features.maxBundles,
    maxVideosPerBundle: m.features.maxVideosPerBundle,
    platformFeePercentage: m.features.platformFeePercentage,
    reachedDownloadLimit: m.features.unlimitedDownloads ? false : (m.downloadsUsed ?? 0) >= 15,
    reachedBundleLimit:
      m.features.maxBundles === null ? false : (m.bundlesCreated ?? 0) >= (m.features.maxBundles ?? 0),
  }
}

export async function getTierInfo(uid: string) {
  const m = await ensureMembership(uid)
  return toTierInfo(m)
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
