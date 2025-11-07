"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Progress } from "@/components/ui/progress"
import { Loader2, CheckCircle2, XCircle, Brain, FileText } from "lucide-react"

interface ProcessingStatusTrackerProps {
  uploadId: string
  onProcessingComplete?: () => void
}

export function ProcessingStatusTracker({ uploadId, onProcessingComplete }: ProcessingStatusTrackerProps) {
  const { user } = useAuth()
  const [transcriptStatus, setTranscriptStatus] = useState<string>("pending")
  const [imageDescriptionStatus, setImageDescriptionStatus] = useState<string>("pending")
  const [isPolling, setIsPolling] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || !uploadId) return

    const pollStatus = async () => {
      try {
        const token = await user.getIdToken()
        const response = await fetch(`/api/uploads/processing-status?uploadId=${uploadId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch processing status")
        }

        const data = await response.json()
        setTranscriptStatus(data.transcriptStatus)
        setImageDescriptionStatus(data.imageDescriptionStatus)

        if (data.processingComplete) {
          setIsPolling(false)
          onProcessingComplete?.()
        }
      } catch (error) {
        console.error("Error polling status:", error)
        setError(error instanceof Error ? error.message : "Failed to check status")
        setIsPolling(false)
      }
    }

    // Poll every 3 seconds
    const interval = setInterval(pollStatus, 3000)

    // Initial poll
    pollStatus()

    return () => clearInterval(interval)
  }, [user, uploadId, onProcessingComplete])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "skipped":
        return <XCircle className="h-4 w-4 text-zinc-500" />
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "processing":
        return "Processing..."
      case "completed":
        return "Completed"
      case "failed":
        return "Failed"
      case "skipped":
        return "Skipped"
      default:
        return "Pending..."
    }
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div className="flex items-center gap-2 text-red-400">
          <XCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-zinc-800/30 border border-zinc-700 rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium text-white">Background Processing</span>
      </div>

      {/* Transcript Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-sm text-zinc-400">Transcription</span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(transcriptStatus)}
          <span className="text-xs text-zinc-400">{getStatusText(transcriptStatus)}</span>
        </div>
      </div>

      {/* Image Description Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-sm text-zinc-400">Image Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(imageDescriptionStatus)}
          <span className="text-xs text-zinc-400">{getStatusText(imageDescriptionStatus)}</span>
        </div>
      </div>

      {isPolling && (
        <div className="pt-2">
          <Progress value={undefined} className="h-1" />
        </div>
      )}
    </div>
  )
}
