"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { ImageIcon, RefreshCw, CheckCircle2, Loader2 } from "lucide-react"

interface ThumbnailStats {
  total: number
  withThumbnails: number
  withoutThumbnails: number
  processed: number
}

export default function ThumbnailManager() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState<ThumbnailStats | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const regenerateThumbnails = async (collection = "videos") => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to regenerate thumbnails",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setLogs([])
    addLog(`Starting thumbnail regeneration for ${collection}...`)

    try {
      const token = await user.getIdToken()
      let hasMore = true
      let totalProcessed = 0

      while (hasMore) {
        const response = await fetch("/api/regenerate-thumbnails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            collection,
            batchSize: 10,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || "Unknown error")
        }

        totalProcessed += result.processed
        hasMore = result.hasMore

        addLog(`Processed batch: ${result.processed} videos`)
        setProgress((prev) => Math.min(prev + 10, 90))

        // Small delay to prevent overwhelming the server
        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      setProgress(100)
      addLog(`✅ Completed! Total processed: ${totalProcessed} videos`)

      toast({
        title: "Thumbnails regenerated",
        description: `Successfully processed ${totalProcessed} videos`,
      })

      // Update stats
      setStats((prev) =>
        prev
          ? {
              ...prev,
              processed: totalProcessed,
              withThumbnails: prev.withThumbnails + totalProcessed,
              withoutThumbnails: Math.max(0, prev.withoutThumbnails - totalProcessed),
            }
          : null,
      )
    } catch (error) {
      console.error("❌ [Thumbnail Manager] Error:", error)
      addLog(`❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`)

      toast({
        title: "Regeneration failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900/60 border-zinc-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-500" />
            Thumbnail Management
          </CardTitle>
          <CardDescription>Generate thumbnails for videos that don't have them</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-800/30 p-3 rounded-lg">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-sm text-zinc-400">Total Videos</div>
              </div>
              <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20">
                <div className="text-2xl font-bold text-green-400">{stats.withThumbnails}</div>
                <div className="text-sm text-zinc-400">With Thumbnails</div>
              </div>
              <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                <div className="text-2xl font-bold text-amber-400">{stats.withoutThumbnails}</div>
                <div className="text-sm text-zinc-400">Need Thumbnails</div>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                <div className="text-2xl font-bold text-blue-400">{stats.processed}</div>
                <div className="text-sm text-zinc-400">Processed</div>
              </div>
            </div>
          )}

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing thumbnails...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => regenerateThumbnails("videos")}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate Video Thumbnails
            </Button>

            <Button
              onClick={() => regenerateThumbnails("uploads")}
              disabled={isProcessing}
              variant="outline"
              className="border-zinc-700 text-white hover:bg-zinc-800"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate Upload Thumbnails
            </Button>
          </div>

          {/* Logs */}
          {logs.length > 0 && (
            <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-3">
              <div className="text-sm font-medium text-white mb-2">Processing Log</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs text-zinc-400 font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <div className="text-sm font-medium text-white">How it works</div>
                <div className="text-sm text-zinc-400">
                  • New uploads automatically generate thumbnails at 5 seconds
                </div>
                <div className="text-sm text-zinc-400">• Existing videos without thumbnails get fallback images</div>
                <div className="text-sm text-zinc-400">• Thumbnails are stored in your R2 bucket for fast loading</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
