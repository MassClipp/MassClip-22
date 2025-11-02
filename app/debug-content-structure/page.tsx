"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw, Wrench } from "lucide-react"

interface AnalysisResult {
  productBoxId: string
  collections: Record<string, any>
  recommendations: string[]
  issues: string[]
  timestamp: string
}

export default function ContentStructureDiagnostic() {
  const [productBoxId, setProductBoxId] = useState("")
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [fixing, setFixing] = useState(false)
  const { toast } = useToast()

  const runAnalysis = async () => {
    if (!productBoxId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a product box ID",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/debug/product-box-content-structure?productBoxId=${productBoxId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed")
      }

      setAnalysis(data)
      toast({
        title: "Analysis Complete",
        description: "Content structure analysis completed",
      })
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fixContent = async (action: string) => {
    if (!productBoxId.trim()) return

    try {
      setFixing(true)

      // Use cleanup API for cleanup actions
      const apiEndpoint = action.includes("cleanup")
        ? "/api/debug/cleanup-product-box-content"
        : "/api/debug/fix-product-box-content"

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productBoxId,
          action,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Fix failed")
      }

      toast({
        title: "Fix Applied",
        description: `Successfully applied fix: ${action}`,
      })

      // Re-run analysis
      await runAnalysis()
    } catch (error) {
      toast({
        title: "Fix Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setFixing(false)
    }
  }

  const getStatusIcon = (exists: boolean, count?: number) => {
    if (exists && count && count > 0) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    } else if (exists) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Product Box Content Structure Diagnostic</h1>
          <p className="text-white/60">Analyze and fix content rendering issues</p>
        </div>

        {/* Input Section */}
        <Card className="mb-6 bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Product Box Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter Product Box ID (e.g., 6KctqR330CaE0M6pJ)"
                value={productBoxId}
                onChange={(e) => setProductBoxId(e.target.value)}
                className="flex-1 bg-white/5 border-white/20 text-white"
              />
              <Button onClick={runAnalysis} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Analyze
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Collections Status */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Collections Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(analysis.collections).map(([name, data]) => (
                    <div key={name} className="p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-medium">{name.replace(/_/g, " ")}</h3>
                        {getStatusIcon(data.exists, data.count)}
                      </div>
                      <div className="text-white/60 text-sm">
                        {data.exists ? (
                          <>
                            <div>Count: {data.count || 0}</div>
                            {data.count > 0 && (
                              <Badge className="mt-1 bg-green-500/20 text-green-400">Has Content</Badge>
                            )}
                          </>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400">Not Found</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Issues */}
            {analysis.issues.length > 0 && (
              <Card className="bg-red-500/10 border-red-500/20">
                <CardHeader>
                  <CardTitle className="text-red-400">Issues Found</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.issues.map((issue, index) => (
                      <li key={index} className="text-red-300 flex items-center">
                        <XCircle className="h-4 w-4 mr-2" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <Card className="bg-yellow-500/10 border-yellow-500/20">
                <CardHeader>
                  <CardTitle className="text-yellow-400">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec, index) => (
                      <li key={index} className="text-yellow-300 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Fix Actions */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Quick Fixes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button
                    onClick={() => fixContent("create_contents_subcollection")}
                    disabled={fixing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Create Contents Subcollection
                  </Button>

                  <Button
                    onClick={() => fixContent("sync_to_product_box_content")}
                    disabled={fixing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Sync to ProductBoxContent
                  </Button>

                  <Button
                    onClick={() => fixContent("fix_content_items_references")}
                    disabled={fixing}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Fix ContentItems References
                  </Button>

                  <Button
                    onClick={() => fixContent("create_sample_content")}
                    disabled={fixing}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Create Sample Content
                  </Button>

                  <Button
                    onClick={() => fixContent("fix_all")}
                    disabled={fixing}
                    className="bg-red-600 hover:bg-red-700 md:col-span-2"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Fix All Issues
                  </Button>

                  <Button
                    onClick={() => fixContent("cleanup_broken_records")}
                    disabled={fixing}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Cleanup Broken Records
                  </Button>

                  <Button
                    onClick={() => fixContent("full_cleanup_and_rebuild")}
                    disabled={fixing}
                    className="bg-purple-600 hover:bg-purple-700 md:col-span-2"
                  >
                    <Wrench className="h-4 w-4 mr-2" />
                    Full Cleanup & Rebuild
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Content Details */}
            {Object.entries(analysis.collections).map(
              ([name, data]) =>
                data.exists &&
                data.documents &&
                data.documents.length > 0 && (
                  <Card key={name} className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">{name.replace(/_/g, " ")} Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {data.documents.slice(0, 3).map((doc: any, index: number) => (
                          <div key={index} className="p-3 bg-white/5 rounded">
                            <div className="text-white font-medium mb-2">ID: {doc.id}</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                              <div className="text-white/60">Title: {doc.data.title || doc.data.fileName || "N/A"}</div>
                              <div className="text-white/60">Size: {doc.data.size || doc.data.fileSize || "N/A"}</div>
                              <div className="text-white/60">
                                Type: {doc.data.mimeType || doc.data.fileType || "N/A"}
                              </div>
                              <div className="text-white/60">Category: {doc.data.category || "N/A"}</div>
                            </div>
                          </div>
                        ))}
                        {data.documents.length > 3 && (
                          <div className="text-white/60 text-sm">... and {data.documents.length - 3} more items</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}
