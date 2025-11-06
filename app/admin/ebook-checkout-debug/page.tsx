"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function EBookCheckoutDebugPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [ebooks, setEbooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [checkoutPayload, setCheckoutPayload] = useState<any>(null)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [webhookStatus, setWebhookStatus] = useState<any>({})
  const [purchaseVerification, setPurchaseVerification] = useState<any>({})
  const [verifyingPurchase, setVerifyingPurchase] = useState<string | null>(null)

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

  const verifyEbookPurchase = async (ebookId: string, sessionId?: string) => {
    console.log("[v0] Verifying eBook purchase:", { ebookId, sessionId })
    setVerifyingPurchase(ebookId)

    try {
      const idToken = await user?.getIdToken()

      // Check ebookPurchases collection
      const purchasesResponse = await fetch(`/api/admin/verify-ebook-purchase?ebookId=${ebookId}&userId=${user?.uid}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      const purchasesData = await purchasesResponse.json()
      console.log("[v0] Purchase verification result:", purchasesData)

      const ebookResponse = await fetch(`/api/creator/ebooks/${ebookId}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      let ebookContent = null
      if (ebookResponse.ok) {
        const ebookData = await ebookResponse.json()
        ebookContent = {
          hasPages: ebookData.pages && ebookData.pages.length > 0,
          pageCount: ebookData.pages?.length || 0,
          hasCover: !!ebookData.coverUrl,
          pages: ebookData.pages || [],
          coverUrl: ebookData.coverUrl || null,
        }
        console.log("[v0] eBook content verification:", ebookContent)
      }

      setPurchaseVerification({
        ebookId,
        ...purchasesData,
        ebookContent,
      })

      if (purchasesData.hasPurchase) {
        toast({
          title: "Purchase Verified",
          description: `Found ${purchasesData.purchaseCount} purchase(s) for this eBook`,
        })
      } else {
        toast({
          title: "No Purchase Found",
          description: "This eBook has not been purchased yet",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error verifying purchase:", error)
      toast({
        title: "Verification Error",
        description: error instanceof Error ? error.message : "Failed to verify purchase",
        variant: "destructive",
      })
    } finally {
      setVerifyingPurchase(null)
    }
  }

  const checkWebhookEvents = async (ebookId: string) => {
    console.log("[v0] Checking webhook events for eBook:", ebookId)

    try {
      const idToken = await user?.getIdToken()
      const response = await fetch(`/api/admin/check-webhook-events?ebookId=${ebookId}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      const data = await response.json()
      console.log("[v0] Webhook events:", data)

      setWebhookStatus({
        ebookId,
        ...data,
      })
    } catch (error) {
      console.error("[v0] Error checking webhooks:", error)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">eBook Checkout Debug</h1>
          <p className="text-zinc-400">Comprehensive debug page to test and verify the complete eBook purchase flow</p>
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

                  <div className="bg-zinc-900 rounded p-3 space-y-2">
                    <div className="text-sm font-semibold text-zinc-300 mb-2">Validation Checks:</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        {ebook.stripePriceId ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                        <span className={ebook.stripePriceId ? "text-green-400" : "text-red-400"}>
                          Stripe Price ID configured
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ebook.stripeProductId ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                        <span className={ebook.stripeProductId ? "text-green-400" : "text-red-400"}>
                          Stripe Product ID configured
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ebook.status === "published" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-400" />
                        )}
                        <span className={ebook.status === "published" ? "text-green-400" : "text-yellow-400"}>
                          {ebook.status === "published" ? "Published" : "Draft (not visible on storefront)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {ebook.price > 0 ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                        <span className={ebook.price > 0 ? "text-green-400" : "text-red-400"}>
                          Price set (${((ebook.price || 0) / 100).toFixed(2)})
                        </span>
                      </div>
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      onClick={() => testCheckout(ebook)}
                      disabled={checkoutLoading === ebook.id || !ebook.stripePriceId}
                      className="bg-white text-black hover:bg-zinc-200"
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

                    <Button
                      onClick={() => verifyEbookPurchase(ebook.id)}
                      disabled={verifyingPurchase === ebook.id}
                      variant="outline"
                      className="border-zinc-600 hover:bg-zinc-800"
                    >
                      {verifyingPurchase === ebook.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify Purchase"
                      )}
                    </Button>

                    <Button
                      onClick={() => checkWebhookEvents(ebook.id)}
                      variant="outline"
                      className="border-zinc-600 hover:bg-zinc-800"
                    >
                      Check Webhooks
                    </Button>
                  </div>

                  {debugInfo.ebookId === ebook.id && (
                    <div className="bg-zinc-900 border border-zinc-700 rounded p-3">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">Checkout Response:</div>
                      <pre className="text-xs text-zinc-300 overflow-x-auto">
                        {JSON.stringify(debugInfo.response || debugInfo.error, null, 2)}
                      </pre>
                    </div>
                  )}

                  {purchaseVerification.ebookId === ebook.id && (
                    <div className="bg-zinc-900 border border-zinc-700 rounded p-3">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">Purchase Verification:</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          {purchaseVerification.hasPurchase ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                          <span className={purchaseVerification.hasPurchase ? "text-green-400" : "text-red-400"}>
                            {purchaseVerification.hasPurchase
                              ? `Found ${purchaseVerification.purchaseCount} purchase(s)`
                              : "No purchases found"}
                          </span>
                        </div>
                        {purchaseVerification.purchases && purchaseVerification.purchases.length > 0 && (
                          <div className="mt-2">
                            <div className="text-zinc-400 text-xs mb-1">Purchase Details:</div>
                            <pre className="text-xs text-zinc-300 overflow-x-auto bg-zinc-800 p-2 rounded">
                              {JSON.stringify(purchaseVerification.purchases, null, 2)}
                            </pre>
                          </div>
                        )}

                        {purchaseVerification.ebookContent && (
                          <div className="mt-4 pt-4 border-t border-zinc-700">
                            <div className="text-zinc-400 text-xs mb-2 font-semibold">eBook Content Verification:</div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                {purchaseVerification.ebookContent.hasPages ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-400" />
                                )}
                                <span
                                  className={
                                    purchaseVerification.ebookContent.hasPages ? "text-green-400" : "text-red-400"
                                  }
                                >
                                  {purchaseVerification.ebookContent.hasPages
                                    ? `Has ${purchaseVerification.ebookContent.pageCount} page(s)`
                                    : "No pages uploaded"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {purchaseVerification.ebookContent.hasCover ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                                )}
                                <span
                                  className={
                                    purchaseVerification.ebookContent.hasCover ? "text-green-400" : "text-yellow-400"
                                  }
                                >
                                  {purchaseVerification.ebookContent.hasCover ? "Has cover image" : "No cover image"}
                                </span>
                              </div>

                              {!purchaseVerification.ebookContent.hasPages && (
                                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                                  <p className="text-red-400 text-xs font-semibold">⚠️ Critical: No pages found!</p>
                                  <p className="text-zinc-400 text-xs mt-1">
                                    Buyers will receive an error when trying to download. Upload pages to fix this.
                                  </p>
                                </div>
                              )}

                              {purchaseVerification.ebookContent.hasPages && (
                                <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded">
                                  <p className="text-green-400 text-xs font-semibold">✓ Content Ready for Download</p>
                                  <p className="text-zinc-400 text-xs mt-1">
                                    Buyers will receive a ZIP file with {purchaseVerification.ebookContent.pageCount}{" "}
                                    page(s)
                                    {purchaseVerification.ebookContent.hasCover && " + cover image"}.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {webhookStatus.ebookId === ebook.id && (
                    <div className="bg-zinc-900 border border-zinc-700 rounded p-3">
                      <div className="text-sm font-semibold text-zinc-300 mb-2">Webhook Events:</div>
                      <pre className="text-xs text-zinc-300 overflow-x-auto">
                        {JSON.stringify(webhookStatus, null, 2)}
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

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">How to Use This Debug Page</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-zinc-300">
            <li>
              <strong>Check Validation:</strong> Review the validation checks for each eBook (Stripe IDs, published
              status, price)
            </li>
            <li>
              <strong>Test Checkout:</strong> Click "Test Checkout" to simulate the checkout flow and verify session
              creation
            </li>
            <li>
              <strong>Verify Purchase:</strong> After completing a purchase, click "Verify Purchase" to check if it was
              recorded in the database
            </li>
            <li>
              <strong>Check Webhooks:</strong> Click "Check Webhooks" to see if Stripe webhook events were received and
              processed
            </li>
            <li>
              <strong>Review Console:</strong> Check browser console for detailed debugging information throughout the
              flow
            </li>
            <li>
              <strong>Inspect Responses:</strong> Review checkout payload, purchase verification, and webhook status
              sections for issues
            </li>
          </ol>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">Common Issues & Solutions</h2>
          <div className="space-y-3 text-sm text-zinc-300">
            <div>
              <strong className="text-red-400">Missing Stripe Price ID:</strong>
              <p className="text-zinc-400 mt-1">
                The eBook needs a Stripe Price ID. Make sure you've created the eBook with a price and it's synced with
                Stripe.
              </p>
            </div>
            <div>
              <strong className="text-red-400">Draft Status:</strong>
              <p className="text-zinc-400 mt-1">
                eBooks in draft status won't appear on your storefront. Publish them from /dashboard/ebooks.
              </p>
            </div>
            <div>
              <strong className="text-red-400">Purchase Not Found:</strong>
              <p className="text-zinc-400 mt-1">
                If purchase verification fails, check: 1) Webhook was received, 2) ebookPurchases collection in
                Firebase, 3) Stripe webhook logs.
              </p>
            </div>
            <div>
              <strong className="text-red-400">Webhook Not Processing:</strong>
              <p className="text-zinc-400 mt-1">
                Verify webhook secret is configured correctly and Stripe is sending events to your webhook endpoint.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
