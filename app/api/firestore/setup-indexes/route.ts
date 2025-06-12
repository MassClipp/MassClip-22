import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const indexInstructions = {
      message: "Firestore indexes required for optimal performance",
      status: "setup_required",
      indexes: [
        {
          collection: "productBoxes",
          fields: [
            { field: "creatorId", order: "ASCENDING" },
            { field: "createdAt", order: "DESCENDING" },
          ],
          description: "For fetching creator's product boxes ordered by creation date",
        },
        {
          collection: "productBoxes",
          fields: [
            { field: "creatorId", order: "ASCENDING" },
            { field: "active", order: "ASCENDING" },
            { field: "createdAt", order: "DESCENDING" },
          ],
          description: "For fetching active product boxes ordered by creation date",
        },
        {
          collection: "videos",
          fields: [
            { field: "uid", order: "ASCENDING" },
            { field: "type", order: "ASCENDING" },
            { field: "createdAt", order: "DESCENDING" },
          ],
          description: "For fetching user's videos by type ordered by creation date",
        },
      ],
      instructions: {
        automatic: "Deploy the app and click the index creation links in Firebase console errors",
        manual: "Go to Firebase Console > Firestore > Indexes and create the indexes listed above",
        cli: "Use 'firebase deploy --only firestore:indexes' with the provided firestore.indexes.json",
      },
      estimatedTime: "5-10 minutes per index",
      firebaseConsole: "https://console.firebase.google.com",
    }

    return NextResponse.json(indexInstructions)
  } catch (error) {
    console.error("Error providing index setup instructions:", error)
    return NextResponse.json(
      {
        error: "Failed to provide setup instructions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
