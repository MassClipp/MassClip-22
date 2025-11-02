import { db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

// Free User Tracking Interface
export interface FreeUserData {
  uid: string
  joinedAt: Date
  downloadsUsed: number
  downloadsLimit: number
  lastDownloadAt?: Date
  reachedLimit: boolean
  referralCodeUsed?: string
  upgraded: boolean
  email: string
  usageResetAt?: Date
  pendingUpgradePrompted: boolean
  ipAddress?: string
  geoLocation?: string

  // Tier limits
  bundlesCreated: number
  bundlesLimit: number
  maxVideosPerBundle: number
  platformFeePercentage: number

  // Metadata
  createdAt: Date
  updatedAt: Date
}

// Creator Pro User Tracking Interface
export interface CreatorProUserData {
  uid: string
  subscribedAt: Date
  stripeCustomerId: string
  subscriptionId: string
  email: string
  downloadsUsed: number
  tier: string
  revenueSplit: number
  subscriptionStatus: string
  paymentMethodLast4?: string
  renewalDate?: Date
  promotionCodeUsed?: string
  proPerksUsed: {
    bonusStorefronts?: number
    prioritySupport?: boolean
    customBranding?: boolean
    advancedAnalytics?: boolean
  }
  downgradeRequested: boolean
  ipAddress?: string
  geoLocation?: string
  totalPaid: number

  // Tier limits (unlimited for pro)
  bundlesCreated: number
  bundlesLimit: number | null // null = unlimited
  maxVideosPerBundle: number | null // null = unlimited
  platformFeePercentage: number

  // Metadata
  createdAt: Date
  updatedAt: Date
}

export class UserTrackingService {
  // Create or update free user record (idempotent, merges defaults)
  static async createFreeUser(userData: Partial<FreeUserData>): Promise<void> {
    if (!userData.uid) throw new Error("createFreeUser requires uid")
    if (typeof userData.email === "undefined") {
      // Keep email optional at call-site, but store empty string if unknown
      userData.email = ""
    }

    const now = new Date()
    const freeUserData: FreeUserData = {
      uid: userData.uid,
      joinedAt: userData.joinedAt || now,
      downloadsUsed: userData.downloadsUsed ?? 0,
      downloadsLimit: userData.downloadsLimit ?? 15,
      lastDownloadAt: userData.lastDownloadAt,
      reachedLimit: userData.reachedLimit ?? false,
      referralCodeUsed: userData.referralCodeUsed,
      upgraded: userData.upgraded ?? false,
      email: userData.email,
      usageResetAt: userData.usageResetAt,
      pendingUpgradePrompted: userData.pendingUpgradePrompted ?? false,
      ipAddress: userData.ipAddress,
      geoLocation: userData.geoLocation,

      // Tier limits for free users
      bundlesCreated: userData.bundlesCreated ?? 0,
      bundlesLimit: userData.bundlesLimit ?? 2,
      maxVideosPerBundle: userData.maxVideosPerBundle ?? 10,
      platformFeePercentage: userData.platformFeePercentage ?? 20,

      createdAt: userData.createdAt || now,
      updatedAt: now,
    }

    await db.collection("freeUsers").doc(userData.uid).set(freeUserData, { merge: true })
    console.log(`✅ [UserTracking] Created/updated free user record: ${userData.uid}`)
  }

  // Create or update creator pro user record (idempotent, merges defaults)
  static async createCreatorProUser(userData: Partial<CreatorProUserData>): Promise<void> {
    if (!userData.uid) throw new Error("createCreatorProUser requires uid")
    if (!userData.stripeCustomerId) throw new Error("createCreatorProUser requires stripeCustomerId")
    if (!userData.subscriptionId) throw new Error("createCreatorProUser requires subscriptionId")
    if (!userData.email) throw new Error("createCreatorProUser requires email")

    const now = new Date()
    const creatorProData: CreatorProUserData = {
      uid: userData.uid,
      subscribedAt: userData.subscribedAt || now,
      stripeCustomerId: userData.stripeCustomerId,
      subscriptionId: userData.subscriptionId,
      email: userData.email,
      downloadsUsed: userData.downloadsUsed ?? 0,
      tier: userData.tier ?? "creator_pro",
      revenueSplit: userData.revenueSplit ?? 10,
      subscriptionStatus: userData.subscriptionStatus ?? "active",
      paymentMethodLast4: userData.paymentMethodLast4,
      renewalDate: userData.renewalDate,
      promotionCodeUsed: userData.promotionCodeUsed,
      proPerksUsed: userData.proPerksUsed || {},
      downgradeRequested: userData.downgradeRequested ?? false,
      ipAddress: userData.ipAddress,
      geoLocation: userData.geoLocation,
      totalPaid: userData.totalPaid ?? 0,

      // Tier limits for pro users (unlimited)
      bundlesCreated: userData.bundlesCreated ?? 0,
      bundlesLimit: null, // unlimited
      maxVideosPerBundle: null, // unlimited
      platformFeePercentage: userData.platformFeePercentage ?? 10,

      createdAt: userData.createdAt || now,
      updatedAt: now,
    }

    await db.collection("creatorProUsers").doc(userData.uid).set(creatorProData, { merge: true })
    console.log(`✅ [UserTracking] Created/updated creator pro user record: ${userData.uid}`)
  }

  static async getFreeUser(uid: string): Promise<FreeUserData | null> {
    const doc = await db.collection("freeUsers").doc(uid).get()
    return doc.exists ? (doc.data() as FreeUserData) : null
  }

  static async getCreatorProUser(uid: string): Promise<CreatorProUserData | null> {
    const doc = await db.collection("creatorProUsers").doc(uid).get()
    return doc.exists ? (doc.data() as CreatorProUserData) : null
  }

  // Soft upgrade: keep freeUsers doc, mark upgraded=true, create/merge creatorProUsers
  static async upgradeToCreatorPro(
    uid: string,
    stripeCustomerId: string,
    subscriptionId: string,
    email: string,
    additionalData?: Partial<CreatorProUserData>,
  ): Promise<void> {
    // Mark free user as upgraded if present
    const freeUser = await this.getFreeUser(uid)
    if (freeUser) {
      await db.collection("freeUsers").doc(uid).update({
        upgraded: true,
        updatedAt: new Date(),
      })
    }

    // Create or update pro record
    await this.createCreatorProUser({
      uid,
      stripeCustomerId,
      subscriptionId,
      email,
      downloadsUsed: freeUser?.downloadsUsed ?? 0,
      bundlesCreated: freeUser?.bundlesCreated ?? 0,
      ...additionalData,
    })

    console.log(`✅ [UserTracking] Soft upgraded to Creator Pro: ${uid}`)
  }

  // Soft downgrade: mark creatorProUsers canceled, ensure freeUsers with free caps
  static async downgradeToFree(uid: string, email?: string): Promise<void> {
    const now = new Date()
    const proUser = await this.getCreatorProUser(uid)

    if (proUser) {
      await db.collection("creatorProUsers").doc(uid).update({
        downgradeRequested: true,
        subscriptionStatus: "canceled",
        updatedAt: now,
      })
    }

    // Ensure/merge a free user record with caps applied from any previous usage
    await this.createFreeUser({
      uid,
      email: email ?? proUser?.email ?? "",
      downloadsUsed: Math.min(proUser?.downloadsUsed ?? 0, 15),
      bundlesCreated: Math.min(proUser?.bundlesCreated ?? 0, 2),
      upgraded: true, // indicates they were previously pro
    })

    console.log(`✅ [UserTracking] Soft downgraded to Free: ${uid}`)
  }

  // Ensure a freeUsers record exists and is fully populated for any non-active Creator Pro
  static async ensureFreeUserForNonPro(
    uid: string,
    email: string,
    extra?: Partial<FreeUserData>,
  ): Promise<{ ensured: boolean; reason?: string }> {
    const pro = await this.getCreatorProUser(uid)
    if (pro && pro.subscriptionStatus === "active") {
      return { ensured: false, reason: "creator_pro_active" }
    }

    await this.createFreeUser({
      uid,
      email,
      ipAddress: extra?.ipAddress,
      geoLocation: extra?.geoLocation,
      referralCodeUsed: extra?.referralCodeUsed,
    })
    return { ensured: true }
  }

  static async incrementDownloadUsage(uid: string): Promise<void> {
    const now = new Date()
    const proUser = await this.getCreatorProUser(uid)
    if (proUser && proUser.subscriptionStatus === "active") {
      await db
        .collection("creatorProUsers")
        .doc(uid)
        .update({
          downloadsUsed: FieldValue.increment(1),
          lastDownloadAt: now,
          updatedAt: now,
        })
      return
    }

    const freeUser = await this.getFreeUser(uid)
    if (freeUser) {
      const newDownloadsUsed = (freeUser.downloadsUsed ?? 0) + 1
      const reachedLimit = newDownloadsUsed >= (freeUser.downloadsLimit ?? 15)
      await db.collection("freeUsers").doc(uid).update({
        downloadsUsed: newDownloadsUsed,
        lastDownloadAt: now,
        reachedLimit,
        updatedAt: now,
      })
    } else {
      // If missing, create with a single download used
      await this.createFreeUser({
        uid,
        email: "",
        downloadsUsed: 1,
        lastDownloadAt: now,
        reachedLimit: false,
      })
    }
  }

  static async incrementBundleCount(uid: string): Promise<void> {
    const now = new Date()
    const proUser = await this.getCreatorProUser(uid)
    if (proUser && proUser.subscriptionStatus === "active") {
      await db
        .collection("creatorProUsers")
        .doc(uid)
        .update({
          bundlesCreated: FieldValue.increment(1),
          updatedAt: now,
        })
      return
    }

    await db
      .collection("freeUsers")
      .doc(uid)
      .set({ bundlesCreated: FieldValue.increment(1), updatedAt: now } as any, { merge: true })
  }

  static async getUserTierInfo(uid: string): Promise<{
    tier: "free" | "creator_pro"
    downloadsUsed: number
    downloadsLimit: number | null
    bundlesCreated: number
    bundlesLimit: number | null
    maxVideosPerBundle: number | null
    platformFeePercentage: number
    reachedDownloadLimit: boolean
    reachedBundleLimit: boolean
  }> {
    const proUser = await this.getCreatorProUser(uid)
    if (proUser && proUser.subscriptionStatus === "active") {
      return {
        tier: "creator_pro",
        downloadsUsed: proUser.downloadsUsed ?? 0,
        downloadsLimit: null,
        bundlesCreated: proUser.bundlesCreated ?? 0,
        bundlesLimit: null,
        maxVideosPerBundle: null,
        platformFeePercentage: proUser.platformFeePercentage ?? 10,
        reachedDownloadLimit: false,
        reachedBundleLimit: false,
      }
    }

    // Ensure free record exists if not pro
    const free = (await this.getFreeUser(uid)) ?? null
    if (!free) {
      await this.createFreeUser({ uid, email: "" })
    }
    const ensured = (await this.getFreeUser(uid))!

    return {
      tier: "free",
      downloadsUsed: ensured.downloadsUsed ?? 0,
      downloadsLimit: ensured.downloadsLimit ?? 15,
      bundlesCreated: ensured.bundlesCreated ?? 0,
      bundlesLimit: ensured.bundlesLimit ?? 2,
      maxVideosPerBundle: ensured.maxVideosPerBundle ?? 10,
      platformFeePercentage: ensured.platformFeePercentage ?? 20,
      reachedDownloadLimit: ensured.reachedLimit ?? false,
      reachedBundleLimit: (ensured.bundlesCreated ?? 0) >= (ensured.bundlesLimit ?? 2),
    }
  }

  static async resetMonthlyUsage(uid: string): Promise<void> {
    const now = new Date()
    await db.collection("freeUsers").doc(uid).update({
      downloadsUsed: 0,
      reachedLimit: false,
      usageResetAt: now,
      updatedAt: now,
    })
    console.log(`✅ [UserTracking] Reset monthly usage for user: ${uid}`)
  }
}
