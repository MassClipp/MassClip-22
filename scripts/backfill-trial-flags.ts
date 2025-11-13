import Stripe from "stripe"
import { adminDb } from "@/lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

const FACELESSPRENUER_FIRST_PRICE_ID = "price_1SPRLKDheyb0pkWFnRvP15AO"
const FACELESSPRENUER_REGULAR_PRICE_ID = "price_1SPShFDheyb0pkWF6K9XzlpE"

async function backfillTrialFlags() {
  console.log("[v0] Starting backfill of hasEverPurchasedFacelessprenuer flags...")

  const usersSnapshot = await adminDb.collection("users").get()
  let processedCount = 0
  let flagsSetCount = 0

  for (const userDoc of usersSnapshot.docs) {
    const userId = userDoc.id
    const userData = userDoc.data()
    const stripeCustomerId = userData.stripeCustomerId
    const email = userData.email

    processedCount++

    if (processedCount % 10 === 0) {
      console.log(`[v0] Processed ${processedCount}/${usersSnapshot.docs.length} users...`)
    }

    let customerId = stripeCustomerId

    if (!customerId && email) {
      try {
        const customers = await stripe.customers.list({ email, limit: 1 })
        if (customers.data.length > 0) {
          customerId = customers.data[0].id
          await adminDb.collection("users").doc(userId).update({ stripeCustomerId: customerId })
          console.log(`[v0] Found and saved customer ID for user ${userId.substring(0, 8)}...`)
        }
      } catch (error) {
        console.error(`[v0] Error searching Stripe for user ${userId.substring(0, 8)}:`, error)
      }
    }

    if (!customerId) {
      continue
    }

    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 100,
      })

      const hasEverHadFacelessprenuer = subscriptions.data.some((sub) =>
        sub.items.data.some(
          (item) =>
            item.price.id === FACELESSPRENUER_FIRST_PRICE_ID || item.price.id === FACELESSPRENUER_REGULAR_PRICE_ID,
        ),
      )

      if (hasEverHadFacelessprenuer) {
        await adminDb.collection("users").doc(userId).update({
          hasEverPurchasedFacelessprenuer: true,
        })
        flagsSetCount++
        console.log(`[v0] ✅ Set flag for user ${userId.substring(0, 8)}... (total: ${flagsSetCount})`)
      }
    } catch (error) {
      console.error(`[v0] Error checking subscriptions for user ${userId.substring(0, 8)}:`, error)
    }
  }

  console.log(`[v0] ========================================`)
  console.log(`[v0] Backfill complete!`)
  console.log(`[v0] Total users processed: ${processedCount}`)
  console.log(`[v0] Flags set: ${flagsSetCount}`)
  console.log(`[v0] ========================================`)
}

backfillTrialFlags()
  .then(() => {
    console.log("[v0] Script finished successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[v0] Script failed:", error)
    process.exit(1)
  })
