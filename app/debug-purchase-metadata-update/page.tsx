"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface UpdateResult {
  success: boolean
  message: string
  updated: number
  totalProcessed: number
  error?: string
}

export default function PurchaseMetadataUpdatePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UpdateResult | null>(null)

  const handleUpdateMetadata = async () => {
    if (!user) {
      setResult({
        success: false,
        message: "Please log in to update purchase metadata",
        updated: 0,
        totalProcessed: 0,
        error: "Not authenticated",
      })
      return
    }

    try {
      setLoading(true)
      setResult(null)

      console.log("🔄 [Debug] Starting purchase metadata update...")

      const idToken = await user.getIdToken()
      const response = await fetch("/api/migrate/update-purchase-metadata", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          updated: data.updated,
          totalProcessed: data.totalProcessed,
        })
        console.log("✅ [Debug] Purchase metadata update completed:", data)
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to update purchase metadata",
          updated: 0,
          totalProcessed: 0,
          error: data.details,
        })
        console.error("❌ [Debug] Purchase metadata update failed:", data)
      }
    } catch (error) {
      console.error("❌ [Debug] Error updating purchase metadata:", error)
      setResult({
        success: false,
        message: "An unexpected error occurred",
        updated: 0,
        totalProcessed: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Purchase Metadata Update</h1>
          <p className="text-gray-400">
            Update existing purchased bundles with correct video content details and metadata
          </p>
        </div>

        {/* Main Card */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Update Purchase Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-300 space-y-2">
              <p>This tool will:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Find all your existing purchases</li>
                <li>Re-fetch the latest content metadata from source collections</li>
                <li>Update video URLs, thumbnails, and display information</li>
                <li>Fix missing titles and content details</li>
                <li>Recalculate bundle statistics (file sizes, durations, etc.)</li>
                <li>Ensure videos display properly in the content viewer</li>
              </ul>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleUpdateMetadata}
                disabled={loading || !user}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating Metadata...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Update Purchase Metadata
                  </>
                )}
              </Button>
            </div>

            {!user && (
              <Alert className="bg-amber-900/20 border-amber-700/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-amber-200">
                  Please log in to update your purchase metadata.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card
            className={`border ${result.success ? "border-green-700 bg-green-900/20" : "border-red-700 bg-red-900/20"}`}
          >
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${result.success ? "text-green-400" : "text-red-400"}`}>
                {result.success ? (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Update Successful
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5" />
                    Update Failed
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className={result.success ? "text-green-300" : "text-red-300"}>{result.message}</p>

              {result.success && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-zinc-800 p-3 rounded">
                    <div className="text-gray-400">Purchases Updated</div>
                    <div className="text-xl font-bold text-green-400">{result.updated}</div>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded">
                    <div className="text-gray-400">Total Processed</div>
                    <div className="text-xl font-bold text-blue-400">{result.totalProcessed}</div>
                  </div>
                </div>
              )}

              {result.error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded p-3">
                  <div className="text-red-400 font-medium">Error Details:</div>
                  <div className="text-red-300 text-sm mt-1">{result.error}</div>
                </div>
              )}

              {result.success && (
                <Alert className="bg-blue-900/20 border-blue-700/50">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription className="text-blue-200">
                    Your purchase metadata has been updated! You can now go back to your purchases page to see the
                    improved video previews and correct content details.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-300 space-y-2">
            <ol className="list-decimal list-inside space-y-2">
              <li>Make sure you're logged in to your account</li>
              <li>Click the "Update Purchase Metadata" button above</li>
              <li>Wait for the process to complete (this may take a few moments)</li>
              <li>Check the results to see how many purchases were updated</li>
              <li>Go back to your purchases page to see the improved content display</li>
            </ol>
            <div className="mt-4 p-3 bg-amber-900/20 border border-amber-700/50 rounded">
              <p className="text-amber-200 text-xs">
                <strong>Note:</strong> This process is safe and will only enhance your existing purchase data. It won't
                affect your access to content or change any purchase details.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
