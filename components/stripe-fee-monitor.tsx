"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function StripeFeeMonitor() {
  const [amount, setAmount] = useState("")
  const [calculation, setCalculation] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const calculateFees = async () => {
    if (!amount) return

    setLoading(true)
    try {
      const response = await fetch("/api/test/stripe-fee-calculation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(Number.parseFloat(amount) * 100) }),
      })

      const data = await response.json()
      setCalculation(data)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Platform Fee Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="amount">Transaction Amount ($)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.50"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1.00"
          />
        </div>

        <Button onClick={calculateFees} disabled={loading || !amount} className="w-full">
          {loading ? "Calculating..." : "Calculate Fees"}
        </Button>

        {calculation?.success && (
          <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">Fee Breakdown:</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-medium">{calculation.breakdown.total}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Platform Fee (25%):</span>
                <span className="font-medium">{calculation.breakdown.platformFee}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Creator Receives (75%):</span>
                <span className="font-medium">{calculation.breakdown.creatorReceives}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
