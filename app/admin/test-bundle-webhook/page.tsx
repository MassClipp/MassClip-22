"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestBundleWebhookPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [email, setEmail] = useState(user?.email || "test@example.com")

  const sendBundleWebhook = async () => {
    if (!user) {
      setResult({ error: "No user logged in" })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      // Simulate the webhook payload for 3 extra bundles purchase
      const webhookPayload = {
        id: "evt_test_" + Date.now(),
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_" + Date.now(),
            payment_intent: "pi_test_" + Date.now(),
            payment_status: "paid",
            customer_email: email,
            amount_total: 799, // $7.99 for 3 bundles
            metadata: {
              buyerUid: user.uid,
              buyerEmail: email,
              bundleSlots: "3",
              bundleTier: "3_bundle",
              contentType: "bundle_slot_purchase",
              source: "test_webhook_page",
            },
          },
        },
      }

      console.log("[v0] Sending test bundle webhook:", webhookPayload)

      // Send to the bundle slot webhook handler
      const response = await fetch("/api/webhook-handler-2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "test_signature_bypass",
        },
        body: JSON.stringify(webhookPayload),
      })

      const data = await response.json()
      console.log("[v0] Webhook response:", data)

      setResult({
        success: response.ok,
        status: response.status,
        data,
        message: response.ok
          ? "✅ Successfully sent webhook! 3 extra bundle slots should be added to your account."
          : "❌ Webhook failed. Check console for details.",
      })
    } catch (error: any) {
      console.error("[v0] Error sending webhook:", error)
      setResult({
        success: false,
        error: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Test Bundle Slot Webhook</h1>
          <p className="text-white/60">
            Simulate purchasing 3 extra bundle slots without going through Stripe checkout
          </p>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">3 Extra Bundles Purchase</CardTitle>
            <CardDescription className="text-white/60">
              This will simulate the webhook for purchasing 3 extra bundle slots ($7.99)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
                placeholder="buyer@example.com"
              />
            </div>

            {user && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-sm text-cyan-400">
                  <strong>Current User:</strong> {user.email}
                </p>
                <p className="text-xs text-cyan-400/60 mt-1">UID: {user.uid}</p>
              </div>
            )}

            <Button onClick={sendBundleWebhook} disabled={loading || !user} className="w-full" size="lg">
              {loading ? "Sending Webhook..." : "Send 3 Bundle Purchase Webhook"}
            </Button>

            {!user && <p className="text-sm text-red-400">You must be logged in to test the webhook</p>}
          </CardContent>
        </Card>

        {result && (
          <Card
            className={`${result.success ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}
          >
            <CardHeader>
              <CardTitle className={result.success ? "text-green-400" : "text-red-400"}>
                {result.success ? "Success" : "Error"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`mb-4 ${result.success ? "text-green-400" : "text-red-400"}`}>{result.message}</p>
              <pre className="bg-black/50 p-4 rounded-lg overflow-auto text-xs text-white">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">What This Does</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 space-y-2 text-sm">
            <p>1. Simulates a Stripe checkout.session.completed webhook</p>
            <p>2. Sends it to /api/webhook-handler-2 (bundle slot webhook handler)</p>
            <p>3. Creates a bundleSlotPurchases record in Firestore</p>
            <p>4. Adds 3 slots to your freeUsers.bundlesLimit</p>
            <p>5. Updates userBundleSlots collection with purchase tracking</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
