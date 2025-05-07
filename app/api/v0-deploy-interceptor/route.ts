import { type NextRequest, NextResponse } from "next/server"

// This endpoint will be called by a client-side script we'll inject
export async function POST(request: NextRequest) {
  try {
    const { files, projectName } = await request.json()

    // Log the deployment for debugging
    console.log(`Intercepted v0.dev deployment: ${projectName}`)
    console.log(`Files: ${Object.keys(files).join(", ")}`)

    // Here you would store the files somewhere (database, file system, etc.)
    // For now, we'll just return success

    return NextResponse.json({
      status: "success",
      message: "Deployment intercepted, changes will be added to preview branch",
    })
  } catch (error) {
    console.error("Error in v0 deploy interceptor:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 },
    )
  }
}
