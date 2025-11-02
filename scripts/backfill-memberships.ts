/**
 * Backfill the central `memberships` collection from legacy `creatorProUsers` and `freeUsers`.
 * Safe to re-run; uses set(..., { merge: true }).
 *
 * Run in v0's Scripts runner.
 */
import { db } from "@/lib/firebase-admin"
import { setCreatorPro, setFree } from "@/lib/memberships-service"

async function main() {
  console.log("🔄 Starting memberships backfill...")

  // Map creator pro users first (they take precedence)
  const proSnap = await db.collection("creatorProUsers").get()
  console.log(`👤 Found ${proSnap.size} creatorProUsers`)

  let proCount = 0
  for (const doc of proSnap.docs) {
    const data = doc.data() as any
    const uid = data.uid || doc.id
    if (!uid) continue

    const status = (data.subscriptionStatus as string) || "active"

    await setCreatorPro(uid, {
      email: data.email,
      stripeCustomerId: String(data.stripeCustomerId || ""),
      stripeSubscriptionId: String(data.subscriptionId || ""),
      currentPeriodEnd:
        data.renewalDate?.toDate?.() ??
        (typeof data.renewalDate === "number" ? new Date(data.renewalDate) : data.renewalDate) ??
        undefined,
      priceId: data.priceId,
      connectedAccountId: data.connectedAccountId,
      status: (["active", "trialing", "past_due", "canceled"] as const).includes(status as any)
        ? (status as any)
        : "active",
    })
    proCount++
    if (proCount % 50 === 0) console.log(`  • Processed ${proCount} pro users`)
  }

  // Fill in remaining users with free (only if not upgraded already)
  const freeSnap = await db.collection("freeUsers").get()
  console.log(`👥 Found ${freeSnap.size} freeUsers`)

  let freeCount = 0
  for (const doc of freeSnap.docs) {
    const data = doc.data() as any
    const uid = data.uid || doc.id
    if (!uid) continue

    // If they exist in creatorProUsers as active, they are already handled
    // We still setFree with merge (no harm), but their active plan remains pro.
    await setFree(uid, {
      email: data.email,
      overrides: {
        platformFeePercentage: typeof data.platformFeePercentage === "number" ? data.platformFeePercentage : 20,
        maxVideosPerBundle: typeof data.maxVideosPerBundle === "number" ? data.maxVideosPerBundle : 10,
        maxBundles: typeof data.bundlesLimit === "number" ? data.bundlesLimit : 2,
      },
    })

    freeCount++
    if (freeCount % 100 === 0) console.log(`  • Processed ${freeCount} free users`)
  }

  console.log("✅ Memberships backfill complete")
}

main().catch((err) => {
  console.error("❌ Backfill failed:", err)
})
