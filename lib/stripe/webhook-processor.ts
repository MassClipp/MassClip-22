import Stripe from "stripe"
import { adminDb as db } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

// --- Types ---
type MembershipPlan = "free" | "creator_pro" | "starter" | "facelessprenuer" | "faceless_pro"
type MembershipStatus = "active" | "inactive" | "canceled" | "past_due" | "trialing"

const PLAN_CONFIGS = {
  starter: {
    plan: "starter" as const,
    features: {
      maxBundles: 5,
      maxVideosPerBundle: 15,
      maxFolders: 3,
      platformFeePercentage: 20,
      isActive: true,
    },
  },
  faceless_pro: {
    plan: "faceless_pro" as const,
    features: {
      maxBundles: 5,
      maxVideosPerBundle: 25,
      maxFolders: 3,
      platformFeePercentage: 15,
      isActive: true,
    },
  },
  facelessprenuer: {
    plan: "facelessprenuer" as const,
    features: {
      maxBundles: null,
      maxVideosPerBundle: null,
      maxFolders: null,
      platformFeePercentage: 10,
      isActive: true,
    },
  },
  creator_pro: {
    plan: "creator_pro" as const,
    features: {
      maxBundles: null,
      maxVideosPerBundle: null,
      maxFolders: null,
      platformFeePercentage: 10,
      isActive: true,
    },
  },
  free: {
    plan: "free" as const,
    features: {
      maxBundles: 2,
      maxVideosPerBundle: 10,
      maxFolders: 1,
      platformFeePercentage: 20,
      isActive: false,
    },
  },
}

const PRICE_ID_TO_PLAN: Record<string, keyof typeof PLAN_CONFIGS> = {
  // Hardcoded Starter price (for backwards compatibility)
  price_1SKKFPDheyb0pkWFBT6lf7V7: "starter",

  // Environment variable price IDs
  [process.env.STARTER_PLAN_FIRST || ""]: "starter",
  [process.env.STARTER_PLAN_REGULAR || ""]: "starter",
  [process.env.CREATOR_PRO_FIRST || ""]: "creator_pro",
  [process.env.CREATOR_PRO_REGULAR || ""]: "creator_pro",

  // Faceless Pro
  [process.env.FACELESS_PRO_FIRST || ""]: "faceless_pro",
  [process.env.FACELESS_PRO_REGULAR || ""]: "faceless_pro",
  ["price_1SQ8yADheyb0pkWFK5LCP3Nd"]: "faceless_pro",

  // Facelessprenuer
  [process.env.FACELESSPRENUER_FIRST || ""]: "facelessprenuer",
  [process.env.FACELESSPRENUER_REGULAR || ""]: "facelessprenuer",
}

// --- Helper Functions ---

async function findUserByCustomerId(customerId: string): Promise<string | null> {
  if (!db) throw new Error("Firestore not initialized")
  const memberships = db.collection("memberships")
  const snapshot = await memberships.where("stripeCustomerId", "==", customerId).limit(1).get()
  if (snapshot.empty) {
    console.log(`Could not find user with Stripe Customer ID: ${customerId}`)
    return null
  }
  return snapshot.docs[0].id
}

async function setMembership(uid: string, data: any) {
  if (!db) throw new Error("Firestore not initialized")
  const docRef = db.collection("memberships").doc(uid)

  console.log(`[v0] 💾 ========== WRITING TO FIRESTORE ==========`)
  console.log(`[v0] 💾 User ID: ${uid}`)
  console.log(`[v0] 💾 Plan: ${data.plan}`)
  console.log(`[v0] 💾 Status: ${data.status}`)
  console.log(`[v0] 💾 IsActive: ${data.isActive}`)
  console.log(`[v0] 💾 Price ID: ${data.priceId}`)
  console.log(`[v0] 💾 Features:`, JSON.stringify(data.features, null, 2))
  console.log(`[v0] 💾 Full Document:`, JSON.stringify(data, null, 2))
  console.log(`[v0] 💾 ==========================================`)

  // ALWAYS use .set() without merge to do complete replacement
  await docRef.set({
    ...data,
    updatedAt: FieldValue.serverTimestamp(),
  })

  console.log(`[v0] ✅ Membership document written successfully`)
}

