"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Search } from "lucide-react"

export default function DebugContentLookupPage() {
  const [contentId, setContentId] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleLookup = async () => {
    if (!contentId.trim()) return

    setLoading(true)
    try {
      const response = await fetch("/api/debug/content-lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contentId: contentId.trim() }),
      })

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Error looking up content:", error)
      setResults({ error: "Failed to lookup content" })
    } finally {
      setLoading(false)
    }
  }

  const renderSearchResult = (key: string, result: any) => {
    if (!result) return null

    return (
      <Card key={key} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{key}</CardTitle>
            {result.found ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Found
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                <XCircle className="w-3 h-3 mr-1" />
                Not Found
              </Badge>
            )}
          </div>
        </CardHeader>
        {result.found && result.data && (
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              {result.docId && (
                <div>
                  <span className="font-medium">Document ID:</span> {result.docId}
                </div>
              )}
              {result.uploadId && (
                <div>
                  <span className="font-medium">Upload ID:</span> {result.uploadId}
                </div>
              )}
              {result.data.title && (
                <div>
                  <span className="font-medium">Title:</span> {result.data.title}
                </div>
              )}
              {result.data.filename && (
                <div>
                  <span className="font-medium">Filename:</span> {result.data.filename}
                </div>
              )}
              {result.data.url && (
                <div>
                  <span className="font-medium">URL:</span>{" "}
                  <a
                    href={result.data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {result.data.url.substring(0, 50)}...
                  </a>
                </div>
              )}
              {result.data.fileUrl && (
                <div>
                  <span className="font-medium">File URL:</span>{" "}
                  <a
                    href={result.data.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {result.data.fileUrl.substring(0, 50)}...
                  </a>
                </div>
              )}
              {result.data.fileType && (
                <div>
                  <span className="font-medium">File Type:</span> {result.data.fileType}
                </div>
              )}
              {result.data.size && (
                <div>
                  <span className="font-medium">Size:</span> {(result.data.size / 1024 / 1024).toFixed(2)} MB
                </div>
              )}
              {result.data.userId && (
                <div>
                  <span className="font-medium">User ID:</span> {result.data.userId}
                </div>
              )}
            </div>
          </CardContent>
        )}
        {result.error && (
          <CardContent className="pt-0">
            <div className="text-red-600 text-sm">Error: {result.error}</div>
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Content Lookup Debug Tool</h1>
        <p className="text-gray-600">
          Debug tool to search for content across different Firestore collections and verify data availability for
          bundle creation.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Content</CardTitle>
          <CardDescription>
            Enter a content ID to search across uploads, productBoxContent, and creatorUploads collections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter content ID (e.g., video ID)"
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLookup()}
            />
            <Button onClick={handleLookup} disabled={loading || !contentId.trim()}>
              <Search className="w-4 h-4 mr-2" />
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <div className="space-y-6">
          {results.error ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center text-red-600">
                  <XCircle className="w-5 h-5 mr-2" />
                  <span>{results.error}</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Search Results for: {results.contentId}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(results.searchResults).map(([key, result]) => renderSearchResult(key, result))}
                  </div>
                </CardContent>
              </Card>

              {results.searchResults.similarIds &&
                Array.isArray(results.searchResults.similarIds) &&
                results.searchResults.similarIds.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Similar IDs Found</CardTitle>
                      <CardDescription>These IDs contain similar patterns to your search term.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {results.searchResults.similarIds.map((item: any, index: number) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm">
                              <div>
                                <span className="font-medium">Doc ID:</span> {item.docId}
                              </div>
                              {item.dataId && (
                                <div>
                                  <span className="font-medium">Data ID:</span> {item.dataId}
                                </div>
                              )}
                              {item.title && (
                                <div>
                                  <span className="font-medium">Title:</span> {item.title}
                                </div>
                              )}
                              {item.filename && (
                                <div>
                                  <span className="font-medium">Filename:</span> {item.filename}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {results.recommendations && results.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.recommendations.map((rec: string, index: number) => (
                        <div key={index} className="flex items-start">
                          <AlertCircle className="w-4 h-4 mr-2 mt-0.5 text-blue-600" />
                          <span className="text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {results.foundData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Raw Data Found</CardTitle>
                    <CardDescription>Complete data object that would be used for bundle creation.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-96">
                      {JSON.stringify(results.foundData, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
