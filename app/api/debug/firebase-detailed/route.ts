import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    // Check all Firebase environment variables
    const firebaseEnvVars = {
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    }

    // Validate each variable
    const validation = Object.entries(firebaseEnvVars).map(([key, value]) => {
      let status = "missing"
      let details = {}

      if (value) {
        status = "present"
        details = {
          length: value.length,
          startsWithCorrectPrefix: getExpectedPrefix(key, value),
          hasSpecialChars: /[^a-zA-Z0-9\-_.]/.test(value),
          isNotEmpty: value.trim().length > 0,
        }
      }

      return {
        key,
        status,
        value: value ? `${value.substring(0, 10)}...` : "undefined",
        fullLength: value?.length || 0,
        details,
      }
    })

    // Test Firebase initialization on server side
    let serverInitTest = null
    try {
      // Try to validate the API key format
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

      serverInitTest = {
        apiKeyFormat: apiKey
          ? {
              startsWithAIzaSy: apiKey.startsWith("AIzaSy"),
              correctLength: apiKey.length >= 35 && apiKey.length <= 45,
              hasOnlyValidChars: /^[a-zA-Z0-9\-_]+$/.test(apiKey),
              actualLength: apiKey.length,
              preview: `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`,
            }
          : null,
        projectIdFormat: projectId
          ? {
              hasValidFormat: /^[a-z0-9-]+$/.test(projectId),
              length: projectId.length,
              preview: projectId,
            }
          : null,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        allRequiredPresent: validation.every((v) => v.status === "present"),
      }
    } catch (error) {
      serverInitTest = { error: error instanceof Error ? error.message : "Unknown error" }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      validation,
      serverInitTest,
      recommendations: generateRecommendations(validation, serverInitTest),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

function getExpectedPrefix(key: string, value: string): boolean {
  switch (key) {
    case "NEXT_PUBLIC_FIREBASE_API_KEY":
      return value.startsWith("AIzaSy")
    case "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN":
      return value.includes(".firebaseapp.com")
    case "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET":
      return value.includes(".appspot.com")
    case "NEXT_PUBLIC_FIREBASE_APP_ID":
      return value.includes(":") && value.includes("web:")
    case "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID":
      return value.startsWith("G-")
    default:
      return true
  }
}

function generateRecommendations(validation: any[], serverTest: any): string[] {
  const recommendations = []

  const apiKeyValidation = validation.find((v) => v.key === "NEXT_PUBLIC_FIREBASE_API_KEY")
  if (apiKeyValidation?.status === "present" && serverTest?.apiKeyFormat) {
    if (!serverTest.apiKeyFormat.startsWithAIzaSy) {
      recommendations.push('API Key should start with "AIzaSy"')
    }
    if (!serverTest.apiKeyFormat.correctLength) {
      recommendations.push(
        `API Key length (${serverTest.apiKeyFormat.actualLength}) seems incorrect (should be 35-45 chars)`,
      )
    }
    if (!serverTest.apiKeyFormat.hasOnlyValidChars) {
      recommendations.push("API Key contains invalid characters")
    }
  }

  const authDomainValidation = validation.find((v) => v.key === "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN")
  if (authDomainValidation?.status === "present" && !authDomainValidation.details.startsWithCorrectPrefix) {
    recommendations.push("Auth Domain should end with .firebaseapp.com")
  }

  if (recommendations.length === 0) {
    recommendations.push("All Firebase configuration appears to be correctly formatted")
  }

  return recommendations
}
