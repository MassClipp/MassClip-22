import { NextResponse } from "next/server"

export async function GET() {
  // Check Vimeo API headers from recent requests to detect rate limiting
  // This is a simplified example - in a real implementation, you would
  // check actual Vimeo API responses and their rate limit headers

  try {
    const response = await fetch(`https://api.vimeo.com/me`, {
      headers: {
        Authorization: `Bearer ${process.env.VIMEO_ACCESS_TOKEN}`,
      },
    })

    // Check rate limit headers
    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining")
    const rateLimitLimit = response.headers.get("x-ratelimit-limit")

    // If we're close to the rate limit (less than 10% remaining)
    const isApproachingLimit =
      rateLimitRemaining &&
      rateLimitLimit &&
      Number.parseInt(rateLimitRemaining) / Number.parseInt(rateLimitLimit) < 0.1

    return NextResponse.json({
      isRateLimited: isApproachingLimit,
      rateLimitRemaining,
      rateLimitLimit,
      status: response.status,
    })
  } catch (error) {
    console.error("Error checking Vimeo rate limits:", error)
    return NextResponse.json({
      isRateLimited: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
