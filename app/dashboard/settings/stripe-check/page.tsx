"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function StripeMetadataCheck() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [sessionId, setSessionId] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [subscriptionId, setSubscriptionId] = useState("")

  const checkMetadata = async () => {
    setLoading(true)
    try {
      let url = "/api/stripe-metadata-check"
      const params = new URLSearchParams()

      if (sessionId) params.append("session_id", sessionId)
      if (customerId) params.append("customer_id", customerId)
      if (subscriptionId) params.append("subscription_id", subscriptionId)

      const queryString = params.toString()
      if (queryString) url += `?${queryString}`

      const response = await fetch(url)
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Error checking metadata:", error)
      setResults({ error: error instanceof Error ? error.message : "Unknown error" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkMetadata()
  }, [])

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Stripe Metadata Check</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Check Specific IDs</CardTitle>
          <CardDescription>Enter IDs to check metadata for specific resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Session ID</label>
              <Input value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="cs_test_..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Customer ID</label>
              <Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="cus_..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subscription ID</label>
              <Input value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} placeholder="sub_..." />
            </div>
            <Button onClick={checkMetadata} disabled={loading}>
              {loading ? "Checking..." : "Check Metadata"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              Mode: {results.mode} | API Version: {results.apiVersion}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[500px]">
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
