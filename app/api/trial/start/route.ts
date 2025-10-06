import { type NextRequest, NextResponse } from "next/server"
import { initializeFirebaseAdmin, db } from "@/lib/firebase/firebaseAdmin"
import { headers } from "next/headers"

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
    // Get authenticated user
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const uid = authUser.uid

    const trialEndDate = new Date()
    trialEndDate.setDate(trialEndDate.getDate() + 3)

    // Update user document with trial information
    const userRef = db.collection("users").doc(uid)
    await userRef.update({
      isNewUser: false,
      trialActive: true,
      trialStartDate: new Date(),
      trialEndDate: trialEndDate,
      plan: "creator_pro_trial",
      updatedAt: new Date(),
    })

    // Update or create freeUsers document with Creator Pro permissions during trial
    const freeUserRef = db.collection("freeUsers").doc(uid)
    const freeUserDoc = await freeUserRef.get()

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
    }

    console.log(`✅ Started 3-day trial for user ${uid}`)

    return NextResponse.json({
      success: true,
      trialEndDate: trialEndDate.toISOString(),
    })
  } catch (error) {
    console.error("Error starting trial:", error)
    return NextResponse.json({ error: "Failed to start trial" }, { status: 500 })
  }
}
