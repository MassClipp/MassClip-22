"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function RunMembershipsBackfillPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/admin/memberships-backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "run" }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || "Request failed")
      }
      setResult(data)
    } catch (e: any) {
      setError(e?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Run Memberships Backfill</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will populate the central memberships collection by scanning creatorProUsers and freeUsers and
            upserting memberships/&#123;uid&#125;. Safe to run multiple times.
          </p>
          <Button onClick={run} disabled={loading}>
            {loading ? "Running..." : "Run backfill now"}
          </Button>

          {error && (
            <pre className="mt-4 whitespace-pre-wrap rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</pre>
          )}
          {result && (
            <pre className="mt-4 max-h-96 overflow-auto rounded-md bg-muted p-3 text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
