"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Search, CheckCircle, XCircle, Database, FileText, RefreshCw, Copy, ExternalLink } from "lucide-react"

interface BundleContentTestResult {
  bundleId: string
  timestamp: string
  apiResponse: {
    status: number
    ok: boolean
    data: any
    error?: string
  }
  rawBundleData?: any
  contentAnalysis: {
    totalItems: number
    hasDetailedContentItems: boolean
    hasContentItems: boolean
    hasContent: boolean
    sampleItem?: any
  }
}

export default function BundleContentTestPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [bundleId, setBundleId] = useState("17fRK6jdcnpt1M8ZhwnJ") // Default to the problematic ID
  const [testResult, setTestResult] = useState<BundleContentTestResult | null>(null)
  const [loading, setLoading] = useState(false)

  const runTest = async () => {
    if (!user || !bundleId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a bundle ID",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const token = await user.getIdToken()

      console.log("[v0] Testing bundle content API for bundleId:", bundleId)

      const response = await fetch(`/api/bundles/${bundleId}/content`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const responseData = await response.json()

      console.log("[v0] API Response:", {
        status: response.status,
        ok: response.ok,
        data: responseData,
      })

      const contentAnalysis = {
        totalItems: 0,
        hasDetailedContentItems: false,
        hasContentItems: false,
        hasContent: false,
        sampleItem: null,
      }

      if (responseData.contents && Array.isArray(responseData.contents)) {
        contentAnalysis.totalItems = responseData.contents.length
        if (responseData.contents.length > 0) {
          contentAnalysis.sampleItem = responseData.contents[0]
        }
      }

      // Check what content fields exist in the bundle data
      if (responseData.bundle) {
        contentAnalysis.hasDetailedContentItems = !!responseData.bundle.detailedContentItems
        contentAnalysis.hasContentItems = !!responseData.bundle.contentItems
        contentAnalysis.hasContent = !!responseData.bundle.content
      }

      const result: BundleContentTestResult = {
        bundleId,
        timestamp: new Date().toISOString(),
        apiResponse: {
          status: response.status,
          ok: response.ok,
          data: responseData,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
        },
        rawBundleData: responseData.bundle,
        contentAnalysis,
      }

      setTestResult(result)

      toast({
        title: "Test Complete",
        description: `Found ${contentAnalysis.totalItems} content items`,
      })
    } catch (error) {
      console.error("[v0] Test error:", error)
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
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

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Bundle Content API Test</h1>
          <p className="text-zinc-400">Debug tool to inspect bundle content API responses and data structure</p>
        </div>

        {/* Input Section */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Test Bundle Content API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter Bundle ID"
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <Button onClick={runTest} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Run Test
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {testResult && (
          <div className="space-y-6">
            {/* API Response Summary */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  API Response Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-zinc-800 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {testResult.apiResponse.ok ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )}
                      <div className="text-lg font-bold">{testResult.apiResponse.status}</div>
                    </div>
                    <div className="text-sm text-zinc-400">HTTP Status</div>
                  </div>
                  <div className="text-center p-4 bg-zinc-800 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">{testResult.contentAnalysis.totalItems}</div>
                    <div className="text-sm text-zinc-400">Content Items</div>
                  </div>
                  <div className="text-center p-4 bg-zinc-800 rounded-lg">
                    <div className="text-lg font-bold text-green-400">
                      {testResult.apiResponse.data?.isOwner ? "YES" : "NO"}
                    </div>
                    <div className="text-sm text-zinc-400">Is Owner</div>
                  </div>
                  <div className="text-center p-4 bg-zinc-800 rounded-lg">
                    <div className="text-lg font-bold text-purple-400">
                      {testResult.apiResponse.data?.hasAccess ? "YES" : "NO"}
                    </div>
                    <div className="text-sm text-zinc-400">Has Access</div>
                  </div>
                </div>

                {testResult.apiResponse.error && (
                  <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <h4 className="font-semibold text-red-400 mb-2">API Error</h4>
                    <p className="text-red-300">{testResult.apiResponse.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Content Analysis */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Content Structure Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-zinc-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {testResult.contentAnalysis.hasDetailedContentItems ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">detailedContentItems</span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {testResult.contentAnalysis.hasDetailedContentItems ? "Present" : "Missing"}
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {testResult.contentAnalysis.hasContentItems ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">contentItems</span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {testResult.contentAnalysis.hasContentItems ? "Present" : "Missing"}
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      {testResult.contentAnalysis.hasContent ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">content</span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {testResult.contentAnalysis.hasContent ? "Present" : "Missing"}
                    </p>
                  </div>
                </div>

                {/* Sample Content Item */}
                {testResult.contentAnalysis.sampleItem && (
                  <div>
                    <h4 className="font-semibold mb-2 text-blue-400">Sample Content Item Structure:</h4>
                    <div className="bg-zinc-800 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <span className="text-sm text-zinc-400">Title:</span>
                          <p className="font-mono text-sm">
                            {testResult.contentAnalysis.sampleItem.title || "❌ Missing"}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-zinc-400">File URL:</span>
                          <p className="font-mono text-sm">
                            {testResult.contentAnalysis.sampleItem.fileUrl ||
                              testResult.contentAnalysis.sampleItem.url ||
                              "❌ Missing"}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-zinc-400">Thumbnail URL:</span>
                          <p className="font-mono text-sm">
                            {testResult.contentAnalysis.sampleItem.thumbnailUrl || "❌ Missing"}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-zinc-400">ID:</span>
                          <p className="font-mono text-sm">
                            {testResult.contentAnalysis.sampleItem.id ||
                              testResult.contentAnalysis.sampleItem.contentId ||
                              "❌ Missing"}
                          </p>
                        </div>
                      </div>
                      <details className="cursor-pointer">
                        <summary className="text-sm font-medium text-zinc-300 hover:text-white">
                          View Full Sample Item Data
                        </summary>
                        <pre className="mt-2 text-xs text-zinc-400 overflow-x-auto whitespace-pre-wrap">
                          {formatData(testResult.contentAnalysis.sampleItem)}
                        </pre>
                      </details>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Raw API Response */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Raw API Response
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(formatData(testResult.apiResponse.data))}
                    className="text-zinc-400 hover:text-white"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-zinc-400 overflow-x-auto whitespace-pre-wrap bg-zinc-800 p-4 rounded-lg max-h-96">
                  {formatData(testResult.apiResponse.data)}
                </pre>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/dashboard/bundles/${bundleId}/content`, "_blank")}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Content Page
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/dashboard/bundles`, "_blank")}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Bundles Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