function getPlanConfig(priceId: string) {
  console.log(`[v0] 🔍 Looking up price ID: ${priceId}`)
  console.log(`[v0] 📋 Available price IDs:`, Object.keys(PRICE_ID_TO_PLAN))

  const planKey = PRICE_ID_TO_PLAN[priceId]

  if (!planKey) {
    console.error(`[v0] ❌ UNKNOWN PRICE ID: ${priceId}`)
    throw new Error(`Unknown Stripe price ID: ${priceId}. Cannot determine plan.`)
  }

  const config = PLAN_CONFIGS[planKey]
  console.log(`[v0] ✅ Price ID ${priceId} → ${planKey}`)
  console.log(`[v0]    - maxBundles: ${config.features.maxBundles}`)
  console.log(`[v0]    - platformFeePercentage: ${config.features.platformFeePercentage}%`)

  return config
}

// --- Exported Processing Functions ---

export async function processCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.buyerUid
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id

  if (!userId) {
    throw new Error(`Missing buyerUid in checkout session metadata. Session ID: ${session.id}`)
  }
  if (!customerId) {
    throw new Error(`Missing customerId in checkout session. Session ID: ${session.id}`)
  }

  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id

  if (!subscriptionId) {
    throw new Error(`Missing subscriptionId in checkout session. Session ID: ${session.id}`)
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const priceId = session.metadata?.priceId || subscription.items.data[0]?.price.id

  if (!priceId) {
    throw new Error(`Missing price ID in session metadata and subscription ${subscriptionId}`)
  }

  console.log(`[v0] 📋 Processing checkout for user ${userId}`)
  console.log(`[v0] 💳 Subscription ID: ${subscriptionId}`)
  console.log(`[v0] 💰 Price ID: ${priceId}`)
  console.log(`[v0] 📦 Price ID source: ${session.metadata?.priceId ? "session.metadata" : "subscription.items"}`)

  const planConfig = getPlanConfig(priceId)
  const isActive = subscription.status === "active" || subscription.status === "trialing"

  const membershipData = {
    uid: userId,
    plan: planConfig.plan,
    status: subscription.status,
    isActive,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    priceId: priceId,
    downloadsUsed: 0,
    bundlesCreated: 0,
    features: {
      ...planConfig.features,
      isActive, // Override with actual subscription status
    },
    createdAt: FieldValue.serverTimestamp(),
  }

  await setMembership(userId, membershipData)

  if (planConfig.plan === "facelessprenuer") {
    try {
      console.log(`[v0] 🎯 ATTEMPTING TO SET FACELESSPRENUER FLAG FOR USER: ${userId}`)
      console.log(`[v0] 🎯 Writing to users collection...`)

      await db.collection("users").doc(userId).set({ hasEverPurchasedFacelessprenuer: true }, { merge: true })

      console.log(`[v0] ✅ SUCCESS! Marked user ${userId} as having purchased Facelessprenuer`)

      // Verify the write
      const userDoc = await db.collection("users").doc(userId).get()
      const userData = userDoc.data()
      console.log(
        `[v0] 🔍 Verification: hasEverPurchasedFacelessprenuer = ${userData?.hasEverPurchasedFacelessprenuer}`,
      )
    } catch (error) {
      console.error("[v0] ❌ CRITICAL ERROR: Failed to set hasEverPurchasedFacelessprenuer flag:", error)
    }
  }

  console.log(`[v0] ✅ Successfully set membership for ${userId} to ${planConfig.plan}`)
}

