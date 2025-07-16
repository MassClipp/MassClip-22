"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-firebase-auth"
import { AlertTriangle, CheckCircle, XCircle, Play, RefreshCw, Copy } from "lucide-react"

interface MockSession {
  id: string
  payment_status: string
  amount_total: number
  currency: string
  customer_email: string
  metadata: {
    productBoxId: string
    userId?: string
    connectedAccountId?: string
  }
  payment_intent: string
}

interface TestResult {
  success: boolean
  data?: any
  error?: string
  timestamp: string
  duration: number
}

export default function DebugStripePurchasePage() {
  const { user, loading } = useAuth()
  const [isDevEnvironment, setIsDevEnvironment] = useState(false)
  const [mockSession, setMockSession] = useState<MockSession>({
    id: "",
    payment_status: "paid",
    amount_total: 2999,
    currency: "usd",
    customer_email: "",
    metadata: {
      productBoxId: "",
      userId: "",
      connectedAccountId: "",
    },
    payment_intent: "",
  })
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProductBox, setSelectedProductBox] = useState("")
  const [availableProductBoxes, setAvailableProductBoxes] = useState<any[]>([])

  // Check if we're in development environment
  useEffect(() => {
    const isDev =
      process.env.NODE_ENV === "development" ||
      window.location.hostname === "localhost" ||
      window.location.hostname.includes("vercel.app")
    setIsDevEnvironment(isDev)
  }, [])

  // Load available product boxes for testing
  useEffect(() => {
    const loadProductBoxes = async () => {
      try {
        const response = await fetch("/api/creator/product-boxes")
        if (response.ok) {
          const data = await response.json()
          setAvailableProductBoxes(data.productBoxes || [])
        }
      } catch (error) {
        console.error("Failed to load product boxes:", error)
      }
    }
    loadProductBoxes()
  }, [])

  // Auto-fill user data when user is loaded
  useEffect(() => {
    if (user) {
      setMockSession((prev) => ({
        ...prev,
        customer_email: user.email || "",
        metadata: {
          ...prev.metadata,
          userId: user.uid,
        },
      }))
    }
  }, [user])

  // Generate mock session ID
  const generateMockSessionId = () => {
    const sessionId = `cs_test_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    setMockSession((prev) => ({ ...prev, id: sessionId }))
  }

  // Generate mock payment intent ID
  const generateMockPaymentIntent = () => {
    const paymentIntentId = `pi_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    setMockSession((prev) => ({ ...prev, payment_intent: paymentIntentId }))
  }

  // Copy session ID to clipboard
  const copySessionId = async () => {
    if (mockSession.id) {
      await navigator.clipboard.writeText(mockSession.id)
    }
  }

  // Test the purchase verification API
  const testPurchaseVerification = async () => {
    if (!mockSession.id || !mockSession.metadata.productBoxId) {
      addTestResult(false, null, "Session ID and Product Box ID are required")
      return
    }

    setIsLoading(true)
    const startTime = Date.now()

    try {
      const idToken = user ? await user.getIdToken() : null

      const response = await fetch("/api/purchase/verify-and-complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: mockSession.id,
          productBoxId: mockSession.metadata.productBoxId,
          idToken,
        }),
      })

      const data = await response.json()
      const duration = Date.now() - startTime

      if (response.ok) {
        addTestResult(true, data, null, duration)
      } else {
        addTestResult(false, data, data.error || "API request failed", duration)
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      addTestResult(false, null, error.message, duration)
    } finally {
      setIsLoading(false)
    }
  }

  // Test Stripe session retrieval (mock)
  const testStripeSessionRetrieval = async () => {
    if (!mockSession.id) {
      addTestResult(false, null, "Session ID is required")
      return
    }

    setIsLoading(true)
    const startTime = Date.now()

    try {
      // Simulate Stripe API call delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      const mockStripeResponse = {
        id: mockSession.id,
        object: "checkout.session",
        payment_status: mockSession.payment_status,
        amount_total: mockSession.amount_total,
        currency: mockSession.currency,
        customer_email: mockSession.customer_email,
        metadata: mockSession.metadata,
        payment_intent: mockSession.payment_intent,
        mode: "payment",
        status: "complete",
      }

      const duration = Date.now() - startTime
      addTestResult(true, mockStripeResponse, null, duration)
    } catch (error: any) {
      const duration = Date.now() - startTime
      addTestResult(false, null, error.message, duration)
    } finally {
      setIsLoading(false)
    }
  }

  // Simulate complete purchase flow
  const simulateCompletePurchaseFlow = async () => {
    if (!mockSession.id || !mockSession.metadata.productBoxId) {
      addTestResult(false, null, "Session ID and Product Box ID are required for complete flow")
      return
    }

    setIsLoading(true)
    const startTime = Date.now()

    try {
      // Step 1: Simulate Stripe session retrieval
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Step 2: Test our verification API
      const idToken = user ? await user.getIdToken() : null

      const response = await fetch("/api/purchase/verify-and-complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: mockSession.id,
          productBoxId: mockSession.metadata.productBoxId,
          idToken,
        }),
      })

      const data = await response.json()
      const duration = Date.now() - startTime

      const flowResult = {
        steps: [
          { name: "Stripe Session Retrieval", status: "success", duration: 300 },
          { name: "Purchase Verification", status: response.ok ? "success" : "failed", duration: duration - 300 },
          { name: "Database Update", status: response.ok ? "success" : "failed", duration: 50 },
          { name: "Access Grant", status: response.ok && user ? "success" : "skipped", duration: 25 },
        ],
        totalDuration: duration,
        finalResult: data,
      }

      if (response.ok) {
        addTestResult(true, flowResult, null, duration)
      } else {
        addTestResult(false, flowResult, data.error || "Purchase flow failed", duration)
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      addTestResult(false, null, error.message, duration)
    } finally {
      setIsLoading(false)
    }
  }

  // Add test result to history
  const addTestResult = (success: boolean, data: any, error: string | null, duration = 0) => {
    const result: TestResult = {
      success,
      data,
      error,
      timestamp: new Date().toISOString(),
      duration,
    }
    setTestResults((prev) => [result, ...prev.slice(0, 9)]) // Keep last 10 results
  }

  // Clear test results
  const clearResults = () => {
    setTestResults([])
  }

  // Load preset scenarios
  const loadPresetScenario = (scenario: string) => {
    switch (scenario) {
      case "successful-purchase":
        setMockSession({
          id: `cs_test_${Date.now()}`,
          payment_status: "paid",
          amount_total: 2999,
          currency: "usd",
          customer_email: user?.email || "test@example.com",
          metadata: {
            productBoxId: selectedProductBox || "test-product-box-id",
            userId: user?.uid || "",
            connectedAccountId: "acct_test123",
          },
          payment_intent: `pi_test_${Date.now()}`,
        })
        break
      case "failed-payment":
        setMockSession({
          id: `cs_test_${Date.now()}`,
          payment_status: "unpaid",
          amount_total: 2999,
          currency: "usd",
          customer_email: user?.email || "test@example.com",
          metadata: {
            productBoxId: selectedProductBox || "test-product-box-id",
            userId: user?.uid || "",
          },
          payment_intent: `pi_test_${Date.now()}`,
        })
        break
      case "anonymous-purchase":
        setMockSession({
          id: `cs_test_${Date.now()}`,
          payment_status: "paid",
          amount_total: 1999,
          currency: "usd",
          customer_email: "anonymous@example.com",
          metadata: {
            productBoxId: selectedProductBox || "test-product-box-id",
          },
          payment_intent: `pi_test_${Date.now()}`,
        })
        break
    }
  }

  if (!isDevEnvironment) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>This debug page is only available in development environments.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stripe Purchase Debug Tool</h1>
          <p className="text-muted-foreground">Test and debug Stripe checkout sessions and purchase verification</p>
        </div>
        <Badge variant="destructive">Development Only</Badge>
      </div>

      {/* User Status */}
      <Alert>
        <AlertDescription>
          {user ? (
            <span className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Authenticated as: {user.email} (UID: {user.uid})
            </span>
          ) : (
            <span className="flex items-center">
              <XCircle className="h-4 w-4 mr-2 text-red-500" />
              Not authenticated - testing anonymous purchases
            </span>
          )}
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="setup">Setup Mock Data</TabsTrigger>
          <TabsTrigger value="test">Run Tests</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mock Session Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Mock Stripe Session</CardTitle>
                <CardDescription>Configure mock checkout session data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionId">Session ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="sessionId"
                      value={mockSession.id}
                      onChange={(e) => setMockSession((prev) => ({ ...prev, id: e.target.value }))}
                      placeholder="cs_test_..."
                    />
                    <Button onClick={generateMockSessionId} variant="outline" size="sm">
                      Generate
                    </Button>
                    <Button onClick={copySessionId} variant="outline" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select
                    value={mockSession.payment_status}
                    onValueChange={(value) => setMockSession((prev) => ({ ...prev, payment_status: value }))}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (cents)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={mockSession.amount_total}
                      onChange={(e) =>
                        setMockSession((prev) => ({ ...prev, amount_total: Number.parseInt(e.target.value) || 0 }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={mockSession.currency}
                      onChange={(e) => setMockSession((prev) => ({ ...prev, currency: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Customer Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={mockSession.customer_email}
                    onChange={(e) => setMockSession((prev) => ({ ...prev, customer_email: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentIntent">Payment Intent ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="paymentIntent"
                      value={mockSession.payment_intent}
                      onChange={(e) => setMockSession((prev) => ({ ...prev, payment_intent: e.target.value }))}
                      placeholder="pi_..."
                    />
                    <Button onClick={generateMockPaymentIntent} variant="outline" size="sm">
                      Generate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Session Metadata</CardTitle>
                <CardDescription>Configure session metadata and product information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="productBoxSelect">Select Product Box</Label>
                  <Select
                    value={selectedProductBox}
                    onValueChange={(value) => {
                      setSelectedProductBox(value)
                      setMockSession((prev) => ({
                        ...prev,
                        metadata: { ...prev.metadata, productBoxId: value },
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product box" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProductBoxes.map((box) => (
                        <SelectItem key={box.id} value={box.id}>
                          {box.title} (${(box.price / 100).toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productBoxId">Product Box ID</Label>
                  <Input
                    id="productBoxId"
                    value={mockSession.metadata.productBoxId}
                    onChange={(e) =>
                      setMockSession((prev) => ({
                        ...prev,
                        metadata: { ...prev.metadata, productBoxId: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    value={mockSession.metadata.userId || ""}
                    onChange={(e) =>
                      setMockSession((prev) => ({
                        ...prev,
                        metadata: { ...prev.metadata, userId: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="connectedAccountId">Connected Account ID</Label>
                  <Input
                    id="connectedAccountId"
                    value={mockSession.metadata.connectedAccountId || ""}
                    onChange={(e) =>
                      setMockSession((prev) => ({
                        ...prev,
                        metadata: { ...prev.metadata, connectedAccountId: e.target.value },
                      }))
                    }
                    placeholder="acct_..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preset Scenarios */}
          <Card>
            <CardHeader>
              <CardTitle>Preset Scenarios</CardTitle>
              <CardDescription>Load common testing scenarios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => loadPresetScenario("successful-purchase")} variant="outline">
                  Successful Purchase
                </Button>
                <Button onClick={() => loadPresetScenario("failed-payment")} variant="outline">
                  Failed Payment
                </Button>
                <Button onClick={() => loadPresetScenario("anonymous-purchase")} variant="outline">
                  Anonymous Purchase
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mock Stripe API</CardTitle>
                <CardDescription>Test session retrieval simulation</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={testStripeSessionRetrieval} disabled={isLoading || !mockSession.id} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Test Session Retrieval
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Purchase Verification</CardTitle>
                <CardDescription>Test our verification API</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={testPurchaseVerification}
                  disabled={isLoading || !mockSession.id || !mockSession.metadata.productBoxId}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Test Verification
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Complete Flow</CardTitle>
                <CardDescription>Test entire purchase flow</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={simulateCompletePurchaseFlow}
                  disabled={isLoading || !mockSession.id || !mockSession.metadata.productBoxId}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Test Complete Flow
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Current Session Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Current Mock Session</CardTitle>
              <CardDescription>Preview of the session data that will be used for testing</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea value={JSON.stringify(mockSession, null, 2)} readOnly className="font-mono text-sm" rows={12} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Test Results ({testResults.length})</h3>
            <Button onClick={clearResults} variant="outline" size="sm">
              Clear Results
            </Button>
          </div>

          {testResults.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No test results yet. Run some tests to see results here.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span className="font-semibold">{result.success ? "Success" : "Failed"}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(result.timestamp).toLocaleTimeString()}
                        {result.duration > 0 && ` (${result.duration}ms)`}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {result.error && (
                      <Alert className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{result.error}</AlertDescription>
                      </Alert>
                    )}
                    {result.data && (
                      <Textarea
                        value={JSON.stringify(result.data, null, 2)}
                        readOnly
                        className="font-mono text-sm"
                        rows={8}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
