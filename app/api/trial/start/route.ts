import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { headers } from "next/headers"
import { FieldValue } from "firebase-admin/firestore"

initializeFirebaseAdmin()

async function getAuthUser(request: NextRequest) {
  try {
    const headersList = headers()
    const authorization = headersList.get("authorization")

    if (!authorization?.startsWith("Bearer ")) {
      return null
    }

    const token = authorization.split("Bearer ")[1]
    const { getAuth } = await import("firebase-admin/auth")
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("Auth error:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Trial start API called")

    // Get authenticated user
    const authUser = await getAuthUser(request)
    if (!authUser) {
      console.log("[v0] No auth user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const uid = authUser.uid
    const email = authUser.email || null
    console.log("[v0] Starting trial for user:", { uid, email })

    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 3)
    console.log("[v0] Trial end date:", trialEndDate.toISOString())

    // Create membership record
    const membershipData = {
      uid,
      email,
      plan: "creator_pro",
      status: "trialing",
      isActive: true,
      currentPeriodEnd: trialEndDate,
      downloadsUsed: 0,
      bundlesCreated: 0,
      features: {
        unlimitedDownloads: true,
        premiumContent: true,
        noWatermark: true,
        prioritySupport: true,
        platformFeePercentage: 10,
        maxVideosPerBundle: null,
        maxBundles: null,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    console.log("[v0] Creating membership record...")
    await db.collection("memberships").doc(uid).set(membershipData)
    console.log("[v0] Membership record created successfully")

    // Verify membership was created
    const membershipCheck = await db.collection("memberships").doc(uid).get()
    console.log("[v0] Membership verification:", {
      exists: membershipCheck.exists,
      data: membershipCheck.data(),
    })

    // Update user document with trial information
    console.log("[v0] Updating users collection...")
    const userRef = db.collection("users").doc(uid)
    await userRef.set(
      {
        isNewUser: false,
        trialActive: true,
        trialStartDate: new Date(),
        trialEndDate: trialEndDate,
        plan: "creator_pro_trial",
        updatedAt: new Date(),
      },
      { merge: true },
    )
    console.log("[v0] Users collection updated")

    // Verify user update
    const userCheck = await userRef.get()
    console.log("[v0] User verification:", {
      exists: userCheck.exists,
      data: userCheck.data(),
    })

    // Update or create freeUsers document with Creator Pro permissions during trial
    console.log("[v0] Updating freeUsers collection...")
    const freeUserRef = db.collection("freeUsers").doc(uid)
    const freeUserDoc = await freeUserRef.get()
    console.log("[v0] FreeUser exists:", freeUserDoc.exists)

    if (freeUserDoc.exists) {
      await freeUserRef.update({
        trialActive: true,
        trialEndDate: trialEndDate,
        canCreateBundles: true,
        canAnalyzeTranscripts: true,
        maxFolders: 999999,
        canCreateSubfolders: true,
        updatedAt: new Date(),
      })
      console.log("[v0] FreeUser updated")
    } else {
      await freeUserRef.set({
        uid: uid,
        trialActive: true,
        trialStartDate: new Date(),
        trialEndDate: trialEndDate,
        canCreateBundles: true,
        canAnalyzeTranscripts: true,
        maxFolders: 999999,
        canCreateSubfolders: true,
        bundlesLimit: 999999,
        videosPerBundleLimit: 999999,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      console.log("[v0] FreeUser created")
    }

    // Verify freeUser update
    const freeUserCheck = await freeUserRef.get()
    console.log("[v0] FreeUser verification:", {
      exists: freeUserCheck.exists,
      data: freeUserCheck.data(),
    })

    console.log(`[v0] ✅ Started 3-day trial for user ${uid}`)

    return NextResponse.json({
      success: true,
      trialEndDate: trialEndDate.toISOString(),
      debug: {
        membershipCreated: membershipCheck.exists,
        userUpdated: userCheck.exists,
        freeUserUpdated: freeUserCheck.exists,
      },
    })
  } catch (error) {
    console.error("[v0] Error starting trial:", error)
    return NextResponse.json(
      {
        error: "Failed to start trial",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
