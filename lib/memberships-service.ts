import admin from "firebase-admin"
import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"

initializeFirebaseAdmin()

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
  currentPeriodEnd?: Date
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

function membershipsCol() {
  return db.collection("memberships")
}

function nowDate() {
  return new Date()
}

function asDate(input: any | undefined): Date | undefined {
  if (!input) return undefined
  // Firestore Timestamp
  if (input?.toDate && typeof input.toDate === "function") return input.toDate()
  // millis number
  if (typeof input === "number") return new Date(input)
  // ISO string
  if (typeof input === "string") return new Date(input)
  // Already a Date
  if (input instanceof Date) return input
  return undefined
}

function statusIsActive(status: MembershipStatus) {
  return status === "active" || status === "trialing"
}

export async function getMembership(uid: string): Promise<MembershipDoc | null> {
  const snap = await membershipsCol().doc(uid).get()
  return snap.exists ? (snap.data() as MembershipDoc) : null
}

export async function ensureMembership(uid: string, email?: string): Promise<MembershipDoc> {
  const existing = await getMembership(uid)
  if (existing) return existing

  const now = nowDate()
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
  await membershipsCol().doc(uid).set(doc, { merge: true })
  return doc
}

export async function setFree(
  uid: string,
  opts?: {
    email?: string
    overrides?: Partial<MembershipFeatures>
    usage?: { downloadsUsed?: number; bundlesCreated?: number }
  },
) {
  const now = nowDate()
  const features: MembershipFeatures = { ...FREE_FEATURES, ...(opts?.overrides || {}) }

  const payload: Partial<MembershipDoc> = {
    uid,
    email: opts?.email,
    plan: "free",
    status: "active",
    isActive: true,
    features,
    updatedAt: now,
  }

  if (typeof opts?.usage?.downloadsUsed === "number") {
    payload.downloadsUsed = opts.usage.downloadsUsed
  }
  if (typeof opts?.usage?.bundlesCreated === "number") {
    payload.bundlesCreated = opts.usage.bundlesCreated
  }

  await membershipsCol()
    .doc(uid)
    .set(
      {
        ...payload,
        createdAt: now, // merge keeps original if present
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
    currentPeriodEnd?: Date | number | string | { toDate: () => Date }
    priceId?: string
    connectedAccountId?: string
    status?: MembershipStatus // default "active"
    usage?: { downloadsUsed?: number; bundlesCreated?: number }
  },
) {
  const now = nowDate()
  const status: MembershipStatus = (params.status as MembershipStatus) || "active"
  const active = statusIsActive(status)

  const effectiveFeatures = active ? PRO_FEATURES : FREE_FEATURES

  const payload: Partial<MembershipDoc> = {
    uid,
    email: params.email,
    plan: "creator_pro",
    status,
    isActive: active,
    stripeCustomerId: params.stripeCustomerId,
    stripeSubscriptionId: params.stripeSubscriptionId,
    currentPeriodEnd: asDate(params.currentPeriodEnd),
    priceId: params.priceId,
    connectedAccountId: params.connectedAccountId,
    features: { ...effectiveFeatures },
    updatedAt: now,
  }

  if (typeof params?.usage?.downloadsUsed === "number") {
    payload.downloadsUsed = params.usage.downloadsUsed
  }
  if (typeof params?.usage?.bundlesCreated === "number") {
    payload.bundlesCreated = params.usage.bundlesCreated
  }

  await membershipsCol()
    .doc(uid)
    .set(
      {
        ...payload,
        createdAt: now, // merge keeps original if present
      },
      { merge: true },
    )
}

export async function setCreatorProStatus(uid: string, status: MembershipStatus, updates?: Partial<MembershipDoc>) {
  const active = statusIsActive(status)
  const now = nowDate()
  await membershipsCol()
    .doc(uid)
    .set(
      {
        status,
        isActive: active,
        // If flipping to inactive, also ensure features reflect free caps
        ...(active ? { features: PRO_FEATURES } : { features: FREE_FEATURES }),
        updatedAt: now,
        ...(updates || {}),
      },
      { merge: true },
    )
}

export async function incrementDownloads(uid: string) {
  const FieldValue = admin.firestore.FieldValue
  await membershipsCol()
    .doc(uid)
    .set(
      {
        downloadsUsed: FieldValue.increment(1),
        updatedAt: nowDate(),
      },
      { merge: true },
    )
}

export async function incrementBundles(uid: string) {
  const FieldValue = admin.firestore.FieldValue
  await membershipsCol()
    .doc(uid)
    .set(
      {
        bundlesCreated: FieldValue.increment(1),
        updatedAt: nowDate(),
      },
      { merge: true },
    )
}

export function getDefaultFreeFeatures(): MembershipFeatures {
  return { ...FREE_FEATURES }
}

export function getDefaultProFeatures(): MembershipFeatures {
  return { ...PRO_FEATURES }
}

export function toTierInfo(m: MembershipDoc) {
  const tier: "free" | "creator_pro" = m.plan === "creator_pro" && m.isActive ? "creator_pro" : "free"

  return {
    tier,
    isActive: m.isActive,
    status: m.status,
    downloadsUsed: m.downloadsUsed ?? 0,
    // If unlimited, limit is null; optionally your app can maintain a separate numeric downloadsLimit.
    downloadsLimit: m.features.unlimitedDownloads ? null : ((m as any).downloadsLimit ?? 15),
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
  const m = (await getMembership(uid)) ?? (await ensureMembership(uid))
  return toTierInfo(m)
}
