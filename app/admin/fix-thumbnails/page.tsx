"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ImageIcon, CheckCircle, AlertCircle } from "lucide-react"

export default function FixThumbnailsPage() {
  const [isFixing, setIsFixing] = useState(false)
  const [results, setResults] = useState<{
    fixed: number
    skipped: number
    errors: string[]
    message: string
  } | null>(null)

  const fixThumbnails = async (collection: string) => {
    setIsFixing(true)
    setResults(null)

    try {
      const response = await fetch("/api/fix-missing-thumbnails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ collection }),
      })

      const data = await response.json()

      if (data.success) {
        setResults(data)
      } else {
        throw new Error(data.details || "Failed to fix thumbnails")
      }
    } catch (error) {
      console.error("Error fixing thumbnails:", error)
      setResults({
        fixed: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
        message: "Failed to fix thumbnails",
      })
    } finally {
      setIsFixing(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ImageIcon className="h-5 w-5" />
              Fix Missing Thumbnails
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Generate thumbnail URLs for videos that don't have them using Cloudflare Stream playback IDs.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => fixThumbnails("uploads")}
                disabled={isFixing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isFixing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Fix Uploads
                  </>
                )}
              </Button>

              <Button
                onClick={() => fixThumbnails("free_content")}
                disabled={isFixing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isFixing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Fix Free Content
                  </>
                )}
              </Button>
            </div>

            {results && (
              <Card className="bg-zinc-800 border-zinc-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm text-white">
                    {results.errors.length === 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-zinc-300">{results.message}</p>

                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="bg-green-900 text-green-100">
                      Fixed: {results.fixed}
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-900 text-blue-100">
                      Skipped: {results.skipped}
                    </Badge>
                    {results.errors.length > 0 && <Badge variant="destructive">Errors: {results.errors.length}</Badge>}
                  </div>

                  {results.errors.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-red-400 mb-2">Errors:</h4>
                      <div className="space-y-1">
                        {results.errors.map((error, index) => (
                          <p key={index} className="text-xs text-red-300 bg-red-900/20 p-2 rounded">
                            {error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="text-sm text-zinc-400 space-y-2">
              <p>
                <strong>How it works:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Extracts playback IDs from Cloudflare Stream URLs</li>
                <li>
                  Generates thumbnail URLs using format:{" "}
                  <code className="bg-zinc-800 px-1 rounded">
                    https://videodelivery.net/{`{playbackId}`}/thumbnails/thumbnail.jpg
                  </code>
                </li>
                <li>Falls back to placeholder thumbnails for non-Stream videos</li>
                <li>Only processes videos that don't already have thumbnails</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
