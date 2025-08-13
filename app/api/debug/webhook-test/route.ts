import { type NextRequest, NextResponse } from "next/server"
import { adminDb, auth, isFirebaseAdminInitialized } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { sessionId, email } = await request.json()

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      sessionId,
      email,
      firebaseInitialized: isFirebaseAdminInitialized(),
    }

    if (email && isFirebaseAdminInitialized()) {
      try {
        const userRecord = await auth.getUserByEmail(email)
        debugInfo.userLookup = {
          success: true,
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
        }

        // Check existing membership
        const membershipDoc = await adminDb.collection("memberships").doc(userRecord.uid).get()
        debugInfo.existingMembership = {
          exists: membershipDoc.exists,
          data: membershipDoc.exists ? membershipDoc.data() : null,
        }

        // Check free user
        const freeUserDoc = await adminDb.collection("freeUsers").doc(userRecord.uid).get()
        debugInfo.existingFreeUser = {
          exists: freeUserDoc.exists,
          data: freeUserDoc.exists ? freeUserDoc.data() : null,
        }
      } catch (error) {
        debugInfo.userLookup = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    }

    return NextResponse.json({ debug: debugInfo })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