export async function processSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
  const userId = await findUserByCustomerId(customerId)

  if (!userId) {
    throw new Error(`Webhook Error: User not found for customer ID: ${customerId}`)
  }

  const priceId = subscription.items.data[0]?.price.id

  if (!priceId) {
    throw new Error(`Missing price ID in subscription ${subscription.id}`)
  }

  console.log(`[v0] 🔄 Updating subscription for user ${userId}`)
  console.log(`[v0] 💰 Price ID: ${priceId}`)
  console.log(`[v0] 📊 Status: ${subscription.status}`)
  console.log(`[v0] 🔄 Cancel at period end: ${subscription.cancel_at_period_end}`)

  const now = Date.now() / 1000
  const hasAccessUntilPeriodEnd = subscription.current_period_end > now
  const isCanceledButActive = subscription.cancel_at_period_end && hasAccessUntilPeriodEnd

  if (subscription.status === "canceled" || (subscription.cancel_at_period_end && !hasAccessUntilPeriodEnd)) {
    console.log(`[v0] 🗑️ Subscription ended or canceled for user ${userId}, marking as inactive`)

    const membershipDoc = await db.collection("memberships").doc(userId).get()
    const previousPlan = membershipDoc.exists ? membershipDoc.data()?.plan : null

    // Preserve the membership document with priceId history, just mark as inactive
    await db.collection("memberships").doc(userId).update({
      status: "canceled",
      isActive: false,
      canceledAt: new Date(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Move to free tier
    await db.collection("freeUsers").doc(userId).set(
      {
        uid: userId,
        plan: "free",
        downloadsUsed: 0,
        bundlesCreated: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    if (previousPlan === "facelessprenuer") {
      try {
        const tabsDoc = await db.collection("storefrontTabs").doc(userId).get()
        if (tabsDoc.exists) {
          const tabsData = tabsDoc.data()
          const tabs = tabsData?.tabs || []

          // Disable all custom tabs
          const updatedTabs = tabs.map((tab: any) => {
            if (tab.type === "custom" && tab.enabled) {
              console.log(`[v0] Auto-disabling custom tab: ${tab.name} for user ${userId}`)
              return { ...tab, enabled: false }
            }
            return tab
          })

          await db.collection("storefrontTabs").doc(userId).update({
            tabs: updatedTabs,
            lastUpdated: new Date(),
          })

          console.log(`[v0] ✅ Auto-disabled custom tabs for user ${userId} after Facelessprenuer cancellation`)
        }
      } catch (error) {
        console.error("[v0] Failed to auto-disable custom tabs:", error)
      }
    }

    console.log(`[v0] ✅ User ${userId} moved to free tier, membership preserved`)
    return
  }

  const planConfig = getPlanConfig(priceId)

  const isActive = subscription.status === "active" || subscription.status === "trialing" || isCanceledButActive

  console.log(`[v0] 📅 Current period end: ${new Date(subscription.current_period_end * 1000).toISOString()}`)
  console.log(`[v0] ✅ Has access until period end: ${hasAccessUntilPeriodEnd}`)
  console.log(`[v0] 🔄 Is canceled but active: ${isCanceledButActive}`)
  console.log(`[v0] 🎯 Final isActive: ${isActive}`)

  const membershipData = {
    uid: userId,
    plan: planConfig.plan,
    status: subscription.status,
    isActive,
    canceledAt: subscription.cancel_at_period_end ? new Date() : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    priceId: priceId,
    downloadsUsed: 0,
    bundlesCreated: 0,
    features: {
      ...planConfig.features,
      isActive,
    },
  }

  await setMembership(userId, membershipData)

  if (planConfig.plan === "facelessprenuer") {
    try {
      console.log(`[v0] 🎯 ATTEMPTING TO SET FACELESSPRENUER FLAG FOR USER: ${userId}`)
      console.log(`[v0] 🎯 Writing to users collection...`)

      await db.collection("users").doc(userId).set({ hasEverPurchasedFacelessprenuer: true }, { merge: true })

      console.log(`[v0] ✅ SUCCESS! Marked user ${userId} as having purchased Facelessprenuer`)

      // Verify the write
      const userDoc = await db.collection("users").doc(userId).get()
      const userData = userDoc.data()
      console.log(
        `[v0] 🔍 Verification: hasEverPurchasedFacelessprenuer = ${userData?.hasEverPurchasedFacelessprenuer}`,
      )
    } catch (error) {
      console.error("[v0] ❌ CRITICAL ERROR: Failed to set hasEverPurchasedFacelessprenuer flag:", error)
    }
  }

  console.log(`[v0] ✅ Successfully updated membership for ${userId} to ${planConfig.plan}`)
}

export async function processSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id
  const userId = await findUserByCustomerId(customerId)

  if (!userId) {
    console.log(
      `Webhook Info: Received subscription deleted event for a user not found in DB. Customer ID: ${customerId}`,
    )
    return
  }

  console.log(`[v0] 🗑️ Subscription deleted for user ${userId}, marking as inactive`)

  const membershipDoc = await db.collection("memberships").doc(userId).get()
  const previousPlan = membershipDoc.exists ? membershipDoc.data()?.plan : null

  await db.collection("memberships").doc(userId).update({
    status: "canceled",
    isActive: false,
    canceledAt: new Date(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Move to free tier
  await db.collection("freeUsers").doc(userId).set(
    {
      uid: userId,
      plan: "free",
      downloadsUsed: 0,
      bundlesCreated: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  if (previousPlan === "facelessprenuer") {
    try {
      const tabsDoc = await db.collection("storefrontTabs").doc(userId).get()
      if (tabsDoc.exists) {
        const tabsData = tabsDoc.data()
        const tabs = tabsData?.tabs || []

        // Disable all custom tabs
        const updatedTabs = tabs.map((tab: any) => {
          if (tab.type === "custom" && tab.enabled) {
            console.log(`[v0] Auto-disabling custom tab: ${tab.name} for user ${userId}`)
            return { ...tab, enabled: false }
          }
          return tab
        })

        await db.collection("storefrontTabs").doc(userId).update({
          tabs: updatedTabs,
          lastUpdated: new Date(),
        })

        console.log(`[v0] ✅ Auto-disabled custom tabs for user ${userId} after Facelessprenuer cancellation`)
      }
    } catch (error) {
      console.error("[v0] Failed to auto-disable custom tabs:", error)
    }
  }

  console.log(`[v0] ✅ User ${userId} moved to free tier, membership preserved`)
}

export async function processPaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { buyerUid, productType, productId, creatorId } = paymentIntent.metadata

  if (!buyerUid || !productType || !productId || !creatorId) {
    console.error("Webhook Error: Missing required metadata in paymentIntent.succeeded event.", {
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata,
    })
    throw new Error("Missing required metadata in paymentIntent.succeeded event.")
  }

  const purchaseRef = db.collection("purchases").doc(paymentIntent.id)
  const purchaseDoc = await purchaseRef.get()

  if (purchaseDoc.exists) {
    console.log(`Webhook Info: Purchase with paymentIntentId ${paymentIntent.id} already processed.`)
    return
  }

  const purchaseData = {
    userId: buyerUid,
    creatorId,
    productType,
    productId,
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: "completed",
    purchaseDate: new Date(paymentIntent.created * 1000),
    stripeCustomerId: typeof paymentIntent.customer === "string" ? paymentIntent.customer : paymentIntent.customer?.id,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  }

  await purchaseRef.set(purchaseData)
  console.log(`Successfully created purchase record for paymentIntentId: ${paymentIntent.id}`)
}

export async function processContentPackPurchase(session: Stripe.Checkout.Session) {
  console.log(`📦 [Content Pack Webhook] Processing content pack purchase: ${session.id}`)

  const metadata = session.metadata || {}
  const { buyerUid, buyerEmail, buyerName } = metadata

  let finalBuyerUid = buyerUid
  let finalBuyerEmail = buyerEmail
  let finalBuyerName = buyerName

  if (!buyerUid || buyerUid === "anonymous") {
    console.log(`📦 [Content Pack Webhook] Guest checkout detected, extracting customer info from session`)

    const customerId = typeof session.customer === "string" ? session.customer : null

    if (customerId) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
      try {
        const customer = await stripe.customers.retrieve(customerId)
        if (!("deleted" in customer)) {
          finalBuyerEmail = customer.email || session.customer_details?.email || buyerEmail
          finalBuyerName = customer.name || session.customer_details?.name || buyerName || "Guest User"
          finalBuyerUid = `guest_${customerId}`
          console.log(`📦 [Content Pack Webhook] Guest user info: ${finalBuyerEmail}, ${finalBuyerName}`)
        }
      } catch (error) {
        console.error(`📦 [Content Pack Webhook] Failed to retrieve customer:`, error)
      }
    }

    if (!finalBuyerEmail) {
      finalBuyerEmail = session.customer_details?.email || "unknown@guest.com"
      finalBuyerName = session.customer_details?.name || "Guest User"
      finalBuyerUid = `guest_${session.id}`
    }

    console.log(`📦 [Content Pack Webhook] Final guest info - UID: ${finalBuyerUid}, Email: ${finalBuyerEmail}`)
  }

  const amount = session.amount_total ? session.amount_total / 100 : 0

  const purchaseData = {
    id: session.id,
    contentType: "content_pack",
    productName: metadata.productName || "150+ High Quality Motivational Clips",

    // Buyer info
    buyerUid: finalBuyerUid,
    userId: finalBuyerUid,
    buyerEmail: finalBuyerEmail,
    buyerName: finalBuyerName,
    buyerDisplayName: finalBuyerName,
    isAuthenticated: buyerUid !== "anonymous" && !finalBuyerUid.startsWith("guest_"),

    // Payment details
    price: amount,
    amount: amount,
    purchaseAmount: amount * 100,
    currency: session.currency || "usd",
    status: "completed",

    // Stripe details
    sessionId: session.id,
    paymentIntentId: session.payment_intent,
    stripeCustomerId: session.customer,

    // Access details
    googleDriveLink: "https://drive.google.com/drive/folders/1Wj8nRzOzVcxd377N0_qYSdJDI6LsX72h?usp=sharing",
    accessToken: `content_pack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

    // Timestamps
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    purchasedAt: new Date().toISOString(),
    timestamp: new Date(),

    // Metadata
    source: "stripe_webhook",
    webhookProcessed: true,
  }

  await db.collection("contentPackPurchases").doc(session.id).set(purchaseData)

  console.log(
    `✅ [Content Pack Webhook] Content pack purchase created: ${session.id} for user ${finalBuyerUid} at $${amount}`,
  )
}
