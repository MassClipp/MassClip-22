"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

export default function TestStripeWebhookPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [priceId, setPriceId] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [subscriptionId, setSubscriptionId] = useState("")
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const simulateCheckoutComplete = async () => {
    setLoading(true)
    addLog("Simulating checkout.session.completed event...")

    try {
      const response = await fetch("/api/stripe/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "test_signature",
        },
        body: JSON.stringify({
          type: "checkout.session.completed",
          data: {
            object: {
              id: `cs_test_${Date.now()}`,
              customer: customerId || `cus_test_${Date.now()}`,
              customer_email: email,
              subscription: subscriptionId || `sub_test_${Date.now()}`,
              metadata: {
                priceId: priceId,
              },
              mode: "subscription",
              payment_status: "paid",
            },
          },
        }),
      })

      if (response.ok) {
        addLog("✅ Checkout completed successfully")
        toast({
          title: "Success",
          description: "Simulated checkout.session.completed webhook",
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

  const simulateSubscriptionCreated = async () => {
    setLoading(true)
    addLog("Simulating customer.subscription.created event...")

    try {
      const response = await fetch("/api/stripe/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "test_signature",
        },
        body: JSON.stringify({
          type: "customer.subscription.created",
          data: {
            object: {
              id: subscriptionId || `sub_test_${Date.now()}`,
              customer: customerId || `cus_test_${Date.now()}`,
              status: "active",
              items: {
                data: [
                  {
                    price: {
                      id: priceId,
                    },
                  },
                ],
              },
            },
          },
        }),
      })

      if (response.ok) {
        addLog("✅ Subscription created successfully")
        toast({
          title: "Success",
          description: "Simulated customer.subscription.created webhook",
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

  const simulateSubscriptionDeleted = async () => {
    setLoading(true)
    addLog("Simulating customer.subscription.deleted event...")

    try {
      const response = await fetch("/api/stripe/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "test_signature",
        },
        body: JSON.stringify({
          type: "customer.subscription.deleted",
          data: {
            object: {
              id: subscriptionId || `sub_test_${Date.now()}`,
              customer: customerId || `cus_test_${Date.now()}`,
              status: "canceled",
            },
          },
        }),
      })

      if (response.ok) {
        addLog("✅ Subscription deleted successfully")
        toast({
          title: "Success",
          description: "Simulated customer.subscription.deleted webhook",
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
        <h1 className="text-3xl font-bold mb-2">Stripe Webhook Tester</h1>
        <p className="text-muted-foreground">Simulate Stripe webhook events without going through actual checkout</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Data</CardTitle>
            <CardDescription>Enter test data for webhook simulation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Customer Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="test@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceId">Price ID</Label>
              <Input
                id="priceId"
                placeholder="price_xxx"
                value={priceId}
                onChange={(e) => setPriceId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerId">Customer ID (optional)</Label>
              <Input
                id="customerId"
                placeholder="cus_xxx (auto-generated if empty)"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscriptionId">Subscription ID (optional)</Label>
              <Input
                id="subscriptionId"
                placeholder="sub_xxx (auto-generated if empty)"
                value={subscriptionId}
                onChange={(e) => setSubscriptionId(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Webhook Events</CardTitle>
            <CardDescription>Simulate different Stripe webhook events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={simulateCheckoutComplete} disabled={loading || !email || !priceId} className="w-full">
              Simulate Checkout Complete
            </Button>
            <Button
              onClick={simulateSubscriptionCreated}
              disabled={loading || !priceId}
              variant="secondary"
              className="w-full"
            >
              Simulate Subscription Created
            </Button>
            <Button onClick={simulateSubscriptionDeleted} disabled={loading} variant="destructive" className="w-full">
              Simulate Subscription Deleted
            </Button>
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
