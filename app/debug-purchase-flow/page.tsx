"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Bug,
  Database,
  User,
  CreditCard,
  Package,
  Shield,
  FileText,
  Clock,
  AlertTriangle,
  Lightbulb,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface DebugStep {
  step: string
  status: "success" | "error" | "warning" | "info"
  data: any
  timestamp: string
  error?: string
}

interface DebugResult {
  success: boolean
  sessionId: string
  userId: string
  steps: DebugStep[]
  summary: {
    session: any
    metadata: any
    purchases: any
    userAccess: any
    contentAnalysis: any
    criticalIssues: string[]
    recommendations: string[]
  }
}

export default function DebugPurchaseFlowPage() {
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState("")
  const [userId, setUserId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DebugResult | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (user) {
      setUserId(user.uid)
    }
  }, [user])

  const runDebug = async () => {
    if (!sessionId.trim()) {
      toast({
        title: "Session ID Required",
        description: "Please enter a Stripe session ID to debug",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/debug/purchase-flow-trace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {}),
        },
        body: JSON.stringify({
          sessionId: sessionId.trim(),
          userId: userId.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
        toast({
          title: "Debug Complete",
          description: `Analyzed ${data.steps.length} steps`,
        })
      } else {
        throw new Error(data.error || "Debug failed")
      }
    } catch (error: any) {
      console.error("Debug failed:", error)
      toast({
        title: "Debug Failed",
        description: error.message,
        variant: "destructive",
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
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      success: "default",
      error: "destructive",
      warning: "secondary",
      info: "outline",
    }
    return <Badge variant={variants[status] as any}>{status}</Badge>
  }

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSteps(newExpanded)
  }

  const getStepIcon = (step: string) => {
    if (step.includes("Stripe")) return <CreditCard className="h-4 w-4" />
    if (step.includes("User")) return <User className="h-4 w-4" />
    if (step.includes("Metadata")) return <FileText className="h-4 w-4" />
    if (step.includes("Purchase")) return <Database className="h-4 w-4" />
    if (step.includes("Access")) return <Shield className="h-4 w-4" />
    if (step.includes("Content")) return <Package className="h-4 w-4" />
    return <Info className="h-4 w-4" />
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-white">Authentication Required</h2>
            <p className="text-gray-400 mb-4">Please log in to use the purchase flow debugger.</p>
            <Button onClick={() => (window.location.href = "/login")} className="bg-red-600 hover:bg-red-700">
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Bug className="h-10 w-10 text-red-500" />
            Purchase Flow Debugger
          </h1>
          <p className="text-gray-400 text-lg">
            Comprehensive debugging tool to trace purchase flow from Stripe to user access
          </p>
        </div>

        {/* Debug Controls */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Search className="h-5 w-5" />
              Debug Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionId" className="text-gray-300">
                  Stripe Session ID *
                </Label>
                <Input
                  id="sessionId"
                  placeholder="cs_live_... or cs_test_..."
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-gray-300">
                  User ID (Optional)
                </Label>
                <Input
                  id="userId"
                  placeholder="Firebase User ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <Button
              onClick={runDebug}
              disabled={!sessionId.trim() || loading}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Debugging...
                </>
              ) : (
                <>
                  <Bug className="h-4 w-4 mr-2" />
                  Run Debug Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-blue-400" />
                    <span className="font-medium text-white">Payment Status</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    <div>Status: {result.summary.session?.paymentStatus}</div>
                    <div>Amount: ${(result.summary.session?.amount / 100).toFixed(2)}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-green-400" />
                    <span className="font-medium text-white">Metadata</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    <div>Buyer UID: {result.summary.metadata?.buyerUid ? "✓" : "✗"}</div>
                    <div>Item ID: {result.summary.metadata?.itemId ? "✓" : "✗"}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-purple-400" />
                    <span className="font-medium text-white">Purchase Records</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    <div>Total: {result.summary.purchases?.total || 0}</div>
                    <div>Bundle: {result.summary.purchases?.inBundlePurchases || 0}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-orange-400" />
                    <span className="font-medium text-white">User Access</span>
                  </div>
                  <div className="text-sm text-gray-300">
                    <div>Has Access: {result.summary.userAccess?.hasItemAccess ? "✓" : "✗"}</div>
                    <div>User Exists: {result.summary.userAccess?.userExists ? "✓" : "✗"}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Critical Issues */}
            {result.summary.criticalIssues?.length > 0 && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Critical Issues Found:</strong>
                    <ul className="list-disc list-inside space-y-1">
                      {result.summary.criticalIssues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Recommendations */}
            {result.summary.recommendations?.length > 0 && (
              <Alert className="bg-blue-900/20 border-blue-800">
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <strong>Recommendations:</strong>
                    <ul className="list-disc list-inside space-y-1">
                      {result.summary.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Progress Bar */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Clock className="h-5 w-5" />
                  Debug Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Steps Completed</span>
                    <span className="text-white">{result.steps.length}</span>
                  </div>
                  <Progress value={100} className="bg-gray-700" />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Success: {result.steps.filter((s) => s.status === "success").length}</span>
                    <span>Warnings: {result.steps.filter((s) => s.status === "warning").length}</span>
                    <span>Errors: {result.steps.filter((s) => s.status === "error").length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Steps */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <FileText className="h-5 w-5" />
                  Detailed Debug Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.steps.map((step, index) => (
                    <Collapsible key={index}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-3 h-auto hover:bg-gray-700"
                          onClick={() => toggleStep(index)}
                        >
                          <div className="flex items-center gap-3">
                            {getStepIcon(step.step)}
                            {getStatusIcon(step.status)}
                            <span className="font-medium text-white">{step.step}</span>
                            {getStatusBadge(step.status)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              {new Date(step.timestamp).toLocaleTimeString()}
                            </span>
                            {expandedSteps.has(index) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 pr-3 pb-3">
                          <div className="bg-gray-900 p-3 rounded text-xs font-mono">
                            {step.error && (
                              <div className="text-red-400 mb-2">
                                <strong>Error:</strong> {step.error}
                              </div>
                            )}
                            <pre className="text-gray-300 overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(step.data, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
