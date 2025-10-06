import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"

initializeFirebaseAdmin()

/**
 * Cron job to check for expired trials and revoke Creator Pro permissions
 * Runs daily to find users whose trial has ended
 */
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security check)
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    console.log(`[Cron] Checking for expired trials at ${now.toISOString()}`)

    // Find all users with active trials that have expired
    const expiredTrialsSnapshot = await db
      .collection("freeUsers")
      .where("trialActive", "==", true)
      .where("trialEndDate", "<=", now)
      .get()

    if (expiredTrialsSnapshot.empty) {
      console.log("[Cron] No expired trials found")
      return NextResponse.json({
        success: true,
        message: "No expired trials found",
        count: 0,
      })
    }

    const batch = db.batch()
    const expiredUsers: string[] = []

    // Revoke Creator Pro permissions for expired trials
    expiredTrialsSnapshot.forEach((doc) => {
      const uid = doc.id
      expiredUsers.push(uid)

      // Update freeUsers document to revoke Creator Pro permissions
      batch.update(doc.ref, {
        trialActive: false,
        canCreateBundles: false,
        canAnalyzeTranscripts: false,
        maxFolders: 2,
        canCreateSubfolders: false,
        bundlesLimit: 2,
        videosPerBundleLimit: 10,
        updatedAt: new Date(),
      })

      // Update users document
      const userRef = db.collection("users").doc(uid)
      batch.update(userRef, {
        trialActive: false,
        plan: "free",
        updatedAt: new Date(),
      })
    })

    await batch.commit()

    console.log(`[Cron] ✅ Revoked trial permissions for ${expiredUsers.length} users:`, expiredUsers)

    return NextResponse.json({
      success: true,
      message: `Revoked trial permissions for ${expiredUsers.length} users`,
      count: expiredUsers.length,
      users: expiredUsers,
    })
  } catch (error) {
    console.error("[Cron] Error checking expired trials:", error)
    return NextResponse.json(
      {
        error: "Failed to check expired trials",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
