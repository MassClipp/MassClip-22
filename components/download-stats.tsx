"use client"

import { useRouter } from "next/navigation"
import { useUserPlan } from "@/hooks/use-user-plan"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Download, Infinity } from "lucide-react"
import { useDownloadLimit } from "@/contexts/download-limit-context"

export default function DownloadStats() {
  const router = useRouter()
  const { planData, isProUser, loading } = useUserPlan()
  const { remainingDownloads, hasReachedLimit } = useDownloadLimit()

  // Format the next reset date (first day of next month)
  const getNextResetDate = () => {
    const now = new Date()
    // Move to the first day of next month
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return nextReset.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Calculate progress percentage for free users
  const getProgressPercentage = () => {
    if (!planData) return 0
    if (isProUser) return 100

    const used = planData.downloads
    const total = planData.downloadsLimit
    return Math.min(100, Math.round((used / total) * 100))
  }

  if (loading) {
    return (
      <Card className="bg-black border-gray-800 h-full">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-800 rounded w-3/4"></div>
            <div className="h-3 bg-gray-800 rounded w-1/2"></div>
            <div className="h-6 bg-gray-800 rounded w-full mt-4"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-black border-gray-800 h-full">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <Download className="mr-2 h-5 w-5 text-gray-400" /> Downloads
        </CardTitle>
        <CardDescription className="text-white">
          {isProUser ? "Unlimited downloads with Pro" : "Monthly download allowance"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isProUser ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800 mb-4">
              <Infinity className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-medium text-white mb-1">Unlimited Downloads</h3>
            <p className="text-gray-400 text-sm">Enjoy unlimited access to all content with your Pro subscription</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-400">
                {remainingDownloads} of {planData?.downloadsLimit || 5} downloads remaining
              </span>
              <span className="text-xs text-gray-500">{getProgressPercentage()}%</span>
            </div>

            <Progress
              value={getProgressPercentage()}
              className="h-2 bg-gray-800"
              indicatorClassName={hasReachedLimit ? "bg-red-600" : "bg-green-600"}
            />

            <div className="pt-2">
              <p className="text-xs text-gray-500">Downloads reset on {getNextResetDate()}</p>
            </div>

            {hasReachedLimit && (
              <div className="bg-gray-900/50 p-3 rounded-md border border-gray-800 mt-4">
                <p className="text-sm text-amber-400 mb-2">You've reached your download limit for this month</p>
                <p className="text-xs text-gray-400">Upgrade to Pro for unlimited downloads</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {!isProUser && (
        <CardFooter>
          <Button onClick={() => router.push("/pricing")} className="w-full bg-red-600 hover:bg-red-700 text-white">
            Upgrade to Pro
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
