"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Copy,
  ArrowLeft,
  Settings,
  Key,
  Database,
  Play,
  Bug,
} from "lucide-react"
import Link from "next/link"

interface DebugInfo {
  environment: {
    vercelEnv: string
    nodeEnv: string
    isPreview: boolean
  }
  stripe: {
    hasSecretKey: boolean
    keyPrefix: string
    isTestMode: boolean
    isLiveMode: boolean
    hasTestKey: boolean
    hasLiveKey: boolean
  }
  firebase: {
    hasConfig: boolean
    projectId: string
  }
  user: {
    uid: string
    email: string
    hasProfile: boolean
  }
}

interface TestResult {
  step: string
  success: boolean
  message: string
  details?: any
  error?: string
}

export default function DebugStripeTestConnectPage() {
  const { user } = useAuth()
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [testAccountId, setTestAccountId] = useState("")
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDebugging, setIsDebugging] = useState(false)

  useEffect(() => {
    if (user) {
      loadDebugInfo()
    }
  }, [user])

  const loadDebugInfo = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const token = await user.getIdToken()

      const response = await fetch("/api/debug/stripe-test-connect", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDebugInfo(data)
      } else {
        console.error("Failed to load debug info:", await response.text())
      }
    } catch (error) {
      console.error("Error loading debug info:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const runFullDiagnostic = async () => {
    if (!user || !testAccountId.trim()) return

    try {
      setIsDebugging(true)
      setTestResults([])
      const token = await user.getIdToken()

      const response = await fetch("/api/debug/stripe-test-connect/diagnostic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken: token,
          accountId: testAccountId.trim(),
        }),
      })

      const data = await response.json()
      setTestResults(data.results || [])
    } catch (error) {
      console.error("Error running diagnostic:", error)
      setTestResults([
        {
          step: "Diagnostic Request",
          success: false,
          message: "Failed to run diagnostic",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      ])
    } finally {
      setIsDebugging(false)
    }
  }

  const copyDebugInfo = () => {
    const debugData = {
      debugInfo,
      testResults,
      testAccountId,
      timestamp: new Date().toISOString(),
    }
    navigator.clipboard.writeText(JSON.stringify(debugData, null, 2))
  }

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStepIcon = (step: string) => {
    switch (step) {
      case "Environment Check":
        return <Settings className="h-4 w-4" />
      case "Stripe Configuration":
        return <Key className="h-4 w-4" />
      case "Firebase Auth":
        return <Database className="h-4 w-4" />
      default:
        return <Bug className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="outline" size="sm" className="border-gray-600 bg-transparent">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Stripe Test Connect Debug</h1>
            <p className="text-gray-400">Comprehensive diagnostic for test account linking issues</p>
          </div>
          <Button
            onClick={copyDebugInfo}
            variant="outline"
            size="sm"
            className="border-gray-600 ml-auto bg-transparent"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Debug Data
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Environment Info */}
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-white">Environment Information</CardTitle>
              </div>
              <CardDescription>Current environment and configuration status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-400">Loading debug information...</span>
                </div>
              ) : debugInfo ? (
                <div className="space-y-6">
                  {/* Environment */}
                  <div className="space-y-3">
                    <h4 className="text-white font-medium flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Environment
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Vercel Environment:</span>
                        <Badge variant={debugInfo.environment.isPreview ? "default" : "secondary"}>
                          {debugInfo.environment.vercelEnv}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Node Environment:</span>
                        <span className="text-white">{debugInfo.environment.nodeEnv}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Is Preview:</span>
                        {getStatusIcon(debugInfo.environment.isPreview)}
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* Stripe Config */}
                  <div className="space-y-3">
                    <h4 className="text-white font-medium flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Stripe Configuration
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Has Secret Key:</span>
                        {getStatusIcon(debugInfo.stripe.hasSecretKey)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Has Test Key:</span>
                        {getStatusIcon(debugInfo.stripe.hasTestKey)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Has Live Key:</span>
                        {getStatusIcon(debugInfo.stripe.hasLiveKey)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Key Prefix:</span>
                        <code className="text-white bg-gray-700 px-2 py-1 rounded text-xs">
                          {debugInfo.stripe.keyPrefix}
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Mode:</span>
                        <Badge variant={debugInfo.stripe.isTestMode ? "default" : "destructive"}>
                          {debugInfo.stripe.isTestMode ? "Test" : debugInfo.stripe.isLiveMode ? "Live" : "Unknown"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* Firebase */}
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">Firebase</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Has Config:</span>
                        {getStatusIcon(debugInfo.firebase.hasConfig)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Project ID:</span>
                        <span className="text-white">{debugInfo.firebase.projectId}</span>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-gray-700" />

                  {/* User */}
                  <div className="space-y-3">
                    <h4 className="text-white font-medium">User Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">UID:</span>
                        <code className="text-white bg-gray-700 px-2 py-1 rounded text-xs">
                          {debugInfo.user.uid.substring(0, 8)}...
                        </code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email:</span>
                        <span className="text-white">{debugInfo.user.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Has Profile:</span>
                        {getStatusIcon(debugInfo.user.hasProfile)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Failed to load debug information</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Diagnostic Tool */}
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-orange-400" />
                <CardTitle className="text-white">Account Diagnostic</CardTitle>
              </div>
              <CardDescription>Test account linking with detailed step-by-step analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountId" className="text-white">
                  Test Account ID
                </Label>
                <Input
                  id="accountId"
                  placeholder="acct_1234567890..."
                  value={testAccountId}
                  onChange={(e) => setTestAccountId(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <p className="text-xs text-gray-400">
                  Enter a Stripe test account ID from your Stripe dashboard (Connected accounts section)
                </p>
              </div>

              <Button onClick={runFullDiagnostic} disabled={!testAccountId.trim() || isDebugging} className="w-full">
                {isDebugging ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running Diagnostic...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Full Diagnostic
                  </>
                )}
              </Button>

              {testResults.length > 0 && (
                <div className="space-y-3">
                  <Separator className="bg-gray-700" />
                  <h4 className="text-white font-medium">Diagnostic Results</h4>
                  <ScrollArea className="h-96 w-full">
                    <div className="space-y-3">
                      {testResults.map((result, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            result.success ? "bg-green-900/20 border-green-700/50" : "bg-red-900/20 border-red-700/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {getStepIcon(result.step)}
                            {getStatusIcon(result.success)}
                            <span className="text-white font-medium">{result.step}</span>
                          </div>
                          <p className="text-sm text-gray-300 mb-2">{result.message}</p>
                          {result.error && <p className="text-sm text-red-400 mb-2">Error: {result.error}</p>}
                          {result.details && (
                            <details className="text-xs">
                              <summary className="text-gray-400 cursor-pointer">Details</summary>
                              <pre className="mt-2 p-2 bg-gray-800 rounded text-gray-300 overflow-x-auto">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
