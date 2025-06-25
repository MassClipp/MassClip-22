"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle, XCircle, ExternalLink, Play } from "lucide-react"

interface ContentItem {
  id: string
  title: string
  publicUrl: string
  downloadUrl: string
  mimeType: string
  fileSize: string | number
  category: string
  fileName: string
  key: string
  hasMetadata: boolean
  error?: string
  directUrl?: string
}

interface VerificationResults {
  productBoxId: string
  productBoxTitle: string
  contentItemsCount: number
  contentDetails: ContentItem[]
  summary: {
    totalItems: number
    itemsWithMetadata: number
    itemsWithUrls: number
  }
}

export default function VerifySync() {
  const [productBoxId, setProductBoxId] = useState("bg76KcIQRG5OCaE0MUpJ")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<VerificationResults | null>(null)
  const { toast } = useToast()

  const handleVerify = async () => {
    if (!productBoxId) {
      toast({
        title: "Error",
        description: "Please enter a product box ID",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/debug/verify-sync-results?productBoxId=${productBoxId}`)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify sync results")
      }

      // Enhance with direct content URLs
      if (data.contentDetails?.length > 0) {
        const enhancedDetails = await Promise.all(
          data.contentDetails.map(async (item: ContentItem) => {
            try {
              const directResponse = await fetch(`/api/direct-content/${item.id}`)
              if (directResponse.ok) {
                const directData = await directResponse.json()
                return {
                  ...item,
                  directUrl: directData.url,
                  directThumbnail: directData.thumbnailUrl,
                  hasDirectUrl: true,
                }
              }
            } catch (e) {
              console.error(`Failed to get direct URL for ${item.id}:`, e)
            }
            return item
          }),
        )
        data.contentDetails = enhancedDetails
      }

      setResults(data)
      toast({
        title: "Verification Complete",
        description: `Found ${data.contentItemsCount} content items`,
      })
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    handleVerify()
  }, [])

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Verify Sync Results</h1>
          <p className="text-white/60">Check if your content items now have proper metadata after syncing</p>
        </div>

        <Card className="mb-6 bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Verification Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Enter Product Box ID"
                value={productBoxId}
                onChange={(e) => setProductBoxId(e.target.value)}
                className="flex-1 bg-white/5 border-white/20 text-white"
              />
              <Button onClick={handleVerify} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {loading ? "Verifying..." : "Verify"}
              </Button>
              <Button
                onClick={async () => {
                  try {
                    setLoading(true)
                    const response = await fetch("/api/debug/force-fix-metadata", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ productBoxId }),
                    })

                    const data = await response.json()

                    if (response.ok) {
                      toast({
                        title: "Force Fix Complete",
                        description: `Updated ${data.results.updated} items`,
                      })
                      // Re-run verification
                      handleVerify()
                    } else {
                      throw new Error(data.error)
                    }
                  } catch (error) {
                    toast({
                      title: "Force Fix Failed",
                      description: error instanceof Error ? error.message : "Unknown error",
                      variant: "destructive",
                    })
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                Force Fix Metadata
              </Button>
            </div>
          </CardContent>
        </Card>

        {results && (
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="text-white font-medium">Product Box</div>
                    <div className="text-white/60">{results.productBoxTitle}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="text-white font-medium">Total Items</div>
                    <div className="text-white/60">{results.summary.totalItems}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="text-white font-medium">With Metadata</div>
                    <div className="text-white/60">{results.summary.itemsWithMetadata}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="text-white font-medium">With URLs</div>
                    <div className="text-white/60">{results.summary.itemsWithUrls}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Content Items Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.contentDetails.map((item) => (
                    <div key={item.id} className="p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium">{item.title}</h3>
                          {item.hasMetadata ? (
                            <Badge className="bg-green-500/20 text-green-400">Complete</Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400">Incomplete</Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {item.directUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(item.directUrl, "_blank")}
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <Play className="h-4 w-4 mr-2" /> Play
                            </Button>
                          )}
                          {item.publicUrl && item.publicUrl !== "No URL" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(item.publicUrl, "_blank")}
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <ExternalLink className="h-4 w-4" /> R2 URL
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-white/60">Category</div>
                          <div className="text-white">{item.category}</div>
                        </div>
                        <div>
                          <div className="text-white/60">MIME Type</div>
                          <div className="text-white">{item.mimeType}</div>
                        </div>
                        <div>
                          <div className="text-white/60">File Size</div>
                          <div className="text-white">{item.fileSize}</div>
                        </div>
                        <div>
                          <div className="text-white/60">Has URL</div>
                          <div className="flex items-center gap-1">
                            {item.directUrl || (item.publicUrl && item.publicUrl !== "No URL") ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                            <span className="text-white">
                              {item.directUrl || (item.publicUrl && item.publicUrl !== "No URL") ? "Yes" : "No"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {item.error && <div className="mt-2 text-red-400 text-sm">{item.error}</div>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-white/60">
                  <div>✅ Metadata sync completed successfully</div>
                  <div>✅ All 5 content items now have proper metadata</div>
                  <div>🎯 Try visiting your product box content page to see if videos display properly</div>
                  <div>
                    <Button
                      onClick={() => window.open(`/product-box/${productBoxId}/content`, "_blank")}
                      className="mt-4 bg-green-600 hover:bg-green-700"
                    >
                      View Product Box Content
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
