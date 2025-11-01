"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function CheckoutDiagnosticPage() {
  const { user } = useAuth()
  const [lastSessionId, setLastSessionId] = useState<string | null>(null)
  const [lastCheckoutTime, setLastCheckoutTime] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Get last checkout session from localStorage
    const sessionId = localStorage.getItem("lastCheckoutSessionId")
    const checkoutTime = localStorage.getItem("lastCheckoutTime")

    setLastSessionId(sessionId)
    setLastCheckoutTime(checkoutTime)
  }, [])

  const handleTestCheckout = async () => {
    if (!user) return

    setIsLoading(true)

    try {
      console.log("🧪 TEST: Creating diagnostic checkout session")
      console.log(`🧪 TEST: User ID: ${user.uid}`)
      console.log(`🧪 TEST: User Email: ${user.email}`)

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store",
        },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          timestamp: new Date().toISOString(),
          clientId: "diagnostic-test-" + Math.random().toString(36).substring(2, 15),
          isDiagnostic: true,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      const data = await response.json()

      if (data.sessionId) {
        setLastSessionId(data.sessionId)
        const now = new Date().toISOString()
        setLastCheckoutTime(now)
        localStorage.setItem("lastCheckoutSessionId", data.sessionId)
        localStorage.setItem("lastCheckoutTime", now)

        console.log(`🧪 TEST: Created session ${data.sessionId}`)
        alert(`Successfully created checkout session: ${data.sessionId}`)
      }
    } catch (error) {
      console.error("🧪 TEST ERROR:", error)
      alert(`Error creating checkout session: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout Diagnostic</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Current authenticated user details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">User ID:</span> {user?.uid || "Not logged in"}
              </div>
              <div>
                <span className="font-medium">Email:</span> {user?.email || "Not available"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last Checkout Session</CardTitle>
            <CardDescription>Details of the most recent checkout attempt</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Session ID:</span> {lastSessionId || "No recent checkout"}
              </div>
              <div>
                <span className="font-medium">Timestamp:</span> {lastCheckoutTime || "N/A"}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleTestCheckout} disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Test Session"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
