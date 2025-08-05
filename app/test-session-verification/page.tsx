"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, Loader2, Copy, Play, User, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface VerificationResult {
  success: boolean
  alreadyProcessed?: boolean
  session?: {
    id: string
    amount: number
    currency: string
    status: string
    customerEmail?: string
    created: string
    connectedAccount?: string
    retrievalMethod: string
  }
  purchase?: {
    id: string
    productBoxId?: string
    bundleId?: string
    itemId: string
    itemType: string
    userId?: string
    creatorId?: string
    amount: number
  }
  item?: {
    title: string
    description?: string
    type: string
  }
  error?: string
  details?: string
  debugInfo?: any
}

export default function TestSessionVerificationPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [sessionId, setSessionId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [rawResponse, setRawResponse] = useState("")

  // Pre-fill with the failing session ID from the screenshot
  const testSessionId = "cs_live_b1nWEQLVQfzG1DHnX67k8vINgNGjAbIJnISHjUrGUeXf6AxwRnUtGUIGOZ"

  const handleVerification = async () => {
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

      const data = await response.json()
      setRawResponse(JSON.stringify(data, null, 2))

      console.log("📊 [Test] Verification response:", data)
      console.log("   Status:", response.status)
      console.log("   Success:", data.success)

      setResult(data)

      if (data.success) {
        toast({
          title: "Success!",
          description: "Session verified successfully",
        })
      } else {
        toast({
          title: "Verification Failed",
          description: data.error || "Unknown error",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("❌ [Test] Verification test failed:", error)
      const errorResult = {
        success: false,
        error: "Network Error",
        details: error.message,
      }
      setResult(errorResult)
      setRawResponse(JSON.stringify(errorResult, null, 2))

      toast({
        title: "Network Error",
        description: "Failed to connect to verification API",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    })
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Session Verification Test
            </CardTitle>
            <CardDescription>
              Test the purchase session verification API with any Stripe checkout session ID
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Status */}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span>User Status:</span>
              <Badge variant={user ? "default" : "secondary"}>
                {user ? `Authenticated (${user.email})` : "Not Authenticated"}
              </Badge>
            </div>

            {/* Session ID Input */}
            <div className="space-y-2">
              <Label htmlFor="sessionId">Stripe Checkout Session ID</Label>
              <div className="flex gap-2">
                <Input
                  id="sessionId"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="cs_live_... or cs_test_..."
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="sm" onClick={() => setSessionId(testSessionId)} disabled={isLoading}>
                  Use Test Session
                </Button>
              </div>
            </div>

            {/* Test Button */}
            <Button onClick={handleVerification} disabled={isLoading || !sessionId.trim()} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying Session...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Test Verification
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Verification Result
              </CardTitle>
              <CardDescription>
                {result.success ? "Session verified successfully" : "Verification failed"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {result.success ? (
                <div className="space-y-6">
                  {/* Success Status */}
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      {result.alreadyProcessed ? "Already Processed" : "Newly Verified"}
                    </Badge>
                  </div>

                  {/* Session Details */}
                  {result.session && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg">Session Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                          <div className="text-sm">
                            <span className="text-gray-600">Session ID:</span>
                            <div className="font-mono text-xs break-all flex items-center gap-2">
                              {result.session.id}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(result.session!.id, "Session ID")}
                                className="h-6 px-2"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Amount:</span>{" "}
                            <span className="font-medium">
                              {formatAmount(result.session.amount, result.session.currency)}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Status:</span>{" "}
                            <Badge variant="default">{result.session.status}</Badge>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                          <div className="text-sm">
                            <span className="text-gray-600">Customer Email:</span>{" "}
                            <span className="font-medium">{result.session.customerEmail || "N/A"}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Connected Account:</span>{" "}
                            <span className="font-mono text-xs">{result.session.connectedAccount || "Platform"}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-600">Retrieval Method:</span>{" "}
                            <Badge variant="outline">{result.session.retrievalMethod}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Purchase Details */}
                  {result.purchase && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg">Purchase Details</h3>
                      <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-600">Purchase ID:</span>{" "}
                          <span className="font-mono text-xs">{result.purchase.id}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Item Type:</span>{" "}
                          <Badge variant="outline">{result.purchase.itemType}</Badge>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Item ID:</span>{" "}
                          <span className="font-mono text-xs">{result.purchase.itemId}</span>
                        </div>
                        {result.purchase.creatorId && (
                          <div className="text-sm">
                            <span className="text-gray-600">Creator ID:</span>{" "}
                            <span className="font-mono text-xs">{result.purchase.creatorId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Item Details */}
                  {result.item && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg">Item Details</h3>
                      <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-600">Title:</span>{" "}
                          <span className="font-medium">{result.item.title}</span>
                        </div>
                        {result.item.description && (
                          <div className="text-sm">
                            <span className="text-gray-600">Description:</span> <span>{result.item.description}</span>
                          </div>
                        )}
                        <div className="text-sm">
                          <span className="text-gray-600">Type:</span>{" "}
                          <Badge variant="outline">{result.item.type}</Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Error Details */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-red-600 font-medium">{result.error}</p>
                        {result.details && <p className="text-red-600 text-sm mt-1">{result.details}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Debug Information */}
                  {result.debugInfo && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">Debug Information</h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        {Object.entries(result.debugInfo).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span>{" "}
                            <span className="font-mono">{JSON.stringify(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              {/* Raw Response */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Raw API Response</h3>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(rawResponse, "Raw response")}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Response
                  </Button>
                </div>
                <Textarea
                  value={rawResponse}
                  readOnly
                  className="font-mono text-xs h-64 resize-none"
                  placeholder="API response will appear here..."
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
