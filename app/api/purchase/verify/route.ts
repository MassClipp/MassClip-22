import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    {
      error: "This endpoint has been deprecated. Purchase verification is now handled via webhooks.",
      message: "Please check your purchases in the dashboard instead.",
    },
    { status: 410 },
  )
}

export async function GET() {
  return NextResponse.json(
    {
      error: "This endpoint has been deprecated. Purchase verification is now handled via webhooks.",
      message: "Please check your purchases in the dashboard instead.",
    },
    { status: 410 },
  )
}
