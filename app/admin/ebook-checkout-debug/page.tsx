"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"

export default function EBookCheckoutDebugPage() {
  const { user } = useAuth()
  const [ebooks, setEbooks] = useState<any[]>([])
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [checkoutPayload, setCheckoutPayload] = useState<any>(null)

  useEffect(() => {
    if (user?.uid) {
      fetchEbooks()
    }
  }, [user])

  const fetchEbooks = async () => {
    try {
      const response = await fetch(`/api/creator/${user?.uid}/published-ebooks`)
      const data = await response.json()
      console.log("[v0] Fetched eBooks:", data)
      setEbooks(data.ebooks || [])
    } catch (error) {
      console.error("[v0] Error fetching eBooks:", error)
    }
  }

  const testCheckout = async (ebook: any) => {
    console.log("[v0] Testing checkout for eBook:", ebook)

    const payload = {
      ebookId: ebook.id,
      userId: user?.uid,
      itemType: "ebook",
    }

    setCheckoutPayload(payload)
    console.log("[v0] Checkout payload:", payload)

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      console.log("[v0] Checkout response:", data)

      setDebugInfo({
        status: response.status,
        response: data,
        payload,
      })
    } catch (error) {
      console.error("[v0] Checkout error:", error)
      setDebugInfo({
        error: error instanceof Error ? error.message : "Unknown error",
        payload,
      })
    }
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">eBook Checkout Debug</h1>
          <p className="text-muted-foreground">Debug page to trace eBook checkout flow and identify issues</p>
        </div>

        {/* User Info */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">User Info</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>User ID: {user?.uid || "Not logged in"}</div>
            <div>Email: {user?.email || "N/A"}</div>
          </div>
        </div>

        {/* eBooks List */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Published eBooks ({ebooks.length})</h2>
          <div className="space-y-4">
            {ebooks.map((ebook) => (
              <div key={ebook.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{ebook.title}</h3>
                    <p className="text-sm text-muted-foreground">{ebook.description}</p>
                  </div>
                  <button
                    onClick={() => testCheckout(ebook)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    Test Checkout
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                  <div>
                    <div className="text-muted-foreground">eBook ID:</div>
                    <div className="break-all">{ebook.id}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Creator ID:</div>
                    <div className="break-all">{ebook.creatorId}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Price:</div>
                    <div>${ebook.price}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status:</div>
                    <div>{ebook.status}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Stripe Product ID:</div>
                    <div className="break-all">{ebook.stripeProductId || "Not set"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Stripe Price ID:</div>
                    <div className="break-all">{ebook.stripePriceId || "Not set"}</div>
                  </div>
                </div>
              </div>
            ))}

            {ebooks.length === 0 && (
              <div className="text-center text-muted-foreground py-8">No published eBooks found</div>
            )}
          </div>
        </div>

        {/* Checkout Payload */}
        {checkoutPayload && (
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Last Checkout Payload</h2>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(checkoutPayload, null, 2)}
            </pre>
          </div>
        )}

        {/* Debug Info */}
        {debugInfo && Object.keys(debugInfo).length > 0 && (
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Checkout Response</h2>
            <div className="space-y-4">
              {debugInfo.status && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Status Code:</div>
                  <div
                    className={`text-lg font-semibold ${debugInfo.status === 200 ? "text-green-500" : "text-red-500"}`}
                  >
                    {debugInfo.status}
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm text-muted-foreground mb-1">Response:</div>
                <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
                  {JSON.stringify(debugInfo.response || debugInfo.error, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">How to Use</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Check that your published eBooks are listed above</li>
            <li>Verify that each eBook has Stripe Product ID and Price ID set</li>
            <li>Click "Test Checkout" on an eBook to simulate the checkout flow</li>
            <li>Check the console logs for detailed debugging information</li>
            <li>Review the checkout payload and response to identify issues</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
