"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, TestTube, AlertCircle } from "lucide-react"

interface TestResult {
  success: boolean
  message: string
  results?: {
    accountStatus: {
      charges_enabled: boolean
      details_submitted: boolean
      payouts_enabled: boolean
    }
    testProduct: {
      id: string
      name: string
      created: string
    }
    testPrice: {
      id: string
      unit_amount: number
      currency: string
    }
  }
  error?: string
  details?: any
}

export default function StripeIntegrationTest() {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const runTest = async () => {
    setIsRunning(true)
    setResult(null)

    try {
      const response = await fetch("/api/stripe/test-product-creation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to run test",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Stripe Integration Test
        </CardTitle>
        <CardDescription>
          Test your Stripe integration by creating a test product and price, then cleaning up the resources.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTest} disabled={isRunning} className="w-full">
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running Test...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4 mr-2" />
              Run Stripe Integration Test
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4">
            {/* Overall Result */}
            <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                {result.message}
              </AlertDescription>
            </Alert>

            {/* Success Results */}
            {result.success && result.results && (
              <div className="space-y-4">
                {/* Account Status */}
                <div className="space-y-2">
                  <h4 className="font-medium">Account Status</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Charges</span>
                      <Badge variant={result.results.accountStatus.charges_enabled ? "default" : "destructive"}>
                        {result.results.accountStatus.charges_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Details</span>
                      <Badge variant={result.results.accountStatus.details_submitted ? "default" : "destructive"}>
                        {result.results.accountStatus.details_submitted ? "Submitted" : "Missing"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Payouts</span>
                      <Badge variant={result.results.accountStatus.payouts_enabled ? "default" : "destructive"}>
                        {result.results.accountStatus.payouts_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Test Product */}
                <div className="space-y-2">
                  <h4 className="font-medium">Test Product Created</h4>
                  <div className="p-3 bg-gray-50 rounded space-y-1">
                    <div className="text-sm">
                      <strong>ID:</strong>{" "}
                      <code className="bg-gray-200 px-1 rounded">{result.results.testProduct.id}</code>
                    </div>
                    <div className="text-sm">
                      <strong>Name:</strong> {result.results.testProduct.name}
                    </div>
                    <div className="text-sm">
                      <strong>Created:</strong> {new Date(result.results.testProduct.created).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Test Price */}
                <div className="space-y-2">
                  <h4 className="font-medium">Test Price Created</h4>
                  <div className="p-3 bg-gray-50 rounded space-y-1">
                    <div className="text-sm">
                      <strong>ID:</strong>{" "}
                      <code className="bg-gray-200 px-1 rounded">{result.results.testPrice.id}</code>
                    </div>
                    <div className="text-sm">
                      <strong>Amount:</strong> ${(result.results.testPrice.unit_amount / 100).toFixed(2)}{" "}
                      {result.results.testPrice.currency.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Details */}
            {!result.success && result.details && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Error Details</h4>
                <div className="p-3 bg-red-50 rounded space-y-1">
                  {result.details.type && (
                    <div className="text-sm">
                      <strong>Type:</strong> {result.details.type}
                    </div>
                  )}
                  {result.details.code && (
                    <div className="text-sm">
                      <strong>Code:</strong> {result.details.code}
                    </div>
                  )}
                  {result.details.message && (
                    <div className="text-sm">
                      <strong>Message:</strong> {result.details.message}
                    </div>
                  )}
                  {result.details.requestId && (
                    <div className="text-sm">
                      <strong>Request ID:</strong>{" "}
                      <code className="bg-red-200 px-1 rounded">{result.details.requestId}</code>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This test creates a temporary product and price in your Stripe account, then immediately deactivates them.
            No actual charges or permanent changes are made.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
