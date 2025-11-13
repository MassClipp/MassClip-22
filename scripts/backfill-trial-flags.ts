// Backfill script to update Firebase with trial usage flags from Stripe history
// Run this once to migrate existing users to the new Firebase-based trial detection system

import Stripe from "stripe"
import { adminDb } from "../lib/firebase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

// The two Facelessprenuer price IDs
const FACELESSPRENUER_FIRST_PRICE = "price_1SPRLKDheyb0pkWFnRvP15AO" // First-time trial
const FACELESSPRENUER_REGULAR_PRICE = "price_1SPShFDheyb0pkWF6K9XzlpE" // Regular

async function backfillTrialFlags() {
  console.log("🔄 Starting trial flags backfill...")
  console.log(`Checking for subscriptions with price IDs:`)
  console.log(`  - Trial: ${FACELESSPRENUER_FIRST_PRICE}`)
  console.log(`  - Regular: ${FACELESSPRENUER_REGULAR_PRICE}`)

  try {
    // Get all subscriptions (paginated)
    let hasMore = true
    let startingAfter: string | undefined = undefined
    let totalProcessed = 0
    let totalUpdated = 0

    while (hasMore) {
      const subscriptions = await stripe.subscriptions.list({
        limit: 100,
        starting_after: startingAfter,
      })

      for (const subscription of subscriptions.data) {
        const priceId = subscription.items.data[0]?.price.id

        // Check if this is a Facelessprenuer subscription
        if (priceId === FACELESSPRENUER_FIRST_PRICE || priceId === FACELESSPRENUER_REGULAR_PRICE) {
          const customerId =
            typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id

          // Find user by Stripe customer ID
          const membershipsSnapshot = await adminDb
            .collection("memberships")
            .where("stripeCustomerId", "==", customerId)
            .limit(1)
            .get()

          if (!membershipsSnapshot.empty) {
            const userId = membershipsSnapshot.docs[0].id

            // Update freeUsers collection with trial flag
            await adminDb.collection("freeUsers").doc(userId).set(
              {
                hasUsedFacelessprenuerTrial: true,
                trialBackfilledAt: new Date().toISOString(),
                trialBackfilledFromSubscription: subscription.id,
              },
              { merge: true },
            )

            console.log(`✅ Updated user ${userId} (subscription: ${subscription.id})`)
            totalUpdated++
          } else {
            console.log(`⚠️ No user found for customer ${customerId}`)
          }

          totalProcessed++
        }
      }

      hasMore = subscriptions.has_more
      if (hasMore && subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id
      }
    }

    console.log(`\n✅ Backfill complete!`)
    console.log(`   Total Facelessprenuer subscriptions processed: ${totalProcessed}`)
    console.log(`   Users updated with trial flag: ${totalUpdated}`)
  } catch (error) {
    console.error("❌ Backfill failed:", error)
    throw error
  }
}

// Run the backfill
backfillTrialFlags()
  .then(() => {
    console.log("🎉 Backfill script completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("💥 Backfill script failed:", error)
    process.exit(1)
  })
