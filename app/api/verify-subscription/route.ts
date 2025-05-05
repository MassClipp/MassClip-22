import { NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"
import Stripe from "stripe"

export async function GET(request: Request) {
  try {
    // Get the session ID from the URL
    const url = new URL(request.url)
    const sessionId = url.searchParams.get("sessionId")
    const userId = url.searchParams.get("userId")

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId parameter" }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 })
    }

    // Initialize Firebase Admin
    initializeFirebaseAdmin()
    const db = getFirestore()

    // Check if we have a record of this session in Firestore
    const sessionDoc = await db.collection("stripeCheckoutSessions").doc(sessionId).get()

    if (sessionDoc.exists) {
      const sessionData = sessionDoc.data()

      // Verify that this session belongs to the user
      if (sessionData?.userId === userId) {
        // Check if the user has been upgraded
        const userDoc = await db.collection("users").doc(userId).get()

        if (userDoc.exists) {
          const userData = userDoc.data()

          if (userData?.plan === "creator_pro" || userData?.plan === "creator-pro") {
            return NextResponse.json({ success: true, status: "active" })
          } else {
            // User exists but hasn't been upgraded yet
            // This could happen if the webhook hasn't processed yet

            // Initialize Stripe
            if (!process.env.STRIPE_SECRET_KEY) {
              return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
            }

            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
              apiVersion: "2023-10-16",
            })

            // Check the session status directly with Stripe
            const session = await stripe.checkout.sessions.retrieve(sessionId)

            if (session.payment_status === "paid") {
              // Session is paid, but webhook hasn't processed yet
              // Let's upgrade the user manually
              await db
                .collection("users")
                .doc(userId)
                .update({
                  plan: "creator_pro", // CHANGED: Using underscore instead of hyphen
                  permissions: {
                    download: true,
                    premium: true,
                  },
                  updatedAt: new Date(),
                  paymentStatus: "active",
                })

              return NextResponse.json({ success: true, status: "activated" })
            } else {
              return NextResponse.json({ success: false, status: "pending" })
            }
          }
        } else {
          return NextResponse.json({ error: "User not found" }, { status: 404 })
        }
      } else {
        return NextResponse.json({ error: "Session does not belong to this user" }, { status: 403 })
      }
    } else {
      // Session not found in Firestore
      // This could happen if the session was created but not stored

      // Initialize Stripe
      if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2023-10-16",
      })

      try {
        // Check the session status directly with Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId)

        if (session.payment_status === "paid") {
          // Session is paid, but we don't have a record of it
          // Let's create a record and upgrade the user

          await db.collection("stripeCheckoutSessions").doc(sessionId).set({
            userId,
            sessionId,
            status: "completed",
            createdAt: new Date(),
            completedAt: new Date(),
          })

          await db
            .collection("users")
            .doc(userId)
            .update({
              plan: "creator_pro", // CHANGED: Using underscore instead of hyphen
              permissions: {
                download: true,
                premium: true,
              },
              updatedAt: new Date(),
              paymentStatus: "active",
            })

          return NextResponse.json({ success: true, status: "activated" })
        } else {
          return NextResponse.json({ success: false, status: "pending" })
        }
      } catch (error) {
        console.error("Error retrieving Stripe session:", error)
        return NextResponse.json({ error: "Failed to verify session with Stripe" }, { status: 500 })
      }
    }
  } catch (error) {
    console.error("Error verifying subscription:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
