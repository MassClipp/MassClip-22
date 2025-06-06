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
          createUrl: `https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore/indexes?create_composite=Cgtwcm9kdWN0Qm94ZXMSEAoJY3JlYXRvckllEAESEQoJY3JlYXRlZEF0EAIY`,
        },
        {
          collection: "productBoxes",
          fields: [
            { field: "creatorId", order: "ASCENDING" },
            { field: "active", order: "ASCENDING" },
            { field: "createdAt", order: "DESCENDING" },
          ],
          description: "For fetching active product boxes ordered by creation date",
          createUrl: `https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore/indexes?create_composite=Cgtwcm9kdWN0Qm94ZXMSEAoJY3JlYXRvckllEAESDAoGYWN0aXZlEAESEQoJY3JlYXRlZEF0EAIY`,
        },
        {
          collection: "uploads",
          fields: [
            { field: "uid", order: "ASCENDING" },
            { field: "createdAt", order: "DESCENDING" },
          ],
          description: "For fetching user uploads ordered by creation date",
          createUrl: `https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore/indexes?create_composite=CgdlcGxvYWRzEgwKA3VpZBABEhEKCWNyZWF0ZWRBdBAC`,
        },
      ],
      instructions: {
        automatic: "Click the index creation links below to automatically create the required indexes",
        manual: "Go to Firebase Console > Firestore > Indexes and create the indexes listed above",
        cli: "Use 'firebase deploy --only firestore:indexes' with the provided firestore.indexes.json",
      },
      estimatedTime: "5-10 minutes per index",
      firebaseConsole: `https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore/indexes`,
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
