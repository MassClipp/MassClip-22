"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugFreeContentPage() {
  const [debugResult, setDebugResult] = useState<any>(null)
  const [discoverResult, setDiscoverResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkFreeContent = async () => {
    setLoading(true)
    try {
      // Check the debug endpoint
      const debugResponse = await fetch("/api/debug/check-free-content")
      const debugData = await debugResponse.json()
      setDebugResult(debugData)

      // Check the discover endpoint
      const discoverResponse = await fetch("/api/discover/free-content")
      const discoverData = await discoverResponse.json()
      setDiscoverResult(discoverData)
    } catch (error) {
      console.error("Error checking free content:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Debug Free Content</h1>
        <Button onClick={checkFreeContent} disabled={loading}>
          {loading ? "Checking..." : "Check Free Content"}
        </Button>
      </div>

      {debugResult && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Endpoint Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <strong>Total Documents:</strong> {debugResult.totalDocuments}
              </p>
              <p>
                <strong>Success:</strong> {debugResult.success ? "Yes" : "No"}
              </p>
              <p>
                <strong>Timestamp:</strong> {debugResult.timestamp}
              </p>

              {debugResult.documents && (
                <div>
                  <h4 className="font-semibold mt-4 mb-2">Documents:</h4>
                  <div className="space-y-2">
                    {debugResult.documents.map((doc: any, index: number) => (
                      <div key={index} className="p-2 bg-zinc-900 rounded text-sm">
                        <p>
                          <strong>ID:</strong> {doc.id}
                        </p>
                        <p>
                          <strong>Title:</strong> {doc.title}
                        </p>
                        <p>
                          <strong>UID:</strong> {doc.uid}
                        </p>
                        <p>
                          <strong>Has File URL:</strong> {doc.fileUrl ? "Yes" : "No"}
                        </p>
                        <p>
                          <strong>Source Collection:</strong> {doc.sourceCollection || "N/A"}
                        </p>
                        <p>
                          <strong>Original ID:</strong> {doc.originalId || "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {discoverResult && (
        <Card>
          <CardHeader>
            <CardTitle>Discover Endpoint Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <strong>Videos Count:</strong> {discoverResult.count}
              </p>
              <p>
                <strong>Raw Document Count:</strong> {discoverResult.rawDocumentCount}
              </p>
              <p>
                <strong>Processed Document Count:</strong> {discoverResult.processedDocumentCount}
              </p>
              <p>
                <strong>Unique Video Count:</strong> {discoverResult.uniqueVideoCount}
              </p>
              <p>
                <strong>Success:</strong> {discoverResult.success ? "Yes" : "No"}
              </p>
              <p>
                <strong>Timestamp:</strong> {discoverResult.timestamp}
              </p>

              {discoverResult.videos && (
                <div>
                  <h4 className="font-semibold mt-4 mb-2">Videos:</h4>
                  <div className="space-y-2">
                    {discoverResult.videos.map((video: any, index: number) => (
                      <div key={index} className="p-2 bg-zinc-900 rounded text-sm">
                        <p>
                          <strong>ID:</strong> {video.id}
                        </p>
                        <p>
                          <strong>Title:</strong> {video.title}
                        </p>
                        <p>
                          <strong>Creator:</strong> {video.creatorName}
                        </p>
                        <p>
                          <strong>UID:</strong> {video.uid}
                        </p>
                        <p>
                          <strong>Original ID:</strong> {video.originalId || "N/A"}
                        </p>
                        <p>
                          <strong>Source Collection:</strong> {video.sourceCollection || "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
