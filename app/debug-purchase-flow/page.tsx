"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  CreditCard,
  Database,
  Settings,
  Copy,
  TestTube,
  Loader2,
  ExternalLink,
} from "lucide-react"
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
  }
  purchase?: {
    id: string
    productBoxId: string | null
    bundleId: string | null
    itemId: string
    itemType: string
    userId: string
    amount: number
  }
  item?: {
    title: string
    description?: string
    type: string
  }
  error?: string
  details?: string
}

export default function DebugPurchaseFlowPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [sessionId, setSessionId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [rawResponse, setRawResponse] = useState("")

  const testVerification = async () => {
    if (!sessionId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session ID",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setResult(null)
    setRawResponse("")

    try {
      console.log("🧪 [Debug] Testing verification for session:", sessionId)

      // Get auth token if user is available
      let idToken = null
      if (user) {
        try {
          idToken = await user.getIdToken(true)
          console.log("🔐 [Debug] Auth token obtained")
        } catch (error) {
          console.error("❌ [Debug] Failed to get auth token:", error)
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

      console.log("📊 [Debug] Verification response:", data)

      if (response.ok && data.success) {
        setResult(data)
        toast({
          title: "Success!",
          description: data.alreadyProcessed ? "Purchase already processed" : "Purchase verified successfully",
        })
      } else {
        setResult(data)
        toast({
          title: "Verification Failed",
          description: data.error || data.details || "Unknown error",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("❌ [Debug] Verification error:", error)
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
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    })
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />
  }

  const simulatePurchaseSuccess = () => {
    if (!sessionId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session ID first",
        variant: "destructive",
      })
      return
    }

    const successUrl = `/purchase-success?session_id=${encodeURIComponent(sessionId.trim())}`
    window.open(successUrl, "_blank")
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Flow Debug Tool</h1>
          <p className="text-gray-600">Test the new manual purchase verification system</p>
        </div>

        <Tabs defaultValue="test" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="test" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Test Verification
            </TabsTrigger>
            <TabsTrigger value="simulate" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Simulate Flow
            </TabsTrigger>
            <TabsTrigger value="response" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Raw Response
            </TabsTrigger>
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="test">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Test Purchase Verification
                </CardTitle>
                <CardDescription>Enter a Stripe session ID to test the manual verification flow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="sessionId">Stripe Session ID</Label>
                  <Input
                    id="sessionId"
                    placeholder="cs_live_... or cs_test_..."
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-sm text-gray-500">Enter the complete session ID from a Stripe checkout session</p>
                </div>

                <div className="flex gap-3">
                  <Button onClick={testVerification} disabled={loading || !sessionId.trim()} className="flex-1">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Test Verification
                      </>
                    )}
                  </Button>
                  <Button onClick={simulatePurchaseSuccess} variant="outline" disabled={!sessionId.trim()}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Success Page
                  </Button>
                </div>

                {result && (
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">Verification Result</h3>
                      {getStatusIcon(result.success)}
                      {result.alreadyProcessed && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          Already Processed
                        </Badge>
                      )}
                    </div>

                    {result.success && result.session && result.purchase && result.item ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <CreditCard className="h-4 w-4" />
                              <span className="font-medium">Stripe Session</span>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div>
                                <span className="text-gray-600">Status:</span>{" "}
                                <Badge variant="default">{result.session.status}</Badge>
                              </div>
                              <div>
                                <span className="text-gray-600">Amount:</span>{" "}
                                <span className="font-medium">
                                  {formatAmount(result.session.amount, result.session.currency)}
                                </span>
                              </div>
                              {result.session.customerEmail && (
                                <div>
                                  <span className="text-gray-600">Email:</span>{" "}
                                  <span className="font-medium text-xs">{result.session.customerEmail}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Database className="h-4 w-4" />
                              <span className="font-medium">Purchase Record</span>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div>
                                <span className="text-gray-600">ID:</span>{" "}
                                <span className="font-mono text-xs">{result.purchase.id}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Type:</span>{" "}
                                <Badge variant="outline">{result.purchase.itemType.replace("_", " ")}</Badge>
                              </div>
                              <div>
                                <span className="text-gray-600">User:</span>{" "}
                                <span className="font-mono text-xs">{result.purchase.userId || "Anonymous"}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Settings className="h-4 w-4" />
                              <span className="font-medium">Item Details</span>
                            </div>
                            <div className="space-y-1 text-sm">
                              <div>
                                <span className="text-gray-600">Title:</span>{" "}
                                <span className="font-medium">{result.item.title}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Type:</span>{" "}
                                <Badge variant="secondary">{result.item.type.replace("_", " ")}</Badge>
                              </div>
                              {result.item.description && (
                                <div>
                                  <span className="text-gray-600">Description:</span>{" "}
                                  <span className="text-xs">{result.item.description.substring(0, 50)}...</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <Alert variant={result.success ? "default" : "destructive"}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <strong>{result.success ? "Success" : "Error"}:</strong>
                            <p>{result.error || result.details || "Unknown result"}</p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="simulate">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Simulate Purchase Flow
                </CardTitle>
                <CardDescription>
                  Test the complete user experience from payment success to verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="simulateSessionId">Session ID for Simulation</Label>
                  <Input
                    id="simulateSessionId"
                    placeholder="cs_live_... or cs_test_..."
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This will open the purchase success page in a new tab with the session ID as a URL parameter,
                    simulating what happens when Stripe redirects the user after payment.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Button onClick={simulatePurchaseSuccess} disabled={!sessionId.trim()} className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Purchase Success Page
                  </Button>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>What this does:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Opens `/purchase-success?session_id={sessionId}` in new tab</li>
                      <li>Page extracts session_id from URL parameters</li>
                      <li>Automatically calls verification API</li>
                      <li>Shows user-friendly success/error messages</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="response">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Raw API Response
                </CardTitle>
                <CardDescription>View the complete JSON response from the verification API</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {rawResponse ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>API Response JSON</Label>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(rawResponse)}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      value={rawResponse}
                      readOnly
                      className="font-mono text-sm min-h-[300px]"
                      placeholder="Run a verification test to see the raw response here..."
                    />
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No response data yet. Run a verification test to see the raw API response.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  System Information
                </CardTitle>
                <CardDescription>Current system status and configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Authentication Status</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>User Authenticated:</span>
                        {user ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>}
                      </div>
                      {user && (
                        <>
                          <div className="flex items-center justify-between">
                            <span>User ID:</span>
                            <span className="font-mono text-xs">{user.uid}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Email:</span>
                            <span className="text-xs">{user.email}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold">API Endpoints</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Verification:</span>
                        <code className="ml-2 text-xs bg-gray-100 px-1 py-0.5 rounded">
                          /api/purchase/verify-session
                        </code>
                      </div>
                      <div>
                        <span className="text-gray-600">Success Page:</span>
                        <code className="ml-2 text-xs bg-gray-100 px-1 py-0.5 rounded">/purchase-success</code>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>
                        <strong>How the new flow works:</strong>
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>User completes payment on Stripe</li>
                        <li>Stripe redirects to `/purchase-success?session_id=cs_live_...`</li>
                        <li>Frontend extracts session_id from URL</li>
                        <li>Frontend calls `/api/purchase/verify-session` with session_id</li>
                        <li>Backend calls Stripe API to verify payment status</li>
                        <li>If paid, creates purchase record and grants access</li>
                        <li>User sees success message and can access content</li>
                      </ol>
                    </div>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
