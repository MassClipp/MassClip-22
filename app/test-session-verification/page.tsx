"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, XCircle, Loader2, Copy, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function TestSessionVerificationPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [sessionId, setSessionId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [rawResponse, setRawResponse] = useState<string>("")

  const testVerification = async () => {
    if (!sessionId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session ID",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setResult(null)
    setError(null)
    setRawResponse("")

    try {
      console.log("🧪 [Test] Starting session verification test...")
      console.log("   Session ID:", sessionId)
      console.log("   User authenticated:", !!user)

      // Get auth token if user is available
      let idToken = null
      if (user) {
        try {
          idToken = await user.getIdToken(true)
          console.log("🔐 [Test] Auth token obtained")
        } catch (error) {
          console.error("❌ [Test] Failed to get auth token:", error)
        }
      }

      const response = await fetch("/api/purchase/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId.trim(),
          idToken,
        }),
      })

      console.log("📊 [Test] Response status:", response.status)

      const data = await response.json()
      console.log("📊 [Test] Response data:", data)

      setRawResponse(JSON.stringify(data, null, 2))

      if (response.ok && data.success) {
        setResult(data)
        setError(null)
        toast({
          title: "Success!",
          description: "Session verification completed successfully",
        })
      } else {
        setError(data.error || data.message || "Verification failed")
        setResult(data)
        toast({
          title: "Verification Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("❌ [Test] Network error:", error)
      setError(`Network error: ${error.message}`)
      setRawResponse(JSON.stringify({ error: error.message, type: "NetworkError" }, null, 2))
      toast({
        title: "Network Error",
        description: "Failed to connect to the API",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyResponse = () => {
    navigator.clipboard.writeText(rawResponse)
    toast({
      title: "Copied",
      description: "Response copied to clipboard",
    })
  }

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId)
    toast({
      title: "Copied",
      description: "Session ID copied to clipboard",
    })
  }

  const fillTestSession = () => {
    setSessionId("cs_live_b1HRh5PlcJKwAoQ2bStam9QjRnHWGoarNc7mSJikquf2XSvDa4CNVSwUCt")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Verification Test</CardTitle>
            <CardDescription>
              Test the purchase session verification API with any Stripe checkout session ID
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sessionId">Stripe Session ID</Label>
              <div className="flex gap-2">
                <Input
                  id="sessionId"
                  placeholder="cs_live_... or cs_test_..."
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="sm" onClick={copySessionId} disabled={!sessionId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={testVerification} disabled={isLoading || !sessionId.trim()} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Test Verification"
                )}
              </Button>
              <Button variant="outline" onClick={fillTestSession}>
                Fill Test Session
              </Button>
            </div>

            <div className="bg-gray-100 p-3 rounded-lg text-sm space-y-1">
              <div>
                <strong>Current User:</strong> {user ? `${user.email} (${user.uid})` : "Not authenticated"}
              </div>
              <div>
                <strong>Domain:</strong> {typeof window !== "undefined" ? window.location.origin : "Loading..."}
              </div>
              <div>
                <strong>Timestamp:</strong> {new Date().toISOString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {(result || error) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result?.success ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Verification Successful
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    Verification Failed
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result?.success && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">Session Details</h3>
                    <div className="space-y-1 text-sm text-green-800">
                      <div>
                        <strong>ID:</strong> {result.session?.id}
                      </div>
                      <div>
                        <strong>Amount:</strong> ${(result.session?.amount / 100).toFixed(2)}{" "}
                        {result.session?.currency?.toUpperCase()}
                      </div>
                      <div>
                        <strong>Status:</strong> {result.session?.status}
                      </div>
                      <div>
                        <strong>Email:</strong> {result.session?.customerEmail || "N/A"}
                      </div>
                      <div>
                        <strong>Connected Account:</strong> {result.session?.connectedAccount || "Platform"}
                      </div>
                      <div>
                        <strong>Retrieval Method:</strong> {result.session?.retrievalMethod}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Purchase Details</h3>
                    <div className="space-y-1 text-sm text-blue-800">
                      <div>
                        <strong>Purchase ID:</strong> {result.purchase?.id}
                      </div>
                      <div>
                        <strong>Item Type:</strong> {result.purchase?.itemType}
                      </div>
                      <div>
                        <strong>Product Box ID:</strong> {result.purchase?.productBoxId || "N/A"}
                      </div>
                      <div>
                        <strong>Bundle ID:</strong> {result.purchase?.bundleId || "N/A"}
                      </div>
                      <div>
                        <strong>Creator ID:</strong> {result.purchase?.creatorId || "N/A"}
                      </div>
                      <div>
                        <strong>User ID:</strong> {result.purchase?.userId || "N/A"}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                    <h3 className="font-semibold text-gray-900 mb-2">Item Details</h3>
                    <div className="space-y-1 text-sm text-gray-800">
                      <div>
                        <strong>Title:</strong> {result.item?.title}
                      </div>
                      <div>
                        <strong>Description:</strong> {result.item?.description || "N/A"}
                      </div>
                      <div>
                        <strong>Type:</strong> {result.item?.type}
                      </div>
                      <div>
                        <strong>Already Processed:</strong> {result.alreadyProcessed ? "Yes" : "No"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-600 font-medium">Error Details</p>
                      <p className="text-red-600 text-sm mt-1">{error}</p>

                      {result?.debugInfo && (
                        <div className="mt-3 space-y-1 text-xs text-red-700">
                          <div>
                            <strong>Connected Account ID:</strong> {result.debugInfo.connectedAccountId || "None"}
                          </div>
                          <div>
                            <strong>Creator ID:</strong> {result.debugInfo.creatorId || "None"}
                          </div>
                          <div>
                            <strong>Retrieval Method:</strong> {result.debugInfo.retrievalMethod || "Unknown"}
                          </div>
                          <div>
                            <strong>Session Type:</strong> {result.debugInfo.sessionType || "Unknown"}
                          </div>
                          <div>
                            <strong>Stripe Mode:</strong> {result.debugInfo.stripeMode || "Unknown"}
                          </div>
                          {result.debugInfo.searchedAccountsCount !== undefined && (
                            <div>
                              <strong>Searched Accounts:</strong> {result.debugInfo.searchedAccountsCount}
                            </div>
                          )}
                        </div>
                      )}

                      {result?.possibleCauses && (
                        <div className="mt-3">
                          <p className="text-red-600 text-sm font-medium">Possible Causes:</p>
                          <ul className="list-disc list-inside text-xs text-red-700 mt-1 space-y-1">
                            {result.possibleCauses.map((cause: string, index: number) => (
                              <li key={index}>{cause}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {rawResponse && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Raw API Response
                <Button variant="outline" size="sm" onClick={copyResponse}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={rawResponse}
                readOnly
                className="font-mono text-xs h-64 resize-none"
                placeholder="API response will appear here..."
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>1. Enter a Stripe checkout session ID (starts with cs_live_ or cs_test_)</p>
            <p>2. Click "Test Verification" to test the API</p>
            <p>3. View the results and debug information below</p>
            <p>4. Check the browser console for detailed logs</p>
            <p className="text-blue-600">
              💡 Tip: Use "Fill Test Session" to populate the failing session ID from your screenshot
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
