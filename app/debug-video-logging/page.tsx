"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle, Video, FileText, Loader2, Play, RefreshCw, Database, Upload } from "lucide-react"

interface DiagnosticResult {
  success: boolean
  productBoxId: string
  productBox: {
    title: string
    creatorId: string
    contentItemsCount: number
    contentItems: string[]
  }
  productBoxContent: {
    count: number
    items: any[]
  }
  uploads: {
    total: number
    valid: number
    videos: number
    checks: any[]
  }
  creatorUploads: {
    count: number
    items: any[]
  }
  recommendations: string[]
  timestamp: string
}

export default function VideoLoggingDiagnosticPage() {
  const [productBoxId, setProductBoxId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fixing, setFixing] = useState<string | null>(null)
  const { toast } = useToast()

  const runDiagnostic = async () => {
    if (!productBoxId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a product box ID",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/debug/verify-video-logging?productBoxId=${productBoxId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Diagnostic failed")
      }

      setResult(data)
      toast({
        title: "Diagnostic Complete",
        description: "Video logging analysis completed successfully",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      toast({
        title: "Diagnostic Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const runFix = async (action: string) => {
    if (!productBoxId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a product box ID",
        variant: "destructive",
      })
      return
    }

    setFixing(action)

    try {
      const response = await fetch("/api/debug/verify-video-logging", {
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
        throw new Error(data.error || "Fix operation failed")
      }

      toast({
        title: "Fix Applied",
        description: data.message,
      })

      // Re-run diagnostic
      await runDiagnostic()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      toast({
        title: "Fix Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setFixing(null)
    }
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">Video Logging Diagnostic</h1>
          <p className="text-white/60">Verify video content logging and playback in product boxes</p>
        </div>

        {/* Input Section */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="w-5 h-5" />
              Product Box Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter Product Box ID (e.g., 6KctqR330CaE0M6pJ)"
                value={productBoxId}
                onChange={(e) => setProductBoxId(e.target.value)}
                className="flex-1 bg-white/5 border-white/20 text-white"
              />
              <Button onClick={runDiagnostic} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                Run Diagnostic
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-400" />
                <div>
                  <h3 className="text-red-400 font-semibold">Diagnostic Error</h3>
                  <p className="text-red-300">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{result.productBox.contentItemsCount}</div>
                    <div className="text-white/60">Content Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{result.productBoxContent.count}</div>
                    <div className="text-white/60">Synced Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{result.uploads.videos}</div>
                    <div className="text-white/60">Video Files</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{result.creatorUploads.count}</div>
                    <div className="text-white/60">Creator Videos</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Box Info */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Product Box: {result.productBox.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-white font-semibold mb-2">Basic Info</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Creator ID:</span>
                        <span className="text-white">{result.productBox.creatorId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Content Items:</span>
                        <span className="text-white">{result.productBox.contentItemsCount}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">Content Items Array</h4>
                    <div className="max-h-32 overflow-y-auto">
                      {result.productBox.contentItems.map((item, index) => (
                        <div key={index} className="text-xs text-white/60 font-mono">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload Analysis */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Upload Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.uploads.checks.map((upload, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center gap-3">
                        {upload.isVideo ? (
                          <Video className="w-5 h-5 text-green-400" />
                        ) : (
                          <FileText className="w-5 h-5 text-blue-400" />
                        )}
                        <div>
                          <div className="text-white font-medium">{upload.fileName || upload.uploadId}</div>
                          <div className="text-white/60 text-sm">
                            {upload.fileType} • {upload.category}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {upload.exists ? (
                          <Badge className="bg-green-500/20 text-green-400">Valid</Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400">Missing</Badge>
                        )}
                        {upload.isVideo && <Badge className="bg-purple-500/20 text-purple-400">Video</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <Card className="bg-yellow-500/10 border-yellow-500/20">
                <CardHeader>
                  <CardTitle className="text-yellow-400">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <span className="text-yellow-300 text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fix Actions */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Fix Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={() => runFix("sync-content")}
                    disabled={fixing === "sync-content"}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {fixing === "sync-content" ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sync Content Items
                  </Button>
                  <Button
                    onClick={() => runFix("add-sample-videos")}
                    disabled={fixing === "add-sample-videos"}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {fixing === "add-sample-videos" ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Add Sample Videos
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
