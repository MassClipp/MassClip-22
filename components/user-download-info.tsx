"use client"

import { useUserPlan } from "@/hooks/use-user-plan"
import { Download, Infinity } from "lucide-react"

export default function UserDownloadInfo() {
  const { isProUser, remainingDownloads, loading } = useUserPlan()

  if (loading) {
    return (
      <div className="flex items-center px-2 py-1.5 text-sm text-gray-400">
        <Download className="h-4 w-4 mr-2" />
        <span>Loading...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center px-2 py-1.5 text-sm">
      <Download className="h-4 w-4 mr-2" />
      {isProUser ? (
        <div className="flex items-center">
          <span className="text-green-500 mr-1">Unlimited</span>
          <Infinity className="h-3 w-3 text-green-500" />
        </div>
      ) : (
        <span className={remainingDownloads === 0 ? "text-red-500" : "text-gray-300"}>
          {remainingDownloads} downloads remaining
        </span>
      )}
    </div>
  )
}
