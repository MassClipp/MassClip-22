import { type NextRequest, NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps } from "firebase-admin/app"
import { cert } from "firebase-admin/app"
import Stripe from "stripe"

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const db = getFirestore()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const fix = searchParams.get("fix") === "true"

    // Check for anonymous purchases in database
    const anonymousPurchases = await db.collection("purchases").where("buyerUid", "==", null).limit(limit).get()

    const missingBuyerUid = await db.collection("purchases").orderBy("createdAt", "desc").limit(limit).get()

    const results = {
      totalChecked: missingBuyerUid.size,
      anonymousCount: 0,
      missingBuyerUid: 0,
      anonymousPurchases: [] as any[],
      stripeSessionsChecked: 0,
      stripeAnonymousSessions: [] as any[],
      fixed: 0,
      errors: [] as any[],
    }

    // Check database purchases
    missingBuyerUid.forEach((doc) => {
      const data = doc.data()
      if (!data.buyerUid) {
        results.missingBuyerUid++
        results.anonymousPurchases.push({
          id: doc.id,
          sessionId: data.sessionId,
          creatorId: data.creatorId,
          amount: data.amount,
          createdAt: data.createdAt,
          metadata: data.metadata || {},
        })
      }
    })

    // Check recent Stripe sessions for anonymous purchases
    try {
      const sessions = await stripe.checkout.sessions.list({
        limit: 50,
        expand: ["data.payment_intent"],
      })

      results.stripeSessionsChecked = sessions.data.length

      for (const session of sessions.data) {
        if (!session.metadata?.buyerUid) {
          results.stripeAnonymousSessions.push({
            id: session.id,
            status: session.status,
            paymentStatus: session.payment_status,
            amount: session.amount_total,
            created: new Date(session.created * 1000),
            metadata: session.metadata || {},
          })
        }
      }
    } catch (stripeError) {
      results.errors.push({
        type: "stripe_api_error",
        message: stripeError instanceof Error ? stripeError.message : "Unknown Stripe error",
      })
    }

    // Fix anonymous purchases if requested
    if (fix && results.anonymousPurchases.length > 0) {
      for (const purchase of results.anonymousPurchases) {
        try {
          // Try to get buyer info from Stripe session
          if (purchase.sessionId) {
            const session = await stripe.checkout.sessions.retrieve(purchase.sessionId)

            if (session.metadata?.buyerUid) {
              // Update the purchase with buyer UID from Stripe
              await db
                .collection("purchases")
                .doc(purchase.id)
                .update({
                  buyerUid: session.metadata.buyerUid,
                  buyerEmail: session.metadata.buyerEmail || session.customer_details?.email,
                  buyerName: session.metadata.buyerName || session.customer_details?.name,
                  fixedAt: new Date(),
                  fixedBy: "anonymous_purchase_fixer",
                })
              results.fixed++
            } else {
              // Mark as unfixable
              await db.collection("purchases").doc(purchase.id).update({
                status: "anonymous_unfixable",
                flaggedAt: new Date(),
                flaggedReason: "No buyer UID in Stripe session metadata",
              })
            }
          }
        } catch (error) {
          results.errors.push({
            type: "fix_error",
            purchaseId: purchase.id,
            message: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalPurchasesChecked: results.totalChecked,
        anonymousPurchasesFound: results.missingBuyerUid,
        stripeSessionsChecked: results.stripeSessionsChecked,
        anonymousStripeSessionsFound: results.stripeAnonymousSessions.length,
        fixedPurchases: results.fixed,
        errors: results.errors.length,
      },
      details: results,
      recommendations: [
        results.missingBuyerUid > 0 && "Implement buyer UID validation in checkout process",
        results.stripeAnonymousSessions.length > 0 && "Add buyer UID validation in Stripe session creation",
        results.errors.length > 0 && "Review and fix errors in purchase processing",
        "Consider implementing purchase verification middleware",
      ].filter(Boolean),
    })
  } catch (error) {
    console.error("Error checking anonymous purchases:", error)
    return NextResponse.json({ error: "Failed to check anonymous purchases" }, { status: 500 })
  }
}
