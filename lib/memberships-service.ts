import { db, FieldValue } from "@/lib/firebase-admin"

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
  createdAt: Date
  updatedAt: Date
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

function col() {
  return db.collection("memberships")
}

export async function getMembership(uid: string): Promise<MembershipDoc | null> {
  const snap = await col().doc(uid).get()
  return snap.exists ? (snap.data() as MembershipDoc) : null
}

export async function ensureMembership(uid: string, email?: string): Promise<MembershipDoc> {
  const existing = await getMembership(uid)
  if (existing) return existing

  const now = new Date()
  const doc: MembershipDoc = {
    uid,
    email,
    plan: "free",
    status: "active",
    isActive: true,
    downloadsUsed: 0,
    bundlesCreated: 0,
    features: { ...FREE_FEATURES },
    createdAt: now,
    updatedAt: now,
  }
  await col().doc(uid).set(doc, { merge: true })
  return doc
}

export async function setFree(uid: string, opts?: { email?: string; overrides?: Partial<MembershipFeatures> }) {
  const now = new Date()
  const features = { ...FREE_FEATURES, ...(opts?.overrides || {}) }
  await col().doc(uid).set(
    {
      uid,
      email: opts?.email,
      plan: "free",
      status: "active",
      isActive: true,
      features,
      // keep usage if exists; only stamp updatedAt
      updatedAt: now,
      createdAt: now,
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
    status?: Exclude<MembershipStatus, "inactive"> // usually "active", "past_due", "trialing", "canceled"
  },
) {
  const now = new Date()
  await col()
    .doc(uid)
    .set(
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
        updatedAt: now,
        createdAt: now,
      },
      { merge: true },
    )
}

export async function setCreatorProStatus(uid: string, status: MembershipStatus, updates?: Partial<MembershipDoc>) {
  const now = new Date()
  await col()
    .doc(uid)
    .set(
      {
        status,
        isActive: status === "active" || status === "trialing",
        updatedAt: now,
        ...updates,
      },
      { merge: true },
    )
}

export async function incrementDownloads(uid: string) {
  const now = new Date()
  await col()
    .doc(uid)
    .set({ downloadsUsed: FieldValue.increment(1), updatedAt: now }, { merge: true })
}

export async function incrementBundles(uid: string) {
  const now = new Date()
  await col()
    .doc(uid)
    .set({ bundlesCreated: FieldValue.increment(1), updatedAt: now }, { merge: true })
}

export function toTierInfo(m: MembershipDoc) {
  // Conform to the UI expectations (free vs creator_pro, limits and flags)
  const tier: "free" | "creator_pro" = m.plan === "creator_pro" && m.isActive ? "creator_pro" : "free"

  return {
    tier,
    downloadsUsed: m.downloadsUsed ?? 0,
    downloadsLimit: m.features.unlimitedDownloads ? null : ((m as any).downloadsLimit ?? 15), // optional legacy fallback
    bundlesCreated: m.bundlesCreated ?? 0,
    bundlesLimit: m.features.maxBundles, // null means unlimited
    maxVideosPerBundle: m.features.maxVideosPerBundle,
    platformFeePercentage: m.features.platformFeePercentage,
    reachedDownloadLimit: m.features.unlimitedDownloads
      ? false
      : (m.downloadsUsed ?? 0) >= ((m as any).downloadsLimit ?? 15),
    reachedBundleLimit:
      m.features.maxBundles === null ? false : (m.bundlesCreated ?? 0) >= (m.features.maxBundles ?? 0),
  }
}

export async function getTierInfo(uid: string) {
  const m = await ensureMembership(uid)
  return toTierInfo(m)
}
