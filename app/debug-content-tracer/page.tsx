"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

export default function ContentTracerPage() {
  const [productBoxId, setProductBoxId] = useState("bg76KcIQRG5OCaE0MUpJ")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [fixing, setFixing] = useState(false)
  const [fixResults, setFixResults] = useState<any>(null)

  const traceContent = async () => {
    if (!productBoxId.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/debug/trace-content-items?productBoxId=${productBoxId}`)
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Error tracing content:", error)
    } finally {
      setLoading(false)
    }
  }

  const fixMissingUrls = async () => {
    if (!productBoxId.trim()) return

    setFixing(true)
    try {
      const response = await fetch("/api/debug/fix-missing-urls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productBoxId }),
      })
      const data = await response.json()
      setFixResults(data)

      // Refresh the trace results
      if (data.success) {
        await traceContent()
      }
    } catch (error) {
      console.error("Error fixing URLs:", error)
    } finally {
      setFixing(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Content Items Tracer</h1>

        {/* Input */}
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardHeader>
            <CardTitle>Trace Product Box Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter product box ID"
                value={productBoxId}
                onChange={(e) => setProductBoxId(e.target.value)}
                className="bg-zinc-800 border-zinc-700"
              />
              <Button onClick={traceContent} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Trace Content
              </Button>
              <Button
                onClick={fixMissingUrls}
                disabled={fixing || !results}
                variant="outline"
                className="border-green-500 text-green-500 hover:bg-green-500/10"
              >
                {fixing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Fix Missing URLs
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Summary
                  {results.summary?.foundItems > 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{results.summary?.totalContentItems || 0}</div>
                    <div className="text-sm text-zinc-400">Total Items</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{results.summary?.foundItems || 0}</div>
                    <div className="text-sm text-zinc-400">Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">{results.summary?.missingItems || 0}</div>
                    <div className="text-sm text-zinc-400">Missing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{results.summary?.collectionsWithContent || 0}</div>
                    <div className="text-sm text-zinc-400">Collections</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Found Content Items */}
            {results.contentItems?.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-green-500">Found Content Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.contentItems.map((item: any, index: number) => (
                      <div key={item.id} className="border border-zinc-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-mono text-sm">{item.id}</div>
                          <Badge variant="outline" className="border-green-500 text-green-500">
                            {item.collection}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-zinc-400">File:</span>{" "}
                            {item.data?.fileName || item.data?.originalFileName || "Unknown"}
                          </div>
                          <div>
                            <span className="text-zinc-400">Type:</span> {item.fileType || "Unknown"}
                          </div>
                          <div>
                            <span className="text-zinc-400">Category:</span> {item.category || "Unknown"}
                          </div>
                        </div>
                        {item.publicUrl && (
                          <div className="mt-2">
                            <span className="text-zinc-400">URL:</span>
                            <a
                              href={item.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline ml-2 break-all"
                            >
                              {item.publicUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Missing Items */}
            {results.missingItems?.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-red-500">Missing Content Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.missingItems.map((itemId: string) => (
                      <div
                        key={itemId}
                        className="font-mono text-sm bg-red-500/10 border border-red-500/20 rounded p-2"
                      >
                        {itemId}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Creator Uploads */}
            {results.foundCollections?.creator_uploads_sample && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle>Creator's Available Uploads</CardTitle>
                  <p className="text-sm text-zinc-400">
                    Total: {results.foundCollections.creator_uploads_total} uploads
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {results.foundCollections.creator_uploads_sample.map((upload: any) => (
                      <div key={upload.id} className="border border-zinc-700 rounded p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{upload.fileName || "Unknown"}</div>
                            <div className="text-sm text-zinc-400 font-mono">{upload.id}</div>
                          </div>
                          <Badge variant="outline">{upload.category}</Badge>
                        </div>
                        {upload.publicUrl && (
                          <div className="mt-2 text-sm">
                            <a
                              href={upload.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline"
                            >
                              View File
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {results.recommendations?.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {results.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Fix Results */}
        {fixResults && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className={fixResults.success ? "text-green-500" : "text-red-500"}>URL Fix Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p>{fixResults.message}</p>
              </div>
              {fixResults.results && (
                <div className="space-y-2">
                  {fixResults.results.details.map((detail: any, index: number) => (
                    <div
                      key={detail.id}
                      className={`border rounded p-3 ${
                        detail.status === "fixed"
                          ? "border-green-500/30 bg-green-500/10"
                          : detail.status === "already_has_urls"
                            ? "border-blue-500/30 bg-blue-500/10"
                            : "border-red-500/30 bg-red-500/10"
                      }`}
                    >
                      <div className="font-mono text-sm">{detail.id}</div>
                      <div className="text-sm capitalize">{detail.status.replace("_", " ")}</div>
                      {detail.publicUrl && <div className="text-xs text-zinc-400 mt-1">URL: {detail.publicUrl}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
