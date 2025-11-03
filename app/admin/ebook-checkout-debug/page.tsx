"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function EBookCheckoutDebugPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [ebooks, setEbooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [checkoutPayload, setCheckoutPayload] = useState<any>(null)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  useEffect(() => {
    if (user?.uid) {
      fetchEbooks()
    }
  }, [user])

  const fetchEbooks = async () => {
    try {
      setLoading(true)
      const idToken = await user?.getIdToken()
      const response = await fetch("/api/creator/ebooks", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })
      const data = await response.json()
      console.log("[v0] Fetched eBooks:", data)
      setEbooks(data.ebooks || [])
    } catch (error) {
      console.error("[v0] Error fetching eBooks:", error)
      toast({
        title: "Error",
        description: "Failed to load eBooks",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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
    setCheckoutLoading(ebook.id)
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
        ebookId: ebook.id,
        status: response.status,
        response: data,
        payload,
      })
    } catch (error) {
      console.error("[v0] Checkout error:", error)
      setDebugInfo({
        ebookId: ebook.id,
        error: error instanceof Error ? error.message : "Unknown error",
        payload,
      })
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">eBook Checkout Debug</h1>
          <p className="text-zinc-400">Debug page to trace eBook checkout flow and identify issues</p>
        </div>

        {/* User Info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">User Info</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <span className="text-zinc-400">User ID:</span> {user?.uid || "Not logged in"}
            </div>
            <div>
              <span className="text-zinc-400">Email:</span> {user?.email || "N/A"}
            </div>
          </div>
        </div>

        {/* eBooks List */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">All eBooks ({ebooks.length})</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : ebooks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-zinc-400">No eBooks found</p>
              <p className="text-zinc-500 text-sm mt-2">
                Create an eBook from{" "}
                <a href="/dashboard/ebooks/create" className="underline hover:text-zinc-300">
                  /dashboard/ebooks/create
                </a>{" "}
                to test checkout
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {ebooks.map((ebook) => (
                <div key={ebook.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{ebook.title}</h3>
                        <Badge
                          variant={ebook.status === "published" ? "default" : "secondary"}
                          className={
                            ebook.status === "published"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }
                        >
                          {ebook.status}
                        </Badge>
                      </div>
                      {ebook.description && <p className="text-sm text-zinc-400">{ebook.description}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm font-mono bg-zinc-900 rounded p-3">
                    <div>
                      <div className="text-zinc-500">eBook ID:</div>
                      <div className="break-all text-zinc-300">{ebook.id}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Creator ID:</div>
                      <div className="break-all text-zinc-300">{ebook.creatorId}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Price:</div>
                      <div className="text-zinc-300">${((ebook.price || 0) / 100).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Page Count:</div>
                      <div className="text-zinc-300">{ebook.pageCount || 0}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Stripe Product ID:</div>
                      <div className="break-all text-zinc-300">{ebook.stripeProductId || "Not set"}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Stripe Price ID:</div>
                      <div className="break-all text-zinc-300">{ebook.stripePriceId || "Not set"}</div>
                    </div>
                  </div>

                  {ebook.status === "draft" && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                      <p className="text-yellow-400 text-sm">
                        ⚠️ This eBook is in <strong>draft</strong> status and won't appear on your storefront. Go to{" "}
                        <a href="/dashboard/ebooks" className="underline hover:text-yellow-300">
                          /dashboard/ebooks
                        </a>{" "}
                        and click "Publish to Storefront" in the dropdown menu to make it available for purchase.
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={() => testCheckout(ebook)}
                    disabled={checkoutLoading === ebook.id || !ebook.stripePriceId}
                    className="w-full bg-white text-black hover:bg-zinc-200"
                  >
                    {checkoutLoading === ebook.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Test Checkout"
                    )}
                  </Button>

                  {debugInfo.ebookId === ebook.id && (
                    <div className="bg-zinc-900 border border-zinc-700 rounded p-3">
                      <div className="text-sm text-zinc-400 mb-2">Response:</div>
                      <pre className="text-xs text-zinc-300 overflow-x-auto">
                        {JSON.stringify(debugInfo.response || debugInfo.error, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Payload */}
        {checkoutPayload && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Last Checkout Payload</h2>
            <pre className="bg-zinc-800 p-4 rounded-md overflow-auto text-sm text-zinc-300">
              {JSON.stringify(checkoutPayload, null, 2)}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">How to Use</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-300">
            <li>Check that your eBooks are listed above</li>
            <li>Verify that each eBook has Stripe Product ID and Price ID set</li>
            <li>
              <strong>Make sure eBooks are published</strong> (status should be "published", not "draft")
            </li>
            <li>Click "Test Checkout" on an eBook to simulate the checkout flow</li>
            <li>Check the console logs for detailed debugging information</li>
            <li>Review the checkout payload and response to identify issues</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
