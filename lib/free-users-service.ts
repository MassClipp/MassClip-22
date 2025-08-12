import { db } from "@/lib/firebase-admin"

export interface FreeUserDoc {
  uid: string
  email: string

  // Usage tracking
  downloadsUsed: number
  downloadsLimit: number
  bundlesCreated: number
  bundlesLimit: number

  // Limitations
  maxVideosPerBundle: number
  platformFeePercentage: number

  // Status
  reachedDownloadLimit: boolean
  reachedBundleLimit: boolean
  lastDownloadAt?: Date

  // Metadata
  createdAt: Date
  updatedAt: Date
}

const DEFAULT_FREE_LIMITS = {
  downloadsLimit: 15,
  bundlesLimit: 2,
  maxVideosPerBundle: 10,
  platformFeePercentage: 20,
}

function col() {
  return db.collection("freeUsers")
}

export async function createFreeUser(uid: string, email: string): Promise<FreeUserDoc> {
  const now = new Date()
  const doc: FreeUserDoc = {
    uid,
    email,
    downloadsUsed: 0,
    bundlesCreated: 0,
    reachedDownloadLimit: false,
    reachedBundleLimit: false,
    createdAt: now,
    updatedAt: now,
    ...DEFAULT_FREE_LIMITS,
  }

  await col().doc(uid).set(doc)
  console.log(`✅ Created free user: ${uid}`)
  return doc
}

export async function getFreeUser(uid: string): Promise<FreeUserDoc | null> {
  const snap = await col().doc(uid).get()
  return snap.exists ? (snap.data() as FreeUserDoc) : null
}

export async function incrementDownloads(uid: string): Promise<void> {
  const now = new Date()
  const userRef = col().doc(uid)

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(userRef)
    if (!doc.exists) return

    const data = doc.data() as FreeUserDoc
    const newDownloadsUsed = (data.downloadsUsed || 0) + 1
    const reachedLimit = newDownloadsUsed >= (data.downloadsLimit || DEFAULT_FREE_LIMITS.downloadsLimit)

    transaction.update(userRef, {
      downloadsUsed: newDownloadsUsed,
      reachedDownloadLimit: reachedLimit,
      lastDownloadAt: now,
      updatedAt: now,
    })
  })
}

export async function incrementBundles(uid: string): Promise<void> {
  const now = new Date()
  const userRef = col().doc(uid)

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(userRef)
    if (!doc.exists) return

    const data = doc.data() as FreeUserDoc
    const newBundlesCreated = (data.bundlesCreated || 0) + 1
    const reachedLimit = newBundlesCreated >= (data.bundlesLimit || DEFAULT_FREE_LIMITS.bundlesLimit)

    transaction.update(userRef, {
      bundlesCreated: newBundlesCreated,
      reachedBundleLimit: reachedLimit,
      updatedAt: now,
    })
  })
}

export async function resetMonthlyUsage(uid: string): Promise<void> {
  const now = new Date()
  await col().doc(uid).update({
    downloadsUsed: 0,
    reachedDownloadLimit: false,
    updatedAt: now,
  })
  console.log(`✅ Reset monthly usage for free user: ${uid}`)
}

export function getFreeUserLimits(user: FreeUserDoc) {
  return {
    tier: "free" as const,
    downloadsUsed: user.downloadsUsed || 0,
    downloadsLimit: user.downloadsLimit || DEFAULT_FREE_LIMITS.downloadsLimit,
    bundlesCreated: user.bundlesCreated || 0,
    bundlesLimit: user.bundlesLimit || DEFAULT_FREE_LIMITS.bundlesLimit,
    maxVideosPerBundle: user.maxVideosPerBundle || DEFAULT_FREE_LIMITS.maxVideosPerBundle,
    platformFeePercentage: user.platformFeePercentage || DEFAULT_FREE_LIMITS.platformFeePercentage,
    reachedDownloadLimit: user.reachedDownloadLimit || false,
    reachedBundleLimit: user.reachedBundleLimit || false,
  }
}
