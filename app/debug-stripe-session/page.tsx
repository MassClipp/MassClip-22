"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, TestTube, Info, Settings } from "lucide-react"

interface SessionResult {
  success: boolean
  session?: any
  stripeConfig?: any
  debug?: any
  error?: any
}

interface TestCheckoutResult {
  success: boolean
  sessionId?: string
  checkoutUrl?: string
  productId?: string
  priceId?: string
  amount?: number
  currency?: string
  error?: string
}

interface EnvironmentInfo {
  success: boolean
  environment?: any
  error?: string
}

interface StripeConfig {
  success: boolean
  config?: any
  connectionTest?: any
  error?: string
}

export default function DebugStripeSessionPage() {
  const [sessionId, setSessionId] = useState("")
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [envLoading, setEnvLoading] = useState(false)
  const [configLoading, setConfigLoading] = useState(false)
  const [result, setResult] = useState<SessionResult | null>(null)
  const [testResult, setTestResult] = useState<TestCheckoutResult | null>(null)
  const [envInfo, setEnvInfo] = useState<EnvironmentInfo | null>(null)
  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null)
  const { toast } = useToast()

  const validateSession = async () => {
    if (!sessionId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session ID",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/debug/stripe-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId: sessionId.trim() }),
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        toast({
          title: "Session Validated",
          description: "Stripe session details retrieved successfully",
        })
      } else {
        toast({
          title: "Validation Failed",
          description: data.error || "Failed to validate session",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Session validation error:", error)
      toast({
        title: "Error",
        description: "Failed to validate session",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testCheckoutCreation = async () => {
    setTestLoading(true)
    try {
      const response = await fetch("/api/debug/test-checkout-creation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productBoxId: "test-product-box",
          price: 9.99,
        }),
      })

      const data = await response.json()
      setTestResult(data)

      if (data.success) {
        toast({
          title: "Test Checkout Created",
          description: "Test Stripe checkout session created successfully",
        })
      } else {
        toast({
          title: "Test Failed",
          description: data.error || "Failed to create test checkout",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Test checkout error:", error)
      toast({
        title: "Error",
        description: "Failed to create test checkout",
        variant: "destructive",
      })
    } finally {
      setTestLoading(false)
    }
  }

  const getEnvironmentInfo = async () => {
    setEnvLoading(true)
    try {
      const response = await fetch("/api/debug/environment-info")
      const data = await response.json()
      setEnvInfo(data)

      if (data.success) {
        toast({
          title: "Environment Info Retrieved",
          description: "Environment configuration loaded successfully",
        })
      }
    } catch (error) {
      console.error("Environment info error:", error)
      toast({
        title: "Error",
        description: "Failed to get environment info",
        variant: "destructive",
      })
    } finally {
      setEnvLoading(false)
    }
  }

  const getStripeConfig = async () => {
    setConfigLoading(true)
    try {
      const response = await fetch("/api/debug/stripe-config")
      const data = await response.json()
      setStripeConfig(data)

      if (data.success) {
        toast({
          title: "Stripe Config Retrieved",
          description: "Stripe configuration loaded successfully",
        })
      }
    } catch (error) {
      console.error("Stripe config error:", error)
      toast({
        title: "Error",
        description: "Failed to get Stripe config",
        variant: "destructive",
      })
    } finally {
      setConfigLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Stripe Session Debug Tool</h1>
          <p className="text-gray-400">Debug and test Stripe checkout sessions</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Session Validation */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Search className="h-5 w-5" />
                Validate Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Enter Stripe session ID (cs_test_... or cs_live_...)"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <Button onClick={validateSession} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Validate Session
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Test Checkout Creation */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Checkout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">Create a test Stripe checkout session</p>
              <Button onClick={testCheckoutCreation} disabled={testLoading} className="w-full">
                {testLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Create Test Checkout
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Environment Info */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Info className="h-5 w-5" />
                Environment Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={getEnvironmentInfo} disabled={envLoading} className="w-full">
                {envLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Info className="h-4 w-4 mr-2" />
                    Get Environment Info
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Stripe Config */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Stripe Config
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={getStripeConfig} disabled={configLoading} className="w-full">
                {configLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Get Stripe Config
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {(result || testResult || envInfo || stripeConfig) && (
          <div className="space-y-6">
            {/* Session Validation Result */}
            {result && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    Session Validation Result
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "Success" : "Failed"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-900 p-4 rounded-lg text-sm overflow-auto text-gray-300">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Test Checkout Result */}
            {testResult && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    Test Checkout Result
                    <Badge variant={testResult.success ? "default" : "destructive"}>
                      {testResult.success ? "Success" : "Failed"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResult.success && testResult.checkoutUrl && (
                    <div className="mb-4">
                      <Button asChild className="w-full">
                        <a href={testResult.checkoutUrl} target="_blank" rel="noopener noreferrer">
                          Open Test Checkout
                        </a>
                      </Button>
                    </div>
                  )}
                  <pre className="bg-gray-900 p-4 rounded-lg text-sm overflow-auto text-gray-300">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Environment Info Result */}
            {envInfo && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    Environment Information
                    <Badge variant={envInfo.success ? "default" : "destructive"}>
                      {envInfo.success ? "Success" : "Failed"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-900 p-4 rounded-lg text-sm overflow-auto text-gray-300">
                    {JSON.stringify(envInfo, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Stripe Config Result */}
            {stripeConfig && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    Stripe Configuration
                    <Badge variant={stripeConfig.success ? "default" : "destructive"}>
                      {stripeConfig.success ? "Success" : "Failed"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-900 p-4 rounded-lg text-sm overflow-auto text-gray-300">
                    {JSON.stringify(stripeConfig, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
