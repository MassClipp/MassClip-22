"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw, DollarSign } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { StripeAccountLinker } from "@/components/stripe-account-linker"

interface DebugResult {
  step: string
  status: "success" | "error" | "warning" | "loading"
  message: string
  data?: any
  error?: string
  timestamp: Date
}

export default function StripeDebugPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [results, setResults] = useState<DebugResult[]>([])
  const [loading, setLoading] = useState(false)
  const [rawData, setRawData] = useState<any>(null)
  const [earningsFlow, setEarningsFlow] = useState<any>(null)

  const addResult = (result: Omit<DebugResult, "timestamp">) => {
    setResults((prev) => [...prev, { ...result, timestamp: new Date() }])
  }

  const clearResults = () => {
    setResults([])
    setRawData(null)
    setEarningsFlow(null)
  }

  const runEarningsFlowDebug = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/debug/earnings-flow", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-user-id": user.uid,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      setEarningsFlow(data)

      if (data.success) {
        toast({
          title: "Debug Complete",
          description: `Completed ${data.summary.stepsCompleted} steps with ${data.summary.stepsWithErrors} errors`,
        })
      } else {
        toast({
          title: "Debug Failed",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run earnings flow debug",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const runDiagnostics = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    clearResults()

    try {
      const token = await user.getIdToken()

      // Step 1: Check user authentication
      addResult({
        step: "User Authentication",
        status: "success",
        message: `User authenticated: ${user.uid}`,
        data: { uid: user.uid, email: user.email },
      })

      // Step 2: Test basic API connectivity
      addResult({
        step: "API Connectivity",
        status: "loading",
        message: "Testing API endpoint...",
      })

      try {
        const healthResponse = await fetch("/api/health")
        if (healthResponse.ok) {
          addResult({
            step: "API Connectivity",
            status: "success",
            message: "API endpoint is accessible",
          })
        } else {
          addResult({
            step: "API Connectivity",
            status: "error",
            message: `API health check failed: ${healthResponse.status}`,
          })
        }
      } catch (error) {
        addResult({
          step: "API Connectivity",
          status: "error",
          message: `API connectivity error: ${error}`,
        })
      }

      // Step 3: Check user profile and Stripe account
      addResult({
        step: "User Profile Check",
        status: "loading",
        message: "Checking user profile and Stripe account...",
      })

      try {
        const profileResponse = await fetch("/api/user-profile", {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-user-id": user.uid,
          },
        })

        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          addResult({
            step: "User Profile Check",
            status: "success",
            message: `Profile found. Stripe Account: ${profileData.stripeAccountId ? "Connected" : "Not Connected"}`,
            data: {
              stripeAccountId: profileData.stripeAccountId,
              username: profileData.username,
              plan: profileData.plan,
            },
          })
        } else {
          addResult({
            step: "User Profile Check",
            status: "error",
            message: `Profile check failed: ${profileResponse.status}`,
          })
        }
      } catch (error) {
        addResult({
          step: "User Profile Check",
          status: "error",
          message: `Profile check error: ${error}`,
        })
      }

      // Step 4: Test Stripe connection directly
      addResult({
        step: "Stripe Connection Test",
        status: "loading",
        message: "Testing direct Stripe API connection...",
      })

      try {
        const stripeTestResponse = await fetch("/api/debug/stripe-connection-test", {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-user-id": user.uid,
          },
        })

        const stripeTestData = await stripeTestResponse.json()
        if (stripeTestResponse.ok && stripeTestData.success) {
          addResult({
            step: "Stripe Connection Test",
            status: "success",
            message: "Stripe API connection successful",
            data: stripeTestData.data,
          })
        } else {
          addResult({
            step: "Stripe Connection Test",
            status: "error",
            message: `Stripe connection failed: ${stripeTestData.error}`,
            error: stripeTestData.details,
          })
        }
      } catch (error) {
        addResult({
          step: "Stripe Connection Test",
          status: "error",
          message: `Stripe connection error: ${error}`,
        })
      }

      // Step 5: Test earnings API endpoint
      addResult({
        step: "Earnings API Test",
        status: "loading",
        message: "Testing earnings API endpoint...",
      })

      try {
        const earningsResponse = await fetch("/api/dashboard/earnings?debug=true", {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-user-id": user.uid,
          },
        })

        const earningsData = await earningsResponse.json()
        setRawData(earningsData)

        if (earningsResponse.ok && earningsData.success) {
          addResult({
            step: "Earnings API Test",
            status: "success",
            message: "Earnings API responded successfully",
            data: {
              hasFirestoreData: !!earningsData.data.firestore,
              hasStripeData: !!earningsData.data.stripe,
              isSynchronized: !!earningsData.data.synchronized,
              errors: earningsData.data.errors,
            },
          })
        } else {
          addResult({
            step: "Earnings API Test",
            status: "error",
            message: `Earnings API failed: ${earningsData.error}`,
            error: earningsData.details,
          })
        }
      } catch (error) {
        addResult({
          step: "Earnings API Test",
          status: "error",
          message: `Earnings API error: ${error}`,
        })
      }

      // Step 6: Test Stripe account status
      addResult({
        step: "Stripe Account Status",
        status: "loading",
        message: "Checking Stripe account status...",
      })

      try {
        const statusResponse = await fetch("/api/stripe/connect/status", {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-user-id": user.uid,
          },
        })

        const statusData = await statusResponse.json()
        if (statusResponse.ok && statusData.success) {
          addResult({
            step: "Stripe Account Status",
            status: "success",
            message: "Stripe account status retrieved",
            data: statusData.data,
          })
        } else {
          addResult({
            step: "Stripe Account Status",
            status: "error",
            message: `Stripe status check failed: ${statusData.error}`,
          })
        }
      } catch (error) {
        addResult({
          step: "Stripe Account Status",
          status: "error",
          message: `Stripe status error: ${error}`,
        })
      }

      // Step 7: Test Stripe balance retrieval
      addResult({
        step: "Stripe Balance Check",
        status: "loading",
        message: "Checking Stripe balance...",
      })

      try {
        const balanceResponse = await fetch("/api/debug/stripe-balance", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-user-id": user.uid,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "get_balance" }),
        })

        const balanceData = await balanceResponse.json()
        if (balanceResponse.ok && balanceData.success) {
          addResult({
            step: "Stripe Balance Check",
            status: "success",
            message: "Stripe balance retrieved successfully",
            data: balanceData.data,
          })
        } else {
          addResult({
            step: "Stripe Balance Check",
            status: "error",
            message: `Balance check failed: ${balanceData.error}`,
          })
        }
      } catch (error) {
        addResult({
          step: "Stripe Balance Check",
          status: "error",
          message: `Balance check error: ${error}`,
        })
      }

      // Step 8: Test transaction retrieval
      addResult({
        step: "Transaction Retrieval",
        status: "loading",
        message: "Fetching recent transactions...",
      })

      try {
        const transactionResponse = await fetch("/api/debug/stripe-transactions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-user-id": user.uid,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "get_transactions", limit: 10 }),
        })

        const transactionData = await transactionResponse.json()
        if (transactionResponse.ok && transactionData.success) {
          addResult({
            step: "Transaction Retrieval",
            status: "success",
            message: `Retrieved ${transactionData.data.transactions?.length || 0} transactions`,
            data: {
              transactionCount: transactionData.data.transactions?.length || 0,
              transactions: transactionData.data.transactions?.slice(0, 3), // Show first 3
            },
          })
        } else {
          addResult({
            step: "Transaction Retrieval",
            status: "error",
            message: `Transaction retrieval failed: ${transactionData.error}`,
          })
        }
      } catch (error) {
        addResult({
          step: "Transaction Retrieval",
          status: "error",
          message: `Transaction retrieval error: ${error}`,
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stripe Integration Debug</h1>
          <p className="text-zinc-400 mt-1">Comprehensive testing of Stripe API integration</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={clearResults} disabled={loading}>
            Clear Results
          </Button>
          <Button onClick={runEarningsFlowDebug} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Test Earnings Flow
              </>
            )}
          </Button>
          <Button onClick={runDiagnostics} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Diagnostics
              </>
            )}
          </Button>
        </div>
      </div>

      {results.length === 0 && !loading && !earningsFlow && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Click "Test Earnings Flow" to specifically debug financial data retrieval, or "Run Diagnostics" for a full
            system test.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="earnings-flow" className="space-y-6">
        <TabsList>
          <TabsTrigger value="earnings-flow">Earnings Flow Debug</TabsTrigger>
          <TabsTrigger value="results">General Tests</TabsTrigger>
          <TabsTrigger value="raw-data">Raw API Data</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings-flow" className="space-y-4">
          {earningsFlow ? (
            <div className="space-y-4">
              {earningsFlow.success ? (
                <Alert className="border-green-600 bg-green-600/10">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-green-200">
                    Earnings flow debug completed successfully. Check the steps below for detailed results.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-600 bg-red-600/10">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-200">
                    {earningsFlow.error} - {earningsFlow.recommendation}
                  </AlertDescription>
                </Alert>
              )}

              {earningsFlow.debugSteps?.map((step: any, index: number) => (
                <Card
                  key={index}
                  className={`${step.result === "success" ? "border-green-600 bg-green-600/10" : step.result === "error" ? "border-red-600 bg-red-600/10" : "border-blue-600 bg-blue-600/10"} border`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {step.result === "success" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : step.result === "error" ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Loader2 className="h-4 w-4 text-blue-500" />
                        )}
                        Step {step.step}: {step.action}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
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
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 text-zinc-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Earnings Flow Debug</h3>
              <p className="text-zinc-400 mb-6">
                This will test the complete flow of fetching financial data from your connected Stripe account.
              </p>
              <Button onClick={runEarningsFlowDebug} disabled={loading} className="bg-green-600 hover:bg-green-700">
                Start Earnings Debug
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {results.map((result, index) => (
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
                      View Data Details
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

        <TabsContent value="raw-data">
          <Card className="bg-zinc-900/60 border-zinc-800/50">
            <CardHeader>
              <CardTitle>Raw API Response Data</CardTitle>
              <CardDescription>Complete response from the earnings API endpoint</CardDescription>
            </CardHeader>
            <CardContent>
              {rawData ? (
                <pre className="p-4 bg-zinc-800/50 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              ) : (
                <p className="text-zinc-500 text-center py-8">No data available. Run diagnostics first.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Account Linking Section */}
      {results.some((r) => r.step === "User Profile Check" && r.message.includes("Not Connected")) && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Fix Connection Issue</h2>
          <StripeAccountLinker />
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              After linking your account, run the diagnostics again to verify the connection.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Summary */}
      {(results.length > 0 || earningsFlow) && (
        <Card className="bg-zinc-900/60 border-zinc-800/50">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {results.filter((r) => r.status === "success").length + (earningsFlow?.summary?.stepsCompleted || 0)}
                </div>
                <div className="text-sm text-zinc-400">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {results.filter((r) => r.status === "error").length + (earningsFlow?.summary?.stepsWithErrors || 0)}
                </div>
                <div className="text-sm text-zinc-400">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {results.filter((r) => r.status === "warning").length}
                </div>
                <div className="text-sm text-zinc-400">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-zinc-400">
                  {results.length + (earningsFlow?.debugSteps?.length || 0)}
                </div>
                <div className="text-sm text-zinc-400">Total Tests</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
