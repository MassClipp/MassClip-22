// Existing content preserved above. Adding an idempotent helper to guarantee freeUsers for non-pro users.

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
  // Create or update free user record
  static async createFreeUser(userData: Partial<FreeUserData>): Promise<void> {
    try {
      const now = new Date()
      const freeUserData: FreeUserData = {
        uid: userData.uid!,
        joinedAt: userData.joinedAt || now,
        downloadsUsed: userData.downloadsUsed ?? 0,
        downloadsLimit: userData.downloadsLimit ?? 15,
        lastDownloadAt: userData.lastDownloadAt,
        reachedLimit: userData.reachedLimit ?? false,
        referralCodeUsed: userData.referralCodeUsed,
        upgraded: userData.upgraded ?? false,
        email: userData.email!,
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

      await db.collection("freeUsers").doc(userData.uid!).set(freeUserData, { merge: true })
      console.log(`✅ [UserTracking] Created/updated free user record: ${userData.uid}`)
    } catch (error) {
      console.error("❌ [UserTracking] Error creating free user:", error)
      throw error
    }
  }

  // Create or update creator pro user record
  static async createCreatorProUser(userData: Partial<CreatorProUserData>): Promise<void> {
    try {
      const now = new Date()
      const creatorProData: CreatorProUserData = {
        uid: userData.uid!,
        subscribedAt: userData.subscribedAt || now,
        stripeCustomerId: userData.stripeCustomerId!,
        subscriptionId: userData.subscriptionId!,
        email: userData.email!,
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

      await db.collection("creatorProUsers").doc(userData.uid!).set(creatorProData, { merge: true })
      console.log(`✅ [UserTracking] Created/updated creator pro user record: ${userData.uid}`)
    } catch (error) {
      console.error("❌ [UserTracking] Error creating creator pro user:", error)
      throw error
    }
  }

  // Get free user data
  static async getFreeUser(uid: string): Promise<FreeUserData | null> {
    try {
      const doc = await db.collection("freeUsers").doc(uid).get()
      if (doc.exists) {
        return doc.data() as FreeUserData
      }
      return null
    } catch (error) {
      console.error("❌ [UserTracking] Error getting free user:", error)
      return null
    }
  }

  // Get creator pro user data
  static async getCreatorProUser(uid: string): Promise<CreatorProUserData | null> {
    try {
      const doc = await db.collection("creatorProUsers").doc(uid).get()
      if (doc.exists) {
        return doc.data() as CreatorProUserData
      }
      return null
    } catch (error) {
      console.error("❌ [UserTracking] Error getting creator pro user:", error)
      return null
    }
  }

  // Upgrade user from free to creator pro
  static async upgradeToCreatorPro(
    uid: string,
    stripeCustomerId: string,
    subscriptionId: string,
    email: string,
    additionalData?: Partial<CreatorProUserData>,
  ): Promise<void> {
    try {
      // Get existing free user data
      const freeUser = await this.getFreeUser(uid)

      // Mark free user as upgraded
      if (freeUser) {
        await db.collection("freeUsers").doc(uid).update({
          upgraded: true,
          updatedAt: new Date(),
        })
      }

      // Create creator pro record
      await this.createCreatorProUser({
        uid,
        stripeCustomerId,
        subscriptionId,
        email,
        downloadsUsed: freeUser?.downloadsUsed ?? 0,
        bundlesCreated: freeUser?.bundlesCreated ?? 0,
        ...additionalData,
      })

      console.log(`✅ [UserTracking] Successfully upgraded user to Creator Pro: ${uid}`)
    } catch (error) {
      console.error("❌ [UserTracking] Error upgrading user:", error)
      throw error
    }
  }

  // Downgrade user from creator pro to free
  static async downgradeToFree(uid: string): Promise<void> {
    try {
      const proUser = await this.getCreatorProUser(uid)

      if (proUser) {
        // Update creator pro record to show downgrade requested
        await db.collection("creatorProUsers").doc(uid).update({
          downgradeRequested: true,
          subscriptionStatus: "canceled",
          updatedAt: new Date(),
        })

        // Create/update free user record
        await this.createFreeUser({
          uid,
          email: proUser.email,
          downloadsUsed: Math.min(proUser.downloadsUsed, 15), // Cap at free limit
          bundlesCreated: Math.min(proUser.bundlesCreated, 2), // Cap at free limit
          upgraded: true, // They were previously upgraded
        })
      }

      console.log(`✅ [UserTracking] Successfully downgraded user to free: ${uid}`)
    } catch (error) {
      console.error("❌ [UserTracking] Error downgrading user:", error)
      throw error
    }
  }

  // NEW: Ensure a freeUsers record exists and is fully populated for any user who is not active Creator Pro
  static async ensureFreeUserForNonPro(
    uid: string,
    email: string,
    extra?: Partial<FreeUserData>,
  ): Promise<{ ensured: boolean; reason?: string }> {
    const pro = await this.getCreatorProUser(uid)

    // If user is Creator Pro and active, do nothing
    if (pro && pro.subscriptionStatus === "active") {
      return { ensured: false, reason: "creator_pro_active" }
    }

    // Ensure/merge a fully populated freeUsers record
    await this.createFreeUser({
      uid,
      email,
      ipAddress: extra?.ipAddress,
      geoLocation: extra?.geoLocation,
      referralCodeUsed: extra?.referralCodeUsed,
      // merge will fill defaults for any missing fields
    })

    return { ensured: true }
  }

  // Update download usage
  static async incrementDownloadUsage(uid: string): Promise<void> {
    try {
      const now = new Date()

      // Check if user is creator pro first
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

      // Update free user
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
        // If missing, ensure record then increment
        await this.createFreeUser({ uid, email: "", downloadsUsed: 1, lastDownloadAt: now, reachedLimit: false })
      }
    } catch (error) {
      console.error("❌ [UserTracking] Error incrementing download usage:", error)
      throw error
    }
  }

  // Update bundle creation count
  static async incrementBundleCount(uid: string): Promise<void> {
    try {
      const now = new Date()

      // Check if user is creator pro first
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

      // Update free user
      await db
        .collection("freeUsers")
        .doc(uid)
        .set(
          {
            bundlesCreated: FieldValue.increment(1),
            updatedAt: now,
          } as any,
          { merge: true },
        )
    } catch (error) {
      console.error("❌ [UserTracking] Error incrementing bundle count:", error)
      throw error
    }
  }

  // Get user tier and limits
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
    try {
      // Check creator pro first
      const proUser = await this.getCreatorProUser(uid)
      if (proUser && proUser.subscriptionStatus === "active") {
        return {
          tier: "creator_pro",
          downloadsUsed: proUser.downloadsUsed ?? 0,
          downloadsLimit: null, // unlimited
          bundlesCreated: proUser.bundlesCreated ?? 0,
          bundlesLimit: null, // unlimited
          maxVideosPerBundle: null, // unlimited
          platformFeePercentage: proUser.platformFeePercentage ?? 10,
          reachedDownloadLimit: false,
          reachedBundleLimit: false,
        }
      }

      // Ensure a free user record exists if not pro
      const freeUser = (await this.getFreeUser(uid)) ?? null
      if (!freeUser) {
        // If not found, create with defaults (email unknown here)
        await this.createFreeUser({ uid, email: "" })
      }
      const ensuredFree = (await this.getFreeUser(uid))!

      return {
        tier: "free",
        downloadsUsed: ensuredFree.downloadsUsed ?? 0,
        downloadsLimit: ensuredFree.downloadsLimit ?? 15,
        bundlesCreated: ensuredFree.bundlesCreated ?? 0,
        bundlesLimit: ensuredFree.bundlesLimit ?? 2,
        maxVideosPerBundle: ensuredFree.maxVideosPerBundle ?? 10,
        platformFeePercentage: ensuredFree.platformFeePercentage ?? 20,
        reachedDownloadLimit: ensuredFree.reachedLimit ?? false,
        reachedBundleLimit: (ensuredFree.bundlesCreated ?? 0) >= (ensuredFree.bundlesLimit ?? 2),
      }
    } catch (error) {
      console.error("❌ [UserTracking] Error getting user tier info:", error)
      throw error
    }
  }

  // Reset monthly usage (if implementing monthly limits)
  static async resetMonthlyUsage(uid: string): Promise<void> {
    try {
      const now = new Date()

      await db.collection("freeUsers").doc(uid).update({
        downloadsUsed: 0,
        reachedLimit: false,
        usageResetAt: now,
        updatedAt: now,
      })

      console.log(`✅ [UserTracking] Reset monthly usage for user: ${uid}`)
    } catch (error) {
      console.error("❌ [UserTracking] Error resetting monthly usage:", error)
      throw error
    }
  }
}
