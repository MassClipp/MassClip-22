"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Settings,
  Database,
  Package,
  Download,
  Clock,
  FileText,
  ChevronDown,
  ChevronRight,
  Play,
  Users,
  HardDrive,
  Zap,
  Target,
  Bug,
  Activity,
  TrendingUp,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface PurchaseFlowLog {
  stage: string
  timestamp: Date
  status: "success" | "error" | "warning" | "info"
  data: any
  error?: string
  duration?: number
}

interface ComprehensiveDebugResult {
  sessionId: string
  userId?: string
  logs: PurchaseFlowLog[]
  summary: {
    totalStages: number
    successfulStages: number
    errorStages: number
    warningStages: number
    totalDuration: number
  }
  stripeData?: any
  firestoreData?: any
  bundleContent?: any
  deliveryData?: any
  recommendations: string[]
  errors: string[]
}

interface SimulationConfig {
  sessionId: string
  userId: string
  simulationMode: boolean
  customProductBoxId?: string
  customUserEmail?: string
}

export default function ComprehensivePurchaseDebugPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [debugResult, setDebugResult] = useState<ComprehensiveDebugResult | null>(null)
  const [config, setConfig] = useState<SimulationConfig>({
    sessionId: "",
    userId: "",
    simulationMode: false,
  })
  const [activeLogIndex, setActiveLogIndex] = useState<number | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    if (user) {
      setConfig((prev) => ({ ...prev, userId: user.uid }))
    }
  }, [user])

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && config.sessionId) {
      const interval = setInterval(() => {
        runComprehensiveDebug()
      }, 10000) // Refresh every 10 seconds

      return () => clearInterval(interval)
    }
  }, [autoRefresh, config.sessionId])

  const runComprehensiveDebug = async () => {
    if (!config.sessionId) {
      toast({
        title: "Session ID Required",
        description: "Please enter a session ID to debug",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/debug/purchase-flow-comprehensive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {}),
        },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setDebugResult(data.result)
        toast({
          title: "Debug Complete",
          description: `Analyzed ${data.result.summary.totalStages} stages in ${data.result.summary.totalDuration}ms`,
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
        return <Clock className="h-4 w-4 text-gray-400" />
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-white">Authentication Required</h2>
            <p className="text-gray-400 mb-4">Please log in to use the comprehensive debug tools.</p>
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
            Comprehensive Purchase Debug
          </h1>
          <p className="text-gray-400 text-lg">
            Advanced debugging tool for purchase verification and bundle content delivery
          </p>
        </div>

        <Tabs defaultValue="debug" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800">
            <TabsTrigger value="debug" className="flex items-center gap-2 data-[state=active]:bg-gray-700">
              <Search className="h-4 w-4" />
              Debug Session
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2 data-[state=active]:bg-gray-700">
              <Activity className="h-4 w-4" />
              Flow Logs
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2 data-[state=active]:bg-gray-700">
              <TrendingUp className="h-4 w-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="simulation" className="flex items-center gap-2 data-[state=active]:bg-gray-700">
              <Target className="h-4 w-4" />
              Simulation
            </TabsTrigger>
          </TabsList>

          {/* Debug Session Tab */}
          <TabsContent value="debug">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Configuration Panel */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Settings className="h-5 w-5" />
                    Debug Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessionId" className="text-gray-300">
                      Session ID
                    </Label>
                    <Input
                      id="sessionId"
                      placeholder="cs_live_... or cs_test_..."
                      value={config.sessionId}
                      onChange={(e) => setConfig((prev) => ({ ...prev, sessionId: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userId" className="text-gray-300">
                      User ID
                    </Label>
                    <Input
                      id="userId"
                      placeholder="Firebase User ID"
                      value={config.userId}
                      onChange={(e) => setConfig((prev) => ({ ...prev, userId: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="simulationMode"
                      checked={config.simulationMode}
                      onChange={(e) => setConfig((prev) => ({ ...prev, simulationMode: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="simulationMode" className="text-gray-300">
                      Simulation Mode
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoRefresh"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="autoRefresh" className="text-gray-300">
                      Auto Refresh (10s)
                    </Label>
                  </div>

                  <Button
                    onClick={runComprehensiveDebug}
                    disabled={!config.sessionId || loading}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Debugging...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Run Debug
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Summary Panel */}
              {debugResult && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Activity className="h-5 w-5" />
                      Debug Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{debugResult.summary.successfulStages}</div>
                        <div className="text-sm text-gray-400">Success</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{debugResult.summary.errorStages}</div>
                        <div className="text-sm text-gray-400">Errors</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Total Stages</span>
                        <span className="text-white">{debugResult.summary.totalStages}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Warnings</span>
                        <span className="text-yellow-400">{debugResult.summary.warningStages}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Duration</span>
                        <span className="text-white">{formatDuration(debugResult.summary.totalDuration)}</span>
                      </div>
                    </div>

                    <Progress
                      value={(debugResult.summary.successfulStages / debugResult.summary.totalStages) * 100}
                      className="bg-gray-700"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Zap className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        sessionId: "cs_test_" + Math.random().toString(36).substring(2, 15),
                        simulationMode: true,
                      }))
                    }
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Generate Test Session
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                    onClick={() => setDebugResult(null)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear Results
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                    onClick={() => {
                      if (debugResult) {
                        const blob = new Blob([JSON.stringify(debugResult, null, 2)], { type: "application/json" })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.href = url
                        a.download = `debug-${debugResult.sessionId}-${Date.now()}.json`
                        a.click()
                      }
                    }}
                    disabled={!debugResult}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Results
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                    onClick={() => {
                      router.push("/dashboard/purchases")
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Go to My Purchases
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results Display */}
            {debugResult && (
              <div className="mt-6 space-y-6">
                {/* Errors and Recommendations */}
                {(debugResult.errors.length > 0 || debugResult.recommendations.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {debugResult.errors.length > 0 && (
                      <Alert variant="destructive" className="bg-red-900/20 border-red-800">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <strong>Critical Errors:</strong>
                            <ul className="list-disc list-inside space-y-1">
                              {debugResult.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {debugResult.recommendations.length > 0 && (
                      <Alert className="bg-blue-900/20 border-blue-800">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-1">
                            <strong>Recommendations:</strong>
                            <ul className="list-disc list-inside space-y-1">
                              {debugResult.recommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Data Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="h-4 w-4 text-blue-400" />
                        <span className="font-medium text-white">Stripe Data</span>
                      </div>
                      {debugResult.stripeData ? (
                        <div className="text-sm text-gray-300">
                          <div>Status: {debugResult.stripeData.payment_status}</div>
                          <div>Amount: ${(debugResult.stripeData.amount_total / 100).toFixed(2)}</div>
                        </div>
                      ) : (
                        <Badge variant="secondary">Not Available</Badge>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-green-400" />
                        <span className="font-medium text-white">Firestore Data</span>
                      </div>
                      {debugResult.firestoreData ? (
                        <div className="text-sm text-gray-300">
                          <div>Status: {debugResult.firestoreData.status}</div>
                          <div>Items: {debugResult.firestoreData.items?.length || 0}</div>
                        </div>
                      ) : (
                        <Badge variant="secondary">Not Found</Badge>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-purple-400" />
                        <span className="font-medium text-white">Bundle Content</span>
                      </div>
                      {debugResult.bundleContent?.contentAnalysis ? (
                        <div className="text-sm text-gray-300">
                          <div>Valid: {debugResult.bundleContent.contentAnalysis.validItems?.length || 0}</div>
                          <div>Invalid: {debugResult.bundleContent.contentAnalysis.invalidItems?.length || 0}</div>
                        </div>
                      ) : (
                        <Badge variant="secondary">Not Analyzed</Badge>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Download className="h-4 w-4 text-orange-400" />
                        <span className="font-medium text-white">Delivery Test</span>
                      </div>
                      {debugResult.deliveryData ? (
                        <div className="text-sm text-gray-300">
                          <div>Success: {debugResult.deliveryData.successful?.length || 0}</div>
                          <div>Failed: {debugResult.deliveryData.failed?.length || 0}</div>
                        </div>
                      ) : (
                        <Badge variant="secondary">Not Tested</Badge>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Flow Logs Tab */}
          <TabsContent value="logs">
            {debugResult?.logs ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Activity className="h-5 w-5" />
                    Purchase Flow Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {debugResult.logs.map((log, index) => (
                      <Collapsible key={index}>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-between p-3 h-auto hover:bg-gray-700"
                            onClick={() => setActiveLogIndex(activeLogIndex === index ? null : index)}
                          >
                            <div className="flex items-center gap-3">
                              {getStatusIcon(log.status)}
                              <span className="font-medium text-white">{log.stage}</span>
                              {getStatusBadge(log.status)}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">{formatDuration(log.duration || 0)}</span>
                              {activeLogIndex === index ? (
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
                              <div className="text-gray-400 mb-2">
                                Timestamp: {new Date(log.timestamp).toISOString()}
                              </div>
                              {log.error && <div className="text-red-400 mb-2">Error: {log.error}</div>}
                              <pre className="text-gray-300 overflow-x-auto">{JSON.stringify(log.data, null, 2)}</pre>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-white">No Logs Available</h3>
                  <p className="text-gray-400">Run a debug session to see detailed flow logs</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis">
            {debugResult?.bundleContent?.contentAnalysis ? (
              <div className="space-y-6">
                {/* Content Analysis Overview */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <TrendingUp className="h-5 w-5" />
                      Content Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-400 mb-2">
                          {debugResult.bundleContent.contentAnalysis.validItems?.length || 0}
                        </div>
                        <div className="text-gray-400">Valid Items</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-400 mb-2">
                          {debugResult.bundleContent.contentAnalysis.invalidItems?.length || 0}
                        </div>
                        <div className="text-gray-400">Invalid Items</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-yellow-400 mb-2">
                          {debugResult.bundleContent.contentAnalysis.missingItems?.length || 0}
                        </div>
                        <div className="text-gray-400">Missing Items</div>
                      </div>
                    </div>

                    {debugResult.bundleContent.contentAnalysis.totalSize > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-700">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Total Bundle Size:</span>
                          <span className="text-white font-medium">
                            {formatBytes(debugResult.bundleContent.contentAnalysis.totalSize)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Content Types Breakdown */}
                {debugResult.bundleContent.contentAnalysis.contentTypes && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white">Content Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(debugResult.bundleContent.contentAnalysis.contentTypes).map(([type, count]) => (
                          <div key={type} className="text-center">
                            <div className="text-2xl font-bold text-blue-400">{count as number}</div>
                            <div className="text-gray-400 capitalize">{type}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Delivery Analysis */}
                {debugResult.deliveryData && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <Download className="h-5 w-5" />
                        Delivery Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-400 mb-2">
                            {debugResult.deliveryData.successful?.length || 0}
                          </div>
                          <div className="text-gray-400">Accessible</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-red-400 mb-2">
                            {debugResult.deliveryData.failed?.length || 0}
                          </div>
                          <div className="text-gray-400">Failed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-400 mb-2">
                            {debugResult.deliveryData.estimatedDownloadTime || 0}s
                          </div>
                          <div className="text-gray-400">Est. Download</div>
                        </div>
                      </div>

                      {debugResult.deliveryData.totalSize > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-700">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Total Delivery Size:</span>
                            <span className="text-white font-medium">
                              {formatBytes(debugResult.deliveryData.totalSize)}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-8 text-center">
                  <TrendingUp className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-white">No Analysis Data</h3>
                  <p className="text-gray-400">Run a debug session to see detailed analysis</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Simulation Tab */}
          <TabsContent value="simulation">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Target className="h-5 w-5" />
                  Purchase Simulation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Alert className="bg-blue-900/20 border-blue-800">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Simulation mode allows you to test the purchase flow without real Stripe data. This is useful for
                      testing system behavior with mock scenarios.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Simulation Scenarios</h3>

                      <Button
                        onClick={() => {
                          setConfig({
                            sessionId: "cs_test_simulation_success_" + Date.now(),
                            userId: user?.uid || "test-user",
                            simulationMode: true,
                          })
                          toast({ title: "Success scenario configured" })
                        }}
                        className="w-full justify-start bg-green-700 hover:bg-green-600"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Perfect Purchase Flow
                      </Button>

                      <Button
                        onClick={() => {
                          setConfig({
                            sessionId: "cs_test_simulation_missing_content_" + Date.now(),
                            userId: user?.uid || "test-user",
                            simulationMode: true,
                          })
                          toast({ title: "Missing content scenario configured" })
                        }}
                        className="w-full justify-start bg-yellow-700 hover:bg-yellow-600"
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Missing Content Items
                      </Button>

                      <Button
                        onClick={() => {
                          setConfig({
                            sessionId: "cs_test_simulation_delivery_fail_" + Date.now(),
                            userId: user?.uid || "test-user",
                            simulationMode: true,
                          })
                          toast({ title: "Delivery failure scenario configured" })
                        }}
                        className="w-full justify-start bg-red-700 hover:bg-red-600"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Delivery Failures
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Load Testing</h3>

                      <Button
                        onClick={async () => {
                          const sessions = Array.from({ length: 5 }, (_, i) => `cs_test_load_${Date.now()}_${i}`)

                          for (const sessionId of sessions) {
                            setConfig((prev) => ({ ...prev, sessionId, simulationMode: true }))
                            await runComprehensiveDebug()
                            await new Promise((resolve) => setTimeout(resolve, 2000))
                          }
                        }}
                        className="w-full justify-start bg-purple-700 hover:bg-purple-600"
                        disabled={loading}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Multiple Purchase Test (5x)
                      </Button>

                      <Button
                        onClick={() => {
                          const largeSessionId = "cs_test_large_bundle_" + Date.now()
                          setConfig((prev) => ({
                            ...prev,
                            sessionId: largeSessionId,
                            simulationMode: true,
                          }))
                          toast({ title: "Large bundle scenario configured" })
                        }}
                        className="w-full justify-start bg-indigo-700 hover:bg-indigo-600"
                      >
                        <HardDrive className="h-4 w-4 mr-2" />
                        Large Bundle Test (100+ items)
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
