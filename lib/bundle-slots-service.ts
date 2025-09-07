import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export interface BundleSlotPurchase {
  id: string
  uid: string
  email: string
  bundleSlots: number // 1, 3, or 5
  priceId: string
  amount: number // in cents
  stripeSessionId: string
  stripePaymentIntentId?: string
  status: "pending" | "completed" | "failed"
  purchaseDate: any
  appliedDate?: any
  metadata?: {
    tier: "1_bundle" | "3_bundle" | "5_bundle"
    description: string
  }
}

// Bundle slot pricing tiers
export const BUNDLE_SLOT_TIERS = {
  "1_bundle": {
    slots: 1,
    priceId: "price_1S4pU2Dheyb0pkWFfJNzelxi",
    amount: 399, // $3.99
    description: "1 Extra Bundle",
  },
  "3_bundle": {
    slots: 3,
    priceId: "price_1S4pUrDheyb0pkWFAY0jv6Xy",
    amount: 799, // $7.99
    description: "3 Extra Bundles",
  },
  "5_bundle": {
    slots: 5,
    priceId: "price_1S4pVUDheyb0pkWF4AT6vKMQ",
    amount: 1199, // $11.99
    description: "5 Extra Bundles",
  },
} as const

export async function createBundleSlotPurchase(
  uid: string,
  email: string,
  tier: keyof typeof BUNDLE_SLOT_TIERS,
  stripeSessionId: string,
): Promise<string> {
  console.log("🔄 Creating bundle slot purchase:", { uid: uid.substring(0, 8) + "...", tier })

  const tierInfo = BUNDLE_SLOT_TIERS[tier]
  const purchaseId = adminDb.collection("bundleSlotPurchases").doc().id

  const purchase: BundleSlotPurchase = {
    id: purchaseId,
    uid,
    email,
    bundleSlots: tierInfo.slots,
    priceId: tierInfo.priceId,
    amount: tierInfo.amount,
    stripeSessionId,
    status: "pending",
    purchaseDate: FieldValue.serverTimestamp(),
    metadata: {
      tier,
      description: tierInfo.description,
    },
  }

  await adminDb.collection("bundleSlotPurchases").doc(purchaseId).set(purchase)
  console.log("✅ Bundle slot purchase created:", purchaseId)

  return purchaseId
}

export async function completeBundleSlotPurchase(
  stripeSessionId: string,
  stripePaymentIntentId: string,
): Promise<void> {
  console.log("🔄 Completing bundle slot purchase:", stripeSessionId)

  // Find purchase by session ID
  const purchaseQuery = adminDb
    .collection("bundleSlotPurchases")
    .where("stripeSessionId", "==", stripeSessionId)
    .limit(1)

  const purchaseSnapshot = await purchaseQuery.get()

  if (purchaseSnapshot.empty) {
    throw new Error(`Bundle slot purchase not found for session: ${stripeSessionId}`)
  }

  const purchaseDoc = purchaseSnapshot.docs[0]
  const purchase = purchaseDoc.data() as BundleSlotPurchase

  // Update purchase status
  await purchaseDoc.ref.update({
    status: "completed",
    stripePaymentIntentId,
    appliedDate: FieldValue.serverTimestamp(),
  })

  // Apply bundle slots to user account
  await applyBundleSlotsToUser(purchase.uid, purchase.bundleSlots, purchase.id)

  console.log("✅ Bundle slot purchase completed and applied:", {
    purchaseId: purchase.id,
    uid: purchase.uid.substring(0, 8) + "...",
    slots: purchase.bundleSlots,
  })
}

export interface UserBundleSlots {
  uid: string
  totalPurchasedSlots: number
  totalUsedSlots: number
  availableSlots: number
  purchases: string[] // Array of purchase IDs
  lastUpdated: any
}

