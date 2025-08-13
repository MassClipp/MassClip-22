"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function DebugWebhookUserLookupPage() {
  const [email, setEmail] = useState("johnisworthier103@gmail.com")
  const [sessionId, setSessionId] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testLookup = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/debug/webhook-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, sessionId }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Debug Webhook User Lookup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Session ID (optional)</label>
            <Input value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="cs_test_..." />
          </div>

          <Button onClick={testLookup} disabled={loading}>
            {loading ? "Testing..." : "Test User Lookup"}
          </Button>

          {result && (
            <Alert className={result.error ? "border-red-500" : "border-green-500"}>
              <AlertDescription>
                <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
