import { initializeFirebaseAdmin, db } from "@/lib/firebase-admin"
import { setCreatorPro, setFree, getDefaultFreeFeatures } from "@/lib/memberships-service"

initializeFirebaseAdmin()

type AnyDoc = Record<string, any>

function asDate(input: any | undefined): Date | undefined {
  if (!input) return undefined
  if (input?.toDate && typeof input.toDate === "function") return input.toDate()
  if (typeof input === "number") return new Date(input)
  if (typeof input === "string") return new Date(input)
  if (input instanceof Date) return input
  return undefined
}

async function backfillCreatorPro() {
  const snap = await db.collection("creatorProUsers").get()
  console.log(`👤 Found ${snap.size} creatorProUsers`)
  let processed = 0

  for (const doc of snap.docs) {
    const data = doc.data() as AnyDoc
    const uid = data.uid || doc.id
    if (!uid) continue

    const rawStatus = String(data.subscriptionStatus || "active").toLowerCase()
    const statusSet = new Set(["active", "trialing", "past_due", "canceled", "inactive"])
    const status = (statusSet.has(rawStatus) ? rawStatus : "active") as
      | "active"
      | "trialing"
      | "past_due"
      | "canceled"
      | "inactive"

    await setCreatorPro(uid, {
      email: data.email,
      stripeCustomerId: String(data.stripeCustomerId || ""),
      stripeSubscriptionId: String(data.subscriptionId || ""),
      currentPeriodEnd: asDate(data.renewalDate),
      priceId: data.priceId,
      connectedAccountId: data.connectedAccountId,
      status,
      // If you track usage elsewhere for pro users, copy it here:
      usage: {
        downloadsUsed: typeof data.downloadsUsed === "number" ? data.downloadsUsed : undefined,
        bundlesCreated: typeof data.bundlesCreated === "number" ? data.bundlesCreated : undefined,
      },
    })

    processed++
    if (processed % 100 === 0) {
      console.log(`  • Pro processed: ${processed}/${snap.size}`)
      // Be gentle with quotas
      await new Promise((r) => setTimeout(r, 50))
    }
  }

  console.log(`✅ Creator Pro backfill complete: ${processed} users`)
}

async function backfillFreeUsers() {
  const snap = await db.collection("freeUsers").get()
  console.log(`👥 Found ${snap.size} freeUsers`)
  let processed = 0

  for (const doc of snap.docs) {
    const data = doc.data() as AnyDoc
    const uid = data.uid || doc.id
    if (!uid) continue

    const defaults = getDefaultFreeFeatures()

    await setFree(uid, {
      email: data.email,
      overrides: {
        platformFeePercentage:
          typeof data.platformFeePercentage === "number" ? data.platformFeePercentage : defaults.platformFeePercentage,
        maxVideosPerBundle:
          typeof data.maxVideosPerBundle === "number" || data.maxVideosPerBundle === null
            ? data.maxVideosPerBundle
            : defaults.maxVideosPerBundle,
        maxBundles:
          typeof data.bundlesLimit === "number" || data.bundlesLimit === null ? data.bundlesLimit : defaults.maxBundles,
        // Booleans if you ever stored them:
        unlimitedDownloads:
          typeof data.unlimitedDownloads === "boolean" ? data.unlimitedDownloads : defaults.unlimitedDownloads,
        premiumContent: typeof data.premiumContent === "boolean" ? data.premiumContent : defaults.premiumContent,
        noWatermark: typeof data.noWatermark === "boolean" ? data.noWatermark : defaults.noWatermark,
        prioritySupport: typeof data.prioritySupport === "boolean" ? data.prioritySupport : defaults.prioritySupport,
      },
      usage: {
        downloadsUsed: typeof data.downloadsUsed === "number" ? data.downloadsUsed : undefined,
        bundlesCreated: typeof data.bundlesCreated === "number" ? data.bundlesCreated : undefined,
      },
    })

    processed++
    if (processed % 200 === 0) {
      console.log(`  • Free processed: ${processed}/${snap.size}`)
      await new Promise((r) => setTimeout(r, 50))
    }
  }

  console.log(`✅ Free backfill complete: ${processed} users`)
}

async function ensureDocsForStragglers() {
  // Optional: if you want to ensure every Auth user has a membership doc,
  // uncomment the block below. This can be heavy on large projects.
  // For now, we just log an instruction.

  console.log(
    "ℹ️ Skipping Auth user sweep. If you want to ensure membership docs for ALL Firebase Auth users, I can enable that.",
  )
}

async function main() {
  console.log("🔄 Starting memberships backfill...")
  const t0 = Date.now()

  await backfillCreatorPro()
  await backfillFreeUsers()
  await ensureDocsForStragglers()

  const ms = Date.now() - t0
  console.log(`🎉 Memberships backfill finished in ${Math.round(ms / 1000)}s`)
}

main().catch((err) => {
  console.error("❌ Backfill failed:", err)
  process.exitCode = 1
})
