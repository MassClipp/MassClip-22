"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw, ShoppingCart, Database, CreditCard } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface DebugStep {
  step: string
  status: "success" | "error" | "warning" | "loading" | "pending"
  message: string
  data?: any
  error?: string
  timestamp: Date
}

export default function ProductBoxPurchaseDebugPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [steps, setSteps] = useState<DebugStep[]>([])
  const [loading, setLoading] = useState(false)
  const [testProductBoxId, setTestProductBoxId] = useState("")
  const [availableProductBoxes, setAvailableProductBoxes] = useState<any[]>([])
  const [rawResponses, setRawResponses] = useState<{ [key: string]: any }>({})

  const addStep = (step: Omit<DebugStep, "timestamp">) => {
    setSteps((prev) => [...prev, { ...step, timestamp: new Date() }])
  }

  const updateStep = (stepName: string, updates: Partial<DebugStep>) => {
    setSteps((prev) =>
      prev.map((step) => (step.step === stepName ? { ...step, ...updates, timestamp: new Date() } : step)),
    )
  }

  const clearSteps = () => {
    setSteps([])
    setRawResponses({})
  }

  const runFullDiagnostic = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    clearSteps()

    try {
      // Step 1: Check user authentication
      addStep({
        step: "User Authentication",
        status: "loading",
        message: "Verifying user authentication...",
      })

      let idToken
      try {
        idToken = await user.getIdToken(true)
        addStep({
          step: "User Authentication",
          status: "success",
          message: `User authenticated: ${user.uid}`,
          data: {
            uid: user.uid,
            email: user.email,
            tokenLength: idToken.length,
          },
        })
      } catch (error) {
        addStep({
          step: "User Authentication",
          status: "error",
          message: "Failed to get authentication token",
          error: error instanceof Error ? error.message : "Unknown error",
        })
        return
      }

      // Step 2: Fetch available product boxes
      addStep({
        step: "Fetch Product Boxes",
        status: "loading",
        message: "Fetching available product boxes...",
      })

      try {
        const response = await fetch(`/api/creator/${user.uid}/product-boxes`, {
          headers: {
            "Content-Type": "application/json",
          },
        })

        const data = await response.json()
        setRawResponses((prev) => ({ ...prev, productBoxes: data }))

        if (response.ok && data.productBoxes) {
          const activeBoxes = data.productBoxes.filter((box: any) => box.active)
          setAvailableProductBoxes(activeBoxes)

          addStep({
            step: "Fetch Product Boxes",
            status: "success",
            message: `Found ${activeBoxes.length} active product boxes`,
            data: {
              total: data.productBoxes.length,
              active: activeBoxes.length,
              boxes: activeBoxes.map((box: any) => ({
                id: box.id,
                title: box.title,
                price: box.price,
                currency: box.currency,
              })),
            },
          })

          // Auto-select first product box for testing
          if (activeBoxes.length > 0 && !testProductBoxId) {
            setTestProductBoxId(activeBoxes[0].id)
          }
        } else {
          addStep({
            step: "Fetch Product Boxes",
            status: "error",
            message: "Failed to fetch product boxes",
            error: data.error || "Unknown error",
          })
        }
      } catch (error) {
        addStep({
          step: "Fetch Product Boxes",
          status: "error",
          message: "Network error fetching product boxes",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }

      // Step 3: Test Firestore access
      addStep({
        step: "Firestore Access Test",
        status: "loading",
        message: "Testing direct Firestore access...",
      })

      try {
        const response = await fetch("/api/debug/firestore-test", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            collection: "productBoxes",
            action: "list",
            userId: user.uid,
          }),
        })

        const data = await response.json()
        setRawResponses((prev) => ({ ...prev, firestoreTest: data }))

        if (response.ok && data.success) {
          addStep({
            step: "Firestore Access Test",
            status: "success",
            message: "Firestore access working correctly",
            data: data.data,
          })
        } else {
          addStep({
            step: "Firestore Access Test",
            status: "error",
            message: "Firestore access failed",
            error: data.error || "Unknown error",
          })
        }
      } catch (error) {
        addStep({
          step: "Firestore Access Test",
          status: "error",
          message: "Firestore test request failed",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }

      // Step 4: Test user profile access
      addStep({
        step: "User Profile Check",
        status: "loading",
        message: "Checking user profile and Stripe account...",
      })

      try {
        const response = await fetch("/api/user-profile", {
          headers: {
            Authorization: `Bearer ${idToken}`,
            "x-user-id": user.uid,
          },
        })

        const data = await response.json()
        setRawResponses((prev) => ({ ...prev, userProfile: data }))

        if (response.ok) {
          addStep({
            step: "User Profile Check",
            status: "success",
            message: `Profile found. Stripe Account: ${data.stripeAccountId ? "Connected" : "Not Connected"}`,
            data: {
              stripeAccountId: data.stripeAccountId,
              username: data.username,
              plan: data.plan,
              email: data.email,
            },
          })
        } else {
          addStep({
            step: "User Profile Check",
            status: "error",
            message: "Failed to fetch user profile",
            error: data.error || `HTTP ${response.status}`,
          })
        }
      } catch (error) {
        addStep({
          step: "User Profile Check",
          status: "error",
          message: "User profile request failed",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }

      // Step 5: Test Stripe Connect configuration
      if (rawResponses.userProfile?.stripeAccountId) {
        addStep({
          step: "Stripe Connect Test",
          status: "loading",
          message: "Testing Stripe Connect configuration...",
        })

        try {
          const response = await fetch("/api/debug/stripe-connect-test", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              creatorId: user.uid,
            }),
          })

          const data = await response.json()
          setRawResponses((prev) => ({ ...prev, stripeConnectTest: data }))

          if (response.ok && data.success) {
            const canAcceptPayments = data.data.canAcceptPayments
            const checkoutTestPassed = data.data.checkoutTest?.success

            addStep({
              step: "Stripe Connect Test",
              status: canAcceptPayments && checkoutTestPassed ? "success" : "warning",
              message: `Stripe Connect ${canAcceptPayments ? "configured correctly" : "needs attention"}. Checkout test ${checkoutTestPassed ? "passed" : "failed"}.`,
              data: data.data,
            })
          } else {
            addStep({
              step: "Stripe Connect Test",
              status: "error",
              message: "Stripe Connect test failed",
              error: data.error || "Unknown error",
            })
          }
        } catch (error) {
          addStep({
            step: "Stripe Connect Test",
            status: "error",
            message: "Stripe Connect test request failed",
            error: error instanceof Error ? error.message : "Unknown error",
          })
        }
      }
    } catch (error) {
      addStep({
        step: "General Error",
        status: "error",
        message: "Unexpected error during diagnostic",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  const testSpecificProductBox = async (productBoxId: string) => {
    if (!user || !productBoxId) {
      toast({
        title: "Error",
        description: "User not authenticated or no product box selected",
        variant: "destructive",
      })
      return
    }

    const testSteps: DebugStep[] = []

    try {
      // Clear previous test steps
      setSteps((prev) => prev.filter((step) => !step.step.startsWith("Test Purchase")))

      const idToken = await user.getIdToken(true)

      // Step 1: Test product box fetch
      addStep({
        step: "Test Purchase - Fetch Product Box",
        status: "loading",
        message: `Fetching product box ${productBoxId}...`,
      })

      try {
        const response = await fetch(`/api/debug/product-box-test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            productBoxId,
            action: "fetch",
          }),
        })

        const data = await response.json()
        setRawResponses((prev) => ({ ...prev, [`productBox_${productBoxId}`]: data }))

        if (response.ok && data.success) {
          updateStep("Test Purchase - Fetch Product Box", {
            status: "success",
            message: "Product box fetched successfully",
            data: data.data,
          })
        } else {
          updateStep("Test Purchase - Fetch Product Box", {
            status: "error",
            message: "Failed to fetch product box",
            error: data.error || "Unknown error",
          })
          return
        }
      } catch (error) {
        updateStep("Test Purchase - Fetch Product Box", {
          status: "error",
          message: "Network error fetching product box",
          error: error instanceof Error ? error.message : "Unknown error",
        })
        return
      }

      // Step 2: Test checkout session creation
      addStep({
        step: "Test Purchase - Create Checkout",
        status: "loading",
        message: "Testing checkout session creation...",
      })

      try {
        const response = await fetch(`/api/creator/product-boxes/${productBoxId}/checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            successUrl: `${window.location.origin}/purchase/success?session_id={CHECKOUT_SESSION_ID}&product_box_id=${productBoxId}`,
            cancelUrl: window.location.href,
          }),
        })

        const data = await response.json()
        setRawResponses((prev) => ({ ...prev, [`checkout_${productBoxId}`]: data }))

        if (response.ok && data.url) {
          updateStep("Test Purchase - Create Checkout", {
            status: "success",
            message: "Checkout session created successfully",
            data: {
              sessionId: data.sessionId,
              url: data.url,
            },
          })

          toast({
            title: "Checkout Test Successful",
            description: "Checkout session was created successfully. Check the data for details.",
          })
        } else {
          updateStep("Test Purchase - Create Checkout", {
            status: "error",
            message: "Failed to create checkout session",
            error: data.error || `HTTP ${response.status}`,
          })
        }
      } catch (error) {
        updateStep("Test Purchase - Create Checkout", {
          status: "error",
          message: "Network error creating checkout session",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    } catch (error) {
      addStep({
        step: "Test Purchase - General Error",
        status: "error",
        message: "Unexpected error during purchase test",
        error: error instanceof Error ? error.message : "Unknown error",
      })
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
        return <AlertCircle className="h-4 w-4 text-zinc-500" />
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Box Purchase Debug</h1>
          <p className="text-zinc-400 mt-1">Comprehensive testing of product box purchase flow</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={clearSteps} disabled={loading}>
            Clear Results
          </Button>
          <Button onClick={runFullDiagnostic} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Full Diagnostic
              </>
            )}
          </Button>
        </div>
      </div>

      {steps.length === 0 && !loading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Click "Run Full Diagnostic" to test the complete product box purchase flow step by step.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="steps" className="space-y-6">
        <TabsList>
          <TabsTrigger value="steps">Debug Steps</TabsTrigger>
          <TabsTrigger value="product-test">Product Box Test</TabsTrigger>
          <TabsTrigger value="raw-data">Raw API Responses</TabsTrigger>
        </TabsList>

        <TabsContent value="steps" className="space-y-4">
          {steps.map((step, index) => (
            <Card key={index} className={`${getStatusColor(step.status)} border`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(step.status)}
                    {step.step}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {step.timestamp.toLocaleTimeString()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-3">{step.message}</p>

                {step.error && (
                  <Alert className="mb-3 border-red-600 bg-red-600/10">
                    <AlertDescription className="text-red-200 text-xs font-mono">{step.error}</AlertDescription>
                  </Alert>
                )}

                {step.data && (
                  <details className="mt-3">
                    <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300">
                      View Step Data
                    </summary>
                    <pre className="mt-2 p-3 bg-zinc-800/50 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(step.data, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="product-test" className="space-y-4">
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Test Specific Product Box Purchase
              </CardTitle>
              <CardDescription>Test the complete purchase flow for a specific product box</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableProductBoxes.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Product Box:</label>
                    <select
                      value={testProductBoxId}
                      onChange={(e) => setTestProductBoxId(e.target.value)}
                      className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded text-white"
                    >
                      <option value="">Select a product box...</option>
                      {availableProductBoxes.map((box) => (
                        <option key={box.id} value={box.id}>
                          {box.title} - ${box.price} {box.currency?.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    onClick={() => testSpecificProductBox(testProductBoxId)}
                    disabled={!testProductBoxId || loading}
                    className="w-full"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Test Purchase Flow
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
                  <p className="text-zinc-400">No product boxes found. Run the full diagnostic first.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw-data">
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader>
              <CardTitle>Raw API Response Data</CardTitle>
              <CardDescription>Complete responses from all API endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(rawResponses).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(rawResponses).map(([key, data]) => (
                    <details key={key} className="border border-zinc-700 rounded">
                      <summary className="p-3 bg-zinc-800/50 cursor-pointer hover:bg-zinc-800/70 font-medium">
                        {key}
                      </summary>
                      <pre className="p-4 bg-zinc-800/30 text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </details>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 text-center py-8">No data available. Run diagnostics first.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary */}
      {steps.length > 0 && (
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {steps.filter((s) => s.status === "success").length}
                </div>
                <div className="text-sm text-zinc-400">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {steps.filter((s) => s.status === "error").length}
                </div>
                <div className="text-sm text-zinc-400">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {steps.filter((s) => s.status === "warning").length}
                </div>
                <div className="text-sm text-zinc-400">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-zinc-400">{steps.length}</div>
                <div className="text-sm text-zinc-400">Total Tests</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
