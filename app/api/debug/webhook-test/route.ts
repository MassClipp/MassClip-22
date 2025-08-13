import { type NextRequest, NextResponse } from "next/server"
import { adminDb, initializeFirebaseAdmin, isFirebaseAdminInitialized } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  const debugTrace: string[] = []

  try {
    if (!isFirebaseAdminInitialized()) {
      initializeFirebaseAdmin()
      debugTrace.push("Firebase Admin initialized")
    } else {
      debugTrace.push("Firebase Admin already initialized")
    }

    const { sessionId, email } = await request.json()

    const result = {
      debug: {
        timestamp: new Date().toISOString(),
        sessionId: sessionId || "",
        email: email || "",
        firebaseInitialized: isFirebaseAdminInitialized(),
        userLookup: null as any,
        existingMembership: null as any,
        existingFreeUser: null as any,
      },
    }

    // Try to find user by email if provided
    if (email) {
      try {
        // Try users collection first
        const usersSnapshot = await adminDb.collection("users").where("email", "==", email).limit(1).get()
        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0]
          result.debug.userLookup = {
            success: true,
            uid: userDoc.id,
            email: userDoc.data().email,
            displayName: userDoc.data().displayName,
          }
        } else {
          // Try freeUsers collection
          const freeUsersSnapshot = await adminDb.collection("freeUsers").where("email", "==", email).limit(1).get()
          if (!freeUsersSnapshot.empty) {
            const freeUserDoc = freeUsersSnapshot.docs[0]
            result.debug.userLookup = {
              success: true,
              uid: freeUserDoc.data().uid,
              email: freeUserDoc.data().email,
              displayName: freeUserDoc.data().displayName || "N/A",
            }
          } else {
            result.debug.userLookup = {
              success: false,
              error: "User not found in users or freeUsers collections",
            }
          }
        }

        // Check for existing membership if user found
        if (result.debug.userLookup?.success) {
          const membershipDoc = await adminDb.collection("memberships").doc(result.debug.userLookup.uid).get()
          if (membershipDoc.exists) {
            result.debug.existingMembership = {
              exists: true,
              data: membershipDoc.data(),
            }
          } else {
            result.debug.existingMembership = {
              exists: false,
              data: null,
            }
          }

          // Check for existing free user record
          const freeUserDoc = await adminDb.collection("freeUsers").doc(result.debug.userLookup.uid).get()
          if (freeUserDoc.exists) {
            result.debug.existingFreeUser = {
              exists: true,
              data: freeUserDoc.data(),
            }
          } else {
            result.debug.existingFreeUser = {
              exists: false,
              data: null,
            }
          }
        }
      } catch (error: any) {
        result.debug.userLookup = {
          success: false,
          error: error.message,
        }
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    debugTrace.push(`Error: ${error.message}`)
    return NextResponse.json(
      {
        error: error.message,
        debugTrace,
      },
      { status: 500 },
    )
  }
}
