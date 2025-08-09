/**
 * Central Memberships service: read/write memberships docs.
 * Uses Firebase Admin so it runs server-side in scripts and API routes.
 */

import { getApps, initializeApp, cert, type App } from "firebase-admin/app"
import { getFirestore, FieldValue, type Timestamp, type Firestore, type DocumentData } from "firebase-admin/firestore"

export type MembershipPlan = "free" | "creator_pro"
export type MembershipStatus = "active" | "trialing" | "past_due" | "canceled" | "inactive"

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
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  priceId?: string
  connectedAccountId?: string
  currentPeriodEnd?: Timestamp | Date | null

  // Usage counters
  downloadsUsed?: number
  bundlesCreated?: number

  // Normalized entitlement set
  features: MembershipFeatures

  // Bookkeeping
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

const FREE_DEFAULTS: MembershipFeatures = {
  unlimitedDownloads: false,
  premiumContent: false,
  noWatermark: false,
  prioritySupport: false,
  platformFeePercentage: 20,
  maxVideosPerBundle: 10,
  maxBundles: 2,
}

const PRO_DEFAULTS: MembershipFeatures = {
  unlimitedDownloads: true,
  premiumContent: true,
  noWatermark: true,
  prioritySupport: true,
  platformFeePercentage: 10,
  maxVideosPerBundle: null,
  maxBundles: null,
}

function getAdmin(): { app: App; db: Firestore } {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    let privateKey = process.env.FIREBASE_PRIVATE_KEY

    // Vercel often stores the private key with literal \n
    if (privateKey && privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n")
    }

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Missing Firebase Admin credentials. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY are set.",
      )
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  }
  const db = getFirestore()
  return { app: getApps()[0]!, db }
}

export function computeFeatures(
  plan: MembershipPlan,
  isActive: boolean,
  freeOverrides?: Partial<MembershipFeatures>,
): MembershipFeatures {
  if (plan === "creator_pro" && isActive) {
    return { ...PRO_DEFAULTS }
  }
  // Free or inactive pro falls back to free-level entitlements,
  // honoring overrides if present (from legacy freeUsers).
  return { ...FREE_DEFAULTS, ...(freeOverrides ?? {}) }
}

export async function getMembership(uid: string): Promise<MembershipDoc | null> {
  const { db } = getAdmin()
  const snap = await db.collection("memberships").doc(uid).get()
  if (!snap.exists) return null
  return snap.data() as MembershipDoc
}

export async function upsertMembership(doc: MembershipDoc): Promise<void> {
  const { db } = getAdmin()
  const ref = db.collection("memberships").doc(doc.uid)
  const payload: MembershipDoc = {
    ...doc,
    createdAt: doc.createdAt ?? (FieldValue.serverTimestamp() as unknown as Timestamp),
    updatedAt: FieldValue.serverTimestamp() as unknown as Timestamp,
  }
  await ref.set(payload, { merge: true })
}

/**
 * Map a legacy "creatorProUsers/{uid}" document to a MembershipDoc.
 */
export function mapCreatorProToMembership(uid: string, data: DocumentData, email?: string): MembershipDoc {
  const rawStatus: string = (data.subscriptionStatus || "").toString().toLowerCase()
  const status: MembershipStatus =
    rawStatus === "active" || rawStatus === "trialing"
      ? (rawStatus as MembershipStatus)
      : rawStatus === "past_due" || rawStatus === "canceled" || rawStatus === "inactive"
        ? (rawStatus as MembershipStatus)
        : "inactive"

  const isActive = status === "active" || status === "trialing"

  let currentPeriodEnd: Date | Timestamp | null = null
  const renewal = data.renewalDate ?? data.currentPeriodEnd
  if (renewal) {
    if (typeof renewal?.toDate === "function") {
      currentPeriodEnd = renewal.toDate()
    } else if (typeof renewal === "number") {
      currentPeriodEnd = new Date(renewal)
    } else if (renewal instanceof Date) {
      currentPeriodEnd = renewal
    }
  }

  return {
    uid,
    email,
    plan: "creator_pro",
    status,
    isActive,
    stripeCustomerId: data.stripeCustomerId || data.customerId,
    stripeSubscriptionId: data.subscriptionId || data.stripeSubscriptionId,
    priceId: data.priceId,
    connectedAccountId: data.connectedAccountId,
    currentPeriodEnd,
    downloadsUsed: typeof data.downloadsUsed === "number" ? data.downloadsUsed : undefined,
    bundlesCreated: typeof data.bundlesCreated === "number" ? data.bundlesCreated : undefined,
    features: computeFeatures("creator_pro", isActive),
  }
}

/**
 * Map a legacy "freeUsers/{uid}" document to a MembershipDoc (plan free).
 */
export function mapFreeToMembership(uid: string, data: DocumentData, email?: string): MembershipDoc {
  const overrides: Partial<MembershipFeatures> = {}
  if (typeof data.platformFeePercentage === "number") {
    overrides.platformFeePercentage = data.platformFeePercentage
  }
  if (typeof data.maxVideosPerBundle === "number") {
    overrides.maxVideosPerBundle = data.maxVideosPerBundle
  }
  if (typeof data.bundlesLimit === "number") {
    overrides.maxBundles = data.bundlesLimit
  }

  return {
    uid,
    email,
    plan: "free",
    // "active" here means the membership record is valid, not a paid status.
    status: "active",
    isActive: false,
    downloadsUsed: typeof data.downloadsUsed === "number" ? data.downloadsUsed : undefined,
    bundlesCreated: typeof data.bundlesCreated === "number" ? data.bundlesCreated : undefined,
    features: computeFeatures("free", false, overrides),
  }
}
