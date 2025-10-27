"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"

export default function DebugPurchaseCompletionTest() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>("")
  const [formData, setFormData] = useState({
    productBoxId: "",
    buyerUid: "",
    sessionId: "",
  })

  const handleTest = async () => {
    try {
      setLoading(true)
      setError("")
      setResult(null)

      const response = await fetch("/api/debug/test-purchase-completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || "Test failed")
      }
    } catch (err: any) {
      setError(err.message || "Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Debug Purchase Completion Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="productBoxId">Product Box ID</Label>
              <Input
                id="productBoxId"
                value={formData.productBoxId}
                onChange={(e) => setFormData({ ...formData, productBoxId: e.target.value })}
                placeholder="Enter product box ID"
              />
            </div>
            <div>
              <Label htmlFor="buyerUid">Buyer UID</Label>
              <Input
                id="buyerUid"
                value={formData.buyerUid}
                onChange={(e) => setFormData({ ...formData, buyerUid: e.target.value })}
                placeholder="Enter buyer UID"
              />
            </div>
            <div>
              <Label htmlFor="sessionId">Session ID (optional)</Label>
              <Input
                id="sessionId"
                value={formData.sessionId}
                onChange={(e) => setFormData({ ...formData, sessionId: e.target.value })}
                placeholder="Enter Stripe session ID"
              />
            </div>
          </div>

          <Button onClick={handleTest} disabled={loading || !formData.productBoxId || !formData.buyerUid}>
            {loading ? "Testing..." : "Test Purchase Completion"}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>Test completed! API Status: {result.apiStatus}</AlertDescription>
              </Alert>

              <div>
                <Label>Test Result:</Label>
                <Textarea value={JSON.stringify(result, null, 2)} readOnly className="h-96 font-mono text-sm" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
