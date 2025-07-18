"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

export default function StripeTestPage() {
  const [connectionStatus, setConnectionStatus] = useState<"loading" | "success" | "error">("loading")
  const [connectionDetails, setConnectionDetails] = useState<any>(null)
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [checkoutDetails, setCheckoutDetails] = useState<any>(null)
  const { user } = useAuth()

  useEffect(() => {
    async function checkStripeConnection() {
      try {
        const response = await fetch("/api/test-stripe-connection")
        const data = await response.json()

        if (data.success) {
          setConnectionStatus("success")
        } else {
          setConnectionStatus("error")
        }

        setConnectionDetails(data)
      } catch (error) {
        setConnectionStatus("error")
        setConnectionDetails({ error: error instanceof Error ? error.message : "Unknown error" })
      }
    }

    checkStripeConnection()
  }, [])

  const testCheckoutSession = async () => {
    setCheckoutStatus("loading")

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.uid,
          userEmail: user?.email,
          test: true, // Flag to indicate this is a test
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setCheckoutStatus("success")
        setCheckoutDetails(data)
      } else {
        setCheckoutStatus("error")
        setCheckoutDetails(data)
      }
    } catch (error) {
      setCheckoutStatus("error")
      setCheckoutDetails({ error: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Stripe Connection Test</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stripe API Connection</CardTitle>
            <CardDescription>Test connection to Stripe API</CardDescription>
          </CardHeader>
          <CardContent>
            {connectionStatus === "loading" && (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-t-2 border-crimson border-solid rounded-full animate-spin"></div>
                <span className="ml-3">Testing connection...</span>
              </div>
            )}

            {connectionStatus === "success" && (
              <div className="space-y-4">
                <div className="flex items-center text-green-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Connection successful</span>
                </div>

                <div className="bg-gray-100 p-4 rounded-md">
                  <pre className="text-sm overflow-auto">{JSON.stringify(connectionDetails, null, 2)}</pre>
                </div>
              </div>
            )}

            {connectionStatus === "error" && (
              <div className="space-y-4">
                <div className="flex items-center text-red-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Connection failed</span>
                </div>

                <div className="bg-red-50 p-4 rounded-md">
                  <pre className="text-sm overflow-auto text-red-700">{JSON.stringify(connectionDetails, null, 2)}</pre>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => {
                setConnectionStatus("loading")
                window.location.reload()
              }}
              variant="outline"
            >
              Refresh
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checkout Session Test</CardTitle>
            <CardDescription>Test creating a Stripe checkout session</CardDescription>
          </CardHeader>
          <CardContent>
            {checkoutStatus === "idle" && (
              <div className="py-8 text-center">
                <p className="mb-4">Click the button below to test creating a checkout session</p>
                <Button onClick={testCheckoutSession}>Test Checkout Session</Button>
              </div>
            )}

            {checkoutStatus === "loading" && (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-t-2 border-crimson border-solid rounded-full animate-spin"></div>
                <span className="ml-3">Creating checkout session...</span>
              </div>
            )}

            {checkoutStatus === "success" && (
              <div className="space-y-4">
                <div className="flex items-center text-green-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Checkout session created successfully</span>
                </div>

                <div className="bg-gray-100 p-4 rounded-md">
                  <pre className="text-sm overflow-auto">{JSON.stringify(checkoutDetails, null, 2)}</pre>
                </div>

                {checkoutDetails?.url && (
                  <div className="text-center">
                    <a
                      href={checkoutDetails.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-crimson hover:bg-crimson-dark text-white px-4 py-2 rounded-md"
                    >
                      Open Checkout Page
                    </a>
                  </div>
                )}
              </div>
            )}

            {checkoutStatus === "error" && (
              <div className="space-y-4">
                <div className="flex items-center text-red-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Failed to create checkout session</span>
                </div>

                <div className="bg-red-50 p-4 rounded-md">
                  <pre className="text-sm overflow-auto text-red-700">{JSON.stringify(checkoutDetails, null, 2)}</pre>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            {checkoutStatus !== "idle" && (
              <Button onClick={() => setCheckoutStatus("idle")} variant="outline">
                Reset
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
