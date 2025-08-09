import { adminDb, FieldValue } from "@/lib/firebase-admin"
import type { Timestamp } from "firebase-admin/firestore"

export interface MembershipLimits {
  downloadsLimit: number | null // null for unlimited
  downloadsUsed: number
  bundlesLimit: number | null // null for unlimited
  bundlesCreated: number
  maxVideosPerBundle: number | null // null for unlimited
}

export interface MembershipData {
  uid: string
  email: string
  tier: "free" | "creator_pro"
  isActive: boolean
  source: "auto" | "checkout" | "webhook" | "manual"
  limits: MembershipLimits
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  currentPeriodEnd?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

const FREE_TIER_LIMITS: MembershipLimits = {
  downloadsLimit: 15,
  downloadsUsed: 0,
  bundlesLimit: 2,
  bundlesCreated: 0,
  maxVideosPerBundle: 10,
}

const PRO_TIER_LIMITS: MembershipLimits = {
  downloadsLimit: null,
  downloadsUsed: 0,
  bundlesLimit: null,
  bundlesCreated: 0,
  maxVideosPerBundle: null,
}

export class MembershipService {
  private static getCollection() {
    return adminDb.collection("memberships")
  }

  static async getMembership(uid: string): Promise<MembershipData | null> {
    const docRef = this.getCollection().doc(uid)
    const docSnap = await docRef.get()
    if (docSnap.exists) {
      return docSnap.data() as MembershipData
    }
    return null
  }

  static async ensureMembership(uid: string, email: string): Promise<MembershipData> {
    const existing = await this.getMembership(uid)
    if (existing) {
      // If email is missing on existing doc, update it.
      if (!existing.email && email) {
        await this.getCollection().doc(uid).update({ email })
        existing.email = email
      }
      return existing
    }

    console.log(`[MembershipService] No membership found for ${uid}. Creating new 'free' tier record.`)

    const now = FieldValue.serverTimestamp() as Timestamp

    const newMembership: MembershipData = {
      uid,
      email,
      tier: "free",
      isActive: false,
      source: "auto",
      limits: { ...FREE_TIER_LIMITS },
      createdAt: now,
      updatedAt: now,
    }

    await this.getCollection().doc(uid).set(newMembership)
    console.log(`[MembershipService] Successfully created 'free' tier for ${uid}.`)
    return newMembership
  }

  static async upgradeToPro(uid: string, stripeCustomerId: string, stripeSubscriptionId: string, periodEnd: Date) {
    const docRef = this.getCollection().doc(uid)
    const userMembership = await this.getMembership(uid)

    const now = FieldValue.serverTimestamp()

    const upgradeData = {
      tier: "creator_pro",
      isActive: true,
      source: "webhook",
      stripeCustomerId,
      stripeSubscriptionId,
      currentPeriodEnd: periodEnd,
      limits: {
        ...PRO_TIER_LIMITS,
        bundlesCreated: userMembership?.limits.bundlesCreated ?? 0,
        downloadsUsed: userMembership?.limits.downloadsUsed ?? 0,
      },
      updatedAt: now,
    }

    await docRef.set(upgradeData, { merge: true })
    console.log(`[MembershipService] Upgraded user ${uid} to creator_pro.`)
  }

  static async downgradeToFree(stripeCustomerId: string) {
    const querySnapshot = await this.getCollection().where("stripeCustomerId", "==", stripeCustomerId).limit(1).get()

    if (querySnapshot.empty) {
      console.error(`[MembershipService] Could not find user to downgrade with customer ID: ${stripeCustomerId}`)
      return
    }

    const userDoc = querySnapshot.docs[0]
    const docRef = userDoc.ref
    const now = FieldValue.serverTimestamp()

    const downgradeData = {
      tier: "free",
      isActive: false,
      source: "webhook",
      stripeSubscriptionId: FieldValue.delete(),
      currentPeriodEnd: FieldValue.delete(),
      limits: { ...FREE_TIER_LIMITS, bundlesCreated: userDoc.data().limits.bundlesCreated ?? 0, downloadsUsed: 0 }, // Reset downloads on downgrade
      updatedAt: now,
    }

    await docRef.update(downgradeData)
    console.log(`[MembershipService] Downgraded user ${userDoc.id} to free.`)
  }

  static async incrementUsage(
    uid: string,
    type: "downloads" | "bundles",
  ): Promise<{ success: boolean; error?: string }> {
    const membership = await this.ensureMembership(uid, "") // Ensure doc exists

    const key = type === "downloads" ? "downloadsUsed" : "bundlesCreated"
    const limitKey = type === "downloads" ? "downloadsLimit" : "bundlesLimit"

    const currentUsed = membership.limits[key]
    const currentLimit = membership.limits[limitKey]

    if (currentLimit !== null && currentUsed >= currentLimit) {
      return { success: false, error: `Limit reached for ${type}` }
    }

    await this.getCollection()
      .doc(uid)
      .update({
        [`limits.${key}`]: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      })

    return { success: true }
  }
}
