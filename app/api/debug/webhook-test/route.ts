import { type NextRequest, NextResponse } from "next/server"
import { getAdminDb, initializeFirebaseAdmin, isFirebaseAdminInitialized } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  const debugTrace: string[] = []

  try {
    debugTrace.push("Starting webhook test...")

    if (!isFirebaseAdminInitialized()) {
      debugTrace.push("Firebase Admin not initialized, initializing now...")
      initializeFirebaseAdmin()
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
        debugTrace,
      },
    }

    // Try to find user by email if provided
    if (email) {
      try {
        const db = getAdminDb()
        debugTrace.push(`Looking up user by email: ${email}`)

        // Try users collection first
        const usersSnapshot = await db.collection("users").where("email", "==", email).limit(1).get()
        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0]
          result.debug.userLookup = {
            success: true,
            uid: userDoc.id,
            email: userDoc.data().email,
            displayName: userDoc.data().displayName,
            source: "users collection",
          }
          debugTrace.push(`Found user in users collection: ${userDoc.id}`)
        } else {
          debugTrace.push("User not found in users collection, trying freeUsers...")
          // Try freeUsers collection
          const freeUsersSnapshot = await db.collection("freeUsers").where("email", "==", email).limit(1).get()
          if (!freeUsersSnapshot.empty) {
            const freeUserDoc = freeUsersSnapshot.docs[0]
            result.debug.userLookup = {
              success: true,
              uid: freeUserDoc.data().uid,
              email: freeUserDoc.data().email,
              displayName: freeUserDoc.data().displayName || "N/A",
              source: "freeUsers collection",
            }
            debugTrace.push(`Found user in freeUsers collection: ${freeUserDoc.data().uid}`)
          } else {
            result.debug.userLookup = {
              success: false,
              error: "User not found in users or freeUsers collections",
            }
            debugTrace.push("User not found in any collection")
          }
        }

        // Check for existing membership if user found
        if (result.debug.userLookup?.success) {
          const membershipDoc = await db.collection("memberships").doc(result.debug.userLookup.uid).get()
          if (membershipDoc.exists) {
            result.debug.existingMembership = {
              exists: true,
              data: membershipDoc.data(),
            }
            debugTrace.push(`Found existing membership for user: ${result.debug.userLookup.uid}`)
          } else {
            result.debug.existingMembership = {
              exists: false,
              data: null,
            }
            debugTrace.push(`No existing membership found for user: ${result.debug.userLookup.uid}`)
          }

          // Check for existing free user record
          const freeUserDoc = await db.collection("freeUsers").doc(result.debug.userLookup.uid).get()
          if (freeUserDoc.exists) {
            result.debug.existingFreeUser = {
              exists: true,
              data: freeUserDoc.data(),
            }
            debugTrace.push(`Found existing freeUser record for user: ${result.debug.userLookup.uid}`)
          } else {
            result.debug.existingFreeUser = {
              exists: false,
              data: null,
            }
            debugTrace.push(`No existing freeUser record found for user: ${result.debug.userLookup.uid}`)
          }
        }
      } catch (error: any) {
        result.debug.userLookup = {
          success: false,
          error: error.message,
        }
        debugTrace.push(`Error during user lookup: ${error.message}`)
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    debugTrace.push(`Fatal error: ${error.message}`)
    return NextResponse.json(
      {
        error: error.message,
        debugTrace,
      },
      { status: 500 },
    )
  }
}
