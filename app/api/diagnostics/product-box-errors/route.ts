import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/server-session"
import { ProductBoxErrorAnalyzer } from "@/lib/error-diagnostics"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { errors, context } = await request.json()

    console.log("🔍 [Error Diagnostics] Analyzing errors:", {
      errorCount: errors.length,
      context,
      userId: session.uid,
    })

    const diagnostics = errors.map((error: any) => ProductBoxErrorAnalyzer.analyzeError(error, context))

    const report = ProductBoxErrorAnalyzer.generateErrorReport(diagnostics)

    // Log for debugging
    console.log("📊 [Error Diagnostics] Generated report:", report)

    return NextResponse.json({
      success: true,
      diagnostics,
      report,
      timestamp: new Date().toISOString(),
      recommendations: generateRecommendations(diagnostics),
    })
  } catch (error) {
    console.error("❌ [Error Diagnostics] Failed to analyze errors:", error)
    return NextResponse.json(
      {
        error: "Failed to analyze errors",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

function generateRecommendations(diagnostics: any[]) {
  const recommendations = []

  // Check for authentication issues
  if (diagnostics.some((d) => d.category === "authentication")) {
    recommendations.push({
      priority: "critical",
      action: "Fix Authentication",
      description: "Implement automatic session refresh and better error handling",
      estimatedTime: "2-4 hours",
    })
  }

  // Check for network issues
  if (diagnostics.some((d) => d.category === "network")) {
    recommendations.push({
      priority: "high",
      action: "Improve Network Resilience",
      description: "Add retry logic and fallback mechanisms",
      estimatedTime: "4-6 hours",
    })
  }

  // Check for validation issues
  if (diagnostics.some((d) => d.category === "validation")) {
    recommendations.push({
      priority: "medium",
      action: "Enhance Validation",
      description: "Add comprehensive client and server-side validation",
      estimatedTime: "2-3 hours",
    })
  }

  return recommendations
}
