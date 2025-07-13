"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, AlertCircle, Database, Search, FileText } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface LookupResult {
  contentId: string
  searchResults: {
    [key: string]: {
      exists: boolean
      data: any
      docId: string
      collection: string
      queryField?: string
    }
  }
  finalResult: any
  errors: string[]
  timestamp: string
}

interface LookupSummary {
  contentId: string
  found: boolean
  source: string
  hasTitle: boolean
  hasFileUrl: boolean
  hasThumbnail: boolean
  errorCount: number
}

export default function DebugBundleContentLookupPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [contentId, setContentId] = useState("BQcnQRmyaoADamf80LL8")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ results: LookupResult; summary: LookupSummary } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async () => {
    if (!user) {
      setError("Please log in to use this tool")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/debug/bundle-content-lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contentId }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Lookup error:", error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Authentication Required
            </CardTitle>
            <CardDescription>Please log in to use the bundle content lookup diagnostic tool.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Bundle Content Lookup Diagnostic</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Content Lookup Tool
          </CardTitle>
          <CardDescription>Enter a content ID to debug the lookup process across all collections</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="contentId">Content ID</Label>
              <Input
                id="contentId"
                value={contentId}
                onChange={(e) => setContentId(e.target.value)}
                placeholder="Enter content ID (e.g., BQcnQRmyaoADamf80LL8)"
                className="font-mono"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleLookup} disabled={loading || !contentId} className="w-full">
                {loading ? "Looking up..." : "Lookup Content"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lookup Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  {result.summary.found ? (
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  )}
                  <div className="font-medium">Content Found</div>
                </div>
                <div className="text-center">
                  {result.summary.hasTitle ? (
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  )}
                  <div className="font-medium">Has Title</div>
                </div>
                <div className="text-center">
                  {result.summary.hasFileUrl ? (
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                  )}
                  <div className="font-medium">Has File URL</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-500 mb-2">{result.summary.source || "None"}</div>
                  <div className="font-medium">Best Source</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collection Search Results */}
          <Card>
            <CardHeader>
              <CardTitle>Collection Search Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(result.results.searchResults).map(([key, searchResult]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{key}</div>
                      {searchResult.queryField && (
                        <div className="text-sm text-gray-500">Query by: {searchResult.queryField}</div>
                      )}
                    </div>
                    <div className="text-right">
                      {searchResult.exists ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Found
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          Not Found
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Final Result */}
          {result.results.finalResult && (
            <Card>
              <CardHeader>
                <CardTitle>Extracted Content Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Title</Label>
                      <div className="font-mono text-sm bg-gray-50 p-2 rounded">
                        {result.results.finalResult.title || "Not found"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Filename</Label>
                      <div className="font-mono text-sm bg-gray-50 p-2 rounded">
                        {result.results.finalResult.filename || "Not found"}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium text-gray-500">File URL</Label>
                      <div className="font-mono text-sm bg-gray-50 p-2 rounded break-all">
                        {result.results.finalResult.fileUrl || "Not found"}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium text-gray-500">Public URL</Label>
                      <div className="font-mono text-sm bg-gray-50 p-2 rounded break-all">
                        {result.results.finalResult.publicUrl || "Not found"}
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">MIME Type</Label>
                      <div className="font-mono text-sm">{result.results.finalResult.mimeType}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">File Size</Label>
                      <div className="font-mono text-sm">{result.results.finalResult.fileSize} bytes</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Duration</Label>
                      <div className="font-mono text-sm">{result.results.finalResult.duration} seconds</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Source</Label>
                      <div className="font-mono text-sm">{result.results.finalResult.source}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Raw Data Debug */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Debug Data</CardTitle>
              <CardDescription>Complete lookup results for debugging</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(result.results, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Errors */}
          {result.results.errors.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800">Errors Encountered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.results.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
