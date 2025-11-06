"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Loader2, RefreshCw, Database, FileCheck, ShoppingCart } from "lucide-react"

interface SyncResults {
  uploads: { processed: number; updated: number }
  productBoxContent: { processed: number; updated: number }
  purchases: { processed: number; updated: number }
  errors: string[]
}

export default function MetadataSync() {
  const [productBoxId, setProductBoxId] = useState("")
  const [syncAll, setSyncAll] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SyncResults | null>(null)
  const { toast } = useToast()

  const handleSync = async () => {
    if (!productBoxId && !syncAll) {
      toast({
        title: "Error",
        description: "Please enter a product box ID or select 'Sync All'",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const response = await fetch("/api/debug/sync-content-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productBoxId,
          syncAll,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync metadata")
      }

      setResults(data.results)
      toast({
        title: "Sync Complete",
        description: "Content metadata sync completed successfully",
      })
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Content Metadata Sync</h1>
          <p className="text-white/60">
            Sync metadata across uploads, product box content, and purchases to ensure proper content display
          </p>
        </div>

        <Card className="mb-6 bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Sync Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="syncAll" checked={syncAll} onCheckedChange={(checked) => setSyncAll(!!checked)} />
                <label htmlFor="syncAll" className="text-sm font-medium leading-none text-white cursor-pointer">
                  Sync all content (may take longer)
                </label>
              </div>

              {!syncAll && (
                <div className="flex gap-4">
                  <Input
                    placeholder="Enter Product Box ID"
                    value={productBoxId}
                    onChange={(e) => setProductBoxId(e.target.value)}
                    className="flex-1 bg-white/5 border-white/20 text-white"
                  />
                </div>
              )}

              <Button onClick={handleSync} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {loading ? "Syncing Metadata..." : "Sync Metadata"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {results && (
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Sync Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-medium">Uploads</h3>
                      <Database className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="text-white/60">
                      <div>Processed: {results.uploads.processed}</div>
                      <div>Updated: {results.uploads.updated}</div>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-medium">Product Box Content</h3>
                      <FileCheck className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="text-white/60">
                      <div>Processed: {results.productBoxContent.processed}</div>
                      <div>Updated: {results.productBoxContent.updated}</div>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-medium">Purchases</h3>
                      <ShoppingCart className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="text-white/60">
                      <div>Processed: {results.purchases.processed}</div>
                      <div>Updated: {results.purchases.updated}</div>
                    </div>
                  </div>
                </div>

                {results.errors.length > 0 && (
                  <div className="mt-4 p-4 bg-red-500/10 rounded-lg">
                    <h3 className="text-red-400 font-medium mb-2">Errors</h3>
                    <ul className="space-y-1 text-red-300 text-sm">
                      {results.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
