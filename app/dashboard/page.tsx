"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { SalesObjectives } from "@/components/sales-objectives"
import { useOnboarding } from "@/hooks/use-onboarding"

export default function DashboardPage() {
  const router = useRouter()
  const { progress, loading } = useOnboarding()

  useEffect(() => {
    console.log("[v0] Dashboard - Progress state:", {
      loading,
      isComplete: progress?.isComplete,
      completedSteps: progress?.completedSteps?.length,
      totalSteps: progress?.steps?.length,
    })

    // Now dashboard shows Sales Objectives instead
  }, [router, loading, progress])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    )
  }

  return <SalesObjectives />
}
