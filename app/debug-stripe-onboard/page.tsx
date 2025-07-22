"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Play, Bug, Server, MousePointer } from "lucide-react"

interface DiagnosticResult {
  name: string
  status: "success" | "error" | "warning" | "loading"
  message: string
  details?: any
}

export default function StripeOnboardDiagnosticPage() {
  const { user } = useAuth()
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [onboardTest, setOnboardTest] = useState<any>(null)
  const [buttonTest, setButtonTest] = useState<any>(null)

  const addDiagnostic = (diagnostic: DiagnosticResult) => {
    setDiagnostics((prev) => [...prev, diagnostic])
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    setDiagnostics([])

    // Test 1: Environment Variables
    addDiagnostic({
      name: "Environment Variables",
      status: "loading",
      message: "Checking environment configuration...",
    })

    try {
      const envResponse = await fetch("/api/debug/environment-check")
      const envData = await envResponse.json()

      setDiagnostics((prev) =>
        prev.map((d) =>
          d.name === "Environment Variables"
            ? {
                ...d,
                status: envData.allPresent ? "success" : "error",
                message: envData.allPresent
                  ? "All required environment variables are present"
                  : "Missing required environment variables",
                details: envData,
              }
            : d,
        ),
      )
    } catch (error) {
      setDiagnostics((prev) =>
        prev.map((d) =>
          d.name === "Environment Variables"
            ? {
                ...d,
                status: "error",
                message: "Failed to check environment variables",
                details: error,
              }
            : d,
        ),
      )
    }

    // Test 2: Stripe Connection
    addDiagnostic({
      name: "Stripe API Connection",
      status: "loading",
      message: "Testing Stripe API connection...",
    })

    try {
      const stripeResponse = await fetch("/api/test-stripe-connection")
      const stripeData = await stripeResponse.json()

      setDiagnostics((prev) =>
        prev.map((d) =>
          d.name === "Stripe API Connection"
            ? {
                ...d,
                status: stripeData.connected ? "success" : "error",
                message: stripeData.message || "Stripe connection test completed",
                details: stripeData,
              }
            : d,
        ),
      )
    } catch (error) {
      setDiagnostics((prev) =>
        prev.map((d) =>
          d.name === "Stripe API Connection"
            ? {
                ...d,
                status: "error",
                message: "Failed to connect to Stripe API",
                details: error,
              }
            : d,
        ),
      )
    }

    // Test 3: Firebase Authentication
    addDiagnostic({
      name: "Firebase Authentication",
      status: "loading",
      message: "Checking Firebase auth status...",
    })

    if (user) {
      try {
        const token = await user.getIdToken()
        setDiagnostics((prev) =>
          prev.map((d) =>
            d.name === "Firebase Authentication"
              ? {
                  ...d,
                  status: "success",
                  message: "User authenticated successfully",
                  details: { uid: user.uid, hasToken: !!token },
                }
              : d,
          ),
        )
      } catch (error) {
        setDiagnostics((prev) =>
          prev.map((d) =>
            d.name === "Firebase Authentication"
              ? {
                  ...d,
                  status: "error",
                  message: "Failed to get Firebase ID token",
                  details: error,
                }
              : d,
          ),
        )
      }
    } else {
      setDiagnostics((prev) =>
        prev.map((d) =>
          d.name === "Firebase Authentication"
            ? {
                ...d,
                status: "error",
                message: "User not authenticated",
              }
            : d,
        ),
      )
    }

    // Test 4: Firestore Connection
    addDiagnostic({
      name: "Firestore Database",
      status: "loading",
      message: "Testing Firestore connection...",
    })

    try {
      const firestoreResponse = await fetch("/api/debug/firestore-test")
      const firestoreData = await firestoreResponse.json()

      setDiagnostics((prev) =>
        prev.map((d) =>
          d.name === "Firestore Database"
            ? {
                ...d,
                status: firestoreData.success ? "success" : "error",
                message: firestoreData.message || "Firestore test completed",
                details: firestoreData,
              }
            : d,
        ),
      )
    } catch (error) {
      setDiagnostics((prev) =>
        prev.map((d) =>
          d.name === "Firestore Database"
            ? {
                ...d,
                status: "error",
                message: "Failed to connect to Firestore",
                details: error,
              }
            : d,
        ),
      )
    }

    setIsRunning(false)
  }

  const testOnboardEndpoint = async () => {
    if (!user) {
      setOnboardTest({ error: "User not authenticated" })
      return
    }

    setOnboardTest({ loading: true })

    try {
      const idToken = await user.getIdToken()

      const response = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json()

      setOnboardTest({
        status: response.status,
        success: response.ok,
        data: data,
        headers: Object.fromEntries(response.headers.entries()),
      })
    } catch (error) {
      setOnboardTest({
        error: error instanceof Error ? error.message : "Unknown error",
        details: error,
      })
    }
  }

  const testButtonFunctionality = async () => {
    setButtonTest({ loading: true })

    try {
      // Test if the button click handler exists
      const testResults: any = {
        timestamp: new Date().toISOString(),
        userAuthenticated: !!user,
        windowLocation: window.location.href,
        tests: [],
      }

      // Test 1: Check if Stripe Connect button component exists
      const stripeButtons = document.querySelectorAll('[class*="stripe"], [class*="connect"], button')
      testResults.tests.push({
        name: "Button Elements Found",
        result: stripeButtons.length > 0,
        count: stripeButtons.length,
        details: Array.from(stripeButtons).map((btn) => ({
          tagName: btn.tagName,
          className: btn.className,
          textContent: btn.textContent?.trim(),
        })),
      })

      // Test 2: Check for JavaScript errors
      const originalError = window.onerror
      const errors: string[] = []

      window.onerror = (message) => {
        if (typeof message === "string") {
          errors.push(message)
        }
        return false
      }

      // Test 3: Try to trigger a button click programmatically
      const createButton = document.querySelector('button[class*="bg-blue"]') as HTMLButtonElement
      const connectButton = document.querySelector('button[class*="bg-green"]') as HTMLButtonElement

      testResults.tests.push({
        name: "Create Button Found",
        result: !!createButton,
        enabled: createButton ? !createButton.disabled : false,
        text: createButton?.textContent?.trim(),
      })

      testResults.tests.push({
        name: "Connect Button Found",
        result: !!connectButton,
        enabled: connectButton ? !connectButton.disabled : false,
        text: connectButton?.textContent?.trim(),
      })

      // Test 4: Check console for errors
      testResults.consoleErrors = errors

      // Restore original error handler
      window.onerror = originalError

      setButtonTest({
        success: true,
        results: testResults,
      })
    } catch (error) {
      setButtonTest({
        error: error instanceof Error ? error.message : "Unknown error",
        details: error,
      })
    }
  }

  const getStatusIcon = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case "loading":
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
    }
  }

  const getStatusBadge = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Success</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
      case "loading":
        return <Badge variant="secondary">Running...</Badge>
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Stripe Connect Diagnostics</h1>
        <p className="text-zinc-400 mt-1">Debug and troubleshoot Stripe Connect integration issues</p>
      </div>

      <Tabs defaultValue="diagnostics">
        <TabsList>
          <TabsTrigger value="diagnostics">System Diagnostics</TabsTrigger>
          <TabsTrigger value="endpoint">Endpoint Test</TabsTrigger>
          <TabsTrigger value="buttons">Button Test</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics" className="mt-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Bug className="h-5 w-5" />
                    System Diagnostics
                  </CardTitle>
                  <CardDescription>Run comprehensive tests to identify configuration issues</CardDescription>
                </div>
                <Button onClick={runDiagnostics} disabled={isRunning} className="bg-blue-600 hover:bg-blue-700">
                  {isRunning ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  Run Diagnostics
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {diagnostics.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  Click "Run Diagnostics" to start testing your Stripe Connect configuration
                </div>
              ) : (
                <div className="space-y-4">
                  {diagnostics.map((diagnostic, index) => (
                    <div key={index} className="border border-zinc-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(diagnostic.status)}
                          <h3 className="font-medium text-white">{diagnostic.name}</h3>
                        </div>
                        {getStatusBadge(diagnostic.status)}
                      </div>
                      <p className="text-sm text-zinc-400 mb-2">{diagnostic.message}</p>
                      {diagnostic.details && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300">View Details</summary>
                          <pre className="mt-2 p-2 bg-zinc-800 rounded text-zinc-300 overflow-auto">
                            {JSON.stringify(diagnostic.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoint" className="mt-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Server className="h-5 w-5" />
                    Onboard Endpoint Test
                  </CardTitle>
                  <CardDescription>Test the /api/stripe/connect/onboard endpoint directly</CardDescription>
                </div>
                <Button onClick={testOnboardEndpoint} disabled={!user || onboardTest?.loading} variant="outline">
                  {onboardTest?.loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Test Endpoint
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!user ? (
                <div className="text-center py-8 text-zinc-500">Please log in to test the onboard endpoint</div>
              ) : !onboardTest ? (
                <div className="text-center py-8 text-zinc-500">
                  Click "Test Endpoint" to test the Stripe Connect onboard API
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-zinc-400">Status Code</label>
                      <div
                        className={`text-lg font-mono ${
                          onboardTest.status >= 200 && onboardTest.status < 300 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {onboardTest.status || "N/A"}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-zinc-400">Success</label>
                      <div className={`text-lg ${onboardTest.success ? "text-green-400" : "text-red-400"}`}>
                        {onboardTest.success ? "✅ Yes" : "❌ No"}
                      </div>
                    </div>
                  </div>

                  {onboardTest.error && (
                    <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                      <h4 className="font-medium text-red-300 mb-2">Error</h4>
                      <p className="text-sm text-red-300">{onboardTest.error}</p>
                    </div>
                  )}

                  {onboardTest.data && (
                    <div>
                      <h4 className="font-medium mb-2 text-white">Response Data</h4>
                      <pre className="p-4 bg-zinc-800 rounded text-sm text-zinc-300 overflow-auto">
                        {JSON.stringify(onboardTest.data, null, 2)}
                      </pre>
                    </div>
                  )}

                  {onboardTest.headers && (
                    <details>
                      <summary className="cursor-pointer text-zinc-400 hover:text-zinc-300">Response Headers</summary>
                      <pre className="mt-2 p-4 bg-zinc-800 rounded text-sm text-zinc-300 overflow-auto">
                        {JSON.stringify(onboardTest.headers, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buttons" className="mt-6">
          <Card className="bg-zinc-900/60 border-zinc-800/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <MousePointer className="h-5 w-5" />
                    Button Functionality Test
                  </CardTitle>
                  <CardDescription>Test if the Stripe Connect buttons are working properly</CardDescription>
                </div>
                <Button onClick={testButtonFunctionality} disabled={buttonTest?.loading} variant="outline">
                  {buttonTest?.loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Test Buttons
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!buttonTest ? (
                <div className="text-center py-8 text-zinc-500">
                  Click "Test Buttons" to check if the Stripe Connect buttons are functioning
                </div>
              ) : (
                <div className="space-y-4">
                  {buttonTest.error ? (
                    <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                      <h4 className="font-medium text-red-300 mb-2">Error</h4>
                      <p className="text-sm text-red-300">{buttonTest.error}</p>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-medium mb-2 text-white">Button Test Results</h4>
                      <pre className="p-4 bg-zinc-800 rounded text-sm text-zinc-300 overflow-auto">
                        {JSON.stringify(buttonTest.results, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
