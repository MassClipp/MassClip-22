import { NextResponse } from "next/server"
import { initializeFirebaseAdmin, adminDb } from "@/lib/firebase-admin"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
})

initializeFirebaseAdmin()

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    console.log("[v0] Debug Faceless Pro - Starting for user:", userId)

    // 1. Get membership document from Firebase
    const membershipDocRef = adminDb.collection("memberships").doc(userId)
    const membershipDocSnap = await membershipDocRef.get()

    const membershipDoc = {
      exists: membershipDocSnap.exists,
      ...(membershipDocSnap.exists ? membershipDocSnap.data() : {}),
    }

    console.log("[v0] Membership doc:", membershipDoc)

    // 2. Get Stripe subscription if it exists
    let stripeSubscription: any = {
      exists: false,
    }

    if (membershipDoc.exists && membershipDoc.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(membershipDoc.stripeSubscriptionId as string)
        stripeSubscription = {
          exists: true,
          status: subscription.status,
          priceId: subscription.items.data[0]?.price.id,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          items: subscription.items.data.map((item) => ({
            priceId: item.price.id,
            productId: item.price.product,
            quantity: item.quantity,
          })),
        }
        console.log("[v0] Stripe subscription:", stripeSubscription)
      } catch (error) {
        console.error("[v0] Error fetching Stripe subscription:", error)
        stripeSubscription.error = error instanceof Error ? error.message : "Unknown error"
      }
    }

    // 3. Check price IDs
    const facelessProPriceIds = [
      process.env.FACELESS_PRO_FIRST,
      process.env.FACELESS_PRO_REGULAR,
      "price_1SQBMvDheyb0pkWFPGz7vke7",
    ].filter(Boolean) as string[]

    const facelessprenuerPriceIds = [process.env.FACELESSPRENUER_FIRST, process.env.FACELESSPRENUER_REGULAR].filter(
      Boolean,
    ) as string[]

    const currentPriceId = stripeSubscription.priceId || membershipDoc.priceId || null

    const priceIdChecks = {
      currentPriceId,
      facelessProPriceIds,
      facelessprenuerPriceIds,
      isFacelessPro: currentPriceId ? facelessProPriceIds.includes(currentPriceId) : false,
      isFacelessprenuer: currentPriceId ? facelessprenuerPriceIds.includes(currentPriceId) : false,
    }

    console.log("[v0] Price ID checks:", priceIdChecks)

    // 4. Get membership status API response
    const { getStripeSubscriptionStatus } = await import("@/lib/stripe-subscription-service")
    const membershipStatusAPI = await getStripeSubscriptionStatus(userId)

    console.log("[v0] Membership status API:", membershipStatusAPI)

    const foldersSnapshot = await adminDb
      .collection("folders")
      .where("userId", "==", userId)
      .where("parentId", "==", null)
      .where("isDeleted", "==", false)
      .get()

    const folderCount = foldersSnapshot.size
    console.log("[v0] Folder count:", folderCount)

    // 5. Determine permissions
    const isActive = membershipStatusAPI.isActive
    const plan = membershipStatusAPI.plan

    const isFacelessprenuer = plan === "facelessprenuer"
    const isFacelessPro = plan === "faceless_pro"
    const hasUnlimited = isFacelessprenuer

    const permissions = {
      unlimitedDownloads: isActive && hasUnlimited,
      premiumContent: isActive && hasUnlimited,
      noWatermark: isActive && hasUnlimited,
      prioritySupport: isActive && hasUnlimited,
      platformFeePercentage: isActive && hasUnlimited ? 10 : 20,
      maxVideosPerBundle: isActive && hasUnlimited ? null : 15,
      maxBundles: isActive && hasUnlimited ? null : 5,
      maxFolders: isActive && hasUnlimited ? null : 3,
    }

    console.log("[v0] Permissions:", permissions)

    // 6. Get user info
    const userDoc = await adminDb.collection("users").doc(userId).get()
    const userEmail = userDoc.exists ? userDoc.data()?.email : null

    const folderUsage = {
      currentFolderCount: folderCount,
      maxFolders: permissions.maxFolders,
      isAtLimit: permissions.maxFolders !== null && folderCount >= permissions.maxFolders,
    }

    console.log("[v0] Folder usage:", folderUsage)

    return NextResponse.json({
      userId,
      userEmail,
      membershipDoc,
      stripeSubscription,
      priceIdChecks,
      membershipStatusAPI,
      permissions,
      folderUsage,
    })
  } catch (error) {
    console.error("[v0] Error in debug-faceless-pro:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
