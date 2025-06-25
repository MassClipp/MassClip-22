"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function DebugStripeAmounts() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("2.00")

  const testAmount = async () => {
    setLoading(true)
    try {
      const amountInCents = Math.round(Number.parseFloat(amount) * 100)

      const response = await fetch("/api/debug/stripe-minimum-amount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountInCents,
        }),
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Test failed:", error)
      setResults({ error: "Test failed" })
    } finally {
      setLoading(false)
    }
  }

  const testCommonAmounts = async () => {
    const amounts = [0.5, 1.0, 2.0, 5.0, 10.0, 385.0]
    const allResults = []

    for (const testAmount of amounts) {
      try {
        const amountInCents = Math.round(testAmount * 100)
        const response = await fetch("/api/debug/stripe-minimum-amount", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amountInCents,
          }),
        })

        const data = await response.json()
        allResults.push({
          amount: testAmount,
          ...data,
        })
      } catch (error) {
        allResults.push({
          amount: testAmount,
          error: "Test failed",
        })
      }
    }

    setResults({ multipleTests: allResults })
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Debug Stripe Amount Requirements</h1>

      <div className="space-y-4">
        <div className="flex gap-4 items-center">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount in dollars"
            className="w-32"
          />
          <Button onClick={testAmount} disabled={loading}>
            {loading ? "Testing..." : "Test Amount"}
          </Button>
        </div>

        <Button onClick={testCommonAmounts} disabled={loading}>
          Test Common Amounts (0.50, 1.00, 2.00, 5.00, 10.00, 385.00)
        </Button>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(results, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Stripe Minimum Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>USD:</strong> $0.50 minimum
            </p>
            <p>
              <strong>EUR:</strong> €0.50 minimum
            </p>
            <p>
              <strong>GBP:</strong> £0.30 minimum
            </p>
            <p className="text-amber-600">
              <strong>Note:</strong> Your $2.00 should be well above the minimum, so the issue might be elsewhere.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
