"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  RefreshCw,
  Loader2,
  Wrench,
  ChevronDown,
  ChevronRight,
  Shield,
} from "lucide-react"
import type { BundleDiagnosticResult, BundleDiagnosticSummary } from "@/lib/diagnostics/bundle-integrity"

export default function BundleIntegrityDiagnostic() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [bundles, setBundles] = useState<{ id: string; title: string }[]>([])
  const [selectedBundleId, setSelectedBundleId] = useState<string>("")
  const [diagnosticResult, setDiagnosticResult] = useState<BundleDiagnosticResult | null>(null)
  const [systemSummary, setSystemSummary] = useState<BundleDiagnosticSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [repairing, setRepairing] = useState(false)
  const [activeTab, setActiveTab] = useState("single")
  const [bypassAuth, setBypassAuth] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    issues: true,
    metadata: false,
    urls: true,
    r2: false,
    recommendations: true,
  })

  // Fetch bundles
  useEffect(() => {
    const fetchBundles = async () => {
      if (!user && !bypassAuth) return

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        }

        if (user) {
          const token = await user.getIdToken()
          headers.Authorization = `Bearer ${token}`
        }

        if (bypassAuth) {
          headers["x-diagnostic-bypass"] = "true"
        }

        const response = await fetch("/api/creator/bundles", {
          headers,
        })

        if (!response.ok) {
          throw new Error("Failed to fetch bundles")
        }

        const data = await response.json()
        if (data.bundles && Array.isArray(data.bundles)) {
          setBundles(
            data.bundles.map((bundle: any) => ({
              id: bundle.id,
              title: bundle.title || "Unnamed Bundle",
            })),
          )

          // Select first bundle by default if available
          if (data.bundles.length > 0 && !selectedBundleId) {
            setSelectedBundleId(data.bundles[0].id)
          }
        }
      } catch (error) {
        console.error("Error fetching bundles:", error)
        toast({
          title: "Error",
          description: "Failed to fetch bundles. Try enabling development bypass.",
          variant: "destructive",
        })
      }
    }

    fetchBundles()
  }, [user, bypassAuth])

  // Run diagnostic
  const runDiagnostic = async () => {
    if (!user && !bypassAuth) {
      toast({
        title: "Authentication Required",
        description: "Please log in or enable development bypass to run diagnostics.",
        variant: "destructive",
      })
      return
    }

    if (!selectedBundleId) {
      toast({
        title: "Bundle Required",
        description: "Please select a bundle to analyze.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      setDiagnosticResult(null)

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (user) {
        const token = await user.getIdToken()
        headers.Authorization = `Bearer ${token}`
      }

      if (bypassAuth) {
        headers["x-diagnostic-bypass"] = "true"
      }

      const response = await fetch(`/api/diagnostics/bundle-integrity?bundleId=${selectedBundleId}`, {
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success && data.result) {
        setDiagnosticResult(data.result)

        toast({
          title: "Diagnostic Complete",
          description: `Bundle integrity analysis completed with ${data.result.issues.length} issues found`,
          variant: data.result.overallHealth === "good" ? "default" : "destructive",
        })
      } else {
        throw new Error(data.error || "Unknown error occurred")
      }
    } catch (error) {
      console.error("Error running diagnostic:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to run diagnostic",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Run system-wide diagnostic
  const runSystemDiagnostic = async () => {
    if (!user && !bypassAuth) {
      toast({
        title: "Authentication Required",
        description: "Please log in or enable development bypass to run diagnostics.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      setSystemSummary(null)

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (user) {
        const token = await user.getIdToken()
        headers.Authorization = `Bearer ${token}`
      }

      if (bypassAuth) {
        headers["x-diagnostic-bypass"] = "true"
      }

      const response = await fetch(`/api/diagnostics/bundle-integrity?mode=all`, {
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success && data.summary) {
        setSystemSummary(data.summary)

        toast({
          title: "System Diagnostic Complete",
          description: `Analyzed ${data.summary.totalBundles} bundles with ${data.summary.bundlesWithIssues} having issues`,
          variant: data.summary.overallSystemHealth === "good" ? "default" : "destructive",
        })
      } else {
        throw new Error(data.error || "Unknown error occurred")
      }
    } catch (error) {
      console.error("Error running system diagnostic:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to run system diagnostic",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Repair bundle URLs
  const repairBundleUrls = async () => {
    if (!user && !bypassAuth) {
      toast({
        title: "Authentication Required",
        description: "Please log in or enable development bypass to repair URLs.",
        variant: "destructive",
      })
      return
    }

    if (!selectedBundleId) return

    try {
      setRepairing(true)

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (user) {
        const token = await user.getIdToken()
        headers.Authorization = `Bearer ${token}`
      }

      if (bypassAuth) {
        headers["x-diagnostic-bypass"] = "true"
      }

      const response = await fetch(`/api/diagnostics/bundle-integrity`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "repair_urls",
          bundleId: selectedBundleId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      if (data.success && data.result) {
        toast({
          title: "Repair Complete",
          description: `Fixed ${data.result.fixed} URLs, ${data.result.failed} failed`,
          variant: data.result.failed > 0 ? "destructive" : "default",
        })

        // Re-run diagnostic to see the improvements
        await runDiagnostic()
      } else {
        throw new Error(data.error || "Unknown error occurred")
      }
    } catch (error) {
      console.error("Error repairing URLs:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to repair URLs",
        variant: "destructive",
      })
    } finally {
      setRepairing(false)
    }
  }

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Get health indicator
  const getHealthIndicator = (health: string) => {
    switch (health) {
      case "good":
        return <Badge className="bg-green-500">Good</Badge>
      case "fair":
        return <Badge className="bg-yellow-500">Fair</Badge>
      case "poor":
        return <Badge className="bg-red-500">Poor</Badge>
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>
    }
  }

  // Get severity indicator
  const getSeverityIndicator = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge className="bg-red-500">High</Badge>
      case "medium":
        return <Badge className="bg-yellow-500">Medium</Badge>
      case "low":
        return <Badge className="bg-blue-500">Low</Badge>
      default:
        return <Badge className="bg-gray-500">Unknown</Badge>
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Bundle Data Integrity Diagnostic</CardTitle>
        <CardDescription>Analyze bundle content metadata and storage integrity</CardDescription>

        {/* Development Controls */}
        <div className="flex items-center space-x-2 pt-4 border-t">
          <Shield className="h-4 w-4 text-yellow-500" />
          <Label htmlFor="bypass-auth" className="text-sm">
            Development Mode (Bypass Authentication)
          </Label>
          <Switch id="bypass-auth" checked={bypassAuth} onCheckedChange={setBypassAuth} />
        </div>
        {bypassAuth && (
          <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertTitle>Development Mode Active</AlertTitle>
            <AlertDescription>
              Authentication is bypassed. This should only be used for development and testing.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Bundle Analysis</TabsTrigger>
            <TabsTrigger value="system">System-wide Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4 mt-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Select value={selectedBundleId} onValueChange={setSelectedBundleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bundle to analyze" />
                  </SelectTrigger>
                  <SelectContent>
                    {bundles.map((bundle) => (
                      <SelectItem key={bundle.id} value={bundle.id}>
                        {bundle.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={runDiagnostic} disabled={!selectedBundleId || loading} className="min-w-[120px]">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Analyze
                  </>
                )}
              </Button>
            </div>

            {diagnosticResult && (
              <div className="space-y-6 mt-6">
                {/* Summary Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle>{diagnosticResult.bundleTitle}</CardTitle>
                      {getHealthIndicator(diagnosticResult.overallHealth)}
                    </div>
                    <CardDescription>Bundle ID: {diagnosticResult.bundleId}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col items-center p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">Content Items</span>
                        <span className="text-3xl font-bold">{diagnosticResult.contentCount}</span>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">Issues Found</span>
                        <span className="text-3xl font-bold">{diagnosticResult.issues.length}</span>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">Content Types</span>
                        <span className="text-3xl font-bold">
                          {Object.keys(diagnosticResult.contentTypeDistribution).length}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Issues Section */}
                <div>
                  <div
                    className="flex items-center justify-between cursor-pointer mb-2"
                    onClick={() => toggleSection("issues")}
                  >
                    <h3 className="text-lg font-medium flex items-center">
                      {expandedSections.issues ? (
                        <ChevronDown className="h-5 w-5 mr-1" />
                      ) : (
                        <ChevronRight className="h-5 w-5 mr-1" />
                      )}
                      Issues & Problems
                    </h3>
                    <Badge variant="outline" className="font-mono">
                      {diagnosticResult.issues.length}
                    </Badge>
                  </div>

                  {expandedSections.issues && (
                    <div className="space-y-3">
                      {diagnosticResult.issues.length === 0 ? (
                        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <AlertTitle>No issues found</AlertTitle>
                          <AlertDescription>
                            This bundle's content metadata appears to be in good condition.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        diagnosticResult.issues.map((issue, index) => (
                          <Alert
                            key={index}
                            className={
                              issue.severity === "high"
                                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900"
                                : issue.severity === "medium"
                                  ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900"
                                  : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900"
                            }
                          >
                            {issue.severity === "high" ? (
                              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            ) : issue.severity === "medium" ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )}
                            <div className="w-full">
                              <div className="flex items-center justify-between">
                                <AlertTitle>
                                  {issue.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                </AlertTitle>
                                {getSeverityIndicator(issue.severity)}
                              </div>
                              <AlertDescription>
                                <div className="mt-1">{issue.description}</div>
                                <div className="mt-2 text-sm">
                                  <strong>Recommendation:</strong> {issue.recommendation}
                                </div>
                              </AlertDescription>
                            </div>
                          </Alert>
                        ))
                      )}

                      {/* Repair Actions */}
                      {diagnosticResult.contentItemsWithMissingUrls > 0 && (
                        <div className="mt-4">
                          <Button onClick={repairBundleUrls} disabled={repairing} variant="outline" className="gap-2">
                            {repairing ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Repairing URLs...
                              </>
                            ) : (
                              <>
                                <Wrench className="h-4 w-4" />
                                Repair Missing URLs
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* URL Consistency Section */}
                <div>
                  <div
                    className="flex items-center justify-between cursor-pointer mb-2"
                    onClick={() => toggleSection("urls")}
                  >
                    <h3 className="text-lg font-medium flex items-center">
                      {expandedSections.urls ? (
                        <ChevronDown className="h-5 w-5 mr-1" />
                      ) : (
                        <ChevronRight className="h-5 w-5 mr-1" />
                      )}
                      URL Field Consistency
                    </h3>
                  </div>

                  {expandedSections.urls && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg">
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">fileUrl</div>
                          <div className="text-xl font-semibold">{diagnosticResult.urlFieldConsistency.hasFileUrl}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {Math.round(
                              (diagnosticResult.urlFieldConsistency.hasFileUrl / diagnosticResult.contentCount) * 100,
                            )}
                            % of items
                          </div>
                        </div>
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg">
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">publicUrl</div>
                          <div className="text-xl font-semibold">
                            {diagnosticResult.urlFieldConsistency.hasPublicUrl}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {Math.round(
                              (diagnosticResult.urlFieldConsistency.hasPublicUrl / diagnosticResult.contentCount) * 100,
                            )}
                            % of items
                          </div>
                        </div>
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg">
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">downloadUrl</div>
                          <div className="text-xl font-semibold">
                            {diagnosticResult.urlFieldConsistency.hasDownloadUrl}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {Math.round(
                              (diagnosticResult.urlFieldConsistency.hasDownloadUrl / diagnosticResult.contentCount) *
                                100,
                            )}
                            % of items
                          </div>
                        </div>
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg">
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">Missing All URLs</div>
                          <div className="text-xl font-semibold text-red-600 dark:text-red-400">
                            {diagnosticResult.urlFieldConsistency.missingAllUrls}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {Math.round(
                              (diagnosticResult.urlFieldConsistency.missingAllUrls / diagnosticResult.contentCount) *
                                100,
                            )}
                            % of items
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cloudflare R2 Section */}
                <div>
                  <div
                    className="flex items-center justify-between cursor-pointer mb-2"
                    onClick={() => toggleSection("r2")}
                  >
                    <h3 className="text-lg font-medium flex items-center">
                      {expandedSections.r2 ? (
                        <ChevronDown className="h-5 w-5 mr-1" />
                      ) : (
                        <ChevronRight className="h-5 w-5 mr-1" />
                      )}
                      Cloudflare R2 Metadata
                    </h3>
                  </div>

                  {expandedSections.r2 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg">
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">Has R2 Key</div>
                          <div className="text-xl font-semibold">
                            {diagnosticResult.cloudflareR2Consistency.hasR2Key}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {Math.round(
                              (diagnosticResult.cloudflareR2Consistency.hasR2Key / diagnosticResult.contentCount) * 100,
                            )}
                            % of items
                          </div>
                        </div>
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg">
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">Has Bucket Name</div>
                          <div className="text-xl font-semibold">
                            {diagnosticResult.cloudflareR2Consistency.hasBucketName}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {Math.round(
                              (diagnosticResult.cloudflareR2Consistency.hasBucketName / diagnosticResult.contentCount) *
                                100,
                            )}
                            % of items
                          </div>
                        </div>
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg">
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">Has Public Domain</div>
                          <div className="text-xl font-semibold">
                            {diagnosticResult.cloudflareR2Consistency.hasPublicDomain}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {Math.round(
                              (diagnosticResult.cloudflareR2Consistency.hasPublicDomain /
                                diagnosticResult.contentCount) *
                                100,
                            )}
                            % of items
                          </div>
                        </div>
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg">
                          <div className="text-sm text-zinc-500 dark:text-zinc-400">Missing R2 Metadata</div>
                          <div className="text-xl font-semibold text-yellow-600 dark:text-yellow-400">
                            {diagnosticResult.cloudflareR2Consistency.missingR2Metadata}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {Math.round(
                              (diagnosticResult.cloudflareR2Consistency.missingR2Metadata /
                                diagnosticResult.contentCount) *
                                100,
                            )}
                            % of items
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Metadata Fields Section */}
                <div>
                  <div
                    className="flex items-center justify-between cursor-pointer mb-2"
                    onClick={() => toggleSection("metadata")}
                  >
                    <h3 className="text-lg font-medium flex items-center">
                      {expandedSections.metadata ? (
                        <ChevronDown className="h-5 w-5 mr-1" />
                      ) : (
                        <ChevronRight className="h-5 w-5 mr-1" />
                      )}
                      Metadata Fields Coverage
                    </h3>
                  </div>

                  {expandedSections.metadata && (
                    <div className="space-y-4">
                      {Object.entries(diagnosticResult.metadataFieldsPresence).map(([field, data]) => (
                        <div key={field} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <div className="text-sm font-medium">{field}</div>
                            <div className="text-sm text-zinc-500 dark:text-zinc-400">
                              {data.present} / {data.present + data.missing} items
                            </div>
                          </div>
                          <Progress value={data.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recommendations Section */}
                <div>
                  <div
                    className="flex items-center justify-between cursor-pointer mb-2"
                    onClick={() => toggleSection("recommendations")}
                  >
                    <h3 className="text-lg font-medium flex items-center">
                      {expandedSections.recommendations ? (
                        <ChevronDown className="h-5 w-5 mr-1" />
                      ) : (
                        <ChevronRight className="h-5 w-5 mr-1" />
                      )}
                      Recommendations
                    </h3>
                    <Badge variant="outline" className="font-mono">
                      {diagnosticResult.recommendations.length}
                    </Badge>
                  </div>

                  {expandedSections.recommendations && (
                    <div className="space-y-2">
                      {diagnosticResult.recommendations.length === 0 ? (
                        <div className="text-zinc-500 dark:text-zinc-400 italic">No recommendations available.</div>
                      ) : (
                        <ul className="space-y-1 list-disc list-inside">
                          {diagnosticResult.recommendations.map((recommendation, index) => (
                            <li key={index} className="text-zinc-700 dark:text-zinc-300">
                              {recommendation}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="system" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={runSystemDiagnostic} disabled={loading} className="min-w-[160px]">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing System...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Analyze All Bundles
                  </>
                )}
              </Button>
            </div>

            {systemSummary && (
              <div className="space-y-6 mt-6">
                {/* System Summary Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle>System-wide Bundle Analysis</CardTitle>
                      {getHealthIndicator(systemSummary.overallSystemHealth)}
                    </div>
                    <CardDescription>Analysis timestamp: {new Date().toLocaleString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex flex-col items-center p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">Total Bundles</span>
                        <span className="text-3xl font-bold">{systemSummary.totalBundles}</span>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">Total Content Items</span>
                        <span className="text-3xl font-bold">{systemSummary.totalContentItems}</span>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">Bundles with Issues</span>
                        <span className="text-3xl font-bold">{systemSummary.bundlesWithIssues}</span>
                      </div>
                      <div className="flex flex-col items-center p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">Content with Issues</span>
                        <span className="text-3xl font-bold">{systemSummary.contentItemsWithIssues}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Severity Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Issue Severity Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 text-sm font-medium">High</div>
                        <div className="flex-1">
                          <div className="h-4 bg-red-100 dark:bg-red-900/20 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (systemSummary.severityDistribution.high /
                                    (systemSummary.severityDistribution.high +
                                      systemSummary.severityDistribution.medium +
                                      systemSummary.severityDistribution.low || 1)) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="w-12 text-right font-mono text-sm">
                          {systemSummary.severityDistribution.high}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 text-sm font-medium">Medium</div>
                        <div className="flex-1">
                          <div className="h-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (systemSummary.severityDistribution.medium /
                                    (systemSummary.severityDistribution.high +
                                      systemSummary.severityDistribution.medium +
                                      systemSummary.severityDistribution.low || 1)) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="w-12 text-right font-mono text-sm">
                          {systemSummary.severityDistribution.medium}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 text-sm font-medium">Low</div>
                        <div className="flex-1">
                          <div className="h-4 bg-blue-100 dark:bg-blue-900/20 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (systemSummary.severityDistribution.low /
                                    (systemSummary.severityDistribution.high +
                                      systemSummary.severityDistribution.medium +
                                      systemSummary.severityDistribution.low || 1)) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="w-12 text-right font-mono text-sm">
                          {systemSummary.severityDistribution.low}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Common Issues */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Most Common Issues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {systemSummary.commonIssues.length === 0 ? (
                        <div className="text-zinc-500 dark:text-zinc-400 italic">
                          No common issues found across the system.
                        </div>
                      ) : (
                        systemSummary.commonIssues.map((issue, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg"
                          >
                            <div>
                              <div className="font-medium">
                                {issue.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                              </div>
                              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                Affects {issue.percentage.toFixed(1)}% of bundles
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold">{issue.count}</div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">bundles</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
