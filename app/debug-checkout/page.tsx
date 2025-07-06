"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

export default function DebugCheckoutPage() {
  const [productBoxId, setProductBoxId] = useState("mPE51eBZbWuFqvCtwHUh")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const testCheckout = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in first",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      setResult(null)

      const idToken = await user.getIdToken()

      const response = await fetch(`/api/creator/product-boxes/${productBoxId}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          idToken,
        }),
      })

      const data = await response.json()

      setResult({
        status: response.status,
        ok: response.ok,
        data,
        url: response.url,
      })

      if (response.ok && data.checkoutUrl) {
        toast({
          title: "Success",
          description: "Checkout session created successfully!",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create checkout session",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Checkout test error:", error)
      setResult({
        error: error instanceof Error ? error.message : "Unknown error",
      })
      toast({
        title: "Error",
        description: "Failed to test checkout",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Debug Checkout Process</CardTitle>
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

          <Button onClick={testCheckout} disabled={loading || !user}>
            {loading ? "Testing..." : "Test Checkout"}
          </Button>

          {!user && <p className="text-sm text-yellow-600">Please log in to test checkout</p>}

          {result && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Test Result</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
