"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DebugComprehensivePurchase() {
  const [productBoxId, setProductBoxId] = useState("")
  const [buyerUid, setBuyerUid] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [traceResult, setTraceResult] = useState<any>(null)
  const [directPurchaseResult, setDirectPurchaseResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const tracePurchaseFlow = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/trace-purchase-flow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productBoxId,
          sessionId,
        }),
      })

      const data = await response.json()
      setTraceResult(data)
    } catch (error) {
      console.error("Error tracing purchase flow:", error)
      setTraceResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const createDirectPurchase = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/create-bundle-purchase-direct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productBoxId,
          buyerUid,
          userEmail,
          sessionId: sessionId || undefined,
        }),
      })

      const data = await response.json()
      setDirectPurchaseResult(data)
    } catch (error) {
      console.error("Error creating direct purchase:", error)
      setDirectPurchaseResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Comprehensive Purchase Debug Tool</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="productBoxId">Product Box/Bundle ID</Label>
              <Input
                id="productBoxId"
                value={productBoxId}
                onChange={(e) => setProductBoxId(e.target.value)}
                placeholder="Enter product box or bundle ID"
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

            <div>
              <Label htmlFor="sessionId">Session ID (optional)</Label>
              <Input
                id="sessionId"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="Enter session ID for tracing"
              />
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <Button onClick={tracePurchaseFlow} disabled={loading || !productBoxId} className="flex-1">
              {loading ? "Tracing..." : "Trace Purchase Flow"}
            </Button>
            <Button onClick={createDirectPurchase} disabled={loading || !productBoxId} className="flex-1">
              {loading ? "Creating..." : "Create Direct Purchase"}
            </Button>
          </div>

          <Tabs defaultValue="trace" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="trace">Flow Trace Results</TabsTrigger>
              <TabsTrigger value="direct">Direct Purchase Results</TabsTrigger>
            </TabsList>

            <TabsContent value="trace" className="mt-4">
              {traceResult && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Purchase Flow Trace:</h3>
                  {traceResult.summary && (
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                      <h4 className="font-semibold mb-2">Summary:</h4>
                      <ul className="space-y-1">
                        <li>Product Found: {traceResult.summary.productFound ? "✅ Yes" : "❌ No"}</li>
                        <li>
                          Content Items Found: {traceResult.summary.contentItemsFound}/
                          {traceResult.summary.totalContentItems}
                        </li>
                        <li>Purchase Found: {traceResult.summary.purchaseFound ? "✅ Yes" : "❌ No"}</li>
                        <li>Bundle Purchase Found: {traceResult.summary.bundlePurchaseFound ? "✅ Yes" : "❌ No"}</li>
                      </ul>
                    </div>
                  )}
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm max-h-96">
                    {JSON.stringify(traceResult, null, 2)}
                  </pre>
                </div>
              )}
            </TabsContent>

            <TabsContent value="direct" className="mt-4">
              {directPurchaseResult && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Direct Purchase Results:</h3>
                  {directPurchaseResult.success && (
                    <div className="bg-green-50 p-4 rounded-lg mb-4">
                      <h4 className="font-semibold mb-2">Success!</h4>
                      <ul className="space-y-1">
                        <li>Session ID: {directPurchaseResult.sessionId}</li>
                        <li>Content Found: {directPurchaseResult.contentFound} items</li>
                        <li>Message: {directPurchaseResult.message}</li>
                      </ul>
                    </div>
                  )}
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm max-h-96">
                    {JSON.stringify(directPurchaseResult, null, 2)}
                  </pre>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
