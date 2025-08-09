import { adminDb, FieldValue } from "@/lib/firebase-admin"
import type { Timestamp } from "firebase-admin/firestore"

interface UserTrackingData {
  uid: string
  email: string
  lastSeen: Timestamp
  createdAt: Timestamp
  ipAddress?: string
  userAgent?: string
  downloads: number
  bundlesCreated: number
}

interface TierInfo {
  tier: "free" | "creator_pro"
  maxVideosPerBundle: number | null
  maxBundles: number | null
}

export class UserTrackingService {
  private static getFreeUsersCollection() {
    return adminDb.collection("freeUsers")
  }

  private static getProUsersCollection() {
    return adminDb.collection("creatorProUsers")
  }

  static async ensureFreeUserForNonPro(uid: string, email: string, metadata: { ipAddress?: string } = {}) {
    const proSnap = await this.getProUsersCollection().doc(uid).get()
    if (proSnap.exists) {
      return // User is pro, no action needed
    }

    const freeSnap = await this.getFreeUsersCollection().doc(uid).get()
    if (freeSnap.exists) {
      // Update last seen and IP if provided
      await freeSnap.ref.update({
        lastSeen: FieldValue.serverTimestamp(),
        ...(metadata.ipAddress && { ipAddress: metadata.ipAddress }),
      })
      return
    }

    // Create new free user record
    const now = FieldValue.serverTimestamp()
    const newUser: UserTrackingData = {
      uid,
      email,
      lastSeen: now as Timestamp,
      createdAt: now as Timestamp,
      downloads: 0,
      bundlesCreated: 0,
      ...(metadata.ipAddress && { ipAddress: metadata.ipAddress }),
    }
    await this.getFreeUsersCollection().doc(uid).set(newUser)
    console.log(`[UserTrackingService] Created free user record for ${uid}`)
  }

  static async upgradeToPro(uid: string) {
    // When a user upgrades, we can remove their free record
    const freeUserRef = this.getFreeUsersCollection().doc(uid)
    await freeUserRef.delete()
    console.log(`[UserTrackingService] Removed free user record for ${uid} upon upgrade.`)
  }

  static async downgradeToFree(uid: string, email: string) {
    // When a user downgrades, ensure a free record exists
    await this.ensureFreeUserForNonPro(uid, email)
    console.log(`[UserTrackingService] Ensured free user record exists for ${uid} upon downgrade.`)
  }

  static async getUserTierInfo(uid: string): Promise<TierInfo> {
    const proSnap = await this.getProUsersCollection().doc(uid).get()
    if (proSnap.exists && proSnap.data()?.subscriptionStatus === "active") {
      return {
        tier: "creator_pro",
        maxVideosPerBundle: null, // unlimited
        maxBundles: null, // unlimited
      }
    }

    // Default to free tier if not an active pro user
    return {
      tier: "free",
      maxVideosPerBundle: 10,
      maxBundles: 2,
    }
  }
}