export async function applyBundleSlotsToUser(uid: string, slots: number, purchaseId: string): Promise<void> {
  console.log("🔄 Applying bundle slots to user:", { uid: uid.substring(0, 8) + "...", slots })

  const freeUserRef = adminDb.collection("freeUsers").doc(uid)
  const freeUserDoc = await freeUserRef.get()

  if (freeUserDoc.exists) {
    await freeUserRef.update({
      bundlesLimit: FieldValue.increment(slots),
    })
    console.log(`✅ Updated existing freeUsers bundlesLimit by ${slots} slots`)
  } else {
    // Create freeUsers document with default values + purchased slots
    console.log("ℹ️ Creating new freeUsers document with purchased bundle slots")
    await freeUserRef.set({
      bundlesCreated: 0,
      bundlesLimit: 2 + slots, // Default 2 + purchased slots
      downloadsLimit: 15,
      downloadsUsed: 0,
      currentPeriodStart: FieldValue.serverTimestamp(),
      email: "", // Will be updated when user data is available
      hasLimitedOrganization: true,
      hasNoWatermark: false,
      hasPremiumContent: false,
      hasPrioritySupport: false,
      hasUnlimitedDownloads: false,
      createdAt: FieldValue.serverTimestamp(),
    })
    console.log(`✅ Created new freeUsers document with bundlesLimit: ${2 + slots}`)
  }

  const userSlotsRef = adminDb.collection("userBundleSlots").doc(uid)
  const userSlotsDoc = await userSlotsRef.get()

  if (userSlotsDoc.exists) {
    // Update existing record
    await userSlotsRef.update({
      totalPurchasedSlots: FieldValue.increment(slots),
      availableSlots: FieldValue.increment(slots),
      purchases: FieldValue.arrayUnion(purchaseId),
      lastUpdated: FieldValue.serverTimestamp(),
    })
  } else {
    // Create new record
    const userSlots: UserBundleSlots = {
      uid,
      totalPurchasedSlots: slots,
      totalUsedSlots: 0,
      availableSlots: slots,
      purchases: [purchaseId],
      lastUpdated: FieldValue.serverTimestamp(),
    }
    await userSlotsRef.set(userSlots)
  }

  console.log("✅ Bundle slots applied to user account")
}

export async function getUserBundleSlots(uid: string): Promise<UserBundleSlots | null> {
  console.log("🔄 Getting user bundle slots:", uid.substring(0, 8) + "...")

  const userSlotsDoc = await adminDb.collection("userBundleSlots").doc(uid).get()

  if (!userSlotsDoc.exists) {
    console.log("ℹ️ No bundle slots found for user")
    return null
  }

  const data = userSlotsDoc.data() as UserBundleSlots
  console.log("✅ Found user bundle slots:", {
    totalPurchased: data.totalPurchasedSlots,
    available: data.availableSlots,
    used: data.totalUsedSlots,
  })

  return data
}

export async function consumeBundleSlot(uid: string): Promise<{ success: boolean; reason?: string }> {
  console.log("🔄 Consuming bundle slot for user:", uid.substring(0, 8) + "...")

  const userSlotsRef = adminDb.collection("userBundleSlots").doc(uid)
  const userSlotsDoc = await userSlotsRef.get()

  if (!userSlotsDoc.exists) {
    console.log("ℹ️ No bundle slots available for user")
    return { success: false, reason: "No bundle slots available" }
  }

  const userSlots = userSlotsDoc.data() as UserBundleSlots

  if (userSlots.availableSlots <= 0) {
    console.log("❌ No available bundle slots")
    return { success: false, reason: "No available bundle slots" }
  }

  // Consume one slot
  await userSlotsRef.update({
    totalUsedSlots: FieldValue.increment(1),
    availableSlots: FieldValue.increment(-1),
    lastUpdated: FieldValue.serverTimestamp(),
  })

  console.log("✅ Bundle slot consumed successfully")
  return { success: true }
}

export async function getUserBundleSlotPurchases(uid: string): Promise<BundleSlotPurchase[]> {
  console.log("🔄 Getting bundle slot purchases for user:", uid.substring(0, 8) + "...")

  const purchasesQuery = adminDb
    .collection("bundleSlotPurchases")
    .where("uid", "==", uid)
    .orderBy("purchaseDate", "desc")

  const purchasesSnapshot = await purchasesQuery.get()
  const purchases: BundleSlotPurchase[] = []

  purchasesSnapshot.forEach((doc) => {
    purchases.push(doc.data() as BundleSlotPurchase)
  })

  console.log(`✅ Found ${purchases.length} bundle slot purchases`)
  return purchases
}
