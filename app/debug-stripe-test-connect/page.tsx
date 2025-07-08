"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Copy, ArrowLeft, Settings, Key, Database } from "lucide-react"
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
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
            <p className="text-gray-400">Diagnose test account linking issues</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <span className="text-gray-400">Key Prefix:</span>
                      <code className="text-white bg-gray-700 px-2 py-1 rounded text-xs">
                        {debugInfo.stripe.keyPrefix}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Mode:</span>
                      <Badge variant={debugInfo.stripe.isTestMode ? "default" : "destructive"}>
                        {debugInfo.stripe.isTestMode ? "Test" : debugInfo.stripe.isLiveMode ? "Live" : "Unknown"}
                      </Badge>
                    </div>
                  </div>
                </div>

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
      </div>
    </div>
  )
}
