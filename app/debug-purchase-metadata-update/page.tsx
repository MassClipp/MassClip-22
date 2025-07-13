"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"

interface UpdateResult {
  success: boolean
  message: string
  updated: number
  totalProcessed: number
  addedContent?: Array<{
    id: string
    title: string
    contentType: string
    size: string
    duration?: string
  }>
  error?: string
  details?: string
}

export default function PurchaseMetadataUpdatePage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [isUpdating, setIsUpdating] = useState(false)
  const [result, setResult] = useState<UpdateResult | null>(null)

  const updatePurchaseMetadata = async () => {
    if (!user) return

    setIsUpdating(true)
    setResult(null)

    try {
      const idToken = await user.getIdToken()

      const response = await fetch("/api/migrate/update-purchase-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("Error updating purchase metadata:", error)
      setResult({
        success: false,
        message: "Failed to update purchase metadata",
        updated: 0,
        totalProcessed: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please log in to update purchase metadata.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Purchase Metadata Update</h1>
          <p className="text-muted-foreground mt-2">
            Update existing purchased bundles with correct video content details, titles, and URLs.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Update Purchase Metadata
            </CardTitle>
            <CardDescription>
              This will update all your existing purchases with enhanced video metadata including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Proper video titles and descriptions</li>
                <li>Valid video URLs and thumbnails</li>
                <li>Correct content type classification (video vs document)</li>
                <li>File sizes, durations, and resolutions</li>
                <li>Enhanced display formatting</li>
              </ul>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={updatePurchaseMetadata} disabled={isUpdating} className="w-full" size="lg">
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Purchase Metadata...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Update Purchase Metadata
                </>
              )}
            </Button>

            {result && (
              <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <p className={result.success ? "text-green-800" : "text-red-800"}>{result.message}</p>

                    {result.success && (
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">Updated: {result.updated} purchases</Badge>
                        <Badge variant="outline">Total Processed: {result.totalProcessed}</Badge>
                      </div>
                    )}

                    {result.addedContent && result.addedContent.length > 0 && (
                      <div className="mt-3">
                        <p className="font-medium text-green-800 mb-2">Enhanced Content Items:</p>
                        <div className="space-y-1">
                          {result.addedContent.map((item, index) => (
                            <div key={index} className="text-sm text-green-700 bg-green-100 p-2 rounded">
                              <div className="font-medium">{item.title}</div>
                              <div className="text-xs text-green-600">
                                {item.contentType} • {item.size}
                                {item.duration && ` • ${item.duration}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.error && (
                      <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-700">
                        <strong>Error:</strong> {result.error}
                        {result.details && (
                          <div className="mt-1">
                            <strong>Details:</strong> {result.details}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What This Update Does</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">✅ Fixes Applied</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Fetches complete video metadata from multiple sources</li>
                  <li>• Updates missing titles and descriptions</li>
                  <li>• Validates and fixes video URLs</li>
                  <li>• Corrects content type classification</li>
                  <li>• Adds thumbnail URLs where available</li>
                  <li>• Calculates proper file sizes and durations</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-600">🔍 Data Sources</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• uploads collection (primary)</li>
                  <li>• productBoxContent collection</li>
                  <li>• creatorUploads collection</li>
                  <li>• Cross-referenced upload data</li>
                  <li>• Enhanced metadata extraction</li>
                  <li>• URL validation and cleanup</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Safe Operation:</strong> This update only enhances existing data and does not delete or modify your
            original purchase records. It adds missing metadata and improves the display of your purchased content.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
