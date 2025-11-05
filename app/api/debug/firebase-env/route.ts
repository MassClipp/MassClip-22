export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check each Firebase environment variable individually
    const firebaseVars = [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
      "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
      "NEXT_PUBLIC_FIREBASE_APP_ID",
      "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",
    ]

    const results = firebaseVars.map((varName) => {
      const value = process.env[varName]
      return {
        name: varName,
        exists: value !== undefined,
        isEmpty: value === "",
        isWhitespace: value ? value.trim() === "" : false,
        length: value ? value.length : 0,
        type: typeof value,
        preview: value ? `${value.substring(0, 15)}...` : "undefined",
        hasValue: value && value.trim() !== "",
      }
    })

    // Check for empty strings
    const emptyVars = results.filter((r) => r.isEmpty)
    const missingVars = results.filter((r) => !r.exists)
    const whitespaceVars = results.filter((r) => r.isWhitespace)
    const validVars = results.filter((r) => r.hasValue)

    const summary = {
      total: firebaseVars.length,
      valid: validVars.length,
      missing: missingVars.length,
      empty: emptyVars.length,
      whitespace: whitespaceVars.length,
      allValid: validVars.length === firebaseVars.length,
    }

    return NextResponse.json({
      success: true,
      summary,
      details: results,
      emptyVariables: emptyVars.map((v) => v.name),
      missingVariables: missingVars.map((v) => v.name),
      whitespaceVariables: whitespaceVars.map((v) => v.name),
      validVariables: validVars.map((v) => v.name),
    })
  } catch (error) {
    console.error("Error checking Firebase environment variables:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check environment variables",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
