"use client"

import { useState } from "react"
import { CheckCircle, RotateCcw, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"

function generateSessionId() {
  // Stripe test IDs look like:  cs_test_a1B2c3D4e5F6g7H8i9J0kL
  const random = Array.from({ length: 24 }, () => Math.random().toString(36).slice(2, 3)).join("")
  return `cs_test_${random}`
}

export default function StripePurchaseDebugClient() {
  const [sessionId, setSessionId] = useState(generateSessionId)
  const [productBoxId, setProductBoxId] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function runMock() {
    setLoading(true)
    setResult(null)
    try {
      // Hit the existing mock-session API to create a fake session object
      const mockResp = await fetch("/api/test/mock-stripe-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          product_box_id: productBoxId || undefined,
        }),
      }).then((r) => r.json())

      // Then call the verification endpoint you already have
      const verifyResp = await fetch(
        `/api/purchase/verify-and-complete?session_id=${encodeURIComponent(sessionId)}`,
      ).then((r) => r.json())

      setResult({ mockResp, verifyResp })
    } catch (err) {
      setResult({ error: (err as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-6">
      {/* Banner */}
      <Alert variant="destructive" className="border-red-500 bg-red-50">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>Developer Tool – DO NOT USE IN PRODUCTION</AlertTitle>
        <AlertDescription>
          This page generates <strong>mock</strong> Stripe sessions and calls internal APIs for debugging. All
          operations happen against test data.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Simulate Checkout &amp; Verify Purchase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="sessionId" className="font-medium">
              Stripe&nbsp;session_id
            </label>
            <div className="flex gap-2">
              <Input id="sessionId" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
              <Button variant="outline" type="button" onClick={() => setSessionId(generateSessionId())}>
                <RotateCcw className="mr-1 h-4 w-4" />
                Regenerate
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="productBoxId" className="font-medium">
              product_box_id&nbsp;
              <span className="text-xs text-muted-foreground">(optional – leave blank for anonymous)</span>
            </label>
            <Input
              id="productBoxId"
              value={productBoxId}
              onChange={(e) => setProductBoxId(e.target.value)}
              placeholder="pb_123..."
            />
          </div>

          <Button onClick={runMock} disabled={loading} className="w-full">
            {loading ? "Running..." : "Run Simulation"}
          </Button>

          {result && (
            <div className="space-y-3">
              {result.error ? (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{result.error}</AlertDescription>
                </Alert>
              ) : (
                <Alert variant="success">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Simulation Complete</AlertTitle>
                  <AlertDescription>
                    See JSON output below for mock-session and verification responses.
                  </AlertDescription>
                </Alert>
              )}

              <Textarea readOnly value={JSON.stringify(result, null, 2)} className="min-h-[300px] font-mono" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
