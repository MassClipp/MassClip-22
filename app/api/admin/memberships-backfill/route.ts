import { NextResponse } from "next/server"
import { runMembershipsBackfill } from "@/lib/memberships-backfill"

/**
 * POST /api/admin/memberships-backfill
 * Body: { confirm: "run" }
 *
 * For convenience, this dev endpoint runs the backfill from the browser.
 * In production, guard with admin auth or an admin token header.
 */
export async function POST(req: Request) {
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV || "development"

  // Require explicit confirmation in body
  const body = await req.json().catch(() => ({}))
  if (!body || body.confirm !== "run") {
    return NextResponse.json({ error: "Missing confirm=run in body." }, { status: 400 })
  }

  // Light protection for production: require an admin header
  if (env === "production") {
    const adminHeader = (req.headers.get("x-admin-token") || "").trim()
    const expected = (process.env.GH_AI_DEPLOY_TOKEN || "").trim()
    if (!adminHeader || !expected || adminHeader !== expected) {
      return NextResponse.json({ error: "Unauthorized (missing/invalid x-admin-token)." }, { status: 401 })
    }
  }

  try {
    const stats = await runMembershipsBackfill()
    return NextResponse.json({ ok: true, stats })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Backfill failed" }, { status: 500 })
  }
}
