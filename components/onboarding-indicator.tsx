"use client"

import { useOnboarding } from "@/hooks/use-onboarding"
import { usePathname } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"

const STEP_ROUTES: Record<string, string> = {
  setup_storefront: "/dashboard/view-storefront",
  upload_content: "/dashboard/upload",
  add_free_content: "/dashboard/free-content",
  setup_stripe: "/dashboard/earnings",
  create_bundle: "/dashboard/bundles",
  go_live: "/dashboard/view-storefront",
}

export function OnboardingIndicator() {
  const { progress, loading } = useOnboarding()
  const pathname = usePathname()
  const router = useRouter()

  if (loading || !progress || progress.isComplete) {
    return null
  }

  const currentStep = progress.steps.find((s) => s.id === progress.currentStep)
  const currentRoute = STEP_ROUTES[progress.currentStep]

  // Only show indicator if we're on the page for the current step
  if (pathname !== currentRoute) {
    return null
  }

  if (!currentStep || currentStep.completed) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-[1px] rounded-lg shadow-2xl">
        <div className="bg-zinc-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-blue-400" />
              </div>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white mb-1">{currentStep.title}</div>
              <div className="text-sm text-zinc-400 mb-3">{currentStep.description}</div>
              <div className="text-xs text-zinc-500">
                Step {progress.completedSteps.length + 1} of {progress.steps.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
