"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  CreditCard,
  ShoppingCart,
  TestTube,
  Eye,
  Copy,
  Trash2,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface MockSession {
  id: string
  payment_status: string
  amount_total: number
  currency: string
  customer_details: {
    email: string
    name?: string
  }
  metadata: {
    productBoxId: string
    creatorUid?: string
  }
  livemode: boolean
  payment_intent: string
}

interface TestResult {
  step: string
  status: "success" | "error" | "warning" | "loading"
  message: string
  data?: any
  error?: string
  timestamp: Date
}

interface PurchaseVerificationResult {
  success: boolean
  purchase?: any
  unifiedPurchase?: any
  error?: string
  details?: string
  environment?: string
  stripeMode?: string
}

export default function StripeDebugPurchaseFlowPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  // State for mock session generation
  const [mockSession, setMockSession] = useState<MockSession | null>(null)
  const [sessionParams, setSessionParams] = useState({
    productBoxId: "product-viral-clips-bundle",
    amount: 2999, // $29.99
    currency: "usd",
    customerEmail: "",
    customerName: "",
    creatorUid: "",
    paymentStatus: "paid",
    livemode: false,
  })

  // State for testing
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)
  const [verificationResult, setVerificationResult] = useState<PurchaseVerificationResult | null>(null)

  // State for custom session testing
  const [customSessionId, setCustomSessionId] = useState("")
  const [customSessionData, setCustomSessionData] = useState("")

  const addResult = (result: Omit<TestResult, "timestamp">) => {
    setTestResults((prev) => [...prev, { ...result, timestamp: new Date() }])
  }

  const clearResults = () => {
    setTestResults([])
    setVerificationResult(null)
  }

  const generateMockSessionId = () => {
    return `cs_test_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
  }

  const generateMockPaymentIntentId = () => {
    return `pi_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
  }

  const generateMockSession = () => {
    const sessionId = generateMockSessionId()
    const paymentIntentId = generateMockPaymentIntentId()

    const session: MockSession = {
      id: sessionId,
      payment_status: sessionParams.paymentStatus,
      amount_total: sessionParams.amount,
      currency: sessionParams.currency,
      customer_details: {
        email: sessionParams.customerEmail || user?.email || "test@example.com",
        name: sessionParams.customerName || user?.displayName || "Test User",
      },
      metadata: {
        productBoxId: sessionParams.productBoxId,
        creatorUid: sessionParams.creatorUid || undefined,
      },
      livemode: sessionParams.livemode,
      payment_intent: paymentIntentId,
    }

    setMockSession(session)
    toast({
      title: "Mock Session Generated",
      description: `Session ID: ${sessionId}`,
    })
  }

  const copySessionId = () => {
    if (mockSession) {
      navigator.clipboard.writeText(mockSession.id)
      toast({
        title: "Copied",
        description: "Session ID copied to clipboard",
      })
    }
  }

  const testCheckoutFlow = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return
    }

    if (!mockSession) {
      toast({
        title: "Error",
        description: "Generate a mock session first",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    clearResults()

    try {
      const token = await user.getIdToken()

      // Step 1: Test checkout session creation
      addResult({
        step: "Mock Session Creation",
        status: "success",
        message: `Mock session created with ID: ${mockSession.id}`,
        data: mockSession,
      })

      // Step 2: Test session verification
      addResult({
        step: "Session Verification",
        status: "loading",
        message: "Verifying mock session...",
      })

      try {
        const verifyResponse = await fetch("/api/purchase/verify-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: mockSession.id,
            idToken: token,
          }),
        })

        const verifyData = await verifyResponse.json()
        setVerificationResult(verifyData)

        if (verifyResponse.ok && verifyData.success) {
          addResult({
            step: "Session Verification",
            status: "success",
            message: "Session verification completed successfully",
            data: verifyData,
          })
        } else {
          addResult({
            step: "Session Verification",
            status: "error",
            message: `Verification failed: ${verifyData.error}`,
            error: verifyData.details,
          })
        }
      } catch (error) {
        addResult({
          step: "Session Verification",
          status: "error",
          message: `Verification error: ${error}`,
        })
      }

      // Step 3: Test purchase access
      addResult({
        step: "Purchase Access Check",
        status: "loading",
        message: "Checking purchase access...",
      })

      try {
        const accessResponse = await fetch("/api/user/product-box-access", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-user-id": user.uid,
          },
          body: JSON.stringify({
            productBoxId: mockSession.metadata.productBoxId,
          }),
        })

        const accessData = await accessResponse.json()

        if (accessResponse.ok && accessData.hasAccess) {
          addResult({
            step: "Purchase Access Check",
            status: "success",
            message: "User has access to product box",
            data: accessData,
          })
        } else {
          addResult({
            step: "Purchase Access Check",
            status: "warning",
            message: "User does not have access (expected for mock session)",
            data: accessData,
          })
        }
      } catch (error) {
        addResult({
          step: "Purchase Access Check",
          status: "error",
          message: `Access check error: ${error}`,
        })
      }

      // Step 4: Test unified purchase lookup
      addResult({
        step: "Unified Purchase Lookup",
        status: "loading",
        message: "Looking up unified purchases...",
      })

      try {
        const purchasesResponse = await fetch("/api/user/unified-purchases", {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-user-id": user.uid,
          },
        })

        const purchasesData = await purchasesResponse.json()

        if (purchasesResponse.ok) {
          const mockPurchase = purchasesData.purchases?.find(
            (p: any) => p.sessionId === mockSession.id || p.productBoxId === mockSession.metadata.productBoxId,
          )

          addResult({
            step: "Unified Purchase Lookup",
            status: mockPurchase ? "success" : "warning",
            message: mockPurchase
              ? "Found matching purchase in unified purchases"
              : "No matching purchase found (expected for mock session)",
            data: { totalPurchases: purchasesData.purchases?.length || 0, mockPurchase },
          })
        } else {
          addResult({
            step: "Unified Purchase Lookup",
            status: "error",
            message: `Purchase lookup failed: ${purchasesData.error}`,
          })
        }
      } catch (error) {
        addResult({
          step: "Unified Purchase Lookup",
          status: "error",
          message: `Purchase lookup error: ${error}`,
        })
      }
    } catch (error) {
      addResult({
        step: "General Error",
        status: "error",
        message: `Unexpected error: ${error}`,
      })
    } finally {
      setLoading(false)
    }
  }

  const testCustomSession = async () => {
    if (!user || !customSessionId) {
      toast({
        title: "Error",
        description: "User not authenticated or session ID missing",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    clearResults()

    try {
      const token = await user.getIdToken()

      addResult({
        step: "Custom Session Test",
        status: "loading",
        message: `Testing custom session: ${customSessionId}`,
      })

      const verifyResponse = await fetch("/api/purchase/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: customSessionId,
          idToken: token,
        }),
      })

      const verifyData = await verifyResponse.json()
      setVerificationResult(verifyData)

      if (verifyResponse.ok && verifyData.success) {
        addResult({
          step: "Custom Session Test",
          status: "success",
          message: "Custom session verification successful",
          data: verifyData,
        })
      } else {
        addResult({
          step: "Custom Session Test",
          status: "error",
          message: `Custom session verification failed: ${verifyData.error}`,
          error: verifyData.details,
        })
      }
    } catch (error) {
      addResult({
        step: "Custom Session Test",
        status: "error",
        message: `Custom session test error: ${error}`,
      })
    } finally {
      setLoading(false)
    }
  }

  const simulateRealCheckout = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    addResult({
      step: "Real Checkout Simulation",
      status: "loading",
      message: "Creating real Stripe checkout session...",
    })

    try {
      const token = await user.getIdToken()

      const checkoutResponse = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-user-id": user.uid,
        },
        body: JSON.stringify({
          productBoxId: sessionParams.productBoxId,
          successUrl: `${window.location.origin}/debug-stripe-purchase-flow?test=success`,
          cancelUrl: `${window.location.origin}/debug-stripe-purchase-flow?test=cancel`,
        }),
      })

      const checkoutData = await checkoutResponse.json()

      if (checkoutResponse.ok && checkoutData.url) {
        addResult({
          step: "Real Checkout Simulation",
          status: "success",
          message: "Real checkout session created successfully",
          data: { sessionId: checkoutData.sessionId, url: checkoutData.url },
        })

        toast({
          title: "Checkout Session Created",
          description: "Opening Stripe checkout in new tab",
        })

        // Open checkout in new tab
        window.open(checkoutData.url, "_blank")
      } else {
        addResult({
          step: "Real Checkout Simulation",
          status: "error",
          message: `Checkout creation failed: ${checkoutData.error}`,
          error: checkoutData.details,
        })
      }
    } catch (error) {
      addResult({
        step: "Real Checkout Simulation",
        status: "error",
        message: `Checkout simulation error: ${error}`,
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "loading":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "border-green-600 bg-green-600/10"
      case "error":
        return "border-red-600 bg-red-600/10"
      case "warning":
        return "border-yellow-600 bg-yellow-600/10"
      case "loading":
        return "border-blue-600 bg-blue-600/10"
      default:
        return "border-zinc-600 bg-zinc-600/10"
    }
  }

  // Show warning if not in development
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert className="max-w-md border-red-600 bg-red-600/10">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="text-red-200">
            This debug page is only available in development environments.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TestTube className="h-8 w-8 text-blue-500" />
            Stripe Purchase Flow Debug
          </h1>
          <p className="text-zinc-400 mt-1">Test and debug Stripe checkout sessions and purchase verification</p>
          <Badge variant="outline" className="mt-2 border-yellow-600 text-yellow-400">
            Development Only
          </Badge>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={clearResults} disabled={loading}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Results
          </Button>
        </div>
      </div>

      {!user && (
        <Alert className="border-red-600 bg-red-600/10">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="text-red-200">You must be logged in to use this debug tool.</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="mock-session" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="mock-session">Mock Session</TabsTrigger>
          <TabsTrigger value="custom-session">Custom Session</TabsTrigger>
          <TabsTrigger value="real-checkout">Real Checkout</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
        </TabsList>

        <TabsContent value="mock-session" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Mock Session Generator
              </CardTitle>
              <CardDescription>
                Generate mock Stripe checkout sessions for testing purchase verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="productBoxId">Product Box ID</Label>
                  <Input
                    id="productBoxId"
                    value={sessionParams.productBoxId}
                    onChange={(e) => setSessionParams((prev) => ({ ...prev, productBoxId: e.target.value }))}
                    placeholder="product-viral-clips-bundle"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount (cents)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={sessionParams.amount}
                    onChange={(e) =>
                      setSessionParams((prev) => ({ ...prev, amount: Number.parseInt(e.target.value) || 0 }))
                    }
                    placeholder="2999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerEmail">Customer Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={sessionParams.customerEmail}
                    onChange={(e) => setSessionParams((prev) => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder={user?.email || "test@example.com"}
                  />
                </div>
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={sessionParams.customerName}
                    onChange={(e) => setSessionParams((prev) => ({ ...prev, customerName: e.target.value }))}
                    placeholder={user?.displayName || "Test User"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="creatorUid">Creator UID (optional)</Label>
                  <Input
                    id="creatorUid"
                    value={sessionParams.creatorUid}
                    onChange={(e) => setSessionParams((prev) => ({ ...prev, creatorUid: e.target.value }))}
                    placeholder="creator-user-id"
                  />
                </div>
                <div>
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select
                    value={sessionParams.paymentStatus}
                    onValueChange={(value) => setSessionParams((prev) => ({ ...prev, paymentStatus: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="no_payment_required">No Payment Required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={sessionParams.currency}
                    onValueChange={(value) => setSessionParams((prev) => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD</SelectItem>
                      <SelectItem value="eur">EUR</SelectItem>
                      <SelectItem value="gbp">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={generateMockSession} disabled={loading}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate Mock Session
                </Button>
                {mockSession && (
                  <Button onClick={testCheckoutFlow} disabled={loading} className="bg-green-600 hover:bg-green-700">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        Test Purchase Flow
                      </>
                    )}
                  </Button>
                )}
              </div>

              {mockSession && (
                <div className="mt-6">
                  <Separator className="mb-4" />
                  <h3 className="text-lg font-semibold mb-3">Generated Mock Session</h3>
                  <div className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="text-green-400 border-green-600">
                        Session ID: {mockSession.id}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={copySessionId}>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy ID
                      </Button>
                    </div>
                    <pre className="text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                      {JSON.stringify(mockSession, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom-session" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Custom Session Testing
              </CardTitle>
              <CardDescription>Test with existing Stripe session IDs or custom session data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customSessionId">Stripe Session ID</Label>
                <Input
                  id="customSessionId"
                  value={customSessionId}
                  onChange={(e) => setCustomSessionId(e.target.value)}
                  placeholder="cs_test_..."
                />
              </div>

              <div>
                <Label htmlFor="customSessionData">Custom Session Data (JSON, optional)</Label>
                <Textarea
                  id="customSessionData"
                  value={customSessionData}
                  onChange={(e) => setCustomSessionData(e.target.value)}
                  placeholder='{"payment_status": "paid", "amount_total": 2999, ...}'
                  rows={6}
                />
              </div>

              <Button onClick={testCustomSession} disabled={loading || !customSessionId}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Custom Session
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="real-checkout" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Real Stripe Checkout
              </CardTitle>
              <CardDescription>Create actual Stripe checkout sessions for end-to-end testing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-yellow-600 bg-yellow-600/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-yellow-200">
                  This will create real Stripe checkout sessions. Use test mode only.
                </AlertDescription>
              </Alert>

              <div>
                <Label>Product Box ID for Real Checkout</Label>
                <Input
                  value={sessionParams.productBoxId}
                  onChange={(e) => setSessionParams((prev) => ({ ...prev, productBoxId: e.target.value }))}
                  placeholder="product-viral-clips-bundle"
                />
              </div>

              <Button onClick={simulateRealCheckout} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Create Real Checkout
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {testResults.length === 0 && !verificationResult && (
            <div className="text-center py-12">
              <TestTube className="h-16 w-16 text-zinc-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Test Results</h3>
              <p className="text-zinc-400">Run tests from other tabs to see results here.</p>
            </div>
          )}

          {verificationResult && (
            <Card
              className={`${verificationResult.success ? "border-green-600 bg-green-600/10" : "border-red-600 bg-red-600/10"} border`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {verificationResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  Purchase Verification Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={verificationResult.success ? "default" : "destructive"}>
                      {verificationResult.success ? "Success" : "Failed"}
                    </Badge>
                    {verificationResult.environment && (
                      <Badge variant="outline">{verificationResult.environment}</Badge>
                    )}
                    {verificationResult.stripeMode && (
                      <Badge variant="outline">Stripe: {verificationResult.stripeMode}</Badge>
                    )}
                  </div>

                  {verificationResult.error && (
                    <Alert className="border-red-600 bg-red-600/10">
                      <AlertDescription className="text-red-200 text-sm">
                        {verificationResult.error}
                        {verificationResult.details && (
                          <div className="mt-2 text-xs font-mono">{verificationResult.details}</div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {verificationResult.purchase && (
                    <details className="mt-3">
                      <summary className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-300">
                        View Purchase Data
                      </summary>
                      <pre className="mt-2 p-3 bg-zinc-800/50 rounded text-xs overflow-auto max-h-40">
                        {JSON.stringify(verificationResult.purchase, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {testResults.map((result, index) => (
            <Card key={index} className={`${getStatusColor(result.status)} border`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    {result.step}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {result.timestamp.toLocaleTimeString()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3">{result.message}</p>

                {result.error && (
                  <Alert className="mb-3 border-red-600 bg-red-600/10">
                    <AlertDescription className="text-red-200 text-xs font-mono">{result.error}</AlertDescription>
                  </Alert>
                )}

                {result.data && (
                  <details className="mt-3">
                    <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300">
                      View Step Data
                    </summary>
                    <pre className="mt-2 p-3 bg-zinc-800/50 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Summary */}
      {testResults.length > 0 && (
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle>Test Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {testResults.filter((r) => r.status === "success").length}
                </div>
                <div className="text-sm text-zinc-400">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {testResults.filter((r) => r.status === "error").length}
                </div>
                <div className="text-sm text-zinc-400">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {testResults.filter((r) => r.status === "warning").length}
                </div>
                <div className="text-sm text-zinc-400">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-zinc-400">{testResults.length}</div>
                <div className="text-sm text-zinc-400">Total Tests</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
