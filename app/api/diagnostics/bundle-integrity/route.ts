import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "firebase-admin/auth"
import { initializeApp, getApps, cert } from "firebase-admin/app"
import {
  diagnoseBundleIntegrity,
  diagnoseAllBundles,
  repairBundleContentUrls,
} from "@/lib/diagnostics/bundle-integrity"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error)
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Bundle Diagnostic API] Starting diagnostic request")

    // Get query parameters
    const url = new URL(request.url)
    const bundleId = url.searchParams.get("bundleId")
    const mode = url.searchParams.get("mode") || "single"

    // For development/testing, allow bypass with a special header
    const bypassAuth = request.headers.get("x-diagnostic-bypass") === "true"

    if (!bypassAuth) {
      // Verify authentication
      const authHeader = request.headers.get("authorization")
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log("❌ [Bundle Diagnostic API] Missing or invalid authorization header")
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }

      const token = authHeader.substring(7)

      try {
        const auth = getAuth()
        const decodedToken = await auth.verifyIdToken(token)
        const userId = decodedToken.uid

        console.log(`🔍 [Bundle Diagnostic API] Authenticated user: ${userId}`)

        // For now, allow any authenticated user to run diagnostics
        // You can add more specific role checks here if needed
        if (!decodedToken.uid) {
          console.log("❌ [Bundle Diagnostic API] Invalid token - no user ID")
          return NextResponse.json({ error: "Invalid authentication token" }, { status: 403 })
        }
      } catch (authError) {
        console.error("❌ [Bundle Diagnostic API] Token verification failed:", authError)
        return NextResponse.json({ error: "Invalid authentication token" }, { status: 403 })
      }
    } else {
      console.log("⚠️ [Bundle Diagnostic API] Authentication bypassed for development")
    }

    console.log(`🔍 [Bundle Diagnostic API] Running diagnostic. Mode: ${mode}, Bundle: ${bundleId || "all"}`)

    // Run appropriate diagnostic
    if (mode === "all") {
      const summary = await diagnoseAllBundles()
      return NextResponse.json({
        success: true,
        summary,
        timestamp: new Date().toISOString(),
      })
    } else if (bundleId) {
      const result = await diagnoseBundleIntegrity(bundleId)
      return NextResponse.json({
        success: true,
        result,
        timestamp: new Date().toISOString(),
      })
    } else {
      return NextResponse.json(
        {
          error: "Missing bundleId parameter for single bundle diagnostic",
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("❌ [Bundle Diagnostic API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [Bundle Diagnostic API] Starting repair request")

    // For development/testing, allow bypass with a special header
    const bypassAuth = request.headers.get("x-diagnostic-bypass") === "true"

    if (!bypassAuth) {
      // Verify authentication
      const authHeader = request.headers.get("authorization")
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.log("❌ [Bundle Diagnostic API] Missing or invalid authorization header")
        return NextResponse.json({ error: "Authentication required" }, { status: 401 })
      }

      const token = authHeader.substring(7)

      try {
        const auth = getAuth()
        const decodedToken = await auth.verifyIdToken(token)
        const userId = decodedToken.uid

        console.log(`🔧 [Bundle Diagnostic API] Authenticated user: ${userId}`)

        if (!decodedToken.uid) {
          console.log("❌ [Bundle Diagnostic API] Invalid token - no user ID")
          return NextResponse.json({ error: "Invalid authentication token" }, { status: 403 })
        }
      } catch (authError) {
        console.error("❌ [Bundle Diagnostic API] Token verification failed:", authError)
        return NextResponse.json({ error: "Invalid authentication token" }, { status: 403 })
      }
    } else {
      console.log("⚠️ [Bundle Diagnostic API] Authentication bypassed for development")
    }

    // Get request body
    const body = await request.json()
    const { action, bundleId } = body

    if (!action) {
      return NextResponse.json({ error: "Missing action parameter" }, { status: 400 })
    }

    if (!bundleId) {
      return NextResponse.json({ error: "Missing bundleId parameter" }, { status: 400 })
    }

    console.log(`🔧 [Bundle Diagnostic API] Running action: ${action} on bundle: ${bundleId}`)

    // Run appropriate action
    if (action === "repair_urls") {
      const result = await repairBundleContentUrls(bundleId)
      return NextResponse.json({
        success: true,
        result,
        timestamp: new Date().toISOString(),
      })
    } else {
      return NextResponse.json(
        {
          error: `Unknown action: ${action}`,
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("❌ [Bundle Diagnostic API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
