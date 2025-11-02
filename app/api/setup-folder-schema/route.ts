import { type NextRequest, NextResponse } from "next/server"
import { setupFolderSchema } from "@/scripts/setup-folder-schema"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [API] Setting up folder schema...")

    const result = await setupFolderSchema()

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        sampleFolders: result.sampleFolders || null,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [API] Folder schema setup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Folder Schema Setup API",
    description: "POST to this endpoint to set up the folder organization database schema",
    requiredIndexes: [
      "folders: userId + createdAt",
      "folders: userId + parentId + createdAt",
      "folders: userId + isDeleted + createdAt",
      "uploads: uid + folderId + createdAt",
      "uploads: uid + folderPath + createdAt",
    ],
  })
}
