import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { collection, getDocs, limit, query } from "firebase/firestore"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Uploads Diagnostic] Starting diagnostic...")

    // Check if db is available
    if (!db) {
      return NextResponse.json(
        {
          error: "Database not initialized",
          dbStatus: "unavailable",
        },
        { status: 500 },
      )
    }

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      dbStatus: "connected",
      collections: {},
    }

    // Check different possible collection names
    const collectionsToCheck = ["uploads", "userUploads", "creatorUploads", "files", "productBoxes"]

    for (const collectionName of collectionsToCheck) {
      try {
        const collectionRef = collection(db, collectionName)
        const snapshot = await getDocs(query(collectionRef, limit(5)))

        diagnostics.collections[collectionName] = {
          exists: true,
          documentCount: snapshot.size,
          sampleDocument: snapshot.empty ? null : snapshot.docs[0].data(),
        }

        console.log(`✅ [Uploads Diagnostic] ${collectionName}: ${snapshot.size} documents`)
      } catch (error) {
        diagnostics.collections[collectionName] = {
          exists: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
        console.log(`❌ [Uploads Diagnostic] ${collectionName}: Error - ${error}`)
      }
    }

    return NextResponse.json(diagnostics)
  } catch (error) {
    console.error("❌ [Uploads Diagnostic] Error:", error)
    return NextResponse.json(
      {
        error: "Diagnostic failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
