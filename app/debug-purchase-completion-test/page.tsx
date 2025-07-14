"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function DebugPurchaseCompletionTest() {
  const [productBoxId, setProductBoxId] = useState("")
  const [buyerUid, setBuyerUid] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testPurchaseCompletion = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/test-purchase-completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productBoxId,
          buyerUid,
          userEmail,
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Error testing purchase completion:", error)
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Debug Purchase Completion Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="productBoxId">Product Box ID</Label>
            <Input
              id="productBoxId"
              value={productBoxId}
              onChange={(e) => setProductBoxId(e.target.value)}
              placeholder="Enter product box ID"
            />
          </div>

          <div>
            <Label htmlFor="buyerUid">Buyer UID</Label>
            <Input
              id="buyerUid"
              value={buyerUid}
              onChange={(e) => setBuyerUid(e.target.value)}
              placeholder="Enter buyer UID"
            />
          </div>

          <div>
            <Label htmlFor="userEmail">User Email</Label>
            <Input
              id="userEmail"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Enter user email"
            />
          </div>

          <Button onClick={testPurchaseCompletion} disabled={loading} className="w-full">
            {loading ? "Testing..." : "Test Purchase Completion"}
          </Button>

          {result && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Result:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
