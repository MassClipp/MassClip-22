"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { CheckCircle, XCircle, Search, Database, FileText, ImageIcon, Video, Music, File } from "lucide-react"

export default function DebugBundleContentLookupPage() {
  const { user } = useFirebaseAuth()
  const [contentId, setContentId] = useState("BQcnQRmyaoADamf80LL8") // Default to the ID from screenshot
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleLookup = async () => {
    if (!user || !contentId.trim()) return

    setLoading(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/debug/bundle-content-lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contentId: contentId.trim() }),
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Error:", error)
      setResults({ error: "Failed to lookup content" })
    } finally {
      setLoading(false)
    }
  }

  const getContentTypeIcon = (mimeType: string) => {
    if (mimeType?.startsWith("video/")) return <Video className="h-4 w-4" />
    if (mimeType?.startsWith("audio/")) return <Music className="h-4 w-4" />
    if (mimeType?.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0:00"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bundle Content Lookup Debug</h1>
        <p className="text-muted-foreground">Debug tool to investigate why bundle content metadata isn't being found</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Content Lookup
          </CardTitle>
          <CardDescription>Enter a content ID to debug the lookup process across all collections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter content ID (e.g., BQcnQRmyaoADamf80LL8)"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleLookup} disabled={loading || !user}>
              {loading ? "Looking up..." : "Lookup Content"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Lookup Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {results.summary?.found ? (
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-500 mx-auto" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Content Found</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {results.summary?.hasTitle ? (
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-500 mx-auto" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Has Title</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {results.summary?.hasFileUrl ? (
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-500 mx-auto" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Has File URL</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{results.summary?.source || "None"}</div>
                  <p className="text-sm text-muted-foreground">Best Source</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Final Result */}
          {results.results?.finalResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Extracted Content Data
                </CardTitle>
                <CardDescription>
                  The final processed content metadata that would be stored in the bundle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {getContentTypeIcon(results.results.finalResult.mimeType)}
                    <div>
                      <h3 className="font-semibold text-lg">{results.results.finalResult.title}</h3>
                      <p className="text-sm text-muted-foreground">{results.results.finalResult.filename}</p>
                    </div>
                    <Badge variant="outline">{results.results.finalResult.source}</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">File Information</h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Type:</span> {results.results.finalResult.mimeType}
                        </p>
                        <p>
                          <span className="font-medium">Size:</span>{" "}
                          {formatFileSize(results.results.finalResult.fileSize)}
                        </p>
                        {results.results.finalResult.duration > 0 && (
                          <p>
                            <span className="font-medium">Duration:</span>{" "}
                            {formatDuration(results.results.finalResult.duration)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">URLs</h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">File URL:</span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            {results.results.finalResult.fileUrl ? "✓ Present" : "✗ Missing"}
                          </span>
                        </p>
                        <p>
                          <span className="font-medium">Public URL:</span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            {results.results.finalResult.publicUrl ? "✓ Present" : "✗ Missing"}
                          </span>
                        </p>
                        <p>
                          <span className="font-medium">Thumbnail:</span>
                          <span className="ml-1 text-xs text-muted-foreground">
                            {results.results.finalResult.thumbnailUrl ? "✓ Present" : "✗ Missing"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {results.results.finalResult.fileUrl && (
                    <div>
                      <h4 className="font-medium mb-2">File URL</h4>
                      <code className="text-xs bg-muted p-2 rounded block break-all">
                        {results.results.finalResult.fileUrl}
                      </code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search Results */}
          <Card>
            <CardHeader>
              <CardTitle>Collection Search Results</CardTitle>
              <CardDescription>
                <div className="space-y-4">
                  {Object.entries(results.results?.searchResults || {}).map(([collection, result]: [string, any]) => (
                    <div key={collection} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{collection}</h4>
                        <Badge variant={result.exists ? "default" : "secondary"}>
                          {result.exists ? "Found" : "Not Found"}
                        </Badge>
                      </div>

                      {result.exists && result.data && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Title:</span> {result.data.title || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Filename:</span> {result.data.filename || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">File URL:</span>
                              <span className="ml-1">{result.data.fileUrl ? "✓ Present" : "✗ Missing"}</span>
                            </div>
                            <div>
                              <span className="font-medium">Public URL:</span>
                              <span className="ml-1">{result.data.publicUrl ? "✓ Present" : "✗ Missing"}</span>
                            </div>
                          </div>

                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm font-medium">View Raw Data</summary>
                            <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-40">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>{/* Content already moved to CardDescription */}</CardContent>
          </Card>

          {/* Errors */}
          {results.results?.errors && results.results.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.results.errors.map((error: string, index: number) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
