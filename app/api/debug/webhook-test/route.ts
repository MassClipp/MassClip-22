import { type NextRequest, NextResponse } from "next/server"
import { auth, adminDb, isFirebaseAdminInitialized } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const { email, sessionId } = await request.json()

    const debug = {
      timestamp: new Date().toISOString(),
      sessionId: sessionId || "",
      email: email || "",
      firebaseInitialized: isFirebaseAdminInitialized(),
      userLookup: null as any,
      existingMembership: null as any,
      existingFreeUser: null as any,
    }

    if (!isFirebaseAdminInitialized()) {
      return NextResponse.json(
        {
          error: "Firebase Admin not initialized",
          debug,
        },
        { status: 500 },
      )
    }

    // Look up user by email
    if (email) {
      try {
        const userRecord = await auth.getUserByEmail(email)
        debug.userLookup = {
          success: true,
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
        }

        // Check if membership exists
        const membershipDoc = await adminDb.collection("memberships").doc(userRecord.uid).get()
        debug.existingMembership = {
          exists: membershipDoc.exists,
          data: membershipDoc.exists ? membershipDoc.data() : null,
        }

        // Check if free user exists
        const freeUserDoc = await adminDb.collection("freeUsers").doc(userRecord.uid).get()
        debug.existingFreeUser = {
          exists: freeUserDoc.exists,
          data: freeUserDoc.exists ? freeUserDoc.data() : null,
        }
      } catch (error) {
        debug.userLookup = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    }

    return NextResponse.json({ debug })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
