"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Bug, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function ProductBoxDebugForm() {
  const [formData, setFormData] = useState({
    title: "Test Product Box",
    description: "This is a test product box for debugging",
    price: "9.99",
    currency: "usd",
    type: "one_time",
  })

  const [isCreating, setIsCreating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [debugLogs, setDebugLogs] = useState<string[]>([])

  const testWithStripe = async () => {
    setIsCreating(true)
    setResult(null)
    setDebugLogs([])

    try {
      console.log("🔍 [Debug Form] Testing with Stripe integration")
      setDebugLogs((prev) => [...prev, "Starting product box creation with Stripe integration..."])

      const response = await fetch("/api/creator/product-boxes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          price: Number.parseFloat(formData.price),
          currency: formData.currency,
          type: formData.type,
        }),
      })

      const data = await response.json()
      setResult({ success: response.ok, data, status: response.status })

      if (response.ok) {
        setDebugLogs((prev) => [...prev, "✅ Product box created successfully with Stripe integration"])
      } else {
        setDebugLogs((prev) => [...prev, `❌ Failed with status ${response.status}: ${data.message || data.error}`])
      }
    } catch (error) {
      setResult({ success: false, error: error instanceof Error ? error.message : "Unknown error" })
      setDebugLogs((prev) => [...prev, `❌ Network error: ${error instanceof Error ? error.message : "Unknown error"}`])
    } finally {
      setIsCreating(false)
    }
  }

  const testWithoutStripe = async () => {
    setIsCreating(true)
    setResult(null)
    setDebugLogs([])

    try {
      console.log("🔍 [Debug Form] Testing without Stripe integration")
      setDebugLogs((prev) => [...prev, "Starting product box creation WITHOUT Stripe integration..."])

      const response = await fetch("/api/creator/product-boxes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-skip-stripe": "true", // Special header to skip Stripe
        },
        credentials: "include",
        body: JSON.stringify({
          title: formData.title + " (No Stripe)",
          description: formData.description,
          price: Number.parseFloat(formData.price),
          currency: formData.currency,
          type: formData.type,
        }),
      })

      const data = await response.json()
      setResult({ success: response.ok, data, status: response.status })

      if (response.ok) {
        setDebugLogs((prev) => [...prev, "✅ Product box created successfully WITHOUT Stripe integration"])
      } else {
        setDebugLogs((prev) => [...prev, `❌ Failed with status ${response.status}: ${data.message || data.error}`])
      }
    } catch (error) {
      setResult({ success: false, error: error instanceof Error ? error.message : "Unknown error" })
      setDebugLogs((prev) => [...prev, `❌ Network error: ${error instanceof Error ? error.message : "Unknown error"}`])
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Product Box Creation Debug
        </CardTitle>
        <CardDescription>Debug the product box creation process to identify where the issue occurs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Form */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={2}
          />
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={testWithoutStripe} disabled={isCreating} variant="outline">
            {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Test WITHOUT Stripe
          </Button>

          <Button onClick={testWithStripe} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            Test WITH Stripe
          </Button>
        </div>

        {/* Debug Logs */}
        {debugLogs.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Debug Logs</h4>
            <div className="bg-gray-50 p-3 rounded space-y-1 max-h-32 overflow-y-auto">
              {debugLogs.map((log, index) => (
                <div key={index} className="text-sm font-mono">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">Test Result</h4>
              <Badge variant={result.success ? "default" : "destructive"}>
                {result.success ? "Success" : "Failed"}
              </Badge>
              {result.status && <Badge variant="outline">Status: {result.status}</Badge>}
            </div>

            {result.success ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="space-y-2">
                    <div className="font-medium">{result.data.message}</div>
                    {result.data.productBox && (
                      <div className="text-sm">
                        <div>
                          Product Box ID: <code>{result.data.productBox.id}</code>
                        </div>
                        {result.data.stripe && (
                          <div className="space-y-1">
                            <div>
                              Stripe Product ID: <code>{result.data.stripe.productId}</code>
                            </div>
                            <div>
                              Stripe Price ID: <code>{result.data.stripe.priceId}</code>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <div className="space-y-2">
                    <div className="font-medium">
                      {result.data?.message || result.data?.error || result.error || "Unknown error"}
                    </div>
                    {result.data?.details && <div className="text-sm">{result.data.details}</div>}
                    {result.data?.code && <div className="text-xs font-mono">Error Code: {result.data.code}</div>}
                    {result.data?.debug && (
                      <div className="text-xs bg-red-100 p-2 rounded">
                        <div className="font-medium">Debug Info:</div>
                        <pre>{JSON.stringify(result.data.debug, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Raw Response */}
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Raw Response Data</summary>
              <pre className="bg-gray-100 p-2 rounded mt-2 overflow-auto">
                {JSON.stringify(result.data || result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
