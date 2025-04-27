import { NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"
import Stripe from "stripe"

export async function POST(request: Request) {
  console.log("------------ MANUAL UPGRADE PROCESS STARTED ------------")

  // Initialize Firebase Admin
  initializeFirebaseAdmin()
  const db = getFirestore()

  try {
    // Parse request body
    const body = await request.json()
    console.log("Request body:", JSON.stringify(body))

    const { userId, sessionId } = body

    if (!userId || !sessionId) {
      console.error("Missing userId or sessionId")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`Processing manual upgrade for user ${userId} with session ${sessionId}`)

    // Verify the session exists in our database
    const sessionDoc = await db.collection("checkoutSessions").doc(sessionId).get()

    if (!sessionDoc.exists) {
      console.log("Creating new session record")
      // Create a record if it doesn't exist
      await db.collection("checkoutSessions").doc(sessionId).set({
        userId,
        sessionId,
        manuallyProcessed: true,
        processedAt: new Date(),
      })
    } else {
      console.log("Updating existing session record")
      // Update the existing record
      await db.collection("checkoutSessions").doc(sessionId).update({
        manuallyProcessed: true,
        processedAt: new Date(),
      })
    }

    // Verify the session with Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2023-10-16",
    })

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    console.log("Stripe session status:", session.status)

    if (session.status !== "complete") {
      console.error("Session is not complete")
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Get the user document
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.error("User not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update the user to Pro
    await db
      .collection("users")
      .doc(userId)
      .update({
        plan: "pro",
        planActivatedAt: new Date(),
        subscriptionStatus: "active",
        hasAccess: true,
        upgradedVia: "manual",
        stripeSessionId: sessionId,
        // If the session has a subscription ID, store it
        stripeSubscriptionId: session.subscription || null,
      })

    console.log(`User ${userId} upgraded to Pro plan`)

    // Create an audit log
    await db.collection("subscriptionLogs").add({
      userId,
      sessionId,
      action: "manual-upgrade",
      timestamp: new Date(),
      successful: true,
    })

    console.log("Audit log created")
    console.log("------------ MANUAL UPGRADE PROCESS COMPLETED ------------")

    return NextResponse.json({ success: true, message: "User upgraded to Pro plan" })
  } catch (error) {
    console.error("Error in manual upgrade:", error)

    // Create an error log
    try {
      const db = getFirestore()
      await db.collection("errorLogs").add({
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : null,
        timestamp: new Date(),
        endpoint: "manual-upgrade",
      })
      console.log("Error log created")
    } catch (logError) {
      console.error("Failed to create error log:", logError)
    }

    return NextResponse.json({ error: "Failed to upgrade user" }, { status: 500 })
  }
}
