import { NextResponse } from "next/server"
import { initializeFirebaseAdmin } from "@/lib/firebase-admin"
import { getFirestore } from "firebase-admin/firestore"

export async function POST(request: Request) {
  console.log("------------ ADMIN MANUAL UPGRADE STARTED ------------")

  // Initialize Firebase Admin
  initializeFirebaseAdmin()
  const db = getFirestore()

  try {
    // Parse request body
    const body = await request.json()
    console.log("Request body:", JSON.stringify(body))

    const { userId, adminId } = body

    if (!userId) {
      console.error("Missing userId")
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 })
    }

    if (!adminId) {
      console.error("Missing adminId")
      return NextResponse.json({ error: "Missing admin ID" }, { status: 400 })
    }

    console.log(`Admin ${adminId} is upgrading user ${userId}`)

    // Verify the user exists
    const userDoc = await db.collection("users").doc(userId).get()

    if (!userDoc.exists) {
      console.error("User not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update the user to Pro
    await db.collection("users").doc(userId).update({
      plan: "pro",
      planActivatedAt: new Date(),
      subscriptionStatus: "active",
      hasAccess: true,
      upgradedVia: "admin",
      upgradedBy: adminId,
      upgradedAt: new Date(),
    })

    console.log(`User ${userId} upgraded to Pro plan by admin ${adminId}`)

    // Create an audit log
    await db.collection("adminLogs").add({
      adminId,
      userId,
      action: "manual-upgrade",
      timestamp: new Date(),
    })

    console.log("Admin log created")
    console.log("------------ ADMIN MANUAL UPGRADE COMPLETED ------------")

    return NextResponse.json({
      success: true,
      message: `User ${userId} has been upgraded to Pro plan`,
    })
  } catch (error) {
    console.error("Error in admin manual upgrade:", error)

    // Create an error log
    try {
      const db = getFirestore()
      await db.collection("errorLogs").add({
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : null,
        timestamp: new Date(),
        endpoint: "admin/manual-upgrade",
      })
      console.log("Error log created")
    } catch (logError) {
      console.error("Failed to create error log:", logError)
    }

    return NextResponse.json({ error: "Failed to upgrade user" }, { status: 500 })
  }
}
