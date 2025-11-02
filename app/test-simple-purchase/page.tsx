"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export default function TestSimplePurchase() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const createTestPurchase = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in first",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/test/simulate-complete-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        toast({
          title: "Success!",
          description: "Test purchase created. Check your purchases page!",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create test purchase",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create test purchase",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const checkPurchases = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/user/purchases?userId=${user.uid}`)
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Error checking purchases:", error)
    }
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simple Purchase Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={createTestPurchase} disabled={loading || !user}>
              {loading ? "Creating..." : "Create Test Purchase"}
            </Button>

            <Button onClick={checkPurchases} variant="outline" disabled={!user}>
              Check My Purchases
            </Button>

            <Button onClick={() => window.open("/dashboard/purchases", "_blank")} variant="outline">
              Open Purchases Page
            </Button>
          </div>

          {!user && <p className="text-red-500">Please log in to test purchases</p>}

          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
