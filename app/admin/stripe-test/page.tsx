"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"

export default function StripeTestPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [testingCheckout, setTestingCheckout] = useState(false)
  const [checkoutResult, setCheckoutResult] = useState<any>(null)

  useEffect(() => {
    testStripeConnection()
  }, [])

  const testStripeConnection = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/test-stripe-connection")
      const data = await response.json()

      setResult(data)
    } catch (err: any) {
      setError(err.message || "Failed to test Stripe connection")
    } finally {
      setLoading(false)
    }
  }

  const testCheckoutSession = async () => {
    setTestingCheckout(true)
    setCheckoutResult(null)

    try {
      // Create a test checkout session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "test-user-id",
          email: "test@example.com",
          siteUrl: "https://massclip.pro",
        }),
      })

      const data = await response.json()
      setCheckoutResult(data)

      // If successful and we have a URL, open it in a new tab
      if (data.url) {
        window.open(data.url, "_blank")
      }
    } catch (err: any) {
      setCheckoutResult({
        error: err.message || "Failed to create test checkout session",
      })
    } finally {
      setTestingCheckout(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Stripe Connection Test</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Stripe API Connection</CardTitle>
          <CardDescription>Tests the connection to the Stripe API</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              <p>Testing connection...</p>
            </div>
          ) : error ? (
            <div className="flex items-center space-x-2 text-red-500">
              <XCircle size={20} />
              <p>{error}</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {result.success ? (
                  <CheckCircle size={20} className="text-green-500" />
                ) : (
                  <XCircle size={20} className="text-red-500" />
                )}
                <p>{result.success ? "Successfully connected to Stripe API" : "Failed to connect to Stripe API"}</p>
              </div>

              <div className="flex items-center space-x-2">
                {result.hasPriceId ? (
                  <CheckCircle size={20} className="text-green-500" />
                ) : (
                  <AlertCircle size={20} className="text-yellow-500" />
                )}
                <p>{result.hasPriceId ? "STRIPE_PRICE_ID is configured" : "STRIPE_PRICE_ID is missing"}</p>
              </div>

              {result.hasPriceId && (
                <div className="flex items-center space-x-2">
                  {result.priceValid ? (
                    <CheckCircle size={20} className="text-green-500" />
                  ) : (
                    <XCircle size={20} className="text-red-500" />
                  )}
                  <p>{result.priceValid ? "Price ID is valid" : "Price ID is invalid or doesn't exist"}</p>
                </div>
              )}

              {result.priceDetails && (
                <div className="mt-4 p-4 bg-gray-100 rounded-md">
                  <h3 className="font-medium mb-2">Price Details:</h3>
                  <pre className="text-xs overflow-auto">{JSON.stringify(result.priceDetails, null, 2)}</pre>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button onClick={testStripeConnection} disabled={loading}>
            {loading ? "Testing..." : "Test Connection Again"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Checkout Session</CardTitle>
          <CardDescription>Creates a test checkout session with Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          {testingCheckout ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              <p>Creating checkout session...</p>
            </div>
          ) : checkoutResult ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {checkoutResult.url ? (
                  <CheckCircle size={20} className="text-green-500" />
                ) : (
                  <XCircle size={20} className="text-red-500" />
                )}
                <p>
                  {checkoutResult.url ? "Successfully created checkout session" : "Failed to create checkout session"}
                </p>
              </div>

              {checkoutResult.error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-md">
                  <h3 className="font-medium mb-2">Error:</h3>
                  <p>{checkoutResult.error}</p>
                </div>
              )}

              {checkoutResult.url && (
                <div>
                  <p className="mb-2">Checkout URL:</p>
                  <div className="p-2 bg-gray-100 rounded-md overflow-x-auto">
                    <code className="text-xs break-all">{checkoutResult.url}</code>
                  </div>
                </div>
              )}

              {checkoutResult.sessionId && (
                <div>
                  <p className="mb-2">Session ID:</p>
                  <div className="p-2 bg-gray-100 rounded-md">
                    <code>{checkoutResult.sessionId}</code>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>Click the button below to create a test checkout session.</p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={testCheckoutSession} disabled={testingCheckout}>
            {testingCheckout ? "Creating..." : "Create Test Checkout Session"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
