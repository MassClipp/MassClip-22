import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const level = searchParams.get("level") // 'error', 'warn', 'info'
    const hours = Number.parseInt(searchParams.get("hours") || "24")

    // Calculate time filter
    const timeFilter = new Date(Date.now() - hours * 60 * 60 * 1000)

    let query = db
      .collection("webhookLogs")
      .where("createdAt", ">=", timeFilter)
      .orderBy("createdAt", "desc")
      .limit(limit)

    if (level) {
      query = query.where("level", "==", level)
    }

    const snapshot = await query.get()
    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }))

    // Get summary stats
    const errorCount = logs.filter((log) => log.level === "error").length
    const warnCount = logs.filter((log) => log.level === "warn").length
    const infoCount = logs.filter((log) => log.level === "info").length

    return NextResponse.json({
      success: true,
      logs,
      summary: {
        total: logs.length,
        errors: errorCount,
        warnings: warnCount,
        info: infoCount,
        timeRange: `${hours} hours`,
        oldestLog: logs[logs.length - 1]?.createdAt,
        newestLog: logs[0]?.createdAt,
      },
    })
  } catch (error: any) {
    console.error("❌ [Webhook Logs] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
