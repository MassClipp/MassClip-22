"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"

export default function DebugStripeConnectPage() {
  const { user } = useAuth()
  const [amount, setAmount] = useState("50") // 50 cents = $0.50
  const [connectedAccountId, setConnectedAccountId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [userStripeAccount, setUserStripeAccount] = useState<string | null>(null)

  // Fetch user's Stripe account
  useEffect(() => {
    const fetchUserStripeAccount = async () => {
      if (!user) return

      try {
        const response = await fetch("/api/stripe/connect/status", {
          headers: {
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        })
        const data = await response.json()
        if (data.stripeAccountId) {
          setUserStripeAccount(data.stripeAccountId)
          setConnectedAccountId(data.stripeAccountId)
        }
      } catch (error) {
        console.error("Error fetching Stripe account:", error)
      }
    }

    fetchUserStripeAccount()
  }, [user])

  const testCheckout = async () => {
    if (!connectedAccountId || !amount) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/debug/stripe-checkout-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number.parseInt(amount),
          connectedAccountId,
        }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success && data.sessionUrl) {
        // Open checkout in new tab
        window.open(data.sessionUrl, "_blank")
      }
    } catch (error) {
      console.error("Error:", error)
      setResult({ error: "Failed to create test checkout" })
    } finally {
      setLoading(false)
    }
  }

  const calculateFees = () => {
    const totalAmount = Number.parseInt(amount)
    const platformFee = Math.round(totalAmount * 0.25)
    const creatorAmount = totalAmount - platformFee

    return {
      total: totalAmount,
      platformFee,
      creatorAmount,
      totalDollars: (totalAmount / 100).toFixed(2),
      platformFeeDollars: (platformFee / 100).toFixed(2),
      creatorDollars: (creatorAmount / 100).toFixed(2),
    }
  }

  const fees = calculateFees()

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Debug Stripe Connect Fees</h1>
        <p className="text-gray-600 mt-2">Test and debug the 25% platform fee implementation</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Test Checkout Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount (in cents)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50"
              />
              <p className="text-sm text-gray-500 mt-1">50 cents = $0.50</p>
            </div>

            <div>
              <Label htmlFor="account">Connected Account ID</Label>
              <Input
                id="account"
                value={connectedAccountId}
                onChange={(e) => setConnectedAccountId(e.target.value)}
                placeholder="acct_..."
              />
              {userStripeAccount && <p className="text-sm text-green-600 mt-1">✓ Your account: {userStripeAccount}</p>}
            </div>

            <Button onClick={testCheckout} disabled={loading || !connectedAccountId || !amount} className="w-full">
              {loading ? "Creating Test Checkout..." : "Test Checkout with Fees"}
            </Button>

            {result && (
              <Alert className={result.success ? "border-green-500" : "border-red-500"}>
                <AlertDescription>
                  {result.success ? (
                    <div>
                      <p className="font-semibold text-green-600">✓ Checkout Created Successfully</p>
                      <p className="text-sm mt-1">Check the new tab for checkout page</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-red-600">✗ Error</p>
                      <p className="text-sm mt-1">{result.error}</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expected Fee Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-medium">${fees.totalDollars}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Platform Fee (25%):</span>
                <span className="font-medium">${fees.platformFeeDollars}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Creator Receives (75%):</span>
                <span className="font-medium">${fees.creatorDollars}</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">What to Check in Stripe:</h3>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Payment Intent should show application fee</li>
                <li>• Transfer should be for creator amount only</li>
                <li>• Platform account gets the fee automatically</li>
                <li>• Check metadata for fee breakdown</li>
              </ul>
            </div>

            {result?.debug && (
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-2">Debug Info:</h3>
                <pre className="text-xs bg-gray-100 p-2 rounded">{JSON.stringify(result.debug, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
