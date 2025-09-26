"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import {
  Search,
  CheckCircle,
  XCircle,
  Database,
  RefreshCw,
  Copy,
  ExternalLink,
  AlertTriangle,
  Bot,
  Zap,
} from "lucide-react"

interface VexBundleDebugResult {
  timestamp: string
  testType: "content_analysis" | "bundle_creation" | "chat_integration"
  success: boolean
  error?: string
  data?: any
  steps: {
    step: string
    status: "success" | "error" | "warning" | "pending"
    message: string
    data?: any
    duration?: number
  }[]
}

export default function VexBundleDebugPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [testResults, setTestResults] = useState<VexBundleDebugResult[]>([])
  const [loading, setLoading] = useState(false)
  const [testMessage, setTestMessage] = useState("Make me a motivation bundle")
  const [selectedUserId, setSelectedUserId] = useState("")

  const runContentAnalysisTest = async () => {
    if (!user) return

    const result: VexBundleDebugResult = {
      timestamp: new Date().toISOString(),
      testType: "content_analysis",
      success: false,
      steps: [],
    }

    try {
      setLoading(true)
      const token = await user.getIdToken()

      // Step 1: Test content analysis endpoint
      result.steps.push({
        step: "Content Analysis API",
        status: "pending",
        message: "Testing /api/vex/analyze-uploads endpoint...",
      })

      const startTime = Date.now()
      const analysisResponse = await fetch("/api/vex/analyze-uploads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const analysisData = await analysisResponse.json()
      const duration = Date.now() - startTime

      if (analysisResponse.ok) {
        result.steps[0] = {
          step: "Content Analysis API",
          status: "success",
          message: `Found ${analysisData.totalContent || 0} content items`,
          data: {
            totalContent: analysisData.totalContent,
            categories: analysisData.categories,
            contentBreakdown: analysisData.contentBreakdown,
          },
          duration,
        }
      } else {
        result.steps[0] = {
          step: "Content Analysis API",
          status: "error",
          message: `API Error: ${analysisData.error || "Unknown error"}`,
          data: analysisData,
          duration,
        }
      }

      // Step 2: Check if analysis was stored
      result.steps.push({
        step: "Analysis Storage Check",
        status: "pending",
        message: "Checking if analysis results were stored...",
      })

      const storageStartTime = Date.now()
      const storageResponse = await fetch(`/api/vex/get-content-analysis`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const storageData = await storageResponse.json()
      const storageDuration = Date.now() - storageStartTime

      if (storageResponse.ok && storageData.analysis) {
        result.steps[1] = {
          step: "Analysis Storage Check",
          status: "success",
          message: `Analysis stored with ${storageData.analysis.contentItems?.length || 0} items`,
          data: {
            analysisId: storageData.analysis.id,
            contentCount: storageData.analysis.contentItems?.length,
            lastUpdated: storageData.analysis.lastUpdated,
          },
          duration: storageDuration,
        }
      } else {
        result.steps[1] = {
          step: "Analysis Storage Check",
          status: "error",
          message: "Analysis not found in storage",
          data: storageData,
          duration: storageDuration,
        }
      }

      result.success = result.steps.every((step) => step.status === "success")
      result.data = { analysisData, storageData }
    } catch (error) {
      result.steps.push({
        step: "Test Execution",
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        data: { error: error },
      })
      result.error = error instanceof Error ? error.message : "Unknown error"
    } finally {
      setLoading(false)
      setTestResults((prev) => [result, ...prev])
    }
  }

  const runBundleCreationTest = async () => {
    if (!user) return

    const result: VexBundleDebugResult = {
      timestamp: new Date().toISOString(),
      testType: "bundle_creation",
      success: false,
      steps: [],
    }

    try {
      setLoading(true)
      const token = await user.getIdToken()

      // Step 1: Test bundle creation API directly
      result.steps.push({
        step: "Bundle Creation API",
        status: "pending",
        message: "Testing /api/vex/create-bundle endpoint...",
      })

      const bundleData = {
        title: "Debug Test Bundle",
        description: "Test bundle created by debug tool",
        price: 9.99,
        category: "motivation",
        contentQuery: "motivation",
      }

      const startTime = Date.now()
      const bundleResponse = await fetch("/api/vex/create-bundle", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bundleData),
      })

      const bundleResult = await bundleResponse.json()
      const duration = Date.now() - startTime

      if (bundleResponse.ok) {
        result.steps[0] = {
          step: "Bundle Creation API",
          status: "success",
          message: `Bundle created successfully: ${bundleResult.bundleId}`,
          data: {
            bundleId: bundleResult.bundleId,
            title: bundleResult.bundle?.title,
            contentCount: bundleResult.bundle?.contentItems,
            stripeProductId: bundleResult.bundle?.stripeProductId,
          },
          duration,
        }

        // Step 2: Verify bundle in Firestore
        result.steps.push({
          step: "Bundle Verification",
          status: "pending",
          message: "Verifying bundle was saved to Firestore...",
        })

        const verifyStartTime = Date.now()
        const verifyResponse = await fetch(`/api/bundles/${bundleResult.bundleId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const verifyData = await verifyResponse.json()
        const verifyDuration = Date.now() - verifyStartTime

        if (verifyResponse.ok) {
          result.steps[1] = {
            step: "Bundle Verification",
            status: "success",
            message: "Bundle found in database",
            data: {
              bundleExists: true,
              title: verifyData.bundle?.title,
              contentItems: verifyData.bundle?.contentItems?.length,
            },
            duration: verifyDuration,
          }
        } else {
          result.steps[1] = {
            step: "Bundle Verification",
            status: "error",
            message: "Bundle not found in database",
            data: verifyData,
            duration: verifyDuration,
          }
        }
      } else {
        result.steps[0] = {
          step: "Bundle Creation API",
          status: "error",
          message: `Bundle creation failed: ${bundleResult.error || "Unknown error"}`,
          data: bundleResult,
          duration,
        }
      }

      result.success = result.steps.every((step) => step.status === "success")
      result.data = { bundleData, bundleResult }
    } catch (error) {
      result.steps.push({
        step: "Test Execution",
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        data: { error: error },
      })
      result.error = error instanceof Error ? error.message : "Unknown error"
    } finally {
      setLoading(false)
      setTestResults((prev) => [result, ...prev])
    }
  }

  const runChatIntegrationTest = async () => {
    if (!user) return

    const result: VexBundleDebugResult = {
      timestamp: new Date().toISOString(),
      testType: "chat_integration",
      success: false,
      steps: [],
    }

    try {
      setLoading(true)
      const token = await user.getIdToken()

      // Step 1: Test chat API with bundle creation request
      result.steps.push({
        step: "Chat API Integration",
        status: "pending",
        message: "Testing chat API with bundle creation request...",
      })

      const startTime = Date.now()
      const chatResponse = await fetch("/api/vex/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: testMessage,
          conversationId: `debug-${Date.now()}`,
        }),
      })

      const chatData = await chatResponse.json()
      const duration = Date.now() - startTime

      if (chatResponse.ok) {
        result.steps[0] = {
          step: "Chat API Integration",
          status: "success",
          message: "Chat API responded successfully",
          data: {
            response: chatData.response?.substring(0, 200) + "...",
            functionCalls: chatData.functionCalls,
            bundleCreated: chatData.bundleCreated,
          },
          duration,
        }

        // Step 2: Check if bundle was actually created
        if (chatData.bundleCreated) {
          result.steps.push({
            step: "Bundle Creation Verification",
            status: "success",
            message: `Bundle created via chat: ${chatData.bundleId}`,
            data: {
              bundleId: chatData.bundleId,
              bundleTitle: chatData.bundleTitle,
            },
          })
        } else {
          result.steps.push({
            step: "Bundle Creation Check",
            status: "warning",
            message: "No bundle was created during chat interaction",
            data: {
              chatResponse: chatData.response?.substring(0, 100),
            },
          })
        }
      } else {
        result.steps[0] = {
          step: "Chat API Integration",
          status: "error",
          message: `Chat API error: ${chatData.error || "Unknown error"}`,
          data: chatData,
          duration,
        }
      }

      result.success = result.steps.every((step) => step.status === "success" || step.status === "warning")
      result.data = { testMessage, chatData }
    } catch (error) {
      result.steps.push({
        step: "Test Execution",
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        data: { error: error },
      })
      result.error = error instanceof Error ? error.message : "Unknown error"
    } finally {
      setLoading(false)
      setTestResults((prev) => [result, ...prev])
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    })
  }

  const formatData = (data: any) => {
    return JSON.stringify(data, null, 2)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "pending":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Database className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Bot className="h-8 w-8 text-blue-400" />
            Vex Bundle Creation Debug
          </h1>
          <p className="text-zinc-400">Comprehensive debugging tool for Vex's bundle creation functionality</p>
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Database className="h-4 w-4" />
                Content Analysis Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-400 mb-3">Tests content analysis and storage functionality</p>
              <Button
                onClick={runContentAnalysisTest}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                {loading ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <Search className="mr-2 h-3 w-3" />}
                Test Analysis
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4" />
                Bundle Creation Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-zinc-400 mb-3">Tests direct bundle creation API</p>
              <Button
                onClick={runBundleCreationTest}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {loading ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <Zap className="mr-2 h-3 w-3" />}
                Test Creation
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4" />
                Chat Integration Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Input
                  placeholder="Test message"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white text-xs"
                />
                <Button
                  onClick={runChatIntegrationTest}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  {loading ? <RefreshCw className="mr-2 h-3 w-3 animate-spin" /> : <Bot className="mr-2 h-3 w-3" />}
                  Test Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Test Results</h2>

            {testResults.map((result, index) => (
              <Card key={index} className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="capitalize">{result.testType.replace("_", " ")}</span>
                      <span className="text-sm text-zinc-400">{new Date(result.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(formatData(result))}
                      className="text-zinc-400 hover:text-white"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Test Steps */}
                  <div className="space-y-2">
                    {result.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-start gap-3 p-3 bg-zinc-800 rounded-lg">
                        <div className="mt-0.5">{getStatusIcon(step.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">{step.step}</h4>
                            {step.duration && <span className="text-xs text-zinc-400">{step.duration}ms</span>}
                          </div>
                          <p className="text-sm text-zinc-300 mt-1">{step.message}</p>
                          {step.data && (
                            <details className="mt-2">
                              <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300">
                                View Step Data
                              </summary>
                              <pre className="mt-1 text-xs text-zinc-500 overflow-x-auto whitespace-pre-wrap bg-zinc-900 p-2 rounded">
                                {formatData(step.data)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Error Details */}
                  {result.error && (
                    <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                      <h4 className="font-semibold text-red-400 mb-2">Error Details</h4>
                      <p className="text-red-300 text-sm">{result.error}</p>
                    </div>
                  )}

                  {/* Raw Data */}
                  {result.data && (
                    <details className="cursor-pointer">
                      <summary className="text-sm font-medium text-zinc-300 hover:text-white">
                        View Raw Test Data
                      </summary>
                      <pre className="mt-2 text-xs text-zinc-400 overflow-x-auto whitespace-pre-wrap bg-zinc-800 p-4 rounded-lg max-h-96">
                        {formatData(result.data)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                onClick={() => window.open("/dashboard/vex", "_blank")}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Vex Chat
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open("/dashboard/bundles", "_blank")}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Bundles
              </Button>
              <Button
                variant="outline"
                onClick={() => setTestResults([])}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Clear Results
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
