import { NextResponse } from "next/server"
import { vimeoConfig, validateVimeoConfig } from "@/lib/vimeo-config"

export async function GET() {
  try {
    // Validate the Vimeo configuration
    const validation = validateVimeoConfig()

    // Test the Vimeo API connection
    const response = await fetch("https://api.vimeo.com/me", {
      headers: {
        Authorization: vimeoConfig.authHeader,
        "Content-Type": "application/json",
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
    })

    const responseStatus = response.status
    let responseData = null
    let responseError = null

    try {
      responseData = await response.json()
    } catch (error) {
      responseError = await response.text()
    }

    // Check upload capabilities
    let uploadCapabilities = null
    let uploadError = null

    if (response.ok) {
      try {
        const uploadResponse = await fetch("https://api.vimeo.com/me/videos?fields=upload", {
          headers: {
            Authorization: vimeoConfig.authHeader,
            "Content-Type": "application/json",
            Accept: "application/vnd.vimeo.*+json;version=3.4",
          },
        })

        if (uploadResponse.ok) {
          uploadCapabilities = await uploadResponse.json()
        } else {
          uploadError = await uploadResponse.text()
        }
      } catch (error) {
        uploadError = error instanceof Error ? error.message : String(error)
      }
    }

    return NextResponse.json({
      configValidation: validation,
      apiConnection: {
        status: responseStatus,
        ok: response.ok,
        data: responseData,
        error: responseError,
      },
      uploadCapabilities: {
        data: uploadCapabilities,
        error: uploadError,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in Vimeo diagnostic:", error)
    return NextResponse.json(
      {
        error: "Failed to run Vimeo diagnostic",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
