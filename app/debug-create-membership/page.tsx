"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CreateMembershipDebug() {
  const [email, setEmail] = useState("johnisworthier103@gmail.com")
  const [stripeCustomerId, setStripeCustomerId] = useState("")
  const [stripeSubscriptionId, setStripeSubscriptionId] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const createMembership = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/create-membership-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          stripeCustomerId: stripeCustomerId || undefined,
          stripeSubscriptionId: stripeSubscriptionId || undefined,
        }),
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Unknown error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Manual Membership Creation</CardTitle>
          <p className="text-sm text-gray-600">
            Create a membership for a user who upgraded but didn't get their membership created properly.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Stripe Customer ID (optional)</label>
            <Input
              value={stripeCustomerId}
              onChange={(e) => setStripeCustomerId(e.target.value)}
              placeholder="cus_..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Stripe Subscription ID (optional)</label>
            <Input
              value={stripeSubscriptionId}
              onChange={(e) => setStripeSubscriptionId(e.target.value)}
              placeholder="sub_..."
            />
          </div>

          <Button onClick={createMembership} disabled={loading}>
            {loading ? "Creating..." : "Create Membership"}
          </Button>

          {result && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Results:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
