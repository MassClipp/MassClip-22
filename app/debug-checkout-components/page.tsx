"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugCheckoutComponents() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [testCheckoutLoading, setTestCheckoutLoading] = useState(false)

  const runComponentTests = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/checkout-components")
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Failed to run tests:", error)
      setResults({ error: "Failed to run tests" })
    } finally {
      setLoading(false)
    }
  }

  const testCheckoutSession = async () => {
    setTestCheckoutLoading(true)
    try {
      // Use a known product box ID from your system
      const response = await fetch("/api/debug/checkout-components", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productBoxId: "lkj", // Replace with actual product box ID
        }),
      })

      const data = await response.json()

      if (data.success && data.url) {
        window.open(data.url, "_blank")
      } else {
        alert(`Checkout test failed: ${data.error}`)
      }
    } catch (error) {
      console.error("Checkout test failed:", error)
      alert("Checkout test failed")
    } finally {
      setTestCheckoutLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Debug Checkout Components</h1>

      <div className="space-y-4">
        <Button onClick={runComponentTests} disabled={loading}>
          {loading ? "Running Tests..." : "Run Component Tests"}
        </Button>

        <Button onClick={testCheckoutSession} disabled={testCheckoutLoading}>
          {testCheckoutLoading ? "Testing Checkout..." : "Test Checkout Session"}
        </Button>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">{JSON.stringify(results, null, 2)}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
