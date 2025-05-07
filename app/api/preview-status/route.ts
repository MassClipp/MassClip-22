import { NextResponse } from "next/server"

/**
 * API endpoint to check the status of the preview environment
 * This can be used to verify that code is being deployed to the preview branch
 */
export async function GET() {
  return NextResponse.json({
    status: "online",
    environment: "preview",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    message: "This endpoint was deployed to the preview branch",
  })
}
