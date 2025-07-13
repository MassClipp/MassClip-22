import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { initializeApp, getApps, cert } from "firebase-admin/app"

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
  }

  initializeApp({
    credential: cert(serviceAccount as any),
  })
}

const db = getFirestore()
const auth = getAuth()

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [Firebase Admin Debug] Starting connection diagnostics`)

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: {
        projectId: process.env.FIREBASE_PROJECT_ID || "NOT_SET",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "NOT_SET",
        hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
      },
      tests: {},
      errors: [],
    }

    // Test 1: Basic Firebase Admin initialization
    try {
      const apps = getApps()
      diagnostics.tests.adminInit = {
        success: apps.length > 0,
        appCount: apps.length,
        appName: apps[0]?.name || "none",
      }
      console.log(`✅ [Firebase Admin Debug] Admin SDK initialized with ${apps.length} apps`)
    } catch (error) {
      diagnostics.tests.adminInit = { success: false, error: String(error) }
      diagnostics.errors.push(`adminInit: ${error}`)
      console.error(`❌ [Firebase Admin Debug] Admin init error:`, error)
    }

    // Test 2: Firestore connection
    try {
      console.log(`🔍 [Firebase Admin Debug] Testing Firestore connection`)
      const testDoc = await db.collection("test").doc("connection-test").get()
      diagnostics.tests.firestoreConnection = {
        success: true,
        canRead: true,
        testDocExists: testDoc.exists,
      }
      console.log(`✅ [Firebase Admin Debug] Firestore connection successful`)
    } catch (error) {
      diagnostics.tests.firestoreConnection = { success: false, error: String(error) }
      diagnostics.errors.push(`firestoreConnection: ${error}`)
      console.error(`❌ [Firebase Admin Debug] Firestore connection error:`, error)
    }

    // Test 3: Uploads collection access
    try {
      console.log(`🔍 [Firebase Admin Debug] Testing uploads collection access`)
      const uploadsSnapshot = await db.collection("uploads").limit(1).get()
      diagnostics.tests.uploadsAccess = {
        success: true,
        canRead: true,
        documentCount: uploadsSnapshot.size,
        hasDocuments: !uploadsSnapshot.empty,
      }

      if (!uploadsSnapshot.empty) {
        const firstDoc = uploadsSnapshot.docs[0]
        diagnostics.tests.uploadsAccess.sampleDocId = firstDoc.id
        diagnostics.tests.uploadsAccess.sampleDocFields = Object.keys(firstDoc.data())
      }

      console.log(`✅ [Firebase Admin Debug] Uploads collection accessible with ${uploadsSnapshot.size} documents`)
    } catch (error) {
      diagnostics.tests.uploadsAccess = { success: false, error: String(error) }
      diagnostics.errors.push(`uploadsAccess: ${error}`)
      console.error(`❌ [Firebase Admin Debug] Uploads access error:`, error)
    }

    // Test 4: Specific document lookup (the one from your screenshot)
    const testContentId = "BQcnQRmyaoADamf80LL8"
    try {
      console.log(`🔍 [Firebase Admin Debug] Testing specific document lookup: ${testContentId}`)
      const specificDoc = await db.collection("uploads").doc(testContentId).get()
      diagnostics.tests.specificDocLookup = {
        success: true,
        contentId: testContentId,
        exists: specificDoc.exists,
        data: specificDoc.exists ? specificDoc.data() : null,
      }

      if (specificDoc.exists) {
        const data = specificDoc.data()!
        diagnostics.tests.specificDocLookup.hasTitle = !!data.title
        diagnostics.tests.specificDocLookup.hasFileUrl = !!(data.fileUrl || data.publicUrl)
        diagnostics.tests.specificDocLookup.title = data.title
        diagnostics.tests.specificDocLookup.fileUrl = data.fileUrl
        diagnostics.tests.specificDocLookup.publicUrl = data.publicUrl
        console.log(`✅ [Firebase Admin Debug] Specific document found with title: ${data.title}`)
      } else {
        console.log(`❌ [Firebase Admin Debug] Specific document not found: ${testContentId}`)
      }
    } catch (error) {
      diagnostics.tests.specificDocLookup = { success: false, error: String(error) }
      diagnostics.errors.push(`specificDocLookup: ${error}`)
      console.error(`❌ [Firebase Admin Debug] Specific doc lookup error:`, error)
    }

    // Test 5: Auth connection
    try {
      console.log(`🔍 [Firebase Admin Debug] Testing Auth connection`)
      const authTest = await auth.listUsers(1)
      diagnostics.tests.authConnection = {
        success: true,
        canListUsers: true,
        userCount: authTest.users.length,
      }
      console.log(`✅ [Firebase Admin Debug] Auth connection successful`)
    } catch (error) {
      diagnostics.tests.authConnection = { success: false, error: String(error) }
      diagnostics.errors.push(`authConnection: ${error}`)
      console.error(`❌ [Firebase Admin Debug] Auth connection error:`, error)
    }

    // Test 6: Database project verification
    try {
      console.log(`🔍 [Firebase Admin Debug] Verifying database project`)
      const settings = db._settings
      diagnostics.tests.projectVerification = {
        success: true,
        projectId: settings?.projectId || "unknown",
        databaseId: settings?.databaseId || "unknown",
      }
      console.log(`✅ [Firebase Admin Debug] Connected to project: ${settings?.projectId}`)
    } catch (error) {
      diagnostics.tests.projectVerification = { success: false, error: String(error) }
      diagnostics.errors.push(`projectVerification: ${error}`)
      console.error(`❌ [Firebase Admin Debug] Project verification error:`, error)
    }

    const successCount = Object.values(diagnostics.tests).filter((test: any) => test.success).length
    const totalTests = Object.keys(diagnostics.tests).length

    console.log(`🏁 [Firebase Admin Debug] Diagnostics complete: ${successCount}/${totalTests} tests passed`)

    return NextResponse.json({
      success: successCount === totalTests,
      diagnostics,
      summary: {
        testsRun: totalTests,
        testsPassed: successCount,
        testsFailed: totalTests - successCount,
        errorCount: diagnostics.errors.length,
        overallHealth: successCount === totalTests ? "HEALTHY" : "ISSUES_DETECTED",
      },
    })
  } catch (error) {
    console.error("❌ [Firebase Admin Debug] Critical error:", error)
    return NextResponse.json(
      {
        error: "Failed to run Firebase Admin diagnostics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
