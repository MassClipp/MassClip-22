"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { OnboardingChecklist } from "@/components/onboarding-checklist"
import { useOnboarding } from "@/hooks/use-onboarding"

export default function DashboardPage() {
  const router = useRouter()
  const { progress, loading } = useOnboarding()

  useEffect(() => {
    if (!loading && progress?.isComplete) {
      router.replace("/dashboard/upload")
    }
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

  if (!progress?.isComplete) {
    return (
      <div className="min-h-screen bg-black p-4 sm:p-8">
        <div className="max-w-2xl mx-auto pt-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to MassClip!</h1>
            <p className="text-zinc-400">Let's get your storefront set up and ready to earn.</p>
          </div>
          <OnboardingChecklist />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-zinc-400">Redirecting to Upload...</p>
      </div>
    </div>
  )
}
