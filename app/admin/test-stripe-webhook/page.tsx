"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

export default function TestBundlePurchaseWebhook() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const [bundleId, setBundleId] = useState("")
  const [buyerEmail, setBuyerEmail] = useState(user?.email || "")
  const [buyerName, setBuyerName] = useState(user?.displayName || "Test User")
  const [creatorId, setCreatorId] = useState("")
  const [price, setPrice] = useState("9.99")
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const simulateBundlePurchase = async () => {
    setLoading(true)
    addLog("Simulating bundle purchase checkout.session.completed event...")

    try {
      const buyerUid = user?.uid || `test_user_${Date.now()}`
      const sessionId = `cs_test_${Date.now()}`
      const customerId = `cus_test_${Date.now()}`
      const paymentIntentId = `pi_test_${Date.now()}`

      addLog(`Bundle ID: ${bundleId}`)
      addLog(`Buyer: ${buyerName} (${buyerEmail})`)
      addLog(`Price: $${price}`)

      const response = await fetch("/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: `evt_test_${Date.now()}`,
          object: "event",
          api_version: "2023-10-16",
          created: Math.floor(Date.now() / 1000),
          type: "checkout.session.completed",
          data: {
            object: {
              id: sessionId,
              object: "checkout.session",
              amount_total: Math.round(Number.parseFloat(price) * 100), // Convert to cents
              currency: "usd",
              customer: customerId,
              payment_intent: paymentIntentId,
              payment_status: "paid",
              status: "complete",
              mode: "payment", // One-time payment, not subscription
              metadata: {
                contentType: "bundle",
                bundleId: bundleId,
                productBoxId: bundleId,
                buyerUid: buyerUid,
                buyerEmail: buyerEmail,
                buyerName: buyerName,
                creatorId: creatorId || "unknown",
                buyerPlan: "free",
              },
            },
          },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        addLog("✅ Bundle purchase webhook processed successfully!")
        addLog(`Session ID: ${sessionId}`)
        addLog(`Check bundlePurchases collection for purchase record`)
        toast({
          title: "Success",
          description: "Bundle purchase webhook simulated successfully",
        })
      } else {
        const error = await response.text()
        addLog(`❌ Error: ${error}`)
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        })
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`)
      toast({
        title: "Error",
        description: String(error),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bundle Purchase Webhook Tester</h1>
        <p className="text-muted-foreground">Simulate a Stripe bundle purchase without going through actual checkout</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bundle Purchase Details</CardTitle>
            <CardDescription>Enter the bundle and buyer information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bundleId">Bundle ID *</Label>
              <Input
                id="bundleId"
                placeholder="Enter bundle document ID from Firestore"
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Find this in Firestore under the bundles collection</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (USD) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="9.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyerEmail">Buyer Email *</Label>
              <Input
                id="buyerEmail"
                type="email"
                placeholder="buyer@example.com"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyerName">Buyer Name</Label>
              <Input
                id="buyerName"
                placeholder="John Doe"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creatorId">Creator ID (optional)</Label>
              <Input
                id="creatorId"
                placeholder="Creator's Firebase UID"
                value={creatorId}
                onChange={(e) => setCreatorId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave empty if unknown - will use bundle's creator</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Simulate Purchase</CardTitle>
            <CardDescription>This will trigger the Stripe webhook handler</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={simulateBundlePurchase}
              disabled={loading || !bundleId || !buyerEmail || !price}
              className="w-full"
              size="lg"
            >
              {loading ? "Processing..." : "Simulate Bundle Purchase"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will create a purchase record in bundlePurchases collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Logs</CardTitle>
            <CardDescription>Webhook simulation logs</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={logs.join("\n")}
              readOnly
              className="font-mono text-sm h-64"
              placeholder="Logs will appear here..."
            />
            <Button onClick={() => setLogs([])} variant="outline" size="sm" className="mt-2">
              Clear Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
